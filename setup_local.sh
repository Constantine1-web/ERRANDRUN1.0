#!/usr/bin/env bash
set -euo pipefail

# ERRANDRUN automated local setup script
# Usage: ./setup_local.sh
# Run from project root.

# ---------- Configuration ----------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
ENV_LOCAL="$PROJECT_ROOT/.env.local"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# SQL files (adjust if you renamed)
SQL_SCHEMA="$SCRIPTS_DIR/supabase_schema.sql"
SQL_SEED="$SCRIPTS_DIR/seed_data.sql"
SQL_RLS="$SCRIPTS_DIR/rls_policies.sql"

# Default DB connection (used if DATABASE_URL not set)
DEFAULT_DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# ---------- Helpers ----------
info() { printf "\n\033[1;34m[INFO]\033[0m %s\n" "$1"; }
warn() { printf "\n\033[1;33m[WARN]\033[0m %s\n" "$1"; }
err() { printf "\n\033[1;31m[ERROR]\033[0m %s\n" "$1"; exit 1; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# ---------- Step 0: preflight checks ----------
info "Starting ERRANDRUN automated local setup"

# Check required files
if [ ! -f "$ENV_EXAMPLE" ]; then
  err ".env.example not found in project root. Create it from the repo template."
fi

if [ ! -d "$SCRIPTS_DIR" ]; then
  err "scripts/ directory not found. Ensure SQL files are in ./scripts/"
fi

if [ ! -f "$SQL_SCHEMA" ]; then
  err "Schema SQL not found: $SQL_SCHEMA"
fi

if [ ! -f "$SQL_SEED" ]; then
  warn "Seed SQL not found: $SQL_SEED (continuing without seed)"
fi

if [ ! -f "$SQL_RLS" ]; then
  warn "RLS SQL not found: $SQL_RLS (continuing without RLS policies)"
fi

# Copy .env.example -> .env.local if missing
if [ ! -f "$ENV_LOCAL" ]; then
  info ".env.local not found — copying .env.example -> .env.local"
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  warn "Please edit .env.local now to set SUPABASE keys, PAYSTACK keys, and other secrets."
  warn "After editing .env.local re-run this script. Continuing in 8 seconds..."
  sleep 8
fi

# Load environment variables from .env.local (non-exported)
if [ -f "$ENV_LOCAL" ]; then
  # shellcheck disable=SC1090
  set -o allexport
  # Use a subshell to avoid polluting current shell if file contains unexpected content
  # We only export simple KEY=VALUE lines
  awk 'BEGIN{FS="="} /^[A-Za-z_][A-Za-z0-9_]*=/ {print}' "$ENV_LOCAL" | while IFS='=' read -r key val; do
    # remove surrounding quotes
    val="${val%\"}"
    val="${val#\"}"
    export "$key"="$val"
  done
  set +o allexport
fi

# ---------- Step 1: check tools ----------
info "Checking required tools: git, node, npm, docker"

command_exists git || err "git not found. Install git and re-run."
command_exists node || err "node not found. Install Node.js (18+) and re-run."
command_exists npm || err "npm not found. Install npm and re-run."
command_exists docker || err "docker not found. Install Docker Desktop or Docker Engine and re-run."

# psql optional but recommended
if ! command_exists psql; then
  warn "psql not found. The script will try to use the Supabase CLI to run SQL. Installing psql is recommended for reliability."
fi

# Supabase CLI: install if missing
if ! command_exists supabase; then
  info "Supabase CLI not found. Installing supabase CLI via npm (global install)..."
  npm install -g supabase || warn "Global npm install failed. You can install supabase CLI manually: npm install -g supabase"
fi

if ! command_exists supabase; then
  warn "Supabase CLI still not found. You can continue but some steps will require manual action."
fi

# ---------- Step 2: install Node dependencies ----------
info "Installing Node dependencies (npm ci)..."
npm ci

# ---------- Step 3: start Docker Compose services (optional) ----------
if [ -f "$DOCKER_COMPOSE_FILE" ]; then
  info "docker-compose.yml found — starting Docker Compose services (Postgres, PostHog, etc.)"
  docker compose up -d
  info "Docker Compose started. Waiting 6 seconds for containers to initialize..."
  sleep 6
else
  info "No docker-compose.yml found — skipping Docker Compose step."
fi

# ---------- Step 4: start Supabase local stack ----------
if command_exists supabase; then
  info "Starting Supabase local stack (supabase start)..."
  # supabase start will create containers for local Supabase services
  supabase start || warn "supabase start failed. If you already have Supabase running, ignore this."
  info "Supabase start invoked. Waiting for Supabase to be ready (this can take 10-30s)..."
  # wait for the Supabase REST port (default 54321 for local Postgres proxy) or the auth port 54321
  # We'll poll the Supabase health endpoint if available
  for i in {1..30}; do
    if curl -sSf http://localhost:54321/ >/dev/null 2>&1; then
      info "Supabase appears to be responding on http://localhost:54321"
      break
    fi
    sleep 2
    info "Waiting for Supabase... ($i/30)"
  done
else
  warn "Supabase CLI not available. Please start Supabase manually or install the CLI and run 'supabase start'."
fi

# ---------- Step 5: determine DATABASE_URL ----------
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  # try common Supabase local Postgres port
  if command_exists docker && docker ps --format '{{.Names}}' | grep -q supabase_db; then
    DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
    info "DATABASE_URL not set — using default local Postgres: $DB_URL"
  else
    DB_URL="${DEFAULT_DB_URL}"
    info "DATABASE_URL not set — using fallback: $DB_URL"
  fi
else
  info "Using DATABASE_URL from environment."
fi

# ---------- Step 6: apply SQL schema, RLS, and seed data ----------
apply_sql_with_psql() {
  local sqlfile="$1"
  info "Applying SQL: $sqlfile"
  PGPASSWORD="${DB_URL#*:*@}" # not reliable; we will use psql with connection string
  psql "$DB_URL" -f "$sqlfile"
}

apply_sql_with_supabase() {
  local sqlfile="$1"
  info "Applying SQL via supabase db remote exec: $sqlfile"
  # supabase db remote set is interactive; we attempt to run supabase db remote set if needed
  if command_exists supabase; then
    # supabase db remote set requires a connection string; we pass DB_URL
    supabase db remote set "$DB_URL" || warn "supabase db remote set failed"
    supabase db remote exec "$sqlfile" || warn "supabase db remote exec failed for $sqlfile"
  else
    warn "Supabase CLI not available; cannot run supabase db remote exec"
  fi
}

if command_exists psql; then
  if [ -f "$SQL_SCHEMA" ]; then
    apply_sql_with_psql "$SQL_SCHEMA"
  fi
  if [ -f "$SQL_RLS" ]; then
    apply_sql_with_psql "$SQL_RLS"
  fi
  if [ -f "$SQL_SEED" ]; then
    apply_sql_with_psql "$SQL_SEED"
  fi
else
  warn "psql not found — attempting to apply SQL using Supabase CLI"
  if command_exists supabase; then
    if [ -f "$SQL_SCHEMA" ]; then
      apply_sql_with_supabase "$SQL_SCHEMA"
    fi
    if [ -f "$SQL_RLS" ]; then
      apply_sql_with_supabase "$SQL_RLS"
    fi
    if [ -f "$SQL_SEED" ]; then
      apply_sql_with_supabase "$SQL_SEED"
    fi
  else
    err "Neither psql nor supabase CLI available to apply SQL. Install psql or supabase CLI and re-run."
  fi
fi

# ---------- Step 7: create Supabase storage bucket (optional) ----------
if command_exists supabase; then
  info "Ensuring Supabase storage bucket 'verification_docs' exists (server-side)."
  # This uses supabase CLI storage commands if available
  # Note: supabase CLI storage commands may require project context; we attempt a best-effort approach
  if supabase storage list 2>/dev/null | grep -q verification_docs; then
    info "Bucket verification_docs already exists."
  else
    warn "Creating bucket verification_docs via supabase CLI (best-effort)."
    supabase storage create verification_docs || warn "Could not create bucket via CLI. Create it in Supabase UI if needed."
  fi
else
  warn "Supabase CLI not available — create storage bucket 'verification_docs' manually in Supabase UI."
fi

# ---------- Step 8: start Next.js dev server ----------
info "Starting Next.js dev server (npm run dev) in background..."
# Use nohup to keep it running in background; logs to dev_server.log
nohup npm run dev > dev_server.log 2>&1 &

DEV_PID=$!
info "Next.js dev server started (PID: $DEV_PID). Logs: $PROJECT_ROOT/dev_server.log"
info "Open http://localhost:3000 in your browser."

# ---------- Step 9: final notes ----------
info "Setup complete (or started). Quick checklist:"
echo "- Edit .env.local with real keys if you haven't already."
echo "- Verify Supabase is running (supabase status or check http://localhost:54321)."
echo "- If Paystack testing is needed, set sandbox keys in .env.local."
echo "- To stop services: docker compose down (if used) and supabase stop (if started)."
echo "- To view Next.js logs: tail -f dev_server.log"

exit 0
