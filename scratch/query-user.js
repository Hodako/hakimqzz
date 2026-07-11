const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully.");
    const db = client.db("dreamfashion");

    // 1. Find the user
    const email = "mdneel2020@gmail.com";
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      console.log(`No user found with email ${email}`);
      return;
    }
    console.log("\n--- User Details ---");
    console.log(`User ID: ${user._id}`);
    console.log(`Role: ${user.role}`);
    console.log(`Owner ID: ${user.owner_id}`);
    
    const ownerId = user.role === 'employee' ? user.owner_id : user._id.toString();
    console.log(`Using Owner ID for data query: ${ownerId}`);

    // 2. Query cashbox entries on July 7, 2026
    const startRange = new Date("2026-07-07T00:00:00Z");
    const endRange = new Date("2026-07-07T23:59:59Z");
    
    // Find all cashbox entries around that date range (as ISO string)
    const entries = await db.collection("cashbox_entries").find({
      owner_id: ownerId,
      created_at: {
        $gte: "2026-07-07T00:00:00",
        $lte: "2026-07-07T23:59:59Z"
      }
    }).toArray();

    console.log(`\n--- Cashbox Entries for ${ownerId} on July 7, 2026 ---`);
    console.log(`Found ${entries.length} entries:`);
    for (const entry of entries) {
      console.log(JSON.stringify(entry, null, 2));
    }

    // Also look for any entry containing 4000 amount across all time for this owner
    console.log("\n--- Searching for any 4000 Taka Cashbox entries for this owner ---");
    const all4000Entries = await db.collection("cashbox_entries").find({
      owner_id: ownerId,
      amount: 4000
    }).toArray();
    for (const entry of all4000Entries) {
      console.log(JSON.stringify(entry, null, 2));
      
      // If there is a ref_id, let's search for it in other collections
      if (entry.ref_id) {
        console.log(`Searching references for ref_id: ${entry.ref_id}`);
        const sale = await db.collection("sales").findOne({ _id: entry.ref_id });
        if (sale) {
          console.log("Found matching Sale:", JSON.stringify(sale, null, 2));
        }
        const expense = await db.collection("expenses").findOne({ _id: entry.ref_id });
        if (expense) {
          console.log("Found matching Expense:", JSON.stringify(expense, null, 2));
        }
        const purchase = await db.collection("purchases").findOne({ _id: entry.ref_id });
        if (purchase) {
          console.log("Found matching Purchase:", JSON.stringify(purchase, null, 2));
        }
        const withdrawal = await db.collection("owner_withdrawals").findOne({ _id: entry.ref_id });
        if (withdrawal) {
          console.log("Found matching Owner Withdrawal:", JSON.stringify(withdrawal, null, 2));
        }
      }
    }

    // 3. Search sales and expenses of 4000 or general July 7 entries
    console.log("\n--- Sales on July 7, 2026 ---");
    const sales = await db.collection("sales").find({
      owner_id: ownerId,
      created_at: {
        $gte: "2026-07-07T00:00:00",
        $lte: "2026-07-07T23:59:59Z"
      }
    }).toArray();
    for (const sale of sales) {
      console.log(JSON.stringify(sale, null, 2));
    }

  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await client.close();
  }
}

main();
