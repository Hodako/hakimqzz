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

    console.log(`--- DUMPING ALL DOCUMENTS CREATED ON JULY 7, 2026 FOR OWNER: ${ownerId} ---`);
    
    for (const colName of collectionNames) {
      if (colName === 'users' || colName === 'businesses' || colName === 'super_admins' || colName === 'settings' || colName === 'licenses') continue;
      
      const docs = await db.collection(colName).find({
        owner_id: ownerId,
        created_at: {
          $gte: "2026-07-07T00:00:00",
          $lte: "2026-07-07T23:59:59Z"
        }
      }).toArray();
      
      if (docs.length > 0) {
        console.log(`\nCollection [${colName}] count: ${docs.length}`);
        for (const doc of docs) {
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
