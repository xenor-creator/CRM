#!/bin/sh
# Runs the SQL tests in supabase/sql-tests against DATABASE_URL (e.g. the local Supabase database
# from `supabase start`: postgresql://postgres:postgres@127.0.0.1:54322/postgres).
# Each test file runs in a transaction and rolls back.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

for file in supabase/sql-tests/*.test.sql; do
  echo "Running $file"
  psql "$DATABASE_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$file" > /dev/null
done
echo "All database tests passed."
