const { MongoClient } = require('mongodb');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("local");
    const oplog = db.collection("oplog.rs");

    // We filter by yesterday (July 7, 2026)
    const startTime = new Date("2026-07-07T00:00:00Z");
    const endTime = new Date("2026-07-07T23:59:59Z");

    console.log(`Querying oplog from ${startTime.toISOString()} to ${endTime.toISOString()}...`);

    const cursor = oplog.find({
      ns: { $regex: /^dreamfashion\.(sales|cashbox_entries|expenses|party_payable_settlements|party_payables|payments|purchases)/ },
      wall: { $gte: startTime, $lte: endTime }
    }).sort({ wall: 1 });

    let count = 0;
    while (await cursor.hasNext()) {
      const entry = await cursor.next();
      count++;
      
      const timeStr = new Date(entry.wall).toISOString();
      const opType = entry.op === 'i' ? 'INSERT' : entry.op === 'u' ? 'UPDATE' : entry.op === 'd' ? 'DELETE' : entry.op;
      const ns = entry.ns;
      
      console.log(`[${timeStr}] Op: ${opType} | Collection: ${ns}`);
      
      if (entry.op === 'i') {
        // Log inserted document details
        const doc = entry.o;
        if (doc.owner_id === 'a174e49a-fb34-4b89-8f32-37b8903d89f2' || !doc.owner_id) {
          console.log(`  Inserted Doc: ID=${doc._id} | Amount=${doc.amount || doc.paid_amount || doc.total} | Note="${doc.note || doc.title || doc.product_name}" | Kind=${doc.kind || ''}`);
        }
      } else if (entry.op === 'u') {
        // Log update details
        const diff = entry.o.diff || entry.o;
        console.log(`  Update Diff:`, JSON.stringify(diff));
        console.log(`  Target ID:`, entry.o2 ? entry.o2._id : 'Unknown');
      } else if (entry.op === 'd') {
        // Log delete details
        console.log(`  Deleted ID:`, entry.o._id);
      }
    }

    console.log(`\nTotal Oplog events found: ${count}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
