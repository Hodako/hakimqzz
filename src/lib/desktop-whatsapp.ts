export type WhatsAppMode = "auto" | "manual";

export interface WhatsAppAutoRules {
  onSale: boolean;
  onOnlineOrder: boolean;
  onTracking: boolean;
}

export interface DesktopWhatsAppStatus {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCodeDataUrl: string | null;
  phone: string | null;
  name: string | null;
  lastError?: string | null;
  isDesktop: boolean;
  isSending?: boolean;
  engine?: string;
}

const MODE_KEY = "df_wa_mode";
const RULES_KEY = "df_wa_auto_rules";

export function isDesktopWhatsAppAvailable(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).electronPOS?.whatsapp);
}

export function getDesktopWhatsAppBridge() {
  if (typeof window === "undefined") return null;
  return (window as any).electronPOS?.whatsapp ?? null;
}

export function openDesktopWhatsAppWindow(): Promise<any> {
  const bridge = getDesktopWhatsAppBridge();
  if (bridge && typeof bridge.openWindow === "function") {
    return bridge.openWindow();
  }
  return Promise.resolve(null);
}

export function getWhatsAppMode(): WhatsAppMode {
  if (typeof window === "undefined") return "manual";
  const v = localStorage.getItem(MODE_KEY);
  return v === "auto" ? "auto" : "manual";
}

export function setWhatsAppMode(mode: WhatsAppMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, mode);
}

export function getWhatsAppAutoRules(): WhatsAppAutoRules {
  if (typeof window === "undefined") {
    return { onSale: true, onOnlineOrder: true, onTracking: true };
  }
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return { onSale: true, onOnlineOrder: true, onTracking: true };
    const parsed = JSON.parse(raw);
    return {
      onSale: parsed.onSale !== false,
      onOnlineOrder: parsed.onOnlineOrder !== false,
      onTracking: parsed.onTracking !== false,
    };
  } catch {
    return { onSale: true, onOnlineOrder: true, onTracking: true };
  }
}

export function setWhatsAppAutoRules(rules: WhatsAppAutoRules) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function buildOrderWhatsAppMessage(params: {
  shopName?: string;
  customerName?: string;
  itemsSummary?: string;
  amount?: number;
  trackingCode?: string | null;
  status?: string;
  type?: "sale" | "online" | "tracking";
}): string {
  const shop = params.shopName || "Dream Fashion";
  const cust = params.customerName || "Customer";
  if (params.type === "tracking") {
    return [
      `*${shop}* — Order Update`,
      `Hello ${cust},`,
      params.trackingCode ? `Tracking Code: *${params.trackingCode}*` : "",
      params.status ? `Courier Status: *${params.status}*` : "",
      params.amount ? `COD Amount: ৳${params.amount}` : "",
      `Thank you for shopping with ${shop}!`,
    ].filter(Boolean).join("\n");
  }

  return [
    `*${shop}* — Order Confirmed`,
    `Hello ${cust},`,
    params.itemsSummary ? `Items: ${params.itemsSummary}` : "",
    params.amount !== undefined ? `Total: *৳${params.amount}*` : "",
    params.trackingCode ? `SteadFast Tracking: *${params.trackingCode}*` : "",
    `Thank you for shopping with ${shop}!`,
  ].filter(Boolean).join("\n");
}

export async function sendDesktopWhatsAppMessage(phone: string, message: string): Promise<{ sent: boolean; via: "desktop" | "web" | "skipped"; error?: string }> {
  const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
  if (cleanPhone.length < 10) {
    return { sent: false, via: "skipped", error: "Invalid phone number" };
  }

  const bridge = getDesktopWhatsAppBridge();
  if (bridge) {
    try {
      const st: DesktopWhatsAppStatus = await bridge.getStatus();
      if (st?.status === "connected") {
        await bridge.sendMessage({ phone: cleanPhone, message });
        return { sent: true, via: "desktop" };
      }
      return { sent: false, via: "skipped", error: "Desktop WhatsApp not connected" };
    } catch (err: any) {
      return { sent: false, via: "desktop", error: err?.message || "Failed to send" };
    }
  }

  return { sent: false, via: "skipped", error: "Desktop WhatsApp bridge not available" };
}

export async function sendDesktopWhatsAppIfAuto(
  eventType: "sale" | "online" | "tracking",
  params: {
    phone?: string | null;
    shopName?: string;
    customerName?: string;
    itemsSummary?: string;
    amount?: number;
    trackingCode?: string | null;
    status?: string;
  }
) {
  if (!isDesktopWhatsAppAvailable()) return { sent: false, via: "skipped" as const };
  if (getWhatsAppMode() !== "auto") return { sent: false, via: "skipped" as const };

  const rules = getWhatsAppAutoRules();
  if (eventType === "sale" && !rules.onSale) return { sent: false, via: "skipped" as const };
  if (eventType === "online" && !rules.onOnlineOrder) return { sent: false, via: "skipped" as const };
  if (eventType === "tracking" && !rules.onTracking) return { sent: false, via: "skipped" as const };

  if (!params.phone) return { sent: false, via: "skipped" as const };

  const message = buildOrderWhatsAppMessage({ ...params, type: eventType });
  return await sendDesktopWhatsAppMessage(params.phone, message);
}
