import React, { useState, useEffect } from 'react';
import AgentTraceView from '../components/AgentTraceView';
import { API_URL } from '../config';

// Interactive Concentric HUD Radar Component
function HudRadar() {
  return (
    <div className="hud-radar-container">
      <div className="radar-circle radar-circle-1"></div>
      <div className="radar-circle radar-circle-2"></div>
      <div className="radar-circle radar-circle-3"></div>
      <div className="radar-sweep"></div>
    </div>
  );
}

// Active Leaflet Map Component loaded dynamically
function RealWorldMap({ shipments, isRerouted }) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamic injector for Leaflet assets (fully self-contained!)
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Inject CSS Custom Tooltip Styling for our cyber theme
    const style = document.createElement('style');
    style.innerHTML = `
      .cyber-tooltip {
        background: rgba(15, 23, 42, 0.85) !important;
        border: 1px solid rgba(6, 182, 212, 0.3) !important;
        color: #fff !important;
        font-family: monospace !important;
        font-size: 0.75rem !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        box-shadow: 0 0 8px rgba(6, 182, 212, 0.25) !important;
        font-weight: bold !important;
      }
      .leaflet-container {
        background: #0f172a !important;
      }
    `;
    document.head.appendChild(style);

    // Inject Script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !window.L) return;

    const mapElement = document.getElementById('leaflet-route-map');
    if (!mapElement) return;

    // Destroy existing instance to avoid duplicates
    if (window.activeLeafletMap) {
      window.activeLeafletMap.remove();
      window.activeLeafletMap = null;
    }

    const map = window.L.map('leaflet-route-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([20.0, 0.0], 2);

    window.activeLeafletMap = map;

    // Premium glowing CartoDB Dark Matter tile layer
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(map);

    // Default origin port: Shanghai
    const origin = [31.23, 121.47];
    window.L.circleMarker(origin, {
      radius: 6,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map).bindTooltip("Shanghai Port", { permanent: true, direction: 'top', className: 'cyber-tooltip' });

    // Plot shipments from DB dynamically!
    const activeRouteCoords = [origin];

    shipments.forEach(s => {
      // If the shipment has custom coordinates from geocoding, use them!
      const lat = s.lat || (s.destination.includes("Seattle") ? 47.60 : 33.74);
      const lon = s.lon || (s.destination.includes("Seattle") ? -122.33 : -118.26);
      
      const isTarget = s.id.includes("8842");
      const markerColor = isTarget ? (isRerouted ? '#10b981' : '#ef4444') : '#eab308';
      
      window.L.circleMarker([lat, lon], {
        radius: isTarget ? 8 : 6,
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.85,
        weight: isTarget ? 3 : 2
      }).addTo(map).bindTooltip(`${s.id}: ${s.destination}`, { permanent: true, direction: 'top', className: 'cyber-tooltip' });

      // Add target coordinates to drawing path
      if (isTarget) {
        activeRouteCoords.push([lat, lon]);
      }
    });

    // Draw shipment trajectories
    if (activeRouteCoords.length > 1) {
      window.L.polyline(activeRouteCoords, {
        color: isRerouted ? '#10b981' : '#ef4444',
        weight: 3,
        dashArray: '5, 8',
        opacity: 0.85
      }).addTo(map);

      // Fit map bounds to show route perfectly
      map.fitBounds(activeRouteCoords, { padding: [30, 30] });
    }

    return () => {
      if (window.activeLeafletMap) {
        window.activeLeafletMap.remove();
        window.activeLeafletMap = null;
      }
    };
  }, [leafletLoaded, shipments, isRerouted]);

  if (!leafletLoaded) {
    return (
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed rgba(6, 182, 212, 0.2)' }}>
        <span>Initializing Real World Spatial Mapping HUD...</span>
      </div>
    );
  }

  return (
    <div 
      id="leaflet-route-map" 
      style={{ 
        height: '180px', 
        borderRadius: '8px', 
        border: `1px solid ${isRerouted ? '#10b981' : '#ef4444'}`,
        boxShadow: `inset 0 0 15px ${isRerouted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
        position: 'relative', 
        overflow: 'hidden',
        zIndex: 10
      }}
    ></div>
  );
}

function SupplyChainView({ dbState, triggerRefresh }) {
  const [inputText, setInputText] = useState('Loading unstructured logistics alert...');
  const [traces, setTraces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice Agent States
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Programmatic HTML5 Web Audio Synth SFX for ReportAnalyzer
  const playReportAnalyzerSound = (type) => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (type === 'start') {
        // High-tech frequency sweep rising up (listening)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'beep') {
        // Tech double blip
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(750, ctx.currentTime);
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.08);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(950, ctx.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.08);
        }, 100);
      } else if (type === 'success') {
        // Sci-fi arpeggio sequence (4 notes rising rapidly)
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          }, i * 80);
        });
      } else if (type === 'error') {
        // Synthesized low caution hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error('Sound synthesis blocked/failed:', e);
    }
  };

  // Upgraded speech synthesis with native British accent profile
  const speakText = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Look specifically for British English/UK voices
    const britishVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.name.includes('UK') || v.name.includes('British') || v.name.includes('Hazel') || v.name.includes('Great Britain'))
    ) || voices.find(v => 
      v.lang.startsWith('en')
    ) || voices[0];
    
    if (britishVoice) {
      u.voice = britishVoice;
    }
    
    u.rate = 0.92;  // Slightly deliberate, polite tone
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  };

  // Fetch initial raw unstructured input from backend
  useEffect(() => {
    fetch(API_URL + '/api/inputs/supplyChain')
      .then(res => res.json())
      .then(data => setInputText(data.body))
      .catch(err => {
        console.error('Failed to load input:', err);
        setInputText('Error loading input from backend.');
      });
  }, []);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (window.recognitionInstance) {
        window.recognitionInstance.stop();
      }
      setIsListening(false);
      return;
    }

    // Play retro sweeps on microphone opening
    playReportAnalyzerSound('start');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      
      // Dynamic confirmation chime + British confirmation
      playReportAnalyzerSound('beep');
      speakText(`Understood, Sir. Spoken instruction captured: ${transcript}. Synthesizing logs.`);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      playReportAnalyzerSound('error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    window.recognitionInstance = recognition;
    recognition.start();
  };

  const handleSimulate = async () => {
    setIsProcessing(true);
    setTraces([]);
    
    // Play double blip beep + analysis speech
    playReportAnalyzerSound('beep');
    speakText("Analyzing logistics coordinates now, Sir. Auditing active routes.");

    try {
      const response = await fetch(API_URL + '/api/scenarios/supplyChain/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: inputText })
      });
      const data = await response.json();
      
      // Map backend trace to frontend trace format
      const mappedTraces = data.trace.map(t => ({
        title: t.action,
        content: t.details
      }));
      
      setTraces(mappedTraces);
      
      // Trigger global database reload to reflect agent actions in the UI!
      triggerRefresh();

      // Play arpeggio success chime + final verbal ReportAnalyzer status update!
      if (data.trace && data.trace.length > 0) {
        const lastStep = data.trace[data.trace.length - 1];
        playReportAnalyzerSound('success');
        speakText(`Protocol completed successfully, Sir. ${lastStep.details}`);
      }
    } catch (error) {
      console.error(error);
      playReportAnalyzerSound('error');
      setTraces([{ title: 'Error', content: 'Failed to connect to Agent Orchestrator.' }]);
      speakText("Apologies, Sir. A core gateway connection failure has occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect database state to render visual indicators
  const shipments = dbState?.shipments || [];
  const inventory = dbState?.inventory || [];
  
  // Find critical shipment ID-8842 to update map state
  const criticalShipment = shipments.find(s => s.id.includes("ID-8842"));
  const isRerouted = criticalShipment && criticalShipment.status === "Rerouted";
  const mapStatusText = isRerouted 
    ? 'DIVERGENCE ACTIVE: SECURED PORT OF SEATTLE DOCKING' 
    : 'CRITICAL ALERT: LA SHUTDOWN THREAT (ETA CRITICAL)';

  return (
    <div className="dashboard-grid">
      {/* Left Column: Input & Trace */}
      <div className="glass-panel holographic-panel">
        {/* Laser scanner element */}
        <div className="laser-scan-line"></div>
        
        {/* Voice & Title Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛰️ System Telemetry Input
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleVoiceInput}
              className={isListening ? 'mic-active' : ''}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-panel)',
                color: 'var(--text-main)',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s',
                boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
              }}
            >
              {isListening ? '🛑 Stop' : '🎙️ Live Voice'}
            </button>
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) window.speechSynthesis?.cancel();
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-panel)',
                color: isMuted ? 'var(--text-muted)' : '#06b6d4',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s',
                boxShadow: !isMuted ? '0 0 10px rgba(6, 182, 212, 0.1)' : 'none'
              }}
            >
              {isMuted ? '🔇 Audio Muted' : '🔊 ReportAnalyzer Vocals'}
            </button>
          </div>
        </div>

        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            width: '100%',
            height: '110px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            color: 'var(--text-main)',
            borderRadius: '6px',
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'none',
            marginBottom: '1rem',
            position: 'relative',
            zIndex: 10
          }}
        />
        
        <button 
          className="btn-primary" 
          onClick={handleSimulate} 
          disabled={isProcessing}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            fontWeight: '600', 
            background: 'linear-gradient(135deg, #0891b2, #2563eb)',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            position: 'relative',
            zIndex: 10
          }}
        >
          {isProcessing ? '⚡ ReportAnalyzer Calculating System Trajectories...' : 'Execute Operational Scan'}
        </button>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-main)', position: 'relative', zIndex: 10 }}>
          Trace Analysis
        </h3>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <AgentTraceView traces={traces} isProcessing={isProcessing} />
        </div>
      </div>

      {/* Right Column: Simulation UI */}
      <div className="glass-panel holographic-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Laser scanner element */}
        <div className="laser-scan-line"></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>📍 Holographic Operational Radar</h2>
          {/* Animated concentric HUD radar */}
          <HudRadar />
        </div>
        
        {/* Dynamic Route Map using Leaflet */}
        <RealWorldMap shipments={shipments} isRerouted={isRerouted} />

        {/* Live Shipments Grid */}
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.5rem', position: 'relative', zIndex: 10 }}>Active Cargo Trajectories</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', zIndex: 10 }}>
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
                  padding: '0.75rem 1rem', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{shipment.id} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({shipment.cargo})</span></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Qty: {shipment.quantity} units | Base: ${baseFee.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    color: isTarget ? (isReroutedDest ? '#10b981' : '#ef4444') : 'var(--text-main)' 
                  }}>
                    📍 {shipment.destination}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 'bold', textShadow: '0 0 6px rgba(6, 182, 212, 0.2)' }}>
                    Total: ${totalCost.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-Time Transaction Surcharge Simulator */}
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.5rem', position: 'relative', zIndex: 10 }}>
          💰 Transaction Surcharge Checkout Simulator
        </h3>
        <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.15)', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Fuel Surcharge Rate:</span>
              <div style={{ fontSize: '1.05rem', color: (dbState?.fuelSurchargeRate || 5) > 5 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                ⚡ {dbState?.fuelSurchargeRate || 5}%
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cost Multiplier Index:</span>
              <div style={{ fontSize: '1.05rem', color: (dbState?.shippingCostMultiplier || 1.0) > 1.0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                📈 x{dbState?.shippingCostMultiplier || 1.0}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              <span>Base Delivery Fee:</span>
              <span>$15,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              <span>Inflation Index Adjustment:</span>
              <span>+${Math.round(15000 * ((dbState?.shippingCostMultiplier || 1.0) - 1.0)).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>Fuel Surcharge Adjustment:</span>
              <span>+${Math.round(15000 * (dbState?.shippingCostMultiplier || 1.0) * (((dbState?.fuelSurchargeRate || 5) - 5) / 100)).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', borderTop: '1px dashed rgba(6, 182, 212, 0.3)', paddingTop: '0.4rem' }}>
              <span>Simulated Checkout Total:</span>
              <span style={{ color: '#06b6d4', textShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }}>
                ${Math.round(15000 * (dbState?.shippingCostMultiplier || 1.0) * (1 + (dbState?.fuelSurchargeRate || 5) / 100)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Client Dispatch Notification Warning */}
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.5rem', position: 'relative', zIndex: 10 }}>
          ✉️ Auto-Drafted Customer Notice Dispatch
        </h3>
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.5)', 
          padding: '0.85rem', 
          borderRadius: '6px', 
          border: dbState?.draftedNotification ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.05)',
          position: 'relative', 
          zIndex: 10,
          maxHeight: '110px',
          overflowY: 'auto'
        }}>
          {dbState?.draftedNotification ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>⚠️ SYSTEM DISPATCH ALERT READY:</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-main)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                {dbState.draftedNotification}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', padding: '1rem' }}>
              Standing by. No real-time pricing alerts or energy surges detected yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupplyChainView;
