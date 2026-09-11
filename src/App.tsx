import { useState, useCallback } from 'react';
import { loadCSV, runQuery, describeTable } from './lib/duckdb';
import { ChartPanel } from './components/ChartPanel';

type QueryResult = {
  question: string;
  sql: string;
  chartType: string;
  explanation: string;
  rows: Record<string, unknown>[];
};

const TABLE = 'dataset';

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [schema, setSchema] = useState<{ column_name: string; column_type: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    await loadCSV(file, TABLE);
    const desc = await describeTable(TABLE);
    setSchema(desc);
    setResult(null);
    setInsights([]);
  }, []);

  const handleAsk = useCallback(async () => {
    if (!question.trim() || !schema.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nl-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, tableName: TABLE, schema })
      });
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error ?? 'Query planning failed');

      const rows = await runQuery(plan.sql);
      setResult({ question, sql: plan.sql, chartType: plan.chartType, explanation: plan.explanation, rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [question, schema]);

  const handleInsights = useCallback(async () => {
    if (!result) return;
    setLoading(true);
    try {
      const summaryRows = await runQuery(
        `SELECT * FROM "${TABLE}" USING SAMPLE 20 ROWS`
      );
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: TABLE, sample: summaryRows, summary: { columns: schema } })
      });
      const data = await res.json();
      setInsights(data.insights ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insight generation failed');
    } finally {
      setLoading(false);
    }
  }, [result, schema]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line px-8 py-5 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-tight">Ledger</h1>
        <span className="text-xs text-inkMuted font-mono">local-first analytics, ai-assisted</span>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Upload */}
        <section className="border border-line rounded-lg bg-surface p-6">
          <h2 className="font-display text-lg mb-1">Load a dataset</h2>
          <p className="text-sm text-inkMuted mb-4">CSV runs entirely in your browser via DuckDB — nothing uploads to a server.</p>
          <label className="inline-flex items-center gap-3 px-4 py-2 rounded-md border border-line bg-surfaceRaised hover:border-accentDim cursor-pointer transition-colors">
            <span className="text-sm">Choose CSV file</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          </label>
          {fileName && (
            <p className="mt-3 text-sm text-accent font-mono">{fileName} — {schema.length} columns detected</p>
          )}
        </section>

        {/* Ask */}
        {schema.length > 0 && (
          <section className="border border-line rounded-lg bg-surface p-6">
            <h2 className="font-display text-lg mb-1">Ask a question</h2>
            <p className="text-sm text-inkMuted mb-4">Plain English in, SQL + chart out.</p>
            <div className="flex gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="e.g. show revenue by month"
                className="flex-1 bg-surfaceRaised border border-line rounded-md px-4 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={handleAsk}
                disabled={loading}
                className="px-5 py-2 rounded-md bg-accent text-canvas text-sm font-medium hover:bg-accentDim disabled:opacity-50 transition-colors"
              >
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-warn">{error}</p>}
          </section>
        )}

        {/* Result */}
        {result && (
          <section className="border border-line rounded-lg bg-surface p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg">{result.explanation}</h2>
              <p className="text-xs text-inkMuted font-mono mt-1">{result.sql}</p>
            </div>
            <ChartPanel data={result.rows} chartType={result.chartType} />
            <button
              onClick={handleInsights}
              disabled={loading}
              className="text-sm text-accent hover:text-ink transition-colors"
            >
              Generate insights →
            </button>
            {insights.length > 0 && (
              <ul className="space-y-2 pt-2 border-t border-line">
                {insights.map((ins, i) => (
                  <li key={i} className="text-sm text-inkMuted flex gap-2">
                    <span className="text-accent">·</span>{ins}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
