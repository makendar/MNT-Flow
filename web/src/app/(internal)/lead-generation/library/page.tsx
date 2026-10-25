import Link from "next/link";
import { PageHeader, Tabs } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { countByCategory } from "@/lib/lead-generation/assets";
import { ASSET_CATEGORIES } from "@/lib/lead-generation/types";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

export const metadata = { title: "Asset library · Lead Generation" };

export default async function LeadLibraryPage() {
  await requireInternal("leadgen:view");
  const counts = countByCategory();
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader title="Asset library" subtitle="Preview, copy, edit, and reuse templates. Edits can be saved locally in your browser." />
      <Tabs tabs={tabs} active="library" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSET_CATEGORIES.map((c) => (
          <Link key={c.id} href={`/lead-generation/library/${c.id}`} className="card block p-5 transition-colors hover:border-blue-300 hover:shadow-md">
            <div className="text-sm font-semibold text-slate-900">{c.folder}</div>
            <p className="mt-1 text-xs text-slate-500">{c.description}</p>
            <p className="mt-3 text-[11px] font-medium text-teal-700">{counts[c.id] ?? 0} templates</p>
          </Link>
        ))}
      </div>
    </>
  );
}
