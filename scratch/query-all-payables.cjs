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

    // Query party_payables for this owner
    const payables = await db.collection("party_payables").find({
      owner_id: ownerId
    }).toArray();

    console.log("All party_payables in DB:");
    for (const p of payables) {
      const party = await db.collection("parties").findOne({ _id: p.party_id });
      console.log(`Created: ${p.created_at} | Party: ${party ? party.name : 'Unknown'} (${p.party_id}) | Amount: ${p.amount}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
