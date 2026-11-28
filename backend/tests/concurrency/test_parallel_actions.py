"""Đồng thời: các thao tác tranh chấp cùng một tài nguyên chỉ được thành công đúng một lần,
dữ liệu cuối cùng vẫn nhất quán (khóa hàng, ràng buộc duy nhất)."""
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.integration, pytest.mark.concurrency]


def _parallel(fn, n):
    """Chạy fn(i) trên n luồng cùng lúc, mỗi luồng có TestClient riêng. Trả về danh sách mã trạng thái."""
    def run(i):
        with TestClient(app) as c:
            return fn(c, i).status_code
    with ThreadPoolExecutor(max_workers=n) as ex:
        return list(ex.map(run, range(n)))


def _one_winner(codes):
    assert codes.count(200) == 1, codes
    assert all(c == 409 for c in codes if c != 200), codes


def _submit(client, owner, tag=None):
    tag = tag or uuid.uuid4().hex[:10].upper()
    tid = client.get("/api/catalog/vehicle-types", headers=owner).json()[0]["vehicle_type_id"]
    r = client.post("/api/requests/registration", headers=owner, json={
        "vehicle_type_id": tid, "chassis_number": f"PC{tag}", "engine_number": f"PE{tag}", "manufacture_year": 2024})
    assert r.status_code == 201, r.text
    return r.json()["request_id"], f"PC{tag}"


def test_same_registration_approved_once(client, owner, registrar):
    rid, chassis = _submit(client, owner)
    plate = f"P{uuid.uuid4().hex[:8].upper()}"
    codes = _parallel(lambda c, i: c.post(f"/api/requests/{rid}/approve", json={"plate_number": plate}, headers=registrar), 5)
    _one_winner(codes)
    assert client.get("/api/vehicles", params={"q": chassis}, headers=registrar).json()["total"] == 1


def test_same_plate_for_different_requests(client, owner, registrar):
    rids = [_submit(client, owner)[0] for _ in range(5)]
    plate = f"Q{uuid.uuid4().hex[:8].upper()}"
    codes = _parallel(lambda c, i: c.post(f"/api/requests/{rids[i]}/approve", json={"plate_number": plate}, headers=registrar), 5)
    _one_winner(codes)
    assert client.get("/api/vehicles", params={"q": plate}, headers=registrar).json()["total"] == 1


def test_transfer_approved_once_single_current_owner(client, owner, other_owner, registrar, make_vehicle, user_id):
    v = make_vehicle(owner)
    rid = client.post("/api/requests/transfer", headers=owner,
                      json={"vehicle_id": v["vehicle_id"], "buyer_id": user_id(other_owner)}).json()["request_id"]
    assert client.post(f"/api/requests/{rid}/confirm", headers=other_owner).status_code == 200
    codes = _parallel(lambda c, i: c.post(f"/api/requests/{rid}/approve", json={}, headers=registrar), 4)
    _one_winner(codes)
    hist = client.get(f"/api/vehicles/{v['vehicle_id']}/ownership", headers=registrar).json()
    assert [h["valid_to"] is None for h in hist].count(True) == 1 and len(hist) == 2


def test_policy_paid_once(client, owner, make_vehicle, first_product, buy_policy):
    v = make_vehicle(owner)
    prod = first_product(owner, v)
    if not prod:
        pytest.skip("Không có gói bảo hiểm cho loại xe này")
    pid = buy_policy(owner, v, prod).json()["policy_id"]
    codes = _parallel(lambda c, i: c.post(f"/api/policies/{pid}/pay", json={}, headers=owner), 4)
    _one_winner(codes)
    payments = client.get(f"/api/policies/{pid}", headers=owner).json()["payments"]
    assert [p["status"] for p in payments] == ["success"]


def test_claim_approved_once(client, owner, make_vehicle, active_policy, make_claim, staff_for_claim):
    v = make_vehicle(owner)
    cid = make_claim(owner, v, active_policy(owner, v)).json()["claim_id"]
    staff, _ = staff_for_claim(cid)
    codes = _parallel(lambda c, i: c.post(f"/api/claims/{cid}/approve", json={"approved_amount": 500_000}, headers=staff), 4)
    _one_winner(codes)
    assert client.get(f"/api/claims/{cid}", headers=owner).json()["approved_amount"] == 500_000
