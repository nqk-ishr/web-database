#!/usr/bin/env bash
# scripts/run_explain.sh <before|after>  -> reports/<nhan>/qNN.txt + summary.tsv
# Moi truy van chay 1 lan "khoi dong" roi 1 lan do (cache nong cho ca truoc va sau).
set -euo pipefail
cd "$(dirname "$0")/.."
tag=${1:?before|after}; out=../reports/$tag; mkdir -p "$out"; : > "$out/summary.tsv"
for f in queries/q*.sql; do
  n=$(basename "$f" .sql)
  run() { { echo "SET statement_timeout='60s'; SET max_parallel_workers_per_gather=0; SET jit=off;"; echo "EXPLAIN (ANALYZE, BUFFERS)"; cat "$f"; } | psql -X -q; }
  run >/dev/null 2>&1 || true; run > "$out/$n.txt" 2>&1 || true
  ms=$(grep -oP 'Execution Time: \K[0-9.]+' "$out/$n.txt" || echo "TIMEOUT>60000")
  buf=$(grep -m1 -oP 'Buffers: \K.*' "$out/$n.txt" || true)
  printf "%s\t%s\t%s\n" "$n" "$ms" "$buf" >> "$out/summary.tsv"
done
cat "$out/summary.tsv"
