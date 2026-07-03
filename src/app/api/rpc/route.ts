import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as actions from "@/lib/rpc-actions";
import * as adminActions from "@/lib/rpc-admin-actions";

// Merge user actions and admin actions
const allActions: Record<string, Function> = {
  ...actions,
  ...adminActions,
};

// CORS preflight handler
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cookie",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

// Main RPC handler
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  try {
    const { actionName, args, token } = await req.json();

    if (token) {
      const cookieStore = await cookies();
      cookieStore.set("token", token, { maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: "lax", path: "/" });
    }

    const action = allActions[actionName];
    if (!action || typeof action !== "function") {
      return new NextResponse(`Action ${actionName} not found`, {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    const result = await action(args);

    return NextResponse.json(result, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    });
  } catch (error: any) {
    console.error(`RPC API error during ${req.method}:`, error);
    return new NextResponse(error?.message || "Internal Server Error", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }
}
