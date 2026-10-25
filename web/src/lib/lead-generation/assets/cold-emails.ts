import type { LeadAsset } from "../types";

export const COLD_EMAIL_ASSETS: LeadAsset[] = [
  {
    id: "email-1-intro",
    category: "cold-emails",
    title: "Email 1 — Introduction",
    summary: "Concise intro with one clear benefit and a low-friction demo CTA.",
    tags: ["touch-1", "intro"],
    meta: {
      touch: 1,
      subject: "Quick idea for [Company]'s collections follow-ups",
      subjectAlt: "[First Name], one place to see what's blocking cash",
      cta: "Would you be open to a 15-minute walkthrough next week?",
      attachment: "Brochure 1 — Executive / Corporate",
    },
    body: `Hi [First Name],

I noticed many [Industry] teams still chase overdue invoices through email threads and separate spreadsheets — while dispatch and sales hold pieces of the story in different places.

MNT Flow gives finance and sales one workspace to see what's pending, what's blocked (and why), who owns the next step, and whether it's actually resolved.

If that's relevant for [Company], I'd welcome a short conversation — no pitch deck required.

Would you be open to a 15-minute walkthrough next week?

Best,
[Sender Name]
[Booking Link]

—
Demo template. Replace bracketed fields. Do not send from this app; copy and use your approved email tool.`,
  },
  {
    id: "email-2-value",
    category: "cold-emails",
    title: "Email 2 — Value follow-up",
    summary: "Two to three workflow problems and how the app simplifies them.",
    tags: ["touch-2", "value"],
    meta: {
      touch: 2,
      subject: "Re: follow-ups, blockers, and who owns what",
      subjectAlt: "Three workflow gaps MNT Flow is built to close",
      cta: "Happy to show how these look in a live demo account — 15 minutes?",
      attachment: "Brochure 2 — Problem → Solution → Result",
    },
    body: `Hi [First Name],

Following up briefly — three patterns we hear from manufacturing finance and sales teams:

1. **Scattered follow-ups** — promises and call notes live in inboxes, not on the invoice.
2. **Hidden blockers** — a missing POD or open quality flag holds payment, but leadership only sees "overdue."
3. **Unclear ownership** — the next action isn't assigned, dated, or tracked to completion.

MNT Flow connects receivables, issues, dispatch context, and a prioritized Action Center so the team works one queue instead of five tools.

Happy to show how these look in a live demo account — 15 minutes?

Best,
[Sender Name]
[Booking Link]

—
Demo template. Illustrative workflow points only; no performance statistics implied.`,
  },
  {
    id: "email-3-use-case",
    category: "cold-emails",
    title: "Email 3 — Use-case scenario",
    summary: "Fictional Challenge → Approach → Outcome (clearly illustrative).",
    tags: ["touch-3", "use-case"],
    meta: {
      touch: 3,
      subject: "Example: from overdue invoice to resolved blocker (demo scenario)",
      subjectAlt: "A day-in-the-life example for [Company]",
      cta: "If this mirrors your world, I can walk through the same flow on a demo tenant.",
      attachment: "Brochure 2 — Problem → Solution → Result",
    },
    body: `Hi [First Name],

Sharing a **fictional demo scenario** we use in walkthroughs (not a real customer result):

**Challenge:** A demo customer has an invoice 45+ days overdue. Finance sees the balance; operations knows delivery proof is missing; sales last spoke to the buyer two weeks ago — none of it is on one record.

**Approach:** In MNT Flow, the invoice links to the order, open issue, and Action Center item with a plain-language reason ("overdue + missing document + assigned owner").

**Potential outcome (illustrative):** The owner uploads proof, resolves the issue, records the next promise, and leadership sees the exception clear — without a separate status meeting.

If this mirrors your world, I can walk through the same flow on a demo tenant in about 15 minutes.

Best,
[Sender Name]
[Booking Link]

—
Labelled illustrative example. Do not present as a guaranteed ROI or measured result.`,
  },
  {
    id: "email-4-demo-invite",
    category: "cold-emails",
    title: "Email 4 — Demo invitation",
    summary: "Invite to a 10–20 minute end-to-end demonstration.",
    tags: ["touch-4", "demo"],
    meta: {
      touch: 4,
      subject: "10–20 min demo: outreach → qualification → discovery flow",
      subjectAlt: "See MNT Flow end-to-end (demo environment)",
      cta: "Pick a slot here: [Booking Link] — or reply with two times that work.",
      attachment: "Demo checklist + Brochure 1",
    },
    body: `Hi [First Name],

I'd like to offer a focused **10–20 minute demonstration** using synthetic demo data:

• Import or select a demo lead
• Choose outreach (email / WhatsApp template)
• Personalize and attach a brochure
• Track response and qualification status
• Run a discovery script with call notes
• Define the next step (POC, workshop, or follow-up)

You'll see how MNT Flow supports the sales motion around collections intelligence — not automated sending from the app.

Pick a slot here: [Booking Link] — or reply with two times that work.

Thank you,
[Sender Name]

—
Demo template. Scheduling link is a placeholder for your calendar tool.`,
  },
  {
    id: "email-5-close",
    category: "cold-emails",
    title: "Email 5 — Professional close-out",
    summary: "Polite breakup with easy yes-now or later paths.",
    tags: ["touch-5", "breakup"],
    meta: {
      touch: 5,
      subject: "Closing the loop — [Company]",
      subjectAlt: "Should I stay in touch or step back?",
      cta: "Reply 1 / 2 / 3 — or ignore and I'll pause outreach.",
      attachment: "None required",
    },
    body: `Hi [First Name],

I've reached out a few times about centralizing receivables follow-ups and blockers for [Company]. I don't want to clutter your inbox.

If now isn't the right time, no problem — reply with:

1. **Not a priority** — I'll close this thread.
2. **Interested later** — tell me a quarter/month to reconnect.
3. **Yes, let's talk** — [Booking Link] for a 15-minute walkthrough.

Either way, thank you for considering MNT Flow.

Best,
[Sender Name]

—
Demo template. Respect opt-out and local outreach regulations in production use.`,
  },
];
