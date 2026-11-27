"use client";

import { useState } from "react";
import { MAX_FILE_BYTES, parseDataset, parseDatasetText, type Dataset } from "@/lib/eval/dataset";
import { Card, button, field, primary } from "./ui";

export interface Loaded { dataset: Dataset; source: string; fileName: string | null }
const SAMPLE = "evaluation/fixtures/synthetic_export.json";

export function SourcePicker({ onLoad }: { onLoad: (loaded: Loaded) => void }) {
  const [token, setToken] = useState(""); // React state only: never stored or logged
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (load: () => Promise<Loaded>) => {
    setBusy(true);
    setError("");
    try {
      onLoad(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the data.");
    } finally {
      setBusy(false);
    }
  };

  const sample = () => run(async () => {
    const file = await import("@/evaluation/fixtures/synthetic_export.json");
    return { dataset: parseDataset(file.default), source: "Bundled sample", fileName: SAMPLE };
  });

  const upload = (file: File) => run(async () => {
    if (file.size > MAX_FILE_BYTES) throw new Error("File is over 20 MB. Use the Python verifier.");
    return { dataset: parseDatasetText(await file.text()), source: `Uploaded ${file.name}`, fileName: file.name };
  });

  const live = () => run(async () => {
    const response = await fetch("/api/export", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (response.status === 401) throw new Error("Token not accepted.");
    if (response.status === 503) throw new Error("The server has no database or export token configured.");
    if (!response.ok) throw new Error(`Export failed (${response.status}).`);
    return { dataset: parseDatasetText(await response.text()), source: "Live /api/export", fileName: null };
  });

  return (
    <Card title="Load data" note="Analysis runs in this browser. Nothing loaded here is uploaded or saved.">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">1 · Sample (simulated)</h3>
          <button type="button" className={`${primary} w-full`} disabled={busy} onClick={sample}>Load Sample Study</button>
        </div>
        <label className="space-y-2">
          <span className="block text-sm font-semibold">2 · Upload export JSON</span>
          <input type="file" accept=".json,application/json" disabled={busy} className={`${field} py-2`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = ""; // the same file can be picked again
            }} />
        </label>
        <div className="space-y-2">
          <label htmlFor="export-token" className="block text-sm font-semibold">3 · Live data (export token)</label>
          <input id="export-token" type="password" autoComplete="off" spellCheck={false} className={field}
            placeholder="EXPORT_TOKEN" value={token} onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && token && !busy) void live(); }} />
          <button type="button" className={`${button} w-full`} disabled={busy || !token} onClick={live}>Fetch Live Data</button>
        </div>
      </div>
      {busy && <p role="status" className="text-sm">Loading…</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </Card>
  );
}
