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
    console.log("User Profiles:", JSON.stringify(user.profiles, null, 2));

    // Get all cashbox entries and group them by profile_id (if profile_id exists on entries)
    const sampleEntry = await db.collection("cashbox_entries").findOne({ owner_id: user._id.toString() });
    console.log("Sample cashbox entry keys:", Object.keys(sampleEntry || {}));

    const allKeys = await db.collection("cashbox_entries").distinct("profile_id", { owner_id: user._id.toString() });
    console.log("Distinct profile_ids in cashbox_entries:", allKeys);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
