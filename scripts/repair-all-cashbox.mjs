import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

function saleCashboxAmount(data) {
  if (data.type === "credit") return Number(data.paid_amount) || 0;
  if (data.type === "cash") return Number(data.paid_amount) || (Number(data.sell_price) * (Number(data.qty) || 1));
  // Online sales: admin does not receive money immediately, so not added to cashbox
  return 0;
}

async function main() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4,
  });
  await client.connect();
  const db = client.db();
  console.log("Connected successfully!");

  // Find all distinct owner_ids across collections
  const ownerIdSet = new Set();
  const collections = ["users", "sales", "cashbox_entries", "expenses", "purchases", "returns", "somiti_entries", "owner_withdrawals", "payments", "party_payable_settlements"];
  for (const col of collections) {
    const items = await db.collection(col).find({}, { projection: { owner_id: 1, _id: 1 } }).toArray();
    for (const item of items) {
      const oid = item.owner_id || item._id?.toString();
      if (oid) ownerIdSet.add(oid.toString());
    }
  }

  const ownerIds = Array.from(ownerIdSet);
  console.log(`Found ${ownerIds.length} owners/users to inspect and repair.`);

  let grandTotalRepaired = 0;

  for (const ownerId of ownerIds) {
    console.log(`\n--- Repairing cashbox for Owner ID: ${ownerId} ---`);
    const sales = await db.collection("sales").find({ owner_id: ownerId }).toArray();
    const returns = await db.collection("returns").find({ owner_id: ownerId }).toArray();
    const expenses = await db.collection("expenses").find({ owner_id: ownerId }).toArray();
    const purchases = await db.collection("purchases").find({ owner_id: ownerId }).toArray();
    const somitiEntries = await db.collection("somiti_entries").find({ owner_id: ownerId }).toArray();
    const ownerWithdrawals = await db.collection("owner_withdrawals").find({ owner_id: ownerId }).toArray();
    const payments = await db.collection("payments").find({ owner_id: ownerId }).toArray();
    const payableSettlements = await db.collection("party_payable_settlements").find({ owner_id: ownerId }).toArray();
    const cashboxEntries = await db.collection("cashbox_entries").find({ owner_id: ownerId }).toArray();

    let ownerRepairedCount = 0;

    // 1. Repair Sales
    for (const sale of sales) {
      const saleId = sale._id.toString();
      const expectedAmount = saleCashboxAmount(sale);
      const match = cashboxEntries.find(e => e.ref_id === saleId);
      if (expectedAmount > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "sale",
            amount: expectedAmount,
            note: `Sale: ${sale.product_name}`,
            ref_id: saleId,
            created_at: sale.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "sale" || Number(match.amount) !== expectedAmount || match.created_at !== sale.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "sale", amount: expectedAmount, created_at: sale.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 2. Repair Returns
    for (const ret of returns) {
      const retId = ret._id.toString();
      let expectedAmount = 0;
      if (ret.sale_id) {
        const sale = sales.find(s => s._id.toString() === ret.sale_id.toString());
        if (sale) {
          const saleType = sale.type || "cash";
          const returnQty = Number(ret.qty) || 0;
          if (saleType === "cash") {
            expectedAmount = Number(sale.sell_price) * returnQty;
          } else if (saleType === "credit") {
            const paidPerUnit = Number(sale.qty) > 0 ? Number(sale.paid_amount) / Number(sale.qty) : 0;
            expectedAmount = paidPerUnit * returnQty;
          }
        }
      } else if (ret.return_price) {
        expectedAmount = Number(ret.qty) * (Number(ret.return_price) || 0);
      } else if (ret.amount && ret.deduct_type === "cash") {
        expectedAmount = Number(ret.amount) || 0;
      }

      const match = cashboxEntries.find(e => e.ref_id === retId);
      if (expectedAmount > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "withdraw",
            amount: expectedAmount,
            note: ret.note ? `Return refund: ${ret.note}` : `Return: ${ret.product_name || "Product"}`,
            ref_id: retId,
            created_at: ret.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "withdraw" || Number(match.amount) !== expectedAmount || match.created_at !== ret.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "withdraw", amount: expectedAmount, created_at: ret.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 3. Track Purchase Linked Expenses
    const purchaseLinkedExpenseIds = new Set();
    for (const p of purchases) {
      const linkedExp = expenses.find(e => e.note && e.note.includes(`Purchase ID: ${p._id}`));
      if (linkedExp) {
        purchaseLinkedExpenseIds.add(linkedExp._id.toString());
      } else {
        const fallbackExp = expenses.find(e => 
          e.title === `Product Purchase: ${p.product_name}` && 
          Number(e.amount) === Number(p.total) && 
          !purchaseLinkedExpenseIds.has(e._id.toString())
        );
        if (fallbackExp) {
          purchaseLinkedExpenseIds.add(fallbackExp._id.toString());
        }
      }
    }

    // 4. Standalone Expenses
    for (const exp of expenses) {
      const expId = exp._id.toString();
      if (purchaseLinkedExpenseIds.has(expId)) continue;

      const match = cashboxEntries.find(e => e.ref_id === expId);
      const expAmt = Number(exp.amount) || 0;
      if (expAmt > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "expense",
            amount: expAmt,
            note: exp.title,
            ref_id: expId,
            created_at: exp.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "expense" || Number(match.amount) !== expAmt || match.created_at !== exp.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "expense", amount: expAmt, created_at: exp.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 5. Purchases
    for (const p of purchases) {
      const pId = p._id.toString();
      const linkedExp = expenses.find(e => e.note && e.note.includes(`Purchase ID: ${p._id}`));
      const fallbackExp = expenses.find(e => 
        e.title === `Product Purchase: ${p.product_name}` && 
        Number(e.amount) === Number(p.total)
      );
      const expId = linkedExp ? linkedExp._id.toString() : (fallbackExp ? fallbackExp._id.toString() : null);

      const match = cashboxEntries.find(e => e.ref_id === pId || (expId && e.ref_id === expId));
      const pTotal = Number(p.total) || 0;
      if (pTotal > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "expense",
            amount: pTotal,
            note: `Product Purchase: ${p.product_name}`,
            ref_id: pId,
            created_at: p.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "expense" || Number(match.amount) !== pTotal || match.created_at !== p.created_at || match.ref_id !== pId) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "expense", amount: pTotal, ref_id: pId, created_at: p.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 6. Somiti Entries
    for (const som of somitiEntries) {
      const somId = som._id.toString();
      const match = cashboxEntries.find(e => e.ref_id === somId);
      const somAmt = Number(som.amount) || 0;
      if (somAmt > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "withdraw",
            amount: somAmt,
            note: som.note || "Samity payment",
            ref_id: somId,
            created_at: som.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "withdraw" || Number(match.amount) !== somAmt || match.created_at !== som.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "withdraw", amount: somAmt, created_at: som.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 7. Withdrawals
    for (const w of ownerWithdrawals) {
      const wId = w._id.toString();
      const match = cashboxEntries.find(e => e.ref_id === wId);
      const wAmt = Number(w.amount) || 0;
      if (wAmt > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "withdraw",
            amount: wAmt,
            note: w.note || "Owner Withdrawal",
            ref_id: wId,
            created_at: w.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "withdraw" || Number(match.amount) !== wAmt || match.created_at !== w.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "withdraw", amount: wAmt, created_at: w.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 8. Payments
    for (const pay of payments) {
      const payId = pay._id.toString();
      const match = cashboxEntries.find(e => e.ref_id === payId);
      const payAmt = Number(pay.amount) || 0;
      if (payAmt > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "deposit",
            amount: payAmt,
            note: pay.note || "Collected dues",
            ref_id: payId,
            created_at: pay.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "deposit" || Number(match.amount) !== payAmt || match.created_at !== pay.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "deposit", amount: payAmt, created_at: pay.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 9. Payable Settlements
    for (const set of payableSettlements) {
      const setId = set._id.toString();
      const match = cashboxEntries.find(e => e.ref_id === setId);
      const setAmt = Number(set.amount) || 0;
      if (setAmt > 0) {
        if (!match) {
          const id = crypto.randomUUID();
          await db.collection("cashbox_entries").insertOne({
            _id: id,
            owner_id: ownerId,
            kind: "withdraw",
            amount: setAmt,
            note: set.note || "Paid to Supplier",
            ref_id: setId,
            created_at: set.created_at || new Date().toISOString(),
          });
          ownerRepairedCount++;
        } else if (match.kind !== "withdraw" || Number(match.amount) !== setAmt || match.created_at !== set.created_at) {
          await db.collection("cashbox_entries").updateOne(
            { _id: match._id },
            { $set: { kind: "withdraw", amount: setAmt, created_at: set.created_at } }
          );
          ownerRepairedCount++;
        }
      } else if (match) {
        await db.collection("cashbox_entries").deleteOne({ _id: match._id });
        ownerRepairedCount++;
      }
    }

    // 10. Orphan Cleanup
    const validRefIds = new Set();
    sales.filter(s => saleCashboxAmount(s) > 0).forEach(s => validRefIds.add(s._id.toString()));
    returns.forEach(r => validRefIds.add(r._id.toString()));
    expenses.filter(e => (Number(e.amount) || 0) > 0).forEach(e => validRefIds.add(e._id.toString()));
    purchases.filter(p => (Number(p.total) || 0) > 0).forEach(p => validRefIds.add(p._id.toString()));
    somitiEntries.filter(s => (Number(s.amount) || 0) > 0).forEach(s => validRefIds.add(s._id.toString()));
    ownerWithdrawals.filter(w => (Number(w.amount) || 0) > 0).forEach(w => validRefIds.add(w._id.toString()));
    payments.filter(p => (Number(p.amount) || 0) > 0).forEach(p => validRefIds.add(p._id.toString()));
    payableSettlements.filter(s => (Number(s.amount) || 0) > 0).forEach(s => validRefIds.add(s._id.toString()));

    const toDelete = cashboxEntries.filter(e => e.ref_id && !validRefIds.has(e.ref_id.toString()));
    if (toDelete.length > 0) {
      const toDeleteIds = toDelete.map(e => e._id);
      await db.collection("cashbox_entries").deleteMany({ _id: { $in: toDeleteIds } });
      ownerRepairedCount += toDelete.length;
    }

    console.log(`Owner ${ownerId}: ${ownerRepairedCount} cashbox entries repaired/synchronized.`);
    grandTotalRepaired += ownerRepairedCount;
  }

  console.log(`\n==============================================`);
  console.log(`SUCCESS! Grand total repaired across all accounts: ${grandTotalRepaired}`);
  console.log(`==============================================`);

  await client.close();
}

main().catch(err => {
  console.error("Error executing repair-all-cashbox:", err);
  process.exit(1);
});
