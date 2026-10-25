type Linked = { issueId?: string | null; invoiceId?: string | null; orderId?: string | null; quotationId?: string | null; taskId?: string | null; customerId?: string | null };

/** Most specific record page for an action / event. */
export function recordHref(a: Linked): string | null {
  if (a.issueId) return `/issues/${a.issueId}`;
  if (a.invoiceId) return `/receivables/${a.invoiceId}`;
  if (a.orderId) return `/orders/${a.orderId}`;
  if (a.quotationId) return `/quotations/${a.quotationId}`;
  if (a.taskId) return `/tasks/${a.taskId}`;
  if (a.customerId) return `/customers/${a.customerId}`;
  return null;
}

export function entityHref(type: string, id: string): string | null {
  const map: Record<string, string> = { invoice: "receivables", issue: "issues", order: "orders", quotation: "quotations", task: "tasks", customer: "customers", action: "action-center" };
  return map[type] ? `/${map[type]}/${id}` : null;
}
