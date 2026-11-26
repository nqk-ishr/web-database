"""Tích hợp: quản lý tài khoản của quản trị viên."""
import uuid

import pytest

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def admin(login):
    return login("admin01")


def _new(client, admin, **over):
    name = f"t_{uuid.uuid4().hex[:10]}"
    body = {"username": name, "password": "Matkhau@123", "full_name": "Cán Bộ Thử", "role": "registrar", **over}
    r = client.post("/api/admin/users", json=body, headers=admin)
    return body, r


def _login(client, body):
    return client.post("/api/auth/login", json={"username": body["username"], "password": body["password"]})


def test_only_admin(client, owner, registrar, officer):
    for h in (owner, registrar, officer):
        assert client.get("/api/admin/users", headers=h).status_code == 403
        assert client.post("/api/admin/users", json={}, headers=h).status_code in (403, 422)
    assert client.get("/api/admin/users").status_code == 401


def test_list_and_filter(client, admin):
    r = client.get("/api/admin/users?size=100", headers=admin)
    assert r.status_code == 200 and set(r.json()) == {"items", "total", "page", "size", "pages"}
    assert all("password_hash" not in u for u in r.json()["items"])
    ins = client.get("/api/admin/users?role=insurance_staff", headers=admin).json()["items"]
    assert ins and all(u["role"] == "insurance_staff" and u["insurer_id"] for u in ins)
    assert client.get("/api/admin/users?role=hacker", headers=admin).status_code == 422
    found = client.get("/api/admin/users?q=bh_demo", headers=admin).json()
    assert found["total"] >= 1


def test_create_staff_and_login(client, admin):
    body, r = _new(client, admin)
    assert r.status_code == 201, r.text
    u = r.json()
    assert u["role"] == "registrar" and u["is_active"] and "password_hash" not in u and "temporary_password" not in u
    assert _login(client, body).status_code == 200
    assert client.post("/api/admin/users", json=body, headers=admin).status_code == 409     # trùng tên đăng nhập


def test_create_with_generated_password(client, admin):
    name = f"t_{uuid.uuid4().hex[:10]}"
    r = client.post("/api/admin/users", json={"username": name, "full_name": "Mật Khẩu Tạm", "role": "registrar"},
                    headers=admin)
    assert r.status_code == 201
    tmp = r.json()["temporary_password"]
    assert len(tmp) >= 8
    assert client.post("/api/auth/login", json={"username": name, "password": tmp}).status_code == 200


def test_role_insurer_rules(client, admin):
    _, r = _new(client, admin, role="insurance_staff")                       # thiếu insurer_id
    assert r.status_code == 400
    _, r = _new(client, admin, role="registrar", insurer_id=1)               # vai trò khác mà có insurer
    assert r.status_code == 400
    _, r = _new(client, admin, role="insurance_staff", insurer_id=999999)    # công ty không tồn tại
    assert r.status_code == 400
    iid = client.get("/api/admin/insurers", headers=admin).json()[0]["insurer_id"]
    _, r = _new(client, admin, role="insurance_staff", insurer_id=iid)
    assert r.status_code == 201 and r.json()["insurer_id"] == iid


@pytest.mark.parametrize("over", [{"password": "123"}, {"username": "a b"}, {"role": "superuser"},
                                  {"citizen_id": "abc"}, {"email": "khong-hop-le"}])
def test_create_validation(client, admin, over):
    _, r = _new(client, admin, **over)
    assert r.status_code == 422


def test_deactivate_blocks_immediately_and_activate_restores(client, admin):
    body, r = _new(client, admin)
    uid = r.json()["user_id"]
    token = _login(client, body).json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=hdr).status_code == 200

    assert client.post(f"/api/admin/users/{uid}/deactivate", headers=admin).json()["is_active"] is False
    assert client.get("/api/auth/me", headers=hdr).status_code == 401        # token cũ hết tác dụng ngay
    assert _login(client, body).status_code == 403                           # đăng nhập bị từ chối
    assert client.get("/api/admin/users?is_active=false&size=100", headers=admin).json()["total"] >= 1

    assert client.post(f"/api/admin/users/{uid}/activate", headers=admin).json()["is_active"] is True
    assert _login(client, body).status_code == 200


def test_admin_cannot_deactivate_self(client, admin):
    me = client.get("/api/auth/me", headers=admin).json()["user_id"]
    assert client.post(f"/api/admin/users/{me}/deactivate", headers=admin).status_code == 400
    assert client.get("/api/auth/me", headers=admin).status_code == 200


def test_update_user(client, admin):
    body, r = _new(client, admin)
    uid = r.json()["user_id"]
    ok = client.patch(f"/api/admin/users/{uid}", json={"phone": "0911222333", "full_name": "  Tên Mới  "}, headers=admin)
    assert ok.status_code == 200 and ok.json()["phone"] == "0911222333" and ok.json()["full_name"] == "Tên Mới"
    cleared = client.patch(f"/api/admin/users/{uid}", json={"phone": None}, headers=admin)
    assert cleared.json()["phone"] is None
    assert client.patch(f"/api/admin/users/{uid}", json={}, headers=admin).status_code == 400
    assert client.patch(f"/api/admin/users/{uid}", json={"full_name": None}, headers=admin).status_code == 400
    assert client.patch(f"/api/admin/users/{uid}", json={"insurer_id": 1}, headers=admin).status_code == 400
    assert client.patch("/api/admin/users/999999999", json={"phone": "1"}, headers=admin).status_code == 404


def test_reset_password(client, admin):
    body, r = _new(client, admin)
    uid = r.json()["user_id"]
    res = client.post(f"/api/admin/users/{uid}/reset-password", json={}, headers=admin).json()
    tmp = res["temporary_password"]
    assert _login(client, body).status_code == 400                           # mật khẩu cũ không còn dùng được
    assert client.post("/api/auth/login", json={"username": body["username"], "password": tmp}).status_code == 200
    res2 = client.post(f"/api/admin/users/{uid}/reset-password", json={"new_password": "DatLai@456"}, headers=admin)
    assert res2.json() == {"user_id": uid, "ok": True}
    assert client.post("/api/auth/login", json={"username": body["username"], "password": "DatLai@456"}).status_code == 200
