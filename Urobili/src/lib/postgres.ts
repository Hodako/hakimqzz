import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgresql://uzvi_urobili:0MELD9cSevCTMaZWtSOSLZ3atsRf__rB@postgresql.uzvienterprise.com:5433/urobili";

let pool: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool {
  if (!pool) {
    const isSsl = process.env.PG_SSL === "true" || connectionString.includes("sslmode=require");
    pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]:", err.message);
    });
  }
  return pool;
}

export const TENANT_COLLECTIONS = new Set([
  "products",
  "sales",
  "purchases",
  "expenses",
  "cashbox",
  "cashbox_entries",
  "parties",
  "customers",
  "returns",
  "payments",
  "payable_settlements",
  "party_receivables",
  "party_payables",
  "party_payable_settlements",
  "somitis",
  "somiti_entries",
  "somiti_withdrawals",
  "owner_wallet",
  "owner_withdrawals",
  "withdrawals",
  "bank_accounts",
  "bank_transactions",
  "bank_loans",
  "bank_loan_payments",
  "employees",
  "employee_expenses",
  "employee_salaries",
  "employee_shoppings",
  "invoices",
  "reminders",
  "recycle_bin",
  "activity_logs",
  "popup_dismissals",
  "sms_logs",
  "sms_settings",
  "whatsapp_sessions",
  "invoice_templates",
  "label_templates",
  "ai_audits",
  "restaurant_floors",
  "restaurant_tables",
  "restaurant_orders",
  "restaurant_billing_queue",
  "restaurant_drafts",
  "restaurant_reservations",
  "restaurant_qr_orders",
  "pos_shifts",
  "pharmacy_rx_orders",
  "pharmacy_suppliers",
  "pharmacy_hold_orders",
]);

export function isTenantCollection(collectionName: string): boolean {
  return TENANT_COLLECTIONS.has(collectionName);
}

/** Strictly sanitize an identifier to [a-z0-9_] to prevent SQL injection */
export function sanitizeSqlIdent(raw: string): string {
  const cleaned = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 56) || "unknown";
}

export function getTenantSchemaName(ownerId: string): string {
  // Use deterministic schema name per ownerId (including profile suffix if any)
  return `t_${sanitizeSqlIdent(ownerId)}`;
}

let schemaInitialized = false;
const initializedTenantTables = new Set<string>();

export async function ensurePostgresSchema(): Promise<void> {
  if (schemaInitialized) return;
  const p = getPostgresPool();
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS app_documents (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        owner_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL,
        PRIMARY KEY (collection, id)
      );

      CREATE INDEX IF NOT EXISTS idx_app_docs_coll_owner ON app_documents (collection, owner_id);
      CREATE INDEX IF NOT EXISTS idx_app_docs_coll_created ON app_documents (collection, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_app_docs_data ON app_documents USING gin (data);
    `);
    schemaInitialized = true;
    console.log("[PostgreSQL] Core schema initialized successfully");
  } catch (err: any) {
    console.warn("[PostgreSQL Schema Notice]:", err.message);
  }
}

/**
 * Ensures a physically isolated PostgreSQL schema + table exists for a specific tenant & collection.
 * E.g., "t_eebe83a2_26c6..."."products"
 */
export async function ensureTenantTable(ownerId: string, collectionName: string): Promise<{ schema: string; table: string; fqtn: string }> {
  await ensurePostgresSchema();
  const schema = getTenantSchemaName(ownerId);
  const table = sanitizeSqlIdent(collectionName);
  const fqtn = `"${schema}"."${table}"`;
  const cacheKey = `${schema}.${table}`;

  if (initializedTenantTables.has(cacheKey)) {
    return { schema, table, fqtn };
  }

  const p = getPostgresPool();
  await p.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS ${fqtn} (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_${table}_created" ON ${fqtn} (created_at DESC);
    CREATE INDEX IF NOT EXISTS "idx_${table}_status" ON ${fqtn} ((data->>'status'));
    CREATE INDEX IF NOT EXISTS "idx_${table}_data" ON ${fqtn} USING gin (data);
  `);

  // One-time auto-migration from legacy shared app_documents for this tenant & collection
  try {
    const legacy = await p.query(
      `SELECT id, owner_id, created_at, data FROM app_documents WHERE collection = $1 AND owner_id = $2`,
      [collectionName, ownerId]
    );
    if (legacy.rows.length > 0) {
      for (const row of legacy.rows) {
        await p.query(
          `INSERT INTO ${fqtn} (id, owner_id, created_at, data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, ownerId, row.created_at || new Date(), typeof row.data === "string" ? row.data : JSON.stringify(row.data)]
        );
      }
      await p.query(
        `DELETE FROM app_documents WHERE collection = $1 AND owner_id = $2`,
        [collectionName, ownerId]
      );
    }
  } catch (migErr: any) {
    console.warn(`[PostgreSQL Tenant Migration Notice] (${cacheKey}):`, migErr.message);
  }

  initializedTenantTables.add(cacheKey);
  return { schema, table, fqtn };
}

export async function sqlQuery(text: string, params: any[] = []): Promise<pg.QueryResult> {
  const p = getPostgresPool();
  return await p.query(text, params);
}
