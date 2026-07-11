const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("dreamfashion");

    const email = "mdneel2020@gmail.com";
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      console.log(`No user found with email ${email}`);
      return;
    }
    
    const ownerId = user.role === 'employee' ? user.owner_id : user._id.toString();

    // Query cashbox entries on July 7, 2026
    const entries = await db.collection("cashbox_entries").find({
      owner_id: ownerId,
      created_at: {
        $gte: "2026-07-07T00:00:00",
        $lte: "2026-07-07T23:59:59Z"
      }
    }).sort({ created_at: 1 }).toArray();

    console.log(`TOTAL_ENTRIES_ON_JULY_7: ${entries.length}`);
    for (const entry of entries) {
      console.log(`CASHBOX_ENTRY: ID=${entry._id} Kind=${entry.kind} Amount=${entry.amount} Note="${entry.note}" RefID=${entry.ref_id} Created=${entry.created_at}`);
    }

    // Check all collections for any documents created on July 7, 2026 with amount/price = 4000 or similar
    console.log("\n--- Searching for 4000 Taka in all collections ---");
    const collections = ["cashbox_entries", "sales", "expenses", "purchases", "owner_withdrawals", "somiti_entries"];
    for (const colName of collections) {
      const docs = await db.collection(colName).find({
        owner_id: ownerId,
        $or: [
          { amount: 4000 },
          { amount: "4000" },
          { sell_price: 4000 },
          { paid_amount: 4000 },
          { due_amount: 4000 },
          { amount: -4000 }
        ]
      }).toArray();
      if (docs.length > 0) {
        console.log(`Found in ${colName}:`, JSON.stringify(docs, null, 2));
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
