const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("dreamfashion");

    const partyId = "6b8492f0-6923-498e-94a8-40d2232935c0";
    const party = await db.collection("parties").findOne({ _id: partyId });
    console.log("Party details:", JSON.stringify(party, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
