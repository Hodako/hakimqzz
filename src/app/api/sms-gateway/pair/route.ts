import { NextRequest, NextResponse } from "next/server";
import { pairDeviceWithCode } from "@/lib/sms-gateway";

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
    const body = await req.json();
    const { code, deviceName, deviceModel, manufacturer, androidVersion, simSlots, activeSimSlot } = body || {};

    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 6-digit pairing code." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const result = await pairDeviceWithCode(code.trim(), {
      deviceName,
      deviceModel,
      manufacturer,
      androidVersion,
      simSlots,
      activeSimSlot,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to pair device." },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
