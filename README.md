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
```text
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

## CẤU TRÚC THƯ MỤC
```text
vehicle-management/
├── README.md                    # giới thiệu, cài đặt, chạy, tài khoản demo 2 phía, bảng phân công
├── AI_USAGE.md                  # phạm vi AI hỗ trợ (bắt buộc)
├── .gitignore                   # .env, node_modules, __pycache__, dump lớn, venv
├── .env.example                 # không chứa bí mật thật
├── docker-compose.yml           # chạy cả hệ thống trên 1 máy khi phát triển
│
├── .github/
│   ├── workflows/ci.yml         # build + test (điểm cộng CI/CD)
│   ├── pull_request_template.md # thay đổi gì, đã kiểm tra thế nào, người review
│   └── ISSUE_TEMPLATE/
│       ├── feature.md           # người phụ trách, điều kiện hoàn thành
│       └── bug.md
│
├── frontend/                    # React (VM 1)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── api/                 # hàm gọi backend
│       ├── components/          # bảng, form, lọc, phân trang dùng chung
│       ├── pages/
│       │   ├── owner/           # cổng chủ xe
│       │   └── officer/         # cổng cán bộ, báo cáo
│       └── routes/              # chặn route theo vai trò
│
├── backend/                     # FastAPI (VM 2)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── core/                # config, bảo mật, phân quyền dùng chung
│   │   ├── db/                  # kết nối, model
│   │   ├── schemas/             # Pydantic
│   │   ├── routers/
│   │   │   ├── owner/           # API cổng chủ xe
│   │   │   └── officer/         # API cổng cán bộ
│   │   └── services/            # transfer.py, inspection.py, violation.py (transaction nằm ở đây)
│   └── tests/
│       ├── unit/
│       ├── integration/         # ràng buộc, rollback, phân quyền
│       └── concurrency/         # đặt chỗ cuối, nộp phạt trùng
│
├── database/                    # phần chấm điểm chính (VM 3)
│   ├── schema.dbml              # ERD nguồn
│   ├── schema.sql               # bản gốc tạo bảng, ràng buộc, exclusion constraint
│   ├── alembic.ini
│   ├── migrations/versions/     # mỗi thay đổi schema một file (có upgrade/downgrade)
│   ├── triggers/                # trigger và function
│   ├── views/                   # v_vehicle_status.sql
│   ├── indexes/                 # 02 chỉ mục kèm lý do
│   ├── queries/                 # q01_...sql đến q08_...sql
│   │   └── README.md            # mục đích, đầu vào, kết quả mẫu, người phụ trách
│   ├── seed/                    # dữ liệu demo (bộ gọn)
│   ├── generator/
│   │   ├── generate_data.py     # chạy với --demo hoặc --large
│   │   ├── requirements.txt
│   │   └── README.md            # hướng dẫn chạy lại, thống kê số dòng
│   └── scripts/
│       ├── backup.sh
│       ├── restore.sh
│       └── verify_restore.sh    # đối chiếu số dòng sau khôi phục
│
├── deploy/                      # cấu hình theo từng VM
│   ├── DEPLOY.md                # hướng dẫn dựng 3 VM, mạng, tường lửa
│   ├── vm1-frontend/            # docker-compose.yml, nginx, .env.example
│   ├── vm2-backend/             # docker-compose.yml, .env.example
│   └── vm3-db-storage/          # PostgreSQL + MinIO/volume, .env.example, lịch backup
│
└── docs/
    ├── erd/                     # erd.png, data-dictionary.md (mô tả trường dữ liệu)
    ├── api/                     # mô tả API (xuất từ OpenAPI)
    ├── design/                  # wireframe
    ├── evidence/                # minh chứng, đánh số theo mục của đề
    │   ├── 01-row-counts.md
    │   ├── 02-queries-results.md
    │   ├── 03-constraints-tests.md
    │   ├── 04-transaction-concurrency.md
    │   ├── 05-performance-explain.md     # EXPLAIN trước/sau
    │   ├── 06-migration-backup-restore.md
    │   └── 07-bonus.md                   # tên miền, HTTPS, CI/CD nếu có
    ├── report/                  # báo cáo PDF và bản nguồn
    └── slides/
```