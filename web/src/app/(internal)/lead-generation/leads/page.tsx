import { LeadsTable } from "@/components/lead-generation/leads-workspace";
import { WorkflowPipeline } from "@/components/lead-generation/workflow-pipeline";
import { PageHeader, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

export const metadata = { title: "Demo leads · Lead Generation" };

export default async function LeadGenerationLeadsPage() {
  const user = await requireInternal("leadgen:view");
  const canEdit = can(user, "leadgen:edit");
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader
        title="Demo leads"
        subtitle="Fictional companies and contacts for safe live demos. Status changes save in this browser only."
      />
      <Tabs tabs={tabs} active="leads" />
      <WorkflowPipeline />
      <div className="mt-4">
        <LeadsTable canEdit={canEdit} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Need a fresh slate? Clear site data for this origin or use browser dev tools — server demo DB is unchanged.
      </p>
    </>
  );
}
