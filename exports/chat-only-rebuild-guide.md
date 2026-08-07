# Trestle — Chat-Only Rebuild Guide (<$20)

**Context:** rebuild for an enterprise Claude chat-only instance where artifacts run client-side with limited network access. Two live-collab variants below depending on what your enterprise artifact runtime allows out to the network. Same conceptual model as the full Trestle brief; scope pared for realism.

---

## 1. The IT question that decides the architecture

Ask enterprise IT one question first:

> *"Can artifacts published in our Claude enterprise instance make outbound WebSocket / fetch calls to a specific external host (e.g., `wss://liveblocks.io`, `wss://firestore.googleapis.com`, or a Google Apps Script web-app URL)?"*

| IT's answer | Path |
|---|---|
| Yes, allowed | **Variant A** — true live collab (cursors, presence, sub-second sync) |
| No, blocked  | **Variant B** — polled shared JSON, near-live (~5-10s latency) |
| Not sure     | Build A first behind a config flag, ship B as fallback loader |

Both variants use **Y.js** as the CRDT so plan data merges cell-by-cell regardless of the sync mechanism underneath.

## 2. Variant A — Network-Allowed (Y.js + Liveblocks)

### Architecture
- Single HTML artifact, all logic inline (Y.js + Liveblocks client from CDN).
- **Y.js CRDT** document per plan.
- **Liveblocks** as the sync backend (Firebase Realtime DB and Supabase Realtime are drop-in alternatives; pick one and document why).
- **Room ID = plan ID.** Every user who opens the artifact with the same room ID joins the same live doc.
- **Presence layer:** live cursors and colored user badges — built into Liveblocks, no extra wiring.
- **Persistence:** Liveblocks Storage keeps the doc alive between sessions. LocalStorage as a hot cache for cold start.
- **Import / export:** JSON out for archival, XLSX for grid views. JSON round-trip is the escape hatch if you ever want to move backends.

### Cost
- Liveblocks free tier: 100 monthly active users, 20 concurrent per room — fits ~40 analysts comfortably.
- Supabase and Firebase free tiers are similarly generous.
- **$0 for pilot; $20-25/mo if you exceed free tier.** Well inside budget.

### Prompt to hand your enterprise Claude (Variant A)

> Build a single self-contained HTML artifact that implements a Trestle-style FP&A planning template with live multi-user collaboration.
>
> **Data model:** support 1 AOP + 1 LTP plan per workspace (skip monthly RFs in v1). Each plan holds seven input modules — Revenue, HC & Compensation, Vendor / OAO, Contractors, T&E, Other, D&A. Every row codes against five chartfield dimensions: Business Unit, Business Line, Market, Project, Account.
>
> **UI:** spreadsheet-style grid on every module (keyboard nav — arrows / tab / enter, shift-click range selection, copy / paste, delete to clear). Tabbed modules. Top-level plan switcher (AOP vs LTP). Side panel for reference data (rate cards, benefits load by country, FX, vendor catalog). Default view for AOP is annual totals with monthly drill-in; for LTP it's Y1–Y5 columns.
>
> **Calc engine (all client-side JS):** monthly proration on start / end, bonus and benefits loading, capitalization split (CapEx vs OpEx), straight-line depreciation over useful life, P&L walk that aggregates every module output to chartfield × month with a subtotal hierarchy (gross margin, opex, EBITDA), pivot layer that reshapes any module by row dimension.
>
> **Live collaboration:** Y.js CRDT bound to Liveblocks (or Firebase Realtime DB / Supabase Realtime — pick one, document your rationale, keep it swappable). Room ID equals plan ID. Presence with live cursors and colored user badges. Auto-save handled by the sync provider. LocalStorage as a hot cache for cold start.
>
> **Persistence and portability:** JSON export / import with schema versioning. XLSX export for any grid. Rolling 3-version backup in localStorage so a bad edit is one click to revert. A change log stamped into the exported JSON (user, field, before, after, timestamp).
>
> **Constraints:** single HTML file, all dependencies inline or from CDN. No external CSS files. Dense finance-analyst layout — commit to one theme and be consistent. Assume artifact CSP allows the WebSocket host you pick.
>
> **v1 non-goals:** monthly RF machinery (1+11, 2+10 etc.), native EPM / ERP connectors, server-side aggregation, row-level access control, native audit persistence beyond the JSON change log.
>
> **Build order:** implement HC & Compensation first (most complex; exercises the full stack), then the P&L walk aggregation, then Revenue and the remaining modules — Vendor / T&E / Other share a row shape so build them once as a shared component with a type discriminator.

## 3. Variant B — Network-Blocked (Y.js + polled shared JSON)

