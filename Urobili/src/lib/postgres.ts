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
    // 1. Core documents table (legacy / general)
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

    // 2. Dedicated typed schema for users (app_users)
    await p.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        full_name TEXT,
        role TEXT DEFAULT 'owner',
        business_id TEXT,
        business_name TEXT,
        industry TEXT,
        status TEXT DEFAULT 'active',
        owner_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_app_users_phone ON app_users (phone);
      CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users (role);
      CREATE INDEX IF NOT EXISTS idx_app_users_business ON app_users (business_id);
      CREATE INDEX IF NOT EXISTS idx_app_users_owner ON app_users (owner_id);
      CREATE INDEX IF NOT EXISTS idx_app_users_data ON app_users USING gin (data);
    `);

    // 3. Auto-migrate existing users from app_documents into app_users
    try {
      const existingUserDocs = await p.query(
        `SELECT id, created_at, updated_at, data FROM app_documents WHERE collection = 'users'`
      );
      for (const row of existingUserDocs.rows) {
        const d = typeof row.data === "string" ? JSON.parse(row.data) : (row.data || {});
        const email = (d.email || "").toLowerCase().trim() || null;
        const phone = d.phone || null;
        const password = d.password || "";
        const fullName = d.full_name || d.name || "";
        const role = d.role || "owner";
        const businessId = d.business_id || null;
        const businessName = d.business_name || "Urobili";
        const industry = d.industry || null;
        const status = d.status || "active";
        const ownerId = d.owner_id || row.id;

        await p.query(`
          INSERT INTO app_users (
            id, email, phone, password, full_name, role, business_id, business_name, industry, status, owner_id, created_at, updated_at, data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            password = COALESCE(NULLIF(EXCLUDED.password, ''), app_users.password),
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            business_id = EXCLUDED.business_id,
            business_name = EXCLUDED.business_name,
            industry = COALESCE(EXCLUDED.industry, app_users.industry),
            status = EXCLUDED.status,
            owner_id = EXCLUDED.owner_id,
            updated_at = NOW(),
            data = EXCLUDED.data;
        `, [
          row.id, email, phone, password, fullName, role, businessId, businessName, industry, status, ownerId,
          row.created_at || new Date(), row.updated_at || new Date(), JSON.stringify(d)
        ]);
      }
    } catch (migErr: any) {
      console.warn("[PostgreSQL Users Migration Notice]:", migErr.message);
    }

    schemaInitialized = true;
    console.log("[PostgreSQL] Core schema and app_users initialized successfully");
  } catch (err: any) {
    console.warn("[PostgreSQL Schema Notice]:", err.message);
  }
}

/**
 * Pre-provisions all isolated tenant tables in t_{ownerId} for an owner.
 * Ensures every owner has their own dedicated schema and tables.
 */
export async function ensureOwnerAllTables(ownerId: string): Promise<string> {
  const schema = getTenantSchemaName(ownerId);
  const p = getPostgresPool();
  await ensurePostgresSchema();
  await p.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);

  // Initialize all collections for this tenant
  for (const coll of Array.from(TENANT_COLLECTIONS)) {
    const table = sanitizeSqlIdent(coll);
    const fqtn = `"${schema}"."${table}"`;
    try {
      await p.query(`
        CREATE TABLE IF NOT EXISTS ${fqtn} (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          data JSONB NOT NULL
        );
      `);
      await p.query(`CREATE INDEX IF NOT EXISTS "idx_${table}_created" ON ${fqtn} (created_at DESC);`).catch(() => {});
      await p.query(`CREATE INDEX IF NOT EXISTS "idx_${table}_status" ON ${fqtn} ((data->>'status'));`).catch(() => {});
      await p.query(`CREATE INDEX IF NOT EXISTS "idx_${table}_data" ON ${fqtn} USING gin (data);`).catch(() => {});
      initializedTenantTables.add(`${schema}.${table}`);
    } catch (_) {}
  }

  return schema;
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
