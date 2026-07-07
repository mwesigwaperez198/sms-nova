import os

os.environ["DATABASE_URL"] = "sqlite:///./test_smart_school.db"
os.environ["INITIAL_SUPER_ADMIN_EMAIL"] = "owner@example.com"
os.environ["INITIAL_SUPER_ADMIN_PASSWORD"] = "ChangeMe123!"
os.environ["INITIAL_SUPER_ADMIN_NAME"] = "Platform Owner"

import pytest
from fastapi.testclient import TestClient

from app.db.session import engine
from app.main import app
from app.models import Base


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
