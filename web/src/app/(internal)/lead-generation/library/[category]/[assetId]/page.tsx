import { notFound } from "next/navigation";
import { AssetEditor } from "@/components/lead-generation/asset-editor";
import { DemoChecklist } from "@/components/lead-generation/demo-checklist";
import { PageHeader, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getAsset } from "@/lib/lead-generation/assets";
import { ASSET_CATEGORIES, type AssetCategory } from "@/lib/lead-generation/types";
import { DEMO_LEADS } from "@/lib/lead-generation/demo-leads";

export async function generateMetadata({ params }: { params: Promise<{ category: string; assetId: string }> }) {
  const { assetId } = await params;
  const asset = getAsset(assetId);
  return { title: asset ? `${asset.title} · Lead Generation` : "Lead Generation" };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ category: string; assetId: string }> }) {
  const user = await requireInternal("leadgen:view");
  const { category, assetId } = await params;
  const cat = ASSET_CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound();
  const asset = getAsset(assetId);
  if (!asset || asset.category !== (category as AssetCategory)) notFound();
  const canEdit = can(user, "leadgen:edit");
  const tabs = [
    { key: "hub", label: "Workspace", href: "/lead-generation" },
    { key: "leads", label: "Demo leads", href: "/lead-generation/leads", count: DEMO_LEADS.length },
    { key: "library", label: "Asset library", href: "/lead-generation/library" },
  ];

  return (
    <>
      <PageHeader
        title={asset.title}
        subtitle={asset.summary}
        crumbs={[
          ["Lead Generation", "/lead-generation"],
          ["Asset library", "/lead-generation/library"],
          [cat.folder, `/lead-generation/library/${category}`],
          [asset.title],
        ]}
      />
      <Tabs tabs={tabs} active="library" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssetEditor asset={asset} canEdit={canEdit} />
        </div>
        <div>{category === "call-scripts" && <DemoChecklist />}</div>
      </div>
    </>
  );
}
