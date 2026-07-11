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

    // Query cashbox entries on July 3 and 4
    const entries = await db.collection("cashbox_entries").find({
      owner_id: ownerId,
      created_at: {
        $gte: "2026-07-03T00:00:00",
        $lte: "2026-07-04T23:59:59Z"
      }
    }).sort({ created_at: 1 }).toArray();

    console.log("July 3 and July 4 Cashbox Entries:");
    for (const e of entries) {
      console.log(`${e.created_at} | Kind: ${e.kind} | Amount: ${e.amount} | Note: "${e.note}"`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
