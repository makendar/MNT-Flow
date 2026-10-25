import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { demoLogin, demoLoginEnabled, login } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLES, labelOf } from "@/lib/domain/constants";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const me = await getCurrentUser();
  if (me) redirect(me.role === "customer_portal" ? "/portal" : "/action-center");
  const showDemo = await demoLoginEnabled();
  const demoUsers = showDemo ? await db.user.findMany({ where: { org: { isDemo: true }, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true, email: true } }) : [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-nav text-sm font-bold text-teal-400">MF</div>
        <div>
          <div className="text-base font-semibold text-slate-900">MNT Flow</div>
          <div className="text-xs text-slate-500">Manufacturing, Customer &amp; Cash Intelligence</div>
        </div>
      </div>
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-[360px_1fr]">
        <div className="card p-5">
          <h1 className="mb-4 text-base font-semibold text-slate-900">Sign in</h1>
          <ActionForm action={login} className="space-y-3">
            <label className="block">
              <span className="label">Work email</span>
              <input name="email" type="email" autoComplete="username" required className="input" />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input name="password" type="password" autoComplete="current-password" required className="input" />
            </label>
            <button className="btn btn-primary w-full">Sign in</button>
          </ActionForm>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/mnt-flow" className="link">About MNT Flow</Link>
          </p>
        </div>
        {showDemo && demoUsers.length > 0 && (
          <div className="card p-5">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Demo accounts</h2>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">DEMO ONLY</span>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Synthetic organization &ldquo;Demo Precision Components Pvt. Ltd.&rdquo;. Password for every account: <code className="rounded bg-slate-100 px-1">Demo@1234</code>. Disabled in production unless MNT_DEMO_LOGIN=true.
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {demoUsers.map((u) => (
                <li key={u.id}>
                  <form action={demoLogin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50/40">
                      <span className="block text-[13px] font-medium text-slate-800">{u.name}</span>
                      <span className="block text-[11px] text-slate-500">{labelOf(ROLES, u.role)}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
