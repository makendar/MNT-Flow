import { notFound } from "next/navigation";
import { CallNotesForm } from "@/components/lead-generation/call-notes-form";
import { PersonalizeOutreach } from "@/components/lead-generation/personalize-outreach";
import { LeadDetailWorkspace } from "@/components/lead-generation/leads-workspace";
import { LeadWorkflow } from "@/components/lead-generation/lead-workflow";
import { PageHeader, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = DEMO_LEADS.find((l) => l.id === id);
  return { title: lead ? `${lead.firstName} ${lead.lastName} · Lead Generation` : "Lead Generation" };
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("leadgen:view");
  const { id } = await params;
  if (!DEMO_LEADS.some((l) => l.id === id)) notFound();
  const canEdit = can(user, "leadgen:edit");
  const lead = DEMO_LEADS.find((l) => l.id === id)!; // static metadata for header
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={lead.company}
        crumbs={[["Lead Generation", "/lead-generation"], ["Demo leads", "/lead-generation/leads"], [lead.company]]}
      />
      <Tabs tabs={tabs} active="leads" />
      <LeadWorkflow leadId={id} />
      <div className="mt-4 space-y-4">
        <PersonalizeOutreach leadId={id} templateId="email-1-intro" />
        <div className="grid gap-4 lg:grid-cols-2">
          <LeadDetailWorkspace leadId={id} canEdit={canEdit} />
          <CallNotesForm leadId={id} />
        </div>
      </div>
    </>
  );
}
