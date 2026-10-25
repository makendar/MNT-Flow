import { LogOut } from "lucide-react";
import { Sidebar, type NavItem } from "@/components/shell/sidebar";
import { requirePortal } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";
import { db } from "@/lib/db";

const NAV: NavItem[] = [
  { href: "/portal", label: "Home", icon: "home" },
  { href: "/portal/orders", label: "Orders & deliveries", icon: "orders" },
  { href: "/portal/invoices", label: "Invoices", icon: "invoices" },
  { href: "/portal/documents", label: "Shared documents", icon: "documents" },
  { href: "/portal/queries", label: "My queries", icon: "queries" },
];

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const user = await requirePortal();
  const customer = await db.customer.findFirst({ where: { id: user.customerId, orgId: user.orgId }, select: { name: true } });
  return (
    <div className="min-h-screen">
      <Sidebar items={NAV} title="Customer Portal" subtitle={`with ${user.org.name}`} />
      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 pl-14 pr-4 backdrop-blur lg:pl-6">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-800">{customer?.name}</div>
            <div className="text-[11px] text-slate-500">Signed in as {user.name}</div>
          </div>
          {user.org.isDemo && <span className="ml-auto rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">DEMO DATA</span>}
          <form action={logout} className={user.org.isDemo ? "" : "ml-auto"}>
            <button className="btn btn-sm"><LogOut className="h-3.5 w-3.5" />Sign out</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
