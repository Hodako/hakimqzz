// Server action wrapper replaced by API proxy.

import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import { hashPassword, comparePassword, signToken, verifyToken } from "@/lib/auth-helpers";
import { requireSession } from "@/lib/session";
import type { PermissionSet } from "@/lib/permissions";
import { DEFAULT_EMPLOYEE_PERMISSIONS, OWNER_PERMISSIONS } from "@/lib/permissions";
import { appendRowToGoogleSheet, bulkExportToGoogleSheets } from "@/lib/google-sheets";

type CashboxKind = "deposit" | "withdraw" | "sale" | "expense";

async function insertCashboxEntry(
  db: Awaited<ReturnType<typeof getDb>>,
  ownerId: string,
  entry: { kind: CashboxKind; amount: number; note?: string | null; ref_id?: string | null; created_at?: string },
) {
  const id = crypto.randomUUID();
  const doc = {
    _id: id,
    owner_id: ownerId,
    kind: entry.kind,
    amount: entry.amount,
    note: entry.note ?? null,
    ref_id: entry.ref_id ?? null,
    created_at: entry.created_at || new Date().toISOString(),
  };
  await db.collection("cashbox_entries").insertOne(doc as any);

  // Sheets Sync
  appendRowToGoogleSheet(ownerId, "Cashbox",
    ["ID", "Kind", "Amount", "Note", "Ref ID", "Created At"],
    [id, entry.kind, entry.amount, entry.note ?? "", entry.ref_id ?? "", doc.created_at]
  );

  return { ...doc, id };
}

function saleCashboxAmount(data: { type: string; sell_price: number; qty: number; paid_amount: number }) {
  if (data.type === "credit") return Number(data.paid_amount) || 0;
  if (data.type === "cash" || data.type === "online") return Number(data.sell_price) * data.qty;
  return 0;
}

async function mapUser(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  const user = await db.collection("users").findOne({ _id: userId as any });
  if (!user) return null;
  const business = user.business_id
    ? await db.collection("businesses").findOne({ _id: user.business_id as any })
    : null;
  const cookieStore = await cookies();
  const activeProfile = cookieStore.get("active_profile")?.value || "default";
  
  const ownerId = user.role === "employee" ? (user.owner_id as string) : (user._id as any as string);
  const ownerUser = ownerId === (user._id as any as string) ? user : await db.collection("users").findOne({ _id: ownerId as any });
  const profiles = ownerUser?.profiles || [
    { id: "default", name: "Default Profile", created_at: new Date().toISOString() }
  ];

  return {
    id: user._id as any as string,
    email: user.email as string,
    full_name: (user.full_name as string) || "",
    activated: user.activated === false ? false : Boolean(user.activated ?? true),
    role: (user.role as string) || "owner",
    business_id: (user.business_id as string) || null,
    business_name: (business?.name as string) || "HakimQzz",
    logo_url: (business?.logo_url as string) || "/logo.png",
    avatar_url: (user.avatar_url as string) || "",
    permissions: (user.role === "owner" ? OWNER_PERMISSIONS : (user.permissions as PermissionSet)) || DEFAULT_EMPLOYEE_PERMISSIONS,
    profiles,
    activeProfile,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function getMeFn() {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    if (!token) {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (!token) return { user: null };
    const session = await verifyToken(token);
    if (!session) return { user: null };
    const db = await getDb();
    const user = await mapUser(db, session.userId);
    return { user };
  } catch {
    return { user: null };
  }
}

export async function loginFn(input: { data: { email: string; password: string } }) {
  const { data } = input;
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: data.email.toLowerCase() });
  if (!user || !(await comparePassword(data.password, user.password as string))) {
    throw new Error("Invalid email or password");
  }
  const token = await signToken({ userId: user._id as any as string, email: user.email as string });
  const cookieStore = await cookies();
  cookieStore.set("token", token, { maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: "lax", path: "/" });
  const mapped = await mapUser(db, user._id as any as string);
  return { user: mapped, token };
}

function sanitizeInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/javascript:/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function validateEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Email address cannot be blank");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error("Please enter a valid email address");
  }
  
  const fakeDomains = ["tempmail.com", "yopmail.com", "mailinator.com", "dispostable.com", "sharklasers.com", "guerrillamail.com", "10minutemail.com", "getairmail.com", "throwawaymail.com", "temp-mail.org", "fake.com", "fake.org", "test.com"];
  const domain = trimmed.split("@")[1]?.toLowerCase();
  if (fakeDomains.includes(domain)) {
    throw new Error("Disposable or fake email addresses are not allowed. Please register with a real email address.");
  }
}

export async function registerFn(input: { data: { email: string; password: string; fullName?: string } }) {
  const { data } = input;
  validateEmail(data.email);
  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: data.email.toLowerCase().trim() });
  if (existing) throw new Error("User already exists");
  const userId = crypto.randomUUID();
  await db.collection("users").insertOne({
    _id: userId as any,
    email: data.email.toLowerCase().trim(),
    password: await hashPassword(data.password),
    full_name: sanitizeInput(data.fullName || ""),
    role: "owner",
    activated: false,
    created_at: new Date().toISOString(),
  });
  const token = await signToken({ userId, email: data.email.toLowerCase().trim() });
  const cookieStore = await cookies();
  cookieStore.set("token", token, { maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: "lax", path: "/" });
  const mapped = await mapUser(db, userId);
  return { user: mapped, token };
}

