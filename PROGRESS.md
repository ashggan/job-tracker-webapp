# Waypoint — Implementation Progress

Living tracker for the build described in `SPEC.md`, sequenced per the 13-milestone plan. Check items off as they land; update "Status" as a milestone starts/finishes. This file is committed to git, so history shows when each piece landed.

Design source: `DESIGN_PROMPT.md` + the handed-off canvas (`Job Tracker.dc.html` / `tokens.css`, applied via `src/app/globals.css` and `tailwind.config`). Product name from the design: **Waypoint**.

Legend: ⬜ not started · 🔷 in progress · ✅ done

---

## Phase 1 — Foundation

### M1 — Foundation ✅
Ships when a new user can sign up, log in, see an empty board and table, and log out.
- [x] Scaffold Next.js App Router + TypeScript project, ESLint/Prettier
- [x] Install Tailwind CSS + shadcn/ui base components
- [x] Apply Waypoint design tokens (Lora + Manrope, warm palette, pill radii) into Tailwind/globals.css
- [x] Add Prisma, write `schema.prisma` for all 11 entities, run first migration (local Postgres via Docker Compose)
- [x] Wire NextAuth credentials provider (bcrypt) + signup/login/logout pages
- [x] Build app shell nav (Board/Table/Dashboard/Profile/Settings) + auth-guard middleware
- [x] Ship empty `/board` and `/table` route shells

Verified in-browser: signup creates a user and signs in, `/` redirects to `/board`, the auth
guard (`src/proxy.ts` — Next 16 renamed `middleware` to `proxy`) sends unauthenticated visits
to `/login` and bounces logged-in users away from the auth pages, board renders all 7 stage
columns empty, table renders all 11 spec columns empty, logout clears the session, and
logging back in with the same credentials works. Placeholder pages added at
`/dashboard`, `/profile`, `/settings` so the nav has no dead links ahead of M3/M6/M7/M12.

### M2 — Core CRUD ✅
Ships when a user can add, edit, move through every stage, and delete an application entirely through the table view.
- [x] Applications API (create/read/update/delete), scoped to the signed-in user — server actions in `src/lib/actions/applications.ts`, all scoped by `userId`
- [x] Quick-add form at `/applications/new` — board's URL-paste field prefills the posting link
- [x] Stage-change control that writes a `StageEvent` — dropdown on each board card
- [x] Table view wired to real data: sort (clickable column headers), search (debounced), stage/fit/source/date filters
- [x] Delete or withdraw an application from the table — trash icon per row, with confirm

Verified in-browser: quick-add from the board toolbar lands on `/applications/new` with the
posting link prefilled, creating an application drops it into Wishlist; the stage dropdown on
a board card moves it between columns and stamps `dateApplied` the first time it hits
Applied; the table reflects the same data with working stage/fit/source/date filters, debounced
search, and sortable column headers (URL-driven, so state survives a refresh/share).

Found and fixed along the way: Base UI's `<Select.Value>` only shows the resolved label
before the popup has ever opened if `<Select.Root items={...}>` is given a value→label map —
without it, the closed trigger displayed the raw enum value (`wishlist`, `all`) instead of
the label (`Wishlist`, `Stage: All`). Fixed on both `StageSelect` and `TableFilters`.

## Phase 2 — Profile & records

### M3 — Profile & preferences ⬜
- [ ] Resume upload → stored as the tailoring template
- [ ] Structured resume form (contact, summary, skills, experience, education)
- [ ] One-shot Claude auto-extract from the uploaded resume (after M6 lands)
- [ ] Preferences form (roles, locations, comp floor, must-haves, dealbreakers, nice-to-haves)
- [ ] Gate scoring/tailoring/aggregation entry points until the profile is complete

### M4 — Detail view ⬜
- [ ] Editable core fields on `/applications/[id]`
- [ ] Notes log, newest-first, timestamped entries
- [ ] Stage-history timeline from `StageEvent`
- [ ] Manual fit-score entry/override fields

### M5 — Documents ⬜
- [ ] Wire file storage (Vercel Blob)
- [ ] Upload/attach/preview/download UI on the detail view
- [ ] Table view "CV Used" / "Cover Letter" columns link to attachments

## Phase 3 — AI layer

