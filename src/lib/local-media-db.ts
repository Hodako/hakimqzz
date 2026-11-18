"use client";

import { useEffect, useState } from "react";
import { readAuthProfile } from "@/lib/local-cache";

export const LOCAL_MEDIA_DB_NAME = "classic_world_local_db";
export const LOCAL_MEDIA_DB_VERSION = 1;
export const LOCAL_MEDIA_STORE = "media";
export const IDB_MEDIA_PREFIX = "idb://";
export const LOCAL_MEDIA_UPDATED_EVENT = "cw-local-media-updated";

export interface LocalMediaRecord {
  key: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  updatedAt: number;
}

const OBJECT_URL_CACHE = new Map<string, string>();
let dbPromise: Promise<IDBDatabase> | null = null;

export function isLocalMediaRef(value?: string | null): value is string {
  return typeof value === "string" && value.startsWith(IDB_MEDIA_PREFIX);
}

export function extractLocalMediaKey(refOrKey: string): string {
  return refOrKey.startsWith(IDB_MEDIA_PREFIX)
    ? refOrKey.slice(IDB_MEDIA_PREFIX.length)
    : refOrKey;
}

export function getScopedMediaKey(
  baseKey: "emerald_backdrop" | "classic_backdrop" | "store_logo",
): string {
  if (typeof window === "undefined") return `${baseKey}__default`;
  try {
    const profile = readAuthProfile();
    const biz = (profile?.business_id || "classic-world-default").replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    const activeProfile = (
      window.localStorage.getItem("active_profile") || "default"
    ).replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${baseKey}__${biz}__${activeProfile}`;
  } catch {
    return `${baseKey}__default`;
  }
}

function openMediaDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_MEDIA_DB_NAME, LOCAL_MEDIA_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOCAL_MEDIA_STORE)) {
        db.createObjectStore(LOCAL_MEDIA_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
}

function emitMediaUpdated(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOCAL_MEDIA_UPDATED_EVENT, { detail: { key } }),
  );
}

function cacheObjectUrl(key: string, blob: Blob): string {
  const prevUrl = OBJECT_URL_CACHE.get(key);
  const nextUrl = URL.createObjectURL(blob);
  OBJECT_URL_CACHE.set(key, nextUrl);
  if (prevUrl && prevUrl.startsWith("blob:")) {
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(prevUrl);
      } catch {
        // ignore
      }
    }, 1500);
  }
  return nextUrl;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function optimizeImageForStorage(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    quality?: number;
    preserveAlpha?: boolean;
  },
): Promise<{ blob: Blob; dataUrl: string }> {
  const { maxWidth, maxHeight, quality = 0.88, preserveAlpha = false } = options;

  if (file.type === "image/svg+xml") {
    const dataUrl = await blobToDataUrl(file);
    return { blob: file, dataUrl };
  }

  const tempUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Invalid image file"));
      el.src = tempUrl;
    });

    const scale = Math.min(
      1,
      maxWidth / Math.max(1, img.naturalWidth),
      maxHeight / Math.max(1, img.naturalHeight),
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallbackDataUrl = await blobToDataUrl(file);
      return { blob: file, dataUrl: fallbackDataUrl };
    }

    ctx.drawImage(img, 0, 0, width, height);

    const preferPng =
      preserveAlpha ||
      file.type === "image/png" ||
      file.type === "image/webp" ||
      file.type === "image/gif";
    const targetMime = preserveAlpha
      ? "image/png"
      : preferPng
        ? "image/webp"
        : "image/jpeg";

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || file),
        targetMime,
        targetMime === "image/png" ? undefined : quality,
      );
    });

    const dataUrl = await blobToDataUrl(blob);
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

export async function saveLocalMediaRecord(
  key: string,
  blob: Blob,
  fileName = "asset.png",
): Promise<string> {
  const cleanKey = extractLocalMediaKey(key);
  const db = await openMediaDb();
  const record: LocalMediaRecord = {
    key: cleanKey,
    blob,
    mimeType: blob.type || "image/png",
    fileName,
    updatedAt: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LOCAL_MEDIA_STORE, "readwrite");
    tx.objectStore(LOCAL_MEDIA_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
  });

  cacheObjectUrl(cleanKey, blob);
  emitMediaUpdated(cleanKey);
  return `${IDB_MEDIA_PREFIX}${cleanKey}`;
}

export async function saveLocalBackgroundImage(
  file: File,
  baseKey: "emerald_backdrop" | "classic_backdrop" = "emerald_backdrop",
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }
  const key = getScopedMediaKey(baseKey);
  const { blob } = await optimizeImageForStorage(file, {
    maxWidth: 1920,
    maxHeight: 1200,
    quality: 0.88,
    preserveAlpha: false,
  });
  return await saveLocalMediaRecord(key, blob, file.name);
}

export async function saveLocalStoreLogo(
  input: File | string,
  fileName = "store-logo.png",
): Promise<{ localRef: string; compactDataUrl: string }> {
  const key = getScopedMediaKey("store_logo");
  let blob: Blob;
  let compactDataUrl: string;

  if (typeof input === "string") {
    compactDataUrl = input;
    blob = await dataUrlToBlob(input);
  } else {
    if (!input.type.startsWith("image/")) {
      throw new Error("Please select an image file");
    }
    const processed = await optimizeImageForStorage(input, {
      maxWidth: 384,
      maxHeight: 384,
      quality: 0.92,
      preserveAlpha: true,
    });
    blob = processed.blob;
    compactDataUrl = processed.dataUrl;
  }

  const localRef = await saveLocalMediaRecord(key, blob, fileName);
  return { localRef, compactDataUrl };
}

export async function readLocalMediaUrl(refOrKey: string): Promise<string> {
  const cleanKey = extractLocalMediaKey(refOrKey);
  const cached = OBJECT_URL_CACHE.get(cleanKey);
  if (cached) return cached;

  try {
    const db = await openMediaDb();
    const record = await new Promise<LocalMediaRecord | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(LOCAL_MEDIA_STORE, "readonly");
        const req = tx.objectStore(LOCAL_MEDIA_STORE).get(cleanKey);
        req.onsuccess = () => resolve(req.result as LocalMediaRecord | undefined);
        req.onerror = () => reject(req.error);
      },
    );
    if (!record?.blob) return "";
    return cacheObjectUrl(cleanKey, record.blob);
  } catch {
    return "";
  }
}

export async function deleteLocalMedia(refOrKey: string): Promise<void> {
  const cleanKey = extractLocalMediaKey(refOrKey);
  const prevUrl = OBJECT_URL_CACHE.get(cleanKey);
  OBJECT_URL_CACHE.delete(cleanKey);
  if (prevUrl && prevUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(prevUrl);
    } catch {
      // ignore
    }
  }

  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOCAL_MEDIA_STORE, "readwrite");
      tx.objectStore(LOCAL_MEDIA_STORE).delete(cleanKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }

  emitMediaUpdated(cleanKey);
}

/**
 * Resolves `idb://` local database image references into live blob URLs,
 * passing regular HTTP(S)/data/relative URLs through unchanged.
 */
export function useResolvedMediaUrl(
  ref?: string | null,
  fallback = "",
): string {
  const normalized = (ref || "").trim();
  const [resolved, setResolved] = useState<string>(() => {
    if (!normalized) return fallback;
    if (!isLocalMediaRef(normalized)) return normalized;
    return OBJECT_URL_CACHE.get(extractLocalMediaKey(normalized)) || fallback;
  });

  useEffect(() => {
    let active = true;

    const resolveNow = () => {
      if (!normalized) {
        setResolved(fallback);
        return;
      }
      if (!isLocalMediaRef(normalized)) {
        setResolved(normalized);
        return;
      }
      const key = extractLocalMediaKey(normalized);
      const cached = OBJECT_URL_CACHE.get(key);
      if (cached) {
        setResolved(cached);
        return;
      }
      readLocalMediaUrl(key).then((url) => {
        if (active) setResolved(url || fallback);
      });
    };

    resolveNow();

    const onUpdated = (e: Event) => {
      if (!isLocalMediaRef(normalized)) return;
      const detailKey = (e as CustomEvent<{ key?: string }>)?.detail?.key;
      const myKey = extractLocalMediaKey(normalized);
      if (!detailKey || detailKey === myKey) {
        resolveNow();
      }
    };

    window.addEventListener(LOCAL_MEDIA_UPDATED_EVENT, onUpdated);
    return () => {
      active = false;
      window.removeEventListener(LOCAL_MEDIA_UPDATED_EVENT, onUpdated);
    };
  }, [normalized, fallback]);

  return resolved;
}
