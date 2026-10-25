import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, Tabs } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { assetsByCategory } from "@/lib/lead-generation/assets";
import { ASSET_CATEGORIES, type AssetCategory } from "@/lib/lead-generation/types";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = ASSET_CATEGORIES.find((c) => c.id === category);
  return { title: cat ? `${cat.folder} · Lead Generation` : "Lead Generation" };
}

export default async function CategoryAssetsPage({ params }: { params: Promise<{ category: string }> }) {
  await requireInternal("leadgen:view");
  const { category } = await params;
  const meta = ASSET_CATEGORIES.find((c) => c.id === category);
  if (!meta) notFound();
  const items = assetsByCategory(category as AssetCategory);
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader title={meta.folder} subtitle={meta.description} crumbs={[["Lead Generation", "/lead-generation"], ["Asset library", "/lead-generation/library"], [meta.folder]]} />
      <Tabs tabs={tabs} active="library" />
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link href={`/lead-generation/library/${category}/${a.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-blue-300">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">{a.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">{a.summary}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {a.requiresLegalReview && <Badge tone="amber">Review required</Badge>}
                {a.brochureId && <Badge tone="teal">Visual brochure</Badge>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
