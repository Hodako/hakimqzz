import { getPostgresPool, ensurePostgresSchema, ensureTenantTable, isTenantCollection } from "./postgres";
import { requestStore } from "./request-store";

function getValByPath(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  if (!path.includes(".")) return obj[path];
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

export function matchesFilter(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (!doc) return false;

  for (const key of Object.keys(filter)) {
    const expected = filter[key];

    if (key === "$or") {
      if (!Array.isArray(expected)) return false;
      const anyMatch = expected.some((f) => matchesFilter(doc, f));
      if (!anyMatch) return false;
      continue;
    }

    if (key === "$and") {
      if (!Array.isArray(expected)) return false;
      const allMatch = expected.every((f) => matchesFilter(doc, f));
      if (!allMatch) return false;
      continue;
    }

    // Key can be _id or id
    let actual: any;
    if (key === "_id" || key === "id") {
      actual = doc._id !== undefined ? doc._id : doc.id;
    } else {
      actual = getValByPath(doc, key);
    }

    if (expected !== null && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof RegExp) && !(expected instanceof Date)) {
      const opKeys = Object.keys(expected).filter((k) => k.startsWith("$"));
      if (opKeys.length > 0) {
        for (const op of opKeys) {
          const val = expected[op];
          switch (op) {
            case "$eq":
              if (String(actual) !== String(val)) return false;
              break;
            case "$ne":
              if (String(actual) === String(val)) return false;
              break;
            case "$gt":
              if (!(actual > val)) return false;
              break;
            case "$gte":
              if (!(actual >= val)) return false;
              break;
            case "$lt":
              if (!(actual < val)) return false;
              break;
            case "$lte":
              if (!(actual <= val)) return false;
              break;
            case "$in":
              if (!Array.isArray(val) || !val.some((v) => String(v) === String(actual))) return false;
              break;
            case "$nin":
              if (Array.isArray(val) && val.some((v) => String(v) === String(actual))) return false;
              break;
            case "$exists":
              if (Boolean(val) !== (actual !== undefined)) return false;
              break;
            case "$regex": {
              const regex = new RegExp(val, expected.$options || "");
              if (!regex.test(String(actual || ""))) return false;
              break;
            }
            default:
              break;
          }
        }
        continue;
      }
    }

    if (expected instanceof RegExp) {
      if (!expected.test(String(actual || ""))) return false;
      continue;
    }

    // Normal equality (with string casting for ids)
    if (key === "_id" || key === "id") {
      if (String(actual) !== String(expected)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }

  return true;
}

export function sortDocs(docs: any[], sortObj?: Record<string, 1 | -1>): any[] {
  if (!sortObj || Object.keys(sortObj).length === 0) return docs;
  const entries = Object.entries(sortObj);
  return docs.slice().sort((a, b) => {
    for (const [key, dir] of entries) {
      const valA = getValByPath(a, key);
      const valB = getValByPath(b, key);
      if (valA === valB) continue;
      if (valA == null) return dir === 1 ? -1 : 1;
      if (valB == null) return dir === 1 ? 1 : -1;
      if (valA > valB) return dir === 1 ? 1 : -1;
      if (valA < valB) return dir === 1 ? -1 : 1;
    }
    return 0;
  });
}

export function applyUpdate(doc: any, update: any): any {
  if (!update || typeof update !== "object") return doc;
  const updated = { ...doc };

  // If no $-operators, replace fields directly
  const hasOps = Object.keys(update).some((k) => k.startsWith("$"));
  if (!hasOps) {
    return { ...doc, ...update, id: doc.id || doc._id, _id: doc._id || doc.id };
  }

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = v;
      } else {
        updated[k] = v;
      }
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const curr = Number(getValByPath(updated, k)) || 0;
      updated[k] = curr + Number(v);
    }
  }

  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      delete updated[k];
    }
  }

  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      if (!Array.isArray(updated[k])) updated[k] = [];
      updated[k].push(v);
    }
  }

  if (update.$pull) {
    for (const [k, v] of Object.entries(update.$pull)) {
      if (Array.isArray(updated[k])) {
        updated[k] = updated[k].filter((item: any) => !matchesFilter(item, v));
      }
    }
  }

  return updated;
}