### M6 — AI provider & key management ⬜
- [ ] Settings UI to add/remove/activate a provider key, masked preview only
- [ ] Encrypt keys at rest (AES-256-GCM, server-held key)
- [ ] Provider-agnostic adapter interface; Anthropic implementation first
- [ ] Default-vs-own-key routing resolved before every AI call
- [ ] `AIUsageLog` write on every call

### M7 — AI fit scoring ⬜
- [ ] Scoring prompt + call → score, label, strengths, gaps
- [ ] Auto-run on Wishlist ingestion; manual Re-score button
- [ ] Per-user daily cap on the shared key, with a clear "add your own key" state
- [ ] AI usage panel on `/dashboard` backed by `AIUsageLog`

### M8 — AI CV tailoring ⬜
- [ ] Tailoring prompt + call → draft summary/skills/experience bullets
- [ ] In-app inline editor for the draft, optional cover letter
- [ ] Provision a DOCX→PDF conversion service
- [ ] DOCX export filling the user's base-CV template
- [ ] Version every tailoring run as a new `TailoredDocument`

## Phase 4 — Aggregation

### M9 — Aggregation: structured sources ⬜
- [ ] Fetchers: RemoteOK, Arbeitnow, Greenhouse, Lever, We Work Remotely
- [ ] Shared `RawListing` pool — one fetch per source per run
- [ ] Per-user preference filter → Wishlist cards, with dedup by URL / fuzzy company+title
- [ ] `/api/aggregate` wired to Vercel Cron; `JobSource` enabled/last_run_at tracked

### M10 — Aggregation: scrape sources ⬜
- [ ] Fetch+Claude-extraction path with a fixed output schema
- [ ] Ship hiring.cafe, Wellfound, ReliefWeb (LinkedIn only if reopened)
- [ ] Route scraped listings through the same shared-pool + filter + dedup pipeline

## Phase 5 — Polish & ops

### M11 — Board polish ⬜
- [ ] Drag-and-drop stage columns via `@dnd-kit`
- [ ] Card design: score badge, location, source, days-in-stage
- [ ] Empty-column and empty-board states

### M12 — Dashboard & export ⬜
- [ ] Stage counts, average fit score, applications-per-week trend
- [ ] Wishlist → Applied → Interview → Offer funnel
- [ ] CSV export of the table view respecting active filters

### M13 — Import ⬜
- [ ] CSV import mapped to table columns
- [ ] Column-mapping step for the legacy xlsx/to-apply CSV shapes
- [ ] Row-level validation + error reporting

---

## Setup decisions made while building

- **Package manager**: npm (already present on this machine; no need to introduce pnpm/yarn).
- **Local database**: Postgres via Docker Compose (`docker-compose.yml`) for dev — no external account needed to start. Point `DATABASE_URL` at Neon (or similar) for production later.
- **Product name**: Waypoint, taken from the design handoff.
- **UI**: Tailwind + shadcn/ui, themed to the handed-off tokens (`--bg #faf6f0`, `--accent #d97706`, Lora/Manrope, pill radii) rather than shadcn's defaults.
- **Prisma pinned to 6.19.3**, not the `latest`-tagged 8.0.0 release candidate npm resolved by default — that RC's bundled dev tooling (`@prisma/dev`, an embedded Hono server) carried several high-severity advisories, and its CLI version didn't even match the 7.x client it pulled in.
- **Auth**: NextAuth v5 (beta) with the Credentials provider, JWT session strategy (Credentials doesn't support database sessions in v5, so no `@auth/prisma-adapter` is used).
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (same behavior, new name/export) — the auth guard lives at `src/proxy.ts`, not `src/middleware.ts`. Worth remembering since most existing docs/tutorials still say `middleware.ts`.
- **Dev server preview**: `.claude/launch.json` config lives at the user's home directory (`~/.claude/launch.json`), not the project root — the Browser-pane tool resolves it from there.
- **Local blob storage**: MinIO added to `docker-compose.yml` (S3-compatible) as the dev stand-in for Vercel Blob/R2 — console at `localhost:9001` (waypoint / waypoint-dev-secret), bucket `waypoint-documents` auto-created by the one-shot `blob-init` service. Not wired into the app yet — that's Milestone 5.

See the full recommended defaults for the spec's open questions (§11) in the earlier build-plan artifact — those apply once we reach the milestones they affect (M9/M10 cadence and source list, M7 usage caps, etc.).
