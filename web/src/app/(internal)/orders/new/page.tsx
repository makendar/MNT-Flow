import { OrderForm } from "@/components/sales-forms";
import { Card, PageHeader } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "New order" };

export default async function NewOrder({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("orders:edit");
  const p = await readParams(searchParams);
  return (
    <>
      <PageHeader title="New sales order" crumbs={[["Orders", "/orders"], ["New"]]} />
      <Card><OrderForm orgId={user.orgId} customerId={p("customerId")} today={user.today} /></Card>
    </>
  );
}
