import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://uzvi_urobili:0MELD9cSevCTMaZWtSOSLZ3atsRf__rB@postgresql.uzvienterprise.com:5433/urobili";

const TENANT_TABLES = [
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
];

function sanitizeSqlIdent(raw) {
  const cleaned = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 56) || "unknown";
}

async function main() {
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 10000 });
  try {
    await pool.query(`
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

    const usersRes = await pool.query(`SELECT id, data FROM app_documents WHERE collection = 'users'`);
    const ownerIds = new Set();
    for (const row of usersRes.rows) {
      const d = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      const oid = d?.owner_id || row.id;
      if (oid && !["urobili_default_owner", "urobili-default"].includes(oid)) {
        ownerIds.add(oid);
      }
    }

    for (const ownerId of ownerIds) {
      const schema = `t_${sanitizeSqlIdent(ownerId)}`;
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
      for (const table of TENANT_TABLES) {
        const fqtn = `"${schema}"."${table}"`;
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ${fqtn} (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            data JSONB NOT NULL
          );
          CREATE INDEX IF NOT EXISTS "idx_${table}_created" ON ${fqtn} (created_at DESC);
          CREATE INDEX IF NOT EXISTS "idx_${table}_data" ON ${fqtn} USING gin (data);
        `);

        const legacy = await pool.query(
          `SELECT id, created_at, data FROM app_documents WHERE collection = $1 AND owner_id = $2`,
          [table, ownerId]
        );
        if (legacy.rows.length > 0) {
          for (const lr of legacy.rows) {
            await pool.query(
              `INSERT INTO ${fqtn} (id, owner_id, created_at, data)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO NOTHING`,
              [lr.id, ownerId, lr.created_at || new Date(), typeof lr.data === "string" ? lr.data : JSON.stringify(lr.data)]
            );
          }
          await pool.query(`DELETE FROM app_documents WHERE collection = $1 AND owner_id = $2`, [table, ownerId]);
        }
      }
    }

    console.log(`Synced PostgreSQL schemas for ${ownerIds.size} tenant(s) with ${TENANT_TABLES.length} tables each.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Schema sync failed:", err);
  process.exit(1);
});
