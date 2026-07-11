const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  let client;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt})...`);
      client = new MongoClient(uri, { family: 4, serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const db = client.db("dreamfashion");
      
      console.log("Connected! Fetching a sample sale...");
      const sale = await db.collection("sales").findOne({ party_id: { $ne: null } });
      console.log("Sample sale keys:", Object.keys(sale || {}));
      console.log("Sample sale values:", JSON.stringify(sale, null, 2));
      return;
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (client) await client.close();
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

main();
