# Frontend – Hệ thống quản lý phương tiện giao thông

React 18 + Vite, React Router, React Query, Axios. Có hai cổng:

- Cổng chủ xe: xe của tôi, đăng ký mới, sang tên, bảo hiểm, bồi thường, vi phạm.
- Cổng quản lý: cán bộ đăng ký, cán bộ xử lý vi phạm, nhân viên bảo hiểm, quản trị (kèm báo cáo).

## Chạy trên máy

```bash
cd frontend
cp .env.example .env.local     # rồi sửa các biến bên dưới
npm install
npm run dev                    # http://localhost:5173
```

Đổi biến môi trường xong phải dừng và chạy lại `npm run dev`.

| Biến            | Ý nghĩa                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| `VITE_API_URL`  | Địa chỉ backend, ví dụ `http://localhost:8000/api`                                          |
| `VITE_USE_MOCK` | `true`: dùng dữ liệu giả, chỉ cho cổng chủ xe, không cần backend. `false`: gọi backend thật |

Cổng quản lý luôn gọi backend thật, không có dữ liệu giả.

## Tài khoản demo (backend thật)

Mật khẩu chung `Demo@123` sau khi chạy `backend/scripts/set_demo_passwords.py`.

| Vai trò              | Tên đăng nhập |
| -------------------- | ------------- |
| Chủ xe               | `bao.truong`  |
| Cán bộ đăng ký       | `canbo_dk01`  |
| Cán bộ xử lý vi phạm | `canbo_vp01`  |
| Nhân viên bảo hiểm   | `bh_demoa01`  |
| Quản trị             | `admin01`     |

## Cấu trúc `src/`

- `api/`: hàm gọi backend (`staff.js` cho cổng quản lý)
- `hooks/`: React Query bọc các hàm API
- `pages/`: owner, registrar, enforcement, insurer, admin, reports
- `components/`: ui (dùng chung), domain, staff
- `constants/nav.js`: menu theo vai trò; `routes/index.jsx`: route và chặn quyền theo vai trò

## Build và triển khai

`npm run build` tạo thư mục `dist/`. Dockerfile build rồi phục vụ bằng nginx; `VITE_API_URL` truyền qua build arg.
Lỗi nghiệp vụ backend trả dạng `{ "detail": "<tiếng Việt>" }`.
