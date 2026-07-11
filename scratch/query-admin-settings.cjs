const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("dreamfashion");

    const superAdmins = await db.collection("super_admins").find({}).toArray();
    console.log("Super Admins:", JSON.stringify(superAdmins, null, 2));

    const settings = await db.collection("settings").find({}).toArray();
    console.log("Settings count:", settings.length);
    if (settings.length > 0) {
      console.log("Sample settings doc keys:", Object.keys(settings[0]));
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
