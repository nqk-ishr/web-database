#!/usr/bin/env bash
# database/scripts/backup_restore.sh backup | restore <file.dump> | verify
# Dung PGHOST/PGPORT/PGUSER/PGDATABASE nhu psql. restore KHONG de len DB dang chay: tao DB thu <db>_restored.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${PGDATABASE:?dat PGDATABASE}; NEW=${DB}_restored; mkdir -p ../backup
case ${1:-} in
  backup)
    f=../backup/${DB}_$(date +%Y%m%d_%H%M%S).dump
    pg_dump -Fc -f "$f" "$DB"                                  # dinh dang custom: nen, restore chon loc/song song
    pg_dump --schema-only -f "../backup/${DB}_schema.sql" "$DB" # ban schema doc duoc
    echo "OK: $f ($(du -h "$f" | cut -f1))";;
  restore)
    f=${2:?file .dump}
    psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $NEW" -c "CREATE DATABASE $NEW"
    pg_restore -j 4 --no-owner -d "$NEW" "$f"; psql -X -q -d "$NEW" -c "ANALYZE"
    echo "OK: khoi phuc vao $NEW";;
  verify)
    q() { psql -X -Atq -d "$1" -c "$2"; }
    ok=1
    for t in roles insurers users vehicle_types violation_types cameras vehicles ownership_history registration_requests \
             violations payments insurance_products insurance_policies policy_payments insurance_claims vehicle_status_history schema_migrations; do
      a=$(q "$DB" "select count(*) from $t"); b=$(q "$NEW" "select count(*) from $t")
      [ "$a" = "$b" ] && s=OK || { s=KHAC; ok=0; }; printf "%-24s %9s %9s  %s\n" $t "$a" "$b" $s
    done
    for chk in "violations|select md5(string_agg(x::text,'|' order by violation_id)) from (select violation_id,status,fine_amount,vehicle_id,liable_owner_id from violations) x" \
               "payments|select md5(string_agg(x::text,'|' order by payment_id)) from (select payment_id,violation_id,total_amount,status from payments) x" \
               "view|select md5(string_agg(v::text,'|' order by vehicle_id)) from v_vehicle_overview v"; do
      n=${chk%%|*}; s=${chk#*|}
      [ "$(q "$DB" "$s")" = "$(q "$NEW" "$s")" ] && echo "checksum $n  OK" || { echo "checksum $n  KHAC"; ok=0; }
    done
    ix="select count(*) from pg_indexes where schemaname='public'"; cn="select count(*) from pg_constraint where connamespace='public'::regnamespace"
    tg="select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace='public'::regnamespace"
    echo "chi muc: $(q "$DB" "$ix") / $(q "$NEW" "$ix")   rang buoc: $(q "$DB" "$cn") / $(q "$NEW" "$cn")   trigger: $(q "$DB" "$tg") / $(q "$NEW" "$tg")"
    [ "$ok" = 1 ] && echo "=> KHOI PHUC DUNG" || { echo "=> CO SAI LECH"; exit 1; };;
  *) echo "usage: $0 backup|restore <file>|verify"; exit 1;;
esac
