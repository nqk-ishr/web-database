"""Cấu hình và hằng số dùng chung. Cần biến môi trường DATABASE_URL, JWT_SECRET."""
import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]

TZ = "Asia/Ho_Chi_Minh"
TODAY = f"(now() AT TIME ZONE '{TZ}')::date"      # "hôm nay" theo giờ Việt Nam, dùng trong SQL
LATE_FEE_RATE = "0.0005"                            # 0,05% số tiền phạt mỗi ngày quá hạn (đơn giản hóa)
OPEN_REQUEST = ("pending_confirmation", "pending_approval", "needs_more_info")

# Mã vai trò (khớp bảng roles)
OWNER, REGISTRAR, VIOLATION, INSURANCE, ADMIN = (
    "owner", "registrar", "violation_officer", "insurance_staff", "admin")
