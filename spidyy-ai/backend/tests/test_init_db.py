"""init_db.py creates missing tables and never deletes or changes existing data."""

import sqlite3

import pytest
from sqlalchemy import select

import init_db
from database import create_engine_from_url, create_session_factory
from models import QuestionGroup, QuestionSubmission


def url_for(path):
    return f"sqlite:///{path}"


def test_creates_tables(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", url_for(tmp_path / "q.db"))
    assert init_db.main() == 0
    out = capsys.readouterr().out
    assert "question_groups: created" in out and "question_submissions: created" in out


def test_second_run_keeps_existing_data(tmp_path, monkeypatch, capsys):
    url = url_for(tmp_path / "q.db")
    monkeypatch.setenv("DATABASE_URL", url)
    assert init_db.main() == 0
    engine = create_engine_from_url(url)
    db = create_session_factory(engine)
    with db.begin() as s:
        group = QuestionGroup(canonical_question="What is ML?", representative_embedding=b"\x00" * 8,
                              embedding_model="m", embedding_dim=2, question_count=1)
        s.add(group)
        s.flush()
        s.add(QuestionSubmission(original_question="What is ML?", question_hash="h" * 64,
                                 question_group_id=group.id, match_reason="new"))

    assert init_db.main() == 0
    assert "already existed (unchanged)" in capsys.readouterr().out
    with db() as s:
        assert s.scalars(select(QuestionGroup.question_count)).all() == [1]
        assert len(s.scalars(select(QuestionSubmission)).all()) == 1
    engine.dispose()


def test_reports_but_does_not_change_an_outdated_table(tmp_path, monkeypatch, capsys):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:  # an older table without most columns, holding data
        conn.execute("CREATE TABLE question_groups (id INTEGER PRIMARY KEY, canonical_question TEXT)")
        conn.execute("INSERT INTO question_groups VALUES (1, 'kept')")
    monkeypatch.setenv("DATABASE_URL", url_for(path))

    assert init_db.main() == 1
    assert "MISSING columns" in capsys.readouterr().out
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT canonical_question FROM question_groups").fetchall() == [("kept",)]


def test_needs_database_url(monkeypatch):
    monkeypatch.setattr(init_db, "load_dotenv", lambda: None)  # ignore backend/.env
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert init_db.main() == 2


def test_bad_url_does_not_print_the_password(monkeypatch, capsys):
    monkeypatch.setattr(init_db, "load_dotenv", lambda: None)
    monkeypatch.setenv("DATABASE_URL", "nosuchdriver://user:SECRET123@host/db")
    assert init_db.main() == 2
    captured = capsys.readouterr()
    assert "SECRET123" not in captured.out + captured.err


@pytest.mark.parametrize(
    "url, expected",
    [
        ("postgresql://u:p@h:5432/d", "postgresql+psycopg://u:p@h:5432/d"),
        ("postgres://u:p@h/d", "postgresql+psycopg://u:p@h/d"),
        ("postgresql+psycopg://u:p@h/d", "postgresql+psycopg://u:p@h/d"),
        ("sqlite:///x.db", "sqlite:///x.db"),
    ],
)
def test_database_url_normalisation(url, expected):
    from database import normalize_database_url

    assert normalize_database_url(url) == expected


def test_safe_url_hides_password():
    from database import safe_database_url

    assert "SECRET" not in safe_database_url("postgresql://user:SECRET@localhost/spidyy")
