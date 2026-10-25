"use client";

import { ArrowRight, FileWarning, RefreshCw, Users, Workflow } from "lucide-react";

export function ProblemSolutionBrochure() {
  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="bg-gradient-to-r from-amber-50 via-white to-teal-50 px-8 py-8">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">Demo · Illustrative examples only</span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">From scattered follow-ups to one accountable queue</h1>
      </div>
      <section className="border-t border-slate-100 px-8 py-8">
        <div className="flex items-start gap-3">
          <FileWarning className="mt-0.5 h-6 w-6 text-red-600" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">The challenge</h2>
            <p className="mt-2 text-[13px] text-slate-600">Demo manufacturer &quot;Kovai Pumps (Demo)&quot; tracks an overdue invoice in finance, a missing POD with dispatch, and a sales call note in email — none linked on one screen.</p>
          </div>
        </div>
      </section>
      <section className="border-t border-slate-100 bg-slate-900 px-8 py-8 text-white">
        <div className="flex items-start gap-3">
          <Workflow className="mt-0.5 h-6 w-6 text-teal-400" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Our solution</h2>
            <p className="mt-2 text-sm text-slate-200">MNT Flow links the invoice, order, issue, and Action Center item — with a reason such as: overdue + missing document + assigned owner.</p>
          </div>
        </div>
      </section>
      <section className="border-t border-slate-100 px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          {["Record", "Prioritize", "Assign", "Resolve"].map((step, i) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-semibold text-blue-900 ring-1 ring-blue-100">{step}</div>
              {i < 3 && <ArrowRight className="hidden h-4 w-4 text-slate-300 md:block" aria-hidden />}
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-slate-100 bg-teal-50/50 px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Business value (qualitative demo)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { icon: RefreshCw, t: "Less manual chasing", d: "Follow-ups and promises sit on the invoice, not in inboxes." },
            { icon: Users, t: "Centralized workflow", d: "Sales, finance, and ops share one exception queue." },
            { icon: Workflow, t: "Better visibility", d: "Leadership drills from KPIs to the records behind them." },
            { icon: FileWarning, t: "Stronger follow-up", d: "Mock AI drafts help wording — you copy; nothing auto-sends." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-teal-100 bg-white p-4">
              <Icon className="h-5 w-5 text-teal-700" aria-hidden />
              <div className="mt-2 text-[13px] font-semibold text-slate-900">{t}</div>
              <p className="mt-1 text-xs text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">No ROI percentages or performance statistics — examples show workflow fit only.</p>
      </section>
      <footer className="border-t border-slate-200 px-8 py-8 text-center">
        <p className="text-lg font-semibold text-slate-900">Book a demo</p>
        <p className="mt-1 text-sm text-slate-600">10–20 minutes · synthetic data · [Booking Link]</p>
      </footer>
    </article>
  );
}

export const PROBLEM_SOLUTION_SHARE_TEXT = `See how MNT Flow links invoices, blockers & owners (demo scenario — illustrative).
Book 10–20 min: [Booking Link]`;