### Architecture
- Single HTML artifact.
- Y.js CRDT per plan (same as Variant A).
- **Sync via HTTP polling** to a shared plan JSON at a public read URL, and writing back through a lightweight endpoint:
  - **Read source:** Google Sheets published range, GitHub raw content, a public S3 object, or an Airtable base — anything with a stable public HTTPS URL.
  - **Write endpoint:** needs *some* credentialed target since public write URLs would be vandal-bait. Practical picks:
    1. **Google Apps Script deployed as a web app** with "anyone" execution — a public POST endpoint scoped to one script, roster validation inside the script. Free. ~5 min to set up.
    2. **Cloudflare Workers or Vercel serverless function** with a shared team token in headers — free tier, ~5 min to set up.
    3. **Airtable free-tier API** with each user holding their own Personal Access Token (PAT) in an artifact settings panel — safer but higher friction.
- **Poll frequency:** 5-10 seconds, adjustable. Y.js merges remote deltas into local state atomically — no lost edits.
- **Optional "leader" mode:** one user's browser owns the writes to reduce contention and API burn.
- **Presence approximation:** each browser posts a "last seen" heartbeat with user name and current-cell coords into the shared JSON. Show a small avatar strip at top with fresh / stale states. No true cursor rendering.

### Cost
- Google Apps Script + free Google Workspace: **$0**.
- Cloudflare Workers or Vercel Free: **$0** at this scale.
- Airtable free tier: **$0** (1,200 records per base — enough for a plan or two).

### Credential caveat
Writes without a server are the awkward part of the chat-only world. Options, in decreasing preference for a small trusted team:
1. **Apps Script web app** with a hardcoded team roster inside the script — free, no per-user setup.
2. **Serverless function** with one shared team token embedded in the artifact prompt — free tier, minimal friction, some token-leak risk.
3. **Per-user PATs** — safest, most friction; each user pastes their own token into the settings panel.

### Prompt to hand your enterprise Claude (Variant B)

> Build a single self-contained HTML artifact that implements a Trestle-style FP&A planning template with async collaboration via polled shared storage.
>
> **Data model, UI, calc engine, persistence, and portability:** same as the Variant A brief.
>
> **Async collaboration:** Y.js CRDT bound to a polling sync layer. The artifact reads a shared plan JSON from a configurable URL (default: a Google Sheets published range or a GitHub raw file) every 5-10 seconds, merges remote deltas into local state, and writes changes back through a configurable endpoint (default: a Google Apps Script web-app URL). Both the read URL and the write endpoint live in a settings panel so each user configures once. Provide a "sync now" button for on-demand pushes.
>
> **Presence approximation:** each browser posts a "last seen" heartbeat with the user's name and their current cell coordinates into the shared JSON. Render a small avatar strip at the top with fresh (green) vs stale (grey) states.
>
> **Conflict resolution:** rely on Y.js merge semantics. On every save, merge remote state before writing back. Show a "syncing" indicator during the round-trip and a "diverged" warning if the write endpoint is unreachable so users know they're editing offline.
>
> **Constraints and v1 non-goals:** same as Variant A, plus these additional non-goals — live cursor rendering (not feasible without a live channel), sub-second sync (polling is 5-10s), and any dependency on outbound WebSocket connections.
>
> **Build order:** same priority as Variant A.

## 4. What neither variant gives you

- **Server-authoritative access control.** Anyone with the artifact link + room ID (A) or the shared JSON URL (B) can read and write the plan.
  - *Mitigations:* separate rooms / URLs per team, keep sensitive plans in restricted Drive folders, and rely on the enterprise identity that already gates access to the artifact itself.
- **True audit trail.** Best you can do is stamp a change log into the plan JSON (user name, field, before, after, timestamp). Users self-identify — no auth check.
- **Native EPM / ERP connectors.** Manual XLSX / CSV import in, XLSX / PDF out.
- **Row-level dimension scoping.** Everyone editing a plan sees everything in that plan. Segregate by splitting plans by BU or market instead.
- **Fully compliant retention / privacy posture** for regulated data. If you're planning regulated numbers, this rig is fine for internal drafts but shouldn't be the system of record.

## 5. If the tool is purely for AOP + LTP (no monthly RFs)

### Module priority — build in this order

