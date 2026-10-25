import { notFound } from "next/navigation";
import { BrochureView, type BrochureId } from "@/components/lead-generation/brochure-view";
import { PageHeader, Tabs } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

const VALID: BrochureId[] = ["executive", "problem-solution", "whatsapp-mobile"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Brochure preview · Lead Generation" };
}

export default async function BrochurePage({ params }: { params: Promise<{ id: string }> }) {
  await requireInternal("leadgen:view");
  const { id } = await params;
  if (!VALID.includes(id as BrochureId)) notFound();
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader
        title="Brochure preview"
        subtitle="Share via email or WhatsApp manually. All content is fictional demo material."
        crumbs={[["Lead Generation", "/lead-generation"], ["Brochures", "/lead-generation/library/brochures"], ["Preview"]]}
      />
      <Tabs tabs={tabs} active="library" />
      <BrochureView id={id as BrochureId} />
    </>
  );
}
