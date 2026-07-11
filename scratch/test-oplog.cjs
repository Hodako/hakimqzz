const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    
    // Check if we can access the local database and oplog.rs
    const localDb = client.db("local");
    const oplog = localDb.collection("oplog.rs");
    
    console.log("Attempting to query local.oplog.rs...");
    // Find the latest oplog entries
    const entries = await oplog.find({}).sort({ $natural: -1 }).limit(5).toArray();
    console.log("Successfully queried oplog!");
    console.log(JSON.stringify(entries, null, 2));

  } catch (err) {
    console.error("Could not query oplog.rs directly:", err.message);
  } finally {
    await client.close();
  }
}

main();
