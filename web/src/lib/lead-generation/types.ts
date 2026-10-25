export const LEAD_STATUSES = [
  "new",
  "contacted",
  "responded",
  "qualified",
  "demo_scheduled",
  "demo_completed",
  "follow_up",
  "opportunity",
  "not_interested",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const WORKFLOW_STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "outreach", label: "Outreach" },
  { key: "response", label: "Response" },
  { key: "qualification", label: "Qualification" },
  { key: "discovery", label: "Discovery Call" },
  { key: "demo", label: "Demo" },
  { key: "follow_up", label: "Follow-Up" },
  { key: "opportunity", label: "Opportunity" },
] as const;

export type AssetCategory =
  | "brochures"
  | "cold-emails"
  | "whatsapp-templates"
  | "call-scripts"
  | "follow-ups"
  | "demo-assets"
  | "client-documents";

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; folder: string; description: string }[] = [
  { id: "brochures", label: "Brochures", folder: "Brochures", description: "Shareable one-page digital brochures for email and WhatsApp." },
  { id: "cold-emails", label: "Cold Emails", folder: "Cold Emails", description: "Five-touch outbound email sequence with subjects and CTAs." },
  { id: "whatsapp-templates", label: "WhatsApp Templates", folder: "WhatsApp Templates", description: "Conversational mobile outreach messages (templates only — not sent)." },
  { id: "call-scripts", label: "Call Scripts", folder: "Call Scripts", description: "Discovery and demo call flow with interactive checklist." },
  { id: "follow-ups", label: "Follow Ups", folder: "Follow Ups", description: "Post-call and nurture follow-up templates." },
  { id: "demo-assets", label: "Demo Assets", folder: "Demo Assets", description: "Presentation helpers and demo walkthrough notes." },
  { id: "client-documents", label: "Client Documents", folder: "Client Documents", description: "Overview sheets, FAQs, forms, and proposal placeholders." },
];

export type LeadAsset = {
  id: string;
  category: AssetCategory;
  title: string;
  summary: string;
  tags?: string[];
  /** Markdown or plain text body for copy/edit */
  body: string;
  /** Extra structured fields for emails */
  meta?: {
    subject?: string;
    subjectAlt?: string;
    cta?: string;
    attachment?: string;
    touch?: number;
  };
  brochureId?: "executive" | "problem-solution" | "whatsapp-mobile";
  requiresLegalReview?: boolean;
};

export type DemoLead = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  industry: string;
  email: string;
  phone: string;
  painPoint: string;
  source: string;
  status: LeadStatus;
  owner: string;
  lastTouch: string;
  nextStep: string;
  notes: string;
};

export type CallNotes = {
  painPoints: string;
  requirements: string;
  decisionMakers: string;
  timeline: string;
  questions: string;
  nextAction: string;
  followUpDate: string;
};

export const EMPTY_CALL_NOTES: CallNotes = {
  painPoints: "",
  requirements: "",
  decisionMakers: "",
  timeline: "",
  questions: "",
  nextAction: "",
  followUpDate: "",
};

export const DEMO_STORAGE_KEY = "mnt-leadgen-demo-v1";