export async function logoutFn() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
  return { success: true };
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProductsFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("products").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function createProductFn(input: { data: { name: string; image_url?: string | null; buy_price?: number; sell_price?: number; stock?: number; attributes?: Record<string, string>; min_stock?: number; category?: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const name = sanitizeInput(data.name);
  if (!name) throw new Error("Product name cannot be blank");
  const doc = { _id: id, owner_id: session.ownerId, name, image_url: data.image_url ? sanitizeInput(data.image_url) : null, buy_price: data.buy_price || 0, sell_price: data.sell_price || 0, stock: data.stock || 0, attributes: data.attributes || {}, min_stock: data.min_stock ?? 5, category: data.category ? sanitizeInput(data.category) : "", archived: false, created_at: new Date().toISOString() };
  await db.collection("products").insertOne(doc as any);

  // Sheets Sync
  appendRowToGoogleSheet(session.ownerId, "Products",
    ["ID", "Name", "Buy Price", "Sell Price", "Stock", "Min Stock", "Category", "Created At"],
    [id, name, data.buy_price || 0, data.sell_price || 0, data.stock || 0, data.min_stock ?? 5, data.category || "", doc.created_at]
  );

  return { ...doc, id };
}

export async function updateProductFn(input: { data: { id: string; name?: string; image_url?: string | null; buy_price?: number; sell_price?: number; stock?: number; attributes?: Record<string, string>; min_stock?: number; category?: string; archived?: boolean } }) {
  const { data } = input;
  const session = await requireSession();
  const { id, ...updates } = data;
  
  const sanitizedUpdates: any = { ...updates };
  if (sanitizedUpdates.name !== undefined) sanitizedUpdates.name = sanitizeInput(sanitizedUpdates.name);
  if (sanitizedUpdates.image_url !== undefined && sanitizedUpdates.image_url !== null) sanitizedUpdates.image_url = sanitizeInput(sanitizedUpdates.image_url);
  if (sanitizedUpdates.category !== undefined) sanitizedUpdates.category = sanitizeInput(sanitizedUpdates.category);
  
  const db = await getDb();
  await db.collection("products").updateOne({ _id: id as any, owner_id: session.ownerId }, { $set: sanitizedUpdates });
  const updated = await db.collection("products").findOne({ _id: id as any });
  return { ...updated, id };
}

export async function deleteProductFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("products").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function archiveProductFn(input: { data: { id: string; archived: boolean } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("products").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: { archived: data.archived } });
  return { success: true };
}

// ─── Parties ─────────────────────────────────────────────────────────────────

export async function getPartiesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("parties").find({ owner_id: session.ownerId }).sort({ name: 1 }).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function createPartyFn(input: { data: { name: string; phone?: string | null; address?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, name: data.name, phone: data.phone || null, address: data.address || null, created_at: new Date().toISOString() };
  await db.collection("parties").insertOne(doc as any);
  return { ...doc, id };
}

export async function updatePartyFn(input: { data: { id: string; name?: string; phone?: string | null; address?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const { id, ...updates } = data;
  const db = await getDb();
  await db.collection("parties").updateOne({ _id: id as any, owner_id: session.ownerId }, { $set: updates });
  const updated = await db.collection("parties").findOne({ _id: id as any });
  return { ...updated, id };
}

export async function deletePartyFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("parties").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function archivePartyFn(input: { data: { id: string; archived: boolean } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("parties").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: { archived: data.archived } });
  return { success: true };
}

export async function getPartyFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const p = await db.collection("parties").findOne({ _id: data.id as any, owner_id: session.ownerId });
  if (!p) return null;
  return { ...p, id: p._id as any as string };
}

export async function createPartyReceivableFn(input: { data: { party_id: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, party_id: data.party_id, amount: data.amount, note: data.note || null, created_at: new Date().toISOString() };
  await db.collection("party_receivables").insertOne(doc as any);
  return { ...doc, id };
}

export async function createPartyPayableFn(input: { data: { party_id: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, party_id: data.party_id, amount: data.amount, note: data.note || null, created_at: new Date().toISOString() };
  await db.collection("party_payables").insertOne(doc as any);
  return { ...doc, id };
}

export async function getAllPartyReceivablesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_receivables").find({ owner_id: session.ownerId }).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

export async function getAllPartyPayablesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_payables").find({ owner_id: session.ownerId }).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function getAllPayableSettlementsFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_payable_settlements").find({ owner_id: session.ownerId }).toArray();
  return items.map((s) => ({ ...s, id: s._id as any as string }));
}

export async function getPartyReceivablesFn(input: { data: { partyId: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_receivables").find({ owner_id: session.ownerId, party_id: data.partyId }).sort({ created_at: -1 }).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

export async function getPartyPayablesFn(input: { data: { partyId: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_payables").find({ owner_id: session.ownerId, party_id: data.partyId }).sort({ created_at: -1 }).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

export async function deletePartyReceivableFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("party_receivables").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function deletePartyPayableFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("party_payables").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function createPayableSettlementFn(input: { data: { party_id: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, party_id: data.party_id, amount: data.amount, note: data.note || null, created_at: new Date().toISOString() };
  await db.collection("party_payable_settlements").insertOne(doc as any);

  // Also insert cashbox entry when paying a party
  const party = await db.collection("parties").findOne({ _id: data.party_id as any, owner_id: session.ownerId });
  const partyName = party ? (party.name || "Party") : "Party";
  await insertCashboxEntry(db, session.ownerId, {
    kind: "withdraw",
    amount: data.amount,
    note: data.note || `Paid to ${partyName} (Payable Settlement)`,
    ref_id: id,
  });

  return { ...doc, id };
}

export async function getPayableSettlementsFn(input: { data: { partyId: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("party_payable_settlements").find({ owner_id: session.ownerId, party_id: data.partyId }).sort({ created_at: -1 }).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export async function getSalesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("sales").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((s) => ({ ...s, id: s._id as any as string }));
}

export async function getSalesForPartyFn(input: { data: { partyId: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("sales").find({ owner_id: session.ownerId, party_id: data.partyId }).sort({ created_at: -1 }).toArray();
  return items.map((s) => ({ ...s, id: s._id as any as string }));
}

export async function createSaleFn(input: { data: { product_id?: string | null; product_name: string; qty: number; buy_price: number; sell_price: number; profit: number; type: string; party_id?: string | null; paid_amount: number; due_amount: number; note?: string | null; cart_id?: string | null; created_at?: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, party_id: data.type === "credit" ? data.party_id : null, created_at: data.created_at || new Date().toISOString() };
  await db.collection("sales").insertOne(doc as any);
  if (data.product_id) {
    const product = await db.collection("products").findOne({ _id: data.product_id as any });
    if (product) await db.collection("products").updateOne({ _id: data.product_id as any }, { $set: { stock: Math.max(((product.stock as number) ?? 0) - data.qty, 0) } });
  }
  const cashAmt = saleCashboxAmount(data);
  if (cashAmt > 0) {
    await insertCashboxEntry(db, session.ownerId, {
      kind: "sale",
      amount: cashAmt,
      note: `Sale: ${data.product_name}`,
      ref_id: id,
      created_at: doc.created_at,
    });
  }

  // Sheets Sync
  appendRowToGoogleSheet(session.ownerId, "Sales",
    ["ID", "Product Name", "Qty", "Buy Price", "Sell Price", "Profit", "Type", "Party ID", "Paid Amount", "Due Amount", "Created At"],
    [id, data.product_name, data.qty, data.buy_price, data.sell_price, data.profit, data.type, data.party_id || "", data.paid_amount, data.due_amount, doc.created_at]
  );

  return { ...doc, id };
}

export async function deleteSaleFn(input: { data: { id: string } }) {
  try {
    const { data } = input;
    const session = await requireSession();
    const db = await getDb();
    const sale = await db.collection("sales").findOne({ _id: data.id as any, owner_id: session.ownerId });
    if (!sale) throw new Error("Sale not found");
 
    // If this sale belongs to a grouped cart, delete all items in the cart
    const cartId = sale.cart_id;
    let salesToDelete = [sale];
    if (cartId) {
      salesToDelete = await db.collection("sales").find({ cart_id: cartId, owner_id: session.ownerId }).toArray();
    }

    for (const s of salesToDelete) {
      if (s.product_id) {
        const qtyToRestore = s.returned ? 0 : (Number(s.qty) || 0);
        if (qtyToRestore > 0) {
          await db.collection("products").updateOne(
            { _id: s.product_id as any, owner_id: session.ownerId },
            { $inc: { stock: qtyToRestore } }
          );
        }
      }
 
      // Clean up associated returns for this sale
      await db.collection("returns").deleteMany({ sale_id: s._id as any, owner_id: session.ownerId });
 
      // Clean up cashbox entries for this sale and its returns
      await db.collection("cashbox_entries").deleteMany({ owner_id: session.ownerId, ref_id: s._id as any });
      
      await db.collection("sales").deleteOne({ _id: s._id as any, owner_id: session.ownerId });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteSaleFn:", err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function editSaleFn(input: {
  data: {
    id: string;
    product_id?: string | null;
    product_name: string;
    qty: number;
    buy_price: number;
    sell_price: number;
    profit: number;
    type: string;
    party_id?: string | null;
    paid_amount: number;
    due_amount: number;
    note?: string | null;
  };
}) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();

  const oldSale = await db.collection("sales").findOne({ _id: data.id as any, owner_id: session.ownerId });
  if (!oldSale) throw new Error("Sale not found");

  if (oldSale.product_id && !oldSale.returned) {
    const oldQty = Number(oldSale.qty) || 0;
    if (oldQty > 0) {
      await db.collection("products").updateOne(
        { _id: oldSale.product_id as any, owner_id: session.ownerId },
        { $inc: { stock: oldQty } }
      );
    }
  }

  await db.collection("cashbox_entries").deleteMany({ owner_id: session.ownerId, ref_id: data.id, kind: "sale" });

  const updatedDoc = {
    ...oldSale,
    product_id: data.product_id || null,
    product_name: data.product_name,
    qty: data.qty,
    buy_price: data.buy_price,
    sell_price: data.sell_price,
    profit: data.profit,
    type: data.type,
    party_id: data.type === "credit" ? data.party_id : null,
    paid_amount: data.paid_amount,
    due_amount: data.due_amount,
    note: data.note || null,
    updated_at: new Date().toISOString(),
  };

  await db.collection("sales").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: updatedDoc });

  if (data.product_id) {
    const product = await db.collection("products").findOne({ _id: data.product_id as any, owner_id: session.ownerId });
    if (product) {
      await db.collection("products").updateOne(
        { _id: data.product_id as any, owner_id: session.ownerId },
        { $set: { stock: Math.max(((product.stock as number) ?? 0) - data.qty, 0) } }
      );
    }
  }

  const cashAmt = saleCashboxAmount(data);
  if (cashAmt > 0) {
    await insertCashboxEntry(db, session.ownerId, {
      kind: "sale",
      amount: cashAmt,
      note: `Sale (Updated): ${data.product_name}`,
      ref_id: data.id,
    });
  }

  return { success: true };
}
 
export async function updateUserAvatarFn(input: { data: { avatar_url: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: session.userId as any },
    { $set: { avatar_url: data.avatar_url } }
  );
  const user = await mapUser(db, session.userId);
  return { user };
}
 
export async function createReturnFn(input: { data: { sale_id: string; qty: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const sale = await db.collection("sales").findOne({ _id: data.sale_id as any, owner_id: session.ownerId });
  if (!sale) throw new Error("Sale not found");
  if (!sale.product_id) throw new Error("Cannot return non-product sale");
  if (sale.returned) throw new Error("Already returned");
  const returnQty = Math.min(data.qty, sale.qty as number);
  if (returnQty <= 0) throw new Error("Invalid quantity");
 
  const id = crypto.randomUUID();
  const profitPerUnit = (sale.profit as number) / (sale.qty as number);
  const doc = {
    _id: id, owner_id: session.ownerId, sale_id: data.sale_id,
    product_id: sale.product_id, product_name: sale.product_name,
    qty: returnQty, note: data.note || null, created_at: new Date().toISOString(),
  };
  await db.collection("returns").insertOne(doc as any);
 
  const product = await db.collection("products").findOne({ _id: sale.product_id as any });
  if (product) {
    await db.collection("products").updateOne(
      { _id: sale.product_id as any },
      { $set: { stock: ((product.stock as number) ?? 0) + returnQty } },
    );
  }
 
  if (returnQty >= (sale.qty as number)) {
    await db.collection("sales").updateOne({ _id: data.sale_id as any }, { $set: { returned: true, return_qty: returnQty } });
  } else {
    const remaining = (sale.qty as number) - returnQty;
    await db.collection("sales").updateOne(
      { _id: data.sale_id as any },
      { $set: { qty: remaining, profit: profitPerUnit * remaining, return_qty: returnQty } },
    );
  }
  return { ...doc, id };
}

export async function createDirectProductReturnFn(input: { data: { product_id: string; qty: number; return_price: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const product = await db.collection("products").findOne({ _id: data.product_id as any, owner_id: session.ownerId });
  if (!product) throw new Error("Product not found");
  
  const returnQty = Number(data.qty);
  if (returnQty <= 0) throw new Error("Invalid quantity");

  const id = crypto.randomUUID();
  const doc = {
    _id: id,
    owner_id: session.ownerId,
    sale_id: null,
    product_id: data.product_id,
    product_name: product.name,
    qty: returnQty,
    return_price: Number(data.return_price) || 0,
    note: data.note || null,
    created_at: new Date().toISOString(),
  };
  await db.collection("returns").insertOne(doc as any);

  await db.collection("products").updateOne(
    { _id: data.product_id as any, owner_id: session.ownerId },
    { $set: { stock: ((product.stock as number) ?? 0) + returnQty } }
  );

  const refundAmt = returnQty * (Number(data.return_price) || 0);
  if (refundAmt > 0) {
    await insertCashboxEntry(db, session.ownerId, {
      kind: "withdraw",
      amount: refundAmt,
      note: `Direct Return: ${product.name} (Qty: ${returnQty})`,
      ref_id: id,
    });
  }

  return { ...doc, id };
}

export async function getReturnsFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("returns").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

export async function deleteReturnFn(input: { data: { id: string } }) {
  try {
    const { data } = input;
    const session = await requireSession();
    const db = await getDb();

    const ret = await db.collection("returns").findOne({ _id: data.id as any, owner_id: session.ownerId });
    if (!ret) throw new Error("Return record not found");

    if (ret.product_id) {
      const product = await db.collection("products").findOne({ _id: ret.product_id });
      if (product) {
        await db.collection("products").updateOne(
          { _id: ret.product_id },
          { $set: { stock: Math.max(((product.stock as number) ?? 0) - (ret.qty as number), 0) } }
        );
      }
    }

    if (ret.sale_id) {
      const sale = await db.collection("sales").findOne({ _id: ret.sale_id as any, owner_id: session.ownerId });
      if (sale) {
        const originalQty = (sale.qty as number) + (ret.qty as number);
        const buyPrice = Number(sale.buy_price) || 0;
        const sellPrice = Number(sale.sell_price) || 0;
        const updatedProfit = (sellPrice - buyPrice) * originalQty;

        await db.collection("sales").updateOne(
          { _id: ret.sale_id as any },
          {
            $set: {
              returned: false,
              qty: originalQty,
              profit: updatedProfit,
            },
            $unset: {
              return_qty: "",
            }
          }
        );
      }
    }

    await db.collection("cashbox_entries").deleteMany({ owner_id: session.ownerId, ref_id: data.id });
    await db.collection("returns").deleteOne({ _id: data.id as any, owner_id: session.ownerId });

    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteReturnFn:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export async function getPurchasesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("purchases").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function createPurchaseFn(input: { data: { product_id?: string | null; product_name: string; qty: number; unit_cost: number; sell_price?: number; total: number; note?: string | null; created_at?: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, created_at: data.created_at || new Date().toISOString() };
  await db.collection("purchases").insertOne(doc as any);
  if (data.product_id) {
    const product = await db.collection("products").findOne({ _id: data.product_id as any });
    if (product) {
      const updates: Record<string, number> = {
        stock: ((product.stock as number) ?? 0) + data.qty,
        buy_price: data.unit_cost,
      };
      if (data.sell_price != null && data.sell_price > 0) {
        updates.sell_price = data.sell_price;
      }
      await db.collection("products").updateOne({ _id: data.product_id as any }, { $set: updates });
    }
  }

  // Add product purchase to expenses collection
  const expenseId = crypto.randomUUID();
  const expenseDoc = {
    _id: expenseId,
    owner_id: session.ownerId,
    title: `Product Purchase: ${data.product_name}`,
    amount: data.total,
    note: `Purchased ${data.qty} units of ${data.product_name} at unit cost ${data.unit_cost}. Purchase ID: ${id}`,
    created_at: doc.created_at,
  };
  await db.collection("expenses").insertOne(expenseDoc as any);

  // Deduct from cashbox using expense entry
  await insertCashboxEntry(db, session.ownerId, {
    kind: "expense",
    amount: data.total,
    note: `Product Purchase: ${data.product_name}`,
    ref_id: expenseId,
    created_at: doc.created_at,
  });

  // Sheets Sync for Purchase
  appendRowToGoogleSheet(session.ownerId, "Purchases",
    ["ID", "Product Name", "Qty", "Unit Cost", "Total", "Note", "Created At"],
    [id, data.product_name, data.qty, data.unit_cost, data.total, data.note || "", doc.created_at]
  );

  // Sheets Sync for Expense
  appendRowToGoogleSheet(session.ownerId, "Expenses",
    ["ID", "Title", "Amount", "Note", "Created At"],
    [expenseId, expenseDoc.title, expenseDoc.amount, expenseDoc.note, expenseDoc.created_at]
  );

  return { ...doc, id };
}

export async function deletePurchaseFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const purchase = await db.collection("purchases").findOne({ _id: data.id as any, owner_id: session.ownerId });
  if (!purchase) throw new Error("Purchase not found");
  if (purchase.product_id) {
    const product = await db.collection("products").findOne({ _id: purchase.product_id as any });
    if (product) {
      await db.collection("products").updateOne(
        { _id: purchase.product_id as any },
        { $set: { stock: Math.max(((product.stock as number) ?? 0) - (purchase.qty as number), 0) } },
      );
    }
  }
  await db.collection("purchases").deleteOne({ _id: data.id as any, owner_id: session.ownerId });

  // Delete associated expense and cashbox entry
  const expenseTitle = `Product Purchase: ${purchase.product_name}`;
  const expense = await db.collection("expenses").findOne({ owner_id: session.ownerId, title: expenseTitle, amount: purchase.total });
  if (expense) {
    await db.collection("expenses").deleteOne({ _id: expense._id });
    await db.collection("cashbox_entries").deleteOne({ ref_id: expense._id });
  }

  return { success: true };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpensesFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("expenses").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((e) => ({ ...e, id: e._id as any as string }));
}

export async function createExpenseFn(input: { data: { title: string; amount: number; note?: string | null; created_at?: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, created_at: data.created_at || new Date().toISOString() };
  await db.collection("expenses").insertOne(doc as any);
  await insertCashboxEntry(db, session.ownerId, {
    kind: "expense",
    amount: data.amount,
    note: data.title,
    ref_id: id,
    created_at: doc.created_at,
  });

  // Sheets Sync
  appendRowToGoogleSheet(session.ownerId, "Expenses",
    ["ID", "Title", "Amount", "Note", "Created At"],
    [id, data.title, data.amount, data.note || "", doc.created_at]
  );

  return { ...doc, id };
}

export async function deleteExpenseFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("cashbox_entries").deleteOne({ owner_id: session.ownerId, ref_id: data.id, kind: "expense" });
  await db.collection("expenses").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPaymentsForPartyFn(input: { data: { partyId: string } }): Promise<any[]> {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("payments").find({ owner_id: session.ownerId, party_id: data.partyId }).sort({ created_at: -1 }).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function getAllPaymentsFn(): Promise<any[]> {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("payments").find({ owner_id: session.ownerId }).toArray();
  return items.map((p) => ({ ...p, id: p._id as any as string }));
}

export async function createPaymentFn(input: { data: { party_id: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, created_at: new Date().toISOString() };
  await db.collection("payments").insertOne(doc as any);

  // Also insert cashbox entry when party pays
  const party = await db.collection("parties").findOne({ _id: data.party_id, owner_id: session.ownerId } as any);
  const partyName = party ? (party.name || "Party") : "Party";
  await insertCashboxEntry(db, session.ownerId, {
    kind: "deposit",
    amount: data.amount,
    note: data.note || `Collected dues from ${partyName}`,
    ref_id: id,
  });

  return { ...doc, id };
}

export async function deletePaymentFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("cashbox_entries").deleteMany({ owner_id: session.ownerId, ref_id: data.id } as any);
  await db.collection("payments").deleteOne({ _id: data.id, owner_id: session.ownerId } as any);
  return { success: true };
}

// ─── Somiti ───────────────────────────────────────────────────────────────────

export async function getSomitiFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("somiti_entries").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((s) => ({ ...s, id: s._id as any as string }));
}

export async function createSomitiFn(input: { data: { kind: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, created_at: new Date().toISOString() };
  await db.collection("somiti_entries").insertOne(doc as any);
  return { ...doc, id };
}

export async function updateSomitiFn(input: { data: { id: string; kind: string; amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const { id, ...updates } = data;
  await db.collection("somiti_entries").updateOne(
    { _id: id as any, owner_id: session.ownerId },
    { $set: updates }
  );
  const updated = await db.collection("somiti_entries").findOne({ _id: id as any });
  return { ...updated, id };
}

export async function deleteSomitiFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("somiti_entries").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function renameSomitiFn(input: { data: { oldName: string; newName: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const entries = await db.collection("somiti_entries").find({ owner_id: session.ownerId }).toArray();
  for (const entry of entries) {
    const note = entry.note || "";
    const match = note.match(/^\[(.*?)\](?:\s*(.*))?$/);
    if (match) {
      const parsedName = match[1].trim();
      if (parsedName.toLowerCase() === data.oldName.trim().toLowerCase()) {
        const actualNote = match[2]?.trim() || "";
        const newNote = actualNote 
          ? `[${data.newName.trim()}] ${actualNote}` 
          : `[${data.newName.trim()}]`;
        await db.collection("somiti_entries").updateOne(
          { _id: entry._id },
          { $set: { note: newNote } }
        );
      }
    }
  }
  return { success: true };
}

export async function deleteSomitiFnByName(input: { data: { name: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const entries = await db.collection("somiti_entries").find({ owner_id: session.ownerId }).toArray();
  for (const entry of entries) {
    const note = entry.note || "";
    const match = note.match(/^\[(.*?)\](?:\s*(.*))?$/);
    if (match) {
      const parsedName = match[1].trim();
      if (parsedName.toLowerCase() === data.name.trim().toLowerCase()) {
        await db.collection("somiti_entries").deleteOne({ _id: entry._id });
      }
    }
  }
  return { success: true };
}


// ─── Withdrawals ──────────────────────────────────────────────────────────────

export async function getWithdrawalsFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("owner_withdrawals").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((w) => ({ ...w, id: w._id as any as string }));
}

export async function createWithdrawalFn(input: { data: { amount: number; note?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = { _id: id, owner_id: session.ownerId, ...data, created_at: new Date().toISOString() };
  await db.collection("owner_withdrawals").insertOne(doc as any);
  return { ...doc, id };
}

// ─── Cashbox ──────────────────────────────────────────────────────────────────

export async function getCashboxFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("cashbox_entries").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).limit(200).toArray();
  return items.map((e) => ({ ...e, id: e._id as any as string }));
}

export async function createCashboxFn(input: { data: { kind: "deposit" | "withdraw"; amount: number; note?: string | null; created_at?: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const saved = await insertCashboxEntry(db, session.ownerId, {
    kind: data.kind,
    amount: data.amount,
    note: data.note ?? null,
    created_at: data.created_at,
  });
  return saved;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadImageFn(input: { data: { base64: string; fileName?: string } }) {
  const { data } = input;
  await requireSession();
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY is not configured");
  const form = new FormData();
  form.append("image", data.base64);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Upload failed");
  return { url: json.data.url as string };
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function getRemindersFn() {
  const session = await requireSession();
  const db = await getDb();
  const items = await db.collection("reminders").find({ owner_id: session.ownerId }).sort({ created_at: -1 }).toArray();
  return items.map((r) => ({ ...r, id: r._id as any as string }));
}

export async function createReminderFn(input: { data: { title: string; due_date: string; logic_type?: string; logic_config?: any } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = {
    _id: id,
    owner_id: session.ownerId,
    title: data.title,
    due_date: data.due_date,
    logic_type: data.logic_type || "none",
    logic_config: data.logic_config || null,
    completed: false,
    created_at: new Date().toISOString(),
  };
  await db.collection("reminders").insertOne(doc as any);
  return { ...doc, id };
}

export async function toggleReminderFn(input: { data: { id: string; completed: boolean } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("reminders").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: { completed: data.completed } });
  return { success: true };
}

export async function deleteReminderFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("reminders").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function deletePayableSettlementFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("party_payable_settlements").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  await db.collection("cashbox_entries").deleteMany({ ref_id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function verifyOwnerPasswordFn(input: { data: { password: string } }) {
  const session = await requireSession();
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: session.userId as any });
  if (!user) throw new Error("User not found");
  const match = await comparePassword(input.data.password, user.password as string);
  if (!match) throw new Error("Incorrect password");
  return { success: true };
}

export async function emptyCashboxFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("cashbox_entries").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetProductsFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("products").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetSalesFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("sales").deleteMany({ owner_id: session.ownerId });
  await db.collection("returns").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetPurchasesFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("purchases").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetSomitiFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("somiti_entries").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetExpensesFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  await db.collection("expenses").deleteMany({ owner_id: session.ownerId });
  return { success: true };
}

export async function resetPartiesFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  const ownerId = session.ownerId;
  await db.collection("customers").deleteMany({ owner_id: ownerId });
  await db.collection("parties").deleteMany({ owner_id: ownerId });
  await db.collection("payments").deleteMany({ owner_id: ownerId });
  await db.collection("party_receivables").deleteMany({ owner_id: ownerId });
  await db.collection("party_payables").deleteMany({ owner_id: ownerId });
  await db.collection("party_payable_settlements").deleteMany({ owner_id: ownerId });
  return { success: true };
}


export async function resetAllDataFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can reset data");
  const db = await getDb();
  const ownerId = session.ownerId;
  await db.collection("products").deleteMany({ owner_id: ownerId });
  await db.collection("sales").deleteMany({ owner_id: ownerId });
  await db.collection("returns").deleteMany({ owner_id: ownerId });
  await db.collection("purchases").deleteMany({ owner_id: ownerId });
  await db.collection("cashbox_entries").deleteMany({ owner_id: ownerId });
  await db.collection("expenses").deleteMany({ owner_id: ownerId });
  await db.collection("somiti_entries").deleteMany({ owner_id: ownerId });
  await db.collection("owner_withdrawals").deleteMany({ owner_id: ownerId });
  await db.collection("customers").deleteMany({ owner_id: ownerId });
  await db.collection("parties").deleteMany({ owner_id: ownerId });
  await db.collection("payments").deleteMany({ owner_id: ownerId });
  await db.collection("party_receivables").deleteMany({ owner_id: ownerId });
  await db.collection("party_payables").deleteMany({ owner_id: ownerId });
  await db.collection("party_payable_settlements").deleteMany({ owner_id: ownerId });
  await db.collection("reminders").deleteMany({ owner_id: ownerId });
  return { success: true };
}

export async function bulkExportToGoogleSheetsFn() {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("Only owner can export data");
  await bulkExportToGoogleSheets(session.ownerId);
  return { success: true };
}

export async function changeMyPasswordFn(input: { data: { currentPassword?: string; newPassword: string } }) {
  const { data } = input;
  const session = await requireSession();
  if (!data.newPassword || data.newPassword.trim().length < 6) {
    throw new Error("New password must be at least 6 characters long");
  }
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: session.userId as any });
  if (!user) throw new Error("User not found");

  if (data.currentPassword) {
    const ok = await comparePassword(data.currentPassword, user.password as string);
    if (!ok) throw new Error("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(data.newPassword.trim());
  await db.collection("users").updateOne(
    { _id: session.userId as any },
    { $set: { password: hashedPassword } }
  );

  return { success: true };
}

export async function createProfileFn(input: { data: { name: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  
  const profileId = crypto.randomUUID();
  const newProfile = {
    id: profileId,
    name: data.name.trim() || "New Profile",
    created_at: new Date().toISOString()
  };

  const ownerIdBase = session.ownerId.split(":")[0];
  const owner = await db.collection("users").findOne({ _id: ownerIdBase as any });
  let profiles = owner?.profiles || [
    { id: "default", name: "Default Profile", created_at: new Date().toISOString() }
  ];
  profiles.push(newProfile);

  await db.collection("users").updateOne(
    { _id: ownerIdBase as any },
    { $set: { profiles } }
  );

  const cookieStore = await cookies();
  cookieStore.set("active_profile", profileId, { maxAge: 365 * 24 * 60 * 60, path: "/" });

  const mapped = await mapUser(db, session.userId);
  return { user: mapped };
}

export async function switchProfileFn(input: { data: { profileId: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();

  const ownerIdBase = session.ownerId.split(":")[0];
  const owner = await db.collection("users").findOne({ _id: ownerIdBase as any });
  const profiles = owner?.profiles || [
    { id: "default", name: "Default Profile", created_at: new Date().toISOString() }
  ];

  const exists = profiles.some((p: any) => p.id === data.profileId);
  if (!exists && data.profileId !== "default") {
    throw new Error("Profile not found");
  }

  const cookieStore = await cookies();
  cookieStore.set("active_profile", data.profileId, { maxAge: 365 * 24 * 60 * 60, path: "/" });

  const mapped = await mapUser(db, session.userId);
  return { user: mapped };
}

export async function importProfileModuleFn(input: { data: { fromProfileId: string; module: "products" | "somiti" | "party" | "customer" | "sales" | "purchases" | "expenses" | "cashbox" } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();

  const ownerIdBase = session.ownerId.split(":")[0];
  const destOwnerId = session.ownerId;
  const sourceProfileId = data.fromProfileId;
  const sourceOwnerId = sourceProfileId === "default" ? ownerIdBase : `${ownerIdBase}:${sourceProfileId}`;

  if (sourceOwnerId === destOwnerId) {
    throw new Error("Cannot import from the same profile");
  }

  let importedCount = 0;

  if (data.module === "products") {
    const srcProducts = await db.collection("products").find({ owner_id: sourceOwnerId }).toArray();
    for (const p of srcProducts) {
      const { _id, ...rest } = p;
      const newId = crypto.randomUUID();
      const doc = {
        ...rest,
        _id: newId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("products").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "somiti") {
    const srcSomiti = await db.collection("somiti_entries").find({ owner_id: sourceOwnerId }).toArray();
    for (const s of srcSomiti) {
      const { _id, ...rest } = s;
      const newId = crypto.randomUUID();
      const doc = {
        ...rest,
        _id: newId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("somiti_entries").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "sales") {
    const srcSales = await db.collection("sales").find({ owner_id: sourceOwnerId }).toArray();
    for (const s of srcSales) {
      const { _id, ...rest } = s;
      const newId = crypto.randomUUID();
      const doc = {
        ...rest,
        _id: newId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("sales").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "purchases") {
    const srcPurchases = await db.collection("purchases").find({ owner_id: sourceOwnerId }).toArray();
    for (const p of srcPurchases) {
      const { _id, ...rest } = p;
      const newId = crypto.randomUUID();
      const doc = {
        ...rest,
        _id: newId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("purchases").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "expenses") {
    const srcExpenses = await db.collection("expenses").find({ owner_id: sourceOwnerId }).toArray();
    for (const e of srcExpenses) {
      const { _id, ...rest } = e;
      const newId = crypto.randomUUID();
      const doc = {
        ...rest,
        _id: newId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("expenses").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "cashbox") {
    const srcCashbox = await db.collection("cashbox_entries").find({ owner_id: sourceOwnerId }).toArray();
    for (const c of srcCashbox) {
      const { _id, ...rest } = c;
      const doc = {
        ...rest,
        _id: crypto.randomUUID(),
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("cashbox_entries").insertOne(doc as any);
      importedCount++;
    }
    const srcWithdrawals = await db.collection("owner_withdrawals").find({ owner_id: sourceOwnerId }).toArray();
    for (const w of srcWithdrawals) {
      const { _id, ...rest } = w;
      const doc = {
        ...rest,
        _id: crypto.randomUUID(),
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("owner_withdrawals").insertOne(doc as any);
      importedCount++;
    }
  } else if (data.module === "customer") {
    const srcCustomers = await db.collection("customers").find({ owner_id: sourceOwnerId }).toArray();
    for (const c of srcCustomers) {
      const newCustomerId = crypto.randomUUID();
      const oldCustomerId = c._id as any as string;
      const { _id, ...rest } = c;

      const docCustomer = {
        ...rest,
        _id: newCustomerId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("customers").insertOne(docCustomer as any);
      importedCount++;

      const srcReceivables = await db.collection("party_receivables").find({ owner_id: sourceOwnerId, party_id: oldCustomerId }).toArray();
      for (const r of srcReceivables) {
        const { _id: rId, ...rRest } = r;
        await db.collection("party_receivables").insertOne({
          ...rRest,
          _id: crypto.randomUUID(),
          owner_id: destOwnerId,
          party_id: newCustomerId,
          created_at: new Date().toISOString()
        } as any);
      }

      const srcPayments = await db.collection("payments").find({ owner_id: sourceOwnerId, party_id: oldCustomerId }).toArray();
      for (const pay of srcPayments) {
        const { _id: payId, ...payRest } = pay;
        await db.collection("payments").insertOne({
          ...payRest,
          _id: crypto.randomUUID(),
          owner_id: destOwnerId,
          party_id: newCustomerId,
          created_at: new Date().toISOString()
        } as any);
      }
    }
  } else if (data.module === "party") {
    const srcParties = await db.collection("parties").find({ owner_id: sourceOwnerId }).toArray();
    for (const p of srcParties) {
      const newPartyId = crypto.randomUUID();
      const oldPartyId = p._id as any as string;
      const { _id, ...rest } = p;

      const docParty = {
        ...rest,
        _id: newPartyId,
        owner_id: destOwnerId,
        created_at: new Date().toISOString()
      };
      await db.collection("parties").insertOne(docParty as any);
      importedCount++;

      const srcPayables = await db.collection("party_payables").find({ owner_id: sourceOwnerId, party_id: oldPartyId }).toArray();
      for (const pb of srcPayables) {
        const { _id: pbId, ...pbRest } = pb;
        await db.collection("party_payables").insertOne({
          ...pbRest,
          _id: crypto.randomUUID(),
          owner_id: destOwnerId,
          party_id: newPartyId,
          created_at: new Date().toISOString()
        } as any);
      }

      const srcPayments = await db.collection("payments").find({ owner_id: sourceOwnerId, party_id: oldPartyId }).toArray();
      for (const pay of srcPayments) {
        const { _id: payId, ...payRest } = pay;
        await db.collection("payments").insertOne({
          ...payRest,
          _id: crypto.randomUUID(),
          owner_id: destOwnerId,
          party_id: newPartyId,
          created_at: new Date().toISOString()
        } as any);
      }

      const srcSettlements = await db.collection("party_payable_settlements").find({ owner_id: sourceOwnerId, party_id: oldPartyId }).toArray();
      for (const st of srcSettlements) {
        const { _id: stId, ...stRest } = st;
        await db.collection("party_payable_settlements").insertOne({
          ...stRest,
          _id: crypto.randomUUID(),
          owner_id: destOwnerId,
          party_id: newPartyId,
          created_at: new Date().toISOString()
        } as any);
      }
    }
  }

  return { success: true, importedCount };
}

export async function getCustomersFn() {
  const session = await requireSession();
  const db = await getDb();
  
  // Automatically migrate existing parties to customers if customers collection is empty
  const count = await db.collection("customers").countDocuments({ owner_id: session.ownerId });
  if (count === 0) {
    const allParties = await db.collection("parties").find({ owner_id: session.ownerId }).toArray();
    if (allParties.length > 0) {
      await db.collection("customers").insertMany(allParties.map(p => ({
        ...p,
        _id: p._id,
      })) as any[]);
    }
  }

  const items = await db.collection("customers").find({ owner_id: session.ownerId }).sort({ name: 1 }).toArray();
  return items.map((c) => ({ ...c, id: c._id as any as string }));
}

export async function getCustomerFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const doc = await db.collection("customers").findOne({ _id: data.id as any, owner_id: session.ownerId });
  if (!doc) return null;
  return { ...doc, id: doc._id as any as string };
}

export async function createCustomerFn(input: { data: { name: string; phone?: string | null; address?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const id = crypto.randomUUID();
  const doc = {
    _id: id as any,
    owner_id: session.ownerId,
    name: data.name,
    phone: data.phone || null,
    address: data.address || null,
    archived: false,
    created_at: new Date().toISOString(),
  };
  await db.collection("customers").insertOne(doc as any);
  return { success: true, id };
}

export async function updateCustomerFn(input: { data: { id: string; name: string; phone?: string | null; address?: string | null } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  const updates = {
    name: data.name,
    phone: data.phone || null,
    address: data.address || null,
  };
  await db.collection("customers").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: updates });
  const updated = await db.collection("customers").findOne({ _id: data.id as any });
  return { success: true, customer: updated ? { ...updated, id: updated._id as any as string } : null };
}

export async function deleteCustomerFn(input: { data: { id: string } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("customers").deleteOne({ _id: data.id as any, owner_id: session.ownerId });
  return { success: true };
}

export async function archiveCustomerFn(input: { data: { id: string; archived: boolean } }) {
  const { data } = input;
  const session = await requireSession();
  const db = await getDb();
  await db.collection("customers").updateOne({ _id: data.id as any, owner_id: session.ownerId }, { $set: { archived: data.archived } });
  return { success: true };
}

export async function getStorefrontBySlug(input: any) {
  let slugStr = "";
  if (typeof input === "string") {
    slugStr = input;
  } else if (input && typeof input === "object") {
    if (typeof input.slug === "string") {
      slugStr = input.slug;
    } else if (input.data && typeof input.data.slug === "string") {
      slugStr = input.data.slug;
    } else if (typeof input.data === "string") {
      slugStr = input.data;
    }
  }

  const db = await getDb();
  const cleanSlug = (slugStr || "").toLowerCase().trim();
  const business = await db.collection("businesses").findOne({ slug: cleanSlug });
  if (!business && slugStr) {
    return await db.collection("businesses").findOne({ name: slugStr });
  }
  return business;
}