1. **HC & Compensation** — largest cost driver and most complex calc. Build first because it exercises everything the platform needs: per-row records, calc rules, CapEx split, allocation across pillars, reference-data lookups. If HC works cleanly end-to-end, everything else is a variation on a proven pattern.
2. **P&L walk aggregation + chartfield grid** — not a module but essential plumbing. Without it, nothing is visible to a finance reader. Ship it as soon as HC produces its first calc output.
3. **Revenue** — small, simple, unblocks a real P&L end-to-end. Also the first "outside HC" module — validates that the module abstraction works.
4. **D&A / Assets** — critical for LTP because multi-year depreciation drives forward P&L. Higher priority in an LTP-heavy tool than in an RF-heavy one. Build it before the remaining cost modules if LTP is a first-class deliverable.
5. **Vendor / OAO** — largest external cost bucket for most orgs. Straightforward row shape.
6. **Contractors, T&E, Other** — variations on the Vendor row shape. Build them once as a shared component with a type discriminator. Contractors is slightly special (rate × hours + CapEx split) — keep it flagged for a small extension of the shared shape.

### AOP + LTP-specific UI shifts (different from an RF-heavy tool)

- **Default view = annual totals**, with month drill-in on demand. Monthly-first UI suits the Rolling Forecast workflow — for AOP planners doing annual budget entry, annual-first is faster.
- **LTP view = Y1-Y5 columns** (not months). Same row shapes, aggregated to year. Growth-rate assumptions applied year-over-year.
- **Scenario compare = AOP vs LTP-Y1** as a first-class view (does the annual budget tie to year 1 of the long-term plan?), plus AOP vs prior-year AOP.
- **Skip the RF machinery entirely** in v1 — the 1+11 / 2+10 / 3+9 labeling and the actuals-split logic are not needed if you're not doing monthly re-forecasts.

### What to defer or skip

- **Real-time actuals ingestion** — annual and LTP tools don't need it. Manual actuals import is fine.
- **Complex bonus timing** — annualize; skip the target-month posting logic.
- **Multi-currency FX overlays** — skip unless the org actually plans in multiple currencies today.
- **Fine-grained approval workflows** — do this with plan-file naming discipline in the shared folder rather than in-artifact state machines.
- **Advanced scenario mixing** (blends, overlays) — v1 does side-by-side compare only; blend logic can come later.

## 6. Formatting norms used across the Trestle exhibits

The infographics, briefs, and companion docs share one design system so they read as a family. Reuse it in the artifact for continuity.

### Palette
- Dark theme (infographics): background `#141B22`; card `#1B2530`; sub-card `#223040`; headings `#F5F6F7`; body `#C5CDD4`; muted `#8A939C`.
- Light theme (Word / print docs): page `#FFFFFF`; card `#fafbfc`; body `#1a1f25`; muted `#6a737c`.
- Accents (consistent across both themes): blue `#3B6EA5` (structural), amber `#C89B5E` (warm / in-flight / caveat), green `#3A7D5E` (target / success / ideal-state), red `#C53030` (danger / limitation).

### Typography
- **Outfit** for display headings, **Inter** for body copy, **JetBrains Mono** for schema names and inline tokens.
- H1 ~22pt; H2 ~14pt uppercase small-caps with bottom border (`border-bottom: 1px solid rgba(...)`); H3 ~12pt amber; H4 ~10pt uppercase small-caps.
- `.subtitle` — 9-10pt muted text placed under H1 / H2 to restate the section thesis in one sentence.
- `.mono` inline for data-shape references (e.g., `state_data`, `employees[]`, `chartfields[]`).

### Card grammar
- 5-10pt rounded corners, 1px border, colored 3pt **left accent** to signal category.
- Accent mapping: blue = structural / accent, amber = warm / current / warn, green = success / target / ideal, red = danger / limitation.
- Every card has: a heading (H3), optional one-line subtitle, body content (paragraph, list, or one of the components below).

### Component vocabulary
- **Tags** (`tag-blue`, `tag-amber`, `tag-green`, `tag-slate`) — small pill labels for categorization inside a card body.
- **Pills** (`pill-now`, `pill-next`, `pill-future`) — status pills for roadmap items and gate criteria.
- **Gauges** — 5-dot fill for scale readings (used for module complexity: `●●●●○` = 4/5).
- **"Similar to" tag list** — replaced the older numeric similarity scale. Reads as tag pills of related module names, or the muted italic phrase "stands alone" when nothing peer-matches.
- **kv grid** — two-column label/value pattern for structured facts (e.g., In / Out / Logic / Depends), label in uppercase small-caps muted, value in body copy.

### Content grammar
- Section 1 is always an exec summary.
- Sections numbered 1-N with one H2 per section.
- Every claim carries either a metric, a data shape, or a labeled roadmap position — no floating adjectives.
- Muted subtitles restate the section thesis in one sentence so a scanner can skip the body if they only need the headline.
- Footnotes reserved for essential technical terms in exec-facing docs (numbered `<sup>N</sup>` linked to a footnotes block at the end).

