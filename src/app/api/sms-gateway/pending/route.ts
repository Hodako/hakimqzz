import { NextRequest, NextResponse } from "next/server";
import { getPendingSmsJobs } from "@/lib/sms-gateway";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization header." },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "5", 10)));

    const jobs = await getPendingSmsJobs(authHeader, limit);

    return NextResponse.json(
      { success: true, count: jobs.length, jobs },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch pending SMS." },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
