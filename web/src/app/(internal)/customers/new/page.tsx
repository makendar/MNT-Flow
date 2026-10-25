import { CustomerForm } from "@/components/customer-form";
import { Card, PageHeader } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata = { title: "New customer" };

export default async function NewCustomer() {
  const user = await requireInternal("customers:edit");
  const org = await db.organization.findUnique({ where: { id: user.orgId } });
  return (
    <>
      <PageHeader title="New customer" crumbs={[["Customers", "/customers"], ["New"]]} />
      <Card><CustomerForm orgId={user.orgId} defaultTerms={org?.defaultPaymentTermsDays} /></Card>
    </>
  );
}
