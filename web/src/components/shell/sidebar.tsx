"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, ClipboardList, FileText, FolderInput, Gauge, IndianRupee, LayoutList, Megaphone, Menu, PackageCheck, Settings, ShieldAlert, ShoppingCart, Truck, Users, X,
  FileQuestion, Receipt, FolderOpen, MessageSquareWarning, Home,
} from "lucide-react";
import { cn } from "@/lib/format";

const ICONS = {
  overview: Gauge, actions: LayoutList, customers: Users, quotes: FileText, orders: ShoppingCart, dispatch: Truck, receivables: IndianRupee,
  issues: ShieldAlert, tasks: ClipboardList, reports: BarChart3, imports: FolderInput, settings: Settings, leadgen: Megaphone,
  home: Home, invoices: Receipt, documents: FolderOpen, queries: MessageSquareWarning, delivered: PackageCheck, help: FileQuestion,
};
export type IconName = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

export function Sidebar({ items, title, subtitle }: { items: NavItem[]; title: string; subtitle: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col bg-nav text-slate-300" aria-label="Main">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-500 text-[11px] font-bold text-nav">MF</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          <div className="truncate text-[11px] text-slate-400">{subtitle}</div>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = path === it.href || (it.href !== "/portal" && path.startsWith(it.href + "/"));
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active ? "bg-nav-2 font-medium text-white" : "hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-teal-400" : "text-slate-400")} aria-hidden />
                <span className="flex-1 truncate">{it.label}</span>
                {!!it.badge && <span className="rounded bg-red-500/90 px-1.5 text-[10px] font-semibold text-white">{it.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-3 text-[11px] text-slate-500">MNT Flow by MNT Analytics</div>
    </nav>
  );

  return (
    <>
      <button type="button" className="btn fixed left-3 top-3 z-40 h-8 w-8 px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </button>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            {nav}
            <button type="button" className="absolute right-2 top-3 rounded p-1 text-slate-300 hover:text-white" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
