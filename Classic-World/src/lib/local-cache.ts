/** Lightweight localStorage cache for instant UI hydration. */

const AUTH_KEY = "hz-auth-profile";
const BRAND_KEY = "hz-brand";

export interface AuthProfileCache {
  id: string;
  email: string;
  full_name: string;
  activated: boolean;
  role: string;
  business_id: string | null;
  business_name: string;
  logo_url: string;
  avatar_url?: string;
  updatedAt: number;
}

export interface BrandCache {
  name: string;
  logo_url: string;
  updatedAt: number;
}

function read<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { updatedAt?: number };
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write<T extends object>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, updatedAt: Date.now() }));
  } catch {
    // quota — ignore
  }
}

const PROFILE_TTL = 7 * 24 * 60 * 60 * 1000;
const BRAND_TTL = 24 * 60 * 60 * 1000;

export function readAuthProfile(): AuthProfileCache | null {
  return read<AuthProfileCache>(AUTH_KEY, PROFILE_TTL);
}

export function writeAuthProfile(profile: Omit<AuthProfileCache, "updatedAt">) {
  write(AUTH_KEY, profile);
}

export function clearAuthProfile() {
  if (typeof window !== "undefined") localStorage.removeItem(AUTH_KEY);
}

export function readBrand(): BrandCache | null {
  return read<BrandCache>(BRAND_KEY, BRAND_TTL);
}

export function writeBrand(brand: { name: string; logo_url: string }) {
  write(BRAND_KEY, brand);
}
