"use client";

import type { QueryClient } from "@tanstack/react-query";
import { uploadImageFn, updateBusinessSettingsFn } from "@/lib/rpc";
import { readBrand, writeBrand } from "@/lib/local-cache";
import { saveLocalStoreLogo } from "@/lib/local-media-db";

export interface SaveStoreLogoOptions {
  /** Uploaded image file or already-cropped data URL */
  input?: File | string;
  /** Explicit URL (used when pasting URL or resetting to `/logo.png`) */
  logoUrl?: string;
  /** Optional updated store name */
  businessName?: string;
  /** Original filename for Storage/IndexedDB metadata */
  fileName?: string;
  /** Fallback name when reading existing brand cache */
  fallbackName?: string;
  /** Syncs auth profile context immediately across sidebar/header */
  updateUser?: (patch: { logo_url?: string; business_name?: string }) => void;
  /** Optional React Query client to invalidate business/user caches */
  qc?: QueryClient;
}

/**
 * Persists a store logo cleanly across IndexedDB local DB (`classic_world_local_db`),
 * offline/local brand cache, AuthContext, and Firestore business settings.
 */
export async function persistStoreLogo(
  options: SaveStoreLogoOptions,
): Promise<{ finalUrl: string; localRef?: string }> {
  let resolvedUrl = (options.logoUrl || "").trim();
  let localRef: string | undefined;

  if (options.input) {
    const saved = await saveLocalStoreLogo(
      options.input,
      options.fileName || "store-logo.png",
    );
    localRef = saved.localRef;
    resolvedUrl = saved.compactDataUrl;

    // Best-effort quick cloud upload with short timeout so offline Electron stays instant
    try {
      const uploadPromise = uploadImageFn({
        data: {
          base64: saved.compactDataUrl,
          fileName: options.fileName || "store-logo.png",
        },
      });
      const timeoutPromise = new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), 4500),
      );
      const res: any = await Promise.race([uploadPromise, timeoutPromise]);
      const remoteUrl = res?.url || res?.data?.url;
      if (typeof remoteUrl === "string" && remoteUrl.trim()) {
        resolvedUrl = remoteUrl.trim();
      }
    } catch {
      // Offline / non-configured Firebase Storage falls back to saved.compactDataUrl
    }
  }

  const finalUrl = resolvedUrl || "/logo.png";
  const nextName = (options.businessName || "").trim();
  const brandName =
    nextName ||
    options.fallbackName ||
    readBrand()?.name ||
    "Urobili";

  await updateBusinessSettingsFn({
    data: {
      ...(nextName ? { name: nextName } : {}),
      logo_url: finalUrl,
    },
  });

  writeBrand({ name: brandName, logo_url: finalUrl });
  options.updateUser?.({
    logo_url: finalUrl,
    ...(nextName ? { business_name: nextName } : {}),
  });

  if (options.qc) {
    options.qc.invalidateQueries({ queryKey: ["business-settings"] });
    options.qc.invalidateQueries({ queryKey: ["user"] });
  }

  return { finalUrl, localRef };
}
