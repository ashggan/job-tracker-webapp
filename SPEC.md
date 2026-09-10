# Job Tracker Web App — Spec

## 1. Background

Job applications are currently tracked through a folder-per-application workflow (the "proficiently" skill set) that produces `Job_Application_Tracker.xlsx` (an Active sheet and an Archive sheet) via `build_tracker.py`, plus a separate `to_apply_to_import.csv` "jobs to apply to" list that isn't merged into the tracker until an application is actually submitted. Interview prep notes, tailored CVs, and cover letters live as loose files inside each job's folder, and fit-scoring/CV-tailoring today happens as a manual, prompted AI workflow outside any single tool.

This spec defines a standalone multi-user web application — internally named **JOTA** — that replaces all of that with one tool: it aggregates new listings from the job boards each user personally trusts, scores each one against that user's resume with an LLM, tracks the job through a pipeline from wishlist to outcome, and drafts a tailored CV (and cover letter) on request — with documents and notes attached directly to the application record instead of scattered across a folder tree.

In one line: **an elevated spreadsheet for tracking job applications, with AI support.** It is a personal tool, not a platform or a recruiting product — every user's sources, AI key, resume, and applications are theirs alone, with nothing shared or visible across accounts.

No existing data is migrated as part of this build; the app launches empty. A CSV/JSON import feature is included so data can be brought in later (see 5.9).

## 2. Goals

- One place to track every job from "found it" to "offer/rejected," replacing the xlsx tracker and the separate to-apply CSV.
- Make the tool feel personal, not platform-y: each user picks their own job-board sources, brings their own AI key if they want to, and never sees or shares data with anyone else.
- Automatically aggregate new job listings from the sources each user has chosen — a supported preset list, plus any custom source they add themselves — filter them against that user's preferences, and drop matches into their Wishlist.
- Score each listing's fit against the user's resume using an LLM — numeric score, label, strengths, and gaps — automatically on ingestion, with manual re-score and manual override always available.
- Draft a tailored CV (and optionally a cover letter) for a given application using an LLM: editable in-app, exportable as a .docx or PDF.
- A kanban-style pipeline board as the primary working view, plus a sortable/filterable table view (the spreadsheet-equivalent view).
- Usable by more than one person, each with their own private resume, preferences, sources, and set of applications.
- Every AI feature runs on the user's own API key — for Claude or another LLM provider. The app never provides a shared/default key, so there's no shared billing exposure for the app owner; a user simply can't use AI features until they've added their own key.

## 3. Non-goals (out of scope for v1)