const BANNED_SHARED_OWNERS = new Set([
  "urobili_default_owner",
  "urobili-default",
  "classic-world-default",
  "owner",
  "default",
  "null",
  "undefined",
]);

function resolveTenantOwnerId(explicitOwnerId?: any): string | null {
  const storeOwner = requestStore.getStore()?.ownerId;
  const raw = typeof explicitOwnerId === "string" && explicitOwnerId.trim()
    ? explicitOwnerId.trim()
    : (typeof storeOwner === "string" && storeOwner.trim() ? storeOwner.trim() : null);

  if (!raw || BANNED_SHARED_OWNERS.has(raw.toLowerCase())) {
    return null;
  }
  return raw;
}

export class PostgresCollection {
  constructor(public collectionName: string) {}

  private extractId(doc: any): string {
    const id = doc.id || doc._id || (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()));
    return String(id);
  }

  private normalizeDoc(doc: any): any {
    if (!doc) return doc;
    const id = this.extractId(doc);
    return { ...doc, id, _id: id };
  }

  find(filter: any = {}): PostgresCursor {
    return new PostgresCursor(this.collectionName, filter);
  }

  async findOne(filter: any = {}): Promise<any | null> {
    const cursor = this.find(filter);
    const docs = await cursor.limit(1).toArray();
    return docs.length > 0 ? docs[0] : null;
  }

  async insertOne(doc: any): Promise<{ insertedId: string; acknowledged: boolean }> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const normalized = this.normalizeDoc(doc);
    const id = normalized.id;
    const createdAt = normalized.created_at ? new Date(normalized.created_at) : new Date();

    if (isTenantCollection(this.collectionName)) {
      const ownerId = resolveTenantOwnerId(normalized.owner_id);
      if (!ownerId) {
        throw new Error(`Tenant isolation violation: valid owner_id is required for ${this.collectionName}`);
      }
      normalized.owner_id = ownerId;
      const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
      const sql = `
        INSERT INTO ${fqtn} (id, owner_id, created_at, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET data = $4, owner_id = $2, updated_at = NOW();
      `;
      await pool.query(sql, [id, ownerId, createdAt, JSON.stringify(normalized)]);
      return { insertedId: id, acknowledged: true };
    }

    // Dedicated relational schema for users
    if (this.collectionName === "users") {
      const email = (normalized.email || "").toLowerCase().trim() || null;
      const phone = normalized.phone || null;
      const password = normalized.password || "";
      const fullName = normalized.full_name || normalized.name || "";
      const role = normalized.role || "owner";
      const businessId = normalized.business_id || null;
      const businessName = normalized.business_name || "Urobili";
      const industry = normalized.industry || null;
      const status = normalized.status || "active";
      const ownerId = normalized.owner_id || id;

      await pool.query(`
        INSERT INTO app_users (
          id, email, phone, password, full_name, role, business_id, business_name, industry, status, owner_id, created_at, updated_at, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
        ON CONFLICT (id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, app_users.email),
          phone = COALESCE(EXCLUDED.phone, app_users.phone),
          password = CASE WHEN EXCLUDED.password != '' THEN EXCLUDED.password ELSE app_users.password END,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          business_id = EXCLUDED.business_id,
          business_name = EXCLUDED.business_name,
          industry = COALESCE(EXCLUDED.industry, app_users.industry),
          status = EXCLUDED.status,
          owner_id = EXCLUDED.owner_id,
          updated_at = NOW(),
          data = EXCLUDED.data;
      `, [id, email, phone, password, fullName, role, businessId, businessName, industry, status, ownerId, createdAt, JSON.stringify(normalized)]);

      // Dual-write to app_documents for backward compatibility
      await pool.query(`
        INSERT INTO app_documents (id, collection, owner_id, created_at, data)
        VALUES ($1, 'users', $2, $3, $4)
        ON CONFLICT (collection, id) DO UPDATE
        SET data = $4, owner_id = $2, updated_at = NOW();
      `, [id, ownerId, createdAt, JSON.stringify(normalized)]);

      // Auto-provision tenant tables if owner
      if (role === "owner" && ownerId) {
        ensureTenantTable(ownerId, "restaurant_tables").catch(() => {});
      }

      return { insertedId: id, acknowledged: true };
    }

    const ownerId = normalized.owner_id ? String(normalized.owner_id) : null;
    const sql = `
      INSERT INTO app_documents (id, collection, owner_id, created_at, data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (collection, id) DO UPDATE
      SET data = $5, owner_id = $3, updated_at = NOW();
    `;
    await pool.query(sql, [id, this.collectionName, ownerId, createdAt, JSON.stringify(normalized)]);
    return { insertedId: id, acknowledged: true };
  }

  async insertMany(docs: any[]): Promise<{ insertedCount: number; insertedIds: Record<number, string> }> {
    await ensurePostgresSchema();
    const insertedIds: Record<number, string> = {};
    for (let i = 0; i < docs.length; i++) {
      const res = await this.insertOne(docs[i]);
      insertedIds[i] = res.insertedId;
    }
    return { insertedCount: docs.length, insertedIds };
  }

  async updateOne(filter: any, update: any, options: { upsert?: boolean } = {}): Promise<{ matchedCount: number; modifiedCount: number }> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const cursor = new PostgresCursor(this.collectionName, filter);
    const docs = await cursor.limit(1).toArray();

    if (docs.length === 0) {
      if (options.upsert) {
        const id = filter._id || filter.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()));
        const baseDoc = { id, _id: id, ...filter };
        const updated = applyUpdate(baseDoc, update);
        await this.insertOne(updated);
        return { matchedCount: 0, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const currentDoc = docs[0];
    const updated = applyUpdate(currentDoc, update);
    const id = this.extractId(updated);

    if (isTenantCollection(this.collectionName)) {
      const ownerId = resolveTenantOwnerId(updated.owner_id || filter.owner_id);
      if (!ownerId) {
        throw new Error(`Tenant isolation violation: valid owner_id is required for ${this.collectionName}`);
      }
      updated.owner_id = ownerId;
      const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
      await pool.query(
        `UPDATE ${fqtn} SET data = $1, owner_id = $2, updated_at = NOW() WHERE id = $3;`,
        [JSON.stringify(updated), ownerId, id]
      );
      return { matchedCount: 1, modifiedCount: 1 };
    }

    if (this.collectionName === "users") {
      const email = updated.email ? String(updated.email).toLowerCase().trim() : undefined;
      const fullName = updated.full_name || updated.name;
      const role = updated.role;
      const businessId = updated.business_id;
      const businessName = updated.business_name;
      const industry = updated.industry;
      const status = updated.status;
      const ownerId = updated.owner_id || id;

      await pool.query(`
        UPDATE app_users
        SET
          email = COALESCE($1, email),
          full_name = COALESCE($2, full_name),
          role = COALESCE($3, role),
          business_id = COALESCE($4, business_id),
          business_name = COALESCE($5, business_name),
          industry = COALESCE($6, industry),
          status = COALESCE($7, status),
          owner_id = COALESCE($8, owner_id),
          data = $9,
          updated_at = NOW()
        WHERE id = $10;
      `, [email, fullName, role, businessId, businessName, industry, status, ownerId, JSON.stringify(updated), id]);

      await pool.query(`
        UPDATE app_documents
        SET data = $1, owner_id = $2, updated_at = NOW()
        WHERE collection = 'users' AND id = $3;
      `, [JSON.stringify(updated), ownerId, id]);

      return { matchedCount: 1, modifiedCount: 1 };
    }

    const ownerId = updated.owner_id ? String(updated.owner_id) : null;
    const sql = `
      UPDATE app_documents
      SET data = $1, owner_id = $2, updated_at = NOW()
      WHERE collection = $3 AND id = $4;
    `;
    await pool.query(sql, [JSON.stringify(updated), ownerId, this.collectionName, id]);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: any, update: any): Promise<{ matchedCount: number; modifiedCount: number }> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const cursor = new PostgresCursor(this.collectionName, filter);
    const docs = await cursor.toArray();

    for (const doc of docs) {
      const updated = applyUpdate(doc, update);
      const id = this.extractId(updated);
      if (isTenantCollection(this.collectionName)) {
        const ownerId = resolveTenantOwnerId(updated.owner_id || filter.owner_id);
        if (!ownerId) continue;
        updated.owner_id = ownerId;
        const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
        await pool.query(
          `UPDATE ${fqtn} SET data = $1, owner_id = $2, updated_at = NOW() WHERE id = $3;`,
          [JSON.stringify(updated), ownerId, id]
        );
      } else {
        const ownerId = updated.owner_id ? String(updated.owner_id) : null;
        await pool.query(
          `UPDATE app_documents SET data = $1, owner_id = $2, updated_at = NOW() WHERE collection = $3 AND id = $4;`,
          [JSON.stringify(updated), ownerId, this.collectionName, id]
        );
      }
    }

    return { matchedCount: docs.length, modifiedCount: docs.length };
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const cursor = new PostgresCursor(this.collectionName, filter);
    const docs = await cursor.limit(1).toArray();

    if (docs.length === 0) return { deletedCount: 0 };
    const id = this.extractId(docs[0]);

    if (isTenantCollection(this.collectionName)) {
      const ownerId = resolveTenantOwnerId(docs[0].owner_id || filter.owner_id);
      if (!ownerId) {
        throw new Error(`Tenant isolation violation: valid owner_id is required for ${this.collectionName}`);
      }
      const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
      await pool.query(`DELETE FROM ${fqtn} WHERE id = $1;`, [id]);
      return { deletedCount: 1 };
    }

    if (this.collectionName === "users") {
      await pool.query(`DELETE FROM app_users WHERE id = $1;`, [id]);
      await pool.query(`DELETE FROM app_documents WHERE collection = 'users' AND id = $1;`, [id]);
      return { deletedCount: 1 };
    }

    await pool.query(`DELETE FROM app_documents WHERE collection = $1 AND id = $2;`, [this.collectionName, id]);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const cursor = new PostgresCursor(this.collectionName, filter);
    const docs = await cursor.toArray();

    if (docs.length === 0) return { deletedCount: 0 };
    for (const doc of docs) {
      const id = this.extractId(doc);
      if (isTenantCollection(this.collectionName)) {
        const ownerId = resolveTenantOwnerId(doc.owner_id || filter.owner_id);
        if (!ownerId) continue;
        const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
        await pool.query(`DELETE FROM ${fqtn} WHERE id = $1;`, [id]);
      } else {
        await pool.query(`DELETE FROM app_documents WHERE collection = $1 AND id = $2;`, [this.collectionName, id]);
      }
    }
    return { deletedCount: docs.length };
  }

  async countDocuments(filter: any = {}): Promise<number> {
    const cursor = await this.find(filter);
    const docs = await cursor.toArray();
    return docs.length;
  }

  async distinct(field: string, filter: any = {}): Promise<any[]> {
    const cursor = await this.find(filter);
    const docs = await cursor.toArray();
    const set = new Set();
    for (const d of docs) {
      const v = getValByPath(d, field);
      if (v !== undefined) set.add(v);
    }
    return Array.from(set);
  }

  async createIndex(_spec: any, _options?: any): Promise<string> {
    // Indexes are automatically maintained in ensurePostgresSchema
    return "idx_created";
  }

  aggregate(pipeline: any[] = []): PostgresCursor {
    return new PostgresCursor(this.collectionName, {}, pipeline);
  }
}

