import { QuotationForm } from "@/components/sales-forms";
import { Card, PageHeader } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "New quotation" };

export default async function NewQuotation({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("quotes:edit");
  const p = await readParams(searchParams);
  return (
    <>
      <PageHeader title="New quotation" crumbs={[["Quotations", "/quotations"], ["New"]]} />
      <Card><QuotationForm orgId={user.orgId} customerId={p("customerId")} today={user.today} /></Card>
    </>
  );
}
