import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * POST /api/nl-to-sql
 * body: { question: string, tableName: string, schema: {column_name, column_type}[] }
 * returns: { sql: string, chartType: string, explanation: string }
 *
 * Translates a natural-language question into a DuckDB SQL query, plus
 * a recommended chart type, given the schema of the currently loaded table.
 * The query runs client-side against DuckDB-WASM — this endpoint only
 * ever sees the schema, never the underlying data.
 */
app.post('/api/nl-to-sql', async (req, res) => {
  const { question, tableName, schema } = req.body;
  if (!question || !tableName || !schema) {
    return res.status(400).json({ error: 'question, tableName, and schema are required' });
  }

  const schemaText = schema.map((c) => `${c.column_name} (${c.column_type})`).join(', ');

  const system = `You translate analytics questions into a single DuckDB SQL query.
Table name: "${tableName}"
Columns: ${schemaText}

Rules:
- Return ONLY valid JSON, no markdown fences, no preamble.
- JSON shape: {"sql": string, "chartType": "bar"|"line"|"scatter"|"table", "explanation": string}
- SQL must be a single SELECT statement, DuckDB-compatible, referencing only "${tableName}" and the columns listed.
- Never write DDL or DML (no INSERT/UPDATE/DELETE/DROP/ALTER).
- chartType should fit the shape of the result: time-series -> line, category comparison -> bar, two numeric fields -> scatter, else -> table.
- explanation is one short sentence describing what the query shows, in plain language for the end user.`;

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: question }]
    });

    const text = msg.content.find((b) => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    if (!parsed.sql || /\b(insert|update|delete|drop|alter|create)\b/i.test(parsed.sql)) {
      return res.status(422).json({ error: 'Model did not return a safe read-only query.' });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'nl-to-sql generation failed' });
  }
});

/**
 * POST /api/insights
 * body: { tableName: string, sample: object[], summary: object }
 * returns: { insights: string[] }
 *
 * Given a small sample of rows plus precomputed aggregate stats (means,
 * min/max, null counts — computed client-side in DuckDB), asks Claude to
 * narrate what's notable. Only a sample + stats are sent, not the full dataset.
 */
app.post('/api/insights', async (req, res) => {
  const { tableName, sample, summary } = req.body;
  if (!tableName || !summary) {
    return res.status(400).json({ error: 'tableName and summary are required' });
  }

  const system = `You are a data analyst. Given a table's summary statistics and a small
row sample, write 2-4 short, specific, plain-language observations (trends, outliers,
notable comparisons). Return ONLY JSON: {"insights": string[]}. Each insight under 25 words.
Do not invent numbers not supported by the data provided.`;

  const userContent = JSON.stringify({ tableName, summary, sample: (sample ?? []).slice(0, 20) });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: userContent }]
    });

    const text = msg.content.find((b) => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'insight generation failed' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`AI-BI API server on :${PORT}`));
