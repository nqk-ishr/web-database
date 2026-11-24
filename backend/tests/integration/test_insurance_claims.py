"""Nghiệp vụ 3: mua/thanh toán/gia hạn/hủy hợp đồng và yêu cầu bồi thường (gồm mất cắp)."""
import datetime as dt

import pytest

pytestmark = pytest.mark.integration


# ======================= HỢP ĐỒNG =======================
def test_buy_and_pay_policy(client, owner, make_vehicle, first_product, buy_policy):
    v = make_vehicle(owner)
    prod = first_product(owner, v)
    if not prod:
        pytest.skip("Không có gói bảo hiểm cho loại xe này")
    r = buy_policy(owner, v, prod)
    assert r.status_code == 201 and r.json()["status"] == "pending_payment" and r.json()["premium"] > 0
    pid = r.json()["policy_id"]

    failed = client.post(f"/api/policies/{pid}/pay", json={"simulate_fail": True}, headers=owner).json()
    assert failed["status"] == "failed" and failed["policy_status"] == "pending_payment" and failed["certificate_code"] is None
    ok = client.post(f"/api/policies/{pid}/pay", json={}, headers=owner).json()
    assert ok["status"] == "success" and ok["policy_status"] == "active" and ok["certificate_code"]
    assert client.post(f"/api/policies/{pid}/pay", json={}, headers=owner).status_code == 409      # không trả hai lần

    d = client.get(f"/api/policies/{pid}", headers=owner).json()
    assert d["status"] == "active" and [p["status"] for p in d["payments"]] == ["failed", "success"]
    assert pid in {p["policy_id"] for p in client.get("/api/me/policies", headers=owner).json()}


def test_policy_rules(client, owner, other_owner, make_vehicle, first_product, buy_policy):
    v = make_vehicle(owner)
    prod = first_product(owner, v)
    if not prod:
        pytest.skip("Không có gói bảo hiểm cho loại xe này")
    yesterday = dt.date.today() - dt.timedelta(days=1)
    assert buy_policy(owner, v, prod, yesterday).status_code == 400                  # bắt đầu ở quá khứ
    assert buy_policy(other_owner, v, prod).status_code == 409                       # không phải chủ xe

    pid = buy_policy(owner, v, prod).json()["policy_id"]
    assert buy_policy(owner, v, prod).status_code == 409                             # chỉ một hợp đồng chờ thanh toán
    assert client.post(f"/api/policies/{pid}/pay", json={}, headers=other_owner).status_code == 403
    assert client.post(f"/api/policies/{pid}/cancel", headers=other_owner).status_code == 403
    assert client.post(f"/api/policies/{pid}/cancel", headers=owner).json()["status"] == "cancelled"
    assert client.post(f"/api/policies/{pid}/cancel", headers=owner).status_code == 409
    assert client.post(f"/api/policies/{pid}/pay", json={}, headers=owner).status_code == 409
    assert buy_policy(owner, v, prod).status_code == 201                             # hủy rồi thì mua lại được


def test_active_policy_cannot_be_cancelled(client, owner, make_vehicle, active_policy):
    v = make_vehicle(owner)
    pid = active_policy(owner, v)
    assert client.post(f"/api/policies/{pid}/cancel", headers=owner).status_code == 409


def test_overlap_is_blocked_and_payment_rolled_back(client, owner, make_vehicle, active_policy, first_product, buy_policy):
    v = make_vehicle(owner)
    pid1 = active_policy(owner, v)
    prod = first_product(owner, v)
    second = buy_policy(owner, v, prod)                          # cùng ngày bắt đầu => chồng hiệu lực
    if second.status_code == 409:
        return                                                   # bị chặn ngay lúc mua: cũng đúng
    pid2 = second.json()["policy_id"]
    assert client.post(f"/api/policies/{pid2}/pay", json={}, headers=owner).status_code == 409
    d = client.get(f"/api/policies/{pid2}", headers=owner).json()
    assert d["status"] == "pending_payment" and d["payments"] == []     # rollback: không còn giao dịch nào
    assert client.get(f"/api/policies/{pid1}", headers=owner).json()["status"] == "active"


def test_renewal_right_after_expiry(client, owner, make_vehicle, active_policy, first_product):
    v = make_vehicle(owner)
    pid1 = active_policy(owner, v)
    end = dt.date.fromisoformat(client.get(f"/api/policies/{pid1}", headers=owner).json()["end_date"])
    pid2 = active_policy(owner, v, start=end + dt.timedelta(days=1))               # gia hạn liền kề
    assert client.get(f"/api/policies/{pid2}", headers=owner).json()["status"] == "active"


