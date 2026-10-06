# Forge admin dashboard

A read-only staff dashboard for Forge C1, served at `fb.mesaschool.co.in/admin`.
It reads `BYOB_MASTER` and the mentor tracking sheet live through the Sheets API.
It is a sibling of the TV wall (`forge-byob-tv-main`) and shares nothing with it
at runtime. Whether it ends up as its own repo or is moved into the wall's repo
is decided after it is built, so everything lives under `basePath: '/admin'`.

This is Next 16: middleware is `proxy.ts`. Read `node_modules/next/dist/docs/`
before writing Next code.

## Non-negotiable

- **Read-only.** The token is minted with `spreadsheets.readonly`
  (`lib/google.ts`). Nothing here writes to either sheet, ever.
- **Secrets stay server-side.** `lib/sheets.ts` imports `server-only`. The key
  lives in `.env.local` / Vercel env, never in git.
- **`Team Details` is never read.** It holds students' phone numbers and emails.
- **Login is exactly `@mesaschool.co`.** Students are `@forge27.mesaschool.co`
  and must be refused — check the email's suffix, not Google's `hd` claim.
  Everyone signed in sees everything, read-only.
- **Names are printed as the master writes them.** Venture names come from
  `Team Links`, never from the mentor sheet (which has stale ones). No re-casing.
- **`VBC104` and `VBC138` do not exist here** (disbanded into other teams).
  `EXCLUDED_TEAMS` in `lib/parse.ts`.
- **Columns are found by header text, and a missing one throws.** A renamed
  column must stop the page, not print ₹0 everywhere.
- **Milestones / deliverables are not shown**, by decision (nobody fills them in).
- **"Most Profit" equals revenue** until expenses are logged — label it as such.

## Pages

All under `/admin`, all behind the login (`proxy.ts` early, `lib/session.ts` as the authority).

| Route | What |
| --- | --- |
| `/admin` | overview: cohort KPIs, daily revenue, channels, flagged teams, check-ins by mentor, buckets, leaderboards |
| `/admin/teams` | every team, sortable by heading (sort lives in the URL), filterable by mentor |
| `/admin/teams/VBC101` | one team: KPIs, daily and weekly revenue, channels, scores, every check-in |
| `/admin/mentors` | every mentor side by side |
| `/admin/mentors/<slug>` | one mentor's view, with a dropdown to switch mentor |
| `/admin/compare?teams=A,B,C` | up to three teams side by side: running-total chart and a table with the best sales figure marked |

"Flagged" means the mentor marked the team Lagging or Needs Support — nothing
else. Pace is shown but never flags a team (most of the cohort is Behind), and
a missing check-in is shown per mentor rather than per team. "Recent check-in"
means notes in the current mentor week or the one before. Week comparisons use
finished days only.

**How fresh the figures are.** The master's own sync brings team workbooks
in about every 10 minutes; the dashboard reads the sheets live and reuses a
read for 60 seconds (`lib/sheets.ts`); an open page refreshes itself every
60 seconds while its tab is visible (`components/AutoRefresh.tsx`). So a sale
shows in about 10 to 11 minutes and a mentor's note within about a minute.

**Two kinds of week, and every label shows its dates.** Sales weeks ("This
week", the weekly chart) run Monday to Sunday from 31 August. Mentor weeks
(check-ins, Wk1–Wk8) run Tuesday to Monday, because the mentor sheet counts
from 1 September. Never print a bare week number where the dates would differ.

The search box in the top bar (⌘K / Ctrl K) jumps to any team, student or
mentor. Its index (`lib/searchIndex.ts`) is built in the `(dash)` layout and
holds names and links only — never figures or notes, because it is sent to the
browser on every page. There is no spreadsheet export and there are no mentor
logins, both by decision.

Rows are whole-row links (`.row-link` / `.row-main` in `globals.css`): the
row's main link stretches over it, other links in the row sit above the stretch.
On Compare, only sales rows get a ▲ for the best figure — channel mix and
mentor scores (different scales per mentor) are never crowned.

The teams table is the one interactive table: search is local and instant, over
slim rows (`lib/teamRows.ts`) that carry no check-in notes. On a phone, tables
become one card per row and the check-in grids scroll sideways.

## Where the numbers come from

| Figure | Tab |
| --- | --- |
| roster, venture, mentor, members | master `Team Links` |
| revenue, units, orders, AOV, channel split | master `Daily Team Summary` |
| daily revenue | master `Daily Dump`, `Money in (₹)` on Sale rows (the same proof-gated column the summary sums) |
| weekly revenue | master `Weekly — by Team`; current week from `TV_Cohort` `current_open_week` |
| pace, assessment, Wk1–Wk8 notes | each mentor's tab in the mentor sheet, matched by the row's own Team ID |

The pace column counts weeks from 1 September; that is the sheet's decision and
is kept.

## Commands

```bash
npm run dev           # http://localhost:3001/admin
npm run test          # unit tests + snapshot tests (snapshot needs fixtures/)
npm run typecheck
npm run fixtures      # xlsx copies in ../forge-byob-tv-main → fixtures/*.json (gitignored)
npm run check-sheets  # proves the service account can read both sheets live
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
