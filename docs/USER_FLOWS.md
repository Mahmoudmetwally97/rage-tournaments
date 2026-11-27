# RAGE TOURNAMENTS — User Flows & Journeys

## 1. Core UX Principle: 3-Step Sign Up & Progressive Profiling
- **Zero Onboarding Fatigue:** Initial Sign Up collects **only** authentication credentials and a `username`.
- We **never** ask for IGN, game selection, Discord, WhatsApp, or RAGE account linking during initial Sign Up.
- Game-specific `IGN` is collected **only when the player joins their first tournament for that game** (saved to `player_game_profiles` for one-click reuse later).
- Every step provides immediate, clear **success** and **error** feedback.

---

## 2. Flow A: Fast Account Sign Up (3 Steps)
1. **Trigger:** User clicks **Sign Up** from Header, Hero, or a Tournament's **Register** button.
2. **Credentials:** User enters `Email + Password` (or selects supported OAuth) + `Username`.
3. **Verify & Redirect:** User verifies email (if required by auth policy) and is redirected **immediately back to the tournament they came from** (or to **Player Dashboard**).
4. **Optional Later (Non-Blocking):** In `Account Settings -> Link RAGE Account`, user can optionally link an existing RAGE account *only when a verified integration exists*.

---

## 3. Flow B: Solo Tournament Registration (Progressive Profiling)
1. User browses **Tournaments** or clicks a card on **Home**.
2. User opens **Tournament Details** and sees Game, Format, Schedule (local timezone), Rules, Capacity, and Participants.
3. User clicks **Register Now** (guests are routed through Flow A and returned directly here).
4. **Quick Confirm Drawer/Modal:**
   - If the user has no `player_game_profiles` entry for this tournament's game yet, they enter their **IGN** once here (saved automatically for future tournaments in this game).
   - If they already have an IGN for this game, it is pre-filled for 1-click confirmation.
   - User checks **Accept Tournament Rules** and clicks **Confirm Registration**.
5. **Server Transactional Result:**
   - **Confirmed:** Displays registration code (e.g. `RAGE-4821`) and Check-in schedule.
   - **Waitlisted:** Displays queue position if `max_participants` is reached.
   - **Duplicate:** Clear inline error preventing double registration.

---

## 4. Flow C: Team Creation & Team Tournament Registration
1. Player opens **Team Dashboard** → **Create Team** (`Team Name`, `Tag`, `Game`, optional `Logo`). Creator becomes **Team Leader**.
2. Team Leader invites players by `username` or invite link.
3. Invited players receive an in-app notification and **Accept** or **Reject** (*Team Leader cannot register a player without acceptance*).
4. On **Tournament Details**, Team Leader clicks **Register Team**, picks the eligible team (meeting `min_team_size` / `max_team_size`), confirms rules, and submits.

---

## 5. Flow D: Check-in, Match Center & Result Submission
1. During `Check-in`, confirmed solo players / team leaders click **Check In** on Tournament Details or Dashboard.
2. When `Live`, participants open **Match Center** → **Match Details** (room/group, opponents, schedule).
3. **Result Entry:**
   - **Player Submission:** Participant enters score/kills/placement + uploads screenshot proof → `Pending Review`.
   - **Admin/Referee Entry:** Official enters or approves result → Leaderboard updates automatically.
4. **Dispute Workflow:** `Submitted` → `Under Review` → `Resolved` (`Accept`, `Reject`, `Request More Evidence`, `Correct Result`, `Reopen Review`).
