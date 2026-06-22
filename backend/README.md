# Plantora Backend — Foundation

Multi-tenant billing backend for plant shops in India. This is **prompt 1**: the
foundation only — PostgreSQL schema, Row Level Security (RLS) tenant isolation,
JWT auth, and admin shop/owner management. No product, billing, printing, image,
or frontend code yet.

- **Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL 16
- **Auth:** JWT (python-jose) · bcrypt password hashing (passlib)
- **Isolation:** PostgreSQL RLS enforced via a non-privileged app DB role

---

## How tenant isolation works

Two PostgreSQL roles:

| Role | Used by | Privileges |
| --- | --- | --- |
| **owner/admin role** (`plantora_admin`) | Alembic migrations | Owns the schema; creates/alters tables |
| **app role** (`plantora_app`) | FastAPI runtime | `LOGIN`, **`NOSUPERUSER`**, **`NOBYPASSRLS`** + table DML grants |

Because the runtime connects as a role that **cannot bypass RLS**, the policies
in the initial migration are always enforced. Every authenticated request runs
in a single transaction that first sets two transaction-local variables derived
from the verified JWT:

```
app.user_role        -> 'admin' | 'shop_owner'
app.current_shop_id  -> the owner's shop UUID   (omitted for admin)
```

Policies allow **all rows for `admin`** and **`shop_id = app.current_shop_id` for
everyone else** (`bill_items` is isolated through its parent bill). They are set
with `set_config(..., is_local => true)` so they auto-reset at COMMIT/ROLLBACK
and never leak across pooled connections.

RLS is enabled **and `FORCE`d** on: `shops`, `users`, `products`, `customers`,
`bills`, `bill_items`.

> **Login note:** login and the bootstrap script have no JWT yet and must read
> the `users` table by email. They use a contained *privileged session* that
> asserts the `admin` application context. The DB app role still has no
> `BYPASSRLS`; this is purely an application-level trusted code path.

---

## Local setup

### 1. Create the two Postgres roles and the database

Connect as a Postgres superuser (e.g. `psql -U postgres`) and run:

```sql
-- Owner role: owns the schema, runs migrations.
CREATE ROLE plantora_admin LOGIN PASSWORD 'change_me_admin';

-- App role: runtime. MUST NOT be superuser and MUST NOT bypass RLS.
CREATE ROLE plantora_app LOGIN PASSWORD 'change_me_app'
    NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- Database owned by the admin role.
CREATE DATABASE plantora OWNER plantora_admin;

-- Let the app role connect.
GRANT CONNECT ON DATABASE plantora TO plantora_app;
```

> Table-level privileges for `plantora_app` are granted **by the migration**
> (`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES ...`), so you do not grant
> them manually. The migration reads the app role name from `APP_DB_ROLE`
> (default `plantora_app`).

`gen_random_uuid()` is built into PostgreSQL 13+, so no extension is required on
PostgreSQL 16.

### 2. Python environment

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# bash/macOS/Linux:    source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# edit .env: set both DATABASE_URL_* to match the roles/passwords above,
# set a real JWT_SECRET (e.g. `openssl rand -hex 32`), and the BOOTSTRAP_ADMIN_*.
```

### 4. Run migrations (as the admin/owner role)

```bash
alembic upgrade head
```

This creates the full schema, all RLS policies, indexes, and grants DML on every
table to `plantora_app`.

### 5. Create the bootstrap admin

```bash
python -m app.scripts.create_admin
```

Idempotent — safe to re-run.

### 6. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: <http://localhost:8000/health> → `{"status":"ok"}`
Interactive docs: <http://localhost:8000/docs>

---

## Money & timestamps conventions

- **Money** is `NUMERIC(12,2)` everywhere — never floats. API responses render
  monetary values as JSON **strings with 2 decimals** (e.g. `"199.00"`).
- **Timestamps** are `TIMESTAMPTZ`, stored and returned in **UTC**.

---

## Product images & media serving

Uploaded product images are stored on the filesystem under `MEDIA_ROOT`
(`./media` in dev) in a `products/` subdirectory, with server-generated unique
filenames (`<uuid>.<ext>`). The DB column `products.photo_path` stores only the
**relative** path (e.g. `products/abc123.jpg`); API responses expose a ready-to-use
URL field `photo_url` (e.g. `/media/products/abc123.jpg`, or `null` when there is
no image).

- Allowed types: JPEG, PNG, WebP. Max size: 5 MB.
- The `MEDIA_ROOT/products/` directory is created automatically on startup and on
  first upload.

**Local dev** serves images via a FastAPI static mount at `MEDIA_URL_PREFIX`
(default `/media`).

**Production (VPS)**: let **Nginx serve `MEDIA_ROOT` directly** at the same prefix
for performance — the app need not stream image bytes. Example:

```nginx
location /media/ {
    alias /var/lib/plantora/media/;   # = MEDIA_ROOT with a trailing slash
    access_log off;
    expires 30d;
}
```

Set `MEDIA_ROOT` to that absolute path and keep `MEDIA_URL_PREFIX=/media`. The
FastAPI static mount remains harmless behind the proxy.

---

## API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness check |
| POST | `/auth/login` | none | Email + password → JWT |
| GET | `/auth/me` | bearer | Current user info |
| POST | `/admin/shops` | admin | Create shop + first owner |
| GET | `/admin/shops` | admin | List all shops |
| PATCH | `/admin/shops/{shop_id}` | admin | Activate/deactivate a shop |
| POST | `/admin/shops/{shop_id}/reset-password` | admin | Reset that shop owner's password |
| POST | `/products` | shop_owner | Create a product |
| GET | `/products` | shop_owner | List shop products (`q`, `category`, `active` filters) |
| GET | `/products/{id}` | shop_owner | Single product (404 if not owned/missing) |
| PATCH | `/products/{id}` | shop_owner | Partial update |
| DELETE | `/products/{id}` | shop_owner | Soft delete; `?hard=true` permanent (409 if sales history) |
| POST | `/products/{id}/image` | shop_owner | Upload/replace image (multipart `file`) |
| DELETE | `/products/{id}/image` | shop_owner | Remove image |

Products are **scoped to the owner's shop by RLS** — owners never pass a
`shop_id`; the server takes it from the JWT. Admins do not manage products.

There is **no public/self registration**. Shop owners exist only because the
admin created them.

---

## Manual acceptance tests

**1. DB-level RLS proof** (no HTTP) — connects as the limited app role and
proves shop A's owner cannot see shop B's product while admin sees both:

```bash
python -m scripts.rls_check        # expect "RLS CHECK PASSED"
```

**2. HTTP auth + admin flow** — admin login, shop+owner creation, owner login,
role guards, and inactive-shop login blocking:

```bash
BASE_URL=http://localhost:8000 \
ADMIN_EMAIL="owner@plantora.app" ADMIN_PASSWORD="<bootstrap pw>" \
bash scripts/acceptance_test.sh
```

**3. Product management flow** — creates a product, lists/searches it, updates
price + stock, uploads an image (and verifies the returned `photo_url` is
fetchable), replaces the image (old file removed), checks cross-tenant access
returns **404**, exercises the hard-delete **409** path, and finally
soft-deletes:

```bash
BASE_URL=http://localhost:8000 \
ADMIN_EMAIL="owner@plantora.app" ADMIN_PASSWORD="<bootstrap pw>" \
bash scripts/product_test.sh
```

See [`scripts/product_test.sh`](scripts/product_test.sh) for the exact curl
calls.
