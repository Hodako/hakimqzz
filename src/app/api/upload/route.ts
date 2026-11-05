import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requestStore } from "@/lib/request-store";
import { requireSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (origin && origin !== "null") {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const ip = getClientIp(req);

  const isLocalOrLan = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
  const rateLimit = isLocalOrLan ? 500 : 120;
  const rateCheck = checkRateLimit(`upload_${ip}`, { limit: rateLimit, windowMs: 60 * 1000 });
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Upload rate limit exceeded. Please wait a moment." }, {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": String(rateCheck.resetInSeconds),
      },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    let effectiveToken = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      effectiveToken = authHeader.substring(7);
    }
    if (!effectiveToken) {
      try {
        const cookieStore = await cookies();
        effectiveToken = cookieStore.get("token")?.value;
      } catch (_) {}
    }

    let session: any = null;
    try {
      session = await requestStore.run({ token: effectiveToken || undefined }, async () => {
        return await requireSession();
      });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, {
        status: 401,
        headers: corsHeaders,
      });
    }

    const apiKey = process.env.IMGBB_API_KEY || "64c6abc7d312e08242671d2ebb7d9f2f";

    const formData = await req.formData();
    const file = formData.get("image");
    if (!file || !(file instanceof Blob) || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No valid image file provided" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    const imgbbForm = new FormData();
    imgbbForm.append("image", base64);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: imgbbForm,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Image upload failed" }, {
        status: 500,
        headers: corsHeaders,
      });
    }

    const json = await res.json();
    if (!json.success) {
      return NextResponse.json({ error: json.error?.message || "Upload failed" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const imageUrl = json.data?.url as string;
    const deleteUrl = json.data?.delete_url as string;

    // Store deletion URL in DB for automatic cleanup
    try {
      const { getDb } = await import("@/lib/db");
      const db = await getDb();
      await db.collection("uploaded_images").insertOne({
        _id: crypto.randomUUID() as any,
        owner_id: session?.ownerId || null,
        url: imageUrl,
        display_url: json.data?.display_url || imageUrl,
        delete_url: deleteUrl || null,
        created_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn("Could not save image delete_url:", dbErr);
    }

    return NextResponse.json({ url: imageUrl, delete_url: deleteUrl }, {
      headers: corsHeaders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
