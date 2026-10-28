"""Shared test setup."""

import sys

import pytest


@pytest.fixture(autouse=True)
def never_use_the_configured_database(monkeypatch):
    """Tests must never write to the database configured in backend/.env (DATABASE_URL).
    API tests that need storage install their own temporary database."""
    main = sys.modules.get("main")
    if main is not None:
        monkeypatch.setattr(main, "question_recorder", None)
