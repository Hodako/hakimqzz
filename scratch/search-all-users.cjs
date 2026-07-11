const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("dreamfashion");

    const collectionsInfo = await db.listCollections().toArray();
    const collectionNames = collectionsInfo.map(c => c.name);

    console.log("--- SEARCHING WHOLE DATABASE FOR 4000 ON JULY 7 ---");
    for (const colName of collectionNames) {
      const docs = await db.collection(colName).find({
        created_at: {
          $gte: "2026-07-07T00:00:00",
          $lte: "2026-07-07T23:59:59Z"
        }
      }).toArray();
      
      for (const doc of docs) {
        const str = JSON.stringify(doc);
        if (str.includes("4000") || str.includes("3850") || str.includes("3500")) {
          console.log(`Found in [${colName}] for owner [${doc.owner_id}]:`);
          console.log(JSON.stringify(doc, null, 2));
        }
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
