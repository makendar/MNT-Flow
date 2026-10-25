"use client";

import { Building2, CheckCircle2, Layers, LineChart, Shield, Sparkles } from "lucide-react";

export function ExecutiveBrochure() {
  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <header className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-8 py-10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.15),transparent_50%)]" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">Demo brochure · MNT Flow</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Cash intelligence for manufacturers who can&apos;t afford blind spots</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-200">One workspace to see what is pending, what is blocked, who owns the next step, and whether it is actually resolved.</p>
      </header>
      <div className="grid gap-0 md:grid-cols-2">
        <section className="border-b border-slate-100 p-8 md:border-b-0 md:border-r">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Building2 className="h-4 w-4 text-blue-700" /> The challenge</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Overdue invoices, disputes, and missing documents hide in email threads. Finance, sales, and operations each hold part of the story — leadership sees balances, not root causes.
          </p>
        </section>
        <section className="border-b border-slate-100 p-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-teal-600" /> Our solution</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            <strong className="font-medium text-slate-800">MNT Flow</strong> connects receivables, issues, dispatch context, and a prioritized Action Center — with plain-language reasons on every exception.
          </p>
        </section>
      </div>
      <section className="border-b border-slate-100 bg-slate-50/80 px-8 py-8">
        <h2 className="text-sm font-semibold text-slate-900">Key capabilities</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { icon: LineChart, t: "Receivables visibility", d: "Ageing, status, promises, and activity in one record." },
            { icon: Shield, t: "Issue & dispute workflow", d: "Checklists, evidence, and unblock steps finance trusts." },
            { icon: Layers, t: "Prioritized Action Center", d: "Rule-based priority with an explainable reason sentence." },
            { icon: CheckCircle2, t: "Customer portal (demo)", d: "Shared documents and queries — scoped per customer." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Icon className="h-5 w-5 shrink-0 text-blue-700" aria-hidden />
              <div>
                <div className="text-[13px] font-semibold text-slate-900">{t}</div>
                <div className="mt-0.5 text-xs text-slate-500">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-6 px-8 py-8 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Business benefits</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] text-slate-600">
            <li>Fewer status meetings — exceptions surface with owners</li>
            <li>Faster handoffs between sales, finance, and operations</li>
            <li>Audit-friendly trail of comments, documents, and actions</li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">How it works</h2>
          <ol className="mt-2 space-y-2 text-[13px] text-slate-600">
            <li><span className="font-semibold text-slate-800">1.</span> Import or record customers, invoices, and orders</li>
            <li><span className="font-semibold text-slate-800">2.</span> System highlights blockers and assigns priority</li>
            <li><span className="font-semibold text-slate-800">3.</span> Teams work the Action Center to resolution</li>
          </ol>
        </div>
      </section>
      <footer className="bg-gradient-to-r from-blue-700 to-teal-600 px-8 py-8 text-white">
        <p className="text-lg font-semibold">See it in 15 minutes</p>
        <p className="mt-1 text-sm text-blue-100">Walk through demo data — synthetic companies only.</p>
        <p className="mt-4 text-sm font-medium">[Booking Link] · [Approved contact email]</p>
        <p className="mt-2 text-[11px] text-blue-100/90">Fictional demo brochure — not a contractual offer.</p>
      </footer>
    </article>
  );
}

export const EXECUTIVE_SHARE_TEXT = `MNT Flow — manufacturing receivables & action intelligence (demo).
One place for overdue invoices, blockers, owners, and next steps.
15-min walkthrough: [Booking Link]`;
