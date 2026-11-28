# RAGE TOURNAMENTS — Information Architecture, UX & Wireframes

## 1. UX Benchmark & Originality Rule
- **Reference Study (GB Arena):** Studied GB Arena's end-to-end tournament operations clarity—from discovery and check-in to live match rooms, scoreboards, and final standings—and translated those operational patterns into **RAGE TOURNAMENTS** without copying GB Arena's branding, visual assets, or Arenas system.
- **Original RAGE Execution:** Built around RAGE's `#0B0B0C` / `#171719` / `#FF6A1A` / `#F2EFE9` / `#FFB938` system with bilingual RTL/LTR support.

---

## 1.5 End-to-End Tournament Operations UX (6 Core Stages)
1. **Tournament Overview:** Clear header with Game (`CrossFire – RAGE`), Solo/Team mode, Format, Rules, Eligibility, Capacity meter, UTC-to-local Schedule, and live Lifecycle Status badge.
2. **Registration & Participants:** Paginated participant/team roster, registration status (`Confirmed`, `Checked-in`, `Waitlisted` with queue position), and 1-click Check-in during the active check-in window.
3. **Tournament Operations:** Room/Group distribution view (`Group A / Room 1`), deterministic seeding indicator, scheduled match times, and match room assignments.
4. **Live Competition:** Real-time/refreshed Match Center showing match rooms, kills, placement points, total scores, tie-breaker rank, and stage-to-stage qualification indicators (`Qualified` / `Eliminated`).
5. **Tournament Administration:** Scoped Organizer & Referee console for Tournament Builder, participant check-in overrides, side-by-side result & screenshot review, dispute resolution queue (`Submitted` → `Under Review` → `Resolved`), and immutable `audit_logs`.
6. **Final Results:** Official podium (`#FFB938` gold for verified winners only), complete final standings, and permanent `Archived` tournament history page.

---

## 2. Information Architecture & Navigation

### Public Routes
- `/` — **Home** (Hero, Featured & Open Tournaments, Upcoming Matches, Recent Results, Leaderboard Preview)
- `/tournaments` — **Tournaments** (Filter by Game, Solo/Team, Format, Status; paginated)
- `/tournaments/[slug]` — **Tournament Details** (Overview, Rules, Schedule, Format/Scoring, Participants, Brackets/Rooms, Leaderboard)
- `/leaderboards` — **Leaderboards**
- `/news` — **News / Updates**
- `/rules` — **Platform Rules**
- `/login` & `/register` — **Authentication & Onboarding**

### Player Routes (Authenticated)
- `/dashboard` — **Player Dashboard** (My Registrations, Check-in alerts, Upcoming Matches)
- `/profile` — **Player Profile**
- `/my-tournaments` — **My Tournaments**
- `/matches` & `/matches/[id]` — **My Matches & Match Details (Match Center)**
- `/notifications` — **Notifications**
- `/settings` — **Account Settings** (including optional `Link RAGE Account` when verified)

### Team Routes (Authenticated)
- `/teams/[id]` — **Team Profile & Members**
- `/teams/invitations` — **Invitations**
- `/teams/[id]/registrations` — **Team Tournament Registrations**

### Admin & Staff Routes (RBAC Protected)
- `/admin` — **Admin Dashboard**
- `/admin/tournaments` & `/admin/tournaments/new` — **Tournament Management & Builder**
- `/admin/tournaments/[id]/participants` — **Participants Management**
- `/admin/tournaments/[id]/stages` — **Stage Management**
- `/admin/matches` — **Match Management**
- `/admin/results` — **Result Review**
- `/admin/disputes` — **Disputes**
- `/admin/users` — **User Management**
- `/admin/audit-logs` — **Audit Logs**

---

## 3. Tournament Card & Detail Rules
- **Tournament Card MUST display:** Tournament Name, Game, `Solo` or `Team`, Competition Format, Registration Status, Participants / Capacity (`X / Y` or `X / Open`), Start Date (local timezone), Prize (only when confirmed—never invented), and clear `View Details` / `Register` CTA.
- **Tournament Details MUST clearly explain:** Rules, Eligibility, Registration Process, Schedule, Format, Scoring, Participants, and Match Structure.

---

## 4. Desktop & Mobile Wireframes (Stage 2 Review)

> **[ILLUSTRATIVE DEMO DATA ONLY]:** All tournament names, player counts, match times, and reward labels in the wireframes below are illustrative placeholders for layout review—not live or confirmed RAGE tournament content.

### 4.1 Homepage Wireframe (Desktop)
```text
+-------------------------------------------------------------------------+
| [RAGE Logo]  Tournaments  Leaderboards  News  Rules   [AR|EN] [Sign Up] |
+-------------------------------------------------------------------------+
|  HERO: Compete on RAGE. Official CrossFire Tournaments.                 |
|  [Browse Open Tournaments]  [Create Account]                            |
+-------------------------------------------------------------------------+
|  OPEN REGISTRATION & FEATURED TOURNAMENTS (Illustrative Demo Cards)     |
|  +-----------------------+  +-----------------------+  +--------------+ |
|  | CrossFire | Solo |FFA |  | CrossFire | Team | 5v5|  | ...          | |
|  | [Demo] FFA Cup        |  | [Demo] Clash Cup      |  |              | |
|  | 24 / 32 Slots | Open  |  | 8 / 16 Teams | Open   |  |              | |
|  | Starts: Fri 21:00     |  | Starts: Sat 22:00     |  |              | |
|  | [Register] [Details]  |  | [Register] [Details]  |  |              | |
|  +-----------------------+  +-----------------------+  +--------------+ |
+-------------------------------------------------------------------------+
|  UPCOMING MATCHES & RECENT RESULTS   |  LEADERBOARD PREVIEW (Demo)      |
|  - Room 1 FFA (In 2h)                |  1. [Demo]PlayerA    1,420 pts   |
|  - Team Alpha vs Team Bravo (2 - 1)  |  2. [Demo]PlayerB    1,310 pts   |
+-------------------------------------------------------------------------+
```

### 4.2 Tournament Details & Registration Wireframe (Mobile)
```text
+-----------------------------------+
| [=] [RAGE Logo]         [AR|EN]   |
+-----------------------------------+
| [Registration Open] [Solo] [FFA]  |
| [Demo] FFA Cup — Sample Season    |
| 24 / 32 Players | Fri 21:00 EET   |
| Prize: [Confirmed Reward Only]    |
| [     Register Now (#FF6A1A)    ] |
+-----------------------------------+
| [Overview] [Rules] [Participants] |
| [Brackets/Rooms] [Leaderboard]    |
+-----------------------------------+
| Format: 4 Groups -> Top 2 -> Final|
| Scoring: Placement + Kill Points  |
| Eligibility: Verified Account     |
+-----------------------------------+
```
