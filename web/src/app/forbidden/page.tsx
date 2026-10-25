import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card max-w-md p-6 text-center">
        <ShieldX className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <h1 className="text-base font-semibold text-slate-900">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-[13px] text-slate-500">Your role does not include this permission. Ask your organization admin if you need access.</p>
        <Link href="/action-center" className="btn btn-primary mt-4">Go to Action Center</Link>
      </div>
    </div>
  );
}
