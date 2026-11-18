const CACHE_PREFIX = "df-cache:";
const CACHE_META_KEY = "df-cache-meta";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent local cache for instant zero-lag metrics

interface CacheEntry {
  data: unknown;
  updatedAt: number;
}

interface CacheMeta {
  keys: string[];
}

export function getActiveTenantKey(): string {
  if (typeof window === "undefined") return "";
  try {
    // 1. Check active employee session
    const empRaw = localStorage.getItem("cw_active_employee_session");
    if (empRaw) {
      const emp = JSON.parse(empRaw);
      const ownerId = emp?.owner_id || emp?.ownerId;
      if (ownerId && !["urobili_default_owner", "urobili-default"].includes(ownerId)) {
        return `tenant_${ownerId}`;
      }
      if (emp?.id) return `tenant_emp_${emp.id}`;
    }

    // 2. Check profile across all profile keys
    const raw =
      localStorage.getItem("urobili_auth_profile") ||
      localStorage.getItem("cw-auth-profile") ||
      localStorage.getItem("hz-auth-profile") ||
      localStorage.getItem("auth_profile") ||
      localStorage.getItem("user");

    if (raw) {
      const u = JSON.parse(raw);
      const tenantId = u?.owner_id || u?.business_id || u?.id || u?.email;
      if (tenantId && !["urobili_default_owner", "urobili-default", "owner"].includes(tenantId)) {
        const activeProf = u?.activeProfile || localStorage.getItem("active_profile") || localStorage.getItem("urobili_active_profile") || "default";
        return `tenant_${tenantId}_${activeProf}`;
      }
    }
  } catch {}
  return "";
}

function storageKey(queryKey: readonly unknown[]) {
  const tenantKey = getActiveTenantKey();
  if (!tenantKey) return "";
  return `${CACHE_PREFIX}${tenantKey}:${JSON.stringify(queryKey)}`;
}

function isCashboxKey(queryKey: readonly unknown[]) {
  return Array.isArray(queryKey) && queryKey.length === 1 && queryKey[0] === "cashbox";
}

/** Read cached query data from localStorage if still fresh. */
export function readQueryCache<T>(queryKey: readonly unknown[]): T | undefined {
  if (typeof window === "undefined") return undefined;
  if (isCashboxKey(queryKey)) return undefined;
  const key = storageKey(queryKey);
  if (!key) return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!Number.isFinite(entry?.updatedAt) || Date.now() - entry.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return undefined;
    }
    return entry.data as T;
  } catch {
    return undefined;
  }
}

/** Persist query data to localStorage. */
export function writeQueryCache(queryKey: readonly unknown[], data: unknown) {
  if (typeof window === "undefined") return;
  if (isCashboxKey(queryKey)) return;
  const key = storageKey(queryKey);
  if (!key) return;
  try {
    const entry: CacheEntry = { data, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
    const meta: CacheMeta = JSON.parse(localStorage.getItem(CACHE_META_KEY) ?? '{"keys":[]}');
    if (!meta.keys.includes(key)) {
      meta.keys.push(key);
      if (meta.keys.length > 50) {
        const removed = meta.keys.shift();
        if (removed) localStorage.removeItem(removed);
      }
      localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
    }
  } catch {
    // quota exceeded — ignore
  }
}

/** Clear all app query cache from localStorage. */
export function clearQueryCache() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith("df-cache") || key.startsWith("cw-cache") || key === CACHE_META_KEY)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
