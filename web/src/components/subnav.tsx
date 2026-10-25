import { Tabs } from "./ui";

export function ReceivablesTabs({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      tabs={[
        { key: "invoices", label: "Invoice register", href: "/receivables" },
        { key: "promises", label: "Payment promises", href: "/receivables/promises" },
        { key: "activities", label: "Collection activity", href: "/receivables/activities" },
        { key: "exceptions", label: "Data exceptions", href: "/receivables/exceptions" },
      ]}
    />
  );
}
