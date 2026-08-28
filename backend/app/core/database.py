import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# DATABASE_URL (e.g. postgresql://user:pass@host/db) takes over from the local
# SQLite file when set -- lets the same models/routes run against a managed
# Postgres in production without any other code change. `check_same_thread`
# is SQLite-only, so it's only passed for that dialect.
_database_url = os.getenv("DATABASE_URL")
if _database_url:
    engine = create_engine(_database_url)
else:
    engine = create_engine(f"sqlite:///{settings.db_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import db_models  # noqa
    Base.metadata.create_all(bind=engine)
