"""Xác thực và phân quyền.

Đọc `Authorization: Bearer <jwt>` (HS256, claim `sub` = user_id). Việc đăng nhập và băm mật khẩu
do phần xác thực của nhóm làm; file này chỉ kiểm token và vai trò.
"""
import jwt
from fastapi import Depends, Header, HTTPException

from app.core.config import JWT_SECRET
from app.db.session import q1, tx


def current_user(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        uid = int(jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"])
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
