"""Nhật ký thao tác (audit log) và báo cáo thống kê."""
import pytest

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def admin(login):
    return login("admin01")


def _audit(client, admin, **params):
    r = client.get("/api/admin/audit-log", params=params, headers=admin)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- audit log ----------
def test_audit_log_is_admin_only(client, owner, registrar, officer):
    for h in (owner, registrar, officer):
        assert client.get("/api/admin/audit-log", headers=h).status_code == 403
    assert client.get("/api/admin/audit-log").status_code == 401


def test_registrar_approval_is_audited(client, admin, owner, make_vehicle):
    v = make_vehicle(owner)
    rows = _audit(client, admin, action="request.approve", entity_id=v["request_id"])["items"]
    assert len(rows) == 1 and rows[0]["actor"] == "canbo_dk01" and rows[0]["entity_type"] == "registration_request"
    assert rows[0]["detail"]["vehicle_id"] == v["vehicle_id"]


def test_failed_action_leaves_no_audit_entry(client, admin, owner, registrar, make_vehicle):
    taken = make_vehicle(owner)["plate"]
    import uuid
    tid = client.get("/api/catalog/vehicle-types", headers=owner).json()[0]["vehicle_type_id"]
    tag = uuid.uuid4().hex[:10].upper()
    rid = client.post("/api/requests/registration", headers=owner, json={
        "vehicle_type_id": tid, "chassis_number": f"UC{tag}", "engine_number": f"UE{tag}",
        "manufacture_year": 2024}).json()["request_id"]
    assert client.post(f"/api/requests/{rid}/approve", json={"plate_number": taken}, headers=registrar).status_code == 409
    assert _audit(client, admin, entity_type="registration_request", entity_id=rid)["total"] == 0   # rollback cả nhật ký


def test_violation_actions_are_audited(client, admin, owner, make_vehicle, make_violation):
    v = make_vehicle(owner)
    vid = make_violation(v, owner, stage="notified")
    actions = {r["action"] for r in _audit(client, admin, entity_type="violation", entity_id=vid)["items"]}
    assert {"violation.verify", "violation.notify"} <= actions


def test_admin_actions_audited_without_secrets(client, admin):
    import uuid
    name = f"t_{uuid.uuid4().hex[:10]}"
    uid = client.post("/api/admin/users", headers=admin, json={
        "username": name, "password": "Matkhau@123", "full_name": "Kiểm Toán", "role": "registrar"}).json()["user_id"]
    client.post(f"/api/admin/users/{uid}/reset-password", json={"new_password": "BiMat@12345"}, headers=admin)
    client.post(f"/api/admin/users/{uid}/deactivate", headers=admin)
    rows = _audit(client, admin, entity_type="user", entity_id=uid, size=50)["items"]
    assert {"user.create", "user.reset_password", "user.deactivate"} <= {r["action"] for r in rows}
    assert "Matkhau@123" not in str(rows) and "BiMat@12345" not in str(rows)


def test_claim_decisions_are_audited(client, admin, owner, make_vehicle, active_policy, make_claim, staff_for_claim):
    v = make_vehicle(owner)
    cid = make_claim(owner, v, active_policy(owner, v)).json()["claim_id"]
    staff, _ = staff_for_claim(cid)
    client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 100_000}, headers=staff)
    client.post(f"/api/claims/{cid}/pay", headers=staff)
    actions = {r["action"] for r in _audit(client, admin, entity_type="insurance_claim", entity_id=cid)["items"]}
    assert {"claim.approved", "claim.paid"} <= actions


def test_audit_filters_and_paging(client, admin):
    page = _audit(client, admin, size=2)
    assert len(page["items"]) <= 2 and set(page) == {"items", "total", "page", "size", "pages"}
    ids = [r["audit_id"] for r in page["items"]]
    assert ids == sorted(ids, reverse=True)                                     # mới nhất trước
    assert client.get("/api/admin/audit-log?from_date=2026-12-31&to_date=2026-01-01", headers=admin).status_code == 400


# ---------- báo cáo ----------
def test_report_roles(client, owner, registrar, officer, login):
    ins, admin = login("bh_demoa01"), login("admin01")
    assert client.get("/api/reports/violations", headers=owner).status_code == 403
    assert client.get("/api/reports/violations", headers=registrar).status_code == 403
    assert client.get("/api/reports/violations", headers=officer).status_code == 200
    assert client.get("/api/reports/unpaid-fines", headers=admin).status_code == 200
    assert client.get("/api/reports/insurance", headers=ins).status_code == 200
    assert client.get("/api/reports/insurance", headers=officer).status_code == 403


def test_violation_report_shape_and_filter(client, officer):
    r = client.get("/api/reports/violations", headers=officer).json()
    assert set(r) == {"by_type", "by_month", "by_status"}
    empty = client.get("/api/reports/violations?from_date=2999-01-01", headers=officer).json()
    assert empty == {"by_type": [], "by_month": [], "by_status": []}
    assert client.get("/api/reports/violations?from_date=khong-phai-ngay", headers=officer).status_code == 422


def test_unpaid_report_includes_new_debt(client, officer, owner, make_vehicle, make_violation):
    v = make_vehicle(owner)
    make_violation(v, owner, stage="notified")
    rows = client.get("/api/reports/unpaid-fines", headers=officer).json()
    mine = [r for r in rows if r["plate_number"] == v["plate"]]
    assert len(mine) == 1 and mine[0]["violations"] == 1 and mine[0]["total_fine"] > 0 and mine[0]["overdue_violations"] == 0


def test_insurance_report_is_scoped_by_insurer(client, login):
    a, b, admin = login("bh_demoa01"), login("bh_demob01"), login("admin01")
    keys = {"expiring_30_days", "premium_by_month", "payout_by_month", "by_vehicle_type"}
    ra, rb, rall = (client.get("/api/reports/insurance", headers=h).json() for h in (a, b, admin))
    assert keys <= set(ra) and keys <= set(rall)
    total = lambda rep: sum(float(x["premium"]) for x in rep["premium_by_month"])
    assert total(ra) + total(rb) <= total(rall) + 0.01
    assert {x["certificate_code"] for x in ra["expiring_30_days"]}.isdisjoint({x["certificate_code"] for x in rb["expiring_30_days"]})
