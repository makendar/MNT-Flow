import { ActionForm } from "@/components/action-form";
import { CategorySuggest } from "@/components/ai-draft";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { createIssue } from "@/lib/actions/work";
import { db } from "@/lib/db";
import { ISSUE_CATEGORIES, PRIORITIES, TEAMS } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Raise issue" };

export default async function NewIssue({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("issues:edit");
  const p = await readParams(searchParams);
  const inv = p("invoiceId") ? await db.invoice.findFirst({ where: { id: p("invoiceId"), orgId: user.orgId } }) : null;
  const ord = p("orderId") ? await db.salesOrder.findFirst({ where: { id: p("orderId"), orgId: user.orgId } }) : null;
  const customerId = inv?.customerId ?? ord?.customerId ?? p("customerId");
  const cats = ISSUE_CATEGORIES.filter((c) => user.settings.enabledIssueCategories.includes(c.value));

  return (
    <>
      <PageHeader title="Raise an issue" crumbs={[["Issues & Disputes", "/issues"], ["New"]]} subtitle={inv ? `Linked to invoice ${inv.number}` : ord ? `Linked to order ${ord.number}` : undefined} />
      <Card>
        <ActionForm action={createIssue} className="grid gap-3 md:grid-cols-4">
          {inv && <input type="hidden" name="invoiceId" value={inv.id} />}
          {ord && <input type="hidden" name="orderId" value={ord.id} />}
          <CustomerSelect orgId={user.orgId} name="customerId" value={customerId} required className="md:col-span-2" />
          <Field label="Title *" className="md:col-span-2"><input name="title" className="input" required placeholder="e.g. Signed POD not received by customer accounts" /></Field>
          <Field label="What happened?" className="md:col-span-4"><textarea id="issue-desc" name="description" rows={3} className="input" placeholder="Describe the issue in the customer's words if possible" /></Field>
          <div className="md:col-span-2">
            <Field label="Category *"><Select id="issue-cat" name="category" options={cats} placeholder="Choose category" required /></Field>
            <div className="mt-1.5"><CategorySuggest textareaId="issue-desc" selectId="issue-cat" /></div>
          </div>
          <Field label="Reported by"><input name="reportedBy" className="input" placeholder="Customer contact or staff" /></Field>
          <Field label="Priority"><Select name="priority" options={PRIORITIES} defaultValue="medium" /></Field>
          <OwnerSelect orgId={user.orgId} name="ownerId" label="Responsible owner" placeholder="Unassigned" className="" />
          <Field label="Team"><Select name="team" options={TEAMS} placeholder="—" /></Field>
          <Field label="Resolve by"><input type="date" name="dueDate" min={user.today} className="input" /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-[13px]"><input type="checkbox" name="blocksPayment" defaultChecked={!!inv} /> Blocks payment</label>
          <Field label="Missing evidence" className="md:col-span-2"><input name="missingEvidence" className="input" placeholder="e.g. signed POD, GRN reference" /></Field>
          <Field label="Next action" className="md:col-span-2"><input name="nextAction" className="input" /></Field>
          <div className="md:col-span-4"><button className="btn btn-primary">Raise issue</button></div>
        </ActionForm>
      </Card>
    </>
  );
}