### Document layout
- Word docs: **narrow 0.5" margins** on all sides so content isn't crushed by whitespace.
- Infographic PDF: **14 × 8.5 landscape**, 0.25" margins, dense grid layout.
- Cards use `page-break-inside: avoid` in printable HTML so a card never splits across pages.

## 7. Areas that required iteration or structured guidance

Notes from the process of producing the existing exhibits — surfaced here so the chat-only rebuild avoids repeating the same friction.

### Gauge framework
- Started with three 5-dot scales per submodule (complexity, similarity to siblings, integration depth).
- User feedback: keep complexity as a scale, but similarity isn't ordinal — it's a *relationship*. Drop integration entirely.
- Final form: complexity dots + "similar to: [tag list]" or "stands alone".
- **Lesson:** numeric scales imply ordering that doesn't fit every dimension. Tag lists carry richer information for non-ordinal facts.

### Scope framing (users, phases, roadmap)
- Original: "5-10 pilot → 100 → 300 → 500-1000" gate sequence.
- Revised: "1-team pilot → ~40 analyst users by EOY (one midsize org)". Broader firm-wide expansion sized in as a *future opportunity*, explicitly out of current scope.
- Multiple passes required to consistently label future work as *sized in* rather than *promised*.
- **Lesson:** pilot-→-firm-wide language over-promises; "current scope with sized headroom" is more honest and easier to plan against.

### Splitting exec vs technical framing
- Initial single Word doc mixed schema names with business framing — worked cleanly for neither audience.
- Split into V1 (executive, plain language, footnotes for essential jargon) and V2 (technical, with data shapes and deep dives).
- Same conceptual model, two lenses.
- **Lesson:** one doc for two audiences almost always fails one audience; the extra split is cheap.

### Content chunking during writes
- Large single-file writes timed out mid-stream on multiple attempts.
- Switched to: write a skeleton with section markers (`<!-- SECTION:NAME -->`), then fill each section with a targeted edit. Each edit is small and reliable, and progress accumulates even if a later edit fails.
- **Lesson for artifact-building sessions:** don't emit a 15,000-token document in one shot. Skeleton + fill.

### Format proliferation vs. discipline
- First-pass deliverables were Word + PDF + PowerPoint. PPTX was dropped on iteration — it was noisy, required manual reformat anyway, and duplicated the Word content.
- Settled on: 2 Word docs (exec, technical) + 1 dense PDF infographic. Each has a distinct purpose and audience.
- **Lesson:** produce fewer formats, each with a distinct job.

### Quantifying value
- Added ROI framing (~100h saved per analyst) mid-project.
- Ambiguous percentages (60% AOP, 70% integration) required explicit confirmation of overlapping-vs-nested interpretation before writing the doc.
- **Lesson:** when translating a founder's shorthand into a document, ask about ambiguity rather than assume — a bad assumption becomes a quoted number.

### Fitting an infographic to one page
- After adding a savings block, the PDF went to 2 pages.
- One-shot fix required proportional tightening across padding, font sizes, gaps, and page margin — no single variable did it.
- Verified with a page-count check (`pypdf`), then re-rendered.
- **Lesson:** "make it fit on one page" is usually a design-system tightening, not a content cut.

### Directional vs prescriptive language in the build prompt
- The redesign prompt intentionally avoids picking libraries, folder structure, or code shape. Instead it describes capabilities, contracts, and architectural intent.
- Multiple passes to strip prescriptive language and re-frame as directional guidance.
- **Lesson:** build prompts read as blueprints when they name libraries; they read as briefs when they name contracts. Briefs age better.

### Orphaned footnotes
- When section 7 was rewritten, footnotes 4 and 5 (SLO, read replicas) were orphaned but still in the footnotes block.
- Caught on review, removed.
- **Lesson:** renumber or prune footnotes any time source text moves. Easy to miss.

### Chat-only-specific lessons for the rebuild
- **Persistence is the biggest gap** vs the code version. Solve it first (localStorage + JSON round-trip), then layer collab on top. Don't ship without persistence — no matter how good the calc engine is, users won't trust a tool that loses work.
- **Pick one theme and commit.** Toggling dark/light in an artifact is fiddly and rarely worth the polish cost.
- **The `settings panel` pattern** (visible top-right, collapses to a gear icon) is the natural home for reference data, sync URLs, PATs, room IDs, and export controls. Design it once, use it everywhere.

---

*Companion artifacts in this folder:*
- `redesign-prompt.md` — full server-side rebuild brief (for the code-capable environment)
- `trestle-brief-executive.docx` and `.html` — finance / business framing
- `trestle-brief-technical.docx` and `.html` — submodule inventory and deep dives
- `trestle-brief-infographic.pdf` and `.html` — single-page visual summary
- `build_exports.py` — regenerates the docx and pdf from the HTML sources
