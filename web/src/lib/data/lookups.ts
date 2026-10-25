import { cache } from "react";
import { db } from "@/lib/db";

// Every data function takes the session's orgId; tenant scoping happens here, never in components.

export const getUsers = cache(async (orgId: string) =>
  db.user.findMany({ where: { orgId, role: { not: "customer_portal" } }, select: { id: true, name: true, role: true, team: true, email: true, active: true }, orderBy: { name: "asc" } }),
);

export const getUserMap = cache(async (orgId: string) => new Map((await getUsers(orgId)).map((u) => [u.id, u.name])));

export const getCustomers = cache(async (orgId: string) =>
  db.customer.findMany({ where: { orgId }, select: { id: true, name: true, code: true, paymentTermsDays: true, ownerId: true, businessUnitId: true }, orderBy: { name: "asc" } }),
);

export const getCustomerMap = cache(async (orgId: string) => new Map((await getCustomers(orgId)).map((c) => [c.id, c])));

export const getBusinessUnits = cache(async (orgId: string) => db.businessUnit.findMany({ where: { orgId }, orderBy: { name: "asc" } }));
