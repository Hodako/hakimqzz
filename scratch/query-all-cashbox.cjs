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

    const allEntries = await db.collection("cashbox_entries").find({
      owner_id: ownerId
    }).sort({ created_at: 1 }).toArray();

    console.log(`TOTAL_ALL_TIME_ENTRIES: ${allEntries.length}`);
    for (const entry of allEntries) {
      console.log(`${entry.created_at} | Kind: ${entry.kind} | Amount: ${entry.amount} | Note: "${entry.note}" | RefID: ${entry.ref_id}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
