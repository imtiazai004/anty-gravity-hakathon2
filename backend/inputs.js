export const inputs = {
  supplyChain: {
    id: "sc-input-1",
    type: "email",
    subject: "URGENT: Port of LA Strike Action",
    body: "Please be advised that union workers at the Port of LA have initiated a sudden 48-hour strike starting immediately. All inbound container ships are being held offshore. We anticipate severe delays for any cargo currently on the water and not yet unloaded. Expected clearance backlog is 5-7 days minimum once operations resume.",
    timestamp: new Date().toISOString()
  },
  financial: {
    id: "fin-input-1",
    type: "market_alert",
    subject: "URGENT: Global Fuel Price Surge — Logistics Cost Review",
    body: "Brent crude oil prices have surged 18% over the past 72 hours driven by OPEC+ supply cuts and renewed geopolitical tensions. Transportation fuel surcharge rates at major logistics carriers are expected to increase significantly. All active shipment contracts with fuel escalation clauses must be reviewed and client notification dispatches must be prepared immediately.",
    timestamp: new Date().toISOString()
  }
};
