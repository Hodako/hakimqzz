/**
 * MiMSMS Bulk SMS API (v2) Client
 * Official Spec: https://api.mimsms.com
 * Supports PascalCase & camelCase response normalization, POST & GET fallbacks, and intelligent number sanitation.
 */

export interface MiMSMSCredentials {
  apiKey: string;
  userName: string;
  senderName: string;
}

export interface SendSingleSmsParams extends MiMSMSCredentials {
  mobileNumber: string;
  message: string;
  transactionType?: "T" | "P"; // "T" for Transactional, "P" for Promotional
  campaignName?: string;
}

export interface SendBroadcastSmsParams extends MiMSMSCredentials {
  numbers: string[];
  message: string;
  transactionType?: "T" | "P";
  campaignId?: string;
}

export interface DynamicSmsItem {
  mobileNumber: string;
  message: string;
}

export interface SendDynamicSmsParams extends MiMSMSCredentials {
  smsData: DynamicSmsItem[];
  transactionType?: "T" | "P";
}

export interface MiMSMSResponse {
  statusCode: string;
  status: "Success" | "Failed" | "Scheduled" | string;
  trxnId?: string;
  trackingId?: string;
  balance?: string;
  deliveryStatus?: string;
  smsCount?: number;
  recipientCount?: number;
  responseResult?: string;
  isSuccess?: boolean;
  isIpBlocked?: boolean;
  error_Data?: Array<{
    res_Code?: string;
    error?: string;
    failedNumbers?: string;
    errorParm?: string;
  }>;
}

const BASE_URL = "https://api.mimsms.com/api";

/**
 * Standardize Bangladeshi mobile numbers into 8801XXXXXXXXX format
 */
export function sanitizeBdPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  // Remove all whitespace, hyphens, plus signs, brackets, dots
  const cleaned = phone.replace(/[\s\-\+\(\)\.]/g, "");

  // Match 8801XXXXXXXXX (13 digits starting with 8801)
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  // Match 01XXXXXXXXX (11 digits starting with 01) -> convert to 8801XXXXXXXXX
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `88${cleaned}`;
  }
  // Match 1XXXXXXXXX (10 digits starting with 1) -> convert to 8801XXXXXXXXX
  if (/^1[3-9]\d{8}$/.test(cleaned)) {
    return `880${cleaned}`;
  }

  return null;
}

/**
 * Calculate character count and SMS parts (GSM 7-bit vs Unicode/Bengali)
 */
export function calculateSmsParts(message: string): {
  chars: number;
  parts: number;
  isUnicode: boolean;
  maxPerPart: number;
} {
  const chars = message ? message.length : 0;
  // Check if string contains non-GSM 7-bit characters (e.g. Bengali, emojis, accents)
  const isUnicode = /[^\x20-\x7E\r\n\t]/.test(message);

  if (chars === 0) {
    return { chars: 0, parts: 0, isUnicode, maxPerPart: isUnicode ? 70 : 160 };
  }

  if (isUnicode) {
    // Unicode (Bengali / UTF-16)
    if (chars <= 70) {
      return { chars, parts: 1, isUnicode, maxPerPart: 70 };
    }
    const parts = Math.ceil(chars / 67);
    return { chars, parts, isUnicode, maxPerPart: 67 };
  } else {
    // GSM 7-bit standard
    if (chars <= 160) {
      return { chars, parts: 1, isUnicode, maxPerPart: 160 };
    }
    const parts = Math.ceil(chars / 153);
    return { chars, parts, isUnicode, maxPerPart: 153 };
  }
}

/**
 * Robust response normalizer for MiMSMS backend (supports PascalCase, camelCase, plain-text)
 * Strictly follows official MiMSMS Bulk SMS API (v2) documentation.
 */
