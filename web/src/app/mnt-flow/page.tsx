import Link from "next/link";
import {
  ArrowRight, BarChart3, Bot, CheckCircle2, ClipboardCheck, FileSpreadsheet, IndianRupee, LayoutList, Lock, MessageSquareWarning, ShieldCheck, ShoppingCart, Truck, UserCheck, Users,
} from "lucide-react";

export const metadata = {
  title: "MNT Flow — Manufacturing, Customer & Cash Intelligence",
  description: "One place to track customer orders, resolve payment blockers, manage follow-ups, and understand what is preventing cash from coming in.",
};

const PREVIEW = [
  { p: "High", t: "Collect ₹1,80,000 overdue on DPC/26-27/0412", c: "Kovai Pumps (fictional)", why: "45 days overdue, unresolved missing delivery proof", o: "Karthik S.", d: "Today" },
  { p: "High", t: "Missed promise of ₹3,15,000", c: "Cauvery Auto (fictional)", why: "Promise date passed without payment", o: "Priya R.", d: "Today" },
  { p: "Medium", t: "ISS-1003: PO number mismatch on invoice", c: "Chennai Precision (fictional)", why: "Customer AP cannot match invoice to PO", o: "Karthik S.", d: "Tomorrow" },
  { p: "Medium", t: "Follow up QT/26-27/0101 (₹6,50,000)", c: "Mysuru Electricals (fictional)", why: "Follow-up 3 days late, validity ends soon", o: "Vignesh K.", d: "Overdue" },
];

