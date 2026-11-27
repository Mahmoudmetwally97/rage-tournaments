# RAGE TOURNAMENTS — Deployment & Hosting

## 1. Hosting Status
- **Hosting Decision:** Currently **Undecided** (Vercel + Supabase is the recommended baseline; final hosting provider will be selected after evaluating cost and resource requirements).
- **Database & Auth:** PostgreSQL + Auth + Storage via **Supabase**.

---

## 2. Environments & Git Workflow
- **Branches:** Never push directly to `main`. All work happens on `feat/*` branches via reviewed Pull Requests.
- **Secrets:** Never commit `.env` or `.env.local`. Only `.env.example` is tracked.
- **Migrations:** All schema changes must be authored as sequential SQL migrations (`supabase/migrations/`) and tested with `supabase db reset` before staging/production rollout.

---

## 3. Production Go-Live Checklist
- RLS enabled and verified on **every** table in `public`.
- `SUPABASE_SERVICE_ROLE_KEY` restricted strictly to server-only modules.
- Rate limiting enabled on Auth, Registration, and Result Submission endpoints.
- Uploaded match evidence files restricted by MIME type (`image/png`, `image/jpeg`, `image/webp`) and size limit, stored in private/signed buckets.
- Automated PostgreSQL backups & recovery tested prior to Pilot Tournament.
