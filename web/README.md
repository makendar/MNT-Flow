# MNT Flow — Manufacturing, Customer & Cash Intelligence

A B2B SaaS workspace for Indian manufacturers by **MNT Analytics**: one place to track customer orders, resolve payment blockers, manage follow-ups and understand what is preventing cash from coming in.

It answers five questions for every exception: **what is pending, what is blocked and why, who owns it, what happens next and by when, and has it actually been resolved.**

> All companies, people, GSTINs and transactions in the demo are **synthetic** (marked "Demo" in the UI).

---

## Quick start (Windows / macOS / Linux)

Prerequisites: **Node.js 20+** (tested on Node 24.21, npm 11.19). No Docker or paid services needed.

```bash
cd web
npm install
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
# set AUTH_SECRET in .env (32+ chars):
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run setup                 # applies migrations to SQLite and seeds the demo data
npm run dev                   # http://localhost:3000
```

- `/lead-generation`: sales & outreach demo kit (sales/admin roles; templates are copy-only)
- `/mnt-flow`: public product landing page
- `/login`: sign in (one-click demo accounts are shown in development, or when `MNT_DEMO_LOGIN=true`)

npm 11 blocks dependency install scripts by default. `package.json` → `allowScripts` already approves Prisma and esbuild. If `prisma generate` complains, run `npx prisma generate`.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run setup` | `prisma migrate deploy` + seed demo data |
| `npm run db:seed` | Wipe and re-seed the demo organization (dates are relative to today) |
| `npm run db:reset` | Drop the database, re-apply migrations and seed |
| `npm test` | Domain self-checks (calculations, priority, dates) + import-engine dry run against the seeded DB |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |

**Reset demo data in the app:** sign in as the Organization Admin → Settings → Demo → *Reset demo data*.

### Demo accounts (password `Demo@1234` for all)

| User | Role | Lands on |
|---|---|---|
| Arun Prakash · admin@demo-precision.example | Organization Admin | Overview |
| Lakshmi Narayanan · owner@… | Owner / Executive | Overview |
| Priya Raghavan · finance.manager@… | Finance Manager | Overview |
| Karthik Subramanian · finance@… | Finance Executive | Overview |
| Meena Sundaram · sales.manager@… | Sales Manager | Overview |
| Vignesh Kumar · sales@… | Sales Executive | Action Center |
| Ramesh Babu · dispatch@… | Operations / Dispatch | Action Center |
| Divya Krishnan · quality@… | Quality / Issue Resolver | Action Center |
| Suresh Iyer · auditor@… | Read-only Auditor | Overview |
| S. Balaji · portal@kovai-pumps.example | Customer portal (Kovai Pumps) | Portal |
| Naveen Gowda · portal@deccan-valves.example | Customer portal (Deccan Valves) | Portal |

Staff emails use the domain `@demo-precision.example`. Switch roles any time from the user menu → *Switch demo role* (development only).

---

## 10-minute demo script

1. **Overview** (Finance Manager): KPIs, ageing, blockers, collections vs target, customer attention indicators. Click any KPI to drill into the records behind it. Change the reporting date or filters; everything recalculates.
2. **Action Center**: the prioritized queue. Open the Kovai Pumps action: *"High priority because this invoice is 45 days overdue, has an outstanding balance of ₹1,80,000, has an unresolved missing delivery proof issue, and is waiting on a missing document."* Assign, reschedule, comment, complete with a resolution, and reopen.
3. **Receivables → invoice**: record a promise, log a call, record a partial payment (Finance Manager), generate a **mock-AI** follow-up draft (editable; never sent).
4. **Issues → ISS-1002** (quality dispute): the 8-point resolution checklist, internal vs customer-visible comments, evidence upload, resolve (needs notes), then Finance confirms the invoice is unblocked. Uploading a document never unblocks anything automatically.
5. **Orders / Dispatch**: the at-risk commitment (SO …0303, due in 2 days) and the late order with a delay reason; delivered without POD.
6. **Quotations**: overdue follow-up (Mysuru Electricals), conversion summary, convert an accepted quote to an order.
7. **Data Imports**: download `demo-invoices-import.csv` from step 2 of the wizard. It auto-maps Tally-style headers, then the dry run shows 5 creates, 5 rejections (unknown customer, invalid date, bad amount, USD, in-file duplicate) and warnings. Commit it, then check the totals reconciliation and roll it back from the history tab.
8. **Reports**: switch reports, filter, export CSV.
9. **Customer portal** (Kovai Pumps user): orders, invoices, shared documents only, raise a query, upload evidence. Try a Deccan document URL and you get a 404.
10. **Settings**: thresholds and ageing buckets (priorities update on the next load), team roles, audit log, AI provider status (mock), demo reset.

Section 19 scenarios in the seed: 45-day overdue invoice with missing POD · partial payment · missed promises (×2, same customer) · quality dispute awaiting review · PO-number mismatch · quotation awaiting follow-up · order with at-risk delivery · fully paid invoices · unresolved portal query · resolved issue with GRN evidence · unapplied payment · credit note · invoice on hold.

---

## Architecture

```
web/
  prisma/            schema.prisma, migrations/, demo-seed.ts (seedDemo), seed.ts
  public/templates   CSV import templates      public/samples  demo import files
  src/app/
    (internal)/      staff app: overview, action-center, customers, quotations, orders, dispatch,
                     receivables, issues, tasks, reports, imports, settings, search
    portal/          customer portal (separate layout + navigation)
    mnt-flow/        public landing page          login/  forbidden/
    api/documents/[id]  permission-checked downloads      api/reports/[key]  CSV export
  src/lib/
    domain/          PURE business rules: receivables.ts (balances, status, ageing, promises, priority),
                     actions.ts (Action Center generation), constants.ts, settings.ts, domain.test.ts
    data/            tenant-scoped data access (always filtered by orgId), dashboard, reports, sync
    actions/         server actions (each calls authorize() first; returns user-safe messages)
    auth/            session.ts (signed cookie), permissions.ts (central role → permission matrix)
    import/          fields.ts (templates/mapping), engine.ts (validate, commit, rollback)
    ai/              provider.ts (interface), mock.ts (deterministic local provider)
    storage.ts       local private file storage adapter (swap for object storage)
