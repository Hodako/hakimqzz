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

    const cashboxEntries = await db.collection("cashbox_entries").find({ owner_id: ownerId }).toArray();
    console.log(`Checking ${cashboxEntries.length} cashbox entries for orphans...`);

    const collections = ["sales", "expenses", "party_payable_settlements", "owner_withdrawals", "somiti_entries", "payments"];

    let orphanCount = 0;
    let orphanTotalAmount = 0;

    for (const entry of cashboxEntries) {
      if (!entry.ref_id) {
        console.log(`No RefID: ${entry.created_at} | Kind: ${entry.kind} | Amount: ${entry.amount} | Note: "${entry.note}"`);
        continue;
      }

      let found = false;
      for (const colName of collections) {
        const doc = await db.collection(colName).findOne({ _id: entry.ref_id });
        if (doc) {
          found = true;
          break;
        }
      }

      if (!found) {
        orphanCount++;
        const amount = Number(entry.amount);
        const delta = (entry.kind === 'deposit' || entry.kind === 'sale') ? amount : -amount;
        orphanTotalAmount += delta;
        console.log(`ORPHAN! Created: ${entry.created_at} | Kind: ${entry.kind} | Amount: ${entry.amount} | Note: "${entry.note}" | RefID: ${entry.ref_id}`);
      }
    }

    console.log(`\nOrphan Summary: Count=${orphanCount}, Net Amount Delta=${orphanTotalAmount} Taka`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
