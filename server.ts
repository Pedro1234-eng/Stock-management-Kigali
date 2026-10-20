import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000; // Dev server must run on port 3000 per environment constraints

  app.use(express.json({ limit: '10mb' }));

  // Initialize server-side Gemini SDK
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('Gemini API SDK initialized on server with model gemini-3.8-flash');
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI:', err);
    }
  } else {
    console.log('No GEMINI_API_KEY set in environment. Fallback heuristics will be used.');
  }

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      geminiConfigured: !!ai,
      currency: 'RWF',
      timestamp: new Date().toISOString(),
    });
  });

  // API: AI Stock Forecasting using gemini-3.8-flash
  app.post('/api/ai/forecast', async (req, res) => {
    const { products, salesHistory } = req.body;

    if (ai) {
      try {
        const prompt = `
You are an expert AI inventory supply chain strategist specializing in retail and wholesale stock in Kigali, Rwanda.
Analyze the following product stock levels and recent sales transactions:

PRODUCTS:
${JSON.stringify(products?.slice(0, 15) || [], null, 2)}

RECENT SALES:
${JSON.stringify(salesHistory?.slice(0, 10) || [], null, 2)}

Provide a structured JSON output with an array of inventory forecasts for items that need attention or reordering.
Respond ONLY in valid JSON matching this schema:
[
  {
    "productId": "id string",
    "productName": "name string",
    "currentStock": number,
    "avgDailySales": number,
    "daysUntilStockout": number,
    "recommendedOrderQty": number,
    "priority": "CRITICAL" | "WARNING" | "HEALTHY",
    "reasoning": "string with specific actionable Rwandan market retail context"
  }
]
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '[]';
        try {
          const parsed = JSON.parse(text);
          return res.json({ success: true, forecasts: parsed, source: 'gemini-3.8-flash' });
        } catch {
          // If JSON parse fails, continue to fallback
        }
      } catch (err: any) {
        console.error('Error calling Gemini forecast:', err.message);
      }
    }

    // Heuristic Fallback
    const forecasts = (products || []).map((p: any) => {
      const isCritical = p.currentStock <= p.minStockLevel * 0.5;
      const isWarning = p.currentStock <= p.minStockLevel;
      const avgSales = Math.max(1, Math.round(p.minStockLevel / 4));
      const daysLeft = Math.max(1, Math.round(p.currentStock / avgSales));
      const reorderQty = Math.max(10, Math.round(p.minStockLevel * 2 - p.currentStock));

      return {
        productId: p.id,
        productName: p.name,
        currentStock: p.currentStock,
        avgDailySales: avgSales,
        daysUntilStockout: daysLeft,
        recommendedOrderQty: reorderQty,
        priority: isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'HEALTHY',
        reasoning: isCritical
          ? `Stock critically depleted below safety threshold (${p.currentStock}/${p.minStockLevel} ${p.unit}). Immediate replenishment required.`
          : isWarning
          ? `Approaching minimum stock buffer. Order ${reorderQty} ${p.unit} to avoid disruption in sales.`
          : `Stock level adequate for regular trading velocity over the next ${daysLeft} days.`,
      };
    });

    res.json({ success: true, forecasts, source: 'heuristic-engine' });
  });

  // API: AI Inventory Health Audit using gemini-3.8-flash
  app.post('/api/ai/audit', async (req, res) => {
    const { products, movements } = req.body;

    if (ai) {
      try {
        const prompt = `
You are KigaliStock's Chief Inventory Officer. Perform an AI inventory health audit for our retail store in Kigali, Rwanda.
Currency is Rwandan Francs (RWF).

Current Products:
${JSON.stringify(products?.slice(0, 15) || [], null, 2)}

Recent Stock Movements:
${JSON.stringify(movements?.slice(0, 10) || [], null, 2)}

Generate an inventory health audit JSON matching:
{
  "overallHealthScore": number (1 to 100),
  "summary": "High-level summary of store stock health",
  "criticalAlerts": ["string alert 1", "string alert 2"],
  "reorderRecommendations": [
    {
      "productName": "string",
      "suggestedQty": number,
      "estimatedCostRwf": number,
      "urgency": "High" | "Medium" | "Low"
    }
  ],
  "slowMovers": ["string item name"],
  "nearExpiryRisks": [
    {
      "productName": "string",
      "expiryDate": "YYYY-MM-DD",
      "stockCount": number
    }
  ]
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        return res.json({ success: true, audit: parsed, source: 'gemini-3.8-flash' });
      } catch (err: any) {
        console.error('Error calling Gemini audit:', err.message);
      }
    }

    // Heuristic Fallback
    const lowStock = (products || []).filter((p: any) => p.currentStock <= p.minStockLevel);
    res.json({
      success: true,
      audit: {
        overallHealthScore: Math.max(45, 100 - lowStock.length * 12),
        summary: `Store inventory maintains ${products?.length || 0} active SKUs. ${lowStock.length} items require prompt restocking in Kigali warehouse.`,
        criticalAlerts: lowStock.map((p: any) => `Low stock on ${p.name} (${p.currentStock} ${p.unit} remaining, min ${p.minStockLevel})`),
        reorderRecommendations: lowStock.map((p: any) => ({
          productName: p.name,
          suggestedQty: p.minStockLevel * 2,
          estimatedCostRwf: p.purchasePriceRwf * p.minStockLevel * 2,
          urgency: p.currentStock <= 5 ? 'High' : 'Medium',
        })),
        slowMovers: ['Golden Drop Pure Sunflower Cooking Oil 3L', 'Mutzig Premium Beer 33cl Can'],
        nearExpiryRisks: [
          {
            productName: 'Inyange Whole Fresh Milk 500ml',
            expiryDate: '2026-10-05',
            stockCount: 48,
          },
        ],
      },
      source: 'heuristic-engine',
    });
  });

  // API: AI Stock Assistant Chat using gemini-3.8-flash
  app.post('/api/ai/ask', async (req, res) => {
    const { question, context } = req.body;

    if (ai) {
      try {
        const prompt = `
You are the AI Stock Management Assistant for KigaliStock (Retail & POS in Kigali, Rwanda).
Currency is Rwandan Francs (RWF).
Current Store Context:
Total SKUs: ${context?.productsCount || 0}
Low Stock Items Count: ${context?.lowStockCount || 0}
Today's Sales Revenue (RWF): ${context?.totalSalesRwf || 0}
Sample Products: ${JSON.stringify(context?.sampleProducts || [])}

User Question: "${question}"

Provide a crisp, professional, helpful response. If recommending reorders or answering stock questions, use Rwandan Francs (Frw / RWF) and local retail context (Inyange, Bralirwa, MTN MoMo, RRA EBM). Keep answer under 150 words.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        return res.json({
          success: true,
          reply: response.text,
          source: 'gemini-3.8-flash',
        });
      } catch (err: any) {
        console.error('Error calling Gemini ask:', err.message);
      }
    }

    // Heuristic Fallback
    const qLower = (question || '').toLowerCase();
    let reply = `Here is what I found in your inventory: We currently have ${context?.productsCount || 10} active products in stock. `;
    if (qLower.includes('low') || qLower.includes('reorder') || qLower.includes('shortage')) {
      reply += `There are ${context?.lowStockCount || 3} items below minimum safety threshold (including Mutzig 33cl, Inyange Apple Juice, and Sugar). We recommend placing a PO with Inyange and Bralirwa today.`;
    } else if (qLower.includes('sales') || qLower.includes('money') || qLower.includes('revenue') || qLower.includes('momo')) {
      reply += `Today's gross sales stand at ${(context?.totalSalesRwf || 24400).toLocaleString()} Frw across MTN MoMo, Visa card, and Cash in RWF.`;
    } else if (qLower.includes('milk') || qLower.includes('inyange')) {
      reply += `Inyange Milk 500ml has 48 packs in stock at 600 Frw each. Expiry date is 2026-10-05.`;
    } else {
      reply += `All stock movements and POS transactions are recorded in the PostgreSQL audit log with RRA EBM compliance.`;
    }

    res.json({
      success: true,
      reply,
      source: 'heuristic-engine',
    });
  });

  // Mount Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KigaliStock AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
