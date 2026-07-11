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

    // Get all cashbox entries sorted by date
    const allEntries = await db.collection("cashbox_entries").find({
      owner_id: ownerId
    }).sort({ created_at: 1 }).toArray();

    let balance = 0;
    console.log("--- RUNNING BALANCE STEP-BY-STEP FOR JULY 7, 2026 ---");
    for (const entry of allEntries) {
      const amount = Number(entry.amount);
      const delta = (entry.kind === 'deposit' || entry.kind === 'sale') ? amount : -amount;
      balance += delta;
      
      if (entry.created_at.startsWith("2026-07-07")) {
        console.log(`Time: ${entry.created_at.slice(11, 19)} | Kind: ${entry.kind.padEnd(8)} | Amount: ${amount.toFixed(2).padStart(8)} | Bal: ${balance.toFixed(2).padStart(8)} | Note: "${entry.note}"`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
