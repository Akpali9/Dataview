import * as duckdb from '@duckdb/duckdb-wasm';

let dbInstance: duckdb.AsyncDuckDB | null = null;

/**
 * Boots a single shared DuckDB-WASM instance for the session.
 * DuckDB is the analytical engine here — it plays the role that
 * VertiPaq plays inside Excel/Power BI: fast columnar SQL over
 * whatever the user loads in, entirely client-side.
 */
export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (dbInstance) return dbInstance;

  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  dbInstance = db;
  return db;
}

/** Registers an uploaded File (CSV) as a queryable table. */
export async function loadCSV(file: File, tableName: string) {
  const db = await getDB();
  const buf = new Uint8Array(await file.arrayBuffer());
  await db.registerFileBuffer(file.name, buf);

  const conn = await db.connect();
  await conn.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_csv_auto('${file.name}', ALL_VARCHAR=FALSE)
  `);
  await conn.close();
}

/** Runs an arbitrary SQL query and returns plain JS rows. */
export async function runQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const db = await getDB();
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    return result.toArray().map((row) => row.toJSON()) as T[];
  } finally {
    await conn.close();
  }
}

/** Returns column name + inferred type for a table, so the NL-to-SQL prompt has schema context. */
export async function describeTable(tableName: string) {
  return runQuery<{ column_name: string; column_type: string }>(
    `DESCRIBE "${tableName}"`
  );
}
