import type { Role } from "@/lib/domain/constants";

// Central permission matrix. UI and server actions both call `can()`; never check roles inline.
const ALL_INTERNAL: Role[] = ["org_admin", "executive", "finance_manager", "finance_exec", "sales_manager", "sales_exec", "operations", "quality", "auditor"];
const EDITORS: Role[] = ALL_INTERNAL.filter((r) => r !== "auditor");

const MATRIX = {
  "overview:view": ["org_admin", "executive", "finance_manager", "finance_exec", "sales_manager", "auditor"],
  "actions:view": ALL_INTERNAL,
  "actions:edit": EDITORS,
  "customers:view": ALL_INTERNAL,
  "customers:edit": ["org_admin", "finance_manager", "sales_manager", "sales_exec"],
  "quotes:view": ["org_admin", "executive", "finance_manager", "sales_manager", "sales_exec", "auditor"],
  "quotes:edit": ["org_admin", "sales_manager", "sales_exec"],
  "orders:view": ALL_INTERNAL,
  "orders:edit": ["org_admin", "sales_manager", "sales_exec", "operations"],
  "dispatch:edit": ["org_admin", "operations"],
  "receivables:view": ["org_admin", "executive", "finance_manager", "finance_exec", "sales_manager", "auditor"],
  "receivables:edit": ["org_admin", "finance_manager", "finance_exec"],
  "payments:record": ["org_admin", "finance_manager"],
  "issues:view": ALL_INTERNAL,
  "issues:edit": EDITORS,
  "tasks:view": ALL_INTERNAL,
  "tasks:edit": EDITORS,
  "documents:upload": EDITORS,
  "reports:view": ["org_admin", "executive", "finance_manager", "finance_exec", "sales_manager", "auditor"],
  "reports:export": ["org_admin", "executive", "finance_manager", "auditor"],
  "imports:run": ["org_admin", "finance_manager"],
  "imports:view": ["org_admin", "finance_manager", "auditor"],
  "settings:view": ["org_admin", "executive", "auditor"],
  "settings:manage": ["org_admin"],
  "audit:view": ["org_admin", "executive", "auditor"],
  "demo:reset": ["org_admin"],
  "portal:access": ["customer_portal"],
  "leadgen:view": ["org_admin", "executive", "sales_manager", "sales_exec"],
  "leadgen:edit": ["org_admin", "sales_manager", "sales_exec"],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof MATRIX;

export function can(user: { role: string } | null | undefined, p: Permission): boolean {
  return !!user && (MATRIX[p] as readonly string[]).includes(user.role);
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}
