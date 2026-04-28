# Trestle — Full Application Redesign Brief

**Audience:** internal engineering and finance-tech leads standing up the rebuild inside the firm's environment.
**Use:** drop into a chat with an AI build assistant, or share as a kickoff brief with the implementation team.
**Stance:** describes capabilities, contracts, and architectural intent. Does **not** prescribe libraries, file structure, or code shape — those are owner decisions made against the firm's approved stack.

---

## 1. What you are building

A multi-user FP&A planning platform for finance teams in one midsize organization. The platform replaces a constellation of spreadsheets and ad-hoc reconciliation work with a single shared system covering the full annual planning cycle: an Annual Operating Plan (AOP), twelve monthly Rolling Forecasts (RFs), and one Long-Term Plan (LTP) per fiscal year.

The conceptual model is settled. The rebuild's job is to realize it in the firm's environment as a normalized, auditable, real-time system — not to redesign what a plan is.

## 2. Scope and target users

- **Pilot:** one team within the organization. The full target stack must work end-to-end on this team before opening up to anyone else.
- **EOY target:** roughly 40 analyst users across the organization.
- **Future opportunity, explicitly out of current scope:** a few hundred or more users in adjacent teams or the wider firm. Architectural choices should be **sized to support** that expansion without rework, but the work to scale to it is not in the current engagement.
- **Tenant model:** single-organization for now. Multi-tenant SaaS is out of scope.

## 3. Conceptual model (the things to preserve)

### Plan container
- One workspace per fiscal year holds **14 plans**: 1 AOP + 12 monthly RFs + 1 LTP.
- Each plan is a complete, self-contained record of every input module for that scenario.
- Scenario types: **budget**, **forecast**, **actual**, **ltp**.

### Input modules (seven, all share the chartfield grid)
1. **Revenue** — top-line streams, monthly amounts.
2. **Headcount & Compensation** — per-employee record (salary, bonus, benefits, capitalization split, allocation across pillars). The most material and most complex module.
3. **Vendor / OAO** — external spend by parent company / vendor.
4. **Contractors** — non-employee labor (rate × hours, capitalization split).
5. **Travel & Expense** — discretionary expense lines.
6. **Other** — catch-all for C&B and OAO items not captured elsewhere.
7. **Depreciation & Assets** — asset register and depreciation schedule.

### Chartfield grid (the coding spine)
Every line in every module codes against five dimensions: **Business Unit**, **Business Line**, **Market**, **Project**, **Account**. This is the basis for every rollup and pivot.

### Outputs
- **P&L walk** — chartfield × month grid with subtotal hierarchy (gross margin, opex, EBITDA), produced from a single source of truth.
- **Pivot & analytics** — reshape any module data by row dimension; bar / line / bubble / scatter charts; calculated metrics (numerator / denominator); scenario overlays with variance.
- **Scenario compare** — any two plans side-by-side with variance overlay.
- **Export** — clean XLSX and PDF for any view; chart copy-to-clipboard.

## 4. Functional requirements (capabilities, not implementations)

### Spreadsheet-style entry
Every input grid must feel like a spreadsheet. Keyboard navigation (arrow keys, tab, enter), shift-select ranges, multi-cell copy/paste, bulk delete. The shared grid behavior is one component used by every module — design it once.

### Real-time multi-user editing
Multiple users edit the same plan simultaneously. Live presence (who is here, where they are). Concurrent edits to the same cell merge cleanly without losing either user's changes. Optional row / section locking during close periods.

### Reference data
A small set of admin-managed reference sets are shared across plans and across the org:
- Salary bands by role × geo × seniority
- Benefits load by country / entity
- Contractor rate cards
- FX rates (monthly)
- Vendor catalog
- GL chart of accounts
- Expense type taxonomy

These are versioned. Plans pin to a version so a rate change does not retroactively alter a closed plan.

