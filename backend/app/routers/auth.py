"""Xác thực: đăng nhập, đăng ký tài khoản chủ xe, thông tin cá nhân, đổi mật khẩu."""
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import OWNER
from app.core.security import (DUMMY_HASH, create_token, current_user, hash_password,
                               verify_password)
from app.db.session import q1, tx
from app.schemas.auth import ChangePassword, Login, Register

router = APIRouter(prefix="/auth", tags=["auth"])

# Chống dò mật khẩu: tối đa 5 lần sai / 5 phút cho mỗi (tên đăng nhập, IP). Lưu trong bộ nhớ của
# tiến trình (đủ cho đồ án một tiến trình; nhiều worker thì cần Redis hoặc bảng riêng).
MAX_FAILS, WINDOW_SEC = 5, 300
_fails: dict = defaultdict(deque)


def _throttle_key(username, request):
    return (username.lower(), request.client.host if request.client else "?")


def _check_throttle(key):
    now, dq = time.monotonic(), _fails[key]
    while dq and now - dq[0] > WINDOW_SEC:
        dq.popleft()
    if len(dq) >= MAX_FAILS:
        raise HTTPException(429, "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau vài phút")


@router.post("/login")
def login(b: Login, request: Request):
    key = _throttle_key(b.username, request)
    _check_throttle(key)
    with tx() as cur:
        u = q1(cur, """SELECT u.user_id, u.username, u.full_name, u.password_hash, u.is_active,
                              r.code AS role
                       FROM users u JOIN roles r USING (role_id)
                       WHERE lower(u.username) = lower(%s)""", (b.username,))
    ok = verify_password(b.password, u["password_hash"] if u else DUMMY_HASH)
    if not u or not ok:
        _fails[key].append(time.monotonic())
        # 400 (không phải 401): interceptor của frontend tự chuyển về /login khi gặp 401,
        # làm mất thông báo lỗi ngay trên trang đăng nhập.
        raise HTTPException(400, "Sai tên đăng nhập hoặc mật khẩu")
    if not u["is_active"]:
        raise HTTPException(403, "Tài khoản đã bị khóa")
    _fails.pop(key, None)
    return {"access_token": create_token(u["user_id"]), "token_type": "bearer",
            "user": {"user_id": u["user_id"], "username": u["username"],
                     "full_name": u["full_name"], "role": u["role"]}}


@router.get("/me")
def me(u=Depends(current_user)):
    with tx() as cur:
        return q1(cur, """SELECT u.user_id, u.username, u.full_name, u.phone, u.email, u.insurer_id,
                                 r.code AS role
                          FROM users u JOIN roles r USING (role_id) WHERE u.user_id = %s""",
                  (u["user_id"],))


@router.post("/register", status_code=201)
def register(b: Register):
    """Tự đăng ký: luôn tạo tài khoản vai trò chủ xe. Tài khoản cán bộ do quản trị tạo."""
    with tx() as cur:
        role = q1(cur, "SELECT role_id FROM roles WHERE code = %s", (OWNER,))
        if not role:
            raise HTTPException(500, "Thiếu danh mục vai trò trong CSDL")
        user = q1(cur, """INSERT INTO users (role_id, username, password_hash, full_name,
                                             citizen_id, phone, email)
                          VALUES (%s, %s, %s, %s, %s, %s, %s)
                          RETURNING user_id, username, full_name""",
                  (role["role_id"], b.username, hash_password(b.password), b.full_name.strip(),
                   b.citizen_id, b.phone, b.email))
    return {**user, "role": OWNER}


@router.post("/change-password")
def change_password(b: ChangePassword, u=Depends(current_user)):
    with tx() as cur:
        row = q1(cur, "SELECT password_hash FROM users WHERE user_id = %s FOR UPDATE", (u["user_id"],))
        if not verify_password(b.old_password, row["password_hash"]):
            raise HTTPException(400, "Mật khẩu hiện tại không đúng")
        cur.execute("UPDATE users SET password_hash = %s WHERE user_id = %s",
                    (hash_password(b.new_password), u["user_id"]))
    return {"ok": True}
