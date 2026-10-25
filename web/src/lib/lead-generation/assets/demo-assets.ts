import type { LeadAsset } from "../types";

export const DEMO_ASSET_ITEMS: LeadAsset[] = [
  {
    id: "demo-walkthrough-narrative",
    category: "demo-assets",
    title: "Lead Generation module — live demo narrative",
    summary: "Speaker notes for presenting the full outreach → opportunity flow.",
    body: `# Demo narrative (≈8 minutes)

1. **Hub** — Show pipeline KPIs and DEMO banner.
2. **Import lead** — Select "Evergreen Electricals (Demo)" → status New.
3. **Outreach** — Cold Email 1 → replace [First Name], [Company] → Copy (stress: not sent from app).
4. **Brochure** — Executive brochure → Copy share text.
5. **Track** — Mark Contacted → Responded; add qualification note.
6. **WhatsApp** — Show template 3 (manual send only).
7. **Discovery** — Open call script; tick checklist; fill Call Notes.
8. **Bridge** — Open Receivables / Action Center to show product depth.
9. **Close** — Set Demo Completed → Opportunity; copy post-demo follow-up.

Remind audience: all names and metrics are fictional unless labelled otherwise.`,
  },
  {
    id: "demo-screenshot-placeholders",
    category: "demo-assets",
    title: "Product screenshot placeholders",
    summary: "Replace with approved product captures before external sharing.",
    body: `# Screenshot placeholders

- Overview KPI strip
- Action Center reason sentence
- Receivables invoice detail
- Lead Generation pipeline

**Action:** Export PNGs from demo tenant and store under \`Lead Generation/Demo Assets/screenshots/\` when available.`,
  },
];
