"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

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
  const [error, setError] = useState<string | null>(null);

  async function run(q = question) {
    setBusy(true);
    setError(null);
    try {
      setResult(await api<AskResponse>("/api/v1/ai/ask", { method: "POST", body: JSON.stringify({ question: q }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="AI operations"
        title="Ask InfraAsset"
        description="Every answer cites inventory, metrics or CMDB evidence. Unsupported guesses are not returned."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            className="rounded-full border border-line bg-panel px-3 py-1 text-xs hover:border-coral"
            onClick={() => {
              setQuestion(e);
              void run(e);
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <textarea
        className="mb-3 h-24 w-full rounded-2xl border border-line bg-panel p-3 text-sm outline-none focus:border-coral"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button className="mb-5 h-10 rounded-md bg-coral px-4 text-sm font-medium text-white disabled:opacity-60" disabled={busy} onClick={() => void run()}>
        {busy ? "Correlating…" : "Ask"}
      </button>
      {error ? <p className="mb-3 text-sm text-crit">{error}</p> : null}
      {result ? (
        <Panel title={result.kind.replaceAll("_", " ")} subtitle={`Confidence ${result.confidence}`}>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <StatusChip value={result.kind} />
              <StatusChip value={result.confidence} />
            </div>
            <p className="text-lg leading-relaxed">{result.answer}</p>
            <pre className="max-h-80 overflow-auto rounded-xl bg-[#f7f4ee] p-3 font-mono text-[11px] text-muted">
              {JSON.stringify(result.evidence, null, 2)}
            </pre>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
