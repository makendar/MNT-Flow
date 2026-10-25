"use client";

import { WorkflowPipeline } from "./workflow-pipeline";
import { useDemoLeads } from "./leads-workspace";

export function LeadWorkflow({ leadId }: { leadId: string }) {
  const { leads, ready } = useDemoLeads();
  const lead = leads.find((l) => l.id === leadId);
  if (!ready) return null;
  return <WorkflowPipeline highlightStatus={lead?.status} />;
}
