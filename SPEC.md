# Job Tracker Web App — Spec

## 1. Background

Job applications are currently tracked through a folder-per-application workflow (the "proficiently" skill set) that produces `Job_Application_Tracker.xlsx` (an Active sheet and an Archive sheet) via `build_tracker.py`, plus a separate `to_apply_to_import.csv` "jobs to apply to" list that isn't merged into the tracker until an application is actually submitted. Interview prep notes, tailored CVs, and cover letters live as loose files inside each job's folder, and fit-scoring/CV-tailoring today happens as a manual, prompted AI workflow outside any single tool.

This spec defines a standalone multi-user web application that replaces all of that with one tool: it aggregates new listings from job boards, scores each one against the user's resume with Claude, tracks the job through a pipeline from wishlist to outcome, and drafts a tailored CV (and cover letter) on request — with documents and notes attached directly to the application record instead of scattered across a folder tree.

No existing data is migrated as part of this build; the app launches empty. A CSV/JSON import feature is included so data can be brought in later (see 5.9).

## 2. Goals

- One place to track every job from "found it" to "offer/rejected," replacing the xlsx tracker and the separate to-apply CSV.
- Automatically aggregate new job listings from a configured set of job boards/feeds, filter them against each user's preferences, and drop matches into that user's Wishlist.
- Score each listing's fit against the user's resume using Claude — numeric score, label, strengths, and gaps — automatically on ingestion, with manual re-score and manual override always available.
- Draft a tailored CV (and optionally a cover letter) for a given application using Claude: editable in-app, exportable as a .docx or PDF.
- A kanban-style pipeline board as the primary working view, plus a sortable/filterable table view (the spreadsheet-equivalent view).
- Usable by more than one person, each with their own private resume, preferences, and set of applications.
- Every AI feature defaults to a Claude key provided by the app, with the option for each user to plug in their own API key — for Claude or another LLM provider — to use instead.

## 3. Non-goals (out of scope for v1)

