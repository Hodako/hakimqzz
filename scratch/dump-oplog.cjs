const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("local");
    const oplog = db.collection("oplog.rs");

    const startTime = new Date("2026-07-07T00:00:00Z");
    const endTime = new Date("2026-07-07T23:59:59Z");

    console.log(`--- DUMPING ALL OPLOG WRITE EVENTS FOR YESTERDAY ---`);

    const cursor = oplog.find({
      ns: { $regex: /^dreamfashion\./ },
      wall: { $gte: startTime, $lte: endTime }
    }).sort({ wall: 1 });

    while (await cursor.hasNext()) {
      const entry = await cursor.next();
      const timeStr = new Date(entry.wall).toISOString();
      const opType = entry.op === 'i' ? 'INSERT' : entry.op === 'u' ? 'UPDATE' : entry.op === 'd' ? 'DELETE' : entry.op;
      
      console.log(`[${timeStr}] Op: ${opType} | Collection: ${entry.ns}`);
      
      if (entry.op === 'i') {
        console.log(`  Inserted:`, JSON.stringify(entry.o));
      } else if (entry.op === 'u') {
        const diff = entry.o.diff || entry.o;
        console.log(`  Update Diff:`, JSON.stringify(diff));
        if (entry.o2) console.log(`  Target ID:`, entry.o2._id);
      } else if (entry.op === 'd') {
        console.log(`  Deleted ID:`, entry.o._id);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
