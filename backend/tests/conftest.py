import datetime as dt
import os
import uuid

# Phải đặt trước khi import app (config đọc biến môi trường lúc import)
os.environ.setdefault("DATABASE_URL", "postgresql://vehicle_app:change_me@localhost:5432/vehicle_db")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-only-32bytes!")
import tempfile                                                    # noqa: E402
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="vm-uploads-"))

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


# ---------- hàm dựng dữ liệu dùng chung (mỗi test tự tạo xe/hồ sơ mới, không phụ thuộc dữ liệu seed) ----------
@pytest.fixture(scope="session")
def make_vehicle(client, registrar):
    """Đăng ký + duyệt một xe mới cho `owner_headers`. Trả về {vehicle_id, plate, type_id, request_id}."""
    def _make(owner_headers, type_id=None):
        tid = type_id or client.get("/api/catalog/vehicle-types", headers=owner_headers).json()[0]["vehicle_type_id"]
        tag = uuid.uuid4().hex[:10].upper()
        r = client.post("/api/requests/registration", headers=owner_headers, json={
            "vehicle_type_id": tid, "chassis_number": f"RC{tag}", "engine_number": f"RE{tag}",
            "manufacture_year": 2024})
        assert r.status_code == 201, r.text
        plate = f"T{tag[:8]}"
        a = client.post(f"/api/requests/{r.json()['request_id']}/approve", headers=registrar,
                        json={"plate_number": plate})
        assert a.status_code == 200, a.text
        return {"vehicle_id": a.json()["vehicle_id"], "plate": plate, "type_id": tid,
                "request_id": r.json()["request_id"]}
    return _make


@pytest.fixture(scope="session")
def ownership_start(client):
    """Thời điểm chủ hiện hành bắt đầu sở hữu xe (mốc hợp lệ sớm nhất cho vi phạm/sự kiện bồi thường)."""
    def _start(owner_headers, vehicle_id):
        return client.get(f"/api/vehicles/{vehicle_id}/ownership", headers=owner_headers).json()[0]["valid_from"]
    return _start


@pytest.fixture(scope="session")
def make_violation(client, officer, ownership_start):
    """Tạo vi phạm cho xe và đưa tới 'verified' hoặc 'notified'. Trả về violation_id."""
    def _make(vehicle, owner_headers, stage="verified"):
        vt = client.get("/api/catalog/violation-types", headers=officer).json()[0]
        cam = client.get("/api/catalog/cameras", headers=officer).json()[0]
        v = client.post("/api/violations", headers=officer, json={
            "plate_number": vehicle["plate"], "violation_type_id": vt["violation_type_id"],
            "camera_id": cam["camera_id"], "occurred_at": ownership_start(owner_headers, vehicle["vehicle_id"])})
        assert v.status_code == 201, v.text
        vid = v.json()["violation_id"]
        assert client.post(f"/api/violations/{vid}/verify", headers=officer).status_code == 200
        if stage == "notified":
            n = client.post(f"/api/violations/{vid}/notify", headers=officer, json={
                "fine_amount": int(vt["min_fine"]),
                "due_date": (dt.date.today() + dt.timedelta(days=30)).isoformat()})
            assert n.status_code == 200, n.text
        return vid
    return _make


@pytest.fixture(scope="session")
def user_id(client):
    return lambda headers: client.get("/api/auth/me", headers=headers).json()["user_id"]


# ---------- bảo hiểm ----------
@pytest.fixture(scope="session")
def first_product(client):
    def _f(owner_headers, vehicle, theft=None):
        prods = client.get("/api/insurance/products", params={"vehicle_id": vehicle["vehicle_id"]},
                           headers=owner_headers).json()
        if theft is not None:
            prods = [p for p in prods if p["includes_theft"] == theft]
        return prods[0] if prods else None
    return _f


@pytest.fixture(scope="session")
def buy_policy(client):
    def _f(owner_headers, vehicle, product, start=None):
        return client.post("/api/policies", headers=owner_headers, json={
            "vehicle_id": vehicle["vehicle_id"], "product_id": product["product_id"],
            "start_date": (start or dt.date.today()).isoformat()})
    return _f


@pytest.fixture(scope="session")
def active_policy(client, buy_policy, first_product):
    """Mua và thanh toán một hợp đồng cho xe; trả về policy_id (đã Hiệu lực)."""
    def _f(owner_headers, vehicle, product=None, start=None):
        product = product or first_product(owner_headers, vehicle)
        if not product:
            pytest.skip("Không có gói bảo hiểm cho loại xe này trong dữ liệu mẫu")
        r = buy_policy(owner_headers, vehicle, product, start)
        assert r.status_code == 201, r.text
        pid = r.json()["policy_id"]
        p = client.post(f"/api/policies/{pid}/pay", json={}, headers=owner_headers)
        assert p.status_code == 200 and p.json()["policy_status"] == "active", p.text
        return pid
    return _f


@pytest.fixture(scope="session")
def make_claim(client, ownership_start):
    def _f(owner_headers, vehicle, pid, ctype="accident", amount=1_000_000, event=None):
        return client.post("/api/claims", headers=owner_headers, json={
            "policy_id": pid, "claim_type": ctype,
            "event_time": event or ownership_start(owner_headers, vehicle["vehicle_id"]),
            "event_location": "Quận 1, TP.HCM", "description": "Thử nghiệm", "requested_amount": amount})
    return _f


@pytest.fixture(scope="session")
def staff_for_claim(client, login):
    """(nhân viên đúng công ty, nhân viên công ty khác) của một yêu cầu bồi thường."""
    def _f(cid):
        a, b = login("bh_demoa01"), login("bh_demob01")
        return (a, b) if client.get(f"/api/claims/{cid}", headers=a).status_code == 200 else (b, a)
    return _f


@pytest.fixture(scope="session")
def vehicle_with_product(client, make_vehicle, first_product):
    """Tìm loại xe có gói bảo hiểm (theft=True: có quyền lợi mất cắp). Trả về (vehicle, product)."""
    def _f(owner_headers, theft=None):
        for t in client.get("/api/catalog/vehicle-types", headers=owner_headers).json():
            v = make_vehicle(owner_headers, type_id=t["vehicle_type_id"])
            p = first_product(owner_headers, v, theft)
            if p:
                return v, p
        pytest.skip("Không có gói bảo hiểm phù hợp trong dữ liệu mẫu")
    return _f
