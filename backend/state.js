// Simulated in-memory database to represent "live systems"
// Allows our agent to query databases and take state-mutating actions

const DEFAULT_SHIPMENTS = [
  { id: "Shipment ID-8842", cargo: "SKU-90210 (Electronics)", quantity: 500, destination: "Port of LA", status: "In Transit", eta: "May 19, 2026" },
  { id: "Shipment ID-5421", cargo: "SKU-10440 (Automotive)", quantity: 1200, destination: "Port of LA", status: "In Transit", eta: "May 22, 2026" },
  { id: "Shipment ID-9102", cargo: "SKU-77201 (Apparel)", quantity: 800, destination: "Port of Seattle", status: "In Transit", eta: "May 18, 2026" }
];

const DEFAULT_INVENTORY = [
  { sku: "SKU-90210", name: "Electronics", quantity: 200, dailyUsage: 70, status: "Warning - Low stock" },
  { sku: "SKU-10440", name: "Automotive Parts", quantity: 800, dailyUsage: 100, status: "Normal" },
  { sku: "SKU-77201", name: "Apparel", quantity: 1500, dailyUsage: 50, status: "Normal" }
];

const DEFAULT_STAFFING = [
  { id: "ICU Ward 4", assigned: 12, safeRatio: 12, status: "Pending", details: "3 scheduled nurses called out sick. Active: 9/12. Safety limit exceeded.", patients: 24 },
  { id: "Step-Down Unit", assigned: 8, safeRatio: 6, status: "Normal", details: "10 nurses active. Patient load: 12. Ratio: 1.2:1 (Safe)", patients: 12 }
];

let shipments = JSON.parse(JSON.stringify(DEFAULT_SHIPMENTS));
let inventory = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
let staffing = JSON.parse(JSON.stringify(DEFAULT_STAFFING));

const DEFAULT_FINANCE = [
  { asset: "Tech Stocks Index", value: 450.2, status: "Volatile", trend: "Down" },
  { asset: "Global Logistics ETF", value: 120.5, status: "Stable", trend: "Up" }
];

const DEFAULT_CITY = [
  { zone: "Downtown Sector", issue: "Flooding reported", status: "Critical", maintenanceDispatched: false },
  { zone: "Highway 9", issue: "Traffic Jam", status: "Warning", maintenanceDispatched: false }
];

let finance = JSON.parse(JSON.stringify(DEFAULT_FINANCE));
let city = JSON.parse(JSON.stringify(DEFAULT_CITY));
let logs = [];

export const db = {
  // Supply Chain Database
  getShipments() {
    return shipments;
  },

  getInventory() {
    return inventory;
  },

  rerouteShipment(shipmentId, newDestination) {
    const shipment = shipments.find(s => s.id === shipmentId || s.id.includes(shipmentId));
    if (!shipment) {
      throw new Error(`Shipment with ID ${shipmentId} not found.`);
    }
    const oldDest = shipment.destination;
    shipment.destination = newDestination;
    shipment.status = "Rerouted";
    shipment.eta = "May 20, 2026 (Expedited)";

    // Update SKU inventory safety status if it mitigates stockout
    if (shipment.cargo.includes("SKU-90210") && newDestination.toLowerCase().includes("seattle")) {
      const electronics = inventory.find(i => i.sku === "SKU-90210");
      if (electronics) {
        electronics.quantity += 500;
        electronics.status = "Normal - Restocked via Seattle";
      }
    }

    const logEntry = `[ERP System] Shipment ${shipmentId} successfully rerouted from ${oldDest} to ${newDestination}. Ground expediting active.`;
    logs.push(logEntry);
    return { success: true, message: logEntry, shipment };
  },

  // Healthcare Database
  getStaffingLevels() {
    return staffing;
  },

  reallocateStaff(fromUnit, toUnit, quantity) {
    const from = staffing.find(u => u.id.toLowerCase().includes(fromUnit.toLowerCase()));
    const to = staffing.find(u => u.id.toLowerCase().includes(toUnit.toLowerCase()));

    if (!from || !to) {
      throw new Error(`Invalid units: from ${fromUnit} to ${toUnit}`);
    }
    if (from.assigned - quantity < from.safeRatio) {
      throw new Error(`Cannot reallocate ${quantity} nurses from ${from.id}. It would drop staffing below the safety limit of ${from.safeRatio}.`);
    }

    from.assigned -= quantity;
    to.assigned += quantity;

    if (to.assigned >= to.safeRatio) {
      to.status = "Normal";
      to.details = `Assigned Nurses: ${to.assigned}/${to.safeRatio} (Safe Ratio: ${to.safeRatio})`;
    }
    from.details = `Assigned Nurses: ${from.assigned}/${from.safeRatio} (Safe Ratio: ${from.safeRatio})`;

    const logEntry = `[HR Scheduling] Reallocated ${quantity} nurses from ${from.id} to ${to.id} to resolve staffing violation.`;
    logs.push(logEntry);
    return { success: true, message: logEntry, staffing };
  },

  // Generic Expansion Data
  getFinanceData() {
    return finance;
  },
  
  adjustPricingStrategy(asset, newTrend) {
    const item = finance.find(a => a.asset.toLowerCase().includes(asset.toLowerCase()));
    if (item) {
      item.trend = newTrend;
      item.status = "Adjusted Strategy";
      const logEntry = `[Finance Engine] Adjusted pricing/trading strategy for ${asset} to ${newTrend}.`;
      logs.push(logEntry);
      return { success: true, message: logEntry };
    }
    return { success: false, message: "Asset not found." };
  },

  getCityInfrastructure() {
    return city;
  },

  dispatchMaintenance(zone) {
    const item = city.find(c => c.zone.toLowerCase().includes(zone.toLowerCase()));
    if (item) {
      item.maintenanceDispatched = true;
      item.status = "Resolving";
      const logEntry = `[City Operations] Dispatched emergency maintenance crew to ${zone}.`;
      logs.push(logEntry);
      return { success: true, message: logEntry };
    }
    return { success: false, message: "Zone not found." };
  },

  // Utilities
  getLogs() {
    return logs;
  },

  reset() {
    shipments = JSON.parse(JSON.stringify(DEFAULT_SHIPMENTS));
    inventory = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
    staffing = JSON.parse(JSON.stringify(DEFAULT_STAFFING));
    finance = JSON.parse(JSON.stringify(DEFAULT_FINANCE));
    city = JSON.parse(JSON.stringify(DEFAULT_CITY));
    logs = [];
    return { success: true, message: "Simulation database reset successfully." };
  }
};
