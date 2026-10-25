// Import field definitions (shared by the wizard UI and the server validator). Pure module, no server imports.

export type FieldType = "text" | "date" | "money" | "int" | "email";
export type ImportField = { key: string; label: string; required?: boolean; type?: FieldType; aliases?: string[] };
export type EntityType = "customers" | "quotations" | "orders" | "invoices" | "payments" | "promises";

export const ENTITIES: { value: EntityType; label: string; duplicateRule: string; description: string }[] = [
  { value: "customers", label: "Customers", duplicateRule: "Same customer code (case-insensitive). Choose skip or update existing contact/terms fields.", description: "Customer master: codes, names, contacts, payment terms." },
  { value: "quotations", label: "Quotations", duplicateRule: "Same quotation number → skipped.", description: "Open and historical quotations for follow-up tracking." },
  { value: "orders", label: "Sales orders", duplicateRule: "Same order number → skipped.", description: "Orders with customer PO and delivery commitment." },
  { value: "invoices", label: "Invoices", duplicateRule: "Same invoice number: skipped if the total matches; rejected if the total differs (correct it in the source system).", description: "Invoices from Tally / ERP exports. Payments are imported separately." },
  { value: "payments", label: "Payments", duplicateRule: "Same customer + reference, or same invoice + date + amount → skipped.", description: "Receipts. Leave invoice_number blank for unapplied payments." },
  { value: "promises", label: "Payment promises", duplicateRule: "Same invoice + promised date + amount → skipped.", description: "Customer payment commitments." },
];

export const FIELDS: Record<EntityType, ImportField[]> = {
  customers: [
    { key: "code", label: "Customer code", required: true, aliases: ["customer code", "customer_code", "party code", "ledger code"] },
    { key: "name", label: "Customer name", required: true, aliases: ["name", "customer name", "party name", "ledger name", "company"] },
    { key: "segment", label: "Segment / industry", aliases: ["industry", "segment"] },
    { key: "gstin", label: "GSTIN", aliases: ["gst", "gst no", "gstin/uin"] },
    { key: "billing_address", label: "Billing address", aliases: ["address", "billing address"] },
    { key: "shipping_address", label: "Shipping address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "primary_contact_name", label: "Primary contact name", aliases: ["contact", "contact person"] },
    { key: "primary_contact_email", label: "Primary contact email", type: "email", aliases: ["email"] },
    { key: "primary_contact_phone", label: "Primary contact phone", aliases: ["phone", "mobile"] },
    { key: "accounts_contact_name", label: "Accounts contact name" },
    { key: "accounts_contact_email", label: "Accounts contact email", type: "email" },
    { key: "accounts_contact_phone", label: "Accounts contact phone" },
    { key: "payment_terms_days", label: "Payment terms (days)", type: "int", aliases: ["credit days", "terms", "credit period"] },
    { key: "owner_email", label: "Account owner email", type: "email" },
    { key: "tags", label: "Tags (comma-separated)" },
  ],
  quotations: [
    { key: "number", label: "Quotation number", required: true, aliases: ["quote no", "quotation no", "quote number"] },
    { key: "customer_code", label: "Customer code", required: true },
    { key: "quote_date", label: "Quotation date", required: true, type: "date", aliases: ["date", "quote date"] },
    { key: "valid_until", label: "Valid until", type: "date", aliases: ["validity"] },
    { key: "amount", label: "Amount (INR)", required: true, type: "money", aliases: ["value", "quote value"] },
    { key: "status", label: "Status" },
    { key: "owner_email", label: "Sales owner email", type: "email" },
    { key: "next_follow_up_date", label: "Next follow-up date", type: "date" },
    { key: "notes", label: "Notes" },
  ],
  orders: [
    { key: "number", label: "Order number", required: true, aliases: ["so no", "order no", "sales order"] },
    { key: "customer_code", label: "Customer code", required: true },
    { key: "customer_po", label: "Customer PO number", aliases: ["po", "po number", "po no"] },
    { key: "order_date", label: "Order date", required: true, type: "date", aliases: ["date"] },
    { key: "value", label: "Order value (INR)", required: true, type: "money", aliases: ["amount"] },
    { key: "expected_delivery_date", label: "Expected delivery date", type: "date", aliases: ["delivery date", "commitment date"] },
    { key: "status", label: "Status" },
    { key: "owner_email", label: "Order owner email", type: "email" },
    { key: "quotation_number", label: "Quotation number" },
  ],
  invoices: [
    { key: "number", label: "Invoice number", required: true, aliases: ["invoice no", "voucher no", "bill no", "invoice number"] },
    { key: "customer_code", label: "Customer code", required: true, aliases: ["party code"] },
    { key: "invoice_date", label: "Invoice date", required: true, type: "date", aliases: ["date", "voucher date", "bill date"] },
    { key: "due_date", label: "Due date", type: "date", aliases: ["due on"] },
    { key: "total", label: "Invoice total (INR)", required: true, type: "money", aliases: ["amount", "invoice amount", "gross total", "bill amount"] },
    { key: "currency", label: "Currency" },
    { key: "order_number", label: "Order number" },
    { key: "owner_email", label: "Collection owner email", type: "email" },
  ],
  payments: [
    { key: "customer_code", label: "Customer code", required: true },
    { key: "invoice_number", label: "Invoice number (blank = unapplied)", aliases: ["against invoice", "invoice no"] },
    { key: "payment_date", label: "Payment date", required: true, type: "date", aliases: ["date", "receipt date"] },
    { key: "amount", label: "Amount (INR)", required: true, type: "money" },
    { key: "reference", label: "Reference (UTR / cheque)", aliases: ["utr", "cheque no", "ref"] },
    { key: "mode", label: "Mode" },
  ],
  promises: [
    { key: "invoice_number", label: "Invoice number", required: true },
    { key: "promised_date", label: "Promised date", required: true, type: "date" },
    { key: "amount", label: "Promised amount (INR)", required: true, type: "money" },
    { key: "contact_name", label: "Contact who promised", required: true, aliases: ["contact"] },
    { key: "notes", label: "Notes" },
    { key: "owner_email", label: "Follow-up owner email", type: "email" },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Suggests a header for each field by key, label or known aliases. */
export function autoMap(entity: EntityType, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FIELDS[entity]) {
    const cands = [f.key, f.label, ...(f.aliases ?? [])].map(norm);
    const h = headers.find((x) => cands.includes(norm(x)));
    if (h) out[f.key] = h;
  }
  return out;
}