# ======================= BỒI THƯỜNG =======================
def test_claim_lifecycle_approve_and_pay(client, owner, other_owner, make_vehicle, active_policy, make_claim,
                                         staff_for_claim, login):
    v = make_vehicle(owner)
    pid = active_policy(owner, v)
    r = make_claim(owner, v, pid)
    assert r.status_code == 201 and r.json()["status"] == "pending_review"
    cid = r.json()["claim_id"]
    staff, other_staff = staff_for_claim(cid)

    assert client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 1}, headers=other_staff).status_code == 403
    assert client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 1}, headers=owner).status_code == 403
    assert client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 2_000_000},
                       headers=staff).status_code == 400                                    # vượt số tiền đề nghị
    assert client.post(f"/api/claims/{cid}/request-info", json={"note": "Gửi thêm ảnh"},
                       headers=staff).json()["status"] == "needs_more_info"
    assert client.post(f"/api/claims/{cid}/supplement", json={"description": "Đã bổ sung"},
                       headers=other_owner).status_code == 403
    assert client.post(f"/api/claims/{cid}/supplement", json={"description": "Đã bổ sung"},
                       headers=owner).json()["status"] == "pending_review"
    a = client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 800_000, "note": "Đồng ý"}, headers=staff)
    assert a.status_code == 200 and a.json()["status"] == "approved"
    assert client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 800_000}, headers=staff).status_code == 409
    assert client.post(f"/api/claims/{cid}/cancel", json={"reason": "x"}, headers=owner).status_code == 409

    assert client.post(f"/api/claims/{cid}/pay", headers=staff).json()["status"] == "paid"
    assert client.post(f"/api/claims/{cid}/pay", headers=staff).status_code == 409
    d = client.get(f"/api/claims/{cid}", headers=owner).json()
    assert d["status"] == "paid" and d["approved_amount"] == 800_000 and d["paid_at"]
    assert client.get(f"/api/claims/{cid}", headers=other_owner).status_code == 404
    assert client.get(f"/api/claims/{cid}", headers=other_staff).status_code == 404


def test_claim_reject_and_withdraw(client, owner, other_owner, make_vehicle, active_policy, make_claim, staff_for_claim):
    v = make_vehicle(owner)
    pid = active_policy(owner, v)
    cid = make_claim(owner, v, pid).json()["claim_id"]
    staff, _ = staff_for_claim(cid)
    assert client.post(f"/api/claims/{cid}/reject", json={}, headers=staff).status_code == 422
    assert client.post(f"/api/claims/{cid}/reject", json={"note": "Ngoài phạm vi"}, headers=staff).json()["status"] == "rejected"
    assert client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 1}, headers=staff).status_code == 409

    cid2 = make_claim(owner, v, pid).json()["claim_id"]
    assert client.post(f"/api/claims/{cid2}/cancel", json={"reason": "x"}, headers=other_owner).status_code == 403
    assert client.post(f"/api/claims/{cid2}/cancel", json={"reason": "Nhầm"}, headers=owner).json()["status"] == "cancelled"


def test_claim_rules_enforced_by_database(client, owner, other_owner, make_vehicle, active_policy, first_product,
                                          buy_policy, make_claim, ownership_start):
    v = make_vehicle(owner)
    pid = active_policy(owner, v)
    future = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).isoformat()
    assert make_claim(owner, v, pid, event=future).status_code == 409               # sự kiện ở tương lai
    owner_since = ownership_start(owner, v["vehicle_id"])
    assert make_claim(other_owner, v, pid, event=owner_since).status_code == 409      # không phải chủ xe lúc xảy ra
    long_ago = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=400)).isoformat()
    assert make_claim(owner, v, pid, event=long_ago).status_code == 409            # ngoài hiệu lực hợp đồng
    assert make_claim(owner, v, pid, amount=0).status_code == 422

    prod = first_product(owner, v)
    pending = buy_policy(owner, v, prod, dt.date.today() + dt.timedelta(days=800))  # hợp đồng chưa thanh toán
    if pending.status_code == 201:
        assert make_claim(owner, v, pending.json()["policy_id"]).status_code == 409


