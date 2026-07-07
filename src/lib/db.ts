import type { Db, MongoClient } from "mongodb";

// Lazy singleton — never throws at module load time.
// process.env is read inside the function so it works with Nitro/Vite SSR.
let _clientPromise: Promise<MongoClient> | undefined;

async function getClient(): Promise<MongoClient> {
  if (_clientPromise) return _clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Add it to .env.local and restart the dev server."
    );
  }

  // Dynamic import so mongodb is never bundled for the browser
  const { MongoClient } = await import("mongodb");

  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4 to avoid secureConnect hangs on Windows/IPv6 networks
  };

  if (process.env.NODE_ENV === "development") {
    // Reuse connection across HMR reloads
    const g = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    _clientPromise = g._mongoClientPromise;
  } else {
    _clientPromise = new MongoClient(uri, options).connect();
  }

  return _clientPromise;
}

let indexesInitialized = false;

async function ensureIndexes(db: Db) {
  if (indexesInitialized) return;
  indexesInitialized = true;
  try {
    await Promise.all([
      db.collection("products").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("products").createIndex({ owner_id: 1, name: 1 }),
      db.collection("sales").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("purchases").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("cashbox_entries").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("expenses").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("somiti_entries").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("owner_withdrawals").createIndex({ owner_id: 1, created_at: -1 }),
      db.collection("parties").createIndex({ owner_id: 1, name: 1 }),
      db.collection("reminders").createIndex({ owner_id: 1, created_at: -1 }),
    ]);
  } catch (err) {
    console.error("Failed to ensure indexes:", err);
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db();
  ensureIndexes(db);
  return db;
}