### Calc engine
Each module's calc rules are well-defined and must be exact:
- **HC** — monthly proration on start/end month, bonus posted to a configurable target month, benefits load applied as country % on top of base, capitalization % splits CapEx vs OpEx, allocation % routes cost across functional pillars.
- **Contractors** — rate × hours per month, capitalization split, proration on start / end.
- **D&A** — method-based depreciation schedule over useful life from in-service date.
- **Vendor / T&E / Other** — direct monthly entry, type tagging, aggregate to module total.
- **Revenue** — direct entry, aggregate, derive MRR/ARR for streams that need it.

The P&L walk aggregates all module outputs by chartfield × month, applies the loaded-cost rollups (e.g., bonus + benefits into C&B), and produces the subtotal hierarchy.

### Access control
- **Authentication** via the firm's identity provider (SSO). No standalone passwords.
- **Authorization** scoped two ways: by module (read / write / hidden per role) and by chartfield dimension (a planner sees only their market or business line's rows).
- **Admin tier** (firm-admin and tenant-admin) for managing reference data, publishing templates, and provisioning users.

### Audit
Every change is captured in a persisted, append-only log: who, what field, before, after, when. Surfaceable per row and per plan. Retained per the firm's data-retention policy.

### Integrations
Inbound and outbound connections to the firm's systems of record. Each integration is treated as a versioned, configurable module — not bespoke code:
- **Inbound:** ERP actuals, HR (employee master), GL chart of accounts, cost-center hierarchy.
- **Outbound:** EPM / consolidation systems (Oracle EPM, Anaplan, Workday Adaptive — whichever the firm uses), BI dashboards, data lake snapshots, XLSX / PDF.
- **Connector contract:** schema map (Trestle field → target field), chartfield crosswalk, sync mode (incremental + full-load), retry with idempotency, reconciliation report (counts / sums / deltas). Onboarding a new firm or system means **configuring** a connector, not writing one.

## 5. Non-functional requirements

- **Correctness over throughput.** Calc accuracy is the headline trust measure. Golden plan fixtures reconcile to the cent. Any unintended drift fails the build.
- **No lost edits.** Concurrent saves must merge, not overwrite.
- **Auditability.** Every change traceable. Every published reference set traceable to its version.
- **Reliability targets** appropriate for a finance system: defined save / read / broadcast latency targets and an error budget. Quantify them; don't leave them anecdotal.
- **Security posture aligned with the firm's internal standards.** Data residency, encryption in transit and at rest, secrets management, dependency scanning, periodic external review.
- **Scalability headroom for a few hundred users** designed in, not built. The architecture should let a future expansion happen via configuration and capacity, not refactor.

## 6. Architectural intent (direction, not implementation)

These are the directional choices the platform should embody. Specific tools, libraries, and patterns are owner decisions against the firm's approved stack.

- **Data model:** normalized records per module (e.g., per-employee, per-vendor-row, per-asset), not a single plan-blob. Row-level updates with versioning. Shared row-shape modules (Vendor / T&E / Other) collapse onto one underlying entity with a type discriminator.
- **Reference data:** versioned, addressable, plan-bindable.
- **Concurrent editing:** server-authoritative cell-level merge with deterministic conflict resolution. Broadcast across users via a pub/sub layer that scales horizontally.
- **Aggregation:** server-side. Avoid recomputing P&L in every client. Cached/materialized at chartfield rollup level; invalidated by row-level changes.
- **Access enforcement:** server-side and policy-based (data-tier scoping, not just UI gating).
- **Integrations:** versioned connector modules with explicit schemas and reconciliation contracts. Schema changes are versioned events, not silent.
- **Audit:** append-only log, partitioned for retention; queryable per row, per plan, per user.
- **Observability:** per-tenant SLO dashboards, structured logs, error budgets surfaced to the team.

## 7. Constraints

- **Internal firm environment.** All infrastructure, services, and dependencies must be on the firm's approved list. No public-cloud SaaS unless explicitly sanctioned. Data residency and access controls follow firm policy.
- **No reuse of the existing Trestle codebase.** Treat it as a reference for the conceptual model and the calc rules. Implementations are fresh.
- **Identity, ERP, HR, EPM, BI, and data-lake systems** are the firm's existing tooling. Connectors target what the firm already runs.
- **Stack alignment.** Choose the firm's standard application stack where one exists; document the choice and rationale where one does not.

## 8. Explicit non-goals

- Multi-tenant SaaS hosting.
- Public-internet exposure.
- Pre-building for a 1,000-user firm-wide rollout (architect for it; do not build the operational footprint for it).
- Reimplementing the conceptual model. Plans are still 14-per-year, modules are still the seven listed, chartfields are still the five listed.

## 9. Phasing and gates

### Phase 1 — Pilot (1 team, in-org)
Goal: full target stack working end-to-end on one controlled team. Nothing punted to "later".

Required before exit:
- SSO live with corporate identity.
- Module-level and dimension-level access controls enforced server-side.
- Cell-level real-time merge — proven under concurrent load with no lost edits.
- Persisted audit log.
- Centralized reference data (rate cards, benefits, salary bands, FX, vendor catalog) in use.
- At least one inbound and one outbound integration validated end-to-end against the real firm systems.
- Automated regression suite covering calc accuracy, save reliability, and integration round-trips — green.

Exit criteria: a full close cycle run on the platform with zero data loss, validated integration round-trips, and a green regression suite.

### Phase 2 — Org rollout to ~40 analyst users by EOY
Cohorts open after each gate is green:
- **Pilot → first additional team:** reference data published org-wide, access scoping verified, save / merge stable under double the pilot load.
- **~20 users:** concurrent-edit stress, integration freshness checks, audit log completeness, save SLO.
- **~40 users (EOY target):** capacity headroom plan, documented runbooks, close-cycle dry run with the full org cohort.

### Beyond current scope
Few-hundred-plus users in adjacent teams or the broader firm. Sized into the design (normalized data, dimension-scoped access, versioned connectors, horizontal pub/sub fan-out). Not built in current scope.

## 10. Success criteria

- Pilot team runs a full close cycle on the platform with **zero data loss** and **green automated regression** on calc accuracy and integration round-trips.
- **~100 hours saved per analyst, annually**, once Phase 1 capabilities are live across the org. Roughly 60% of that sits in the AOP cycle; roughly 70% is driven by streamlined load and integration tools (overlapping cuts of the same 100 hours).
- **~40 analyst users live by EOY** in the target organization.
- Audit log meets internal-review requirements without manual reconstruction.
- Onboarding a new firm / new EPM system is a **configuration exercise** against the connector framework, not a code change.

## 11. What I want from the build team / agent

- **Decisions documented with rationale.** Each major architectural choice (data store, sync mechanism, identity integration, observability stack) gets a short rationale and trade-offs note.
- **Vertical slices.** Build through a slice — one module end-to-end (suggest HC, since it's the most complex; if HC is too risky as the first slice, propose an alternative and explain) — before broadening. The slice exercises calc, persistence, real-time, access, and at least one integration.
- **Test harness early.** Synthetic tenant generator, golden-plan fixtures, calc snapshot tests in CI from the first sprint.
- **Reference checklist:** every Phase 1 exit-criteria item maps to a tracked work item with an owner.
- **Surface ambiguity.** Where this brief is silent (specific reliability targets, specific connector versions, specific rate-card schema), propose a default and flag it — do not invent silently.

---

*Companion artifacts:*
- `trestle-brief-executive.docx` — finance/business framing of the same scope.
- `trestle-brief-technical.docx` — submodule inventory and deep dives.
- `trestle-brief-infographic.pdf` — single-page visual.
- `infographic-scaling.html` and `infographic-system-brief.html` — interactive structure references.
