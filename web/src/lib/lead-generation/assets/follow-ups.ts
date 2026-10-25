import type { LeadAsset } from "../types";

export const FOLLOW_UP_ASSETS: LeadAsset[] = [
  {
    id: "followup-post-demo",
    category: "follow-ups",
    title: "Post-demo thank you + recap",
    summary: "Send after discovery/demo with recap and next step options.",
    meta: {
      subject: "Thank you — MNT Flow demo recap (demo notes)",
      subjectAlt: "Next steps from our conversation",
      cta: "Reply with A/B/C for next step",
    },
    body: `Hi [First Name],

Thank you for the conversation today. Recap of **demo discussion points** (please correct anything I misheard):

• Pain: [Pain Point]
• Priority: [Timeline / priority from call]
• Interested in: [Capabilities discussed]

Suggested next steps (choose one):
A) Requirements workshop with your finance lead
B) Proof of concept using anonymized sample files
C) Follow-up in [month] when budget cycle opens

Attached: one-page overview (demo PDF placeholder).

Best,
[Sender Name]

—
Demo template. Attach only approved materials.`,
  },
  {
    id: "followup-no-show",
    category: "follow-ups",
    title: "No-show / reschedule",
    summary: "Professional reschedule without guilt language.",
    meta: { subject: "Reschedule our MNT Flow walkthrough?", cta: "[Booking Link]" },
    body: `Hi [First Name],

We had time reserved for a MNT Flow walkthrough — totally understand schedules shift.

If you'd still like a 15-minute demo, pick a new slot: [Booking Link]

If not, reply "pause" and I'll check back later this quarter.

Best,
[Sender Name]

—
Demo template.`,
  },
  {
    id: "followup-nurture",
    category: "follow-ups",
    title: "Light nurture — share FAQ",
    summary: "Value-add touch without fake urgency.",
    meta: { subject: "FAQ: how teams use MNT Flow (demo doc)", cta: "Reply if you'd like the discovery questionnaire" },
    body: `Hi [First Name],

Sharing our **demo FAQ** on how manufacturing teams use MNT Flow for receivables visibility and coordinated follow-ups — no login required to read.

If helpful, I can also send our discovery questionnaire before a call so we use your time well.

[Link to Client Documents → FAQ in app]

Best,
[Sender Name]

—
Demo template.`,
  },
];
