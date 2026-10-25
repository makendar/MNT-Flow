import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/format";

export function PageHeader({ title, subtitle, crumbs, actions }: { title: string; subtitle?: React.ReactNode; crumbs?: [string, string?][]; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {crumbs.map(([label, href], i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
                {href ? <Link href={href} className="hover:text-slate-800 hover:underline">{label}</Link> : <span className="text-slate-700">{label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClass }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("card", className)}>
      {(title || actions) && (
        <div className="card-h">
          {title && <h2 className="card-t">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClass ?? "p-4"}>{children}</div>
    </section>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "slate", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", TONES[tone])}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  // invoices
  paid: "green", not_due: "slate", partially_paid: "blue", overdue: "red", disputed: "amber", on_hold: "violet",
  // promises
  open: "blue", fulfilled: "green", partially_fulfilled: "amber", missed: "red", cancelled: "slate",
  // issues
  investigating: "blue", waiting_customer: "amber", waiting_internal: "amber", waiting_document: "amber", resolved: "green", closed: "slate",
  // quotes / orders
  draft: "slate", sent: "blue", awaiting_response: "amber", negotiation: "violet", accepted: "green", rejected: "red", expired: "slate",
  received: "slate", confirmation_pending: "amber", confirmed: "blue", in_progress: "blue", ready_for_dispatch: "teal", partially_dispatched: "teal",
  dispatched: "teal", delivered: "green", completed: "green", planned: "slate",
  // tasks / actions / customers
  done: "green", active: "green", inactive: "slate",
  high: "red", medium: "amber", low: "slate",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const text = label ?? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return <Badge tone={STATUS_TONE[value] ?? "slate"}>{text}</Badge>;
}

export function Kpi({ label, value, sub, href, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: "red" | "amber" | "default" }) {
  const body = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-slate-900")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-600/30">
      {body}
    </Link>
  ) : (
    <div className="card p-3">{body}</div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <Inbox className="mb-1 h-6 w-6 text-slate-300" aria-hidden />
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {hint && <div className="max-w-md text-xs text-slate-500">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function Select({ name, options, defaultValue, placeholder, required, className, id }: {
  name: string; options: readonly { value: string; label: string }[]; defaultValue?: string | null; placeholder?: string; required?: boolean; className?: string; id?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} required={required} className={cn("input", className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** GET filter form; values live in the URL so views are shareable and work without JS. */
export function FilterBar({ children, resetHref }: { children: React.ReactNode; resetHref: string }) {
  return (
    <form method="get" className="card mb-4 flex flex-wrap items-end gap-2 p-3">
      {children}
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">Apply</button>
        <Link href={resetHref} className="btn">Reset</Link>
      </div>
    </form>
  );
}

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={t.key === active}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium",
            t.key === active ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded bg-slate-100 px-1.5 text-[11px] text-slate-600">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, [string, Tone]> = { import: ["Imported", "violet"], system: ["System", "slate"], user: ["User", "blue"], portal: ["Customer portal", "teal"] };
  const [label, tone] = map[source] ?? [source, "slate"];
  return <Badge tone={tone}>{label}</Badge>;
}
