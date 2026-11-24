"""Tệp đính kèm: tải lên, giới hạn, nhận dạng loại tệp, phân quyền, trạng thái hồ sơ."""
import os

import pytest

pytestmark = pytest.mark.integration

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
PDF = b"%PDF-1.4\n% thu nghiem\n"
MAX = int(os.environ.get("MAX_UPLOAD_BYTES", 5 * 1024 * 1024))


def _new_request(client, owner):
    import uuid
    tid = client.get("/api/catalog/vehicle-types", headers=owner).json()[0]["vehicle_type_id"]
    tag = uuid.uuid4().hex[:10].upper()
    r = client.post("/api/requests/registration", headers=owner, json={
        "vehicle_type_id": tid, "chassis_number": f"AC{tag}", "engine_number": f"AE{tag}", "manufacture_year": 2024})
    assert r.status_code == 201, r.text
    return r.json()["request_id"]


def _up(client, headers, rid, data=PNG, name="giay-to.png", kind="requests"):
    return client.post(f"/api/{kind}/{rid}/attachments", headers=headers, files={"file": (name, data, "image/png")})


def test_upload_list_download(client, owner, other_owner, registrar, login):
    rid = _new_request(client, owner)
    r = _up(client, owner, rid, name="../../etc/passwd.png")
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["original_name"] == "passwd.png" and a["content_type"] == "image/png" and a["size_bytes"] == len(PNG)

    assert [x["attachment_id"] for x in client.get(f"/api/requests/{rid}/attachments", headers=owner).json()] == [a["attachment_id"]]
    d = client.get(f"/api/attachments/{a['attachment_id']}", headers=owner)
    assert d.status_code == 200 and d.content == PNG
    assert d.headers["content-type"].startswith("image/png") and d.headers["x-content-type-options"] == "nosniff"
    assert client.get(f"/api/attachments/{a['attachment_id']}", headers=registrar).status_code == 200
    # người ngoài cuộc không thấy gì
    assert client.get(f"/api/requests/{rid}/attachments", headers=other_owner).status_code == 404
    assert client.get(f"/api/attachments/{a['attachment_id']}", headers=other_owner).status_code == 404
    assert client.delete(f"/api/attachments/{a['attachment_id']}", headers=other_owner).status_code == 404
    assert client.get(f"/api/requests/{rid}/attachments", headers=login("bh_demoa01")).status_code == 403
    assert client.get(f"/api/attachments/{a['attachment_id']}").status_code == 401


def test_file_validation(client, owner):
    rid = _new_request(client, owner)
    assert _up(client, owner, rid, data=b"", name="a.png").status_code == 400
    assert _up(client, owner, rid, data=b"day la van ban thuong", name="gia-mao.png").status_code == 415   # đuôi .png nhưng nội dung không phải
    assert _up(client, owner, rid, data=b"MZ\x90\x00 chuong trinh", name="x.pdf").status_code == 415
    assert _up(client, owner, rid, data=PNG + b"0" * MAX, name="lon.png").status_code == 413
    assert _up(client, owner, rid, data=PDF, name="ho-so.pdf").json()["content_type"] == "application/pdf"
    assert _up(client, owner, rid, data=b"\xff\xd8\xff\xe0" + b"0" * 10, name="anh.jpg").json()["content_type"] == "image/jpeg"


def test_file_count_limit(client, owner):
    rid = _new_request(client, owner)
    for _ in range(10):
        assert _up(client, owner, rid).status_code == 201
    assert _up(client, owner, rid).status_code == 409


def test_delete_and_closed_request(client, owner, registrar):
    rid = _new_request(client, owner)
    aid = _up(client, owner, rid).json()["attachment_id"]
    assert client.delete(f"/api/attachments/{aid}", headers=owner).status_code == 200
    assert client.get(f"/api/attachments/{aid}", headers=owner).status_code == 404
    keep = _up(client, owner, rid).json()["attachment_id"]
    assert client.post(f"/api/requests/{rid}/approve", json={"plate_number": f"AT{keep:06d}"[:15]},
                       headers=registrar).status_code == 200
    assert _up(client, owner, rid).status_code == 409                                  # hồ sơ đã duyệt: khóa tệp
    assert client.delete(f"/api/attachments/{keep}", headers=owner).status_code == 409
    assert client.get(f"/api/attachments/{keep}", headers=owner).status_code == 200    # vẫn tải xuống được


def test_claim_attachments(client, owner, other_owner, registrar, make_vehicle, active_policy, make_claim, staff_for_claim):
    v = make_vehicle(owner)
    cid = make_claim(owner, v, active_policy(owner, v)).json()["claim_id"]
    staff, other_staff = staff_for_claim(cid)
    r = _up(client, owner, cid, data=PDF, name="bien-ban.pdf", kind="claims")
    assert r.status_code == 201
    aid = r.json()["attachment_id"]
    assert _up(client, other_owner, cid, kind="claims").status_code == 404
    assert _up(client, staff, cid, kind="claims").status_code == 403                  # nhân viên chỉ xem, không tải lên
    assert len(client.get(f"/api/claims/{cid}/attachments", headers=staff).json()) == 1
    assert client.get(f"/api/claims/{cid}/attachments", headers=other_staff).status_code == 404
    assert client.get(f"/api/claims/{cid}/attachments", headers=registrar).status_code == 403
    assert client.get(f"/api/attachments/{aid}", headers=staff).content == PDF
    assert client.get(f"/api/attachments/{aid}", headers=other_staff).status_code == 404
    client.post(f"/api/claims/{cid}/approve", json={"approved_amount": 1}, headers=staff)
    assert _up(client, owner, cid, kind="claims").status_code == 409                  # đã duyệt: khóa tệp
