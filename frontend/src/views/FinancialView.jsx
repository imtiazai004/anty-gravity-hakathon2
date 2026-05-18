import React from 'react';

function FinancialView({ dbState }) {
  const financeData = dbState?.finance || [
    { asset: "Global Logistics Index", value: 120.5, status: "Stable", trend: "Up" },
    { asset: "Crude Oil Brent Index", value: 78.4, status: "Normal", trend: "Stable" }
  ];

  return (
    <div className="dashboard-grid">
      {/* Column 1: Financial Surcharge Checkout Calculator & Invoicing */}
      <div className="glass-panel holographic-panel">
        <div className="laser-scan-line"></div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          💰 Transaction Surcharge Checkout Simulator
        </h2>
        
        <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Fuel Surcharge Rate:</span>
              <div style={{ fontSize: '1.3rem', color: (dbState?.fuelSurchargeRate || 5) > 5 ? '#f59e0b' : '#10b981', fontWeight: 'bold', marginTop: '0.25rem' }}>
                ⚡ {dbState?.fuelSurchargeRate || 5}%
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Cost Multiplier Index:</span>
              <div style={{ fontSize: '1.3rem', color: (dbState?.shippingCostMultiplier || 1.0) > 1.0 ? '#ef4444' : '#10b981', fontWeight: 'bold', marginTop: '0.25rem' }}>
                📈 x{dbState?.shippingCostMultiplier || 1.0}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>Base Delivery Fee (Shipment ID-8842):</span>
              <span>$15,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>Inflation Index Adjustment:</span>
              <span>+${Math.round(15000 * ((dbState?.shippingCostMultiplier || 1.0) - 1.0)).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <span>Fuel Surcharge Adjustment:</span>
              <span>+${Math.round(15000 * (dbState?.shippingCostMultiplier || 1.0) * (((dbState?.fuelSurchargeRate || 5) - 5) / 100)).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', borderTop: '1px dashed rgba(6, 182, 212, 0.3)', paddingTop: '0.75rem' }}>
              <span>Simulated Checkout Total:</span>
              <span style={{ color: '#06b6d4', textShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }}>
                ${Math.round(15000 * (dbState?.shippingCostMultiplier || 1.0) * (1 + (dbState?.fuelSurchargeRate || 5) / 100)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Global Commodity Ledger */}
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '1.25rem', marginBottom: '0.75rem' }}>🎯 Global Commodity Ledgers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', position: 'relative', zIndex: 10 }}>
          {financeData.map((item, idx) => {
            const isSpike = item.status.includes("Surge") || item.status.includes("Volatile");
            return (
              <div 
                key={idx}
                style={{ 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  border: isSpike ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.04)' 
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.asset}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isSpike ? '#ef4444' : '#10b981' }}>
                    ${item.value}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isSpike ? '#ef4444' : '#10b981', background: isSpike ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {item.status} ({item.trend})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 2: Dynamic Client Dispatch Notification Warning */}
      <div className="glass-panel holographic-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="laser-scan-line"></div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ✉️ Auto-Drafted Customer Notice Dispatch
        </h2>

        <div style={{ 
          flexGrow: 1,
          background: 'rgba(15, 23, 42, 0.5)', 
          padding: '1.25rem', 
          borderRadius: '8px', 
          border: dbState?.draftedNotification ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.05)',
          position: 'relative', 
          zIndex: 10,
          maxHeight: '410px',
          overflowY: 'auto'
        }}>
          {dbState?.draftedNotification ? (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>⚠️ OPERATIONAL SURCHARGE LEDGER DISPATCH:</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>
                {dbState.draftedNotification}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '4rem 1rem' }}>
              Ledger Standby.<br/>
              No market anomalies or fuel index triggers registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialView;
