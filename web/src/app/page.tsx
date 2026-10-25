import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const me = await getCurrentUser();
  redirect(!me ? "/mnt-flow" : me.role === "customer_portal" ? "/portal" : "/action-center");
}
