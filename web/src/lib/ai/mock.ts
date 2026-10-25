import { ISSUE_CATEGORIES } from "../domain/constants";
import type { AIProvider, CategorySuggestion } from "./provider";

// Deterministic template-based provider used for demos. Clearly labelled as mock in the UI.

const KEYWORDS: Record<string, string[]> = {
  missing_po: ["purchase order", "po copy", "no po", "po missing", "without po"],
  missing_grn: ["grn", "goods receipt", "receipt note", "stores"],
  missing_pod: ["pod", "proof of delivery", "signed challan", "delivery proof", "acknowledg"],
  quantity_mismatch: ["quantity", "short", "excess", "qty", "count", "units received"],
  quality_complaint: ["quality", "reject", "defect", "porosity", "crack", "inspection", "dimension"],
  pricing_mismatch: ["price", "rate", "freight", "discount", "charges"],
  tax_mismatch: ["gst", "tax", "hsn", "invoice mismatch", "po number", "wrong invoice"],
  credit_note_pending: ["credit note", "cn pending", "debit note"],
  approval_pending: ["approval", "approve", "sign-off", "signoff"],
  promise_missed: ["promised", "missed payment", "not paid as promised"],
  cashflow_delay: ["cash flow", "cash-flow", "funds", "liquidity", "payment plan"],
  delivery_issue: ["late delivery", "delay", "dispatch", "transport", "partial dispatch"],
  warranty_service: ["warranty", "service", "breakdown", "repair"],
};

export const mockProvider: AIProvider = {
  name: "Mock AI (local, deterministic)",
  isMock: true,

  async draftFollowUpEmail(c) {
    const status = c.overdueDays > 0 ? `which was due on ${c.dueDate} and is now ${c.overdueDays} days past due` : `which is due on ${c.dueDate}`;
    const issue = c.openIssue
      ? `\n\nWe understand there is an open point on our side: ${c.openIssue}. Our team is working on it and will share an update shortly. Please let us know if anything else is needed to process the payment.`
      : "";
    const promise = c.lastPromise ? `\n\nAs per our last conversation, payment was expected ${c.lastPromise}.` : "";
    return `Subject: Payment follow-up – Invoice ${c.invoiceNumber}

Dear ${c.contactName || "Sir/Madam"},

Greetings from ${c.orgName}.

This is a gentle reminder regarding invoice ${c.invoiceNumber} dated ${c.invoiceDate}, ${status}. The outstanding balance as per our records is ${c.outstanding}.${promise}${issue}

Could you please confirm the expected payment date, or let us know if any document or clarification is required from our side?

Thank you for your continued business.

Warm regards,
${c.senderName}
${c.orgName}`;
  },

  async summarizeIssue(c) {
    const timeline = c.events.slice(0, 6).map((e) => `• ${e.when} – ${e.who}: ${e.text}`).join("\n") || "• No activity recorded yet.";
    return `${c.number} (${c.category}) for ${c.customerName} has been open ${c.ageDays} day(s) since ${c.createdOn}; current status: ${c.status}; owner: ${c.owner}.

What happened: ${c.description || c.title}
Affected records: ${c.linked.join(", ") || "none linked"}
Missing evidence: ${c.missingEvidence || "none recorded"}
Next action: ${c.nextAction || "not yet defined"}

Recent activity:
${timeline}`;
  },

  async summarizeCustomer(c) {
    const recent = c.recent.slice(0, 5).map((r) => `• ${r.when}: ${r.text}`).join("\n") || "• No recent interactions recorded.";
    return `${c.customerName}: ${c.outstanding} outstanding across ${c.openInvoices} open invoice(s), of which ${c.overdue} is overdue (${c.overdueInvoices} invoice(s)).
Open issues: ${c.openIssues.length ? c.openIssues.join("; ") : "none"}.
Missed payment promises: ${c.missedPromises}.

Recent interactions:
${recent}`;
  },

  async suggestIssueCategories(notes) {
    const t = notes.toLowerCase();
    const out: CategorySuggestion[] = [];
    for (const [cat, words] of Object.entries(KEYWORDS)) {
      const matched = words.filter((w) => t.includes(w));
      if (matched.length) out.push({ category: cat, label: ISSUE_CATEGORIES.find((c) => c.value === cat)!.label, matched });
    }
    return out.sort((a, b) => b.matched.length - a.matched.length).slice(0, 3);
  },
};
