import { getDb } from "@/lib/db";
import crypto from "crypto";

export interface SmsGatewayDevice {
  _id: string;
  owner_id: string;
  device_name: string;
  device_model: string;
  manufacturer: string;
  android_version: string;
  device_token: string;
  battery_level?: number;
  is_charging?: boolean;
  network_type?: string;
  sim_slots?: Array<{
    slotIndex: number;
    carrier: string;
    displayName: string;
    number?: string;
    subscriptionId?: number;
  }>;
  active_sim_slot?: number;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  total_sent?: number;
}

export interface SmsGatewayQueueItem {
  _id: string;
  owner_id: string;
  device_id?: string;
  phone_number: string;
  message: string;
  sim_slot?: number;
  status: "pending" | "sending" | "delivered" | "failed";
  error_message?: string;
  created_at: string;
  sent_at?: string;
  campaign_title?: string;
  recipient_type?: string;
}

/**
 * Generates or retrieves an active 6-digit pairing code for an owner
 */
export async function getOrCreatePairingCode(ownerId: string, forceNew = false): Promise<string> {
  const db = await getDb();
  const collection = db.collection("sms_gateway_pairings");

  if (!forceNew) {
    const existing = await collection.findOne({
      owner_id: ownerId,
      expires_at: { $gt: new Date() },
    });
    if (existing?.code) {
      return existing.code;
    }
  }

  // Generate 6-digit numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Valid for 60 mins

  await collection.updateOne(
    { owner_id: ownerId },
    {
      $set: {
        owner_id: ownerId,
        code,
        created_at: new Date(),
        expires_at: expiresAt,
      },
    },
    { upsert: true }
  );

  return code;
}

/**
 * Verifies a 6-digit code and pairs the Android device
 */
export async function pairDeviceWithCode(
  code: string,
  deviceInfo: {
    deviceName?: string;
    deviceModel?: string;
    manufacturer?: string;
    androidVersion?: string;
    simSlots?: any[];
    activeSimSlot?: number;
  }
) {
  const db = await getDb();
  const pairing = await db.collection("sms_gateway_pairings").findOne({
    code: code.trim(),
    expires_at: { $gt: new Date() },
  });

  if (!pairing) {
    throw new Error("Invalid or expired 6-digit pairing code. Please check your SMS panel and try again.");
  }

  const ownerId = pairing.owner_id;
  const business = await db.collection("businesses").findOne({ owner_id: ownerId });
  const shopName = business?.name || "Dream Fashion";

  const deviceToken = "gw_" + crypto.randomBytes(24).toString("hex");
  const deviceId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create or update device for this owner
  await db.collection("sms_gateway_devices").updateOne(
    { owner_id: ownerId },
    {
      $set: {
        _id: deviceId as any,
        owner_id: ownerId,
        device_name: deviceInfo.deviceName || deviceInfo.deviceModel || "Android Phone",
        device_model: deviceInfo.deviceModel || "Unknown Model",
        manufacturer: deviceInfo.manufacturer || "Android",
        android_version: deviceInfo.androidVersion || "",
        device_token: deviceToken,
        sim_slots: deviceInfo.simSlots || [],
        active_sim_slot: deviceInfo.activeSimSlot ?? 0,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
        total_sent: 0,
      },
    },
    { upsert: true }
  );

  // Consume pairing code
  await db.collection("sms_gateway_pairings").deleteOne({ _id: pairing._id });

  return {
    success: true,
    deviceToken,
    deviceId,
    shopName,
    ownerId,
    pollIntervalMs: 4000,
  };
}

/**
 * Verify device bearer token
 */
export async function verifyDeviceToken(token: string): Promise<SmsGatewayDevice | null> {
  if (!token) return null;
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  const db = await getDb();
  const device = await db.collection("sms_gateway_devices").findOne({ device_token: cleanToken });
  return device as any as SmsGatewayDevice | null;
}

/**
 * Process device heartbeat
 */
export async function recordDeviceHeartbeat(
  deviceToken: string,
  stats: {
    batteryLevel?: number;
    isCharging?: boolean;
    networkType?: string;
    simSlots?: any[];
    activeSimSlot?: number;
  }
) {
  const device = await verifyDeviceToken(deviceToken);
  if (!device) {
    throw new Error("Unauthorized: Invalid device token");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const updateFields: any = {
    last_seen_at: now,
    updated_at: now,
  };

  if (stats.batteryLevel !== undefined) updateFields.battery_level = stats.batteryLevel;
  if (stats.isCharging !== undefined) updateFields.is_charging = stats.isCharging;
  if (stats.networkType) updateFields.network_type = stats.networkType;
  if (stats.simSlots && Array.isArray(stats.simSlots)) updateFields.sim_slots = stats.simSlots;
  if (stats.activeSimSlot !== undefined) updateFields.active_sim_slot = stats.activeSimSlot;

  await db.collection("sms_gateway_devices").updateOne(
    { _id: device._id as any },
    { $set: updateFields }
  );

  // Check pending count
  const pendingCount = await db.collection("sms_gateway_queue").countDocuments({
    owner_id: device.owner_id,
    status: "pending",
  });

  return {
    success: true,
    serverTime: now,
    pendingCount,
  };
}

/**
 * Get device status & pairing info for shop owner
 */
export async function getOwnerGatewayStatus(ownerId: string) {
  const db = await getDb();
  const device: any = await db.collection("sms_gateway_devices").findOne({ owner_id: ownerId });
  const settings = await db.collection("sms_settings").findOne({ owner_id: ownerId });
  const pairingCode = await getOrCreatePairingCode(ownerId, false);

  const pendingCount = await db.collection("sms_gateway_queue").countDocuments({
    owner_id: ownerId,
    status: "pending",
  });

  const sentTodayCount = await db.collection("sms_gateway_queue").countDocuments({
    owner_id: ownerId,
    status: "delivered",
    created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() },
  });

  let isOnline = false;
  if (device?.last_seen_at) {
    const diffSeconds = (Date.now() - new Date(device.last_seen_at).getTime()) / 1000;
    isOnline = diffSeconds <= 45; // Considered online if pinged within last 45s
  }

  return {
    isConfigured: Boolean(device),
    isOnline,
    pairingCode,
    device: device
      ? {
          id: device._id,
          name: device.device_name,
          model: device.device_model,
          manufacturer: device.manufacturer,
          androidVersion: device.android_version,
          batteryLevel: device.battery_level ?? 100,
          isCharging: Boolean(device.is_charging),
          networkType: device.network_type || "WiFi/Mobile",
          simSlots: device.sim_slots || [],
          activeSimSlot: device.active_sim_slot ?? 0,
          lastSeenAt: device.last_seen_at,
          totalSent: device.total_sent ?? 0,
        }
      : null,
    settings: {
      gatewayMode: settings?.gateway_mode || "hybrid", // "phone" | "mimsms" | "hybrid"
      preferredSim: settings?.preferred_sim ?? 0,
      sendDelaySec: settings?.send_delay_sec ?? 2,
    },
    queue: {
      pending: pendingCount,
      sentToday: sentTodayCount,
    },
  };
}

