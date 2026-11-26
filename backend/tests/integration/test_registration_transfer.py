"""Nghiệp vụ 1: đăng ký xe mới và sang tên (luồng hợp lệ, luồng lỗi, rollback, phân quyền)."""
import uuid

import pytest

pytestmark = pytest.mark.integration


def _reg_body(client, owner):
    tid = client.get("/api/catalog/vehicle-types", headers=owner).json()[0]["vehicle_type_id"]
    tag = uuid.uuid4().hex[:10].upper()
    return {"vehicle_type_id": tid, "chassis_number": f"XC{tag}", "engine_number": f"XE{tag}",
            "manufacture_year": 2024}


def _submit(client, owner, body=None):
    r = client.post("/api/requests/registration", json=body or _reg_body(client, owner), headers=owner)
    assert r.status_code == 201, r.text
    return r.json()["request_id"]


def _status(client, headers, rid):
    return client.get(f"/api/requests/{rid}", headers=headers).json()["status"]


# ======================= ĐĂNG KÝ MỚI =======================
def test_registration_happy_path(client, owner, registrar):
    body = _reg_body(client, owner)
    r = client.post("/api/requests/registration", json=body, headers=owner)
    assert r.status_code == 201 and r.json()["status"] == "pending_approval"
    rid = r.json()["request_id"]
    queue = client.get("/api/requests", params={"q": body["chassis_number"]}, headers=registrar).json()
    assert queue["total"] == 1 and queue["items"][0]["request_id"] == rid

    assert client.post(f"/api/requests/{rid}/approve", json={}, headers=registrar).status_code == 400   # thiếu biển số
    assert client.post(f"/api/requests/{rid}/approve", json={"plate_number": "X1"}, headers=owner).status_code == 403
    plate = f"R{uuid.uuid4().hex[:8].upper()}"
    a = client.post(f"/api/requests/{rid}/approve", json={"plate_number": f" {plate.lower()} "}, headers=registrar)
    assert a.status_code == 200 and a.json()["plate_number"] == plate           # chuẩn hóa: cắt khoảng trắng, in hoa
    vid = a.json()["vehicle_id"]

    mine = {v["vehicle_id"]: v for v in client.get("/api/vehicles/mine", headers=owner).json()}
    assert mine[vid]["plate_number"] == plate and mine[vid]["status"] == "normal"
    owners = client.get(f"/api/vehicles/{vid}/ownership", headers=owner).json()
    assert len(owners) == 1 and owners[0]["valid_to"] is None
    events = [h["event_type"] for h in client.get(f"/api/vehicles/{vid}/history", headers=owner).json()]
    assert "registered" in events
    d = client.get(f"/api/requests/{rid}", headers=registrar).json()
    assert d["status"] == "approved" and d["vehicle_id"] == vid
    assert client.post(f"/api/requests/{rid}/approve", json={"plate_number": "ZZ9"}, headers=registrar).status_code == 409


def test_registration_rejects_duplicates(client, owner, registrar):
    body = _reg_body(client, owner)
    _submit(client, owner, body)
    assert client.post("/api/requests/registration", json=body, headers=owner).status_code == 409   # hồ sơ mở trùng số khung
    existing = {**_reg_body(client, owner), "chassis_number": "RLHJF6320MY100001"}                   # xe 1 trong seed
    assert client.post("/api/requests/registration", json=existing, headers=owner).status_code == 409


def test_duplicate_plate_rolls_back_approval(client, owner, registrar, make_vehicle):
    taken = make_vehicle(owner)["plate"]
    rid = _submit(client, owner)
    r = client.post(f"/api/requests/{rid}/approve", json={"plate_number": taken}, headers=registrar)
    assert r.status_code == 409
    assert _status(client, registrar, rid) == "pending_approval"      # không bị duyệt dở dang
    d = client.get(f"/api/requests/{rid}", headers=registrar).json()
    assert d["vehicle_id"] is None


@pytest.mark.parametrize("over", [{"manufacture_year": 1900}, {"manufacture_year": 3000}, {"chassis_number": ""},
                                  {"vehicle_type_id": "x"}])
