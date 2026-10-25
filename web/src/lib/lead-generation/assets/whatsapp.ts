import type { LeadAsset } from "../types";

export const WHATSAPP_ASSETS: LeadAsset[] = [
  {
    id: "wa-1-intro",
    category: "whatsapp-templates",
    title: "Message 1 — Introduction",
    summary: "Short, conversational opener with permission to continue.",
    tags: ["touch-1"],
    meta: { touch: 1, cta: "Reply OK if you'd like a one-page overview." },
    body: `Hi [First Name] — [Sender Name] here from MNT Analytics (MNT Flow).

We help manufacturing teams see what's blocking cash — overdue invoices, disputes, missing docs — in one place instead of scattered email.

Is WhatsApp okay for a quick note about [Company]'s follow-up process?

Reply OK if you'd like a one-page overview.

— Demo template. Not sent automatically. Use only with prior consent where required.`,
  },
  {
    id: "wa-2-value",
    category: "whatsapp-templates",
    title: "Message 2 — Value proposition",
    summary: "One pain point and one-sentence solution.",
    tags: ["touch-2"],
    meta: { touch: 2, cta: "Want the 60-second version or a 15-min screen share?" },
    body: `[First Name], many [Industry] teams tell us [Pain Point].

MNT Flow: one workspace for receivables, issues, dispatch context & a prioritized action queue — so finance & sales aren't chasing different spreadsheets.

Want the 60-second version or a 15-min screen share?

— Demo template.`,
  },
  {
    id: "wa-3-brochure",
    category: "whatsapp-templates",
    title: "Message 3 — Brochure / demo follow-up",
    summary: "Share mobile brochure placeholder link.",
    tags: ["touch-3"],
    meta: { touch: 3, cta: "Open mobile brochure (demo link)" },
    body: `Sharing our mobile-friendly overview (demo):

📎 [Solution] one-pager for WhatsApp
🔗 [Booking Link]/lead-generation/brochures/whatsapp-mobile

Top 3 benefits:
• Single view of overdue & blocked invoices
• Clear owner + next step on every exception
• Customer portal for shared docs (demo)

Tell me if you'd like to see your process mapped in a demo account.

— Demo link placeholder. Replace with your hosted brochure URL.`,
  },
  {
    id: "wa-4-call",
    category: "whatsapp-templates",
    title: "Message 4 — 15-minute call invitation",
    summary: "Direct calendar CTA, mobile-friendly.",
    tags: ["touch-4"],
    meta: { touch: 4, cta: "Book 15 min: [Booking Link]" },
    body: `[First Name], if useful we can do a **15-minute** walkthrough:

✓ Pick a demo lead
✓ Show outreach templates (copy-only)
✓ Walk receivables → Action Center → resolution

Book here: [Booking Link]

Or send two times that work for you (IST).

— Demo template.`,
  },
  {
    id: "wa-5-final",
    category: "whatsapp-templates",
    title: "Message 5 — Polite final follow-up",
    summary: "Easy opt-out or reconnect later.",
    tags: ["touch-5"],
    meta: { touch: 5, cta: "Reply LATER / STOP / YES" },
    body: `Last note from me for now, [First Name].

If MNT Flow isn't a fit for [Company], reply STOP — I'll close the thread.

If timing is wrong, reply LATER + a month to reconnect.

If you'd like that 15-min demo, reply YES or use [Booking Link].

Thanks either way — [Sender Name]

— Demo template. Honor STOP and local messaging rules.`,
  },
];