export function normalizeMiMSMSResponse(raw: any, httpStatus = 200, httpText = "OK"): MiMSMSResponse {
  if (!raw && httpStatus >= 400) {
    return {
      statusCode: String(httpStatus),
      status: "Failed",
      responseResult: `HTTP ${httpStatus}: ${httpText}`,
      isSuccess: false,
    };
  }

  // If raw is a plain number or string
  if (typeof raw === "string" || typeof raw === "number") {
    const str = String(raw).trim();
    if (/^\d+(\.\d+)?$/.test(str)) {
      return {
        statusCode: "200",
        status: "Success",
        balance: str,
        responseResult: "Balance Retrieved Successfully",
        isSuccess: true,
      };
    }
    try {
      raw = JSON.parse(str);
    } catch {
      const strLower = str.toLowerCase();
      const isBlocked = strLower.includes("black") || strLower.includes("ip") || strLower.includes("whitelist");
      const isDenied = strLower.includes("denied") || strLower.includes("unauthor") || strLower.includes("reject");
      const isOk = (strLower.includes("success") || strLower.includes('"status":"success"')) && !isBlocked && !isDenied;
      return {
        statusCode: isBlocked ? "403" : isDenied ? "401" : isOk ? "200" : String(httpStatus),
        status: isOk ? "Success" : "Failed",
        responseResult: str,
        isSuccess: isOk,
        isIpBlocked: isBlocked,
      };
    }
  }

  if (typeof raw !== "object" || raw === null) {
    return {
      statusCode: String(httpStatus),
      status: "Failed",
      responseResult: String(raw ?? httpText),
      isSuccess: false,
    };
  }

  const statusCode = String(
    raw.StatusCode ??
    raw.statusCode ??
    raw.status_code ??
    raw.Code ??
    raw.code ??
    httpStatus
  );

  const rawStatus = String(
    raw.Status ??
    raw.status ??
    (statusCode === "200" ? "Success" : "Failed")
  );

  const trxnId = raw.TrxnId ?? raw.trxnId ?? raw.trxId ?? raw.TrxId ?? raw.TransactionId ?? raw.transactionId ?? raw.trackingId ?? raw.TrackingId;
  const trackingId = raw.TrackingId ?? raw.trackingId ?? trxnId;
  const balance = raw.Balance ?? raw.balance ?? raw.SmsCount ?? raw.smsCount ?? raw.data?.Balance ?? raw.data?.balance;

  // Extract detailed error messages from error_Data if returned by MiMSMS
  const errorDataList: any[] = raw.error_Data ?? raw.Error_Data ?? raw.errors ?? [];
  let detailedError = "";
  if (Array.isArray(errorDataList) && errorDataList.length > 0) {
    detailedError = errorDataList
      .map((e: any) => `${e.error || e.res_Code || "Error"}${e.errorParm ? ` (${e.errorParm})` : ""}`)
      .join("; ");
  }

  const responseResult = detailedError || String(
    raw.ResponseResult ??
    raw.responseResult ??
    raw.Message ??
    raw.message ??
    raw.Error ??
    raw.error ??
    raw.Details ??
    raw.details ??
    (rawStatus.toLowerCase() === "success" && statusCode === "200" ? "SMS Send Successfuly" : `Status ${statusCode}`)
  );

  const resultLower = responseResult.toLowerCase();
  const rawStatusLower = rawStatus.toLowerCase();

  const isDeniedOrBlocked =
    resultLower.includes("black") ||
    resultLower.includes("whitelist") ||
    resultLower.includes("denied") ||
    resultLower.includes("reject") ||
    resultLower.includes("unauthor") ||
    resultLower.includes("invalid") ||
    resultLower.includes("block") ||
    resultLower.includes("error") ||
    resultLower.includes("fail") ||
    resultLower.includes("not allowed") ||
    resultLower.includes("exceed") ||
    rawStatusLower.includes("fail") ||
    rawStatusLower.includes("error") ||
    rawStatusLower.includes("denied") ||
    rawStatusLower.includes("unauthor") ||
    statusCode !== "200";

  const hasErrors = (Array.isArray(errorDataList) && errorDataList.length > 0) || (raw.success_Data === null && statusCode !== "200");

  const isSuccess =
    !isDeniedOrBlocked &&
    !hasErrors &&
    (statusCode === "200" || statusCode === "0") &&
    (rawStatusLower === "success" || rawStatusLower === "scheduled");

  const isIpBlocked =
    resultLower.includes("black") ||
    resultLower.includes("ip") ||
    resultLower.includes("whitelist") ||
    rawStatusLower.includes("black");

  return {
    statusCode,
    status: isSuccess ? (rawStatusLower === "scheduled" ? "Scheduled" : "Success") : "Failed",
    trxnId: trxnId ? String(trxnId) : undefined,
    trackingId: trackingId ? String(trackingId) : undefined,
    balance: balance !== undefined && balance !== null ? String(balance) : undefined,
    deliveryStatus: raw.DeliveryStatus ?? raw.deliveryStatus,
    smsCount: raw.SmsCount ?? raw.smsCount,
    recipientCount: raw.RecipientCount ?? raw.recipientCount,
    responseResult,
    isSuccess,
    isIpBlocked,
    error_Data: errorDataList.length > 0 ? errorDataList : undefined,
  };
}

