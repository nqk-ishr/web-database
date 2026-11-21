#!/usr/bin/env bash
# scripts/backup_restore.sh backup | restore <file.dump> | verify
# Dung PGHOST/PGPORT/PGUSER/PGDATABASE nhu psql. restore KHONG de len DB dang chay: tao DB thu <db>_restored.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${PGDATABASE:?dat PGDATABASE}; NEW=${DB}_restored; mkdir -p ../backup
case ${1:-} in
  backup)
    f=../backup/${DB}_$(date +%Y%m%d_%H%M%S).dump
    pg_dump -Fc -f "$f" "$DB"                              # dinh dang custom: nen, restore chon loc/song song
    pg_dump --schema-only -f "../backup/${DB}_schema.sql" "$DB"   # ban schema doc duoc, dua len Git
    echo "OK: $f ($(du -h "$f" | cut -f1))";;
  restore)
    f=${2:?file .dump}
    psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $NEW" -c "CREATE DATABASE $NEW"
    pg_restore -j 4 --no-owner -d "$NEW" "$f"; psql -X -q -d "$NEW" -c "ANALYZE"
    echo "OK: khoi phuc vao $NEW";;
  verify)
    q() { psql -X -Atq -d "$1" -c "$2"; }
    ok=1
    for t in users owners vehicle_types vehicle_models violation_types cameras vehicles registrations inspections violations payments appeals schema_migrations; do
      a=$(q "$DB" "select count(*) from $t"); b=$(q "$NEW" "select count(*) from $t")
      [ "$a" = "$b" ] && s=OK || { s=KHAC; ok=0; }; printf "%-18s %9s %9s  %s\n" $t "$a" "$b" $s
    done
    # doi chieu noi dung: checksum tong hop + ket qua view + so chi muc/rang buoc
    chk="select md5(string_agg(x::text, '|' order by id)) from (select id, status, fine_amount, vehicle_id from violations) x"
    [ "$(q "$DB" "$chk")" = "$(q "$NEW" "$chk")" ] && echo "checksum violations   OK" || { echo "checksum violations   KHAC"; ok=0; }
    vw="select md5(string_agg(v::text,'|' order by vehicle_id)) from v_vehicle_status v"
    [ "$(q "$DB" "$vw")" = "$(q "$NEW" "$vw")" ] && echo "ket qua view          OK" || { echo "ket qua view          KHAC"; ok=0; }
    ix="select count(*) from pg_indexes where schemaname='public'"; cn="select count(*) from pg_constraint where connamespace='public'::regnamespace"
    echo "chi muc: $(q "$DB" "$ix") / $(q "$NEW" "$ix")   rang buoc: $(q "$DB" "$cn") / $(q "$NEW" "$cn")"
    [ "$ok" = 1 ] && echo "=> KHOI PHUC DUNG" || { echo "=> CO SAI LECH"; exit 1; };;
  *) echo "usage: $0 backup|restore <file>|verify"; exit 1;;
esac
