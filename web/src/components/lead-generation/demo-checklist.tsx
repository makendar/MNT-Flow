"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Confirm DEMO DATA banner is visible",
  "Open a demo lead from the list",
  "Set status: New → Contacted",
  "Personalize Cold Email 1 and copy (do not send from app)",
  "Preview Executive brochure — copy share text",
  "Mark Responded → add qualification note",
  "Show WhatsApp template (manual send only)",
  "Open discovery call script",
  "Complete Call Notes fields",
  "Optional: jump to Receivables / Action Center",
  "Set Demo Completed → Opportunity",
  "Copy post-demo follow-up template",
] as const;

const KEY = "mnt-leadgen-demo-checklist";

export function DemoChecklist() {
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (i: number) => {
    const next = { ...done, [i]: !done[i] };
    setDone(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const completed = Object.values(done).filter(Boolean).length;

  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Demo checklist</h2>
        <span className="text-[11px] text-slate-500">{completed}/{STEPS.length} complete</span>
      </div>
      <ul className="divide-y divide-slate-100 p-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-slate-50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600/30"
                checked={!!done[i]}
                onChange={() => toggle(i)}
              />
              <span className={done[i] ? "text-[13px] text-slate-500 line-through" : "text-[13px] text-slate-800"}>{label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 px-4 py-2">
        <button type="button" className="btn btn-sm" onClick={() => { setDone({}); localStorage.removeItem(KEY); }}>
          Reset checklist
        </button>
      </div>
    </section>
  );
}
