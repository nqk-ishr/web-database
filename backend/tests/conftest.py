import os

# Phải đặt trước khi import app (config đọc biến môi trường lúc import)
os.environ.setdefault("DATABASE_URL", "postgresql://vehicle_app:change_me@localhost:5433/vehicle_db")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-only-32bytes!")

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app

PASSWORD = "Demo@123"


def _db_up():
    try:
        psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=3).close()
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def client():
    if not _db_up():
        pytest.skip("Không kết nối được PostgreSQL (nạp schema.sql, seed.sql và chạy scripts/set_demo_passwords.py)")
    return TestClient(app)


@pytest.fixture(scope="session")
def login(client):
    def _login(username):
        r = client.post("/api/auth/login", json={"username": username, "password": PASSWORD})
        if r.status_code != 200:
            pytest.skip(f"Chưa đăng nhập được '{username}': chạy scripts/set_demo_passwords.py sau khi nạp seed")
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _login


@pytest.fixture(scope="session")
def owner(login):
    return login("bao.truong")          # user 5, chủ xe 1


@pytest.fixture(scope="session")
def other_owner(login):
    return login("diep.lam")


@pytest.fixture(scope="session")
def officer(login):
    return login("canbo_vp01")


@pytest.fixture(scope="session")
def registrar(login):
    return login("canbo_dk01")
