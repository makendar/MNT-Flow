import { ActionForm } from "@/components/action-form";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { raiseQuery } from "@/lib/actions/portal";
import { db } from "@/lib/db";
import { PORTAL_QUERY_TYPES } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Raise a query" };

export default async function NewQuery({ searchParams }: { searchParams: SearchParams }) {
  const u = await requirePortal();
  const p = await readParams(searchParams);
  const where = { orgId: u.orgId, customerId: u.customerId };
  const [invoices, orders] = await Promise.all([
    db.invoice.findMany({ where, select: { id: true, number: true }, orderBy: { invoiceDate: "desc" } }),
    db.salesOrder.findMany({ where, select: { id: true, number: true, customerPoNumber: true }, orderBy: { orderDate: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Raise a query" crumbs={[["My queries", "/portal/queries"], ["New"]]} subtitle="Our team will review and respond here. You can attach supporting documents after submitting." />
      <Card>
        <ActionForm action={raiseQuery} className="grid max-w-2xl gap-3">
          <Field label="Query type *"><Select name="category" options={PORTAL_QUERY_TYPES} placeholder="Choose" required /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Related invoice">
              <select name="invoiceId" className="input" defaultValue={invoices.some((i) => i.id === p("invoiceId")) ? p("invoiceId") : ""}>
                <option value="">None</option>
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
              </select>
            </Field>
            <Field label="Related order">
              <select name="orderId" className="input" defaultValue={orders.some((o) => o.id === p("orderId")) ? p("orderId") : ""}>
                <option value="">None</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.number} (PO {o.customerPoNumber || "—"})</option>)}
              </select>
            </Field>
          </div>
          <Field label="Subject *"><input name="title" className="input" required maxLength={200} /></Field>
          <Field label="Details *"><textarea name="description" rows={5} className="input" required maxLength={4000} /></Field>
          <div><button className="btn btn-primary">Submit query</button></div>
        </ActionForm>
      </Card>
    </>
  );
}
