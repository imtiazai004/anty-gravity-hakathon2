import { SupplyChainAgent } from './SupplyChainAgent.js';
import { HealthcareAgent } from './HealthcareAgent.js';
import { NewsScraper } from './scraper.js';
import { getRandomGeminiKey } from './keyManager.js';

import { GoogleGenerativeAI } from '@google/generative-ai';

export class AgentOrchestrator {
  constructor() {
    this.agents = {
      supplyChain: new SupplyChainAgent(),
      healthcare: new HealthcareAgent()
    };
  }

  async determineRouteAndProcess(input) {
    console.log(`[AgentOrchestrator] True LLM reasoning for input: "${input}"`);

    const apiKey = getRandomGeminiKey();
    let targetView = 'news';
    let spokenBriefing = "I have processed your command, but the target subsystem is ambiguous.";
    let agentResult = null;

    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: `You are the master routing orchestrator. 
Analyze the user's input and determine which agent subsystem should handle it.
Valid targets: "supplyChain" (for cargo, shipping, trucks, ports), "healthcare" (for nurses, ICU, clinics), or "general" (for anything else).
Respond with a strict JSON object: { "target": "supplyChain|healthcare|general", "cleanCommand": "the user's core request without wake words" }`
        });

        const result = await model.generateContent(input);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const decision = JSON.parse(jsonMatch[0]);
          console.log(`[AgentOrchestrator] LLM Decision:`, decision);
          
          if (decision.target === 'supplyChain') {
            targetView = 'supply';
            agentResult = await this.runScenario('supplyChain', decision.cleanCommand || input);
            spokenBriefing = "Supply Chain mitigation protocols executed successfully, Sir. Rerouting ledgers and logistics metrics have been updated on your dashboard.";
          } else if (decision.target === 'healthcare') {
            targetView = 'healthcare';
            agentResult = await this.runScenario('healthcare', decision.cleanCommand || input);
            spokenBriefing = "Healthcare staffing protocols executed, Sir. Clinic personnel reallocated to stabilize ICU safety limits. The health dashboard is updated.";
          } else {
            targetView = 'news';
            spokenBriefing = "I have recorded your command, Sir, but no specific supply chain or healthcare action was required.";
          }
        }
      } catch (err) {
        console.error("[AgentOrchestrator] LLM routing failed:", err);
      }
    } else {
      // Fallback for missing API Key (Simulated mode)
      const lower = input.toLowerCase();
      if (lower.includes('supply') || lower.includes('route') || lower.includes('port')) {
        targetView = 'supply';
        agentResult = await this.runScenario('supplyChain', input);
        spokenBriefing = "(Simulated) Supply chain mitigation protocols executed successfully.";
      } else if (lower.includes('nurse') || lower.includes('icu') || lower.includes('health')) {
        targetView = 'healthcare';
        agentResult = await this.runScenario('healthcare', input);
        spokenBriefing = "(Simulated) Healthcare staffing protocols executed successfully.";
      }
    }

    return { targetView, spokenBriefing, agentResult };
  }

  async runScenario(type, input) {
    if (!this.agents[type]) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    let finalInput = input;
    
    // Detect URLs in the input
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urlMatch = input.match(urlRegex);
    
    if (urlMatch && urlMatch.length > 0) {
      const url = urlMatch[0];
      console.log(`[AgentOrchestrator] URL detected: "${url}". Scrape initiated...`);
      
      const scrapedContent = await NewsScraper.scrapeArticleContent(url);
      
      if (scrapedContent && !scrapedContent.startsWith("Failed")) {
        console.log(`[AgentOrchestrator] Scrape complete. Injected ${scrapedContent.length} chars of article content.`);
        finalInput = `[Scraped Article Content from ${url}]:\n\n${scrapedContent}\n\n[Original Instruction]: ${input}`;
      } else {
        console.warn(`[AgentOrchestrator] Web scrape failed or blocked, processing with original link.`);
      }
    }
    
    // The orchestrator routes the final processed input to the appropriate specialized agent
    return await this.agents[type].process(finalInput);
  }
}
