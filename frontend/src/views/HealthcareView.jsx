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

function HealthcareView({ dbState, triggerRefresh }) {
  const [inputText, setInputText] = useState('Loading unstructured staffing report...');
  const [traces, setTraces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Voice Agent States
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const getAudioContext = () => {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!window.sharedAudioCtx) {
      window.sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.sharedAudioCtx.state === 'suspended') {
      window.sharedAudioCtx.resume();
    }
    return window.sharedAudioCtx;
  };

  // Programmatic HTML5 Web Audio Synth SFX for ReportAnalyzer
  const playReportAnalyzerSound = (type) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
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
    fetch(API_URL + '/api/inputs/healthcare')
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

    // Play sweeps on opening microphone
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
      speakText(`Staffing transcript captured, Sir: ${transcript}. Synchronizing rosters.`);
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
    speakText("Cross-referencing ICU nurse allocations, Sir. Executing ratio audit.");

    try {
      const response = await fetch(API_URL + '/api/scenarios/healthcare/run', {
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

      // Play success chime + dynamic verbal ReportAnalyzer statement!
      if (data.trace && data.trace.length > 0) {
        const lastStep = data.trace[data.trace.length - 1];
        playReportAnalyzerSound('success');
        speakText(`Audit complete, Sir. ${lastStep.details}`);
      }
    } catch (error) {
      console.error(error);
      playReportAnalyzerSound('error');
      setTraces([{ title: 'Error', content: 'Failed to connect to Agent Orchestrator.' }]);
      speakText("System offline, Sir. Unable to establish uplink to hospital servers.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect database staffing state
  const units = dbState?.staffing || [];
  const icuUnit = units.find(u => u.id.includes("ICU")) || { assigned: 12, safeRatio: 12, status: "Normal", details: "", patients: 24 };
  const sduUnit = units.find(u => u.id.includes("Step-Down")) || { assigned: 8, safeRatio: 6, status: "Normal", details: "", patients: 12 };

  // Calculate ICU ratio compliance
  const isIcuShortage = icuUnit.assigned < icuUnit.safeRatio;
  const icuStatusColor = isIcuShortage ? '#ef4444' : '#10b981';
  const icuStatusLabel = isIcuShortage ? 'Critical Staffing Shortage' : 'Compliance Ratios Restored';

  return (
    <div className="dashboard-grid">
      {/* Left Column: Input & Trace */}
      <div className="glass-panel holographic-panel">
        {/* Laser scanner element */}
        <div className="laser-scan-line"></div>
        
        {/* Voice & Title Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏥 Ward Allocation Center
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
          {isProcessing ? '⚡ ReportAnalyzer Balancing Clinic Compliance...' : 'Audit Ward Staffing'}
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
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>🏥 Clinic Holographic Overview</h2>
          {/* Animated concentric HUD radar */}
          <HudRadar />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem', position: 'relative', zIndex: 10 }}>
          
          {/* ICU Ward Card with dynamic red glow alert */}
          <div 
            className={isIcuShortage ? 'critical-glow' : ''}
            style={{ 
              background: 'rgba(15, 23, 42, 0.4)', 
              padding: '1.25rem', 
              borderRadius: '8px', 
              border: `1px solid ${icuStatusColor}`,
              boxShadow: `0 0 15px ${isIcuShortage ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.05)'}`,
              transition: 'all 0.5s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>🛏️ {icuUnit.id}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Census: {icuUnit.patients} patients (Goal ratio 2:1)</div>
              </div>
              <div style={{ color: icuStatusColor, fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {icuStatusLabel}
              </div>
            </div>
            
            {/* Visual Nurse Grid */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[...Array(15)].map((_, i) => {
                const isActive = i < icuUnit.assigned;
                const isWarningPulse = isIcuShortage && i >= icuUnit.assigned && i < icuUnit.safeRatio;
                return (
                  <div 
                    key={i} 
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: isActive ? 'var(--accent-blue)' : (isWarningPulse ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'),
                      border: isWarningPulse ? '1px dashed #ef4444' : '1px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                      animation: isWarningPulse ? 'pulse 1.5s infinite' : 'none',
                      transition: 'all 0.3s'
                    }}
                  >
                    {isActive ? '👩‍⚕️' : (isWarningPulse ? '🚨' : '')}
                  </div>
                );
              })}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              color: 'var(--text-muted)', 
              fontSize: '0.85rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '0.5rem'
            }}>
              <div>Active Staff: <strong style={{ color: icuStatusColor }}>{icuUnit.assigned} RNs</strong></div>
              <div>Required Safe Limit: <strong>{icuUnit.safeRatio} RNs</strong></div>
            </div>
          </div>

          {/* Step-Down Unit Card */}
          <div style={{ 
            background: 'rgba(15, 23, 42, 0.3)', 
            padding: '1.25rem', 
            borderRadius: '8px',
            border: '1px solid rgba(6, 182, 212, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>🏥 {sduUnit.id}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Census: {sduUnit.patients} patients (Goal ratio 2:1)</div>
              </div>
              <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>
                Active Surplus
              </div>
            </div>

            {/* Visual Nurse Grid */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[...Array(10)].map((_, i) => {
                const isActive = i < sduUnit.assigned;
                return (
                  <div 
                    key={i} 
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                      transition: 'all 0.3s'
                    }}
                  >
                    {isActive ? '👩‍⚕️' : ''}
                  </div>
                );
              })}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              color: 'var(--text-muted)', 
              fontSize: '0.85rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '0.5rem'
            }}>
              <div>Active Staff: <strong style={{ color: 'var(--text-main)' }}>{sduUnit.assigned} RNs</strong></div>
              <div>Required Safe Limit: <strong>{sduUnit.safeRatio} RNs</strong></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default HealthcareView;
