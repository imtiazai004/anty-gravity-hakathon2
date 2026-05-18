import { SupplyChainAgent } from './SupplyChainAgent.js';
import { HealthcareAgent } from './HealthcareAgent.js';

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
    
    // The orchestrator routes the input to the appropriate specialized agent
    return await this.agents[type].process(input);
  }
}
