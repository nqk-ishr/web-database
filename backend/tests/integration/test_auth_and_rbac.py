"""Tích hợp: đăng nhập, phân quyền theo vai trò, đăng ký tài khoản, cô lập dữ liệu giữa chủ xe."""
import uuid

import pytest

pytestmark = pytest.mark.integration


def test_login_ok_shape(client):
    r = client.post("/api/auth/login", json={"username": "bao.truong", "password": "Demo@123"})
    if r.status_code != 200:
        pytest.skip("Chưa đặt mật khẩu demo")
    body = r.json()
    assert body["user"]["role"] == "owner" and body["access_token"]


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"username": "bao.truong", "password": "sai-mat-khau"})
    assert r.status_code == 400 and "Sai" in r.json()["detail"]


def test_login_unknown_user(client):
    assert client.post("/api/auth/login", json={"username": "khong.ton.tai", "password": "x"}).status_code == 400


def test_me(client, owner):
    r = client.get("/api/auth/me", headers=owner)
    assert r.status_code == 200 and r.json()["username"] == "bao.truong"


def test_owner_cannot_use_officer_endpoints(client, owner):
    assert client.get("/api/requests", headers=owner).status_code == 403
    assert client.get("/api/reports/unpaid-fines", headers=owner).status_code == 403
    assert client.get("/api/catalog/cameras", headers=owner).status_code == 403


def test_officer_cannot_use_owner_endpoints(client, officer):
    assert client.get("/api/vehicles/mine", headers=officer).status_code == 403
    assert client.get("/api/violations/mine", headers=officer).status_code == 403


def test_my_vehicles_only_mine(client, owner):
    r = client.get("/api/vehicles/mine", headers=owner)
    assert r.status_code == 200 and r.json()
    for v in r.json():
        assert {"plate_number", "vehicle_type", "unpaid_violations", "policy"} <= v.keys()


def test_cannot_read_someone_elses_vehicle(client, owner, other_owner):
    vid = client.get("/api/vehicles/mine", headers=owner).json()[0]["vehicle_id"]
    assert client.get(f"/api/vehicles/{vid}", headers=owner).status_code == 200
    assert client.get(f"/api/vehicles/{vid}", headers=other_owner).status_code == 404
    assert client.get(f"/api/vehicles/{vid}/ownership", headers=other_owner).status_code == 404


def test_ownership_history(client, owner):
    vid = client.get("/api/vehicles/mine", headers=owner).json()[0]["vehicle_id"]
    rows = client.get(f"/api/vehicles/{vid}/ownership", headers=owner).json()
    assert rows and rows[0]["valid_to"] is None      # dòng đầu = chủ hiện hành


def test_register_and_duplicate(client):
    suffix = uuid.uuid4().hex[:8]
    body = {"username": f"test_{suffix}", "password": "Matkhau@123", "full_name": "Người Dùng Thử",
            "citizen_id": str(int(suffix, 16))[:12].ljust(12, "7")}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201 and r.json()["role"] == "owner"
    assert client.post("/api/auth/register", json=body).status_code == 409      # trùng username/CCCD
    assert client.post("/api/auth/login", json={"username": body["username"],
                                                 "password": body["password"]}).status_code == 200
