import Link from "next/link";
import { DemoChecklist } from "@/components/lead-generation/demo-checklist";
import { LeadsTable } from "@/components/lead-generation/leads-workspace";
import { WorkflowPipeline } from "@/components/lead-generation/workflow-pipeline";
import { Card, Kpi, PageHeader, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { countByCategory } from "@/lib/lead-generation/assets";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";
import { ASSET_CATEGORIES } from "@/lib/lead-generation/types";
import { FolderOpen, Users } from "lucide-react";

export const metadata = { title: "Lead Generation" };

export default async function LeadGenerationHubPage() {
  const user = await requireInternal("leadgen:view");
  const canEdit = can(user, "leadgen:edit");
  const counts = countByCategory();
  const openOpps = DEMO_LEADS.filter((l) => l.status === "opportunity").length;
  const inPipeline = DEMO_LEADS.filter((l) => l.status !== "not_interested").length;
  const scheduled = DEMO_LEADS.filter((l) => l.status === "demo_scheduled").length;

  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader
        title="Lead Generation"
        subtitle={
          <>
            Sales & outreach demo kit — cold email, WhatsApp templates, brochures, discovery scripts, and workflow tracking.
            <span className="ml-1 font-medium text-amber-800">Templates are copy-only; nothing is sent from this app.</span>
          </>
        }
        actions={
          canEdit && (
            <Link href="/lead-generation/leads/lead-evergreen" className="btn btn-primary">
              Start demo flow
            </Link>
          )
        }
      />
      <Tabs tabs={tabs} active="hub" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Demo leads" value={inPipeline} sub="Fictional prospects in kit" href="/lead-generation/leads" />
        <Kpi label="Demos scheduled" value={scheduled} sub="Demo status only" tone={scheduled ? "amber" : "default"} />
        <Kpi label="Opportunities" value={openOpps} sub="Demo pipeline stage" />
        <Kpi label="Asset templates" value={Object.values(counts).reduce((a, b) => a + b, 0)} sub="Copy, edit, reuse in app" href="/lead-generation/library" />
      </div>
      <WorkflowPipeline />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Demo leads"
            actions={<Link href="/lead-generation/leads" className="btn btn-sm">View all</Link>}
            bodyClass="p-0"
          >
            <LeadsTable canEdit={canEdit} />
          </Card>
          <Card title="Asset folders">
            <div className="grid gap-3 sm:grid-cols-2">
              {ASSET_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  href={`/lead-generation/library/${c.id}`}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-teal-200 hover:bg-teal-50/30"
                >
                  <FolderOpen className="mt-0.5 h-5 w-5 text-teal-600" aria-hidden />
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">{c.folder}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.description}</div>
                    <div className="mt-1 text-[11px] font-medium text-blue-700">{counts[c.id] ?? 0} item(s)</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <DemoChecklist />
          <Card title="Presentation path">
            <ol className="list-inside list-decimal space-y-2 text-[13px] text-slate-600">
              <li>Find / import demo lead</li>
              <li>Choose outreach (email or WhatsApp template)</li>
              <li>Personalize placeholders → copy</li>
              <li>Share brochure preview</li>
              <li>Track status & qualify</li>
              <li>Run discovery script + call notes</li>
              <li>Define next step → opportunity</li>
            </ol>
            <Link href="/lead-generation/leads" className="btn btn-sm mt-4 w-full">
              <Users className="h-3.5 w-3.5" /> Open demo leads
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
