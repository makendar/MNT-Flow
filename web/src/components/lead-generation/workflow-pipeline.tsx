"use client";

import { cn } from "@/lib/format";
import { WORKFLOW_STAGES } from "@/lib/lead-generation/types";
import type { LeadStatus } from "@/lib/lead-generation/types";
import { ArrowRight } from "lucide-react";

const STATUS_TO_STAGE: Partial<Record<LeadStatus, number>> = {
  new: 0,
  contacted: 1,
  responded: 2,
  qualified: 3,
  demo_scheduled: 4,
  demo_completed: 5,
  follow_up: 6,
  opportunity: 7,
  not_interested: -1,
};

export function WorkflowPipeline({ highlightStatus }: { highlightStatus?: LeadStatus }) {
  const activeIdx = highlightStatus ? STATUS_TO_STAGE[highlightStatus] ?? 0 : undefined;
  return (
    <div className="card overflow-hidden">
      <div className="card-h">
        <h2 className="card-t">Lead generation workflow</h2>
        <span className="text-[11px] text-slate-500">Prospect → … → Opportunity</span>
      </div>
      <div className="overflow-x-auto p-4">
        <ol className="flex min-w-[640px] items-center gap-1">
          {WORKFLOW_STAGES.map((s, i) => {
            const on = activeIdx !== undefined && i <= activeIdx && activeIdx >= 0;
            const current = activeIdx === i;
            return (
              <li key={s.key} className="flex flex-1 items-center">
                <div
                  className={cn(
                    "flex flex-1 flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors",
                    on ? "border-teal-200 bg-teal-50/80" : "border-slate-200 bg-slate-50/50",
                    current && "ring-2 ring-teal-500/40",
                  )}
                >
                  <span className={cn("text-[11px] font-semibold", on ? "text-teal-900" : "text-slate-600")}>{s.label}</span>
                </div>
                {i < WORKFLOW_STAGES.length - 1 && <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />}
              </li>
            );
          })}
        </ol>
        {highlightStatus === "not_interested" && (
          <p className="mt-3 text-xs text-slate-500">Lead marked Not Interested — workflow paused (demo).</p>
        )}
      </div>
    </div>
  );
}
