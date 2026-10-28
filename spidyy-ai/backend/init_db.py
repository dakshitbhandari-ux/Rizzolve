"""
Spidyy AI - create the question-storage tables (Phase 2).

Run from the backend/ folder (uses DATABASE_URL from the environment or backend/.env):
    python init_db.py

Safe to run repeatedly: it only creates tables that do not exist yet. It never drops, empties
or alters an existing table. If an existing table differs from models.py, it says so and leaves
it alone; changing the schema of a database that holds data needs a migration tool (Alembic).
"""

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from database import create_engine_from_url, safe_database_url
from models import Base


def main(argv=None) -> int:
    load_dotenv()
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL is not set. Add it to backend/.env (see .env.example).", file=sys.stderr)
        return 2
    try:
        engine = create_engine_from_url(url)
        where = safe_database_url(url)
    except Exception as e:  # malformed URL or missing driver; the message could contain the password
        print(f"DATABASE_URL is not a valid database URL ({type(e).__name__}).", file=sys.stderr)
        return 2

    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                version = conn.execute(text("SELECT version()")).scalar()
            else:
                version = f"{engine.dialect.name} {conn.execute(text('SELECT sqlite_version()')).scalar()}"
        print(f"Connected to {where}\n  {version}")

        existing = set(inspect(engine).get_table_names())
        Base.metadata.create_all(engine, checkfirst=True)  # creates missing tables only

        problems = 0
        inspector = inspect(engine)
        for table in Base.metadata.sorted_tables:
            if table.name not in existing:
                print(f"  {table.name}: created")
                continue
            have = {c["name"] for c in inspector.get_columns(table.name)}
            missing = [c.name for c in table.columns if c.name not in have]
            if missing:
                problems += 1
                print(f"  {table.name}: already existed, MISSING columns {missing} (left unchanged)")
            else:
                print(f"  {table.name}: already existed (unchanged)")
    except SQLAlchemyError as e:
        print(f"Could not initialise {where}: {type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()

    if problems:
        print("Some existing tables do not match models.py. Nothing was changed; migrate them first.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
