# RAGE TOURNAMENTS — PRD v1.0 (Approved Direction)

**Date:** November 2026  
**Product:** RAGE Tournaments  
**Product Type:** Esports Tournament Management Platform  
**Initial Game:** CrossFire – RAGE  
**Primary Audience:** Solo Players, Team Leaders, Tournament Organizers, Referees  
**Product Vision:** منصة مستقلة لإدارة وتنظيم البطولات الإلكترونية، تتيح للاعبين التسجيل والمنافسة ومتابعة نتائجهم، وتتيح للإدارة إنشاء البطولات وإدارة التصفيات والنتائج من نظام موحد.

---

## 1. Approved Decisions
| Decision | Final Choice |
| :--- | :--- |
| **Accounts** | Independent + Optional RAGE Account Linking |
| **Results** | Player Submission + Admin Entry |
| **Languages** | Arabic (RTL) + English (LTR) |
| **Registration** | Free Only |
| **Hosting** | Undecided (Vercel + Supabase recommended; subject to final hosting decision) |
| **Competition** | Solo + Team |
| **Capacity** | Unlimited Platform Capacity / Configurable Tournament Capacity |
| **Formats** | Customizable (FFA, Points, Groups, Knockout, Custom Stages) |
| **Platform** | Independent RAGE Product |

> **Capacity Clarification:** Unlimited platform capacity means the platform supports high tournament and participant scale per hosting resources—not that every tournament is uncapped. Each tournament can configure a specific `max_participants` or remain open (`0` = unlimited).

---

## 2. Product Goals & KPIs
### Core Goals
1. Automate registration and participant management.
2. Reduce manual organizer workload.
3. Manage qualifiers, groups, and multi-stage brackets cleanly.
4. Publish clear, trustworthy results and leaderboards.
5. Deliver a professional experience for solo players and teams.
6. Support future expansion to additional games and competition formats.

### KPIs (Baseline measured after Pilot Tournament — no arbitrary targets pre-launch)
- **Registration Completion** (`%` completed registrations)
- **Check-in Rate** (`%` confirmed participants checking in)
- **Match Completion** (`%` completed matches)
- **Result Approval Time** (median time to approve submissions)
- **Dispute Rate** (`%` disputed matches)
- **Admin Workload** (manual time required per tournament)
- **Platform Reliability** (uptime & error rate)

---

## 3. MVP Scope
### In Scope (MVP)
- Independent player accounts (Email, Password, Email Verification, Username, Player IGN) + optional RAGE account linking architecture.
- Arabic (RTL) & English (LTR) UI.
- Player & Team profiles, Team creation, invitations, and roster validation.
- Tournament Builder (Basic Info, Participants, Format, Scoring, UTC Schedule, Publishing).
- Solo & Team registration, duplicate prevention, Waitlist with ordered promotion, and Check-in.
- Competition Engine: FFA, Points, Groups, Single Elimination Knockout, and Custom Stages (composed of supported stage types).
- Dual Result Entry (Player Submission with screenshot evidence + Admin/Referee Entry) & Dispute Workflow.
- Tournament Leaderboard, Match Center, In-app Notifications, Scoped RBAC, and Audit Logs.

### Out of Scope (Initial MVP)
- Entry fees / payment processing or automated cash prize payouts.
- Direct automated match-result scraping from the CrossFire game client/server.
- Standalone Android/iOS mobile apps.
- Betting/wagering, built-in live streaming, or sponsor marketplace.
- Global cross-tournament rankings (deferred to P2 after fair scoring baseline).

---

## 4. Tournament Lifecycle State Machine
- **Main Flow:** `Draft` → `Published` → `Registration Open` → `Registration Closed` → `Check-in` → `Ready` → `Live` → `Completed` → `Archived`
- **Exception States:** `Cancelled`, `Suspended`
- All transitions are strictly validated on the server by role and preconditions.

---

## 5. Execution Backlog & Release Gate
- **Priority Tiers:** `RT-001` to `RT-025` (`P0` MVP Required, `P1` Important Next, `P2` Later Enhancement).
- **Build Order:**
  1. Database + Authentication + Security
  2. Tournament Builder + Registration
  3. Competition Engine (FFA, Points, Groups, Knockout, Custom Stages)
  4. Results + Admin + Leaderboard
  5. QA + Pilot Tournament (32 players, 4 groups of 8, top 2 advance → 8-player Final) + Production
