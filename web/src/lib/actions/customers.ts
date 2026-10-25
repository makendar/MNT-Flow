"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { CUSTOMER_STATUSES } from "@/lib/domain/constants";
import { oneOf, req, run, s, UserError, type ActionState } from "./run";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN = /^[0-9]{2}[A-Z0-9]{13}$/;

export async function saveCustomer(id: string | null, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("customers:edit");
    const code = req(fd, "code", "Customer code").toUpperCase();
    if (!/^[A-Z0-9\-_/]{1,20}$/.test(code)) throw new UserError("Customer code may contain letters, digits, - _ / (max 20).");
    const gstin = s(fd, "gstin")?.toUpperCase() ?? null;
    if (gstin && !GSTIN.test(gstin) && !gstin.startsWith("DEMO-")) throw new UserError("GSTIN must be 15 characters (e.g. 33ABCDE1234F1Z5) or left blank.");
    for (const k of ["primaryContactEmail", "procurementContactEmail", "accountsContactEmail"]) {
      const v = s(fd, k);
      if (v && !EMAIL.test(v)) throw new UserError(`Invalid email: ${v}`);
    }
    const terms = Number(s(fd, "paymentTermsDays") ?? "30");
    if (!Number.isInteger(terms) || terms < 0 || terms > 365) throw new UserError("Payment terms must be 0–365 days.");
    const ownerId = s(fd, "ownerId");
    if (ownerId && !(await db.user.findFirst({ where: { id: ownerId, orgId: user.orgId } }))) throw new UserError("Invalid owner.");
    const bu = s(fd, "businessUnitId");
    if (bu && !(await db.businessUnit.findFirst({ where: { id: bu, orgId: user.orgId } }))) throw new UserError("Invalid business unit.");
    const dup = await db.customer.findFirst({ where: { orgId: user.orgId, code, ...(id ? { id: { not: id } } : {}) } });
    if (dup) throw new UserError(`Customer code ${code} is already used by ${dup.name}.`);

    const data = {
      code,
      name: req(fd, "name", "Customer name"),
      segment: s(fd, "segment") ?? "",
      gstin,
      billingAddress: s(fd, "billingAddress") ?? "",
      shippingAddress: s(fd, "shippingAddress") ?? "",
      city: s(fd, "city") ?? "",
      state: s(fd, "state") ?? "",
      primaryContactName: s(fd, "primaryContactName") ?? "",
      primaryContactEmail: s(fd, "primaryContactEmail") ?? "",
      primaryContactPhone: s(fd, "primaryContactPhone") ?? "",
      procurementContactName: s(fd, "procurementContactName") ?? "",
      procurementContactEmail: s(fd, "procurementContactEmail") ?? "",
      procurementContactPhone: s(fd, "procurementContactPhone") ?? "",
      accountsContactName: s(fd, "accountsContactName") ?? "",
      accountsContactEmail: s(fd, "accountsContactEmail") ?? "",
      accountsContactPhone: s(fd, "accountsContactPhone") ?? "",
      paymentTermsDays: terms,
      ownerId,
      businessUnitId: bu,
      status: oneOf(s(fd, "status") ?? "active", CUSTOMER_STATUSES, "status"),
      notes: s(fd, "notes") ?? "",
      tags: (s(fd, "tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).join(","),
    };
    if (id) {
      const existing = await db.customer.findFirst({ where: { id, orgId: user.orgId } });
      if (!existing) throw new UserError("Customer not found.");
      await db.customer.update({ where: { id }, data });
      await logEvent(user, { entityType: "customer", entityId: id, customerId: id, kind: "updated", message: "Customer profile updated." });
      revalidatePath(`/customers/${id}`);
      return "Customer saved.";
    }
    const c = await db.customer.create({ data: { ...data, orgId: user.orgId } });
    await logEvent(user, { entityType: "customer", entityId: c.id, customerId: c.id, kind: "created", message: `Customer ${c.name} created.` });
    redirect(`/customers/${c.id}`);
  });
}
