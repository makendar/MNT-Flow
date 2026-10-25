import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Field, FilterBar, PageHeader, Select, TableWrap, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { demoLogin, demoLoginEnabled } from "@/lib/actions/auth";
import { resetDemoData, saveIssueCategories, saveOrgProfile, saveRules, updateMember } from "@/lib/actions/settings";
import { aiStatus } from "@/lib/ai/provider";
import { getUserMap } from "@/lib/data/lookups";
import { REPORTS } from "@/lib/data/reports";
import { db } from "@/lib/db";
import { dateFromISO } from "@/lib/dates";
import { ISSUE_CATEGORIES, ROLES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Settings" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal();
  const p = await readParams(searchParams);
  const canView = can(user, "settings:view");
  const manage = can(user, "settings:manage");
  const tab = canView ? p("tab") ?? "organization" : "demo";
  const org = await db.organization.findUniqueOrThrow({ where: { id: user.orgId } });
  const s = user.settings;
  const tabs = [
    ...(canView ? [
      { key: "organization", label: "Organization" }, { key: "rules", label: "Rules & thresholds" }, { key: "categories", label: "Issue categories" },
      { key: "team", label: "Team & roles" }, { key: "imports", label: "Import history" },
    ] : []),
    ...(can(user, "audit:view") ? [{ key: "audit", label: "Audit log" }] : []),
    ...(can(user, "reports:export") ? [{ key: "export", label: "Data export" }] : []),
    ...(canView ? [{ key: "ai", label: "AI provider" }] : []),
    { key: "demo", label: "Demo" },
  ].map((t) => ({ ...t, href: `/settings?tab=${t.key}` }));

  return (
    <>
      <PageHeader title="Settings" subtitle={<>{org.name} {org.isDemo && <Badge tone="amber">Demo organization</Badge>}</>} />
      <Tabs tabs={tabs} active={tab} />

      {tab === "organization" && (
        <Card title="Organization profile">
          <ActionForm action={saveOrgProfile} className="grid max-w-3xl gap-3 md:grid-cols-2">
            <fieldset disabled={!manage} className="contents">
              <Field label="Company name" className="md:col-span-2"><input name="name" defaultValue={org.name} className="input" required /></Field>
              <Field label="Address" className="md:col-span-2"><textarea name="address" rows={2} defaultValue={org.address} className="input" /></Field>
              <Field label="Timezone"><input name="timezone" defaultValue={org.timezone} className="input" required /></Field>
              <Field label="Currency" hint="INR only in this release"><input value={org.currency} readOnly className="input" /></Field>
              <Field label="Fiscal year starts"><Select name="fiscalYearStartMonth" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} defaultValue={String(org.fiscalYearStartMonth)} /></Field>
              <Field label="Default payment terms (days)"><input name="defaultPaymentTermsDays" type="number" min={0} max={365} defaultValue={org.defaultPaymentTermsDays} className="input" /></Field>
              <Field label="Logo URL (https)" className="md:col-span-2"><input name="logoUrl" defaultValue={org.logoUrl ?? ""} className="input" /></Field>
              <p className="text-xs text-slate-500 md:col-span-2">Display: dates as DD MMM YYYY, amounts in Indian grouping (₹1,25,000). Reporting date is today in the organization timezone.</p>
              {manage && <div><button className="btn btn-primary">Save profile</button></div>}
            </fieldset>
          </ActionForm>
        </Card>
      )}

      {tab === "rules" && (
        <ActionForm action={saveRules} className="space-y-4">
          <fieldset disabled={!manage} className="contents">
            <Card title="Receivables ageing">
              <Field label="Bucket boundaries (days overdue, comma-separated)" hint={`Current buckets: ${bucketLabels(s.ageingBoundaries).join(" · ")}`} className="max-w-md"><input name="ageingBoundaries" defaultValue={s.ageingBoundaries.join(", ")} className="input" /></Field>
            </Card>
            <Card title="Action priority thresholds (rule-based)">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="High amount (₹) +25"><input name="highAmount" type="number" defaultValue={s.priority.highAmount} className="input" /></Field>
                <Field label="Medium amount (₹) +12"><input name="mediumAmount" type="number" defaultValue={s.priority.mediumAmount} className="input" /></Field>
                <Field label="High overdue days +30"><input name="highOverdueDays" type="number" defaultValue={s.priority.highOverdueDays} className="input" /></Field>
                <Field label="Medium overdue days +15"><input name="mediumOverdueDays" type="number" defaultValue={s.priority.mediumOverdueDays} className="input" /></Field>
                <Field label="Stale issue after (days) +15"><input name="staleIssueDays" type="number" defaultValue={s.priority.staleIssueDays} className="input" /></Field>
                <Field label="Commitment window (days) +15"><input name="commitmentWindowDays" type="number" defaultValue={s.priority.commitmentWindowDays} className="input" /></Field>
                <Field label="High priority score ≥"><input name="highScore" type="number" defaultValue={s.priority.highScore} className="input" /></Field>
                <Field label="Medium priority score ≥"><input name="mediumScore" type="number" defaultValue={s.priority.mediumScore} className="input" /></Field>
              </div>
              <p className="mt-2 text-xs text-slate-500">Fixed signal weights: missed promise +25, commitment past due +25, unresolved blocking issue +15, missing document +10, late follow-up +10.</p>
            </Card>
            <Card title="Customer attention indicators, collections & reminders">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Large outstanding (₹)"><input name="largeOutstanding" type="number" defaultValue={s.risk.largeOutstanding} className="input" /></Field>
                <Field label="Multiple overdue invoices ≥"><input name="multipleOverdueInvoices" type="number" defaultValue={s.risk.multipleOverdueInvoices} className="input" /></Field>
                <Field label="Repeated missed promises ≥"><input name="repeatedMissedPromises" type="number" defaultValue={s.risk.repeatedMissedPromises} className="input" /></Field>
                <Field label="Long-standing issue (days)"><input name="longDisputeDays" type="number" defaultValue={s.risk.longDisputeDays} className="input" /></Field>
                <Field label="Monthly collection target (₹)"><input name="monthlyCollectionTarget" type="number" defaultValue={s.monthlyCollectionTarget} className="input" /></Field>
                <Field label="Reminder lead time (days)" hint="Promise/quote follow-ups appear this many days early"><input name="reminderLeadDays" type="number" defaultValue={s.reminderLeadDays} className="input" /></Field>
              </div>
            </Card>
            {manage && <button className="btn btn-primary">Save rules</button>}
          </fieldset>
        </ActionForm>
      )}

      {tab === "categories" && (
        <Card title="Issue categories available when raising issues">
          <ActionForm action={saveIssueCategories} className="space-y-3">
            <fieldset disabled={!manage} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ISSUE_CATEGORIES.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="categories" value={c.value} defaultChecked={s.enabledIssueCategories.includes(c.value)} disabled={c.value === "other"} />{c.label}</label>
              ))}
            </fieldset>
            {manage && <button className="btn btn-primary">Save categories</button>}
          </ActionForm>
        </Card>
      )}

      {tab === "team" && <TeamTab orgId={user.orgId} meId={user.id} manage={manage} />}

      {tab === "imports" && (
        <Card title="Import history"><p className="text-[13px]">Every import batch, with counts and rollback, is listed in <Link className="link" href="/imports?tab=history">Data Imports → Import history</Link>.</p></Card>
      )}

      {tab === "audit" && <AuditTab orgId={user.orgId} p={p} />}

      {tab === "export" && (
        <Card title="Data export (CSV)">
          <p className="mb-3 text-xs text-slate-500">Exports are generated on request for your organization only and are recorded in the audit log.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...REPORTS.filter((r) => r.hidden), ...REPORTS.filter((r) => ["outstanding", "customer-summary"].includes(r.key))].map((r) => (
              <li key={r.key} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-[13px]">{r.title}<a className="btn btn-sm" href={`/api/reports/${r.key}`}>Download</a></li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "ai" && (() => {
        const ai = aiStatus();
        return (
          <Card title="AI provider configuration">
            <dl className="dl max-w-xl">
              <dt>Active provider</dt><dd>{ai.active} {ai.isMock && <Badge tone="amber">Mock: not a live AI service</Badge>}</dd>
              <dt>Requested (AI_PROVIDER)</dt><dd className="font-mono text-xs">{ai.requested}</dd>
              <dt>Status</dt><dd>{ai.note}</dd>
              <dt>API keys</dt><dd>Server-side environment variables only; never exposed to the browser.</dd>
            </dl>
            <ul className="mt-3 list-disc pl-5 text-xs text-slate-600">
              <li>AI output is always a labelled draft; users edit, copy or discard it. Nothing is sent automatically.</li>
              <li>Balances, dates and priorities come from deterministic calculations, never from AI.</li>
              <li>Before enabling a real provider: review data handling, tenant isolation and customer consent.</li>
            </ul>
          </Card>
        );
      })()}

      {tab === "demo" && <DemoTab user={user} isDemo={org.isDemo} />}
    </>
  );
}

