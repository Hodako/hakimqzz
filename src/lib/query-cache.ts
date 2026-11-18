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
    const empRaw = localStorage.getItem("df_active_employee_session") || localStorage.getItem("cw_active_employee_session");
    if (empRaw) {
      const emp = JSON.parse(empRaw);
      const ownerId = emp?.owner_id || emp?.ownerId;
      if (ownerId && !["classicworld_default_owner", "classic-world-default"].includes(ownerId)) {
        return `tenant_${ownerId}`;
      }
      if (emp?.id) return `tenant_emp_${emp.id}`;
    }

    // 2. Check profile across all profile keys
    const raw =
      localStorage.getItem("hz-auth-profile") ||
      localStorage.getItem("classicworld_auth_profile") ||
      localStorage.getItem("cw-auth-profile") ||
      localStorage.getItem("auth_profile") ||
      localStorage.getItem("user");

    if (raw) {
      const u = JSON.parse(raw);
      const tenantId = u?.owner_id || u?.business_id || u?.id || u?.email;
      if (tenantId && !["classicworld_default_owner", "classic-world-default", "owner"].includes(tenantId)) {
        const activeProf = u?.activeProfile || localStorage.getItem("active_profile") || localStorage.getItem("classicworld_active_profile") || "default";
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
    if (Date.now() - entry.updatedAt > MAX_AGE_MS) return undefined;
    return entry.data as T;
  } catch {
    return undefined;
  }
}

// Write debounce map to avoid rapid successive serialization
const writeTimeouts = new Map<string, any>();

/** Persist query data to localStorage asynchronously without blocking main thread. */
export function writeQueryCache(queryKey: readonly unknown[], data: unknown) {
  if (typeof window === "undefined") return;
  if (isCashboxKey(queryKey)) return;

  const key = storageKey(queryKey);
  if (!key) return;
  if (writeTimeouts.has(key)) {
    clearTimeout(writeTimeouts.get(key));
  }

  const timeoutId = setTimeout(() => {
    writeTimeouts.delete(key);
    try {
      // For large lists (e.g. sales, products), persist the most recent 300 items
      // so local storage quota isn't exceeded and UI does not lag
      let payload = data;
      if (Array.isArray(data) && data.length > 300) {
        payload = data.slice(0, 300);
      }

      const entry: CacheEntry = { data: payload, updatedAt: Date.now() };
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
  }, 100);

  writeTimeouts.set(key, timeoutId);
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
