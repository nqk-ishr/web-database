"""Tệp đính kèm cho hồ sơ đăng ký/sang tên và yêu cầu bồi thường.

* Nội dung lưu trên đĩa (UPLOAD_DIR, trên VM 3 là volume), tên tệp trên đĩa là chuỗi ngẫu nhiên;
  bảng `attachments` chỉ giữ siêu dữ liệu.
* Chỉ nhận PDF / JPG / PNG, nhận dạng bằng 'chữ ký' đầu tệp (không tin Content-Type do máy khách gửi).
* Tối đa MAX_UPLOAD_BYTES mỗi tệp, 10 tệp mỗi hồ sơ/yêu cầu.
* Chỉ người gửi được tải lên/xóa, và chỉ khi hồ sơ còn đang mở. Ngoài phạm vi truy cập => 404.
"""
import os
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import (ADMIN, INSURANCE, MAX_UPLOAD_BYTES, OPEN_REQUEST, OWNER, REGISTRAR,
                             UPLOAD_DIR)
from app.core.security import need
from app.db.session import found, q, q1, tx

router = APIRouter(tags=["attachments"])

MAX_FILES = 10
OPEN_CLAIM = ("pending_review", "needs_more_info")
SIGNATURES = ((b"%PDF-", "application/pdf"), (b"\x89PNG\r\n\x1a\n", "image/png"), (b"\xff\xd8\xff", "image/jpeg"))
LIST_COLS = "attachment_id, original_name, content_type, size_bytes, uploaded_by, created_at"


def _sniff(head: bytes):
    return next((ct for magic, ct in SIGNATURES if head.startswith(magic)), None)


def _clean_name(name) -> str:
    base = os.path.basename((name or "tep").replace("\\", "/"))
    base = re.sub(r'[\x00-\x1f"<>|:*?]', "_", base).strip(". ") or "tep"
    return base[-200:]


def _request_scope(cur, rid, u, write):
    r = found(q1(cur, """SELECT request_id, requester_id, buyer_id, status FROM registration_requests
                         WHERE request_id = %s""", (rid,)), "Không tìm thấy hồ sơ")
    if u["role"] == OWNER:
        if not (r["requester_id"] == u["user_id"] or (not write and r["buyer_id"] == u["user_id"])):
            raise HTTPException(404, "Không tìm thấy hồ sơ")
    elif u["role"] not in (REGISTRAR, ADMIN):
        raise HTTPException(404, "Không tìm thấy hồ sơ")
    if write and r["status"] not in OPEN_REQUEST:
        raise HTTPException(409, f"Hồ sơ đang ở trạng thái {r['status']}, không thêm/xóa tệp được")
    return r


def _claim_scope(cur, cid, u, write):
    c = found(q1(cur, """SELECT c.claim_id, c.claimant_id, c.status, pr.insurer_id
                         FROM insurance_claims c
                         JOIN insurance_policies po USING (policy_id)
                         JOIN insurance_products pr USING (product_id)
                         WHERE c.claim_id = %s""", (cid,)), "Không tìm thấy yêu cầu bồi thường")
    ok = ((u["role"] == OWNER and c["claimant_id"] == u["user_id"])
          or (not write and u["role"] == INSURANCE and c["insurer_id"] == u["insurer_id"])
          or (not write and u["role"] == ADMIN))
    if not ok:
        raise HTTPException(404, "Không tìm thấy yêu cầu bồi thường")
    if write and c["status"] not in OPEN_CLAIM:
        raise HTTPException(409, f"Yêu cầu đang ở trạng thái {c['status']}, không thêm/xóa tệp được")
    return c


def _store(cur, column, parent_id, file: UploadFile, u):
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(400, "Tệp rỗng")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"Tệp vượt quá {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    ctype = _sniff(data[:8])
    if not ctype:
        raise HTTPException(415, "Chỉ nhận tệp PDF, JPG hoặc PNG")
    if q1(cur, f"SELECT count(*) AS n FROM attachments WHERE {column} = %s", (parent_id,))["n"] >= MAX_FILES:
        raise HTTPException(409, f"Mỗi hồ sơ tối đa {MAX_FILES} tệp")
    storage = uuid.uuid4().hex
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, storage)
    with open(path, "wb") as f:
        f.write(data)
    try:
        return q1(cur, f"""INSERT INTO attachments ({column}, uploaded_by, original_name, content_type,
                                                    size_bytes, storage_name)
                           VALUES (%s, %s, %s, %s, %s, %s) RETURNING {LIST_COLS}""",
                  (parent_id, u["user_id"], _clean_name(file.filename), ctype, len(data), storage))
    except Exception:
        os.remove(path)
        raise


@router.post("/requests/{rid}/attachments", status_code=201)
def upload_request_file(rid: int, file: UploadFile = File(...), u=Depends(need(OWNER))):
    with tx() as cur:
        _request_scope(cur, rid, u, write=True)
        return _store(cur, "request_id", rid, file, u)


@router.get("/requests/{rid}/attachments")
def list_request_files(rid: int, u=Depends(need(OWNER, REGISTRAR, ADMIN))):
    with tx() as cur:
        _request_scope(cur, rid, u, write=False)
        return q(cur, f"SELECT {LIST_COLS} FROM attachments WHERE request_id = %s ORDER BY attachment_id", (rid,))


@router.post("/claims/{cid}/attachments", status_code=201)
def upload_claim_file(cid: int, file: UploadFile = File(...), u=Depends(need(OWNER))):
    with tx() as cur:
        _claim_scope(cur, cid, u, write=True)
        return _store(cur, "claim_id", cid, file, u)


@router.get("/claims/{cid}/attachments")
def list_claim_files(cid: int, u=Depends(need(OWNER, INSURANCE, ADMIN))):
    with tx() as cur:
        _claim_scope(cur, cid, u, write=False)
        return q(cur, f"SELECT {LIST_COLS} FROM attachments WHERE claim_id = %s ORDER BY attachment_id", (cid,))


def _load(cur, aid, u, write):
    a = found(q1(cur, "SELECT * FROM attachments WHERE attachment_id = %s", (aid,)), "Không tìm thấy tệp")
    if a["request_id"]:
        _request_scope(cur, a["request_id"], u, write)
    else:
        _claim_scope(cur, a["claim_id"], u, write)
    return a


@router.get("/attachments/{aid}")
def download(aid: int, u=Depends(need(OWNER, REGISTRAR, INSURANCE, ADMIN))):
    with tx() as cur:
        a = _load(cur, aid, u, write=False)
    path = os.path.join(UPLOAD_DIR, a["storage_name"])
    if not os.path.isfile(path):
        raise HTTPException(404, "Tệp không còn trên máy chủ")
    return FileResponse(path, media_type=a["content_type"], filename=a["original_name"],
                        headers={"X-Content-Type-Options": "nosniff"})


@router.delete("/attachments/{aid}")
def delete_file(aid: int, u=Depends(need(OWNER))):
    with tx() as cur:
        a = _load(cur, aid, u, write=True)
        if a["uploaded_by"] != u["user_id"]:
            raise HTTPException(403, "Chỉ người tải lên mới xóa được tệp")
        cur.execute("DELETE FROM attachments WHERE attachment_id = %s", (aid,))
    try:
        os.remove(os.path.join(UPLOAD_DIR, a["storage_name"]))
    except FileNotFoundError:
        pass
    return {"ok": True}
