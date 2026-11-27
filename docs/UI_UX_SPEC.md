# RAGE TOURNAMENTS — Information Architecture, UX & Wireframes

## 1. UX Benchmark & Originality Rule
- **Reference Study (GB Arena):** Adopted usability strengths—immediate tournament discovery, scannable tournament cards, low-friction registration, clear match center, and structured tabs on tournament pages.
- **Original RAGE Execution:** Zero copied branding, layouts, or assets. Built around RAGE's `#0B0B0C` / `#171719` / `#FF6A1A` / `#F2EFE9` / `#FFB938` system with bilingual RTL/LTR support.

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

### 4.1 Homepage Wireframe (Desktop)
```text
+-------------------------------------------------------------------------+
| [RAGE Logo]  Tournaments  Leaderboards  News  Rules   [AR|EN] [Sign Up] |
+-------------------------------------------------------------------------+
|  HERO: Compete on RAGE. Official CrossFire Tournaments.                 |
|  [Browse Open Tournaments]  [Create Account]                            |
+-------------------------------------------------------------------------+
|  OPEN REGISTRATION & FEATURED TOURNAMENTS                               |
|  +-----------------------+  +-----------------------+  +--------------+ |
|  | CrossFire | Solo |FFA |  | CrossFire | Team | 5v5|  | ...          | |
|  | RAGE FFA Cup          |  | RAGE Clash Cup        |  |              | |
|  | 24 / 32 Slots | Open  |  | 8 / 16 Teams | Open   |  |              | |
|  | Starts: Fri 21:00     |  | Starts: Sat 22:00     |  |              | |
|  | [Register] [Details]  |  | [Register] [Details]  |  |              | |
|  +-----------------------+  +-----------------------+  +--------------+ |
+-------------------------------------------------------------------------+
|  UPCOMING MATCHES & RECENT RESULTS   |  LEADERBOARD PREVIEW             |
|  - Room 1 FFA (In 2h)                |  1. [EG]ProSniper    1,420 pts   |
|  - Team Alpha vs Team Bravo (2 - 1)  |  2. Viper_CF         1,310 pts   |
+-------------------------------------------------------------------------+
```

### 4.2 Tournament Details & Registration Wireframe (Mobile)
```text
+-----------------------------------+
| [=] [RAGE Logo]         [AR|EN]   |
+-----------------------------------+
| [Registration Open] [Solo] [FFA]  |
| RAGE FFA Cup — Season 1           |
| 24 / 32 Players | Fri 21:00 EET   |
| Prize: Confirmed Reward (Gold)    |
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
