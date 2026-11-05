import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requestStore } from "@/lib/request-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import * as actions from "@/lib/rpc-actions";
import * as adminActions from "@/lib/rpc-admin-actions";

// Merge user actions and admin actions
const allActions: Record<string, Function> = {
  ...actions,
  ...adminActions,
};

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB payload limit

// CORS header helper ensuring credentials: true is never paired with wildcard *
function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && origin !== "null") {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    // If no origin or same-origin / desktop client, allow all without credentials collision
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

// CORS preflight handler
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

// Main RPC handler
export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const ip = getClientIp(req);

  // Anti-DDoS Rate Limiting Guard - 1500 req/min (high allowance for active POS terminals)
  const isLocalOrLan = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
  const rateLimit = isLocalOrLan ? 5000 : 1500;
  const rateCheck = checkRateLimit(ip, { limit: rateLimit, windowMs: 60 * 1000 });
  if (!rateCheck.success) {
    return new NextResponse(
      JSON.stringify({ error: rateCheck.blocked ? "IP temporarily blocked due to excessive requests" : "Too Many Requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Retry-After": String(rateCheck.resetInSeconds),
        },
      }
    );
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return new NextResponse(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch (e) {}
    if (!bodyText || !bodyText.trim()) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }
    const { actionName, args, token, activeProfile } = JSON.parse(bodyText);

    const authHeader = req.headers.get("authorization");
    let effectiveToken = token;
    if (!effectiveToken && authHeader && authHeader.startsWith("Bearer ")) {
      effectiveToken = authHeader.substring(7);
    }
    if (!effectiveToken) {
      try {
        const cookieStore = await cookies();
        effectiveToken = cookieStore.get("token")?.value;
      } catch (_) {}
    }

    return await requestStore.run({ token: effectiveToken, activeProfile }, async () => {
      if (effectiveToken) {
        try {
          const cookieStore = await cookies();
          cookieStore.set("token", effectiveToken, { maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: "lax", path: "/" });
        } catch (_) {}
      }
      if (activeProfile) {
        const cookieStore = await cookies();
        cookieStore.set("active_profile", activeProfile, { maxAge: 365 * 24 * 60 * 60, path: "/" });
      }

      const action = allActions[actionName];
      if (!action || typeof action !== "function") {
        return new NextResponse(`Action ${actionName} not found`, {
          status: 404,
          headers: corsHeaders,
        });
      }

      const safeActionArgs = args !== undefined && args !== null ? args : { data: {} };
      const result = await action(safeActionArgs);

      return NextResponse.json(result, {
        headers: corsHeaders,
      });
    });
  } catch (error: any) {
    const status = error?.statusCode || (
      error?.message === "Invalid email or password" || error?.message?.includes("Unauthorized") ? 401 :
      error?.message?.includes("Access denied") || error?.message?.includes("forbidden") ? 403 :
      error?.message?.includes("not found") || error?.message?.includes("required") || error?.message?.includes("balance") ? 400 : 500
    );

    if (status >= 500) {
      console.error(`RPC API error during POST:`, error);
    } else {
      console.warn(`RPC API client error [${status}]: ${error?.message || "Bad Request"}`);
    }

    return new NextResponse(error?.message || "Internal Server Error", {
      status,
      headers: corsHeaders,
    });
  }
}
