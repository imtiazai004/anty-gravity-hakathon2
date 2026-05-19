import { SupplyChainAgent } from './SupplyChainAgent.js';
import { HealthcareAgent } from './HealthcareAgent.js';
import { NewsScraper } from './scraper.js';

export class AgentOrchestrator {
  constructor() {
    this.agents = {
      supplyChain: new SupplyChainAgent(),
      healthcare: new HealthcareAgent()
    };
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