```

- **Stack:** Next.js 16 (App Router, server components, server actions), React 19, TypeScript, Tailwind CSS 4, Prisma 6, SQLite (local), Recharts, Lucide, PapaParse + SheetJS (CSV/XLSX).
- **No hard-coded KPIs:** every figure is computed in `src/lib/domain` from database rows. Totals in tables reconcile to the rows shown (see table footers and the import reconciliation check).
- **Action Center sync:** actions are generated from source records (`domain/actions.ts`) and upserted by a stable key on page load. User-set owner, due date and completion are never overwritten; actions whose condition clears are auto-closed and logged.

## Business rules (deterministic, documented)

- **Date convention:** business dates are date-only (stored as UTC midnight). The reporting date is "today" in the organization timezone (default Asia/Kolkata) unless a reporting date is chosen. UI format is `DD MMM YYYY`; amounts use Indian grouping (`₹1,25,000`).
- **Outstanding** = invoice total − Σ payments − Σ credit notes/adjustments (dated on or before the reporting date), floored at 0. Overpayment shows as a *credit balance* exception.
- **Overdue days** = reporting date − due date (never negative). Missing due date gives an exception, shown as "Not yet due"; no due date is ever assumed.
- **Status precedence:** Paid → On hold → Disputed (open issue flagged *blocks payment*) → Overdue → Partially paid → Not due.
- **Ageing buckets:** configurable boundaries (default 30/60/90): Not yet due, 1–30, 31–60, 61–90, >90.
- **Payment promise status** is derived. Fulfilled when payments between the recorded date and the promised date cover the amount, partially fulfilled or missed once the date passes, open until then. Only "open/cancelled" is stored.
- **Priority score** (rule-based, not AI): overdue ≥ high days +30 / ≥ medium +15 / any +5; amount ≥ high +25 / ≥ medium +12; missed promise +25; unresolved blocking issue +15; issue open ≥ N days +15; missing document +10; commitment past due +25 / within window +15; late follow-up +10. High ≥ 55, medium ≥ 30. All thresholds in Settings. Each action shows the reason sentence.
- **Customer attention indicators** are transparent rules (≥2 overdue invoices, ≥2 missed promises, large outstanding, issue open > 30 days). They are not a credit or fraud assessment.
- **Collections target** for a period = monthly target × days/30.
- **Not calculated:** DSO and cash-flow forecasts. They need complete historical sales and receipts data.

### Imports

CSV / XLSX, ≤ 5,000 rows, dry run first, server-side re-validation on commit, one transaction, batch ID, rollback (refused if other records now depend on the batch; customer *updates* are not reversed). Dates: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD-MMM-YYYY, YYYY-MM-DD, Excel serials (day-first). Amounts: INR only, ₹/Rs./commas accepted. Duplicate rules:

| Entity | Rule |
|---|---|
| Customers | same code → skip (or update if chosen) |
| Quotations / Orders | same number → skip |
| Invoices | same number + same total → skip; different total → **reject** (amounts are never overwritten) |
| Payments | same customer + reference, or same invoice + date + amount → skip; amount above outstanding → reject |
| Promises | same invoice + date + amount → skip |

## Security model

- **Tenant isolation:** every tenant-owned table has `orgId`; every data function and server action filters by the session's `orgId`. Linked IDs submitted by forms are re-checked to belong to the same org and customer (prevents IDOR).
- **Authorization:** one permission matrix (`src/lib/auth/permissions.ts`). Pages call `requireInternal(perm)`, actions call `authorize(perm)`, route handlers check `can()`. The UI hides what the server would refuse anyway.
- **Customer portal:** the customer is derived from the session (never from the URL). Portal users only see their own orders and invoices, documents with `sharedWithCustomer`, their own queries, and customer-visible comments. Internal notes, hold reasons, risk indicators and private comments are never queried for portal pages.
- **Sessions:** HMAC-SHA256 signed, httpOnly, SameSite=Lax cookie (Secure in production), 8-hour expiry; bcrypt password hashes; login rate limit. Server actions have Next.js built-in origin checks (CSRF).
- **Uploads:** extension + MIME + magic-byte validation, 5 MB limit, random storage keys outside `/public`, served only through an authorized route as attachments with `nosniff` and a sandbox CSP. Never executed.
- **Audit:** append-only `ActivityEvent` log (no edit/delete API): logins, changes, comments, uploads, downloads, exports, imports, AI drafts.
- **Input validation** on every action; Prisma parameterized queries; React escaping; CSV export guards against formula injection.
- **No secrets in source.** `.env` is git-ignored; `AUTH_SECRET` is required in production.

## AI assistance

`src/lib/ai/provider.ts` defines the interface. Only the **Mock AI (local, deterministic)** provider is implemented and active; Settings → AI provider labels it as mock. It drafts follow-up emails, summarizes issues and customers, and suggests issue categories, using only facts computed by the domain layer. Drafts are labelled, editable, and never sent or saved automatically. To add a real provider, implement the interface server-side and complete a data-handling review first.

## Moving to production

1. **PostgreSQL:** set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at managed Postgres, delete `prisma/migrations` (they are SQLite-specific) and run `npx prisma migrate dev --name init`. Consider `Decimal` for money columns and Postgres row-level security as a second isolation layer.
2. **Authentication:** replace `src/lib/auth/session.ts` with a maintained provider (Auth.js, Clerk, Microsoft Entra ID) for MFA, invites, password reset and SSO. Keep the `getCurrentUser()` / `authorize()` signatures.
3. **Documents:** replace `src/lib/storage.ts` with private object storage (S3 / Azure Blob) and short-lived signed URLs.
4. **Rate limiting:** move the in-memory login limiter to a shared store.
5. Disable demo logins (`MNT_DEMO_LOGIN` unset) and do not ship the demo organization.

## Known limitations of this release

- No direct Tally / SAP / ERP connectors (CSV/XLSX import is the integration path). No WhatsApp, email sending or payment collection.
- Local demo persistence is SQLite; uploaded files live under `web/storage/` (git-ignored).
- One organization per user (no company switcher); business units are used for filtering.
- Payments apply to one invoice each (or are unapplied); multi-invoice allocation should be done in the accounting system.
- Sessions are a minimal signed-cookie implementation without MFA (see production steps).
- `npm audit` reports a high-severity advisory in `deepmerge-ts`, pulled in by the Prisma 6 CLI's config loader (dev tooling, not the runtime client). The fix requires Prisma 7.

## Verification performed

- `npm test`: domain assertions (₹ formatting, date parsing, ageing buckets, status precedence, partial payments + credit notes, reconciliation of buckets to totals, promise derivation, priority reason text, action generation) and an import dry run of the demo file. Both pass.
- `npm run lint`, `tsc --noEmit` and `npm run build` are clean.
- HTTP smoke tests across every route for admin, finance, sales, operations, auditor and portal roles, plus form submissions through the real server actions (promise/payment validation, payment recording, action complete/reopen, issue resolve validation, forged-PDF rejection, valid upload, portal query) and isolation checks (cross-customer queries and documents → 404, portal → internal pages redirected, CSV export → 403 for unauthorized roles).
