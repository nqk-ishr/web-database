# Frontend – Quản lý phương tiện (phía chủ xe)
npm install && npm run dev  → http://localhost:5173 (mặc định VITE_USE_MOCK=true, đăng nhập bằng tên/mật khẩu bất kỳ).
Khi backend sẵn sàng: đặt VITE_USE_MOCK=false và VITE_API_URL trong .env.development.
Endpoint giả định: POST /auth/login, GET /auth/me, GET /vehicles/mine, GET /vehicles/{id}, GET /vehicles/{id}/ownership, GET /violations/mine, POST /violations/{id}/pay.
Lỗi nghiệp vụ: backend trả { "detail": "<tiếng Việt>" }.
