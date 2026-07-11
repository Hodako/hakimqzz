const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = "mongodb://dreamfashion:BxbSKxty8gtLt0Y4@ac-71km7lb-shard-00-00.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-01.1od4yi3.mongodb.net:27017,ac-71km7lb-shard-00-02.1od4yi3.mongodb.net:27017/dreamfashion?ssl=true&replicaSet=atlas-7fuftl-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, { family: 4 });
  try {
    await client.connect();
    const db = client.db("local");
    const oplog = db.collection("oplog.rs");

    // Local time 11:00 AM is 05:00:00 UTC. We query up to 23:59:59 local (18:00:00 UTC)
    const startTime = new Date("2026-07-07T05:00:00Z");
    const endTime = new Date("2026-07-07T23:59:59Z");

    const cursor = oplog.find({
      ns: { $regex: /^dreamfashion\./ },
      wall: { $gte: startTime, $lte: endTime }
    }).sort({ wall: 1 });

    let output = `--- DB WRITE EVENT LOGS FOR JULY 7, 2026 AFTER 11:00 AM LOCAL TIME ---\n\n`;

    while (await cursor.hasNext()) {
      const entry = await cursor.next();
      const timeStr = new Date(entry.wall).toISOString();
      // Convert to local time (GMT+06:00)
      const localTimeStr = new Date(new Date(entry.wall).getTime() + 6 * 60 * 60 * 1000).toISOString().replace('Z', '+06:00').replace('T', ' ');
      
      const opType = entry.op === 'i' ? 'INSERT' : entry.op === 'u' ? 'UPDATE' : entry.op === 'd' ? 'DELETE' : entry.op;
      
      output += `[${localTimeStr} | UTC: ${timeStr}] Op: ${opType} | Collection: ${entry.ns}\n`;
      
      if (entry.op === 'i') {
        output += `  Inserted Document: ${JSON.stringify(entry.o)}\n`;
      } else if (entry.op === 'u') {
        const diff = entry.o.diff || entry.o;
        output += `  Update Diff: ${JSON.stringify(diff)}\n`;
        if (entry.o2) output += `  Target ID: ${entry.o2._id}\n`;
      } else if (entry.op === 'd') {
        output += `  Deleted ID: ${entry.o._id}\n`;
      }
      output += `\n`;
    }

    const outputPath = path.join(__dirname, "oplog-output.txt");
    fs.writeFileSync(outputPath, output);
    console.log(`Successfully wrote ${outputPath}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
