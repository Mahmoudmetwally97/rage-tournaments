# RAGE TOURNAMENTS — Decisions Log & Unresolved Questions

## 1. Architectural & Product Decisions

| ID | Date | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-001** | Nov 2026 | **Dedicated Repository (`rage-tournaments`)** | Isolate RAGE Tournaments from the existing portfolio/agency repo (`serene-curie`) to prevent accidental overwrites and keep Git history clean. | Approved (Stage 1) |
| **DEC-002** | Nov 2026 | **Next.js App Router + TypeScript `strict: true` + Supabase** | Unified full-stack TypeScript, SSR/RSC for public SEO, PostgreSQL + Auth + Storage + RLS out of the box. | Approved |
| **DEC-003** | Nov 2026 | **Independent Accounts + Optional RAGE Linking** | Do not block launch on an unverified RAGE server API. Support independent Supabase Auth first and add RAGE linking only when technically verified. | Approved |
| **DEC-004** | Nov 2026 | **Decoupled Pure Competition Engine (`src/lib/engine/`)** | Keep FFA, Points, Groups, Knockout, and Custom Stage logic independent of React/UI and DB drivers for deterministic unit testing. | Approved |
| **DEC-005** | Nov 2026 | **Free Registration Only (MVP)** | Removes payment gateway complexity and compliance risk from MVP; focus on competitive reliability. | Approved |
| **DEC-006** | Nov 2026 | **Visual Identity Tokens** | `#0B0B0C` background, `#171719` secondary surface, `#FF6A1A` primary accent, `#F2EFE9` text, `#FFB938` gold for **rewards only**. Clean hierarchy without excessive neon/gradients. | Approved |
| **DEC-007** | Nov 2026 | **GB Arena as UX Usability Reference Only** | Study discovery, registration, and match-center clarity; build an original RAGE experience with zero copied branding, layouts, or assets. | Approved |
| **DEC-008** | Nov 2026 | **UTC Storage + Localized Display** | Store all timestamps in `timestamptz` (UTC) and format per tournament/user timezone to avoid Cairo/EU/NA schedule confusion. | Approved |

---

## 2. Unresolved Questions & Dependencies (To Track)

| ID | Topic | Question / Dependency | Impact | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **UQ-001** | **Hosting Provider** | Final decision between Vercel vs. self-hosted VPS/Docker (`Hosting: Undecided`). | Affects CI/CD pipeline and edge caching config (`DEPLOYMENT.md`). | Product / Tech Lead |
| **UQ-002** | **RAGE Account Linking** | Inspect existing RAGE server auth/database to verify if a safe OAuth/token/verification mechanism exists. | Determines when `Link RAGE Account` moves from `unverified/deferred` to active. | Backend / RAGE Team |
| **UQ-003** | **Automated Game Results** | Confirm whether CrossFire RAGE exposes any reliable match result export/API. | Currently out of scope for MVP; relies on Player Submission + Admin Entry. | RAGE Server Team |
| **UQ-004** | **Supabase Provisioning** | Create Supabase project (Staging & Production) and install Supabase CLI locally for `supabase db reset`. | Required before Stage 3/Milestone 2 database migrations. | Lead Engineer |
