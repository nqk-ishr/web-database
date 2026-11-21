"""Cấu hình và hằng số dùng chung. Cần biến môi trường DATABASE_URL, JWT_SECRET."""
import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))
# Danh sách origin được phép gọi API từ trình duyệt, phân tách bằng dấu phẩy
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

TZ = "Asia/Ho_Chi_Minh"
TODAY = f"(now() AT TIME ZONE '{TZ}')::date"      # "hôm nay" theo giờ Việt Nam, dùng trong SQL
LATE_FEE_RATE = "0.0005"                            # 0,05% số tiền phạt mỗi ngày quá hạn (đơn giản hóa)
OPEN_REQUEST = ("pending_confirmation", "pending_approval", "needs_more_info")

# Mã vai trò (khớp bảng roles)
OWNER, REGISTRAR, VIOLATION, INSURANCE, ADMIN = (
    "owner", "registrar", "violation_officer", "insurance_staff", "admin")