def test_theft_claim_flow_marks_vehicle_stolen(client, owner, other_owner, registrar, vehicle_with_product, buy_policy,
                                               make_claim, staff_for_claim, user_id):
    v, prod = vehicle_with_product(owner, theft=True)
    r = buy_policy(owner, v, prod)
    pid = r.json()["policy_id"]
    assert client.post(f"/api/policies/{pid}/pay", json={}, headers=owner).status_code == 200
    # tạo thêm: một hồ sơ sang tên đang mở và một hợp đồng chờ thanh toán (sẽ bị hủy khi báo mất)
    tr = client.post("/api/requests/transfer", headers=owner,
                     json={"vehicle_id": v["vehicle_id"], "buyer_id": user_id(other_owner)})
    assert tr.status_code == 201
    end = dt.date.fromisoformat(client.get(f"/api/policies/{pid}", headers=owner).json()["end_date"])
    pending = buy_policy(owner, v, prod, end + dt.timedelta(days=1))
    assert pending.status_code == 201

    c = make_claim(owner, v, pid, ctype="theft", amount=5_000_000)
    assert c.status_code == 201, c.text
    cid = c.json()["claim_id"]
    assert make_claim(owner, v, pid, ctype="theft").status_code == 409             # chỉ một yêu cầu mất cắp đang mở

    staff, _ = staff_for_claim(cid)
    a = client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 4_000_000}, headers=staff)
    assert a.status_code == 200, a.text
    body = a.json()
    assert body["vehicle_status"] == "stolen" and body["cancelled_requests"] == 1 and body["cancelled_policies"] == 1

    assert client.get(f"/api/vehicles/{v['vehicle_id']}", headers=owner).json()["status"] == "stolen"
    assert client.get(f"/api/requests/{tr.json()['request_id']}", headers=registrar).json()["status"] == "cancelled"
    assert client.get(f"/api/policies/{pending.json()['policy_id']}", headers=owner).json()["status"] == "cancelled"
    events = [h["event_type"] for h in client.get(f"/api/vehicles/{v['vehicle_id']}/history", headers=owner).json()]
    assert "reported_stolen" in events

    assert client.post(f"/api/vehicles/{v['vehicle_id']}/found", json={"reason": "Đã tìm thấy"},
                       headers=owner).status_code == 403
    assert client.post(f"/api/vehicles/{v['vehicle_id']}/found", json={"reason": "Đã tìm thấy"},
                       headers=registrar).json()["status"] == "normal"
    assert client.post(f"/api/vehicles/{v['vehicle_id']}/found", json={"reason": "lần 2"}, headers=registrar).status_code == 409
    assert client.post(f"/api/vehicles/{v['vehicle_id']}/revoke", json={"reason": "x"}, headers=registrar).status_code == 409


def test_theft_needs_theft_coverage(client, owner, vehicle_with_product, active_policy, make_claim):
    v, prod = vehicle_with_product(owner, theft=False)
    pid = active_policy(owner, v, product=prod)
    assert make_claim(owner, v, pid, ctype="theft").status_code == 409


def test_claim_lists_and_scope(client, owner, other_owner, make_vehicle, active_policy, make_claim, staff_for_claim):
    v = make_vehicle(owner)
    cid = make_claim(owner, v, active_policy(owner, v)).json()["claim_id"]
    assert cid in {c["claim_id"] for c in client.get("/api/me/claims", headers=owner).json()}
    assert cid not in {c["claim_id"] for c in client.get("/api/me/claims", headers=other_owner).json()}
    staff, other_staff = staff_for_claim(cid)
    assert cid in {c["claim_id"] for c in client.get("/api/claims?size=100", headers=staff).json()["items"]}
    assert cid not in {c["claim_id"] for c in client.get("/api/claims?status=all&size=100", headers=other_staff).json()["items"]}


def test_policy_list_and_vehicle_expose_fields_for_ui(client, owner, make_vehicle, active_policy):
    v = make_vehicle(owner)
    pid = active_policy(owner, v)
    row = {p["policy_id"]: p for p in client.get("/api/me/policies", headers=owner).json()}[pid]
    assert row["insurer"] and row["term_months"] > 0 and row["plate_number"] == v["plate"] and row["is_expired"] is False
    veh = client.get(f"/api/vehicles/{v['vehicle_id']}", headers=owner).json()
    assert veh["policy"]["policy_id"] == pid and veh["policy"]["status"] == "active"
    assert client.get("/api/insurance/products", params={"vehicle_id": v["vehicle_id"]}, headers=owner).json()


def test_my_claims_listing_has_ui_fields(client, owner, make_vehicle, active_policy, make_claim):
    v = make_vehicle(owner)
    cid = make_claim(owner, v, active_policy(owner, v)).json()["claim_id"]
    row = {c["claim_id"]: c for c in client.get("/api/me/claims", headers=owner).json()}[cid]
    assert row["plate_number"] == v["plate"] and row["insurer"] and row["product_name"] and row["certificate_code"]
    assert {"event_time", "event_location", "requested_amount", "approved_amount", "review_note", "cancel_reason", "paid_at"} <= row.keys()
