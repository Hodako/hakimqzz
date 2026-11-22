/**
 * High-Speed OpenWA REST API Gateway Client for Dream Fashion
 * Powered by OpenWA (https://github.com/rmyndharis/OpenWA.git)
 * Provides sub-second ("lighting fast") WhatsApp messaging via headless REST API.
 */

export interface OpenWaConfig {
  gatewayUrl: string; // e.g. http://127.0.0.1:2785
  sessionId: string;  // e.g. "dreamfashion"
  apiKey?: string;    // optional X-API-Key
}

export interface OpenWaSendResult {
  success: boolean;
  messageId?: string;
  timestamp?: number;
  latencyMs?: number;
  error?: string;
  response?: any;
}

export interface OpenWaSessionStatus {
  status: "connected" | "qr_ready" | "connecting" | "disconnected";
  sessionId: string;
  phone?: string | null;
  name?: string | null;
  qrCode?: string | null;
  uptime?: number;
  error?: string | null;
  raw?: any;
}

/**
 * Normalizes any Bangladeshi or international phone number into OpenWA JID (e.g. 8801712345678@c.us)
 */
export function formatOpenWaChatId(rawPhone: string): string {
  if (!rawPhone) return "";
  let clean = String(rawPhone).trim();

  // If already full JID
  if (clean.endsWith("@c.us") || clean.endsWith("@g.us") || clean.endsWith("@newsletter")) {
    return clean;
  }

  // Strip non-digits
  clean = clean.replace(/[^0-9]/g, "");

  // Bangladesh format normalizations
  if (clean.startsWith("01") && clean.length === 11) {
    clean = "88" + clean;
  } else if (clean.startsWith("1") && clean.length === 10) {
    clean = "880" + clean;
  }

  return `${clean}@c.us`;
}

/**
 * Normalizes gateway base URL removing trailing slashes
 */
export function normalizeGatewayUrl(url?: string): string {
  const base = (url || process.env.OPENWA_GATEWAY_URL || "http://127.0.0.1:2785").trim();
  return base.replace(/\/+$/, "");
}

/**
 * Sends a text message through OpenWA Gateway in ~50-100ms
 */
