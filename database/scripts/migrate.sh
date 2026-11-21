#!/usr/bin/env bash
# scripts/migrate.sh up [VERSION] | down [VERSION] | status
#   up   : ap dung cac migration chua chay (dung lai o VERSION neu co, vd V003)
#   down : rollback ve VERSION (vd V002); khong co VERSION = lui 1 buoc
# Moi migration chay trong 1 transaction; bang schema_migrations ghi phien ban da ap dung.
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -X -q"
$P -c "SET client_min_messages=warning; CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
applied() { $P -Atc "SELECT version FROM schema_migrations ORDER BY version $1"; }
cmd=${1:-status}; target=${2:-}
case $cmd in
  status) $P -c "SELECT * FROM schema_migrations ORDER BY version";;
  up)
    for f in migrations/*.up.sql; do v=$(basename "$f" | cut -d_ -f1)
      applied "" | grep -qx "$v" && continue
      echo ">> UP   $v"; $P -1 -f "$f" -c "INSERT INTO schema_migrations(version) VALUES ('$v')"
      [[ -n $target && $v == "$target" ]] && break
    done;;
  down)
    for v in $(applied DESC); do
      [[ -n $target && $v == "$target" ]] && break
      echo "<< DOWN $v"; $P -1 -f "$(ls migrations/${v}__*.down.sql)" -c "DELETE FROM schema_migrations WHERE version='$v'"
      [[ -z $target ]] && break
    done;;
  *) echo "usage: $0 up|down|status [VERSION]"; exit 1;;
esac