def test_registration_validation(client, owner, over):
    assert client.post("/api/requests/registration", json={**_reg_body(client, owner), **over},
                       headers=owner).status_code == 422


def test_registration_unknown_vehicle_type_is_400(client, owner):
    r = client.post("/api/requests/registration", json={**_reg_body(client, owner), "vehicle_type_id": 32000},
                    headers=owner)
    assert r.status_code == 400


def test_registration_roles(client, owner, registrar, officer):
    body = _reg_body(client, owner)
    assert client.post("/api/requests/registration", json=body, headers=registrar).status_code == 403
    assert client.post("/api/requests/registration", json=body, headers=officer).status_code == 403
    rid = _submit(client, owner)
    for path in ("reject", "request-info"):
        assert client.post(f"/api/requests/{rid}/{path}", json={"note": "x"}, headers=owner).status_code == 403


def test_request_info_then_resubmit_then_reject(client, owner, other_owner, registrar):
    rid = _submit(client, owner)
    assert client.post(f"/api/requests/{rid}/request-info", json={}, headers=registrar).status_code == 422
    assert client.post(f"/api/requests/{rid}/request-info", json={"note": "Bổ sung giấy tờ"},
                       headers=registrar).json()["status"] == "needs_more_info"
    assert client.post(f"/api/requests/{rid}/resubmit", headers=other_owner).status_code == 403
    assert client.post(f"/api/requests/{rid}/resubmit", headers=owner).json()["status"] == "pending_approval"
    assert client.post(f"/api/requests/{rid}/resubmit", headers=owner).status_code == 409      # không còn ở "cần bổ sung"
    assert client.post(f"/api/requests/{rid}/reject", json={"note": "Không hợp lệ"},
                       headers=registrar).json()["status"] == "rejected"
    d = client.get(f"/api/requests/{rid}", headers=registrar).json()
    assert d["status"] == "rejected" and d["review_note"] == "Không hợp lệ" and d["reviewer_id"]
    assert client.post(f"/api/requests/{rid}/cancel", json={"reason": "x"}, headers=owner).status_code == 409
    assert client.post(f"/api/requests/{rid}/approve", json={"plate_number": "Q1"}, headers=registrar).status_code == 409


def test_withdraw(client, owner, other_owner):
    rid = _submit(client, owner)
    assert client.post(f"/api/requests/{rid}/cancel", json={"reason": "Nhầm"}, headers=other_owner).status_code == 403
    r = client.post(f"/api/requests/{rid}/cancel", json={"reason": "Nhập nhầm"}, headers=owner)
    assert r.status_code == 200 and r.json()["status"] == "cancelled"


# ======================= SANG TÊN =======================
def _transfer(client, seller, vehicle, buyer_id):
    return client.post("/api/requests/transfer", json={"vehicle_id": vehicle["vehicle_id"], "buyer_id": buyer_id},
                       headers=seller)


def test_transfer_happy_path(client, owner, other_owner, registrar, make_vehicle, user_id):
    v = make_vehicle(owner)
    buyer = user_id(other_owner)
    r = _transfer(client, owner, v, buyer)
    assert r.status_code == 201 and r.json()["status"] == "pending_confirmation"
    rid = r.json()["request_id"]

    assert client.post(f"/api/requests/{rid}/confirm", headers=owner).status_code == 403          # bên bán không tự xác nhận
    assert client.post(f"/api/requests/{rid}/approve", json={}, headers=registrar).status_code == 409   # chưa xác nhận
    assert client.post(f"/api/requests/{rid}/confirm", headers=other_owner).json()["status"] == "pending_approval"
    a = client.post(f"/api/requests/{rid}/approve", json={}, headers=registrar)
    assert a.status_code == 200 and a.json()["status"] == "approved"

    assert v["vehicle_id"] in {x["vehicle_id"] for x in client.get("/api/vehicles/mine", headers=other_owner).json()}
    assert v["vehicle_id"] not in {x["vehicle_id"] for x in client.get("/api/vehicles/mine", headers=owner).json()}
    assert client.get(f"/api/vehicles/{v['vehicle_id']}", headers=owner).status_code == 404       # chủ cũ mất quyền xem
    hist = client.get(f"/api/vehicles/{v['vehicle_id']}/ownership", headers=registrar).json()
    assert len(hist) == 2 and hist[0]["valid_to"] is None and hist[1]["valid_to"] is not None
    events = [h["event_type"] for h in client.get(f"/api/vehicles/{v['vehicle_id']}/history", headers=registrar).json()]
    assert "ownership_transferred" in events


