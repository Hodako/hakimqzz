const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("dreamfashion");

    const refId = "d5ede6dc-5151-4829-a4dc-0bd3ccd9fef8";
    
    // List all collections
    const collectionsInfo = await db.listCollections().toArray();
    const collectionNames = collectionsInfo.map(c => c.name);
    console.log("All collections in database:", collectionNames);

    console.log(`Searching for ID ${refId} in ALL collections...`);
    for (const colName of collectionNames) {
      const doc = await db.collection(colName).findOne({ _id: refId });
      if (doc) {
        console.log(`Found in [${colName}]:`, JSON.stringify(doc, null, 2));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
