"""Xác thực và phân quyền.

* Băm mật khẩu bằng bcrypt (hash_password / verify_password).
* Phát hành JWT (create_token): HS256, claim `sub` = user_id.
* Đọc `Authorization: Bearer <jwt>` và kiểm vai trò (current_user / need).
"""
import datetime as dt

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException

from app.core.config import JWT_EXPIRE_MINUTES, JWT_SECRET
from app.db.session import q1, tx

ALGORITHM = "HS256"


def _pw(password: str) -> bytes:
    # bcrypt chỉ dùng tối đa 72 byte đầu; cắt thống nhất ở cả băm và kiểm tra
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_pw(password), password_hash.encode("ascii"))
    except (ValueError, UnicodeEncodeError):      # băm không đúng định dạng (vd. dữ liệu mẫu cũ)
        return False


# Băm giả để thời gian phản hồi như nhau khi tên đăng nhập không tồn tại
DUMMY_HASH = hash_password("dummy-password-for-timing")


def create_token(user_id: int) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + dt.timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def current_user(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        uid = int(jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])["sub"])
    except Exception:
        raise HTTPException(401, "Token không hợp lệ")
    with tx() as cur:
        u = q1(cur, """SELECT u.user_id, r.code AS role, u.insurer_id
                       FROM users u JOIN roles r USING (role_id)
                       WHERE u.user_id = %s AND u.is_active""", (uid,))
    if not u:
        raise HTTPException(401, "Tài khoản không tồn tại hoặc đã khóa")
    return u


def need(*roles):
    """Dùng làm dependency: chỉ cho các vai trò được liệt kê."""
    def dep(u=Depends(current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, "Không đủ quyền")
        return u
    return dep
