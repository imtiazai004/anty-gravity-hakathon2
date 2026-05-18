import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { inputs } from './inputs.js';
import { db } from './state.js';
import { NewsScraper } from './scraper.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const orchestrator = new AgentOrchestrator();

// Get active API configuration status
app.get('/api/status', (req, res) => {
  res.json({
    isLive: !!process.env.GEMINI_API_KEY,
    mode: process.env.GEMINI_API_KEY ? "Live Agentic (Gemini 1.5 Flash)" : "Simulated Agentic"
  });
});

// Get the entire simulated database state
app.get('/api/state', (req, res) => {
  res.json({
    shipments: db.getShipments(),
    inventory: db.getInventory(),
    staffing: db.getStaffingLevels(),
    logs: db.getLogs()
  });
});

// Reset database state
app.post('/api/state/reset', (req, res) => {
  const result = db.reset();
  res.json(result);
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

  const isLive = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';

  if (isLive) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: "You are ReportAnalyzer, the loyal and sophisticated cybernetic AI assistant from Iron Man. You address the user as 'Sir'. You speak in a highly polite, helpful, and professional British tone, interleaved with technical and cybernetic intelligence jargon. If the user asks you to analyze news, present a high-tech briefing of recent events with supply-chain or healthcare themes. Keep your responses concise (2-4 sentences max) so they are easy to speak out loud via SpeechSynthesis."
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return res.json({ reply: responseText });
    } catch (e) {
      console.error("Gemini Conversational Chat Error:", e);
    }
  }

  // Smart simulated fallback responses for conversational flow if no key
  const query = prompt.toLowerCase();
  let reply = "I am standing by, Sir. Ratios and supply chain logistics channels are executing under normal parameters.";

  if (query.includes("news") || query.includes("google") || query.includes("today")) {
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

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Agentic Backend API running on http://localhost:${port}`);
  });
}

export default app;

// --- SINGLE DEPLOYMENT: SERVE FRONTEND STATIC BUILD ---
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from frontend build folder
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Serve index.html for any other routing path (SPA support)
app.get('*', (req, res) => {
  // If the request is for API routes but matches nothing, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