export class PostgresCursor {
  private _sort?: Record<string, 1 | -1>;
  private _limit?: number;
  private _skip?: number;
  private _projection?: Record<string, 0 | 1 | boolean>;

  constructor(
    private collectionName: string,
    private filter: any = {},
    private pipeline: any[] = []
  ) {}

  project(projection: Record<string, 0 | 1 | boolean>): this {
    this._projection = projection;
    return this;
  }

  sort(sortObj: Record<string, 1 | -1>): this {
    this._sort = sortObj;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  skip(n: number): this {
    this._skip = n;
    return this;
  }

  async toArray(): Promise<any[]> {
    await ensurePostgresSchema();
    const pool = getPostgresPool();

    let docs: any[] = [];

    if (isTenantCollection(this.collectionName)) {
      const ownerId = resolveTenantOwnerId(this.filter.owner_id);
      if (!ownerId) {
        // Fail closed: never return cross-tenant data if owner_id cannot be verified
        return [];
      }
      const { fqtn } = await ensureTenantTable(ownerId, this.collectionName);
      let sql = `SELECT data FROM ${fqtn}`;
      const params: any[] = [];
      const targetId = this.filter._id || this.filter.id;
      if (typeof targetId === "string" && !targetId.startsWith("$")) {
        sql += ` WHERE id = $1`;
        params.push(targetId);
      }
      sql += ` ORDER BY created_at DESC;`;
      const res = await pool.query(sql, params);
      docs = res.rows.map((r: any) => {
        const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
        const id = d.id || d._id;
        return { ...d, id, _id: id };
      });
    } else if (this.collectionName === "users") {
      let sql = `SELECT id, email, phone, full_name, role, business_id, business_name, industry, status, owner_id, created_at, updated_at, data FROM app_users`;
      const params: any[] = [];
      const targetId = this.filter._id || this.filter.id;
      const targetEmail = this.filter.email;
      if (typeof targetId === "string" && !targetId.startsWith("$")) {
        sql += ` WHERE id = $1`;
        params.push(targetId);
      } else if (typeof targetEmail === "string") {
        sql += ` WHERE LOWER(email) = LOWER($1)`;
        params.push(targetEmail.trim());
      } else if (typeof this.filter.owner_id === "string") {
        sql += ` WHERE owner_id = $1`;
        params.push(this.filter.owner_id);
      }
      sql += ` ORDER BY created_at DESC;`;

      const res = await pool.query(sql, params);
      docs = res.rows.map((r: any) => {
        const d = typeof r.data === "string" ? JSON.parse(r.data) : (r.data || {});
        const id = r.id || d.id || d._id;
        return {
          ...d,
          id,
          _id: id,
          email: r.email || d.email,
          phone: r.phone || d.phone,
          full_name: r.full_name || d.full_name,
          role: r.role || d.role,
          business_id: r.business_id || d.business_id,
          business_name: r.business_name || d.business_name,
          industry: r.industry || d.industry,
          status: r.status || d.status,
          owner_id: r.owner_id || d.owner_id,
        };
      });
    } else {
      // Global collection query optimized by collection and owner_id if available
      let sql = `SELECT data FROM app_documents WHERE collection = $1`;
      const params: any[] = [this.collectionName];

      const targetId = this.filter._id || this.filter.id;
      if (typeof targetId === "string" && !targetId.startsWith("$")) {
        sql += ` AND id = $2`;
        params.push(targetId);
      } else if (typeof this.filter.owner_id === "string") {
        sql += ` AND owner_id = $2`;
        params.push(this.filter.owner_id);
      }

      sql += ` ORDER BY created_at DESC;`;

      const res = await pool.query(sql, params);
      docs = res.rows.map((r: any) => {
        const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
        const id = d.id || d._id;
        return { ...d, id, _id: id };
      });
    }

    // In-memory precision filter
    docs = docs.filter((d: any) => matchesFilter(d, this.filter));

    // Handle aggregation pipeline ($match, $group, $sort) if any
    if (this.pipeline && this.pipeline.length > 0) {
      for (const stage of this.pipeline) {
        if (stage.$match) {
          docs = docs.filter((d: any) => matchesFilter(d, stage.$match));
        }
        if (stage.$sort) {
          docs = sortDocs(docs, stage.$sort);
        }
        if (stage.$limit) {
          docs = docs.slice(0, stage.$limit);
        }
      }
    }

    // Sort
    if (this._sort) {
      docs = sortDocs(docs, this._sort);
    }

    // Skip
    if (this._skip && this._skip > 0) {
      docs = docs.slice(this._skip);
    }

    // Limit
    if (this._limit && this._limit > 0) {
      docs = docs.slice(0, this._limit);
    }

    // Projection (MongoDB-compatible inclusion/exclusion)
    if (this._projection && Object.keys(this._projection).length > 0) {
      const entries = Object.entries(this._projection);
      const hasIncludes = entries.some(([k, v]) => k !== "_id" && Boolean(v));
      docs = docs.map((doc: any) => {
        if (hasIncludes) {
          const out: Record<string, any> = {};
          if (this._projection!._id !== 0 && this._projection!._id !== false) {
            out._id = doc._id;
            out.id = doc.id;
          }
          for (const [k, v] of entries) {
            if (Boolean(v) && doc[k] !== undefined) out[k] = doc[k];
          }
          return out;
        } else {
          const out = { ...doc };
          for (const [k, v] of entries) {
            if (v === 0 || v === false) delete out[k];
          }
          return out;
        }
      });
    }

    return docs;
  }
}
