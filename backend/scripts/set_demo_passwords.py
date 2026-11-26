"""Đặt mật khẩu thật (bcrypt) cho mọi tài khoản trong dữ liệu mẫu.

seed.sql chỉ chứa băm giả `$2b$12$demohash...` nên chưa ai đăng nhập được. Chạy sau khi nạp seed:

    cd backend
    DATABASE_URL=postgresql://... python scripts/set_demo_passwords.py [mật_khẩu]

Mặc định mật khẩu là Demo@123 cho TẤT CẢ tài khoản. Chỉ dùng cho môi trường demo.
"""
import os
import sys

import bcrypt
import psycopg

DEFAULT_PASSWORD = "Demo@123"


def main():
    password = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PASSWORD
    digest = bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt(rounds=12)).decode()
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        n = conn.execute("UPDATE users SET password_hash = %s", (digest,)).rowcount
    print(f"Đã đặt mật khẩu cho {n} tài khoản (mật khẩu: {password})")


if __name__ == "__main__":
    main()
