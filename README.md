# Ledger — AI-assisted BI tool (scaffold)

A from-scratch analytics tool: upload a CSV, ask questions in plain English,
get back SQL + a chart + narrated insights. No Power BI dependency —
this is its own engine.

## How it maps to Power BI's architecture

| Power BI piece            | This scaffold                                  |
|----------------------------|------------------------------------------------|
| VertiPaq (in-memory engine)| DuckDB-WASM, running client-side in the browser |
| Power Query                | (not yet built — see "Next steps")              |
| DAX / report canvas        | Recharts + a thin chart-type router             |
| Copilot (NL → query)       | Claude API, server-side, translating question → SQL |
| Power BI Service (sharing) | Supabase (auth + saved dashboards)              |

## Why DuckDB-WASM

It's an embeddable, columnar, OLAP-grade SQL engine that runs entirely
in the browser. Your CSV never leaves the user's machine unless you
choose to persist it — the AI layer only ever sees the **schema** (column
names/types) and small samples, not the raw dataset, which keeps the
Claude API calls cheap and avoids shipping potentially sensitive data
off-device unnecessarily.

## Running it

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY, Supabase keys

# terminal 1 — the API that talks to Claude
npm run server

# terminal 2 — the frontend
npm run dev
```

Open the Vite dev URL, upload any CSV, and ask a question like
"show total revenue by month" or "which category has the highest average price".

## Next steps (roughly in order of value)

1. **Persistence** — wire up the Supabase schema in `src/lib/supabase.ts`
   (commented out at the bottom of that file) so users can save dashboards
   and come back to them.
2. **Multi-table support** — right now it's one CSV → one table. Real BI
   needs joins across multiple sources.
3. **Power Query equivalent** — a transformation step before the table
   lands in DuckDB (rename columns, pivot, handle nulls) — could be a
   simple UI over `ALTER`/`SELECT` statements, or its own NL-driven step.
4. **Dashboard canvas** — drag multiple saved queries onto a grid
   (`react-grid-layout` is already in package.json for this).
5. **Guardrails on generated SQL** — the server already blocks DDL/DML
   keywords, but for production you'd want a proper SQL parser to validate
   the AST rather than a regex check.
6. **Auth** — Supabase Auth (email/magic link is the fastest to wire up)
   so `saved_queries` RLS policies actually mean something.

## Security notes

- The Anthropic API key lives only in `api/server.js` (backend), never
  in frontend code or `VITE_*` env vars.
- Generated SQL is restricted to `SELECT` and checked against a
  DDL/DML keyword blocklist before execution — tighten this with a real
  SQL parser before shipping to real users.
