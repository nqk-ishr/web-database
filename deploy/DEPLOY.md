# Triển khai 03 VM

| VM | Địa chỉ | Dịch vụ | Cổng mở ra ngoài |
|---|---|---|---|
| VM 1 | TODO | Frontend + reverse proxy | 80/443 |
| VM 2 | TODO | Backend (FastAPI) | chỉ VM 1 truy cập |
| VM 3 | TODO | PostgreSQL + lưu trữ tệp | chỉ VM 2 truy cập (không mở công khai) |

## Các bước
1. TODO: dựng VM, đặt địa chỉ mạng
2. TODO: cài Docker
3. TODO: cấu hình tường lửa
4. TODO: chạy từng dịch vụ
5. TODO: kiểm tra dữ liệu còn sau khi khởi động lại

Lưu ý: Frontend không kết nối trực tiếp PostgreSQL.
