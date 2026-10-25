import { ActionForm } from "@/components/action-form";
import { ImportWizard } from "@/components/import-wizard";
import { Badge, Card, Empty, PageHeader, TableWrap, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { rollbackImport } from "@/lib/actions/imports";
import { getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { ENTITIES } from "@/lib/import/fields";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Data Imports" };

export default async function ImportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("imports:view");
  const p = await readParams(searchParams);
  const canRun = can(user, "imports:run");
  const tab = canRun ? p("tab") ?? "wizard" : "history";
  const [batches, users] = await Promise.all([db.importBatch.findMany({ where: { orgId: user.orgId }, orderBy: { createdAt: "desc" }, take: 100 }), getUserMap(user.orgId)]);

  return (
    <>
      <PageHeader
        title="Data Imports"
        subtitle="CSV / Excel is the integration method for this release: export from Tally, SAP, or any ERP and import here. Direct ERP connectors are not yet available."
      />
      <Tabs active={tab} tabs={[...(canRun ? [{ key: "wizard", label: "Import wizard", href: "/imports" }] : []), { key: "history", label: "Import history", href: "/imports?tab=history", count: batches.length }, { key: "templates", label: "Templates & rules", href: "/imports?tab=templates" }]} />
      {tab === "wizard" && <ImportWizard />}
      {tab === "history" && (
        <Card bodyClass="p-0" title="Import history">
          {batches.length === 0 ? <Empty title="No imports yet" /> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>When</th><th>Type</th><th>File</th><th>By</th><th className="num">Created</th><th className="num">Updated</th><th className="num">Skipped</th><th className="num">Rejected</th><th className="num">Value</th><th>Status</th>{canRun && <th />}</tr></thead>
                <tbody>
                  {batches.map((b) => {
                    const sm = JSON.parse(b.summaryJson || "{}") as { create?: number; update?: number; skip?: number; reject?: number; amount?: number };
                    return (
                      <tr key={b.id}>
                        <td className="whitespace-nowrap">{fmtDateTime(b.createdAt)}<div className="font-mono text-[10px] text-slate-400">{b.id}</div></td>
                        <td>{ENTITIES.find((e) => e.value === b.entityType)?.label ?? b.entityType}</td>
                        <td className="max-w-48 break-all">{b.fileName}</td>
                        <td>{b.createdById ? users.get(b.createdById) : "—"}</td>
                        <td className="num">{sm.create ?? 0}</td><td className="num">{sm.update ?? 0}</td><td className="num">{sm.skip ?? 0}</td><td className="num">{sm.reject ?? 0}</td>
                        <td className="num">{sm.amount ? fmtINR(sm.amount) : "—"}</td>
                        <td>{b.status === "committed" ? <Badge tone="green">Committed</Badge> : <Badge>Rolled back</Badge>}</td>
                        {canRun && (
                          <td>
                            {b.status === "committed" && (
                              <ActionForm action={rollbackImport.bind(null, b.id)} confirm="Remove all records created by this import batch?">
                                <button className="btn btn-sm btn-danger">Roll back</button>
                              </ActionForm>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
          <p className="px-4 py-2 text-[11px] text-slate-500">Rollback removes records created by a batch, and is refused if other records (payments, issues, linked invoices) now depend on them. Updates to existing customers are not reversed.</p>
        </Card>
      )}
      {tab === "templates" && (
        <div className="grid gap-4 md:grid-cols-2">
          {ENTITIES.map((e) => (
            <Card key={e.value} title={e.label} actions={<a className="btn btn-sm" href={`/templates/${e.value}.csv`} download>Download template</a>}>
              <p className="text-[13px] text-slate-700">{e.description}</p>
              <p className="mt-2 text-xs text-slate-500"><b>Duplicate rule:</b> {e.duplicateRule}</p>
            </Card>
          ))}
          <Card title="General rules" className="md:col-span-2">
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-700">
              <li>Dates: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD-MMM-YYYY, YYYY-MM-DD and Excel date cells. NN/NN/YYYY is read day-first.</li>
              <li>Amounts: INR only; ₹, &ldquo;Rs.&rdquo;, &ldquo;INR&rdquo; and Indian comma grouping are accepted; up to 2 decimals. Negative or zero amounts are rejected.</li>
              <li>Customers must exist (import the customer master first). Owners are matched by team-member email.</li>
              <li>Malformed rows are rejected with a reason and are never dropped silently. Every import runs a dry run first.</li>
              <li>Existing invoice amounts are never overwritten. A different total for an existing invoice number is rejected.</li>
              <li>Data is always imported into your own organization only.</li>
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
