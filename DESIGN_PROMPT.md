# Design brief — Job Tracker Web App

## What it is

A multi-user web app for job hunters that replaces a spreadsheet-based tracking workflow. It aggregates job listings from job boards, scores each one against the user's resume with an LLM, tracks every job through a pipeline from "found it" to an outcome, and drafts a tailored CV/cover letter on request. Full functional spec: see `SPEC.md` in this folder.

## Tone & style

Job hunting is stressful and often demoralizing — this tool should feel calm, organized, and quietly encouraging rather than corporate or clinical. Clean, modern SaaS aesthetic; generous whitespace; a sense of "control and progress" rather than a wall of data. Desktop-first (responsive web, no native mobile app), so design for a typical laptop/desktop viewport as the primary target.

## Design a canvas covering these screens

1. **Login / Sign up** — simple email+password auth, clean and minimal, nothing fancy.
2. **Pipeline board (main/default view after login)** — a kanban board with columns: Wishlist, Applied, Under Review, Interview, Offer, Rejected, Withdrawn. Each card shows job title, company, a color-coded fit-score badge (Stretch/Fair/Good/Strong), location, source (aggregated vs. manually added), and days-in-stage. Include a top bar with quick-add, a table/board view toggle, and basic filters.
3. **Table view** — the spreadsheet-equivalent: a dense, sortable/filterable data table with columns for date applied, job title, company, posting link, location, fit score, status, CV used, cover letter, interview prep notes, and notes/next steps. Include column sorting affordance, a search box, and filter controls (stage, fit-score range, source, date range).
4. **Application detail view** — the full record for one job: core fields (title, company, URL, location, dates, stage), a fit-score block (score, label, strengths list, gaps list — all editable), a documents section (CV used / cover letter, upload or AI-generated), an in-app CV/cover-letter tailoring editor with a "Tailor with AI" action, an interview-prep notes field, a timestamped notes/next-steps log (newest on top), and a stage-history timeline.
5. **Profile & preferences (setup)** — resume upload with an auto-extracted structured breakdown (summary, skills, experience, education) the user can edit, plus a preferences form (target roles, locations/remote, compensation floor, must-haves, dealbreakers, nice-to-haves).
6. **Settings** — account info; an LLM API key section showing "Using [App Name]'s Claude key by default" with an option to add a personal API key for Claude or another provider (masked key display like `sk-...ab12`, an active/inactive toggle, remove action); an AI usage panel showing calls made and tokens consumed this period, broken down by action type (scoring/tailoring/extraction) and by which key served each call; a data export action.
7. **Dashboard** — the AI usage panel (calls/tokens by action type and key source) front and center, plus lighter-weight application stats below it: counts per pipeline stage, average fit score, an applications-per-week trend, and a simple funnel (Wishlist → Applied → Interview → Offer).

## Key UI moments to get right

- The fit-score badge is the single most important piece of at-a-glance information on both the board and the table — make its color-coding (Stretch/Fair/Good/Strong) clear and consistent everywhere it appears.
- The board should read as "your pipeline," not a generic kanban tool — the visual language should feel purpose-built for job hunting.
- The AI-tailoring editor (in application detail) is a distinct, focused moment — it should feel like collaborating with an assistant on a draft, not filling out a form.
- The bring-your-own-key setting should make the default (no setup required) obviously the path of least resistance, with the "add your own key" option available but not pushed.

## Not needed

- No native mobile layouts.
- No marketing/landing page — this brief is for the logged-in product only.
