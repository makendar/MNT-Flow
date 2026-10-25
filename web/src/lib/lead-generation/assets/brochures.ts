import type { LeadAsset } from "../types";

export const BROCHURE_ASSETS: LeadAsset[] = [
  {
    id: "brochure-executive",
    category: "brochures",
    title: "Brochure 1 — Executive / Corporate",
    summary: "Premium minimal one-pager for decision-makers.",
    brochureId: "executive",
    tags: ["email", "print"],
    body: "Open the visual brochure preview for sharing. Use Copy share summary for email/WhatsApp intro text.",
  },
  {
    id: "brochure-problem-solution",
    category: "brochures",
    title: "Brochure 2 — Problem → Solution → Result",
    summary: "Visual sales-oriented flow with illustrative demo examples.",
    brochureId: "problem-solution",
    tags: ["email", "sales"],
    body: "Open the visual brochure preview. Examples are labelled illustrative — not measured ROI.",
  },
  {
    id: "brochure-whatsapp-mobile",
    category: "brochures",
    title: "Brochure 3 — WhatsApp / Mobile",
    summary: "Short, colorful mobile-first brochure.",
    brochureId: "whatsapp-mobile",
    tags: ["whatsapp", "mobile"],
    body: "Optimized for smartphone viewing after WhatsApp share.",
  },
];
