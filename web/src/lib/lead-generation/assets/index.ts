import type { AssetCategory, LeadAsset } from "../types";
import { BROCHURE_ASSETS } from "./brochures";
import { CALL_SCRIPT_ASSETS } from "./call-scripts";
import { CLIENT_DOCUMENT_ASSETS } from "./client-documents";
import { COLD_EMAIL_ASSETS } from "./cold-emails";
import { DEMO_ASSET_ITEMS } from "./demo-assets";
import { FOLLOW_UP_ASSETS } from "./follow-ups";
import { WHATSAPP_ASSETS } from "./whatsapp";

export const ALL_LEAD_ASSETS: LeadAsset[] = [
  ...BROCHURE_ASSETS,
  ...COLD_EMAIL_ASSETS,
  ...WHATSAPP_ASSETS,
  ...CALL_SCRIPT_ASSETS,
  ...FOLLOW_UP_ASSETS,
  ...DEMO_ASSET_ITEMS,
  ...CLIENT_DOCUMENT_ASSETS,
];

export function assetsByCategory(category: AssetCategory): LeadAsset[] {
  return ALL_LEAD_ASSETS.filter((a) => a.category === category);
}

export function getAsset(id: string): LeadAsset | undefined {
  return ALL_LEAD_ASSETS.find((a) => a.id === id);
}

export function countByCategory(): Record<AssetCategory, number> {
  const counts = {} as Record<AssetCategory, number>;
  for (const a of ALL_LEAD_ASSETS) counts[a.category] = (counts[a.category] ?? 0) + 1;
  return counts;
}
