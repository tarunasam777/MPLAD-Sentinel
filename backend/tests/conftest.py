import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.db import Base
from app.db.seed import reseed
from app.main import app

TEST_DB_URL = "sqlite://"

@pytest.fixture(scope="function")
def test_db():
    # StaticPool keeps a single shared in-memory connection so the
    # TestClient portal thread sees the same tables/rows as the test.
    engine = create_engine(
        TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    reseed(db, force=True)
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    from app.core.db import get_db
    from app.main import app as fastapi_app

    # Route all HTTP traffic at the hermetic in-memory DB so API tests
    # never touch the developer database file.
    fastapi_app.dependency_overrides[get_db] = lambda: test_db
    try:
        with TestClient(fastapi_app) as tc:
            yield tc
    finally:
        fastapi_app.dependency_overrides.pop(get_db, None)
