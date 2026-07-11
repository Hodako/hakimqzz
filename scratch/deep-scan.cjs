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

    const collectionsInfo = await db.listCollections().toArray();
    const collectionNames = collectionsInfo.map(c => c.name);

    console.log(`--- SCANNING ALL DB DOCUMENTS FOR OWNER: ${ownerId} FOR VALUE 4000 or -4000 ---`);

    for (const colName of collectionNames) {
      const cursor = db.collection(colName).find({ owner_id: ownerId });
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        
        // Deep search the doc for 4000
        const str = JSON.stringify(doc);
        if (str.includes("4000") || str.includes("3500") || str.includes("3850")) {
          console.log(`\nMatch in [${colName}]:`);
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
