export const inputs = {
  supplyChain: {
    id: "sc-input-1",
    type: "email",
    subject: "URGENT: Port of LA Strike Action",
    body: "Please be advised that union workers at the Port of LA have initiated a sudden 48-hour strike starting immediately. All inbound container ships are being held offshore. We anticipate severe delays for any cargo currently on the water and not yet unloaded. Expected clearance backlog is 5-7 days minimum once operations resume.",
    timestamp: new Date().toISOString()
  },
  healthcare: {
    id: "hc-input-1",
    type: "system_alert",
    subject: "Staffing Critical Shortage - ICU Ward 4",
    body: "Automated Alert: 3 scheduled RNs for ICU Ward 4 (Night Shift 19:00 - 07:00) have called out sick. Current patient-to-nurse ratio will exceed mandated safety limits (projected 4:1, limit 2:1). Additionally, 5 patients are scheduled for transfer from ER to ICU in the next 2 hours. Immediate action required to secure coverage.",
    timestamp: new Date().toISOString()
  }
};
