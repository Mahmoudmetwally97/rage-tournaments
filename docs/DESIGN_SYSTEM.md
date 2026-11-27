# RAGE TOURNAMENTS — Design System

## 1. Design Philosophy
- **Competitive Esports Identity:** Sharp, high-contrast, trustworthy, fast, and uncluttered.
- **No Visual Noise:** No excessive gradients, no heavy neon glow spam, and no generic AI-dashboard aesthetics.
- **Strict Gold Rule:** `#FFB938` is reserved **exclusively for rewards, prizes, podium ranks, and winner badges**—never for generic buttons or decorative borders.

---

## 2. Color Tokens
| Token | Hex | Role |
| :--- | :--- | :--- |
| `--bg-canvas` | `#0B0B0C` | Primary page background |
| `--bg-surface` | `#171719` | Cards, panels, modals, dropdowns, table headers |
| `--bg-surface-hover` | `#1F1F23` | Hover state for interactive surfaces |
| `--border-subtle` | `#27272C` | Default 1px borders and dividers |
| `--border-strong` | `#3A3A42` | Hover/active input and card borders |
| `--accent-primary` | `#FF6A1A` | Primary CTAs, active tabs, focus rings |
| `--accent-hover` | `#FF7E38` | Primary button hover state |
| `--text-primary` | `#F2EFE9` | Headings and primary body copy |
| `--text-secondary` | `#B5B2AC` | Supporting descriptions and labels |
| `--text-muted` | `#7A7874` | Placeholders, disabled text, timestamps |
| `--gold-reward` | `#FFB938` | **Rewards only** (prizes, 1st place, winner badges) |
| `--status-success` | `#10B981` | Open registration, confirmed, approved |
| `--status-warning` | `#F59E0B` | Waitlist, pending review, check-in closing soon |
| `--status-danger` | `#EF4444` | Closed, disqualified, rejected, dispute |

---

## 3. Typography Scale & BiDi Rules
- **Arabic (`dir="rtl"`):** `Cairo` (400, 600, 700, 800)
- **English (`dir="ltr"`):** `Inter` / `Space Grotesk` (500, 600, 700)
- **Scale:**
  - `Display / Hero`: `clamp(2rem, 4vw, 3rem)`, `font-weight: 800`, `line-height: 1.15`
  - `H1`: `1.875rem` (30px), `font-weight: 800`
  - `H2`: `1.375rem` (22px), `font-weight: 700`
  - `H3`: `1.125rem` (18px), `font-weight: 700`
  - `Body`: `0.9375rem` (15px), `line-height: 1.6`
  - `Caption / Meta`: `0.8125rem` (13px)
- **BiDi Isolation:** Wrap all `IGN`s, team tags, scores, and codes in `dir="ltr"` (`unicode-bidi: isolate`) inside Arabic RTL views so Latin text and numbers never flip.

---

## 4. Spacing & Layout System
- **Base Unit:** `4px` (`4, 8, 12, 16, 24, 32, 48, 64`).
- **Container Max Width:** `1280px` with `24px` desktop padding (`16px` mobile).
- **Card Padding:** `20px`–`24px`, `border-radius: 10px`, `1px solid var(--border-subtle)`.

---

## 5. Core Reusable Component Specifications
Every interactive component must implement **default, hover, focus-visible (`2px solid #FF6A1A` ring), disabled (`opacity: 0.5`, `cursor: not-allowed`), and loading (spinner + disabled)** states:

1. **Buttons:** `Primary` (`#FF6A1A` bg, `#0B0B0C` bold text), `Secondary` (`#171719` bg, `#27272C` border), `Ghost`, `Danger`.
2. **Inputs & Selects:** `#0B0B0C` bg, `#27272C` border, clear error message below input, `aria-invalid` support.
3. **Cards:** Tournament Card (structured metadata grid, status badge, clear CTA), Stat Card, Match Card.
4. **Badges:** Semantic pills for Tournament Status (`Registration Open`, `Check-in`, `Live`, `Completed`), Competition Type (`Solo` / `Team`), and Rewards (`#FFB938` only when confirmed).
5. **Navigation:** Sticky top header (Logo, Tournaments, Leaderboards, News, Language Switcher `AR/EN`, Auth/User Menu) + mobile drawer.
6. **Modals:** Accessible focus trap, `Escape` to close, clear primary & cancel actions.
7. **Tables:** Clean horizontal scroll on desktop + responsive card view on mobile, server-side pagination controls.
8. **Tabs:** Underline/pill tabs with keyboard arrow navigation (`role="tablist"`).
9. **Empty States:** Clear icon, concise explanation, and single next action (e.g., "No open tournaments right now").
10. **Loading States:** Skeleton loaders matching exact card/table dimensions (no layout shift).
11. **Error States:** Actionable retry banner with clear message.
12. **Toast Notifications:** Top-end (`top-4 end-4`) dismissible alerts for success, warning, and error feedback.
