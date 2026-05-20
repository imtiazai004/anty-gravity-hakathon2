// Simulated in-memory database to represent "live systems"
// Allows our agent to query databases and take state-mutating actions
//
// PERSISTENCE: On Vercel serverless, each warm instance reuses this module.
// We back the state to /tmp/reportanalyzer-state.json so mutations survive
// within the same instance lifecycle (warm restarts). Cold starts begin fresh.

import fs from 'fs';
import path from 'path';

const STATE_FILE = '/tmp/reportanalyzer-state.json';

// Helper: generate a future date string relative to today
function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DEFAULT_SHIPMENTS = [
  { id: "Shipment ID-8842", cargo: "SKU-90210 (Electronics)", quantity: 500, destination: "Port of LA", status: "In Transit", eta: futureDate(2), lat: 33.74, lon: -118.26, baseLogisticsFee: 15000 },
  { id: "Shipment ID-5421", cargo: "SKU-10440 (Automotive)", quantity: 1200, destination: "Port of LA", status: "In Transit", eta: futureDate(5), lat: 33.74, lon: -118.26, baseLogisticsFee: 28000 },
  { id: "Shipment ID-9102", cargo: "SKU-77201 (Apparel)", quantity: 800, destination: "Port of Seattle", status: "In Transit", eta: futureDate(1), lat: 47.60, lon: -122.33, baseLogisticsFee: 18000 }
];

const DEFAULT_INVENTORY = [
  { sku: "SKU-90210", name: "Electronics", quantity: 200, dailyUsage: 70, status: "Warning - Low stock" },
  { sku: "SKU-10440", name: "Automotive Parts", quantity: 800, dailyUsage: 100, status: "Normal" },
  { sku: "SKU-77201", name: "Apparel", quantity: 1500, dailyUsage: 50, status: "Normal" }
];

const DEFAULT_FINANCE = [
  { asset: "Global Logistics Index", value: 120.5, status: "Stable", trend: "Up" },
  { asset: "Crude Oil Brent Index", value: 78.4, status: "Normal", trend: "Stable" }
];

// --- Persistence Helpers ---

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[State] Could not load persisted state, starting fresh:', e.message);
  }
  return null;
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
  } catch (e) {
    // /tmp not available (local dev on Windows) — silent fallback to in-memory only
  }
}

// Bootstrap: try to restore from /tmp, else use defaults
const persisted = loadState();

let shipments = persisted?.shipments ?? JSON.parse(JSON.stringify(DEFAULT_SHIPMENTS));
let inventory  = persisted?.inventory  ?? JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
let finance    = persisted?.finance    ?? JSON.parse(JSON.stringify(DEFAULT_FINANCE));
let logs       = persisted?.logs       ?? [];
let fuelSurchargeRate     = persisted?.fuelSurchargeRate     ?? 5;
let draftedNotification   = persisted?.draftedNotification   ?? "";
let shippingCostMultiplier = persisted?.shippingCostMultiplier ?? 1.0;

function persist() {
  saveState({ shipments, inventory, finance, logs, fuelSurchargeRate, draftedNotification, shippingCostMultiplier });
}

export const db = {
  getFuelSurchargeRate() {
    return fuelSurchargeRate;
  },

  getDraftedNotification() {
    return draftedNotification;
  },

  getShippingCostMultiplier() {
    return shippingCostMultiplier;
  },

  updateFinancialPricing(newSurcharge, newMultiplier, oilPriceTrend, emailNotice) {
    if (newSurcharge !== undefined) fuelSurchargeRate = Number(newSurcharge);
    if (newMultiplier !== undefined) shippingCostMultiplier = Number(newMultiplier);

    const oilAsset = finance.find(f => f.asset.includes("Crude Oil"));
    if (oilAsset) {
      oilAsset.value  = oilPriceTrend === "Spike" ? 98.6 : 78.4;
      oilAsset.status = oilPriceTrend === "Spike" ? "Volatile Surge" : "Normal";
      oilAsset.trend  = oilPriceTrend === "Spike" ? "Up" : "Stable";
    }

    if (emailNotice) draftedNotification = emailNotice;

    const logEntry = `[Finance Engine] Pricing rates recalculated: Fuel Surcharge Index updated to ${fuelSurchargeRate}%, cargo multiplier: x${shippingCostMultiplier}. Global ledger updated.`;
    logs.push(logEntry);
    persist();
    return { success: true, message: logEntry };
  },

  // Supply Chain Database
  getShipments() {
    return shipments;
  },

  getInventory() {
    return inventory;
  },

  rerouteShipment(shipmentId, newDestination, lat, lon) {
    const shipment = shipments.find(s => s.id === shipmentId || s.id.includes(shipmentId));
    if (!shipment) {
      throw new Error(`Shipment with ID ${shipmentId} not found.`);
    }
    const oldDest = shipment.destination;
    shipment.destination = newDestination;
    shipment.status = "Rerouted";
    shipment.eta = `${futureDate(3)} (Expedited)`;

    if (lat && lon) {
      shipment.lat = Number(lat);
      shipment.lon = Number(lon);
    } else {
      const lowerDest = newDestination.toLowerCase();
      if (lowerDest.includes("seattle")) { shipment.lat = 47.60; shipment.lon = -122.33; }
      else if (lowerDest.includes("tokyo"))  { shipment.lat = 35.67; shipment.lon = 139.65; }
      else if (lowerDest.includes("london")) { shipment.lat = 51.50; shipment.lon = -0.12; }
    }

    if (shipment.cargo.includes("SKU-90210") && newDestination.toLowerCase().includes("seattle")) {
      const electronics = inventory.find(i => i.sku === "SKU-90210");
      if (electronics) {
        electronics.quantity += 500;
        electronics.status = "Normal - Restocked via Seattle";
      }
    }

    const logEntry = `[ERP System] Shipment ${shipmentId} successfully rerouted from ${oldDest} to ${newDestination}. Ground expediting active.`;
    logs.push(logEntry);
    persist();
    return { success: true, message: logEntry, shipment };
  },

  // Finance Database
  getFinanceData() {
    return finance;
  },

  adjustPricingStrategy(asset, newTrend) {
    const item = finance.find(a => a.asset.toLowerCase().includes(asset.toLowerCase()));
    if (item) {
      item.trend  = newTrend;
      item.status = "Adjusted Strategy";
      const logEntry = `[Finance Engine] Adjusted pricing/trading strategy for ${asset} to ${newTrend}.`;
      logs.push(logEntry);
      persist();
      return { success: true, message: logEntry };
    }
    return { success: false, message: "Asset not found." };
  },

  // Utilities
  getLogs() {
    return logs;
  },

  reset() {
    shipments             = JSON.parse(JSON.stringify(DEFAULT_SHIPMENTS));
    inventory             = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
    finance               = JSON.parse(JSON.stringify(DEFAULT_FINANCE));
    fuelSurchargeRate     = 5;
    draftedNotification   = "";
    shippingCostMultiplier = 1.0;
    logs                  = [];
    persist();
    return { success: true, message: "Simulation database reset successfully." };
  }
};
