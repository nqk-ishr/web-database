# Hệ thống web quản lý phương tiện giao thông

Quản lý đăng ký, sang tên, đăng kiểm, niên hạn sử dụng và xử lý vi phạm phạt nguội cho
chủ phương tiện và cơ quan quản lý. Project cuối kỳ, học phần *Cơ sở dữ liệu Web và Hệ thống thông tin*.

## Công nghệ
PostgreSQL · Python/FastAPI · React · Docker · Git/GitHub

## Kiến trúc triển khai (03 VM)
| VM | Thành phần |
|---|---|
| VM 1 | Frontend (React) + reverse proxy |
| VM 2 | Backend (FastAPI) |
| VM 3 | PostgreSQL + lưu trữ tệp (MinIO hoặc volume), sao lưu |

## Cấu trúc thư mục
| Thư mục | Nội dung |
|---|---|
| `frontend/` | Giao diện React (cổng chủ xe, cổng cán bộ) |
| `backend/` | API FastAPI, nghiệp vụ, kiểm thử |
| `database/` | ERD, schema, migration, trigger, view, chỉ mục, truy vấn, sinh dữ liệu, sao lưu |
| `deploy/` | Cấu hình theo từng VM, hướng dẫn triển khai |
| `docs/` | ERD, mô tả API, wireframe, minh chứng, báo cáo, slide |

## Chạy cục bộ
```bash
cp .env.example .env        # điền giá trị thật
docker compose up -d db
# TODO: nạp schema, dữ liệu demo, chạy backend và frontend
```

## Nạp dữ liệu
```bash
# TODO: hướng dẫn chạy database/generator/generate_data.py --demo | --large
```

## Tài khoản demo
| Phía | Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|---|
| Người dùng | Chủ xe | TODO | TODO |
| Quản lý | Cán bộ đăng ký | TODO | TODO |
| Quản lý | Cán bộ đăng kiểm | TODO | TODO |
| Quản lý | Cán bộ xử lý vi phạm | TODO | TODO |

## Phân công
| Họ tên | MSV | GitHub | Vai trò | Hạng mục | Người kiểm tra | Minh chứng |
|---|---|---|---|---|---|---|
| Nguyễn Quang Khánh | 24001675 | TODO | Trưởng nhóm; xác thực, phân quyền; backend nghiệp vụ 3; tích hợp, phát hành | TODO | TODO | TODO |
| Phạm Thị Thu Huế | 24001672 | TODO | CSDL; backend nghiệp vụ 1 | TODO | TODO | TODO |
| Trịnh Quang Hải | 24001666 | TODO | Frontend cổng chủ xe; backend nghiệp vụ 2 | TODO | TODO | TODO |
| Phạm Xuân Khoa | 24001676 | TODO | Hạ tầng 03 VM; frontend cổng cán bộ; sinh dữ liệu | TODO | TODO | TODO |

## Tài liệu
- ERD và mô tả trường: `docs/erd/`
- Mô tả API: `docs/api/`
- Minh chứng: `docs/evidence/`
- Hướng dẫn triển khai 3 VM: `deploy/DEPLOY.md`
- Phạm vi AI hỗ trợ: `AI_USAGE.md`
