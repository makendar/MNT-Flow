"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/format";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";
import { DEMO_STORAGE_KEY, LEAD_STATUSES, type DemoLead, type LeadStatus } from "@/lib/lead-generation/types";

type Stored = { leads: Record<string, Partial<DemoLead>> };

function loadStored(): Stored {
  if (typeof window === "undefined") return { leads: {} };
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) ?? '{"leads":{}}') as Stored;
  } catch {
    return { leads: {} };
  }
}

function saveStored(data: Stored) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

export function useDemoLeads() {
  const [stored, setStored] = useState<Stored>({ leads: {} });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStored(loadStored());
    setReady(true);
  }, []);

  const leads = useMemo(
    () =>
      DEMO_LEADS.map((base) => ({
        ...base,
        ...stored.leads[base.id],
      })),
    [stored],
  );

  const updateLead = (id: string, patch: Partial<DemoLead>) => {
    const next = { leads: { ...stored.leads, [id]: { ...stored.leads[id], ...patch } } };
    setStored(next);
    saveStored(next);
  };

  return { leads, updateLead, ready };
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  demo_scheduled: "Demo Scheduled",
  demo_completed: "Demo Completed",
  follow_up: "Follow-Up",
  opportunity: "Opportunity",
  not_interested: "Not Interested",
};

export function LeadsTable({ canEdit }: { canEdit: boolean }) {
  const { leads, ready } = useDemoLeads();
  if (!ready) {
    return <div className="card p-8 text-center text-sm text-slate-500">Loading demo leads…</div>;
  }
  return (
    <div className="card overflow-hidden">
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Lead (demo)</th>
              <th>Company</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Next step</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="font-medium text-slate-900">{l.firstName} {l.lastName}</div>
                  <div className="text-xs text-slate-500">{l.title}</div>
                </td>
                <td className="text-[13px]">{l.company}</td>
                <td><StatusBadge value={l.status} label={STATUS_LABEL[l.status]} /></td>
                <td className="text-[13px]">{l.owner}</td>
                <td className="max-w-xs text-[13px] text-slate-600">{l.nextStep}</td>
                <td className="text-right">
                  <Link href={`/lead-generation/leads/${l.id}`} className="btn btn-sm">
                    {canEdit ? "Work lead" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function LeadDetailWorkspace({ leadId, canEdit }: { leadId: string; canEdit: boolean }) {
  const { leads, updateLead, ready } = useDemoLeads();
  const lead = leads.find((l) => l.id === leadId);

  if (!ready) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!lead) return <p className="text-sm text-red-700">Demo lead not found.</p>;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{lead.firstName} {lead.lastName}</h2>
            <p className="text-[13px] text-slate-600">{lead.title} · {lead.company}</p>
            <p className="mt-1 text-xs text-slate-500">{lead.email} · {lead.phone}</p>
          </div>
          <Badge tone="amber">Fictional demo lead</Badge>
        </div>
        <dl className="dl mt-4">
          <dt>Industry</dt><dd>{lead.industry}</dd>
          <dt>Pain point</dt><dd>{lead.painPoint}</dd>
          <dt>Source</dt><dd>{lead.source}</dd>
        </dl>
      </div>

      {canEdit && (
        <div className="card p-4">
          <FieldRow label="Status">
            <select
              className="input max-w-xs"
              value={lead.status}
              onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Next step">
            <input
              className="input"
              value={lead.nextStep}
              onChange={(e) => updateLead(lead.id, { nextStep: e.target.value })}
            />
          </FieldRow>
          <FieldRow label="Notes">
            <textarea
              className="input min-h-[80px]"
              value={lead.notes}
              onChange={(e) => updateLead(lead.id, { notes: e.target.value })}
            />
          </FieldRow>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/lead-generation/library/cold-emails/email-1-intro" label="Cold Email 1" />
        <QuickLink href="/lead-generation/brochures/executive" label="Executive brochure" />
        <QuickLink href="/lead-generation/library/whatsapp-templates/wa-3-brochure" label="WhatsApp follow-up" />
        <QuickLink href="/lead-generation/library/call-scripts/discovery-demo-script" label="Discovery script" />
        <QuickLink href="/lead-generation/library/follow-ups/followup-post-demo" label="Post-demo email" />
        <QuickLink href="/lead-generation/library/client-documents/doc-qualification" label="Qualification checklist" />
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn("card block p-3 text-[13px] font-medium text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40")}>
      {label} →
    </Link>
  );
}
