"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { commitImport, dryRunImport, type CommitResult, type DryRunResult } from "@/lib/actions/imports";
import { ENTITIES, FIELDS, autoMap, type EntityType } from "@/lib/import/fields";

const STEPS = ["Entity", "Upload", "Preview", "Map columns", "Validate", "Review", "Confirm", "Result"];
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

type Parsed = { headers: string[]; rows: Record<string, string>[] };

async function parseFile(file: File): Promise<Parsed> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return new Promise((resolve, reject) =>
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim(),
        complete: (r) => resolve({ headers: (r.meta.fields ?? []).filter(Boolean), rows: r.data }),
        error: reject,
      }),
    );
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: "" });
    const pad = (n: number) => String(n).padStart(2, "0");
    const rows = json.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` : String(v ?? "")])),
    );
    return { headers: rows.length ? Object.keys(rows[0]) : [], rows };
  }
  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

export function ImportWizard() {
  const [step, setStep] = useState(0);
  const [entity, setEntity] = useState<EntityType>("invoices");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [updateExisting, setUpdateExisting] = useState(false);
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "reject" | "warn" | "skip">("all");

  const fields = FIELDS[entity];
  const ent = ENTITIES.find((e) => e.value === entity)!;
  const mapped = useMemo(() => parsed?.rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, mapping[f.key] ? r[mapping[f.key]] ?? "" : ""]))) ?? [], [parsed, mapping, fields]);
  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  function reset() {
    setStep(0); setFile(null); setParsed(null); setMapping({}); setDry(null); setResult(null); setConfirmed(false); setErr(null); setUpdateExisting(false);
  }

  async function onFile(f: File | null) {
    setErr(null);
    setFile(f);
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setErr("File is larger than 10 MB.");
    try {
      const p = await parseFile(f);
      if (!p.rows.length) return setErr("The file has no data rows.");
      if (p.rows.length > 5000) return setErr("Files are limited to 5,000 rows per import. Split the file and import in parts.");
      setParsed(p);
      setMapping(autoMap(entity, p.headers));
      setStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read the file.");
    }
  }

  async function validate() {
    setBusy(true); setErr(null);
    const r = await dryRunImport(entity, mapped, updateExisting);
    setBusy(false);
    if ("error" in r) return setErr(r.error);
    setDry(r); setStep(5);
  }

  async function commit() {
    setBusy(true); setErr(null);
    const r = await commitImport(entity, file?.name ?? "upload.csv", mapped, updateExisting);
    setBusy(false);
    if ("error" in r) return setErr(r.error);
    setResult(r); setStep(7);
  }

  const dryOk = dry && !("error" in dry) ? dry : null;
  const visible = dryOk?.results.filter((r) => filter === "all" ? true : filter === "reject" ? r.action === "reject" : filter === "skip" ? r.action === "skip" : r.warnings.length > 0) ?? [];

  return (
    <div className="card">
      <ol className="flex flex-wrap gap-1 border-b border-slate-100 px-4 py-3 text-[11px]" aria-label="Import steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1 rounded px-2 py-1 ${i === step ? "bg-blue-700 text-white" : i < step ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
            <span className="font-semibold">{i + 1}</span> {s}
          </li>
        ))}
      </ol>
      <div className="p-4">
        {err && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{err}</div>}

        {step === 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">1. What are you importing?</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {ENTITIES.map((e) => (
                <label key={e.value} className={`cursor-pointer rounded-md border p-3 ${entity === e.value ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="entity" className="sr-only" checked={entity === e.value} onChange={() => setEntity(e.value)} />
                  <div className="text-[13px] font-semibold text-slate-800">{e.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{e.description}</div>
                </label>
              ))}
            </div>
            <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
              <b>Duplicate rule:</b> {ent.duplicateRule} <a className="link ml-2 inline-flex items-center gap-1" href={`/templates/${entity}.csv`} download><Download className="h-3 w-3" />Download {ent.label.toLowerCase()} template</a>
            </div>
            <button className="btn btn-primary mt-4" onClick={() => setStep(1)}>Continue</button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">2. Upload a CSV or XLSX file</h3>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 p-8 text-center hover:bg-slate-50">
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-[13px] text-slate-700">Choose a file (first sheet is used for XLSX)</span>
              <span className="text-xs text-slate-500">Dates: DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YYYY or YYYY-MM-DD · Amounts in INR, commas allowed · up to 5,000 rows</span>
              <input type="file" accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
            <p className="mt-2 text-xs text-slate-500">Try the demo files: <a className="link" href="/samples/demo-invoices-import.csv" download>demo-invoices-import.csv</a> (includes deliberate errors and duplicates) · <a className="link" href="/samples/demo-customers-import.csv" download>demo-customers-import.csv</a></p>
            <button className="btn mt-4" onClick={() => setStep(0)}>Back</button>
          </div>
        )}

        {step === 2 && parsed && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">3. Preview: {file?.name}</h3>
            <p className="mb-2 text-xs text-slate-500">{parsed.rows.length} data row(s), {parsed.headers.length} column(s). First 8 rows shown.</p>
            <div className="max-h-80 overflow-auto rounded border border-slate-200">
              <table className="tbl"><thead><tr><th>Row</th>{parsed.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{parsed.rows.slice(0, 8).map((r, i) => <tr key={i}><td className="text-slate-400">{i + 2}</td>{parsed.headers.map((h) => <td key={h} className="whitespace-nowrap">{r[h]}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2"><button className="btn" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={() => setStep(3)}>Map columns</button></div>
          </div>
        )}

        {step === 3 && parsed && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">4. Map file columns to MNT Flow fields</h3>
            <p className="mb-3 text-xs text-slate-500">Columns were matched automatically where the header looked familiar. Required fields are marked *.</p>
            <div className="grid gap-2 md:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2">
                  <span className="w-48 shrink-0 text-[13px]">{f.label}{f.required && <span className="text-red-600"> *</span>}</span>
                  <select className="input" value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                    <option value="">— not in file —</option>
                    {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {entity === "customers" && (
              <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Update existing customers with the same code (otherwise they are skipped)</label>
            )}
            {missingRequired.length > 0 && <p className="mt-3 text-xs text-red-700">Map required fields: {missingRequired.map((f) => f.label).join(", ")}</p>}
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" disabled={missingRequired.length > 0 || busy} onClick={() => { setStep(4); validate(); }}>{busy ? "Validating…" : "Validate (dry run)"}</button>
            </div>
          </div>
        )}

        {step === 4 && <p className="text-[13px] text-slate-600">Validating {mapped.length} rows against your data… nothing is written yet.</p>}

        {step === 5 && dryOk && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">5–6. Validation results &amp; duplicates (dry run, nothing written)</h3>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              {[["Will create", dryOk.summary.create, "text-emerald-700"], ["Will update", dryOk.summary.update, "text-blue-700"], ["Duplicates skipped", dryOk.summary.skip, "text-slate-700"], ["Rejected", dryOk.summary.reject, "text-red-700"], ["Value of new records", dryOk.summary.amount ? inr.format(dryOk.summary.amount) : "—", "text-slate-800"]].map(([l, v, c]) => (
                <div key={l as string} className="rounded border border-slate-200 p-2"><div className="text-[11px] text-slate-500">{l}</div><div className={`text-lg font-semibold tabular-nums ${c}`}>{v}</div></div>
              ))}
            </div>
            <div className="mb-2 flex flex-wrap gap-1 text-xs">
              {(["all", "reject", "warn", "skip"] as const).map((k) => <button key={k} className={`btn btn-sm ${filter === k ? "btn-primary" : ""}`} onClick={() => setFilter(k)}>{{ all: "All rows", reject: "Errors", warn: "Warnings", skip: "Duplicates" }[k]}</button>)}
            </div>
            <div className="max-h-96 overflow-auto rounded border border-slate-200">
              <table className="tbl">
                <thead><tr><th>Row</th><th>Outcome</th><th>Key</th><th>Errors / warnings</th></tr></thead>
                <tbody>
                  {visible.slice(0, 500).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td className="whitespace-nowrap">{r.action === "reject" ? <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="h-3.5 w-3.5" />Rejected</span> : r.action === "skip" ? <span className="text-slate-500">Duplicate – skip</span> : r.action === "update" ? <span className="text-blue-700">Update</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Create</span>}</td>
                      <td className="font-mono text-xs">{r.key}</td>
                      <td className="text-xs">{r.errors.map((e) => <div key={e} className="text-red-700">{e}</div>)}{r.warnings.map((w) => <div key={w} className="flex items-start gap-1 text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w}</div>)}</td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500">No rows in this view.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Rejected rows are never imported silently: fix them in the file and import again. Duplicate rule: {ent.duplicateRule}</p>
            <div className="mt-4 flex gap-2"><button className="btn" onClick={() => setStep(3)}>Back to mapping</button><button className="btn btn-primary" disabled={dryOk.summary.create + dryOk.summary.update === 0} onClick={() => setStep(6)}>Continue to confirmation</button></div>
          </div>
        )}

        {step === 6 && dryOk && (
          <div className="max-w-xl">
            <h3 className="mb-2 text-sm font-semibold">7. Confirm import</h3>
            <ul className="mb-3 list-disc pl-5 text-[13px] text-slate-700">
              <li>{dryOk.summary.create} new {ent.label.toLowerCase()} will be created{dryOk.summary.amount ? ` (total ${inr.format(dryOk.summary.amount)})` : ""}.</li>
              {dryOk.summary.update > 0 && <li>{dryOk.summary.update} existing record(s) will be updated (updates cannot be rolled back).</li>}
              <li>{dryOk.summary.skip} duplicate(s) skipped, {dryOk.summary.reject} row(s) rejected and not imported.</li>
              <li>Rows are re-validated on the server and written in one transaction with a batch ID for rollback.</li>
            </ul>
            <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I have reviewed the validation results and want to import these records into this organization.</label>
            <div className="mt-4 flex gap-2"><button className="btn" onClick={() => setStep(5)}>Back</button><button className="btn btn-primary" disabled={!confirmed || busy} onClick={commit}>{busy ? "Importing…" : "Import now"}</button></div>
          </div>
        )}

        {step === 7 && result && !("error" in result) && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />8. Import complete</h3>
            <p className="text-[13px]">Batch <span className="font-mono">{result.batchId}</span>: {result.summary.create} created, {result.summary.update} updated, {result.summary.skip} skipped, {result.summary.reject} rejected.</p>
            {(entity === "invoices" || entity === "payments") && (
              <div className="mt-3 max-w-lg rounded border border-slate-200 p-3 text-xs">
                <div className="mb-1 font-semibold">Financial totals check</div>
                {entity === "invoices" ? (
                  <>Invoice total before {inr.format(result.before.invoiceTotal)} → after {inr.format(result.after.invoiceTotal)}. Difference {inr.format(result.after.invoiceTotal - result.before.invoiceTotal)} vs imported {inr.format(result.summary.amount)}{" "}
                    {Math.abs(result.after.invoiceTotal - result.before.invoiceTotal - result.summary.amount) < 0.01 ? <b className="text-emerald-700">✓ reconciles</b> : <b className="text-red-700">✗ does not reconcile</b>}</>
                ) : (
                  <>Payments before {inr.format(result.before.paymentTotal)} → after {inr.format(result.after.paymentTotal)}. Difference {inr.format(result.after.paymentTotal - result.before.paymentTotal)} vs imported {inr.format(result.summary.amount)}{" "}
                    {Math.abs(result.after.paymentTotal - result.before.paymentTotal - result.summary.amount) < 0.01 ? <b className="text-emerald-700">✓ reconciles</b> : <b className="text-red-700">✗ does not reconcile</b>}</>
                )}
              </div>
            )}
            <div className="mt-4 flex gap-2"><button className="btn btn-primary" onClick={reset}>Start another import</button><Link className="btn" href="/imports?tab=history">View import history</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}
