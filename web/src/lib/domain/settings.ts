import { ISSUE_CATEGORIES } from "./constants";

export type OrgSettings = {
  /** Upper bounds (inclusive) of overdue buckets, e.g. [30, 60, 90] → 1–30, 31–60, 61–90, >90. */
  ageingBoundaries: number[];
  priority: {
    highAmount: number;
    mediumAmount: number;
    highOverdueDays: number;
    mediumOverdueDays: number;
    staleIssueDays: number;
    commitmentWindowDays: number;
    highScore: number;
    mediumScore: number;
  };
  risk: {
    largeOutstanding: number;
    multipleOverdueInvoices: number;
    repeatedMissedPromises: number;
    longDisputeDays: number;
  };
  /** Monthly collection target in INR used on the overview. */
  monthlyCollectionTarget: number;
  /** Days before a due date that a reminder-style action appears. */
  reminderLeadDays: number;
  enabledIssueCategories: string[];
};

export const DEFAULT_SETTINGS: OrgSettings = {
  ageingBoundaries: [30, 60, 90],
  priority: {
    highAmount: 150000,
    mediumAmount: 50000,
    highOverdueDays: 30,
    mediumOverdueDays: 7,
    staleIssueDays: 14,
    commitmentWindowDays: 3,
    highScore: 55,
    mediumScore: 30,
  },
  risk: {
    largeOutstanding: 500000,
    multipleOverdueInvoices: 2,
    repeatedMissedPromises: 2,
    longDisputeDays: 30,
  },
  monthlyCollectionTarget: 2500000,
  reminderLeadDays: 2,
  enabledIssueCategories: ISSUE_CATEGORIES.map((c) => c.value),
};

export function parseSettings(json: string | null | undefined): OrgSettings {
  let raw: Partial<OrgSettings> = {};
  try {
    raw = json ? JSON.parse(json) : {};
  } catch {
    raw = {};
  }
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    priority: { ...DEFAULT_SETTINGS.priority, ...(raw.priority ?? {}) },
    risk: { ...DEFAULT_SETTINGS.risk, ...(raw.risk ?? {}) },
  };
}
