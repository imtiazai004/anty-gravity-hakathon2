import React, { useEffect, useRef } from 'react';

function LogisticsView({ dbState }) {
  const mapRef = useRef(null);
  const shipments = dbState?.shipments || [];

  // Inject Leaflet CDN Assets Dynamically
  useEffect(() => {
    // Check if Leaflet CSS already exists
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Check if Leaflet JS already exists
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = initializeMap;
      document.body.appendChild(script);
    } else {
      // Leaflet already loaded, initialize directly
      initializeMap();
    }

    // Map Initialization Routine
    function initializeMap() {
      if (!window.L || !mapRef.current) return;

      // Prevent "Map container already initialized" crashes on hot reload
      if (window.activeLeafletMap) {
        try {
          window.activeLeafletMap.remove();
        } catch (e) {
          console.warn("Cleanup failed:", e);
        }
        window.activeLeafletMap = null;
      }

      // 1. Instantiate Map with high-tech default center coordinates
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([20, 0], 2);

      window.activeLeafletMap = map;

      // 2. Inject CartoDB Dark Matter Ultra Premium neon dark tiles
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom pulsing neon circle marker class injections
      const pulseStyle = document.createElement('style');
      pulseStyle.innerHTML = `
        @keyframes mapPulse {
          0% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
        }
        .custom-pulsing-icon {
          background: #06b6d4;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
          animation: mapPulse 1.8s infinite;
        }
        .custom-pulsing-target {
          background: #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.9) !important;
          animation: mapPulse 1.4s infinite !important;
        }
      `;
      document.head.appendChild(pulseStyle);

      const markersGroup = [];

      // 3. Loop through active cargo container coordinates
      shipments.forEach((shipment) => {
        if (!shipment.lat || !shipment.lon) return;

        const isTarget = shipment.id.includes("ID-8842");
        const isRerouted = shipment.destination.includes("Seattle");

        // Custom cyber pulsing divicon
        const customIcon = window.L.divIcon({
          className: `custom-pulsing-icon ${isTarget ? (isRerouted ? '' : 'custom-pulsing-target') : ''}`,
          iconSize: [12, 12]
        });

        const marker = window.L.marker([shipment.lat, shipment.lon], { icon: customIcon })
          .addTo(map)
          .bindTooltip(`
            <div style="background:#0f172a; border:1px solid rgba(6,182,212,0.4); padding:0.4rem 0.6rem; border-radius:4px; font-family:monospace; color:#fff; font-size:0.75rem;">
              <strong style="color:${isTarget ? (isRerouted ? '#10b981' : '#ef4444') : '#06b6d4'}">${shipment.id}</strong><br/>
              📦 Cargo: ${shipment.cargo}<br/>
              📍 Dest: ${shipment.destination}<br/>
              🚀 Status: ${shipment.status}
            </div>
          `, { html: true, direction: 'top', className: 'hud-map-tooltip' });

        markersGroup.push([shipment.lat, shipment.lon]);

        // Draw marine trans-pacific polyline vectors from Shanghai factory origin (Lat: 31.2, Lon: 121.4)
        const origin = [31.2, 121.4];
        const dest = [shipment.lat, shipment.lon];

        window.L.polyline([origin, dest], {
          color: isTarget ? (isRerouted ? '#10b981' : '#ef4444') : '#0891b2',
          weight: 1.5,
          dashArray: '5, 8',
          opacity: 0.65
        }).addTo(map);
      });

      // 4. Smooth automatic map flyTo bounding box adjustments
      if (markersGroup.length > 0) {
        try {
          map.flyToBounds(markersGroup, { padding: [50, 50], maxZoom: 5, duration: 1.5 });
        } catch (err) {
          console.warn(err);
        }
      }
    }

    // Cleanup Leaflet instance on view shift to prevent DOM leakage
    return () => {
      if (window.activeLeafletMap) {
        try {
          window.activeLeafletMap.remove();
        } catch (e) {
          console.warn("Cleanup failed:", e);
        }
        window.activeLeafletMap = null;
      }
    };
  }, [shipments]);

  return (
    <div className="dashboard-grid">
      {/* Column 1: Leaflet High-Tech Map */}
      <div className="glass-panel holographic-panel" style={{ height: '520px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="laser-scan-line"></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>📍 Holographic Operational Radar</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>MAP ENGINE: OS-NOMINATIM</span>
        </div>

        {/* Leaflet container bind */}
        <div 
          ref={mapRef} 
          style={{ 
            flexGrow: 1, 
            width: '100%', 
            borderRadius: '6px', 
            border: '1px solid rgba(6, 182, 212, 0.25)', 
            background: '#090d16',
            position: 'relative',
            zIndex: 1
          }} 
        />
      </div>

      {/* Column 2: Shipment Trajectories */}
      <div className="glass-panel holographic-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="laser-scan-line"></div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>🚢 Active Cargo Trajectories</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', position: 'relative', zIndex: 10 }}>
          {shipments.map((shipment) => {
            const isTarget = shipment.id.includes("ID-8842");
            const isReroutedDest = shipment.destination.includes("Seattle");
            const surcharge = dbState?.fuelSurchargeRate || 5;
            const multiplier = dbState?.shippingCostMultiplier || 1.0;
            const baseFee = shipment.baseLogisticsFee || 15000;
            const totalCost = Math.round(baseFee * multiplier * (1 + surcharge / 100));

            return (
              <div 
                key={shipment.id} 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.5)', 
                  border: isTarget ? `1px solid ${isReroutedDest ? '#10b981' : '#ef4444'}` : '1px solid rgba(6, 182, 212, 0.1)',
                  padding: '0.85rem 1.1rem', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{shipment.id} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({shipment.cargo})</span></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Qty: {shipment.quantity} units | Base Fee: ${baseFee.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    color: isTarget ? (isReroutedDest ? '#10b981' : '#ef4444') : 'var(--text-main)' 
                  }}>
                    📍 {shipment.destination}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 'bold', textShadow: '0 0 6px rgba(6, 182, 212, 0.25)', marginTop: '0.2rem' }}>
                    Total: ${totalCost.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LogisticsView;
