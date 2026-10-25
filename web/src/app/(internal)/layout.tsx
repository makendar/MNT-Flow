import Link from "next/link";
import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { Sidebar, type NavItem } from "@/components/shell/sidebar";
import { requireInternal } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/auth/permissions";
import { logout } from "@/lib/actions/auth";
import { db } from "@/lib/db";
import { dateFromISO } from "@/lib/dates";
import { ROLES, labelOf } from "@/lib/domain/constants";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/overview", label: "Overview", icon: "overview", perm: "overview:view" },
  { href: "/action-center", label: "Action Center", icon: "actions", perm: "actions:view" },
  { href: "/customers", label: "Customers", icon: "customers", perm: "customers:view" },
  { href: "/quotations", label: "Quotations", icon: "quotes", perm: "quotes:view" },
  { href: "/lead-generation", label: "Lead Generation", icon: "leadgen", perm: "leadgen:view" },
  { href: "/orders", label: "Orders", icon: "orders", perm: "orders:view" },
  { href: "/dispatch", label: "Dispatch & Delivery", icon: "dispatch", perm: "orders:view" },
  { href: "/receivables", label: "Receivables", icon: "receivables", perm: "receivables:view" },
  { href: "/issues", label: "Issues & Disputes", icon: "issues", perm: "issues:view" },
  { href: "/tasks", label: "Tasks & Follow-ups", icon: "tasks", perm: "tasks:view" },
  { href: "/reports", label: "Reports & Insights", icon: "reports", perm: "reports:view" },
  { href: "/imports", label: "Data Imports", icon: "imports", perm: "imports:view" },
  { href: "/settings", label: "Settings", icon: "settings", perm: "settings:view" },
];

export default async function InternalLayout({ children }: LayoutProps<"/">) {
  const user = await requireInternal();
  const myDue = await db.actionItem.count({ where: { orgId: user.orgId, ownerId: user.id, status: "open", dueDate: { lte: dateFromISO(user.today) } } });
  const items = NAV.filter((n) => can(user, n.perm)).map(({ perm: _p, ...n }) => (n.href === "/action-center" ? { ...n, badge: myDue } : n));

  return (
    <div className="min-h-screen">
      <Sidebar items={items} title="MNT Flow" subtitle={user.org.name} />
      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 pl-14 pr-4 backdrop-blur lg:pl-6">
          <div className="hidden min-w-0 md:block">
            <div className="truncate text-[13px] font-semibold text-slate-800" title="Organization">{user.org.name}</div>
            <div className="text-[11px] text-slate-500">Reporting date {user.today.split("-").reverse().join("-")} · {user.org.timezone}</div>
          </div>
          <form action="/search" className="relative ml-auto w-full max-w-xs" role="search">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" aria-hidden />
            <input name="q" className="input pl-8" placeholder="Search customers, invoices, orders…" aria-label="Global search" />
          </form>
          {user.org.isDemo && (
            <span className="hidden rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 sm:inline" title="All companies and transactions are synthetic demo data">
              DEMO DATA
            </span>
          )}
          <Link href={`/action-center?owner=${user.id}&due=today`} className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`${myDue} of your actions are due or overdue`}>
            <Bell className="h-5 w-5" />
            {myDue > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{myDue}</span>}
          </Link>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-[11px] font-semibold text-white">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[13px] font-medium text-slate-800">{user.name}</span>
                <span className="block text-[11px] text-slate-500">{labelOf(ROLES, user.role)}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </summary>
            <div className="card absolute right-0 mt-1 w-56 p-1 shadow-lg">
              <div className="px-3 py-2 text-xs text-slate-500">
                Signed in as <span className="font-medium text-slate-700">{user.email}</span>
              </div>
              {can(user, "settings:view") && <Link href="/settings" className="block rounded px-3 py-1.5 text-[13px] hover:bg-slate-100">Settings</Link>}
              <Link href="/settings?tab=demo" className="block rounded px-3 py-1.5 text-[13px] hover:bg-slate-100">Switch demo role</Link>
              <form action={logout}>
                <button className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-[13px] text-red-700 hover:bg-red-50">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </form>
            </div>
          </details>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
