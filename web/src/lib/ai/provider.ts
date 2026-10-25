import { mockProvider } from "./mock";

// AI is optional and replaceable. Every function receives facts computed by the deterministic domain layer;
// providers must only rephrase those facts, never compute balances, dates or commitments.

export type FollowUpCtx = {
  orgName: string;
  customerName: string;
  contactName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  outstanding: string;
  overdueDays: number;
  openIssue?: string;
  lastPromise?: string;
  senderName: string;
};

export type IssueCtx = {
  number: string;
  title: string;
  category: string;
  status: string;
  customerName: string;
  createdOn: string;
  ageDays: number;
  description: string;
  owner: string;
  missingEvidence?: string | null;
  nextAction?: string | null;
  linked: string[];
  events: { when: string; who: string; text: string }[];
};

export type CustomerCtx = {
  customerName: string;
  outstanding: string;
  overdue: string;
  openInvoices: number;
  overdueInvoices: number;
  openIssues: string[];
  missedPromises: number;
  recent: { when: string; text: string }[];
};

export type CategorySuggestion = { category: string; label: string; matched: string[] };

export interface AIProvider {
  readonly name: string;
  readonly isMock: boolean;
  draftFollowUpEmail(ctx: FollowUpCtx): Promise<string>;
  summarizeIssue(ctx: IssueCtx): Promise<string>;
  summarizeCustomer(ctx: CustomerCtx): Promise<string>;
  suggestIssueCategories(notes: string): Promise<CategorySuggestion[]>;
}

export function getAIProvider(): AIProvider {
  // Only the local mock is implemented. A real provider must be added here, configured server-side,
  // and reviewed for data handling before customer data is sent to it.
  return mockProvider;
}

export function aiStatus() {
  const requested = process.env.AI_PROVIDER ?? "mock";
  return {
    requested,
    active: getAIProvider().name,
    isMock: getAIProvider().isMock,
    note: requested !== "mock" ? `AI_PROVIDER="${requested}" is not implemented; using the local mock provider.` : "Deterministic local mock. No data leaves this server.",
  };
}
