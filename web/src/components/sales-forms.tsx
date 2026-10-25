import type { Quotation, SalesOrder } from "@prisma/client";
import { ActionForm } from "./action-form";
import { CustomerSelect, OwnerSelect } from "./lookups";
import { Field, Select } from "./ui";
import { saveOrder, saveQuotation } from "@/lib/actions/sales";
import { isoOf } from "@/lib/dates";
import { ORDER_STATUSES, QUOTE_STATUSES } from "@/lib/domain/constants";

export function QuotationForm({ orgId, q, customerId, today }: { orgId: string; q?: Quotation | null; customerId?: string; today: string }) {
  return (
    <ActionForm action={saveQuotation.bind(null, q?.id ?? null)} className="grid gap-3 md:grid-cols-4">
      <Field label="Quotation number" hint={q ? undefined : "Leave blank to auto-number"}><input name="number" defaultValue={q?.number} className="input" /></Field>
      <CustomerSelect orgId={orgId} name="customerId" value={q?.customerId ?? customerId} required className="md:col-span-2" />
      <OwnerSelect orgId={orgId} name="ownerId" label="Sales owner" value={q?.ownerId} placeholder="Unassigned" className="" />
      <Field label="Quotation date *"><input type="date" name="quoteDate" defaultValue={isoOf(q?.quoteDate) ?? today} className="input" required /></Field>
      <Field label="Valid until"><input type="date" name="validUntil" defaultValue={isoOf(q?.validUntil) ?? ""} className="input" /></Field>
      <Field label="Amount (₹) *"><input name="amount" inputMode="decimal" defaultValue={q?.amount} className="input" required /></Field>
      <Field label="Status"><Select name="status" options={QUOTE_STATUSES} defaultValue={q?.status ?? "draft"} /></Field>
      <Field label="Last contact date"><input type="date" name="lastContactDate" defaultValue={isoOf(q?.lastContactDate) ?? ""} className="input" /></Field>
      <Field label="Next follow-up date"><input type="date" name="nextFollowUpDate" defaultValue={isoOf(q?.nextFollowUpDate) ?? ""} className="input" /></Field>
      <Field label="Reason lost (if rejected/expired)" className="md:col-span-2"><input name="lostReason" defaultValue={q?.lostReason ?? ""} className="input" /></Field>
      <Field label="Customer feedback" className="md:col-span-2"><textarea name="feedback" rows={2} defaultValue={q?.feedback} className="input" /></Field>
      <Field label="Internal notes" className="md:col-span-2"><textarea name="notes" rows={2} defaultValue={q?.notes} className="input" /></Field>
      <div className="md:col-span-4"><button className="btn btn-primary">{q ? "Save quotation" : "Create quotation"}</button></div>
    </ActionForm>
  );
}

export function OrderForm({ orgId, o, customerId, today }: { orgId: string; o?: SalesOrder | null; customerId?: string; today: string }) {
  return (
    <ActionForm action={saveOrder.bind(null, o?.id ?? null)} className="grid gap-3 md:grid-cols-4">
      <Field label="Order number" hint={o ? undefined : "Leave blank to auto-number"}><input name="number" defaultValue={o?.number} className="input" /></Field>
      <CustomerSelect orgId={orgId} name="customerId" value={o?.customerId ?? customerId} required className="md:col-span-2" />
      <OwnerSelect orgId={orgId} name="ownerId" label="Order owner" value={o?.ownerId} placeholder="Unassigned" className="" />
      <Field label="Customer PO number"><input name="customerPoNumber" defaultValue={o?.customerPoNumber} className="input" /></Field>
      <Field label="Order date *"><input type="date" name="orderDate" defaultValue={isoOf(o?.orderDate) ?? today} className="input" required /></Field>
      <Field label="Order value (₹) *"><input name="value" inputMode="decimal" defaultValue={o?.value} className="input" required /></Field>
      <Field label="Status"><Select name="status" options={ORDER_STATUSES} defaultValue={o?.status ?? "received"} /></Field>
      <Field label="Expected delivery (commitment)" hint="An operational commitment, not a guarantee"><input type="date" name="expectedDeliveryDate" defaultValue={isoOf(o?.expectedDeliveryDate) ?? ""} className="input" /></Field>
      <Field label="Delay reason" className="md:col-span-3" hint="Required when moving the commitment later"><input name="delayReason" defaultValue={o?.delayReason ?? ""} className="input" /></Field>
      <Field label="Internal notes" className="md:col-span-4"><textarea name="notes" rows={2} defaultValue={o?.notes} className="input" /></Field>
      <div className="md:col-span-4"><button className="btn btn-primary">{o ? "Save order" : "Create order"}</button></div>
    </ActionForm>
  );
}