- The app does not submit applications on the user's behalf — aggregation, scoring, and tailoring are automated; clicking "Apply" on the employer's site is still a manual, human step.
- No calendar/email integration for interview scheduling.
- No team/shared-workspace features (each user's data is private to them; no collaborators on one job).
- No native mobile app — responsive web only.
- No autonomous multi-step browsing agent — listing extraction is a single fetch-then-ask-Claude-to-structure-it pass, not an agent that clicks around a site.
- Not a recruiting or applicant-tracking product for employers, and not a platform with any cross-user job discovery — this is a personal tool for the job seeker only, full stop.

## 4. Users & Access

- Multi-user with accounts. Email + password (or a hosted-auth provider — see 8) sign-up/login.
- Each user sees and edits only their own profile, preferences, and applications. No cross-user visibility, no admin dashboard in v1 beyond basic AI-usage accounting (see 5.8).
- Standard flows required: sign up, log in, log out, in-app "forgot password" reset. Email verification is optional for v1 (open question, §11).

## 5. Features

### 5.1 Profile & preferences (prerequisite for scoring/tailoring/aggregation filtering)

Before AI features are useful, each user fills in:

- **Resume**: uploaded base CV file (kept as the tailoring template) plus a structured breakdown (contact info, summary, skills, experience entries, education) that Claude uses as scoring/tailoring input. Structured fields can be auto-extracted from the uploaded file on first upload and then hand-edited.
- **Preferences**: target roles, locations/remote requirements, compensation floor, must-haves, dealbreakers, nice-to-haves — the same shape as today's `preferences.md`, used both for aggregation filtering and as context for scoring.

### 5.2 Job aggregation — from the sources each user trusts

Sources are **per-user, not fixed by the app.** Every user manages their own list, in a new "Sources" settings screen (§7 `/sources`):

- **Preset sources**: a supported list the app knows how to fetch, which a user toggles on/off for their own account — a mix of structured API/feed sources (RemoteOK API, Arbeitnow API, Greenhouse and Lever job-board APIs per company slug, We Work Remotely RSS/JSON feed) and scrape sources for boards with no API (fetch the page, pass the extracted text to an LLM with an extraction prompt that returns structured fields: title, company, location, salary, URL, description). Based on the boards already in use (`to_apply_to_import.csv`), the initial preset list includes hiring.cafe, Wellfound, LinkedIn public job search, and ReliefWeb alongside the API sources — confirm/adjust in §11 (LinkedIn carries the highest ToS/detection risk of the group).
- **Custom sources**: a user can add a job board of their own by pasting its URL. This always runs as a scrape-plus-LLM-extraction source (5.8) scoped privately to that one user — see the risk note in §10 on why an arbitrary user-supplied URL is treated differently from a vetted preset.
- **Shared fetch for shared sources, per-user filtering**: a *preset* source enabled by more than one user is still fetched once per run into a shared `RawListing` pool, not once per user — cost and load don't multiply with adoption. A *custom* source is fetched only for the one user who added it. Either way, each user's own preference filters decide what becomes a Wishlist card for them, followed by that user's fit-scoring pass (5.3).
- **Dedup**: match incoming listings against a user's existing applications by canonical URL, falling back to a fuzzy company+title match, before creating a new card.
- **Scheduling**: a scheduled job (e.g. Vercel Cron) triggers the aggregation run at a configured interval — see §11 for cadence.
- **Manual add**: pasting a URL or a job description directly always remains available for anything aggregation misses — this is separate from adding a recurring custom *source* above (a one-off job vs. a board to watch going forward).

### 5.3 AI fit scoring

- **Trigger**: automatic when a listing is added to a user's Wishlist via aggregation; on-demand "Re-score" button for manually-added jobs or after a resume/preferences edit.
- **Input**: job posting text + the user's structured resume + preferences.
- **Output** (stored on the application, always user-editable): numeric score 0–10, a label (Stretch / Fair / Good / Strong), a strengths list, and a gaps list — matching the shape of today's manual fit-scoring step.
- Runs on the user's own API key (5.8) — unavailable until they've added one.

### 5.4 AI CV tailoring

- **Trigger**: "Tailor CV" button on an application's detail view; optional "Draft cover letter" alongside it.
- **Input**: the user's base resume (structured) + the job posting text.
- **Output**: a tailored draft (summary, skills, reordered/reworded experience bullets) shown in an in-app editor. The user edits inline, then exports as a .docx or PDF built from their uploaded base-CV template (see §11 on template handling).
- Tailoring attempts are versioned per application (re-running doesn't destroy the previous draft) — see `TailoredDocument` in §6.
- Runs on the user's own API key (5.8) — unavailable until they've added one.

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

- **No shared/default key.** The app never provides its own Claude key — there is no shared billing key, no app-owner-funded usage, and no per-user usage cap to manage. Every AI feature is inert until the user adds their own key.
- **Bring your own key**: in Settings, a user adds their own API key for Claude or another supported LLM provider (initial list to confirm in §11). Once added and marked active, that user's scoring/tailoring/extraction calls route through their own key and provider.
- Keys are stored encrypted at rest (see §8) and are never displayed again in full after entry — only a masked preview (e.g. `sk-...ab12`) — with a "Remove key" action.
- A user may hold saved keys for more than one provider, but only one is "active" at a time; switching is a Settings toggle, not a per-call choice.
- **Key validation**: a submitted key is validated with the provider at entry (a cheap, no-cost call) rather than accepted blindly — a bad or expired key is rejected immediately with a clear error, instead of failing silently on first real use.
- **Usage accounting**: every AI call is logged (user, action type, provider, timestamp, token/cost estimate) for that user's own visibility (5.10) — since every call runs on the user's own key, this is accounting only, with no cap to enforce.

### 5.9 Import / export

- CSV export of the current table view (respecting active filters), for backup or sharing — required for v1.
- CSV import mapped to the table columns in 5.6, for bringing in the existing `Job_Application_Tracker.xlsx` (exported to CSV first) and `to_apply_to_import.csv` later, or for bulk-adding leads from outside the aggregator. Fast-follow, not required to launch.

### 5.10 Dashboard / stats

A summary view built around two parts:

- **AI usage panel** (required for v1; lives on `/settings` per §7, not this page): calls made and estimated tokens consumed this period, broken down by action type (scoring / tailoring / extraction) — pulled from `AIUsageLog` (§6). Since every call runs on the user's own key, this is spend visibility only, not a cap-tracking tool.
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

JobSource                          -- sources are per-user (5.2), not a fixed app-wide list
  id, name, type (api | scrape), scope (enum: preset | custom), owner_user_id (FK, nullable — set only for a custom source added by one user; null for a preset), config JSON (endpoint / company slug / URL pattern), enabled, last_run_at

UserJobSource                      -- which sources a user has turned on
  id, user_id (FK), job_source_id (FK), enabled, added_at

RawListing                        -- shared pool for preset sources (fetched once regardless of how many users enabled them); custom sources populate it too, just for their one owning user
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

AIUsageLog                         -- accounting / usage panel (every call runs on the user's own key — no shared/default key)
  id, user_id (FK), action (score | tailor_cv | tailor_cover_letter | extract_listing | extract_resume), provider, tokens_used, cost_estimate, created_at
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
| `/sources` | Manage job sources — toggle preset boards on/off, add/remove a custom board by URL |
| `/settings` | Account settings, LLM API key management (bring your own key — Claude or another provider; required for any AI feature), AI usage & token consumption this period, data export |

API: REST or Next.js server actions under `/api/applications`, `/api/applications/[id]/documents`, `/api/applications/[id]/notes`, `/api/applications/[id]/score`, `/api/applications/[id]/tailor`, `/api/sources` (list presets, toggle, add/remove a custom source), `/api/aggregate` (cron-triggered), `/api/settings/api-keys` (add/remove/activate a provider key), `/api/export`, `/api/import`.

## 8. Tech stack

- **Framework**: Next.js (App Router), TypeScript, React.
- **Database**: Postgres via Prisma ORM. Hosted option: Neon, Supabase, or Vercel Postgres.
- **Auth**: NextAuth.js (Auth.js) with email/password credentials provider, extensible to OAuth (Google/GitHub) later.
- **AI**: Anthropic API (Claude) via the official SDK as the default provider, called server-side only — keys are never exposed to the browser. Used for fit scoring, CV/cover-letter tailoring, and structuring scraped listing text.
- **AI provider abstraction**: a thin server-side adapter interface wrapping each supported provider SDK (Anthropic by default; OpenAI and/or Google as optional bring-your-own-key providers — see §11) behind one call shape, so scoring/tailoring/extraction code doesn't need to know which provider is active for a given user.
- **API key storage**: user-supplied keys (`UserApiKey`, §6) are encrypted at rest — e.g. AES-256-GCM with a server-held encryption key via Node's built-in `crypto`, or a secrets-manager-backed KMS — and decrypted only at call time. There is no app-owner default key held anywhere.
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
6. **AI provider & key management** — Settings UI to add/remove/activate a personal LLM key per provider (bring-your-own-key only, no shared default), key validation at entry, encrypted storage, and the provider-agnostic call layer (5.8). Built before the AI features below so they have a routing layer to call into from the start.
7. **AI fit scoring** — Claude scoring call, auto-run on ingestion, manual re-score, usage logging, and the AI usage panel on Settings (5.8, 5.10).
8. **AI CV tailoring** — drafting call, in-app editor, DOCX/PDF export from the user's base template, versioned drafts.
9. **Source management** — the `/sources` settings screen: preset list with on/off toggles, add/remove a custom source by URL, `JobSource`/`UserJobSource` data model.
10. **Job aggregation, structured sources** — RemoteOK/Arbeitnow/Greenhouse/Lever/We Work Remotely fetchers, shared `RawListing` pool for presets, per-user preference filtering, dedup, scheduling.
11. **Job aggregation, scrape + custom sources** — fetch+extraction path for preset scrape boards (hiring.cafe/Wellfound/LinkedIn/ReliefWeb, or the confirmed list from §11) and for any user-added custom source URL.
12. **Board polish** — drag-and-drop between stages, card design, days-in-stage indicator.
13. **Dashboard & export** — application stats view (funnel, trends), CSV export.
14. **Import** — CSV import mapped to the schema (fast-follow, not required to launch).

## 10. Cost & risk notes

- Every scoring call, tailoring call, and scrape-source extraction pass runs on the user's own key (5.8) — there is no shared/default key, so the app owner never bears AI usage cost. The aggregation design still fetches each *preset* source once per run rather than once per user, to avoid multiplying fetch/scrape load by user count, even though the LLM extraction step within that pipeline bills to whichever user's key ran it.
- Scraping (as opposed to using an API/feed) carries a standing maintenance cost — sites change layout and can block or rate-limit fetches — and, for a site like LinkedIn, a ToS risk independent of the technical cost.
- Custom user-added sources (5.2) are a different risk shape than presets: a preset list is vetted once by the app owner, but a custom source is an arbitrary URL a user supplies, fetched and handed to an LLM for extraction. Worth deciding safeguards before launch — e.g. blocking obviously unsafe targets (internal/private network addresses), a per-user cap on custom sources, and being clear that a custom source's reliability (layout changes, logins, paywalls) is the user's own risk to manage, unlike a preset.

## 11. Open questions

- Confirm the *preset* scrape-source list (proposed: hiring.cafe, Wellfound, LinkedIn public search, ReliefWeb, based on `to_apply_to_import.csv`) — in particular, is LinkedIn's ToS/detection risk acceptable, or should it be dropped from v1? (Users can still add it themselves as a custom source regardless.)
- Aggregation cadence (hourly? a few times a day? daily?) — and whether it's the same cadence for every user, or configurable per source/user.
- Any limit on how many custom sources one user can add, and how a custom source's URL is validated before the app starts fetching it on a schedule?
- Should listings that clearly fail a user's dealbreakers (on-site, below salary floor) be silently dropped during filtering, or still surfaced in a "not a match" list for visibility?
- Base CV template handling: one uploaded template per user reused for all tailored DOCX output, or support multiple templates (e.g. one per role type)?
- Email verification required at signup, or optional for v1?
- OAuth login (Google) wanted alongside email/password, or password-only for v1?
- Attachment limits: file types and max size for uploaded resumes/documents (e.g. PDF/DOCX only, 10MB cap)?
- Preferred hosting: default recommendation is Vercel + Neon (Postgres) + Vercel Blob + Vercel Cron — confirm before scaffolding, or specify an alternative.
- Which LLM providers to support for bring-your-own-key beyond Claude — OpenAI and Google Gemini are the obvious next two; confirm the initial list.
- ~~How should a submitted API key be validated at entry~~ — resolved: validated with the provider at entry (§5.8), not deferred to first real use.
- Do the scoring rubric, tailoring instructions, and listing-extraction schema need per-provider prompt tuning, or is one prompt set assumed to work across providers at v1?
