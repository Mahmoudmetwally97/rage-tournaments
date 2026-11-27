# RAGE TOURNAMENTS — Technical Architecture

## 1. Core Architectural Principles
1. **Strict Separation of Competition Logic:** The Competition Engine (`src/lib/engine/`) is completely independent of Next.js UI components and database drivers.
2. **Server-Authoritative Security:** Every API route and Server Action verifies Authentication, RBAC (`user_roles` + `tournament_admins` scope), and Zod input validation on the server.
3. **Transactional Integrity:** Capacity-checked registration, waitlist promotion, stage generation, and result approval + qualification execute inside PostgreSQL transactions.
4. **UTC Storage / Localized Display:** All schedules are stored in `timestamptz` (UTC) and rendered in the tournament/user timezone.
5. **No Invented Integrations:** RAGE Account Linking is decoupled behind an interface; independent accounts launch first without assuming an undocumented RAGE server API.

---

## 2. Technology Stack
- **Framework:** Next.js (App Router) + TypeScript (`strict: true`) + Tailwind CSS
- **Database, Auth, Realtime & Storage:** PostgreSQL via Supabase
- **Localization:** `next-intl` (Arabic RTL + English LTR)
- **Supporting Libraries (added per milestone as needed):** `zod`, `react-hook-form`, `@tanstack/react-query`, `@tanstack/react-table`, `@dnd-kit/*`, `recharts`, `vitest`, `playwright`
- **Hosting:** Undecided (Vercel recommended for Next.js; final hosting decision pending cost/resource review)

---

## 3. Build Order & Phases (Phases 0–6, Backlog RT-001 to RT-025)
- **First:** Database + Authentication + Security (`Phase 0–1`: `RT-001`–`RT-007`)
- **Second:** Tournament Builder + Registration (`Phase 2`: `RT-008`–`RT-011`)
- **Third:** Competition Engine (`Phase 3`: `RT-012`–`RT-015`)
- **Fourth:** Results + Admin + Leaderboard (`Phase 4–5`: `RT-016`–`RT-023`)
- **Final:** QA + Pilot Tournament + Production (`Phase 6`: `RT-024`–`RT-025` & Release Gate)
