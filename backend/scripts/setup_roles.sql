-- One-time database + role bootstrap for local dev.
-- Run as the postgres superuser:  psql -U postgres -f scripts/setup_roles.sql
-- Idempotent-ish: safe to re-run; will error only if objects already exist.

-- Owner role: owns the schema, runs migrations.
CREATE ROLE plantora_admin LOGIN PASSWORD '8f33225958d85ef59e85d3e6';

-- App role: runtime. MUST NOT be superuser and MUST NOT bypass RLS.
CREATE ROLE plantora_app LOGIN PASSWORD 'dcf46ed14f19f202c1f333c1'
    NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- Database owned by the admin role.
CREATE DATABASE plantora OWNER plantora_admin;

-- Let the app role connect.
GRANT CONNECT ON DATABASE plantora TO plantora_app;
