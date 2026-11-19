import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { approveCourierPaymentFn } from "@/lib/rpc-actions";

/**
 * SteadFast Courier Webhook Endpoint
 * Documentation: https://portal.packzy.com/api/v1
 * 
 * SteadFast sends POST callbacks when parcel delivery status updates:
 * Payload:
 * {
 *   "consignment_id": 123456,
 *   "invoice": "DF-12345",
 *   "status": "delivered" | "partial_delivered" | "cancelled" | "in_review" | "hold" | "pending",
 *   "cod_amount": 1250,
 *   "updated_at": "2026-06-06 12:00:00"
 * }
 */

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "DreamFashion SteadFast Courier Webhook",
    endpoint: "/api/webhooks/steadfast",
    method_expected: "POST",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    let payload: any = null;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ status: "error", message: "Invalid JSON payload" }, { status: 400 });
    }

    const consignmentId = payload?.consignment_id ? String(payload.consignment_id).trim() : null;
    const invoice = payload?.invoice ? String(payload.invoice).trim() : null;
    const status = payload?.status ? String(payload.status).trim().toLowerCase() : null;
    const codAmount = payload?.cod_amount !== undefined ? Number(payload.cod_amount) : null;

    if (!consignmentId && !invoice) {
      return NextResponse.json(
        { status: "ignored", message: "Missing consignment_id and invoice in webhook payload" },
        { status: 200 }
      );
    }

    const db = await getDb();
    const nowStr = new Date().toISOString();

    // Search query matching consignment ID, tracking code, or invoice across sales
    const matchConditions: any[] = [];
    if (consignmentId) {
      matchConditions.push({ consignment_id: consignmentId });
      matchConditions.push({ consignment_id: Number(consignmentId) });
      matchConditions.push({ tracking_code: consignmentId });
    }
    if (invoice) {
      matchConditions.push({ steadfast_invoice: invoice });
      matchConditions.push({ tracking_code: invoice });
      matchConditions.push({ invoice_id: invoice });
      const strippedInv = invoice.replace(/^DF-/, "");
      if (strippedInv.length >= 6) {
        matchConditions.push({ cart_id: { $regex: strippedInv, $options: "i" } });
        matchConditions.push({ _id: { $regex: strippedInv, $options: "i" } });
      }
    }

    const sale = await db.collection("sales").findOne({ $or: matchConditions });

    if (!sale) {
      console.warn("[SteadFast Webhook] No matching sale found for payload:", { consignmentId, invoice, status });
      return NextResponse.json(
        { status: "success", received: true, note: "Sale not found locally, logged for record" },
        { status: 200 }
      );
    }

    const filter = sale.cart_id
      ? { cart_id: sale.cart_id, owner_id: sale.owner_id }
      : { _id: sale._id as any, owner_id: sale.owner_id };

    const updateFields: any = {
      updated_at: nowStr,
    };
    if (status) {
      updateFields.steadfast_status = status;
    }
    if (consignmentId && !sale.consignment_id) {
      updateFields.consignment_id = consignmentId;
    }

    // Auto-reconcile cashbox when delivery is confirmed
    let autoCompleted = false;
    if (status === "delivered" || status === "partial_delivered") {
      updateFields.courier_status = "delivered";
      if (sale.courier_status !== "collected") {
        try {
          await approveCourierPaymentFn({ data: { id: String(sale._id) } });
          autoCompleted = true;
        } catch (err: any) {
          console.error("[SteadFast Webhook] Auto-approval to Cashbox failed:", err?.message || err);
        }
      }
    } else if (status === "cancelled") {
      updateFields.courier_status = "cancelled";
    }

    await db.collection("sales").updateMany(filter, { $set: updateFields });

    return NextResponse.json(
      {
        status: "success",
        received: true,
        matchedSaleId: String(sale._id),
        steadfast_status: status,
        autoCompleted,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[SteadFast Webhook Error]", error);
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
