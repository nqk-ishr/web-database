# Frontend – Quản lý phương tiện (phía chủ xe)
Chạy: `cp .env.development.example .env.development`, chỉnh `VITE_USE_MOCK` / `VITE_API_URL`, rồi `npm install && npm run dev` → http://localhost:5173.
Không có file `.env.development` thì VITE_USE_MOCK mặc định **tắt** và VITE_API_URL trống, nên đăng nhập sẽ không gọi được backend.
- `VITE_USE_MOCK=true`: dữ liệu giả, đăng nhập bằng tên/mật khẩu bất kỳ (tên `registrar`, `violation_officer`, `insurance_staff`, `admin` để xem từng vai trò).
- `VITE_USE_MOCK=false`: gọi backend thật tại `VITE_API_URL`; tài khoản demo `bao.truong` / `Demo@123` (sau khi chạy `scripts/set_demo_passwords.py`).
Đổi biến môi trường phải khởi động lại `npm run dev`.
Endpoint giả định: POST /auth/login, GET /auth/me, GET /vehicles/mine, GET /vehicles/{id}, GET /vehicles/{id}/ownership, GET /violations/mine, POST /violations/{id}/pay.
Lỗi nghiệp vụ: backend trả { "detail": "<tiếng Việt>" }.
