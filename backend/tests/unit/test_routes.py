"""Kiểm thử đơn vị: cấu hình route và bắt buộc đăng nhập (không chạm CSDL)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.parametrize("method,path", [
    ("get", "/api/auth/me"), ("get", "/api/vehicles/mine"), ("get", "/api/violations/mine"),
    ("get", "/api/me/vehicles"), ("post", "/api/violations/1/pay"), ("get", "/api/reports/unpaid-fines"),
    ("get", "/api/requests"), ("get", "/api/catalog/cameras"),
    ("get", "/api/requests/1"), ("get", "/api/violations/1"), ("get", "/api/claims/1"),
    ("get", "/api/policies/1"), ("get", "/api/vehicles"), ("get", "/api/vehicles/1/history"),
    ("get", "/api/claims"), ("get", "/api/violations"),
    ("get", "/api/admin/users"),
    ("post", "/api/admin/users/1/deactivate"), ("post", "/api/admin/users/1/reset-password"),
    ("get", "/api/admin/roles"), ("get", "/api/admin/insurers"),
])
def test_requires_token(method, path):
    r = getattr(client, method)(path)
    assert r.status_code == 401


def test_garbage_token_is_401():
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401


def test_register_validation():
    r = client.post("/api/auth/register", json={"username": "a", "password": "123", "full_name": "x",
                                                "citizen_id": "abc"})
    assert r.status_code == 422


def test_openapi_exposed():
    assert client.get("/api/openapi.json").status_code == 200


@pytest.mark.parametrize("path", ["/api/requests", "/api/violations", "/api/claims", "/api/vehicles"])
def test_list_endpoints_document_pagination_and_search(path):
    params = {p["name"] for p in client.get("/api/openapi.json").json()["paths"][path]["get"]["parameters"]}
    assert {"page", "size"} <= params
    if path != "/api/violations":
        assert "q" in params


def test_admin_writes_require_token():
    body = {"username": "abc", "full_name": "x", "role": "registrar"}      # thân hợp lệ => chỉ có thể lỗi vì token
    assert client.post("/api/admin/users", json=body).status_code == 401
    assert client.patch("/api/admin/users/1", json={"phone": "1"}).status_code == 401
