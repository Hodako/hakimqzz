const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("local");
    const oplog = db.collection("oplog.rs");

    const deletedIds = [
      "035d14a9-e7d9-4ed9-bc51-b00b36356cf8",
      "130fce31-57a6-44ae-ba6c-6d0853b3653c",
      "4262373d-8bd3-4d72-816d-71adae12bbc6"
    ];

    console.log("Searching oplog for the replaced/deleted transaction details...");
    
    for (const id of deletedIds) {
      const cursor = oplog.find({
        $or: [
          { "o._id": id },
          { "o2._id": id },
          { "o.ref_id": id }
        ]
      });
      
      while (await cursor.hasNext()) {
        const entry = await cursor.next();
        const wallLocal = new Date(new Date(entry.wall).getTime() + 6 * 60 * 60 * 1000).toISOString().replace('Z', '+06:00').replace('T', ' ');
        console.log(`\nFound oplog event for ID: ${id}`);
        console.log(`  Time: ${wallLocal}`);
        console.log(`  OpType: ${entry.op === 'i' ? 'INSERT' : entry.op === 'u' ? 'UPDATE' : entry.op === 'd' ? 'DELETE' : entry.op}`);
        console.log(`  Collection: ${entry.ns}`);
        console.log(`  Details:`, JSON.stringify(entry.o));
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
