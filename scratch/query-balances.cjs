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

    console.log(`Total cashbox entries all-time: ${allEntries.length}`);

    let balance = 0;
    const dailyBalances = {};

    for (const entry of allEntries) {
      const amount = Number(entry.amount);
      const delta = (entry.kind === 'deposit' || entry.kind === 'sale') ? amount : -amount;
      balance += delta;
      
      const dateStr = entry.created_at.slice(0, 10);
      dailyBalances[dateStr] = balance;
    }

    console.log("\n--- Running Balance at the End of Each Day ---");
    for (const [date, bal] of Object.entries(dailyBalances)) {
      console.log(`${date}: ${bal.toFixed(3)} Taka`);
    }

    // Let's also check if there are any specific manual deposits or sales on July 7, 2026
    console.log("\n--- Checking all transactions of July 7, 2026 ---");
    console.log("Cashbox entries on July 7:");
    let dayInflow = 0;
    let dayOutflow = 0;
    for (const entry of allEntries) {
      if (entry.created_at.startsWith("2026-07-07")) {
        const amount = Number(entry.amount);
        const delta = (entry.kind === 'deposit' || entry.kind === 'sale') ? amount : -amount;
        if (delta > 0) dayInflow += delta;
        else dayOutflow += Math.abs(delta);
        console.log(`  Kind=${entry.kind}, Amount=${entry.amount}, Note="${entry.note}", RefID=${entry.ref_id}, Created=${entry.created_at}`);
      }
    }
    console.log(`July 7 Inflows: ${dayInflow}, Outflows: ${dayOutflow}, Net Change: ${dayInflow - dayOutflow}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
