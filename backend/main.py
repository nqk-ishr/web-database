"""Khoi dong backend de thu local (KHONG thuoc code nhom truong, chi them file nay).
Chay trong thu muc backend:  python -m uvicorn main:app --reload --port 8000
Them 2 endpoint dang nhap ma frontend dang goi: POST /api/auth/login, GET /api/auth/me.
Mat khau duoc kiem bang pgcrypto (crypt) ngay trong PostgreSQL nen khong can them thu vien bam mat khau.
"""
import datetime as dt
import os
from pathlib import Path

# nap .env (neu co) truoc khi import app.* vi config.py doc bien moi truong luc import
env = Path(__file__).with_name(".env")
if env.exists():
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import jwt
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import JWT_SECRET
from app.core.security import current_user
from app.db.session import q1, tx
from app.routers import router as business_router

app = FastAPI(title="Quan ly phuong tien - local test")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])

auth = APIRouter(prefix="/auth", tags=["auth (local test)"])


class LoginIn(BaseModel):
    username: str
    password: str


@auth.post("/login")
def login(body: LoginIn):
    with tx() as cur:
        u = q1(cur, """SELECT u.user_id, u.full_name, r.code AS role
                       FROM users u JOIN roles r USING (role_id)
                       WHERE u.username = %s AND u.is_active
                         AND u.password_hash = crypt(%s, u.password_hash)""", (body.username, body.password))
    if not u:
        raise HTTPException(401, "Sai ten dang nhap hoac mat khau")
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=int(os.environ.get("JWT_EXPIRE_MINUTES", "60")))
    token = jwt.encode({"sub": str(u["user_id"]), "exp": exp}, JWT_SECRET, algorithm="HS256")
    return {"access_token": token, "user": {"user_id": u["user_id"], "full_name": u["full_name"], "role": u["role"]}}


@auth.get("/me")
def me(u=Depends(current_user)):
    with tx() as cur:
        row = q1(cur, "SELECT user_id, full_name FROM users WHERE user_id = %s", (u["user_id"],))
    return {"user_id": row["user_id"], "full_name": row["full_name"], "role": u["role"]}


# ---- Lop tuong thich: frontend (mock) goi duong dan/hinh dang khac backend nhom truong ----
from app.core.config import TODAY
from app.core.security import need
from app.db.session import q

compat = APIRouter(tags=["tuong thich frontend (local test)"])

VEHICLE_SQL = f"""
    SELECT v.vehicle_id, v.plate_number, v.status, vt.name AS vehicle_type, v.manufacture_year,
           v.chassis_number, v.engine_number,
           (SELECT count(*) FROM violations x WHERE x.vehicle_id = v.vehicle_id
              AND x.liable_owner_id = %(uid)s AND x.status IN ('verified','notified')) AS unpaid_violations,
           (SELECT to_jsonb(p) FROM (
                SELECT po.status, pr.name AS product_name, po.start_date, po.end_date,
                       po.liability_limit, po.includes_theft
                FROM insurance_policies po JOIN insurance_products pr USING (product_id)
                WHERE po.vehicle_id = v.vehicle_id AND po.status = 'active' AND po.end_date >= {TODAY}
                ORDER BY po.end_date DESC LIMIT 1) p) AS policy
    FROM ownership_history oh
    JOIN vehicles v USING (vehicle_id)
    JOIN vehicle_types vt USING (vehicle_type_id)
    WHERE oh.owner_id = %(uid)s AND oh.valid_to IS NULL"""


@compat.get("/vehicles/mine")
def vehicles_mine(u=Depends(need("owner"))):
    with tx() as cur:
        return q(cur, VEHICLE_SQL + " ORDER BY v.vehicle_id", {"uid": u["user_id"]})


@compat.get("/vehicles/{vid}")
def vehicle_one(vid: int, u=Depends(need("owner"))):
    with tx() as cur:
        rows = q(cur, VEHICLE_SQL + " AND v.vehicle_id = %(vid)s", {"uid": u["user_id"], "vid": vid})
    if not rows:
        raise HTTPException(404, "Khong tim thay xe cua ban")
    return rows[0]


@compat.get("/vehicles/{vid}/ownership")
def vehicle_ownership(vid: int, u=Depends(need("owner"))):
    with tx() as cur:
        mine = q1(cur, "SELECT 1 AS ok FROM ownership_history WHERE vehicle_id=%s AND owner_id=%s", (vid, u["user_id"]))
        if not mine:
            raise HTTPException(404, "Khong tim thay xe cua ban")
        return q(cur, """SELECT us.full_name AS owner_name, oh.valid_from::date AS valid_from, oh.valid_to::date AS valid_to
                         FROM ownership_history oh JOIN users us ON us.user_id = oh.owner_id
                         WHERE oh.vehicle_id = %s ORDER BY oh.valid_from DESC""", (vid,))


@compat.get("/violations/mine")
def violations_mine(u=Depends(need("owner"))):
    with tx() as cur:
        return q(cur, """SELECT v.violation_id, v.occurred_at, v.plate_number_captured AS plate_number,
                                t.description AS type, v.status, v.fine_amount, v.due_date
                         FROM violations v JOIN violation_types t USING (violation_type_id)
                         WHERE v.liable_owner_id = %s ORDER BY v.occurred_at DESC LIMIT 200""", (u["user_id"],))


app.include_router(auth, prefix="/api")
app.include_router(compat, prefix="/api")
app.include_router(business_router, prefix="/api")   # frontend dung VITE_API_URL=http://localhost:8000/api


@app.get("/health")
def health():
    return {"ok": True}
