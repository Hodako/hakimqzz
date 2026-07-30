import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Groq High-Speed Free Models Fallback Array
const GROQ_MODELS = [
  DEFAULT_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "deepseek-r1-distill-llama-70b",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  try {
    // 1. Verify user session
    const session = await requireSession();
    const db = await getDb();
    const ownerId = session.ownerId;

    // 2. Fetch business context data
    const [products, sales, purchases, expenses, parties] = await Promise.all([
      db.collection("products").find({ owner_id: ownerId }).toArray(),
      db.collection("sales").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(200).toArray(),
      db.collection("purchases").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection("expenses").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection("parties").find({ owner_id: ownerId }).toArray(),
    ]);

    // 3. Compute key business metrics
    const totalSales = sales.reduce((s, x) => s + (x.sell_price * x.qty), 0);
    const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const totalPurchases = purchases.reduce((s, x) => s + (x.total || 0), 0);
    const cashSales = sales.filter((s) => s.type === "cash").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const creditSales = sales.filter((s) => s.type === "credit").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const onlineSales = sales.filter((s) => s.type === "online").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const totalDue = sales.filter((s) => s.type === "credit").reduce((a, x) => a + (x.due_amount || 0), 0);

    const lowStockProducts = products
      .filter((p) => !p.archived && p.stock <= (p.min_stock || 5))
      .map((p) => ({ name: p.name, stock: p.stock, min_stock: p.min_stock || 5 }))
      .slice(0, 20);

    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const s of sales) {
      const key = s.product_name || "Unknown";
      if (!productSalesMap[key]) productSalesMap[key] = { name: key, qty: 0, revenue: 0 };
      productSalesMap[key].qty += s.qty || 0;
      productSalesMap[key].revenue += (s.sell_price * s.qty) || 0;
    }
    const bestSelling = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentSales = sales.filter((s) => s.created_at >= sevenDaysAgo);
    const recentSalesTotal = recentSales.reduce((a, x) => a + (x.sell_price * x.qty), 0);

    // 4. Build system prompt with real business data
    const systemPrompt = `You are an expert AI business advisor for a retail fashion management platform called HakimQzz (DreamFashion). You have access to real-time shop performance metrics.

## REAL BUSINESS METRICS (Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})
- Total Sales Revenue: ৳${totalSales.toLocaleString()}
- Total Profit: ৳${totalProfit.toLocaleString()}
- Total Expenses: ৳${totalExpenses.toLocaleString()}
- Inventory Purchases: ৳${totalPurchases.toLocaleString()}
- Net Income: ৳${(totalProfit - totalExpenses).toLocaleString()}
- Cash Sales: ৳${cashSales.toLocaleString()}
- Credit Dues Outstanding: ৳${totalDue.toLocaleString()}
- Online Sales: ৳${onlineSales.toLocaleString()}
- Sales Last 7 Days: ৳${recentSalesTotal.toLocaleString()}
- Total Active Catalog Products: ${products.filter((p) => !p.archived).length}
- Low Stock Items: ${lowStockProducts.length}
${lowStockProducts.map((p) => `  • ${p.name}: ${p.stock} left (min: ${p.min_stock})`).join("\n") || "  None"}

### Top Selling Items:
${bestSelling.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} sold, ৳${p.revenue.toLocaleString()}`).join("\n") || "No sales recorded yet"}

## RESPONSE INSTRUCTIONS:
- Be concise, direct, and actionable (MAXIMUM 150-200 words).
- Provide structured headings and clear bullet points.
- If user writes in Bangla, answer ENTIRELY in clear Bengali.
- Use ৳ symbol for all monetary figures.`;

    const body = await req.json();
    const { messages } = body as { messages: { role: string; content: string }[] };

    let reply = "";
    let lastError = "";

    // 5. Try Groq free models with automatic failover
    const modelsToTry = Array.from(new Set(GROQ_MODELS));
    for (const modelCandidate of modelsToTry) {
      try {
        const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-10),
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidateReply = data.choices?.[0]?.message?.content;
          if (candidateReply && candidateReply.trim()) {
            reply = candidateReply;
            break;
          }
        } else {
          lastError = `Model ${modelCandidate} failed with HTTP ${response.status}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: `Groq AI service error: ${lastError || "All free models failed"}` },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    return NextResponse.json(
      { reply },
      {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  } catch (err: any) {
    console.error("[ai-chat]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