async function TeamTab({ orgId, meId, manage }: { orgId: string; meId: string; manage: boolean }) {
  const [members, portal, bus] = await Promise.all([
    db.user.findMany({ where: { orgId, role: { not: "customer_portal" } }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { orgId, role: "customer_portal" }, include: { customer: { select: { name: true } } } }),
    db.businessUnit.findMany({ where: { orgId } }),
  ]);
  return (
    <div className="space-y-4">
      <Card title="Team members" bodyClass="p-0">
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Team</th><th>Role</th><th>Active</th>{manage && <th />}</tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.name}{m.id === meId && <Badge tone="blue">You</Badge>}</td>
                  <td className="text-xs">{m.email}</td>
                  <td>{m.team ?? "—"}</td>
                  {manage ? (
                    <td colSpan={3}>
                      <ActionForm action={updateMember.bind(null, m.id)} className="flex flex-wrap items-center gap-2">
                        <select name="role" defaultValue={m.role} className="input h-7 w-52 text-xs" aria-label="Role">{ROLES.filter((r) => r.value !== "customer_portal").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={m.active} /> Active</label>
                        <button className="btn btn-sm">Save</button>
                      </ActionForm>
                    </td>
                  ) : (<><td>{labelOf(ROLES, m.role)}</td><td>{m.active ? "Yes" : "No"}</td></>)}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="px-4 py-2 text-[11px] text-slate-500">Permissions are enforced centrally on the server. Inviting users, MFA and SSO require the production authentication provider (not part of the local demo).</p>
      </Card>
      <Card title="Customer portal users" bodyClass="p-0">
        <TableWrap>
          <table className="tbl"><thead><tr><th>Name</th><th>Email</th><th>Customer account</th></tr></thead>
            <tbody>{portal.map((u) => <tr key={u.id}><td>{u.name}</td><td className="text-xs">{u.email}</td><td>{u.customer?.name}</td></tr>)}</tbody>
          </table>
        </TableWrap>
      </Card>
      <Card title="Business units / sites"><ul className="text-[13px]">{bus.map((b) => <li key={b.id}>{b.name}</li>)}</ul></Card>
    </div>
  );
}

