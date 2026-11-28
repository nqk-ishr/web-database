# Phan DB-data (Khoa) - schema 16 bang cua nhom
Chep thu muc nay de len `database/` cua ban da gop (giu schema.sql, seed.sql cua nhom truong). Chi them file moi.
Mat khau mau cua user sinh ra: Demo@123 (hash bcrypt that).

PowerShell (trong thu muc database):
  $env:Path += ";C:\Program Files\PostgreSQL\17\bin"; $env:PGPASSWORD="<mat_khau>"; $env:PGCLIENTENCODING="UTF8"
  $env:PGHOST="localhost"; $env:PGUSER="postgres"; $env:PGDATABASE="vehicle_db"
  psql -d postgres -c "CREATE DATABASE vehicle_db"
  psql -f schema.sql ; psql -f seed.sql                 # du lieu demo gon cua nhom
  psql -f generator/generate_large.sql                  # du lieu lon (~25 giay): 75.000 xe, 300.000 vi pham...
  psql -f views/v_vehicle_overview.sql ; psql -f indexes/perf_indexes.sql
Migration/EXPLAIN/backup dung file .sh (chay bang Git Bash hoac WSL): scripts/migrate.sh up|down|status, scripts/run_explain.sh before|after, scripts/backup_restore.sh backup|restore|verify.
Luu y: generate_large.sql TRUNCATE toan bo bang -> chi chay tren DB thu.

Ket qua do (ms): q05 30.7 -> 0.17 ; q09 167 -> 79 ; q11 TIMEOUT>60s -> 563 ; cac truy van khac gan nhu khong doi.