/**
 * Send Single SMS via POST /V2/SMS
 */
export async function sendSingleSms(params: SendSingleSmsParams): Promise<MiMSMSResponse> {
  const { apiKey, userName, senderName, mobileNumber, message, transactionType = "T", campaignName } = params;

  if (!apiKey || !userName || !senderName) {
    throw new Error("Missing MiMSMS credentials (apiKey, userName, senderName are required)");
  }

  const cleanApiKey = apiKey.trim();
  const cleanUserName = userName.trim();
  const cleanSenderName = senderName.trim();

  const sanitizedNumber = sanitizeBdPhoneNumber(mobileNumber);
  if (!sanitizedNumber) {
    throw new Error(`Invalid Bangladeshi mobile number: ${mobileNumber}`);
  }

  const payload: Record<string, any> = {
    apiKey: cleanApiKey,
    userName: cleanUserName,
    senderName: cleanSenderName,
    transactionType: transactionType || "T",
    mobileNumber: sanitizedNumber,
    message,
  };

  if (campaignName) {
    payload.campaignName = campaignName;
  }

  try {
    const res = await fetch(`${BASE_URL}/V2/SMS`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = rawText;
    }

    return normalizeMiMSMSResponse(json, res.status, res.statusText);
  } catch (err: any) {
    return {
      statusCode: "500",
      status: "Failed",
      responseResult: err?.message || "Failed to reach MiMSMS SMS Gateway",
      isSuccess: false,
    };
  }
}

/**
 * Send Broadcast SMS via POST /V2/OneToMany (up to 1,000 per request)
 */
export async function sendBroadcastSms(params: SendBroadcastSmsParams): Promise<MiMSMSResponse[]> {
  const { apiKey, userName, senderName, message, numbers, transactionType = "P", campaignId } = params;

  if (!apiKey || !userName || !senderName) {
    throw new Error("Missing MiMSMS credentials (apiKey, userName, senderName are required)");
  }

  const cleanApiKey = apiKey.trim();
  const cleanUserName = userName.trim();
  const cleanSenderName = senderName.trim();

  // Sanitize and filter out invalid/duplicate numbers
  const validNumbers = Array.from(
    new Set(
      numbers
        .map((num) => sanitizeBdPhoneNumber(num))
        .filter((num): num is string => Boolean(num))
    )
  );

  if (validNumbers.length === 0) {
    throw new Error("No valid mobile numbers provided for SMS broadcast");
  }

  // If only 1 number and transactional, use single SMS endpoint
  if (validNumbers.length === 1 && transactionType === "T") {
    const singleRes = await sendSingleSms({
      apiKey: cleanApiKey,
      userName: cleanUserName,
      senderName: cleanSenderName,
      mobileNumber: validNumbers[0],
      message,
      transactionType: "T",
      campaignName: campaignId,
    });
    return [singleRes];
  }

  // Split into chunks of 1,000 recipients
  const CHUNK_SIZE = 1000;
  const results: MiMSMSResponse[] = [];

  for (let i = 0; i < validNumbers.length; i += CHUNK_SIZE) {
    const chunk = validNumbers.slice(i, i + CHUNK_SIZE);
    const smsData = chunk.map((mobileNumber) => ({ mobileNumber }));

    const payload: Record<string, any> = {
      apiKey: cleanApiKey,
      userName: cleanUserName,
      senderName: cleanSenderName,
      transactionType: transactionType || "P",
      message,
      smsData,
    };

    if (campaignId) {
      payload.campaignId = campaignId;
    }

    try {
      const res = await fetch(`${BASE_URL}/V2/OneToMany`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = rawText;
      }

      results.push(normalizeMiMSMSResponse(json, res.status, res.statusText));
    } catch (err: any) {
      results.push({
        statusCode: "500",
        status: "Failed",
        responseResult: err?.message || "Failed to dispatch batch",
        isSuccess: false,
      });
    }
  }

  return results;
}

/**
 * Send Dynamic (Personalized) SMS via POST /V2/DSMS
 */
