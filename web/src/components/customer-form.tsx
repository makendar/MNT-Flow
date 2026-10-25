import type { Customer } from "@prisma/client";
import { ActionForm } from "./action-form";
import { BusinessUnitSelect, OwnerSelect } from "./lookups";
import { Field, Select } from "./ui";
import { saveCustomer } from "@/lib/actions/customers";
import { CUSTOMER_STATUSES } from "@/lib/domain/constants";

export function CustomerForm({ orgId, c, defaultTerms = 30 }: { orgId: string; c?: Customer | null; defaultTerms?: number }) {
  const t = (k: keyof Customer) => (c ? String(c[k] ?? "") : "");
  return (
    <ActionForm action={saveCustomer.bind(null, c?.id ?? null)} className="space-y-5">
      <fieldset className="grid gap-3 md:grid-cols-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Company</legend>
        <Field label="Customer code *"><input name="code" defaultValue={t("code")} className="input" required maxLength={20} /></Field>
        <Field label="Legal / trading name *" className="md:col-span-2"><input name="name" defaultValue={t("name")} className="input" required /></Field>
        <Field label="Industry / segment"><input name="segment" defaultValue={t("segment")} className="input" /></Field>
        <Field label="GSTIN (optional)" hint="Not required to use MNT Flow"><input name="gstin" defaultValue={t("gstin")} className="input" maxLength={20} /></Field>
        <Field label="Status"><Select name="status" options={CUSTOMER_STATUSES} defaultValue={c?.status ?? "active"} /></Field>
        <Field label="Payment terms (days)"><input name="paymentTermsDays" type="number" min={0} max={365} defaultValue={c?.paymentTermsDays ?? defaultTerms} className="input" /></Field>
        <OwnerSelect orgId={orgId} name="ownerId" label="Account owner" value={c?.ownerId} placeholder="Unassigned" className="" />
        <BusinessUnitSelect orgId={orgId} name="businessUnitId" value={c?.businessUnitId} placeholder="None" className="" />
        <Field label="Tags (comma-separated)" className="md:col-span-3"><input name="tags" defaultValue={t("tags")} className="input" /></Field>
      </fieldset>
      <fieldset className="grid gap-3 md:grid-cols-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Addresses</legend>
        <Field label="Billing address" className="md:col-span-2"><textarea name="billingAddress" rows={2} defaultValue={t("billingAddress")} className="input" /></Field>
        <Field label="Shipping address" className="md:col-span-2"><textarea name="shippingAddress" rows={2} defaultValue={t("shippingAddress")} className="input" /></Field>
        <Field label="City"><input name="city" defaultValue={t("city")} className="input" /></Field>
        <Field label="State"><input name="state" defaultValue={t("state")} className="input" /></Field>
      </fieldset>
      {(["primary", "procurement", "accounts"] as const).map((k) => (
        <fieldset key={k} className="grid gap-3 md:grid-cols-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{k === "primary" ? "Primary" : k === "procurement" ? "Procurement" : "Accounts"} contact</legend>
          <Field label="Name"><input name={`${k}ContactName`} defaultValue={t(`${k}ContactName` as keyof Customer)} className="input" /></Field>
          <Field label="Email"><input name={`${k}ContactEmail`} type="email" defaultValue={t(`${k}ContactEmail` as keyof Customer)} className="input" /></Field>
          <Field label="Telephone"><input name={`${k}ContactPhone`} defaultValue={t(`${k}ContactPhone` as keyof Customer)} className="input" /></Field>
        </fieldset>
      ))}
      <Field label="Internal notes (never shown in the customer portal)"><textarea name="notes" rows={3} defaultValue={t("notes")} className="input" /></Field>
      <button className="btn btn-primary">{c ? "Save customer" : "Create customer"}</button>
    </ActionForm>
  );
}
