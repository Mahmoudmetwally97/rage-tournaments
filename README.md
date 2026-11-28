# RAGE Tournaments (Rage Cup)

Tournament platform for the game RAGE (FFA, solo). Next.js 15 App Router, Supabase (Postgres, Auth, RLS and RPCs), Vercel. Arabic (RTL) and English.

Status: preview build on branch `feat/premium-ui-redesign`. Not merged to the default branch, not in production. Content is placeholder where marked (date, prizes, points).

## What is built
- Public: home, tournaments list and detail (overview with stage path, rules, schedule and stages, participants, standings), leaderboard, player dashboard (my registrations), login and register.
- Player flow: register, wait for approval, check in (opens 40 minutes before start, organizer can override), see own rank, standings and prizes, report an issue, claim a prize.
- Organizer console (`/admin/<slug>`): overview checklist, participants (approve, reject, check in, ban), matches and scores (seed rooms from checked-in players, enter rank and kills per room, points = placement + kills), multi-stage (add stages, advance top N, stage strip), drag and drop of players between rooms (also a Move menu for touch; blocked once results exist, room size limit, organizer only), prizes and claims, rules editor (AR and EN sections), issues, dates in Cairo time.
- Backend: migrations `supabase/migrations/0001` to `0010` (tables, RLS, RPCs for admin actions, stages, advance, move player, check-in).
- Rules text loaded as draft (CrossFire-style FFA rules adapted to RAGE, team-only parts dropped).

## Run locally
```
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```
Apply the SQL files in `supabase/migrations` in order to a Supabase project. Never put the service role key in the client or in Vercel env. Admin changes go through RPCs guarded by the organizer role.

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## What remains
- Real start date, prizes and points table (placeholders are marked in the UI).
- Anti-cheat download link and upload place, live-view setting, room-name delivery channel (flagged in the rules).
- File upload for evidence, not built.
- Before launch: turn Supabase "Confirm email" back on with custom SMTP, fix the Auth Site URL, set a spam-safe signup limit.
- Mobile polish pass on the newest build, side panel on single-item pages.
- Brand: lime `#e5ed43` on `#0d0e10` (confirmed). Gold is for prizes only.

## Docs
See `docs/` (PRD, architecture, database schema, RBAC, tournament engine, QA plan). The "Approved Direction" note in the PRD is repo text, not a recorded sign-off.

No secrets are stored in this repo. `.env.example` has placeholders only.
