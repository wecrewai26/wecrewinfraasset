"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type AskResponse = {
  question: string;
  answer: string;
  confidence: string;
  evidence: unknown;
  kind: string;
  payload?: unknown;
};

const EXAMPLES = [
  "Which GPUs are throttling?",
  "Which servers have high CPU?",
  "Which racks are close to cooling capacity?",
  "Can I add eight GPUs to Rack R42?",
  "What happens if CDU-03 fails?",
  "Why is inference-gateway slow?",
  "Which assets expire next month?",
];

export default function AskPage() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(q = question) {
    setBusy(true);
    try {
      setResult(await api<AskResponse>("/api/v1/ai/ask", { method: "POST", body: JSON.stringify({ question: q }) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Ask InfraAsset</h1>
      <p className="text-sm text-muted">Every answer cites inventory, metrics or CMDB evidence. Unsupported guesses are not returned.</p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} className="text-xs border border-line rounded px-2 py-1 hover:border-coral" onClick={() => { setQuestion(e); run(e); }}>
            {e}
          </button>
        ))}
      </div>
      <textarea className="w-full bg-panel border border-line rounded p-3 h-24" value={question} onChange={(e) => setQuestion(e.target.value)} />
      <button className="bg-coral text-white px-4 py-2 rounded" disabled={busy} onClick={() => run()}>
        {busy ? "Correlating…" : "Ask"}
      </button>
      {result && (
        <div className="border border-line bg-panel p-4 rounded space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted">{result.kind} · {result.confidence}</div>
          <p className="text-lg">{result.answer}</p>
          <pre className="text-xs overflow-auto bg-ink p-3 rounded max-h-80">{JSON.stringify(result.evidence, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
