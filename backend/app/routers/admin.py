"""Quản trị: tạo, sửa, khóa/mở khóa tài khoản và đặt lại mật khẩu. Chỉ vai trò admin.

Ghi chú thiết kế:
  * Không cho đổi vai trò hay tên đăng nhập (tránh gán nhầm quyền / mất dấu lịch sử xử lý).
  * Khóa tài khoản có hiệu lực ngay: current_user kiểm is_active ở MỌI request.
  * Quản trị viên không tự khóa mình => luôn còn ít nhất một admin đang hoạt động.
  * Đặt lại mật khẩu KHÔNG thu hồi token đang dùng (schema chưa có cột phiên bản); token hết hạn
    sau JWT_EXPIRE_MINUTES. Muốn chặn ngay thì khóa tài khoản.
"""
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import ADMIN
from app.core.pagination import PageParams, like, paginate
from app.core.security import hash_password, need
from app.db.session import found, q, q1, tx
from app.schemas.admin import NewUser, ResetPassword, RoleCode, UpdateUser

router = APIRouter(prefix="/admin", tags=["admin"])

USER_SELECT = """u.user_id, u.username, u.full_name, u.citizen_id, u.phone, u.email, u.is_active,
                 u.created_at, u.insurer_id, i.name AS insurer, r.code AS role, r.name AS role_name"""
USER_FROM = """FROM users u JOIN roles r ON r.role_id = u.role_id
               LEFT JOIN insurers i ON i.insurer_id = u.insurer_id"""


def _temp_password() -> str:
    return secrets.token_urlsafe(9)          # 12 ký tự ngẫu nhiên


def _check_role_insurer(role: str, insurer_id):
    if role == "insurance_staff" and insurer_id is None:
        raise HTTPException(400, "Nhân viên bảo hiểm phải thuộc một công ty bảo hiểm (insurer_id)")
    if role != "insurance_staff" and insurer_id is not None:
        raise HTTPException(400, "Chỉ nhân viên bảo hiểm mới thuộc công ty bảo hiểm")


def _get_user(cur, uid):
    return found(q1(cur, f"SELECT {USER_SELECT} {USER_FROM} WHERE u.user_id = %s", (uid,)),
                 "Không tìm thấy tài khoản")


@router.get("/roles")
def roles(u=Depends(need(ADMIN))):
    with tx() as cur:
        return q(cur, "SELECT role_id, code, name FROM roles ORDER BY role_id")


@router.get("/insurers")
def insurers(u=Depends(need(ADMIN))):
    with tx() as cur:
        return q(cur, "SELECT insurer_id, code, name, is_active FROM insurers ORDER BY insurer_id")


@router.get("/users")
def list_users(role: Optional[RoleCode] = None, is_active: Optional[bool] = None,
               search: Optional[str] = Query(None, alias="q", max_length=100,
                                             description="Tên đăng nhập, họ tên, CCCD hoặc email"),
               pg: PageParams = Depends(), u=Depends(need(ADMIN))):
    where, args = [], {}
    if role:
        where.append("r.code = %(role)s")
        args["role"] = role
    if is_active is not None:
        where.append("u.is_active = %(active)s")
        args["active"] = is_active
    if search:
        where.append("""(u.username ILIKE %(s)s OR u.full_name ILIKE %(s)s
                         OR u.citizen_id ILIKE %(s)s OR u.email ILIKE %(s)s)""")
        args["s"] = like(search)
    with tx() as cur:
        return paginate(cur, USER_SELECT, USER_FROM, where, args, "u.user_id", pg)


@router.get("/users/{uid}")
def user_detail(uid: int, u=Depends(need(ADMIN))):
    with tx() as cur:
        return _get_user(cur, uid)


@router.post("/users", status_code=201)
def create_user(b: NewUser, u=Depends(need(ADMIN))):
    _check_role_insurer(b.role, b.insurer_id)
    password = b.password or _temp_password()
    with tx() as cur:
        role = found(q1(cur, "SELECT role_id FROM roles WHERE code = %s", (b.role,)), "Vai trò không tồn tại")
        if b.insurer_id is not None and not q1(cur, "SELECT 1 FROM insurers WHERE insurer_id = %s AND is_active",
                                               (b.insurer_id,)):
            raise HTTPException(400, "Công ty bảo hiểm không tồn tại hoặc đã ngừng hoạt động")
        new = q1(cur, """INSERT INTO users (role_id, insurer_id, username, password_hash, full_name,
                                            citizen_id, phone, email)
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING user_id""",
                 (role["role_id"], b.insurer_id, b.username, hash_password(password), b.full_name.strip(),
                  b.citizen_id, b.phone, b.email))
        user = _get_user(cur, new["user_id"])
    if b.password is None:
        user["temporary_password"] = password          # chỉ hiện đúng một lần, không lưu ở đâu khác
    return user


@router.patch("/users/{uid}")
def update_user(uid: int, b: UpdateUser, u=Depends(need(ADMIN))):
    changes = b.model_dump(exclude_unset=True)
    if "full_name" in changes and changes["full_name"] is None:
        raise HTTPException(400, "Họ tên không được để trống")
    if not changes:
        raise HTTPException(400, "Không có trường nào để cập nhật")
    with tx() as cur:
        target = found(q1(cur, """SELECT u.user_id, r.code AS role FROM users u JOIN roles r USING (role_id)
                                  WHERE u.user_id = %s FOR UPDATE OF u""", (uid,)), "Không tìm thấy tài khoản")
        if "insurer_id" in changes:
            _check_role_insurer(target["role"], changes["insurer_id"])
            if changes["insurer_id"] is not None and not q1(
                    cur, "SELECT 1 FROM insurers WHERE insurer_id = %s AND is_active", (changes["insurer_id"],)):
                raise HTTPException(400, "Công ty bảo hiểm không tồn tại hoặc đã ngừng hoạt động")
        if "full_name" in changes:
            changes["full_name"] = changes["full_name"].strip()
        cols = list(changes)                              # tên cột lấy từ model, không phải từ người dùng
        cur.execute(f"UPDATE users SET {', '.join(c + ' = %(' + c + ')s' for c in cols)} WHERE user_id = %(uid)s",
                    {**changes, "uid": uid})
        return _get_user(cur, uid)


def _set_active(uid: int, active: bool, admin):
    if uid == admin["user_id"] and not active:
        raise HTTPException(400, "Không thể tự khóa tài khoản của chính mình")
    with tx() as cur:
        found(q1(cur, "SELECT 1 FROM users WHERE user_id = %s FOR UPDATE", (uid,)), "Không tìm thấy tài khoản")
        cur.execute("UPDATE users SET is_active = %s WHERE user_id = %s", (active, uid))
        return _get_user(cur, uid)


@router.post("/users/{uid}/deactivate")
def deactivate_user(uid: int, u=Depends(need(ADMIN))):
    return _set_active(uid, False, u)


@router.post("/users/{uid}/activate")
def activate_user(uid: int, u=Depends(need(ADMIN))):
    return _set_active(uid, True, u)


@router.post("/users/{uid}/reset-password")
def reset_password(uid: int, b: ResetPassword = ResetPassword(), u=Depends(need(ADMIN))):
    password = b.new_password or _temp_password()
    with tx() as cur:
        found(q1(cur, "SELECT 1 FROM users WHERE user_id = %s FOR UPDATE", (uid,)), "Không tìm thấy tài khoản")
        cur.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (hash_password(password), uid))
    return {"user_id": uid, **({"temporary_password": password} if b.new_password is None else {"ok": True})}
