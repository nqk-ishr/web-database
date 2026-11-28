"""Schema quản lý tài khoản (quản trị viên)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

RoleCode = Literal["owner", "registrar", "violation_officer", "insurance_staff", "admin"]
EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class NewUser(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")
    password: Optional[str] = Field(default=None, min_length=8, max_length=72,
                                    description="Bỏ trống để hệ thống sinh mật khẩu tạm (trả về một lần)")
    full_name: str = Field(min_length=1, max_length=150)
    role: RoleCode
    insurer_id: Optional[int] = Field(default=None, description="Bắt buộc với insurance_staff, cấm với vai trò khác")
    citizen_id: Optional[str] = Field(default=None, pattern=r"^[0-9]{9,12}$")
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=150, pattern=EMAIL)


class UpdateUser(BaseModel):
    """Chỉ các trường được gửi mới bị đổi. Không đổi được vai trò hay tên đăng nhập."""
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=150, pattern=EMAIL)
    insurer_id: Optional[int] = None


class ResetPassword(BaseModel):
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=72,
                                        description="Bỏ trống để hệ thống sinh mật khẩu tạm")
