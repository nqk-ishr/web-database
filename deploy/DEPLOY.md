# Triển khai 03 VM

Ba máy ảo VMware (Ubuntu Server 26.04), cùng mạng NAT VMnet8, IP tĩnh. Mỗi VM chạy một dịch vụ bằng Docker Compose.

| VM   | Địa chỉ        | Dịch vụ                                | Cổng | Ai được truy cập |
| ---- | -------------- | -------------------------------------- | ---- | ---------------- |
| VM 1 | 192.168.64.130 | Frontend (React) + nginx reverse proxy | 80   | Mọi người dùng   |
| VM 2 | 192.168.64.132 | Backend (FastAPI)                      | 8000 | Chỉ VM 1         |
| VM 3 | 192.168.64.134 | PostgreSQL 16                          | 5432 | Chỉ VM 2         |

Luồng: trình duyệt → VM1 (`/` là giao diện, `/api/` được nginx chuyển sang VM2) → VM2 → VM3. Frontend không kết nối trực tiếp PostgreSQL.

## Chuẩn bị chung cho cả 3 VM

1. Cài Docker và Docker Compose, thêm người dùng vào nhóm docker: `sudo usermod -aG docker $USER`, đăng nhập lại.
2. Đặt IP tĩnh bằng netplan (bảng trên); kiểm tra 3 VM ping được nhau.
3. Lấy mã nguồn: `git clone -b khoa https://github.com/nqk-ishr/web-database.git`

Mỗi VM có một thư mục cấu hình riêng trong `deploy/`. File `.env` chỉ tạo trên VM, không commit.

## VM 3: cơ sở dữ liệu (`deploy/vm3-db-storage`)

1. Tạo `.env` gồm `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (`vehicle_db`).
2. `docker compose up -d --build`. Lần đầu volume trống nên PostgreSQL tự nạp `schema.sql` và `seed.sql`; dịch vụ `migrate` chạy Alembic (audit_log, attachments) rồi thoát.
3. Kiểm tra: `docker compose ps -a` (`db` healthy, `migrate` Exited 0), `SELECT count(*) FROM users;` trả 17.
4. Chặn truy cập, chỉ cho VM 2 vào cổng 5432 (luật `ufw` không chặn được cổng container Docker, nên đặt vào chuỗi `DOCKER-USER`):

```bash
sudo iptables -A DOCKER-USER -i ens33 -s 192.168.64.132 -p tcp --dport 5432 -j ACCEPT
sudo iptables -A DOCKER-USER -i ens33 -p tcp --dport 5432 -j DROP
sudo apt install -y iptables-persistent && sudo netfilter-persistent save
```

Lưu ý: mật khẩu PostgreSQL chỉ được đặt lúc tạo volume lần đầu. Đổi `.env` sau đó không đổi mật khẩu trong CSDL; dùng `ALTER USER` hoặc `docker compose down -v` để tạo lại.

## VM 2: backend (`deploy/vm2-backend`)

1. Tạo `.env`: `DATABASE_URL` (trỏ tới VM3), `JWT_SECRET` (chuỗi ngẫu nhiên, `openssl rand -hex 32`), `CORS_ORIGINS=http://192.168.64.130`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`.
2. `docker compose up -d --build`
3. Đặt mật khẩu cho tài khoản demo: `docker compose exec backend python scripts/set_demo_passwords.py` (mật khẩu chung `Demo@123`, chỉ dùng cho demo).
4. Kiểm tra: `curl http://localhost:8000/api/health` trả `{"status":"ok"}`.
5. Chặn truy cập, chỉ cho VM 1 vào cổng 8000: hai luật `DOCKER-USER` như VM3 nhưng cổng 8000 và nguồn 192.168.64.130.

Tệp đính kèm được lưu trong volume `uploads` trên VM 2 (không phải VM 3).

## VM 1: frontend (`deploy/vm1-frontend`)

1. `docker compose up -d --build`. Build React với `VITE_API_URL=/api`; `nginx.conf` trong thư mục này chuyển `/api/` sang `http://192.168.64.132:8000`.
2. Kiểm tra: mở `http://192.168.64.130`, đăng nhập tài khoản demo.

## Kiểm tra sau khi khởi động lại

Các container đặt `restart: unless-stopped` nên tự chạy lại. Đã khởi động lại lần lượt VM 3, VM 2, VM 1 và kiểm tra:

- `docker ps` trên từng VM thấy container `Up`; luật `DOCKER-USER` còn nguyên.
- Đăng nhập lại thành công, dữ liệu vẫn còn.
- Từ máy ngoài, `Test-NetConnection` tới VM3:5432 và VM2:8000 đều bị chặn.

Minh chứng: `docs/evidence/`.

## Tài khoản demo

Mật khẩu chung `Demo@123`: chủ xe `bao.truong`, cán bộ đăng ký `canbo_dk01`, cán bộ xử lý vi phạm `canbo_vp01`, nhân viên bảo hiểm `bh_demoa01`, quản trị `admin01`.