def test_transfer_buyer_declines(client, owner, other_owner, make_vehicle, user_id):
    v = make_vehicle(owner)
    rid = _transfer(client, owner, v, user_id(other_owner)).json()["request_id"]
    assert client.post(f"/api/requests/{rid}/decline", headers=owner).status_code == 403
    assert client.post(f"/api/requests/{rid}/decline", headers=other_owner).json()["status"] == "cancelled"
    assert v["vehicle_id"] in {x["vehicle_id"] for x in client.get("/api/vehicles/mine", headers=owner).json()}


def test_transfer_invalid_buyers_and_sellers(client, owner, other_owner, registrar, make_vehicle, user_id):
    v = make_vehicle(owner)
    assert _transfer(client, owner, v, user_id(registrar)).status_code == 400      # bên mua không phải chủ xe
    assert _transfer(client, owner, v, 999999999).status_code == 400               # không tồn tại
    assert _transfer(client, owner, v, user_id(owner)).status_code in (400, 409)   # tự sang tên cho mình
    assert _transfer(client, other_owner, v, user_id(owner)).status_code == 409    # người gửi không phải chủ hiện hành


def test_one_open_request_per_vehicle(client, owner, other_owner, make_vehicle, user_id):
    v = make_vehicle(owner)
    assert _transfer(client, owner, v, user_id(other_owner)).status_code == 201
    assert _transfer(client, owner, v, user_id(other_owner)).status_code == 409    # uq_req_one_open_per_vehicle


def test_unpaid_fine_blocks_transfer_until_paid(client, owner, other_owner, make_vehicle, make_violation, user_id):
    v = make_vehicle(owner)
    vid = make_violation(v, owner, stage="notified")
    r = _transfer(client, owner, v, user_id(other_owner))
    assert r.status_code == 409, "xe còn vi phạm chưa nộp phạt thì không được sang tên"
    assert client.post(f"/api/violations/{vid}/pay", json={}, headers=owner).status_code == 200
    assert _transfer(client, owner, v, user_id(other_owner)).status_code == 201     # hết nợ thì được


def test_my_requests_listing(client, owner, other_owner, make_vehicle, user_id):
    rid = _submit(client, owner)
    mine = {r["request_id"]: r for r in client.get("/api/me/requests", headers=owner).json()}
    r = mine[rid]
    assert r["request_type"] == "new_registration" and r["requester_name"] and r["declared_vehicle_type"]
    assert {"plate_number", "buyer_name", "review_note", "declared_chassis_number", "updated_at"} <= r.keys()
    assert rid not in {x["request_id"] for x in client.get("/api/me/requests", headers=other_owner).json()}

    v = make_vehicle(owner)
    tid = _transfer(client, owner, v, user_id(other_owner)).json()["request_id"]
    seen = {x["request_id"]: x for x in client.get("/api/me/requests", headers=other_owner).json()}
    assert seen[tid]["buyer_id"] == user_id(other_owner) and seen[tid]["plate_number"] == v["plate"]   # bên mua cũng thấy


def test_vehicle_exposes_transfer_blocking_violations(client, owner, make_vehicle, make_violation):
    v = make_vehicle(owner)
    mine = lambda: {x["vehicle_id"]: x for x in client.get("/api/vehicles/mine", headers=owner).json()}[v["vehicle_id"]]
    assert mine()["blocking_violations"] == 0
    make_violation(v, owner, stage="verified")                 # đã xác minh, chưa ra quyết định phạt
    row = mine()
    assert row["blocking_violations"] == 1 and row["unpaid_violations"] == 0       # chặn sang tên nhưng chưa "nộp được"
    assert client.get(f"/api/vehicles/{v['vehicle_id']}", headers=owner).json()["blocking_violations"] == 1
