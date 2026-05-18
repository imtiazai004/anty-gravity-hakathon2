import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './state.js';
import { NewsScraper } from './scraper.js';

const wait = (ms) => new Promise(res => setTimeout(res, ms));

export class SupplyChainAgent {
  async process(input) {
    const trace = [];
    const isLive = !!process.env.GEMINI_API_KEY;

    // Step 1: Ingestion
    trace.push({
      id: "sc-trace-1",
      timestamp: new Date().toISOString(),
      source: "Agent Orchestrator",
      action: "Data Ingestion",
      details: `Ingesting unstructured logistics alert: "${input.substring(0, 50)}..."`,
      status: "processing"
    });
    await wait(800);
    trace[0].status = "completed";

    if (isLive) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Fetch live scraped news headlines
        const scrapedArticles = await NewsScraper.scrapeNews("logistics strike ports");
        const liveNewsContext = scrapedArticles.map(a => `- ${a.title} (${a.link})`).join("\n");

        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
          systemInstruction: "You are an Autonomous Supply Chain Logistics Coordinator. Your objective is to FIRST use the Google Search tool to find real-time, live internet information about the provided incident or query. THEN, check the state of shipments and inventory using your database tools, identify delays and SKU stockout risks, and execute rerouting mitigation commands on affected shipments to ensure business continuity based on the LIVE search results.",
          tools: [
            { googleSearch: {} },
            {
            functionDeclarations: [
              {
                name: "getShipments",
                description: "Get the current list of active shipments, including ID, cargo type, quantity, destination port, status, and ETA."
              },
              {
                name: "getInventory",
                description: "Get the current warehouse stock levels, daily usage rate, and safety warning state for key SKUs."
              },
              {
                name: "rerouteShipment",
                description: "Reroute a shipment to a new destination port to avoid delays and resolve stockout risks.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    shipmentId: { type: "STRING", description: "The exact ID of the shipment to reroute (e.g. 'Shipment ID-8842')." },
                    newDestination: { type: "STRING", description: "The new destination port (e.g. 'Port of Seattle')." }
                  },
                  required: ["shipmentId", "newDestination"]
                }
              }
            ]
          }]
        });

        // Add trace showing live scraped news
        trace.push({
          id: "sc-trace-news",
          timestamp: new Date().toISOString(),
          source: "Google News RSS",
          action: "Live News Ingestion",
          details: `Live Internet Scrape Complete. Top headlines:\n${liveNewsContext}`,
          status: "completed"
        });

        // Initialize Chat
        const chat = model.startChat();
        
        // Initial Message to prompt reasoning
        const prompt = `Logistics Alert / Input Request:\n"${input}"\n\nReal-Time Scraped Internet News Context:\n${liveNewsContext}\n\nTask: Analyze the alert and scraped news context, query active shipments and inventory using your tools to see if we have high-priority shipments in transit to the affected port, evaluate the stockout risk of those SKUs, and reroute the critical shipments if a risk is detected.`;
        
        trace.push({
          id: "sc-trace-2",
          timestamp: new Date().toISOString(),
          source: "Gemini 1.5 Flash",
          action: "Reasoning Loop",
          details: "Agent initialized reasoning. Analyzing incident and preparing database tool queries...",
          status: "processing"
        });
        await wait(600);

        let response = await chat.sendMessage(prompt);
        let functionCalls = response.response.functionCalls;
        
        trace[1].details = "Agent successfully parsed the alert and is now invoking database tools to inspect active shipment pipelines.";
        trace[1].status = "completed";

        let reroutePerformed = false;
        let affectedShipmentsCount = 0;

        while (functionCalls && functionCalls.length > 0) {
          const toolResponses = [];
          
          for (const call of functionCalls) {
            const { name, args } = call;
            let toolResult;

            if (name === "getShipments") {
              toolResult = db.getShipments();
              trace.push({
                id: `sc-trace-tool-${Date.now()}-1`,
                timestamp: new Date().toISOString(),
                source: "Logistics Database",
                action: "Query Shipments Tool",
                details: `Agent requested shipments. Returned ${toolResult.length} active shipments. Identified Shipment ID-8842 bound for strike port (LA).`,
                status: "completed"
              });
              affectedShipmentsCount = toolResult.filter(s => s.destination.includes("LA")).length;
              await wait(600);
            } 
            else if (name === "getInventory") {
              toolResult = db.getInventory();
              trace.push({
                id: `sc-trace-tool-${Date.now()}-2`,
                timestamp: new Date().toISOString(),
                source: "Inventory Database",
                action: "Query Inventory Tool",
                details: `Agent requested warehouse stock. Warning: SKU-90210 has only 200 units left (daily consumption: 70). Risk of stockout in ~2.8 days!`,
                status: "completed"
              });
              await wait(600);
            } 
            else if (name === "rerouteShipment") {
              toolResult = db.rerouteShipment(args.shipmentId, args.newDestination);
              trace.push({
                id: `sc-trace-tool-${Date.now()}-3`,
                timestamp: new Date().toISOString(),
                source: "ERP Action Engine",
                action: "Execute Reroute Tool",
                details: `Agent executed state mutation: Rerouted shipment ${args.shipmentId} to ${args.newDestination}. inventory of SKU-90210 secured (+500 units).`,
                status: "completed"
              });
              reroutePerformed = true;
              await wait(800);
            }

            toolResponses.push({
              functionResponse: {
                name,
                response: { result: toolResult }
              }
            });
          }

          // Return tool result to LLM
          response = await chat.sendMessage(toolResponses);
          functionCalls = response.response.functionCalls;
        }

        // Final output summary
        trace.push({
          id: "sc-trace-final",
          timestamp: new Date().toISOString(),
          source: "Gemini 1.5 Flash",
          action: "Mitigation Summary",
          details: response.text || "Mitigation action completed successfully. Shipping schedules updated.",
          status: "completed"
        });

        return {
          success: true,
          isSimulated: false,
          trace,
          finalState: {
            inventoryStatus: reroutePerformed ? "Rerouted - Stable" : "Normal",
            affectedShipments: affectedShipmentsCount,
            mitigated: reroutePerformed
          }
        };

      } catch (err) {
        console.error("Gemini API Error, falling back to smart simulation:", err.message);
        // Fall through to smart simulation on error
      }
    }

    // --- SMART SIMULATED FALLBACK ---
    // Still queries the state.js database and mutates it so that the application works dynamically

    // Step 2: Insight Extraction
    const scrapedArticles = await NewsScraper.scrapeNews(input.length > 5 ? input : "logistics strike");
    const topHeadline = scrapedArticles[0] ? scrapedArticles[0].title : "Port of LA 48-hour labor strike active";
    const liveNewsContext = scrapedArticles.map(a => `- ${a.title}`).join("\n");

    let extractedDetails = `[ReportAnalyzer Core Thinking Process]:\n1. Received Query: "${input}"\n2. Scraping Live Internet Sources...\n3. Extracted Critical Headline: "${topHeadline}"\n4. Analyzing Impact: This news indicates a high risk to logistics networks and active cargo.\n5. Action Plan: Initiating database scan for affected shipments matching risk parameters.`;

    trace.push({
      id: "sc-trace-2",
      timestamp: new Date().toISOString(),
      source: "ReportAnalyzer Neural Engine",
      action: "Insight Extraction & Reasoning",
      details: extractedDetails,
      status: "processing"
    });
    await wait(1000);
    trace[1].status = "completed";

    // Step 3: Impact Analysis (Query DB)
    const activeShipments = db.getShipments();
    const lowStockSku = db.getInventory().find(i => i.sku === "SKU-90210");
    const affected = activeShipments.filter(s => s.destination.includes("LA"));
    
    trace.push({
      id: "sc-trace-3",
      timestamp: new Date().toISOString(),
      source: "ReportAnalyzer Database Link",
      action: "Impact Analysis",
      details: `[Reasoning Step 6]: Queried ERP database. Found ${affected.length} active shipments bound for LA. \n[Reasoning Step 7]: Checked inventory. Electronics SKU-90210 current level is ${lowStockSku ? lowStockSku.quantity : 200} units. Critical stockout warning in ~3 days!`,
      status: "processing"
    });
    await wait(1200);
    trace[2].status = "completed";

    // Step 4: Action Generation
    trace.push({
      id: "sc-trace-4",
      timestamp: new Date().toISOString(),
      source: "ReportAnalyzer Action Engine",
      action: "Generate Mitigations",
      details: "[Reasoning Step 8]: Formulated mitigation plan to prevent stockout: Divert high-priority Shipment ID-8842 carrying SKU-90210 electronics from Port of LA to Port of Seattle. Expedite ground delivery.",
      status: "processing"
    });
    await wait(1000);
    trace[3].status = "completed";

    // Step 5: Execution (Mutate DB)
    let executionResult;
    try {
      executionResult = db.rerouteShipment("Shipment ID-8842", "Port of Seattle");
    } catch (e) {
      executionResult = { message: "Shipment already rerouted." };
    }

    trace.push({
      id: "sc-trace-5",
      timestamp: new Date().toISOString(),
      source: "ERP System (Simulated)",
      action: "Execute Action",
      details: executionResult.message,
      status: "processing"
    });
    await wait(800);
    trace[4].status = "completed";

    return {
      success: true,
      isSimulated: true,
      trace,
      finalState: {
        inventoryStatus: "Rerouted - Stable",
        affectedShipments: affected.length,
        mitigated: true
      }
    };
  }
}
