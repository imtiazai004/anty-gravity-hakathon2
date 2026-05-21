import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { inputs } from './inputs.js';
import { db } from './state.js';
import { NewsScraper } from './scraper.js';
import { getRandomGeminiKey } from './keyManager.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const orchestrator = new AgentOrchestrator();

// Get active API configuration status
app.get('/api/status', (req, res) => {
  const apiKey = getRandomGeminiKey();
  res.json({
    isLive: !!apiKey,
    mode: apiKey ? "Live Agentic (Gemini 1.5 Flash)" : "Simulated Agentic"
  });
});

// Get the entire simulated database state
app.get('/api/state', (req, res) => {
  res.json({
    shipments: db.getShipments(),
    inventory: db.getInventory(),
    logs: db.getLogs(),
    finance: db.getFinanceData(),
    fuelSurchargeRate: db.getFuelSurchargeRate(),
    draftedNotification: db.getDraftedNotification(),
    shippingCostMultiplier: db.getShippingCostMultiplier()
  });
});

// Reset database state
app.post('/api/state/reset', (req, res) => {
  const result = db.reset();
  res.json(result);
});

// TRUE LLM Orchestration endpoint
app.post('/api/orchestrate', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Missing command" });

  try {
    const result = await orchestrator.determineRouteAndProcess(command);
    res.json(result);
  } catch (err) {
    console.error("[Orchestrate] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get the unstructured input for a scenario
app.get('/api/inputs/:scenario', (req, res) => {
  const { scenario } = req.params;
  const input = inputs[scenario];
  
  if (!input) {
    return res.status(404).json({ error: 'Scenario not found' });
  }
  
  res.json(input);
});

// Run a specific scenario through the agent pipeline
app.post('/api/scenarios/:scenario/run', async (req, res) => {
  const { scenario } = req.params;
  
  // Accept the custom text/voice input sent from the frontend, or fall back to the default static report
  const customInput = req.body && req.body.body;
  const defaultInput = inputs[scenario] ? inputs[scenario].body : '';
  const finalInput = customInput || defaultInput;

  if (!finalInput && !inputs[scenario]) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  try {
    const result = await orchestrator.runScenario(scenario, finalInput);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated ReportAnalyzer Conversational Voice Chat Endpoint
app.post('/api/reportAnalyzer/chat', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urlMatch = prompt.match(urlRegex);
  let finalPrompt = prompt;
  let scraped = false;

  if (urlMatch && urlMatch.length > 0) {
    const url = urlMatch[0];
    try {
      const scrapedText = await NewsScraper.scrapeArticleContent(url);
      if (scrapedText && !scrapedText.startsWith("Failed")) {
        finalPrompt = `The user has sent a link to analyze: ${url}.\nScraped content from link:\n${scrapedText}\n\nUser request: ${prompt}`;
        scraped = true;
      }
    } catch (err) {
      console.error("Failed to scrape article in chat:", err);
    }
  }

  const apiKey = getRandomGeminiKey();
  const isLive = !!apiKey;

  if (isLive) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: "You are ReportAnalyzer, the loyal and sophisticated cybernetic AI assistant from Iron Man. You address the user as 'Sir'. You speak in a highly polite, helpful, and professional British tone, interleaved with technical and cybernetic intelligence jargon. If the user asks you to analyze news or a link, present a high-tech briefing of the scraped article text. Keep your responses concise (2-4 sentences max) so they are easy to speak out loud via SpeechSynthesis."
      });
      const result = await model.generateContent(finalPrompt);
      const responseText = result.response.text();
      return res.json({ reply: responseText });
    } catch (e) {
      console.error("Gemini Conversational Chat Error:", e);
    }
  }

  // Smart simulated fallback responses for conversational flow if no key
  const query = prompt.toLowerCase();
  let reply = "I am standing by, Sir. Ratios and supply chain logistics channels are executing under normal parameters.";

  if (scraped) {
    reply = `I have successfully retrieved and analyzed the article contents from the link, Sir. Telemetry indicates critical operations alerts matching supply chain indices. Corrective rerouting or medical staffing reallocations are executing immediately, Sir.`;
  } else if (query.includes("news") || query.includes("google") || query.includes("today")) {
    reply = "I have scanned global logistics and healthcare feeds across Google registries, Sir. Inbound container shipments at the Port of LA are facing acute gridlocks due to sudden union strike actions, and ICU safety ratios are flagged under high alerts. Rerouting protocols are standing by for your authorization.";
  } else if (query.includes("how are you") || query.includes("status")) {
    reply = "Indeed, Sir. My core processors are performing under optimal thermal limits. All mainframe diagnostics checks are green. Shall I execute a full system operational sweep?";
  } else if (query.includes("hello") || query.includes("hi") || query.includes("reportAnalyzer")) {
    reply = "Good day, Sir. ReportAnalyzer is online, fully loaded, and scanning local telemetry fields. How may I assist you in your command center today?";
  } else if (query.includes("reset") || query.includes("clear")) {
    reply = "Understood, Sir. Initiating standard diagnostic database reset protocol. All parameters restored to factory baselines.";
  } else {
    reply = `Certainly, Sir. I have processed your instruction: "${prompt}". My neural synapses are analyzing the coordinates. Telemetry sweeps remain optimal under my watch.`;
  }

  res.json({ reply });
});

// ─── DEEP REASONING: Supply Chain Impact Analysis ──────────────────────────
// Accepts any unstructured text or a URL, scrapes if needed, then runs a
// structured multi-step Gemini reasoning pass and returns a rich JSON report.
app.post('/api/deepReason', async (req, res) => {
  const { prompt, url } = req.body;
  if (!prompt && !url) return res.status(400).json({ error: 'Prompt or URL required' });

  let content = prompt || '';

  // Auto-scrape the URL when provided
  if (url) {
    try {
      const scraped = await NewsScraper.scrapeArticleContent(url);
      if (scraped && !scraped.startsWith('Failed')) {
        content = `Article URL: ${url}\n\nFull scraped content:\n${scraped}`;
      } else {
        content = `${prompt || ''}\nReference URL: ${url}`;
      }
    } catch (e) {
      content = `${prompt || ''} (URL: ${url})`;
    }
  }

  const apiKey = getRandomGeminiKey();

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: `You are JARVIS — an elite AI supply chain intelligence officer.
Your task: perform deep multi-dimensional reasoning on any given content (news articles, market alerts, emails, reports)
and produce a comprehensive supply chain impact assessment.

CRITICAL RULE: Return ONLY valid JSON. No markdown, no code blocks, no text outside the JSON object.

Required JSON schema:
{
  "executiveSummary": "2-3 sentences: what is this content about and why it matters",
  "supplyChainImpact": {
    "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "headline": "One punchy impact headline (max 12 words)",
    "description": "2-3 sentences on the specific supply chain consequences"
  },
  "risks": [
    {
      "title": "Short risk name (3-6 words)",
      "description": "1-2 sentences on this specific risk",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "affectedArea": "ports" | "inventory" | "cost" | "transportation" | "suppliers" | "demand" | "operations"
    }
  ],
  "actionPlan": [
    {
      "step": 1,
      "action": "Specific action title (5-8 words)",
      "detail": "1-2 sentences: why this action, how to execute it",
      "priority": "IMMEDIATE" | "SHORT_TERM" | "LONG_TERM",
      "timeline": "e.g. 0-24 hours"
    }
  ],
  "spokenBriefing": "2-3 sentences max. JARVIS voice. Address user as Sir. TTS-ready (no bullet points)."
}

Produce 3-5 risks and 4-6 action plan steps. Be SPECIFIC to the content — not generic boilerplate.`
      });

      const result = await model.generateContent(
        `Analyze the following content for supply chain impact. Return ONLY the JSON object, nothing else.\n\n${content.substring(0, 8000)}`
      );

      let text = result.response.text().trim();
      // Strip markdown code fences Gemini sometimes adds
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      try {
        const parsed = JSON.parse(text);
        return res.json({ success: true, isLive: true, analysis: parsed });
      } catch {
        // JSON parse failed — wrap raw text in graceful structure
        return res.json({
          success: true, isLive: true,
          analysis: {
            executiveSummary: text.substring(0, 400),
            supplyChainImpact: { severity: 'HIGH', headline: 'Analysis complete — review report', description: text.substring(0, 300) },
            risks: [], actionPlan: [],
            spokenBriefing: 'Deep analysis complete, Sir. The intelligence report is ready for your review.'
          }
        });
      }
    } catch (e) {
      console.error('[deepReason] Gemini error:', e.message);
      // Fall through to simulated response
    }
  }

  // ── Simulated fallback (no API key) ──
  res.json({
    success: true, isLive: false,
    analysis: {
      executiveSummary: 'Analysis of the provided content reveals significant supply chain implications that warrant immediate executive attention. Multiple operational nodes face disruption risk across transportation, inventory, and cost vectors. Contingency protocols should be activated within the next 24 hours.',
      supplyChainImpact: {
        severity: 'HIGH',
        headline: 'Multi-Node Supply Chain Disruption Detected',
        description: 'The analyzed content indicates disruption risk across port operations, transportation corridors, and inventory buffer zones. Cost escalation across Tier-1 and Tier-2 supplier networks is probable within 48-72 hours. Immediate rerouting and supplier diversification are recommended.'
      },
      risks: [
        { title: 'Port Throughput Collapse', description: 'Vessel dwell times at major hubs projected to increase 40-60%, delaying inbound shipments by 3-7 days.', severity: 'HIGH', affectedArea: 'ports' },
        { title: 'Safety Stock Depletion', description: 'Demand surge combined with supply constraints may deplete critical SKU safety buffers within 10-14 days.', severity: 'HIGH', affectedArea: 'inventory' },
        { title: 'Freight Rate Spike', description: 'Spot market freight rates expected to rise 15-30% across affected trade lanes within 72 hours.', severity: 'MEDIUM', affectedArea: 'cost' },
        { title: 'Supplier Cascade Failure', description: 'Tier-2 and Tier-3 supplier delays may cascade into Tier-1 production shortfalls within 2-3 weeks.', severity: 'MEDIUM', affectedArea: 'suppliers' }
      ],
      actionPlan: [
        { step: 1, action: 'Activate Emergency Shipment Rerouting', detail: 'Redirect all active shipments in affected corridors through alternate routes immediately to minimize delay exposure.', priority: 'IMMEDIATE', timeline: '0-24 hours' },
        { step: 2, action: 'Secure Alternative Supplier Capacity', detail: 'Contact pre-approved backup suppliers and lock in available capacity before market rates peak.', priority: 'IMMEDIATE', timeline: '24-48 hours' },
        { step: 3, action: 'Build Safety Stock for Critical SKUs', detail: 'Increase safety stock levels by 20-25% for high-velocity items to buffer against continued disruption.', priority: 'SHORT_TERM', timeline: '3-7 days' },
        { step: 4, action: 'Negotiate Freight Rate Hedges', detail: 'Lock in freight rates with key logistics partners before full market repricing takes effect across corridors.', priority: 'SHORT_TERM', timeline: '1-2 weeks' },
        { step: 5, action: 'Distribute Executive Risk Briefing', detail: 'Prepare and share a supply chain risk impact report with executive stakeholders including updated ETA impacts.', priority: 'SHORT_TERM', timeline: '48 hours' },
        { step: 6, action: 'Implement Continuous Monitoring Protocol', detail: 'Set up daily supply chain risk reviews with automated KPI threshold alerts across all active corridors.', priority: 'LONG_TERM', timeline: 'Ongoing' }
      ],
      spokenBriefing: 'Sir, my deep intelligence analysis has identified four critical risk vectors across your supply chain operations. I have prepared a six-step prioritized action plan. Immediate rerouting and alternative supplier activation are recommended within the next 24 hours.'
    }
  });
});

// Expose Live Internet RSS News Scraper Route
app.get('/api/news/scrape', async (req, res) => {
  const { query } = req.query;
  const searchTerm = query || "logistics strike";
  try {
    const articles = await NewsScraper.scrapeNews(searchTerm);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SINGLE DEPLOYMENT: SERVE FRONTEND STATIC BUILD ---
// Must be registered BEFORE export default so Vercel's serverless handler picks them up.
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from frontend build folder
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Serve index.html for any non-API path (SPA support)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start local dev server (skipped on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Agentic Backend API running on http://localhost:${port}`);
  });
}

export default app;
