import { ActionForm } from "@/components/action-form";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { createTask } from "@/lib/actions/work";
import { db } from "@/lib/db";
import { PRIORITIES } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "New task" };

export default async function NewTask({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("tasks:edit");
  const p = await readParams(searchParams);
  const issue = p("issueId") ? await db.issue.findFirst({ where: { id: p("issueId"), orgId: user.orgId } }) : null;
  return (
    <>
      <PageHeader title="New task" crumbs={[["Tasks & Follow-ups", "/tasks"], ["New"]]} subtitle={issue ? `For issue ${issue.number}: ${issue.title}` : undefined} />
      <Card>
        <ActionForm action={createTask} className="grid gap-3 md:grid-cols-4">
          {issue && <input type="hidden" name="issueId" value={issue.id} />}
          {issue?.invoiceId && <input type="hidden" name="invoiceId" value={issue.invoiceId} />}
          {issue?.orderId && <input type="hidden" name="orderId" value={issue.orderId} />}
          <Field label="Title *" className="md:col-span-2"><input name="title" className="input" required /></Field>
          <CustomerSelect orgId={user.orgId} name="customerId" value={issue?.customerId ?? p("customerId")} placeholder="No customer" className="md:col-span-2" />
          <Field label="Description" className="md:col-span-4"><textarea name="description" rows={2} className="input" /></Field>
          <OwnerSelect orgId={user.orgId} name="ownerId" label="Owner" value={user.id} placeholder="Unassigned" className="" />
          <Field label="Priority"><Select name="priority" options={PRIORITIES} defaultValue="medium" /></Field>
          <Field label="Due date"><input type="date" name="dueDate" className="input" /></Field>
          <div className="md:col-span-4"><button className="btn btn-primary">Create task</button></div>
        </ActionForm>
      </Card>
    </>
  );
}