export async function sendDynamicSms(params: SendDynamicSmsParams): Promise<MiMSMSResponse[]> {
  const { apiKey, userName, senderName, smsData, transactionType = "T" } = params;

  if (!apiKey || !userName || !senderName) {
    throw new Error("Missing MiMSMS credentials (apiKey, userName, senderName are required)");
  }

  const cleanApiKey = apiKey.trim();
  const cleanUserName = userName.trim();
  const cleanSenderName = senderName.trim();

  // Sanitize all items
  const validData = smsData
    .map((item) => ({
      mobileNumber: sanitizeBdPhoneNumber(item.mobileNumber),
      message: item.message,
    }))
    .filter((item): item is { mobileNumber: string; message: string } => Boolean(item.mobileNumber && item.message));

  if (validData.length === 0) {
    throw new Error("No valid mobile numbers and messages for dynamic SMS");
  }

  const CHUNK_SIZE = 500;
  const results: MiMSMSResponse[] = [];

  for (let i = 0; i < validData.length; i += CHUNK_SIZE) {
    const chunk = validData.slice(i, i + CHUNK_SIZE);
    const payload = {
      apiKey: cleanApiKey,
      userName: cleanUserName,
      senderName: cleanSenderName,
      transactionType: transactionType || "T",
      smsData: chunk,
    };

    try {
      const res = await fetch(`${BASE_URL}/V2/DSMS`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = rawText;
      }

      results.push(normalizeMiMSMSResponse(json, res.status, res.statusText));
    } catch (err: any) {
      results.push({
        statusCode: "500",
        status: "Failed",
        responseResult: err?.message || "Failed to dispatch dynamic batch",
        isSuccess: false,
      });
    }
  }

  return results;
}

/**
 * Check remaining balance via GET /V2/BalanceCheck and POST fallback
 */
export async function checkSmsBalance(credentials: { apiKey: string; userName: string }): Promise<MiMSMSResponse & { isIpBlocked?: boolean }> {
  const { apiKey, userName } = credentials;

  if (!apiKey || !userName) {
    throw new Error("API Key and Username are required to check balance");
  }

  const cleanApiKey = apiKey.trim();
  const cleanUserName = userName.trim();

  // Attempt 1: GET request
  try {
    const url = `${BASE_URL}/V2/BalanceCheck?apiKey=${encodeURIComponent(cleanApiKey)}&userName=${encodeURIComponent(cleanUserName)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = rawText;
    }

    const parsed = normalizeMiMSMSResponse(json, res.status, res.statusText);
    if (parsed.isSuccess || parsed.balance !== undefined) {
      return parsed;
    }
  } catch (err: any) {
    console.warn("MiMSMS GET BalanceCheck failed, trying POST fallback...", err?.message);
  }

  // Attempt 2: POST request
  try {
    const res = await fetch(`${BASE_URL}/V2/BalanceCheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify({
        apiKey: cleanApiKey,
        userName: cleanUserName,
      }),
    });
    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = rawText;
    }

    return normalizeMiMSMSResponse(json, res.status, res.statusText);
  } catch (err: any) {
    return {
      statusCode: "500",
      status: "Failed",
      responseResult: err?.message || "Failed to reach MiMSMS API Gateway",
      isSuccess: false,
    };
  }
}

/**
 * Delivery Report Lookup via POST /V2/DlrApi
 */
export async function lookupDlrStatus(params: {
  apiKey: string;
  userName: string;
  trackingId: string;
}): Promise<MiMSMSResponse> {
  const { apiKey, userName, trackingId } = params;

  if (!apiKey || !userName || !trackingId) {
    throw new Error("apiKey, userName, and trackingId are required to check delivery status");
  }

  const cleanApiKey = apiKey.trim();
  const cleanUserName = userName.trim();
  const cleanTrackingId = trackingId.trim();

  try {
    const res = await fetch(`${BASE_URL}/V2/DlrApi`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify({ apiKey: cleanApiKey, userName: cleanUserName, trackingId: cleanTrackingId }),
    });

    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = rawText;
    }

    return normalizeMiMSMSResponse(json, res.status, res.statusText);
  } catch (err: any) {
    return {
      statusCode: "500",
      status: "Failed",
      responseResult: err?.message || "Failed to fetch delivery report",
      isSuccess: false,
    };
  }
}