async function AuditTab({ orgId, p }: { orgId: string; p: (k: string) => string | undefined }) {
  const types = ["invoice", "issue", "order", "quotation", "customer", "action", "task", "document", "import", "report", "user", "organization"];
  const [events, users] = await Promise.all([
    db.activityEvent.findMany({
      where: { orgId, ...(p("type") ? { entityType: p("type") } : {}), ...(p("user") ? { userId: p("user") } : {}), ...(p("from") ? { createdAt: { gte: dateFromISO(p("from")!) } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getUserMap(orgId),
  ]);
  return (
    <>
      <FilterBar resetHref="/settings?tab=audit">
        <input type="hidden" name="tab" value="audit" />
        <Field label="Record type" className="w-40"><Select name="type" options={types.map((t) => ({ value: t, label: t }))} defaultValue={p("type")} placeholder="All" /></Field>
        <Field label="User" className="w-44"><Select name="user" options={[...users].map(([id, name]) => ({ value: id, label: name }))} defaultValue={p("user")} placeholder="All" /></Field>
        <Field label="Since"><input type="date" name="from" defaultValue={p("from")} className="input w-36" /></Field>
      </FilterBar>
      <Card title={`Audit log (latest ${events.length})`} actions={<span className="text-[11px] text-slate-500">Append-only; entries cannot be edited or deleted</span>}>
        <Timeline events={events} users={users} showEntity />
      </Card>
    </>
  );
}

async function DemoTab({ user, isDemo }: { user: Awaited<ReturnType<typeof requireInternal>>; isDemo: boolean }) {
  const enabled = await demoLoginEnabled();
  const demoUsers = isDemo && enabled ? await db.user.findMany({ where: { orgId: user.orgId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true } }) : [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Switch demo role">
        {!isDemo || !enabled ? <p className="text-[13px] text-slate-500">Role switching is only available for demo organizations in development mode.</p> : (
          <>
            <p className="mb-3 text-xs text-slate-500">Development-only simulator: signs you in as another seeded user so you can see each role&apos;s permissions. The server re-validates every request.</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {demoUsers.map((u) => (
                <li key={u.id}>
                  <form action={demoLogin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button disabled={u.id === user.id} className="w-full rounded border border-slate-200 px-3 py-1.5 text-left text-[13px] hover:bg-blue-50/40 disabled:bg-blue-50">
                      {u.name}<span className="block text-[11px] text-slate-500">{labelOf(ROLES, u.role)}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card title="Reset demo data">
        {isDemo && can(user, "demo:reset") ? (
          <ActionForm action={resetDemoData} confirm="Delete all data in this demo organization and reseed the synthetic dataset?">
            <p className="mb-3 text-[13px] text-slate-700">Deletes every record in this demo organization (including imports, uploads metadata, comments and audit entries) and reloads the synthetic dataset with dates relative to today.</p>
            <button className="btn btn-danger">Reset demo data</button>
          </ActionForm>
        ) : <p className="text-[13px] text-slate-500">Only an Organization Admin of a demo organization can reset data.</p>}
      </Card>
    </div>
  );
}
