"use client";

import { useState } from "react";
import { getAsset } from "@/lib/lead-generation/assets";
import { useDemoLeads } from "./leads-workspace";

const DEFAULT_SENDER = "Meena Sundaram";
const DEFAULT_BOOKING = "[Booking Link]";
const DEFAULT_SOLUTION = "MNT Flow";

export function PersonalizeOutreach({ leadId, templateId }: { leadId: string; templateId: string }) {
  const { leads } = useDemoLeads();
  const lead = leads.find((l) => l.id === leadId);
  const asset = getAsset(templateId);
  const [copied, setCopied] = useState(false);
  if (!lead || !asset) return null;

  const text = asset.body
    .replaceAll("[First Name]", lead.firstName)
    .replaceAll("[Company]", lead.company.replace(" (Demo)", ""))
    .replaceAll("[Industry]", lead.industry)
    .replaceAll("[Pain Point]", lead.painPoint)
    .replaceAll("[Solution]", DEFAULT_SOLUTION)
    .replaceAll("[Sender Name]", DEFAULT_SENDER)
    .replaceAll("[Booking Link]", DEFAULT_BOOKING);

  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Personalized outreach (demo)</h2>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy personalized text"}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto p-4 text-xs whitespace-pre-wrap text-slate-700">{text}</pre>
    </section>
  );
}