function PreviewTable({ compact }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-xs font-semibold text-slate-700">Action Center</span>
        <span className="text-[10px] text-slate-500">Illustrative example · fictional data</span>
      </div>
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-wide text-slate-500">
          <tr><th className="px-3 py-1.5">Priority</th><th className="px-3 py-1.5">Action</th>{!compact && <th className="px-3 py-1.5">Why</th>}<th className="px-3 py-1.5">Owner</th><th className="px-3 py-1.5">Due</th></tr>
        </thead>
        <tbody>
          {PREVIEW.map((r) => (
            <tr key={r.t} className="border-t border-slate-100 align-top">
              <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.p === "High" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{r.p}</span></td>
              <td className="px-3 py-2"><div className="font-medium text-slate-800">{r.t}</div><div className="text-[11px] text-slate-500">{r.c}</div></td>
              {!compact && <td className="px-3 py-2 text-[11px] text-slate-600">{r.why}</td>}
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.o}</td>
              <td className={`whitespace-nowrap px-3 py-2 ${r.d === "Overdue" ? "text-red-700" : "text-slate-700"}`}>{r.d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/mnt-flow" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-nav text-[11px] font-bold text-teal-400">MF</span>
            <span className="text-sm font-semibold text-slate-900">MNT Flow</span>
            <span className="hidden text-xs text-slate-500 sm:inline">by MNT Analytics</span>
          </Link>
          <nav className="ml-auto hidden gap-5 text-[13px] text-slate-600 md:flex">
            <a href="#problems" className="hover:text-slate-900">Problems</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#security" className="hover:text-slate-900">Security</a>
          </nav>
          <Link href="/login" className="btn btn-primary ml-auto md:ml-0">Sign in to demo</Link>
        </div>
      </header>

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">For manufacturers in Coimbatore, Chennai, Bengaluru and across India</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
              One place to track customer orders, resolve payment blockers and see what is holding up cash.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
              MNT Flow connects your customers, quotations, orders, dispatches, invoices and disputes into one action-oriented workspace. Every exception gets an owner, a reason, a next step and a due date, and you can see when it is actually resolved.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary h-10 px-5 text-sm">Explore the live demo <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how" className="btn h-10 px-5 text-sm">See how it works</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Works alongside Tally, Excel and your ERP. Start with a CSV export; no system replacement.</p>
          </div>
          <PreviewTable compact />
        </div>
      </section>

      <section id="problems" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-slate-900">The questions every manufacturer asks on Monday morning</h2>
        <p className="mt-1 max-w-2xl text-[14px] text-slate-600">What is pending? What is blocked, and why? Who owns it? What happens next, and by when? Has it actually been resolved?</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            [FileSpreadsheet, "Scattered across systems", "Orders in Excel, invoices in Tally, promises in WhatsApp, complaints in email. Nobody sees the full picture."],
            [MessageSquareWarning, "Payments blocked by small things", "A missing POD, a GRN reference or a PO mismatch can hold up lakhs of rupees for weeks."],
            [Users, "Follow-ups depend on memory", "Who promised what, by when? Missed promises are noticed late, if at all."],
            [UserCheck, "No clear owner", "Finance waits for dispatch, dispatch waits for sales. Exceptions fall between teams."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof FileSpreadsheet;
            return (
              <div key={t as string} className="rounded-lg border border-slate-200 p-4">
                <I className="h-5 w-5 text-blue-700" />
                <h3 className="mt-2 text-[14px] font-semibold text-slate-900">{t as string}</h3>
                <p className="mt-1 text-[13px] text-slate-600">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="how" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-semibold text-slate-900">How MNT Flow works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Import", "Upload customers, orders, invoices and payments from Excel or a Tally/ERP export. The wizard validates every row before anything is saved."],
              ["Flag", "Deterministic rules highlight overdue invoices, missed promises, missing documents and at-risk deliveries, each with a plain-language reason."],
              ["Assign", "Every exception gets an owner across finance, sales, dispatch or quality, with a recommended next step and a due date."],
              ["Resolve", "Track to closure with evidence, customer confirmation and a full audit trail, including whether the invoice was actually unblocked."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">{i + 1}</div>
                <h3 className="mt-2 text-[14px] font-semibold text-slate-900">{t}</h3>
                <p className="mt-1 text-[13px] text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-slate-900">Core features</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [LayoutList, "Action Center", "A single prioritized queue with explainable priority, owners, due dates, comments and history."],
            [IndianRupee, "Receivables & ageing", "Outstanding and overdue balances reconciled to invoices, partial payments and credit notes, with configurable ageing buckets."],
            [MessageSquareWarning, "Issues & disputes", "Missing POD, GRN or PO, quality and pricing disputes, tracked from report to confirmed resolution."],
            [ClipboardCheck, "Payment promises", "Record who promised what and by when. Fulfilment is derived from actual receipts; missed promises create review actions."],
            [ShoppingCart, "Quotations & orders", "Lightweight follow-up tracking, conversion to orders and delivery commitments with delay reasons."],
            [Truck, "Dispatch & delivery", "Committed vs actual dispatch, delivery confirmation and proof-of-delivery tracking."],
            [Users, "Customer portal", "Customers see their own orders, invoices and shared documents, raise queries and upload evidence securely."],
            [BarChart3, "Reports & CSV export", "Ageing, top overdue customers, issue resolution time, missed promises and more, ready for the Monday review."],
            [Bot, "AI assistance, with approval", "Draft follow-up emails and issue summaries from your own records. Optional, clearly labelled, and never sent automatically."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof LayoutList;
            return (
              <div key={t as string} className="rounded-lg border border-slate-200 p-4">
                <I className="h-5 w-5 text-teal-700" />
                <h3 className="mt-2 text-[14px] font-semibold text-slate-900">{t as string}</h3>
                <p className="mt-1 text-[13px] text-slate-600">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">See the reason behind every priority</h2>
            <p className="mt-2 text-[14px] text-slate-600">Priorities are calculated from transparent, configurable rules: days overdue, amount, missed promises, unresolved issues, missing documents and upcoming commitments. Not a black-box score.</p>
            <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-[13px] italic text-slate-700">&ldquo;High priority because this invoice is 45 days overdue, has an outstanding balance of ₹1,80,000, and has an unresolved delivery-document issue.&rdquo;</p>
          </div>
          <PreviewTable />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-slate-900">Built for every team that touches the customer</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Owners & executives", ["Live view of receivables and overdue risk", "What is blocking cash, by category", "Customer attention indicators"]],
            ["Finance", ["Ageing that reconciles to invoices", "Promises and follow-ups in one place", "Disputes routed to the right team"]],
            ["Sales", ["Quotation follow-ups that don't slip", "Order status and commitments at a glance", "Context before every customer call"]],
            ["Operations & quality", ["Delivery commitments and delays", "POD and document requests", "Quality complaints with evidence"]],
          ].map(([t, items]) => (
            <div key={t as string} className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-[14px] font-semibold text-slate-900">{t as string}</h3>
              <ul className="mt-2 space-y-1.5">
                {(items as string[]).map((i) => <li key={i} className="flex gap-2 text-[13px] text-slate-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-blue-700" />Security & data handling</h2>
            <ul className="mt-4 space-y-2 text-[13px] text-slate-700">
              {["Every record belongs to one organization; access is checked on the server for every operation.", "Role-based permissions for finance, sales, operations, quality, auditors and customer users.", "Private document storage; customers only see documents explicitly shared with them.", "Append-only activity and audit trail.", "AI is optional and never sends messages or makes credit decisions."].map((x) => (
                <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Practical to start</h2>
            <ul className="mt-4 space-y-2 text-[13px] text-slate-700">
              {["Start with Excel/CSV exports from Tally or your ERP; no integration project needed.", "Complements your accounting system and ERP rather than replacing them.", "Designed for small and medium manufacturers, with plans that scale to multi-site operations.", "Pricing is shared during pilot discussions with MNT Analytics."].map((x) => (
                <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">See it with a realistic demo workspace</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-slate-600">Explore a fictional precision-components manufacturer with customers across Tamil Nadu and Karnataka. All companies and figures in the demo are synthetic.</p>
        <Link href="/login" className="btn btn-primary mt-6 h-10 px-6 text-sm">Open the demo <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} MNT Analytics · Coimbatore, Tamil Nadu</span>
          <span>MNT Flow: Manufacturing, Customer &amp; Cash Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
