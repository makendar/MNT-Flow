"use client";

import { Calendar, Smartphone, Zap } from "lucide-react";

export function WhatsappMobileBrochure() {
  return (
    <article className="mx-auto max-w-sm overflow-hidden rounded-3xl border-2 border-teal-200 bg-gradient-to-b from-violet-600 via-blue-600 to-teal-500 text-white shadow-xl">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-teal-100">
          <Smartphone className="h-4 w-4" aria-hidden /> Mobile brochure · Demo
        </div>
        <h1 className="mt-3 text-xl font-bold leading-tight">MNT Flow</h1>
        <p className="mt-1 text-sm text-blue-100">Manufacturing cash & follow-up intelligence</p>
      </div>
      <div className="mx-4 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-inner">
        <p className="text-[13px] font-semibold text-slate-900">What it does</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">Shows overdue receivables, why they&apos;re stuck, and who must act next — in one app.</p>
        <p className="mt-3 text-[13px] font-semibold text-slate-900">Who it&apos;s for</p>
        <p className="mt-1 text-xs text-slate-600">Finance, sales & ops leaders at B2B manufacturers.</p>
        <p className="mt-3 text-[13px] font-semibold text-slate-900">Top 3 benefits</p>
        <ul className="mt-1 space-y-1 text-xs text-slate-600">
          <li>• One queue instead of spreadsheets</li>
          <li>• Blockers visible on the invoice</li>
          <li>• Demo portal for customer docs</li>
        </ul>
      </div>
      <div className="mx-4 mt-4 flex aspect-[16/10] items-center justify-center rounded-2xl border-2 border-dashed border-white/40 bg-black/20 text-center text-xs text-white/80">
        Product screenshot / demo capture placeholder
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-lg">
          <Calendar className="h-5 w-5 shrink-0 text-teal-600" aria-hidden />
          <div className="text-left">
            <p className="text-sm font-bold">See it in action — 15 minutes</p>
            <p className="text-[11px] text-slate-500">[Booking Link]</p>
          </div>
          <Zap className="ml-auto h-5 w-5 text-amber-500" aria-hidden />
        </div>
        <p className="mt-3 text-center text-[10px] text-blue-100">Fictional demo · Share via WhatsApp manually</p>
      </div>
    </article>
  );
}

export const WHATSAPP_MOBILE_SHARE_TEXT = `MNT Flow (demo) — see overdue invoices & blockers in one place.
Top benefits in 1 screen. 15-min demo: [Booking Link]`;
