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
    console.log("User details:", JSON.stringify({ _id: user._id, email: user.email, business_id: user.business_id }, null, 2));

    if (user.business_id) {
      const biz = await db.collection("businesses").findOne({ _id: user.business_id });
      console.log("Business config:");
      console.log("  Spreadsheet ID:", biz?.google_sheets_spreadsheet_id);
      console.log("  Has Credentials JSON:", !!biz?.google_sheets_credentials_json);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
