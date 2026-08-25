#!/usr/bin/env bash
# Applies the migrations to a throwaway database and runs each test suite in a
# fresh one, so no suite can see another's rows.
#   PGHOST=/var/tmp PGPORT=5439 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail

USER_ARG="-U ${PGUSER:-postgres}"
DBS=()

cleanup() {
  for db in "${DBS[@]:-}"; do
    [ -n "$db" ] && psql $USER_ARG -qtA -d postgres \
      -c "drop database if exists $db;" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

suite() {
  local name="$1" file="$2" db="stl_${1}_$$"
  DBS+=("$db")
  psql $USER_ARG -qtA -d postgres -c "drop database if exists $db;" >/dev/null
  psql $USER_ARG -qtA -d postgres -c "create database $db;" >/dev/null

  local run=(psql -v ON_ERROR_STOP=1 -q $USER_ARG -d "$db" -f)
  "${run[@]}" supabase/tests/shim.sql
  for migration in supabase/migrations/*.sql; do "${run[@]}" "$migration"; done
  "${run[@]}" supabase/tests/assert.sql

  echo "— $name"
  "${run[@]}" "$file"
}

suite schema supabase/tests/schema_test.sql
suite rls    supabase/tests/rls_test.sql
