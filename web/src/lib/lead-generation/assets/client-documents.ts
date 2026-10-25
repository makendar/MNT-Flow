import type { LeadAsset } from "../types";

const PLACEHOLDER = `\n\n—\n**Placeholder — requires business/legal approval before client use.**\n`;

export const CLIENT_DOCUMENT_ASSETS: LeadAsset[] = [
  {
    id: "doc-company-overview",
    category: "client-documents",
    title: "One-page company / solution overview",
    summary: "High-level MNT Flow positioning for manufacturers.",
    body: `# MNT Flow — Solution overview (Demo)

**MNT Analytics** · Manufacturing, customer & cash intelligence

## What it is
A B2B workspace for Indian manufacturers to track orders, resolve payment blockers, manage follow-ups, and see why cash is delayed.

## Who it's for
Finance, sales, operations, and leadership teams who need one accountable view of exceptions — not another generic CRM.

## Core capabilities (demo)
- Receivables with ageing, promises, and activity trail
- Issues & disputes linked to invoices
- Prioritized Action Center with plain-language reasons
- Quotations, orders, dispatch context
- Customer portal for shared documents (demo)
- Imports from spreadsheets (CSV/XLSX)

## Contact placeholder
[Your company legal name] · [Approved email] · [Approved phone]${PLACEHOLDER}`,
  },
  {
    id: "doc-feature-sheet",
    category: "client-documents",
    title: "Product feature sheet",
    summary: "Feature list with demo scope notes.",
    body: `# Feature sheet (Demo)

| Area | Capability | Demo scope |
|------|------------|------------|
| Receivables | Outstanding, ageing, status rules | Live in demo tenant |
| Actions | Generated queue, assign, complete | Live |
| Issues | Checklist, evidence, unblock flow | Live |
| Outreach | Email/WhatsApp **templates only** | Copy from Lead Generation |
| Sending | Email/WhatsApp automation | **Not included** — external tools |
| AI | Mock drafts | Local deterministic; never auto-sent |
| ERP | Tally/SAP connectors | CSV import path only |${PLACEHOLDER}`,
  },
  {
    id: "doc-faq",
    category: "client-documents",
    title: "FAQ",
    summary: "Common discovery questions with honest demo answers.",
    body: `# FAQ (Demo)

**Does MNT Flow send cold emails or WhatsApp?**  
No. Templates are copied into your approved tools. This module is for demo and enablement.

**Is customer data in the demo real?**  
No. All companies and people are synthetic and labelled DEMO.

**Can customers log in?**  
Yes — portal demo users see only their customer's records.

**Where is data stored in this release?**  
Local SQLite for demo; production would use managed PostgreSQL (see README).

**Do you calculate DSO or cash forecasts?**  
Not in this release — requires complete historical data.${PLACEHOLDER}`,
  },
  {
    id: "doc-discovery-questionnaire",
    category: "client-documents",
    title: "Discovery questionnaire",
    summary: "Pre-call questions for qualification.",
    body: `# Discovery questionnaire (Demo)

1. Legal entity name and primary manufacturing sites (demo: use fictional name)
2. Approximate monthly invoice volume (range OK)
3. Systems today: ERP, accounting, CRM, spreadsheets
4. Who owns collections follow-ups? Sales, finance, shared?
5. Top three reasons invoices get stuck (disputes, POD, credit, other)
6. Current reporting cadence for leadership
7. Decision makers for a workflow tool (roles, not personal data)
8. Timeline and success criteria for a pilot
9. Data import preference (CSV sample available in app)
10. Compliance requirements for customer communications${PLACEHOLDER}`,
  },
  {
    id: "doc-demo-script",
    category: "client-documents",
    title: "Demo script (short)",
    summary: "10-minute internal demo path across modules.",
    body: `# 10-minute demo script (internal)

1. Overview KPIs → drill to receivables
2. Action Center → open prioritized item → assign
3. Invoice → promise + mock follow-up draft (copy)
4. Issue resolve flow → finance unblock
5. Lead Generation → outreach template → brochure
6. Settings → demo reset disclaimer

All figures computed from demo DB — no hard-coded KPIs.${PLACEHOLDER}`,
  },
  {
    id: "doc-requirements-form",
    category: "client-documents",
    title: "Client requirements form",
    summary: "Capture scope for POC or rollout.",
    body: `# Client requirements form (Placeholder)

- Business units / plants to include
- User roles and approximate seat count **[pricing not included]**
- Invoice & customer import format
- Portal users (Y/N)
- Integration expectations (CSV vs future API)
- Security & hosting preferences
- Success metrics **[define with client — do not invent ROI]**
- Sign-off contacts **[legal names required]**${PLACEHOLDER}`,
  },
  {
    id: "doc-use-case-sheet",
    category: "client-documents",
    title: "Use-case sheet",
    summary: "Template for fictional scenario documentation.",
    body: `# Use-case sheet (Template)

**Client (fictional demo):** [Company]  
**Industry:** [Industry]  
**Challenge:** [Pain Point]  
**Approach with MNT Flow:** [Workflow steps]  
**Illustrative outcome:** [Qualitative only — label as demo example]  
**Dependencies:** Data import, role mapping, training${PLACEHOLDER}`,
  },
  {
    id: "doc-case-study",
    category: "client-documents",
    title: "Case-study template",
    summary: "Structure only — no fake testimonials.",
    body: `# Case study template

> Do **not** publish until client approves name, logo, and quotes.

- **About the client** (approved text)
- **Challenge**
- **Solution deployed**
- **How MNT Flow was used** (modules)
- **Outcomes** (client-verified metrics only)
- **Quote** (signed release required)${PLACEHOLDER}`,
  },
  {
    id: "doc-proposal",
    category: "client-documents",
    title: "Proposal template",
    summary: "Skeleton proposal — no pricing or legal terms.",
    body: `# Proposal template (Placeholder)

1. Executive summary
2. Understanding of requirements
3. Proposed scope & phases
4. Deliverables
5. Assumptions & dependencies
6. **Commercial terms — insert approved pricing**
7. **Legal — insert approved MSA/SOW**${PLACEHOLDER}`,
    requiresLegalReview: true,
  },
  {
    id: "doc-pricing",
    category: "client-documents",
    title: "Pricing sheet placeholder",
    summary: "Explicitly empty pricing — approval required.",
    body: `# Pricing sheet

**No price points in demo kit.**

Insert approved SKUs, seat tiers, and currency after finance sign-off.${PLACEHOLDER}`,
    requiresLegalReview: true,
  },
  {
    id: "doc-poc",
    category: "client-documents",
    title: "Proof-of-concept template",
    summary: "POC scope and exit criteria.",
    body: `# POC template

- Duration: [e.g. 4 weeks]
- Data: anonymized CSV / demo subset
- Users: [roles]
- In scope / out of scope
- Exit criteria (qualitative)
- **No contractual SLA in demo template**${PLACEHOLDER}`,
  },
  {
    id: "doc-meeting-notes",
    category: "client-documents",
    title: "Meeting notes template",
    summary: "Structured notes mirroring in-app Call Notes.",
    body: `# Meeting notes

**Date:**  
**Attendees (demo/fictional OK):**  
**Pain points:**  
**Requirements:**  
**Decision makers:**  
**Timeline:**  
**Questions:**  
**Next action:**  
**Follow-up date:**${PLACEHOLDER}`,
  },
  {
    id: "doc-qualification",
    category: "client-documents",
    title: "Lead qualification checklist",
    summary: "BANT-style lightweight qual for demos.",
    body: `# Lead qualification checklist

- ☐ Right industry / size band for MNT Flow
- ☐ Pain aligns with receivables / blockers / follow-ups
- ☐ Champion identified (role)
- ☐ Economic buyer accessible within 60 days (estimate)
- ☐ Willing to use demo or sample data for POC
- ☐ Outreach consent documented where required
- ☐ Not a fit → mark Not Interested with reason${PLACEHOLDER}`,
  },
  {
    id: "doc-objections",
    category: "client-documents",
    title: "Objection-handling guide",
    summary: "Honest responses — no exaggerated claims.",
    body: `# Objection handling (Demo guide)

**"We already have an ERP."**  
MNT Flow complements ERP with exception workflow and accountability; imports via CSV in this release.

**"We need WhatsApp automation."**  
Not built-in; templates support manual send via your Business API vendor.

**"Is this AI?"**  
Mock drafts only; priorities are rule-based and explained in UI.

**"Show ROI."**  
Use client-defined metrics in POC; do not cite invented percentages in outreach.${PLACEHOLDER}`,
  },
  {
    id: "doc-compliance",
    category: "client-documents",
    title: "Privacy, consent & outreach compliance checklist",
    summary: "Checklist placeholder — legal review required.",
    body: `# Privacy & outreach compliance (Checklist)

- ☐ Lawful basis for contacting prospect documented
- ☐ Opt-out / STOP handling defined
- ☐ Data processing agreement in place if needed
- ☐ Brochure and emails approved by marketing
- ☐ No real personal data in demo presentations
- ☐ **Insert company-specific policies — legal review required**${PLACEHOLDER}`,
    requiresLegalReview: true,
  },
];
