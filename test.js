import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read GROQ_API_KEY from .env or .env.local
let apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/GROQ_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim();
  }
}

if (!apiKey) {
  apiKey = "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";
}

async function runTest() {
  console.log("==========================================");
  console.log("   Groq AI API Test Script (test.js)      ");
  console.log("==========================================");
  console.log(`API Key: ${apiKey.substring(0, 12)}...`);
  console.log("Connecting to Groq API endpoint...");

  const startTime = Date.now();
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a fashion retail business advisor for HakimQzz POS." },
          { role: "user", content: "Say hello and give a 2-line quick business tip." },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`\nHTTP Status: ${response.status} (${elapsed}ms)`);

    if (response.ok) {
      const data = await response.json();
      console.log("\n>>> Groq AI Output <<<\n");
      console.log(data.choices[0]?.message?.content);
      console.log("\n==========================================");
      console.log(`Model: ${data.model}`);
      console.log(`Total Tokens: ${data.usage?.total_tokens}`);
      console.log("Result: SUCCESS (Groq AI Working Perfectly!)");
      console.log("==========================================");
    } else {
      const err = await response.text();
      console.error("\nError response:", err);
    }
  } catch (err) {
    console.error("\nExecution error:", err.message);
  }
}

runTest();
