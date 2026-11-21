"""Đồng thời: nhiều lần bấm "nộp phạt" cùng lúc cho một vi phạm chỉ được thành công đúng một lần,
và chỉ có đúng một giao dịch success trong bảng payments."""
import datetime as dt
import os
from concurrent.futures import ThreadPoolExecutor

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.integration, pytest.mark.concurrency]


def _notified_violation(client, owner, officer):
    """Tạo vi phạm mới của xe do 'owner' sở hữu và đưa tới trạng thái 'notified'."""
    plate = client.get("/api/vehicles/mine", headers=owner).json()[0]["plate_number"]
    vt = client.get("/api/catalog/violation-types", headers=officer).json()[0]
    cam = client.get("/api/catalog/cameras", headers=officer).json()[0]
    when = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)).isoformat()
    v = client.post("/api/violations", headers=officer, json={
        "plate_number": plate, "violation_type_id": vt["violation_type_id"],
        "camera_id": cam["camera_id"], "occurred_at": when})
    assert v.status_code == 201, v.text
    vid = v.json()["violation_id"]
    assert client.post(f"/api/violations/{vid}/verify", headers=officer).status_code == 200
    n = client.post(f"/api/violations/{vid}/notify", headers=officer, json={
        "fine_amount": int(vt["min_fine"]), "due_date": (dt.date.today() + dt.timedelta(days=30)).isoformat()})
    assert n.status_code == 200, n.text
    return vid


def test_five_parallel_payments_only_one_wins(client, owner, officer):
    vid = _notified_violation(client, owner, officer)

    def pay(_):
        with TestClient(app) as c:
            return c.post(f"/api/violations/{vid}/pay", headers=owner, json={}).status_code

    with ThreadPoolExecutor(max_workers=5) as ex:
        codes = list(ex.map(pay, range(5)))

    assert codes.count(200) == 1, codes
    assert all(c == 409 for c in codes if c != 200), codes
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        ok = conn.execute("SELECT count(*) FROM payments WHERE violation_id = %s AND status = 'success'",
                          (vid,)).fetchone()[0]
        st = conn.execute("SELECT status FROM violations WHERE violation_id = %s", (vid,)).fetchone()[0]
    assert ok == 1 and st == "paid"


def test_failed_payment_keeps_violation_payable(client, owner, officer):
    vid = _notified_violation(client, owner, officer)
    r = client.post(f"/api/violations/{vid}/pay", headers=owner, json={"simulate_fail": True})
    assert r.status_code == 200 and r.json()["violation_status"] == "notified"
    assert client.post(f"/api/violations/{vid}/pay", headers=owner, json={}).status_code == 200