- The app does not submit applications on the user's behalf — aggregation, scoring, and tailoring are automated; clicking "Apply" on the employer's site is still a manual, human step.
- No calendar/email integration for interview scheduling.
- No team/shared-workspace features (each user's data is private to them; no collaborators on one job).
- No native mobile app — responsive web only.
- No autonomous multi-step browsing agent — listing extraction is a single fetch-then-ask-Claude-to-structure-it pass, not an agent that clicks around a site.

## 4. Users & Access

- Multi-user with accounts. Email + password (or a hosted-auth provider — see 8) sign-up/login.
- Each user sees and edits only their own profile, preferences, and applications. No cross-user visibility, no admin dashboard in v1 beyond basic AI-usage accounting (see 5.8).
- Standard flows required: sign up, log in, log out, in-app "forgot password" reset. Email verification is optional for v1 (open question, §11).

## 5. Features

### 5.1 Profile & preferences (prerequisite for scoring/tailoring/aggregation filtering)

Before AI features are useful, each user fills in:

- **Resume**: uploaded base CV file (kept as the tailoring template) plus a structured breakdown (contact info, summary, skills, experience entries, education) that Claude uses as scoring/tailoring input. Structured fields can be auto-extracted from the uploaded file on first upload and then hand-edited.
- **Preferences**: target roles, locations/remote requirements, compensation floor, must-haves, dealbreakers, nice-to-haves — the same shape as today's `preferences.md`, used both for aggregation filtering and as context for scoring.

### 5.2 Job aggregation

Pulls new listings on a schedule and proposes matches to each user's Wishlist, API-first with scraping as a named fallback:

- **Structured sources (API/feed)**: RemoteOK API, Arbeitnow API, Greenhouse job-board API and Lever job-board API (per company slugs the user or app tracks), We Work Remotely RSS/JSON feed. Preferred wherever a source offers one — reliable, no ToS risk, cheap to run.
- **Scrape sources**: for boards with no API, fetch the page and pass the extracted text to Claude with an extraction prompt that returns structured fields (title, company, location, salary, URL, description). Based on the boards already in use (`to_apply_to_import.csv`), the initial scrape list is hiring.cafe, Wellfound, LinkedIn public job search, and ReliefWeb — confirm/adjust in §11 (LinkedIn carries the highest ToS/detection risk of the four).
- **Shared fetch, per-user filtering**: each source is fetched once per run into a shared `RawListing` pool (not once per user), then each user's preference filters are applied to decide what becomes a Wishlist card for them, followed by that user's fit-scoring pass (5.3).
- **Dedup**: match incoming listings against a user's existing applications by canonical URL, falling back to a fuzzy company+title match, before creating a new card.
- **Scheduling**: a scheduled job (e.g. Vercel Cron) triggers the aggregation run at a configured interval — see §11 for cadence.
- **Manual add**: pasting a URL or a job description directly always remains available for anything aggregation misses.

### 5.3 AI fit scoring

- **Trigger**: automatic when a listing is added to a user's Wishlist via aggregation; on-demand "Re-score" button for manually-added jobs or after a resume/preferences edit.
- **Input**: job posting text + the user's structured resume + preferences.
- **Output** (stored on the application, always user-editable): numeric score 0–10, a label (Stretch / Fair / Good / Strong), a strengths list, and a gaps list — matching the shape of today's manual fit-scoring step.
- Runs on the user's active key — the shared Claude default, or their own key if they've added one (5.8). Subject to the per-user usage cap in 5.8 only when running on the default key.

### 5.4 AI CV tailoring

- **Trigger**: "Tailor CV" button on an application's detail view; optional "Draft cover letter" alongside it.
- **Input**: the user's base resume (structured) + the job posting text.
- **Output**: a tailored draft (summary, skills, reordered/reworded experience bullets) shown in an in-app editor. The user edits inline, then exports as a .docx or PDF built from their uploaded base-CV template (see §11 on template handling).
- Tailoring attempts are versioned per application (re-running doesn't destroy the previous draft) — see `TailoredDocument` in §6.
- Runs on the user's active key — the shared Claude default, or their own key if they've added one (5.8). Subject to the per-user usage cap in 5.8 only when running on the default key.

### 5.5 Pipeline board (primary view)

A kanban board with columns for each stage. Cards can be dragged between columns or moved via a status dropdown (drag-and-drop is a nice-to-have, not required for v1 — a status field with reordering is the floor).

Stages (left to right):

| Stage | Meaning |
|---|---|
| Wishlist | Found (manually or via aggregation), not yet applied |
| Applied | Application submitted |
| Under Review | Acknowledged / in the employer's screening process |
| Interview | At least one interview scheduled or completed |
| Offer | Offer received |
| Rejected | Declined by employer |
| Withdrawn | Candidate withdrew |

A card shows: job title, company, fit score (badge, color-coded by score band), location, source (aggregated vs. manual), and days-in-stage. Clicking a card opens the full application detail view (5.7).

### 5.6 Table view (spreadsheet-equivalent)

A sortable, filterable data table mirroring the current xlsx columns, so the existing mental model still works:

Date Applied · Job Title · Company · Job Posting Link · Location · Fit Score · Status · CV Used · Cover Letter · Interview Prep Notes (link/preview) · Notes / Next Steps

Supports column sort, text search across title/company/notes, and filtering by stage, fit-score range, source, and date range. Includes a toggle to include/exclude Wishlist rows (since those have no "Date Applied" yet).

### 5.7 Application detail view

Full record for one job, editable inline:

- Core fields: job title, company, posting URL, location, date found, date applied, stage, source (aggregated board name, or "manual").
- Fit score block (5.3 output), always overridable.
- Documents: the uploaded/generated CV version used and cover letter, or "not requested" / "not applicable" — see 5.4 and `TailoredDocument`/`Document` in §6.
- Interview prep notes: a rich-text or markdown field per application.
- Notes / next steps: free-text running log, newest entry on top, each entry timestamped (replaces the single long "Notes" cell that today gets appended to as a wall of text).
- Activity/stage history: an auto-logged timeline of stage changes with timestamps (e.g. "Applied → Interview, Sep 12").

### 5.8 AI provider, API keys & usage accounting

Every AI-powered feature (5.3 scoring, 5.4 tailoring, and the extraction pass in 5.2) runs through a single provider-agnostic call layer, so which model actually answers a given call depends on which key is active for that user:

- **Default**: every user starts on the app owner's Claude API key — no setup required.
- **Bring your own key**: in Settings, a user can add their own API key for Claude or another supported LLM provider (initial list to confirm in §11). Once added and marked active, that user's scoring/tailoring/extraction calls route through their own key and provider instead of the shared default.
- Keys are stored encrypted at rest (see §8) and are never displayed again in full after entry — only a masked preview (e.g. `sk-...ab12`) — with a "Remove key" action that reverts the user to the shared default.
- A user may hold saved keys for more than one provider, but only one is "active" at a time; switching is a Settings toggle, not a per-call choice.
- **Usage cap**: since the app owner's key is shared and billed to them, every call made on the default key is logged (user, action type, provider, timestamp, token/cost estimate) and checked against a configurable per-user cap (e.g. N scoring calls and M tailoring calls per day). Calls made on a user's own key are logged the same way for that user's own visibility (5.10) but are not capped, since the cost is already theirs. A user who hits the default-key cap sees a clear message, keeps full access to every non-AI feature (manual entry, board, table, notes), and can lift the cap immediately by adding their own key.

### 5.9 Import / export

- CSV export of the current table view (respecting active filters), for backup or sharing — required for v1.
- CSV import mapped to the table columns in 5.6, for bringing in the existing `Job_Application_Tracker.xlsx` (exported to CSV first) and `to_apply_to_import.csv` later, or for bulk-adding leads from outside the aggregator. Fast-follow, not required to launch.

### 5.10 Dashboard / stats

A summary view built around two parts:

- **AI usage panel** (required for v1, ships alongside the cap in 5.8): calls made and estimated tokens consumed this period, broken down by action type (scoring / tailoring / listing extraction) and by which key served them — shared default vs. the user's own — pulled from `AIUsageLog` (§6). This is what lets a user see exactly what's driving their usage before they hit the default-key cap, and confirm their own key is actually being used once they add one.
- **Application stats** (nice-to-have, not blocking v1): total active applications, counts per stage, average fit score, applications-per-week trend, and a simple funnel (Wishlist → Applied → Interview → Offer) conversion view.

## 6. Data model

```
User
  id, email, password_hash (or auth-provider id), name, created_at

UserProfile
  id, user_id (FK, 1:1)
  resume_file_url                 -- uploaded base CV, doubles as the tailoring template
  resume_structured   JSON        -- contact, summary, skills, experience, education
  preferences_text                -- target roles, comp floor, must-haves, dealbreakers, locations
  updated_at

UserApiKey                         -- bring-your-own LLM keys (5.8)
  id, user_id (FK), provider (enum: anthropic | openai | google | other), encrypted_key, key_preview (masked, e.g. "sk-...ab12"), is_active, created_at

JobSource
  id, name, type (api | scrape), config JSON (endpoint / company slug / URL pattern), enabled, last_run_at

RawListing                        -- shared pool, one row per listing seen, pre per-user filtering
  id, source_id (FK), external_id, title, company, location, url, description_text, posted_at, fetched_at

Application
  id, user_id (FK)
  job_title, company, posting_url, location, source            -- source: aggregated board name, or "manual"
  raw_listing_id (FK, nullable)    -- link back to the aggregation origin, null if manually added
  stage            enum: wishlist | applied | under_review | interview | offer | rejected | withdrawn
  date_found, date_applied         (nullable until applicable)
  fit_score            int 0-10, nullable
  fit_label            enum: stretch | fair | good | strong, nullable
  fit_strengths        text, nullable
  fit_gaps             text, nullable
  fit_generated_at     timestamp, nullable   -- last AI scoring run; null if never scored / manually entered
  interview_prep_notes text (markdown), nullable
  created_at, updated_at

Note                               -- append-only notes/next-steps log
  id, application_id (FK), body, created_at

Document                           -- uploaded attachments (CV actually used, cover letter, offer letter, etc.)
  id, application_id (FK), kind (enum: cv | cover_letter | other), filename, storage_url, uploaded_at

TailoredDocument                   -- AI-drafted CV/cover-letter versions
  id, application_id (FK), kind (cv | cover_letter), version, content_json, docx_url, created_at

StageEvent                         -- auto-logged history
  id, application_id (FK), from_stage, to_stage, changed_at

AIUsageLog                         -- cost control / accounting / dashboard usage panel
  id, user_id (FK), action (score | tailor_cv | tailor_cover_letter | extract_listing), provider, key_source (enum: shared_default | own_key), cost_estimate, created_at
```

## 7. Pages / routes

| Route | Purpose |
|---|---|
| `/login`, `/signup`, `/reset-password` | Auth |
| `/board` | Pipeline board (default landing page after login) |
| `/table` | Table view |
| `/applications/[id]` | Application detail — score, documents, notes, tailoring |
| `/applications/new` | Quick-add form (title, company, link, location — the rest filled in later) |
| `/dashboard` | Stats summary |
| `/profile` | Resume + preferences (required before scoring/tailoring/aggregation filtering work) |
| `/settings` | Account settings, LLM API key management (default Claude, or your own key/provider), AI usage & token consumption this period, data export |

API: REST or Next.js server actions under `/api/applications`, `/api/applications/[id]/documents`, `/api/applications/[id]/notes`, `/api/applications/[id]/score`, `/api/applications/[id]/tailor`, `/api/aggregate` (cron-triggered), `/api/settings/api-keys` (add/remove/activate a provider key), `/api/export`, `/api/import`.

## 8. Tech stack

- **Framework**: Next.js (App Router), TypeScript, React.
- **Database**: Postgres via Prisma ORM. Hosted option: Neon, Supabase, or Vercel Postgres.
- **Auth**: NextAuth.js (Auth.js) with email/password credentials provider, extensible to OAuth (Google/GitHub) later.
- **AI**: Anthropic API (Claude) via the official SDK as the default provider, called server-side only — keys are never exposed to the browser. Used for fit scoring, CV/cover-letter tailoring, and structuring scraped listing text.
- **AI provider abstraction**: a thin server-side adapter interface wrapping each supported provider SDK (Anthropic by default; OpenAI and/or Google as optional bring-your-own-key providers — see §11) behind one call shape, so scoring/tailoring/extraction code doesn't need to know which provider is active for a given user.
- **API key storage**: user-supplied keys (`UserApiKey`, §6) are encrypted at rest — e.g. AES-256-GCM with a server-held encryption key via Node's built-in `crypto`, or a secrets-manager-backed KMS — and decrypted only at call time. The app owner's own default key is held as a server environment variable, never in the database.
- **Job aggregation**: scheduled trigger (Vercel Cron or equivalent) hitting an internal aggregation route; per-source fetchers for the APIs/feeds in 5.2, plus a fetch+Claude-extract path for scrape sources.
- **File storage**: Vercel Blob or an S3-compatible bucket (e.g. Cloudflare R2) for uploaded resumes and generated documents.
- **DOCX / PDF generation**: a template-based library (e.g. `docx` or `docxtemplater`) that fills the user's uploaded base-CV template with the tailored content, plus a DOCX→PDF conversion step (e.g. a headless LibreOffice/`unoconv` pass, or a hosted conversion API) for the PDF export option.
- **UI**: Tailwind CSS + shadcn/ui components; drag-and-drop board via `@dnd-kit` (or a simple status-dropdown fallback if drag-and-drop is deferred).
- **Deployment**: Vercel (pairs naturally with Next.js + Vercel Postgres/Blob/Cron), or any Node host if a non-Vercel Postgres/Blob provider is chosen instead.

## 9. Milestones

1. **Foundation** — Next.js project scaffold, Prisma schema + migrations, auth (signup/login/logout), empty board/table shells.
2. **Core CRUD** — create/edit/delete applications, stage changes, table view with sort/filter/search.
3. **Profile & preferences** — resume upload + structured breakdown, preferences form (blocks meaningful scoring/tailoring/aggregation until filled in).
4. **Detail view** — notes log, stage history timeline, manual fit-score entry.
5. **Documents** — file upload/storage, attach/preview CV and cover letter per application.
6. **AI provider & key management** — Settings UI to add/remove/activate a personal LLM key per provider, encrypted storage, the provider-agnostic call layer, and default-vs-own-key routing (5.8). Built before the AI features below so they have a routing layer to call into from the start.
7. **AI fit scoring** — Claude scoring call, auto-run on ingestion, manual re-score, usage logging/cap, and the AI usage panel on the dashboard (5.8, 5.10).
8. **AI CV tailoring** — drafting call, in-app editor, DOCX/PDF export from the user's base template, versioned drafts.
9. **Job aggregation, structured sources** — RemoteOK/Arbeitnow/Greenhouse/Lever/We Work Remotely fetchers, shared `RawListing` pool, per-user preference filtering, dedup, scheduling.
10. **Job aggregation, scrape sources** — fetch+extraction path for hiring.cafe/Wellfound/LinkedIn/ReliefWeb (or the confirmed list from §11).
11. **Board polish** — drag-and-drop between stages, card design, days-in-stage indicator.
12. **Dashboard & export** — application stats view (funnel, trends), CSV export.
13. **Import** — CSV import mapped to the schema (fast-follow, not required to launch).

## 10. Cost & risk notes

- Every aggregation run, scoring call, and tailoring call made on the shared default key costs tokens billed to the app owner — 5.8's per-user cap exists specifically to bound this, and the aggregation design fetches each source once per run rather than once per user to avoid multiplying scrape/API cost by user count.
- Letting a user bring their own key (5.8) moves that user's scoring/tailoring/extraction cost off the app owner's bill entirely, which is the main lever for keeping total shared-key spend bounded as the user base grows.
- Scraping (as opposed to using an API/feed) carries a standing maintenance cost — sites change layout and can block or rate-limit fetches — and, for a site like LinkedIn, a ToS risk independent of the technical cost.

## 11. Open questions

- Confirm the scrape-source list (proposed: hiring.cafe, Wellfound, LinkedIn public search, ReliefWeb, based on `to_apply_to_import.csv`) — in particular, is LinkedIn's ToS/detection risk acceptable, or should it be dropped from v1?
- Aggregation cadence (hourly? a few times a day? daily?).
- Exact per-user AI usage caps (scoring calls/day, tailoring calls/day) — and what a user sees/can do once they hit one.
- Should listings that clearly fail a user's dealbreakers (on-site, below salary floor) be silently dropped during filtering, or still surfaced in a "not a match" list for visibility?
- Base CV template handling: one uploaded template per user reused for all tailored DOCX output, or support multiple templates (e.g. one per role type)?
- Email verification required at signup, or optional for v1?
- OAuth login (Google) wanted alongside email/password, or password-only for v1?
- Attachment limits: file types and max size for uploaded resumes/documents (e.g. PDF/DOCX only, 10MB cap)?
- Preferred hosting: default recommendation is Vercel + Neon (Postgres) + Vercel Blob + Vercel Cron — confirm before scaffolding, or specify an alternative.
- Which LLM providers to support for bring-your-own-key beyond Claude — OpenAI and Google Gemini are the obvious next two; confirm the initial list.
- How should a submitted API key be validated at entry — a cheap test call to the provider right away, versus accepting it and only discovering a problem on first real use?
- Do the scoring rubric, tailoring instructions, and listing-extraction schema need per-provider prompt tuning, or is one prompt set assumed to work across providers at v1?
