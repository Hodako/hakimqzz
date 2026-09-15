import { NextRequest, NextResponse } from "next/server";
import { reportSmsDelivery } from "@/lib/sms-gateway";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization header." },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const body = await req.json();
    const { jobId, status, errorMessage, sentAt } = body || {};

    if (!jobId || !status || (status !== "delivered" && status !== "failed")) {
      return NextResponse.json(
        { success: false, error: "Invalid status report payload. 'jobId' and valid 'status' are required." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const res = await reportSmsDelivery(authHeader, {
      jobId,
      status,
      errorMessage,
      sentAt,
    });

    return NextResponse.json(res, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to record SMS status." },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