/**
 * Enqueue SMS message to be dispatched by the mobile phone
 */
export async function enqueueSmsToGateway(
  ownerId: string,
  payload: {
    phoneNumber: string;
    message: string;
    simSlot?: number;
    campaignTitle?: string;
    recipientType?: string;
  }
) {
  const db = await getDb();
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const item: SmsGatewayQueueItem = {
    _id: jobId,
    owner_id: ownerId,
    phone_number: payload.phoneNumber.trim(),
    message: payload.message.trim(),
    sim_slot: payload.simSlot,
    campaign_title: payload.campaignTitle || "Direct Message",
    recipient_type: payload.recipientType || "direct",
    status: "pending",
    created_at: now,
  };

  await db.collection("sms_gateway_queue").insertOne(item as any);

  return { success: true, jobId };
}

/**
 * Fetches pending SMS jobs for an authenticated Android device
 */
export async function getPendingSmsJobs(deviceToken: string, limit = 5) {
  const device = await verifyDeviceToken(deviceToken);
  if (!device) {
    throw new Error("Unauthorized: Invalid device token");
  }

  const db = await getDb();
  const items = await db
    .collection("sms_gateway_queue")
    .find({
      owner_id: device.owner_id,
      status: "pending",
    })
    .sort({ created_at: 1 })
    .limit(limit)
    .toArray();

  if (items.length > 0) {
    const ids = items.map((i) => i._id);
    await db.collection("sms_gateway_queue").updateMany(
      { _id: { $in: ids } },
      { $set: { status: "sending", device_id: device._id } }
    );
  }

  return items.map((item) => ({
    jobId: item._id,
    phoneNumber: item.phone_number,
    message: item.message,
    simSlot: item.sim_slot !== undefined ? item.sim_slot : device.active_sim_slot ?? 0,
    campaignTitle: item.campaign_title,
    recipientType: item.recipient_type,
    createdAt: item.created_at,
  }));
}

/**
 * Report delivery status from Android device back to DreamFashion backend
 */
export async function reportSmsDelivery(
  deviceToken: string,
  report: {
    jobId: string;
    status: "delivered" | "failed";
    errorMessage?: string;
    sentAt?: string;
  }
) {
  const device = await verifyDeviceToken(deviceToken);
  if (!device) {
    throw new Error("Unauthorized: Invalid device token");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const item = await db.collection("sms_gateway_queue").findOne({ _id: report.jobId as any });
  if (!item) {
    return { success: false, message: "Job not found" };
  }

  await db.collection("sms_gateway_queue").updateOne(
    { _id: report.jobId as any },
    {
      $set: {
        status: report.status,
        error_message: report.errorMessage || null,
        sent_at: report.sentAt || now,
      },
    }
  );

  if (report.status === "delivered") {
    // Increment total_sent for device
    await db.collection("sms_gateway_devices").updateOne(
      { _id: device._id as any },
      { $inc: { total_sent: 1 } }
    );

    // Increment business total SMS sent
    await db.collection("businesses").updateOne(
      { owner_id: device.owner_id },
      { $inc: { sms_sent_count: 1 } }
    );
  }

  // Record or update sms_logs for reporting
  try {
    const logId = crypto.randomUUID();
    await db.collection("sms_logs").insertOne({
      _id: logId as any,
      owner_id: device.owner_id,
      campaign_title: item.campaign_title || "Android SMS Gateway",
      recipient_type: item.recipient_type || "phone_gateway",
      recipients_summary: item.phone_number,
      recipient_count: 1,
      message: item.message,
      parts_count: 1,
      total_credits_used: 0, // Free local phone SIM SMS!
      status: report.status === "delivered" ? "Success" : "Failed",
      response_summary:
        report.status === "delivered"
          ? `Delivered via ${device.device_name}`
          : `Failed on Phone: ${report.errorMessage || "Unknown error"}`,
      gateway: "Android Phone",
      device_name: device.device_name,
      created_at: now,
    } as any);
  } catch (_) {}

  return { success: true };
}

/**
 * Unpair device for an owner
 */
export async function unpairOwnerDevice(ownerId: string) {
  const db = await getDb();
  await db.collection("sms_gateway_devices").deleteMany({ owner_id: ownerId });
  await getOrCreatePairingCode(ownerId, true);
  return { success: true };
}
