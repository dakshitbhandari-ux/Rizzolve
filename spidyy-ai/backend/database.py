"""
Spidyy AI - database connection (Phase 2).

The connection string comes only from the DATABASE_URL environment variable, for example
    postgresql+psycopg://USER:PASSWORD@localhost:5432/spidyy
Nothing connects at import or startup: SQLAlchemy opens a connection when one is first needed,
so the API still starts (and answers questions) when the database is down.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import sessionmaker


def normalize_database_url(url: str) -> str:
    """Use the psycopg (v3) driver for plain postgres:// and postgresql:// URLs.

    SQLAlchemy would otherwise pick psycopg2, which is not installed.
    """
    url = url.strip()
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def safe_database_url(url: str) -> str:
    """The URL with its password hidden, for logs and messages."""
    return make_url(normalize_database_url(url)).render_as_string(hide_password=True)


def create_engine_from_url(url: str, **engine_options) -> Engine:
    engine = create_engine(
        normalize_database_url(url),
        # Check pooled connections before use, so a database restart does not break requests.
        pool_pre_ping=True,
        # Keep question text out of error messages and logs.
        hide_parameters=True,
        **engine_options,
    )
    if engine.dialect.name == "sqlite":
        _use_immediate_transactions(engine)
    return engine


def _use_immediate_transactions(engine: Engine) -> None:
    """SQLite (tests and single-process development only): take the write lock when a transaction
    starts. With SQLite's default, two transactions that read and then write at the same time make
    one fail at once with "database is locked" instead of waiting. (SQLAlchemy's documented recipe.)
    """

    @event.listens_for(engine, "connect")
    def _let_sqlalchemy_begin(dbapi_connection, connection_record):
        dbapi_connection.isolation_level = None  # stop the sqlite3 module from starting transactions itself

    @event.listens_for(engine, "begin")
    def _begin_immediate(connection):
        connection.exec_driver_sql("BEGIN IMMEDIATE")


def create_session_factory(url_or_engine) -> sessionmaker:
    engine = url_or_engine if isinstance(url_or_engine, Engine) else create_engine_from_url(url_or_engine)
    return sessionmaker(bind=engine, expire_on_commit=False)
