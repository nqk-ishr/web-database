"""Tích hợp: phân trang, lọc, tìm kiếm và phạm vi dữ liệu của danh sách / chi tiết phía cán bộ."""
import pytest

pytestmark = pytest.mark.integration


# ---------- phân trang và kiểm tra tham số ----------
def test_request_queue_pagination_shape(client, registrar):
    r = client.get("/api/requests?status=all&size=3", headers=registrar)
    assert r.status_code == 200
    b = r.json()
    assert set(b) == {"items", "total", "page", "size", "pages"}
    assert len(b["items"]) <= 3 and b["total"] >= len(b["items"])
    assert b["pages"] == -(-b["total"] // 3)
    if b["total"] > 3:
        p2 = client.get("/api/requests?status=all&size=3&page=2", headers=registrar).json()
        assert {i["request_id"] for i in p2["items"]}.isdisjoint({i["request_id"] for i in b["items"]})


@pytest.mark.parametrize("qs", ["status=bogus", "size=1000", "page=0", "sort=sideways", "request_type=x"])
def test_invalid_params_are_422(client, registrar, qs):
    assert client.get(f"/api/requests?{qs}", headers=registrar).status_code == 422


def test_date_range_validation(client, registrar):
    r = client.get("/api/requests?status=all&from_date=2026-12-31&to_date=2026-01-01", headers=registrar)
    assert r.status_code == 400


def test_filter_by_request_type(client, registrar):
    items = client.get("/api/requests?status=all&request_type=transfer&size=100", headers=registrar).json()["items"]
    assert all(i["request_type"] == "transfer" for i in items)


def test_search_is_safe(client, registrar):
    r = client.get("/api/requests", params={"status": "all", "q": "'; DROP TABLE users;--"}, headers=registrar)
    assert r.status_code == 200 and r.json()["items"] == []
    # ký tự đại diện của LIKE được thoát: "%" chỉ khớp ký tự % thật
    assert client.get("/api/requests", params={"status": "all", "q": "%"}, headers=registrar).json()["total"] == 0
    assert client.get("/api/auth/me", headers=registrar).status_code == 200      # bảng users còn nguyên


# ---------- vi phạm ----------
def test_violation_filters(client, officer):
    un = client.get("/api/violations?status=all&unmatched=true&size=100", headers=officer).json()["items"]
    assert all(v["vehicle_id"] is None and v["unmatched"] for v in un)
    od = client.get("/api/violations?status=all&overdue=true&size=100", headers=officer).json()["items"]
    assert all(v["is_overdue"] and v["status"] == "notified" for v in od)
    pl = client.get("/api/violations?status=all&plate=59X3&size=100", headers=officer).json()["items"]
    assert all("59X3" in v["plate_number_captured"] for v in pl)


def test_violation_list_roles(client, owner, registrar, officer, login):
    assert client.get("/api/violations", headers=owner).status_code == 403
    assert client.get("/api/violations", headers=registrar).status_code == 403
    assert client.get("/api/violations", headers=officer).status_code == 200
    assert client.get("/api/violations", headers=login("admin01")).status_code == 200


def test_violation_detail_scope(client, owner, other_owner, officer, registrar):
    assert client.get("/api/violations/mine", headers=owner).status_code == 200     # không bị nuốt bởi /{vid}
    mine = client.get("/api/violations/mine", headers=owner).json()
    if not mine:
        pytest.skip("Chủ xe demo chưa có vi phạm")
    vid = mine[0]["violation_id"]
    d = client.get(f"/api/violations/{vid}", headers=owner)
    assert d.status_code == 200 and "payments" in d.json()
    assert client.get(f"/api/violations/{vid}", headers=other_owner).status_code == 404
    assert client.get(f"/api/violations/{vid}", headers=officer).status_code == 200
    assert client.get(f"/api/violations/{vid}", headers=registrar).status_code == 403
    assert client.get("/api/violations/999999999", headers=officer).status_code == 404


# ---------- bảo hiểm: phạm vi theo công ty ----------
def test_claims_scoped_by_insurer(client, login):
    a, b, admin = login("bh_demoa01"), login("bh_demob01"), login("admin01")
    ids = lambda h: {c["claim_id"] for c in client.get("/api/claims?status=all&size=100", headers=h).json()["items"]}
    ia, ib, iall = ids(a), ids(b), ids(admin)
    assert ia.isdisjoint(ib) and (ia | ib) <= iall
    for cid in list(ia)[:3]:
        assert client.get(f"/api/claims/{cid}", headers=a).status_code == 200
        assert client.get(f"/api/claims/{cid}", headers=b).status_code == 404
        assert client.get(f"/api/claims/{cid}", headers=admin).status_code == 200


def test_policy_detail_scope(client, owner, other_owner):
    pols = client.get("/api/me/policies", headers=owner).json()
    if not pols:
        pytest.skip("Chủ xe demo chưa có hợp đồng")
    pid = pols[0]["policy_id"]
    d = client.get(f"/api/policies/{pid}", headers=owner)
    assert d.status_code == 200 and {"payments", "claims"} <= d.json().keys()
    assert client.get(f"/api/policies/{pid}", headers=other_owner).status_code == 404


# ---------- hồ sơ đăng ký / sang tên ----------
def test_request_detail_scope(client, registrar, owner, other_owner):
    items = client.get("/api/requests?status=all&size=100", headers=registrar).json()["items"]
    assert items
    d = client.get(f"/api/requests/{items[0]['request_id']}", headers=registrar)
    assert d.status_code == 200 and {"history", "unpaid_violations"} <= d.json().keys()
    uid = {owner_hdr: client.get("/api/auth/me", headers=h).json()["user_id"]
           for owner_hdr, h in (("a", owner), ("b", other_owner))}
    for it in items:
        involved = {it["requester_id"], it["buyer_id"]}
        outsider = [h for k, h in (("a", owner), ("b", other_owner)) if uid[k] not in involved]
        if outsider:
            assert client.get(f"/api/requests/{it['request_id']}", headers=outsider[0]).status_code == 404
            return
    pytest.skip("Cả hai chủ xe demo đều liên quan mọi hồ sơ")


# ---------- tra cứu xe ----------
def test_vehicle_search_and_history(client, registrar, owner, other_owner):
    r = client.get("/api/vehicles?q=59X3", headers=registrar)
    assert r.status_code == 200 and any(v["plate_number"] == "59X3-123.45" for v in r.json()["items"])
    assert client.get("/api/vehicles", headers=owner).status_code == 403
    vid = client.get("/api/vehicles/mine", headers=owner).json()[0]["vehicle_id"]
    det = client.get(f"/api/vehicles/{vid}", headers=registrar)
    assert det.status_code == 200 and "current_owner" in det.json()
    assert client.get(f"/api/vehicles/{vid}/history", headers=registrar).status_code == 200
    assert client.get(f"/api/vehicles/{vid}/history", headers=owner).status_code == 200
    assert client.get(f"/api/vehicles/{vid}/history", headers=other_owner).status_code == 404