export async function sendOpenWaMessage(
  params: {
    to: string;
    text: string;
    quotedMessageId?: string;
  },
  config?: Partial<OpenWaConfig>
): Promise<OpenWaSendResult> {
  const startTime = Date.now();
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const sessionId = (config?.sessionId || process.env.OPENWA_SESSION_ID || "dreamfashion").trim();
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const chatId = formatOpenWaChatId(params.to);
  if (!chatId || chatId === "@c.us") {
    return {
      success: false,
      error: "Invalid recipient phone number",
      latencyMs: Date.now() - startTime,
    };
  }

  const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const payload: Record<string, any> = {
    chatId,
    text: params.text,
  };
  if (params.quotedMessageId) {
    payload.quotedMessageId = params.quotedMessageId;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg =
        json?.message ||
        json?.error ||
        `OpenWA request failed with HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        error: typeof errMsg === "object" ? JSON.stringify(errMsg) : String(errMsg),
        latencyMs,
        response: json,
      };
    }

    const messageId = json?.id || json?.messageId || json?.key?.id;
    return {
      success: true,
      messageId: messageId ? String(messageId) : undefined,
      timestamp: Date.now(),
      latencyMs,
      response: json,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isAbort = err?.name === "AbortError";
    return {
      success: false,
      error: isAbort
        ? "OpenWA gateway request timed out after 12 seconds"
        : err?.message || "Failed to connect to OpenWA gateway",
      latencyMs,
    };
  }
}

/**
 * Gets the current status of an OpenWA session
 */
export async function getOpenWaSessionStatus(
  config?: Partial<OpenWaConfig>
): Promise<OpenWaSessionStatus> {
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const sessionId = (config?.sessionId || process.env.OPENWA_SESSION_ID || "dreamfashion").trim();
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      return {
        status: "disconnected",
        sessionId,
        error: "Session does not exist on OpenWA gateway",
      };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        status: "disconnected",
        sessionId,
        error: data?.message || `HTTP ${res.status}`,
        raw: data,
      };
    }

    const rawStatus = String(data?.status || "").toUpperCase();
    let status: OpenWaSessionStatus["status"] = "disconnected";

    if (rawStatus === "WORKING" || rawStatus === "CONNECTED" || rawStatus === "AUTHENTICATED" || rawStatus === "ONLINE") {
      status = "connected";
    } else if (rawStatus === "SCAN_QR_CODE" || rawStatus === "QR_READY" || rawStatus === "PAIRING" || data?.qrCode) {
      status = "qr_ready";
    } else if (rawStatus === "STARTING" || rawStatus === "CONNECTING" || rawStatus === "INITIALIZING") {
      status = "connecting";
    }

    return {
      status,
      sessionId,
      phone: data?.me?.id || data?.phone || null,
      name: data?.me?.pushName || data?.name || null,
      qrCode: data?.qrCode || null,
      uptime: data?.uptime,
      raw: data,
    };
  } catch (err: any) {
    return {
      status: "disconnected",
      sessionId,
      error: err?.message || "Cannot connect to OpenWA gateway",
    };
  }
}

/**
 * Retrieves the pairing QR Code from OpenWA
 */
export async function getOpenWaQrCode(
  config?: Partial<OpenWaConfig>
): Promise<{ qrCode: string | null; status: string; error?: string }> {
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const sessionId = (config?.sessionId || process.env.OPENWA_SESSION_ID || "dreamfashion").trim();
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}/qr`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        qrCode: null,
        status: "error",
        error: data?.message || `HTTP ${res.status}`,
      };
    }

    const qr = data?.qrCode || data?.qr || (typeof data === "string" ? data : null);
    return {
      qrCode: qr,
      status: data?.status || "QR_READY",
    };
  } catch (err: any) {
    return {
      qrCode: null,
      status: "error",
      error: err?.message || "Failed to fetch QR code from OpenWA",
    };
  }
}

/**
 * Initializes/Starts an OpenWA session
 */
export async function startOpenWaSession(
  config?: Partial<OpenWaConfig>
): Promise<{ success: boolean; status?: string; error?: string }> {
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const sessionId = (config?.sessionId || process.env.OPENWA_SESSION_ID || "dreamfashion").trim();
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}/start`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    let res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: sessionId }),
    });

    if (res.status === 404) {
      // Try root create session endpoint
      const createEndpoint = `${gatewayUrl}/api/sessions`;
      res = await fetch(createEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: sessionId }),
      });
    }

    const data = await res.json().catch(() => null);
    if (!res.ok && res.status !== 200 && res.status !== 201) {
      return {
        success: false,
        error: data?.message || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      status: data?.status || "STARTED",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to start OpenWA session",
    };
  }
}

/**
 * Disconnects / Stops an OpenWA session
 */
export async function stopOpenWaSession(
  config?: Partial<OpenWaConfig>
): Promise<{ success: boolean; error?: string }> {
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const sessionId = (config?.sessionId || process.env.OPENWA_SESSION_ID || "dreamfashion").trim();
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}/logout`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
    });
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Health-check & Latency measurement of OpenWA gateway
 */
export async function testOpenWaConnection(
  config?: Partial<OpenWaConfig>
): Promise<{ reachable: boolean; latencyMs: number; error?: string; sessions?: any[] }> {
  const startTime = Date.now();
  const gatewayUrl = normalizeGatewayUrl(config?.gatewayUrl);
  const apiKey = (config?.apiKey || process.env.OPENWA_API_KEY || "").trim();

  const endpoint = `${gatewayUrl}/api/sessions`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => []);
      return { reachable: true, latencyMs, sessions: Array.isArray(data) ? data : [] };
    }
    return {
      reachable: false,
      latencyMs,
      error: `Gateway returned status ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    return {
      reachable: false,
      latencyMs: Date.now() - startTime,
      error: err?.message || "Connection refused",
    };
  }
}
