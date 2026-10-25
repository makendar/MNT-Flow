import { getBusinessUnits, getCustomers, getUsers } from "@/lib/data/lookups";
import { Field, Select } from "./ui";

type P = { orgId: string; value?: string | null; name?: string; label?: string; placeholder?: string; required?: boolean; className?: string };

export async function CustomerSelect({ orgId, value, name = "customer", label = "Customer", placeholder = "All customers", required, className = "w-52" }: P) {
  const cs = await getCustomers(orgId);
  return (
    <Field label={label} className={className}>
      <Select name={name} defaultValue={value} placeholder={required ? undefined : placeholder} required={required} options={cs.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} />
    </Field>
  );
}

export async function OwnerSelect({ orgId, value, name = "owner", label = "Owner", placeholder = "All owners", required, className = "w-44" }: P) {
  const us = await getUsers(orgId);
  return (
    <Field label={label} className={className}>
      <Select name={name} defaultValue={value} placeholder={required ? undefined : placeholder} required={required} options={us.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} />
    </Field>
  );
}

export async function BusinessUnitSelect({ orgId, value, name = "bu", label = "Business unit", placeholder = "All units", className = "w-40" }: P) {
  const bus = await getBusinessUnits(orgId);
  return (
    <Field label={label} className={className}>
      <Select name={name} defaultValue={value} placeholder={placeholder} options={bus.map((b) => ({ value: b.id, label: b.name }))} />
    </Field>
  );
}
