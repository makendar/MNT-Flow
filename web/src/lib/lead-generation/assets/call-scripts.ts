import type { LeadAsset } from "../types";

export const CALL_SCRIPT_ASSETS: LeadAsset[] = [
  {
    id: "discovery-demo-script",
    category: "call-scripts",
    title: "10–20 minute discovery & demo call script",
    summary: "Reusable flow: intro, discovery, demo, value, Q&A, next steps.",
    tags: ["discovery", "demo"],
    body: `## 0–2 min — Introduction
- Thank [First Name] for their time.
- Introduce yourself, role, and MNT Flow (manufacturing receivables & action intelligence).
- Confirm objective: "Is it still helpful to see how teams track blockers and follow-ups in one place?"

## 2–5 min — Discovery (ask 3–4)
1. How do you track overdue invoices and who owns follow-ups today?
2. Where do blockers live (missing POD, disputes, credit holds)?
3. What manual steps slow collections or handoffs between sales, finance, ops?
4. What would "good" look like in the next 90 days (visibility, accountability, customer comms)?

## 5–12 min — Product demonstration (demo tenant)
Show in order:
1. **Current challenge** — open overdue invoice with reason sentence in Action Center.
2. **App workflow** — receivables → linked issue → owner assignment.
3. **Automation / analytics** — rule-based priority (not AI claims); overview KPIs drill-down.
4. **Example output** — promise recorded, comment trail, mock follow-up draft (copy-only).
5. **Fit** — "Here's where [Company]'s [Pain Point] would appear."

## 12–15 min — Value discussion
- Summarize their answers in their words.
- Tie 2–3 capabilities to their stated pains (no invented ROI percentages).

## 15–20 min — Q&A and next steps
Offer options:
- Deeper technical demonstration
- Proof of concept on sample data
- Requirements workshop with finance + ops
- Follow-up meeting with economic buyer

## Call notes (capture during call)
Use the interactive checklist in the app for pain points, requirements, decision makers, timeline, questions, next action, and follow-up date.

—
Demo script. Adjust timing to prospect engagement.`,
  },
  {
    id: "demo-checklist",
    category: "call-scripts",
    title: "Demo checklist (interactive)",
    summary: "Step-by-step boxes for a consistent demo every time.",
    tags: ["checklist"],
    body: `Use the in-app Demo Checklist tab for clickable steps:

1. ☐ Confirm demo data banner visible
2. ☐ Open Lead Generation → select demo lead
3. ☐ Show pipeline status change (New → Contacted)
4. ☐ Open Cold Email 1 → personalize placeholders → Copy
5. ☐ Preview Executive brochure → Copy share text
6. ☐ Mark Responded → Qualification notes
7. ☐ Open discovery script + fill Call Notes
8. ☐ Jump to Receivables demo invoice (cross-link)
9. ☐ Action Center priority reason sentence
10. ☐ Mock AI draft — emphasize not sent
11. ☐ Set next step: Opportunity / Follow-up
12. ☐ Export or copy meeting notes template

—
Companion to the interactive UI checklist.`,
  },
];
