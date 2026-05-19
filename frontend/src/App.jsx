import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import NewsView from './views/NewsView';
import LogisticsView from './views/LogisticsView';
import FinancialView from './views/FinancialView';
import { API_URL } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('news');
  const [status, setStatus] = useState({ isLive: false, mode: 'Connecting...' });
  const [dbState, setDbState] = useState({ shipments: [], inventory: [], staffing: [], logs: [], finance: [], fuelSurchargeRate: 5, draftedNotification: "", shippingCostMultiplier: 1.0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Mobile Audio block override
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // --- ALWAYS-ON CONVERSATIONAL REPORT_ANALYZER AI CORE STATE ---
  const [isAlwaysListening, setIsAlwaysListening] = useState(false);
  const [micError, setMicError] = useState(null); // 'denied' | 'unsupported' | null
  const [isReportAnalyzerThinking, setIsReportAnalyzerThinking] = useState(false);
  const [isReportAnalyzerSpeaking, setIsReportAnalyzerSpeaking] = useState(false);
  const [reportAnalyzerConsoleLogs, setReportAnalyzerConsoleLogs] = useState([
    "System: Standing by. Tap Mic to authorize hands-free vocals."
  ]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  // useRef to avoid stale closure inside recognition.onend
  const listeningRef = useRef(false);
  const hasGreetedRef = useRef(false);

  // Programmatic HTML5 Web Audio Synth SFX
  const playReportAnalyzerSound = (type) => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (type === 'start') {
        // Futuristic frequency sweep rising (Core woke up)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'beep') {
        // Tech double blip chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(750, ctx.currentTime);
        gain1.gain.setValueAtTime(0.06, ctx.currentTime);
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
          gain2.gain.setValueAtTime(0.06, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.08);
        }, 110);
      } else if (type === 'success') {
        // Rising arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }, i * 70);
        });
      } else if (type === 'error') {
        // Alarm/Warning caution hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Upgraded verbal ReportAnalyzer conversational speaker
  const speakText = (text, onEndCallback) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    const britishVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.name.includes('UK') || v.name.includes('British') || v.name.includes('Hazel') || v.name.includes('Great Britain'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (britishVoice) {
      u.voice = britishVoice;
    }
    u.rate = 0.93;
    u.pitch = 1.05;

    u.onstart = () => setIsReportAnalyzerSpeaking(true);
    u.onend = () => {
      setIsReportAnalyzerSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    u.onerror = () => setIsReportAnalyzerSpeaking(false);

    window.speechSynthesis.speak(u);
  };

  // Check agent status on mount
  useEffect(() => {
    fetch(API_URL + '/api/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => {
        console.error('Failed to fetch status:', err);
        setStatus({ isLive: false, mode: 'Offline' });
      });

    // Clean up persistent listening on unmount
    return () => {
      if (window.wakeRecognitionInstance) {
        window.wakeRecognitionInstance.onend = null;
        window.wakeRecognitionInstance.stop();
      }
    };
  }, []);

  // Sync state from db
  useEffect(() => {
    fetch(API_URL + '/api/state')
      .then(res => res.json())
      .then(data => setDbState(data))
      .catch(err => console.error('Failed to sync DB state:', err));
  }, [refreshTrigger]);

  const handleReset = async () => {
    try {
      await fetch(API_URL + '/api/state/reset', { method: 'POST' });
      setRefreshTrigger(prev => prev + 1);
      
      playReportAnalyzerSound('success');
      speakText("Standard operational databases successfully reset, Sir. All metrics restored.");
      setReportAnalyzerConsoleLogs(prev => ["System: Database reset completed.", ...prev.slice(0, 5)]);
    } catch (err) {
      console.error('Failed to reset DB state:', err);
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // --- ALWAYS-ON SPEECH LISTENER LOOP INTEGRATION ---
  const toggleAlwaysListening = async () => {
    // Automatically slide the console expanded to show transcript logs
    setIsConsoleExpanded(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('unsupported');
      setReportAnalyzerConsoleLogs(prev => ["System: Speech Recognition not supported. Please use Chrome or Edge.", ...prev.slice(0, 5)]);
      return;
    }

    if (listeningRef.current) {
      // Turn off
      listeningRef.current = false;
      setIsAlwaysListening(false);
      hasGreetedRef.current = false;
      if (window.wakeRecognitionInstance) {
        window.wakeRecognitionInstance.onend = null;
        try { window.wakeRecognitionInstance.stop(); } catch(e) {}
      }
      playReportAnalyzerSound('error');
      setReportAnalyzerConsoleLogs(prev => ["System: Voice command listener deactivated.", ...prev.slice(0, 5)]);
      return;
    }

    // Request mic permission explicitly first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicError(null);
    } catch (permErr) {
      setMicError('denied');
      setReportAnalyzerConsoleLogs(prev => ["System: ❌ Microphone blocked! Click the 🔒 lock icon in address bar → allow microphone → refresh.", ...prev.slice(0, 5)]);
      return;
    }

    // Turn on
    playReportAnalyzerSound('start');
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Set to false to capture final complete sentences on pause!
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listeningRef.current = true;
      setIsAlwaysListening(true);
      setMicError(null);
      
      // ONLY log the standing by message and greet on the absolute FIRST launch, NOT during background loop restarts!
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        setReportAnalyzerConsoleLogs(prev => ["System: 🎙️ Wake Word 'Report Analyzer' listener ACTIVE. Standing by, Sir.", ...prev.slice(0, 5)]);
        speakText("Report Analyzer core initialized, Sir. I am online and listening for your commands.");
      }
    };

    recognition.onresult = async (event) => {
      // With continuous = false, the full captured sentence is in results[0][0]
      const transcript = event.results[0][0].transcript.trim();
      console.log("ReportAnalyzer captured input:", transcript);

      const lowerTranscript = transcript.toLowerCase();
      
      // Look for wake-word "report analyzer" or "reportanalyzer"
      const hasWakeWord = lowerTranscript.includes("report analyzer") || lowerTranscript.includes("reportanalyzer");
      if (hasWakeWord) {
        playReportAnalyzerSound('beep');
        
        let command = "";
        if (lowerTranscript.includes("report analyzer")) {
          const parts = lowerTranscript.split("report analyzer");
          command = parts[parts.length - 1].trim();
        } else {
          const parts = lowerTranscript.split("reportanalyzer");
          command = parts[parts.length - 1].trim();
        }

        if (command.length > 2) {
          processReportAnalyzerCommand(command);
        } else {
          speakText("Indeed, Sir. I am active. What are your parameters?");
          setReportAnalyzerConsoleLogs(prev => ["ReportAnalyzer: Indeed, Sir. What are your parameters?", ...prev.slice(0, 5)]);
        }
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech loop error:", e.error);
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        listeningRef.current = false;
        setIsAlwaysListening(false);
        setMicError('denied');
        setReportAnalyzerConsoleLogs(prev => ["System: ❌ Mic blocked! In Chrome: address bar 🔒 → Site Settings → Microphone → Allow → Refresh page.", ...prev.slice(0, 5)]);
      } else if (e.error === 'network') {
        console.warn('Speech network error, will retry...');
      }
    };

    recognition.onend = () => {
      // Loop persistence
      if (listeningRef.current) {
        try {
          window.wakeRecognitionInstance.start();
        } catch (err) {
          console.error("Loop restart failed:", err);
        }
      }
    };

    window.wakeRecognitionInstance = recognition;
    recognition.start();
  };

  // Automated Agent Action Dispatcher & Speech Core
  const processReportAnalyzerCommand = async (command) => {
    setIsReportAnalyzerThinking(true);
    setReportAnalyzerConsoleLogs(prev => [`Sir: "${command}"`, ...prev.slice(0, 5)]);

    try {
      // 1. Get conversational reply from backend
      const chatRes = await fetch(API_URL + '/api/reportAnalyzer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: command })
      });
      const chatData = await chatRes.json();
      
      // 2. Speak ReportAnalyzer's human response
      speakText(chatData.reply);
      setReportAnalyzerConsoleLogs(prev => [`ReportAnalyzer: "${chatData.reply}"`, ...prev.slice(0, 5)]);

      // 3. Detect operational keywords to auto-orchestrate actual simulated agents!
      const lowerCmd = command.toLowerCase();
      
      if (lowerCmd.includes("news") || lowerCmd.includes("google") || lowerCmd.includes("supply") || lowerCmd.includes("shipment") || lowerCmd.includes("strike") || lowerCmd.includes("la")) {
        // Redirect tab visual view
        setActiveTab('supply');
        
        setTimeout(async () => {
          speakText("Diverting Shipment ID-8842 carrying high-priority cargo from strike port LA to Seattle, Sir. STAND BY.");
          try {
            await fetch(API_URL + '/api/scenarios/supplyChain/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: "Divert electronics cargo bound for Port of LA due to union labor gridlock strike." })
            });
            // Update database states in UI
            triggerRefresh();
            playReportAnalyzerSound('success');
            speakText("State mitigation complete, Sir. Cargo schedules secured at Port of Seattle.");
          } catch (e) {
            console.error(e);
          }
        }, 5000);
      } 
      else if (lowerCmd.includes("nurse") || lowerCmd.includes("hospital") || lowerCmd.includes("healthcare") || lowerCmd.includes("staff") || lowerCmd.includes("icu")) {
        setActiveTab('healthcare');
        
        setTimeout(async () => {
          speakText("Reallocating reserve Step-Down nursing resources to balance ICU compliance limits, Sir. STAND BY.");
          try {
            await fetch(API_URL + '/api/scenarios/healthcare/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: "Resolve staffing shortages. Reallocate SDU nurses to balance critical ICU safety limit ratios." })
            });
            // Update database states in UI
            triggerRefresh();
            playReportAnalyzerSound('success');
            speakText("Clinic audit complete, Sir. ICU ratios fully restored to stable safety thresholds.");
          } catch (e) {
            console.error(e);
          }
        }, 5000);
      }
      else if (lowerCmd.includes("reset") || lowerCmd.includes("clear") || lowerCmd.includes("database")) {
        handleReset();
      }

    } catch (err) {
      console.error(err);
      playReportAnalyzerSound('error');
      speakText("Apologies, Sir. A communication delay occurred on the neural mainframe.");
    } finally {
      setIsReportAnalyzerThinking(false);
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Audio Initializer overlay */}
      {!isAudioInitialized && (
        <div className="audio-initializer-overlay">
          <div className="audio-initializer-card">
            <div style={{ fontSize: '2.8rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.4))' }}>🛰️</div>
            <h2 style={{ color: 'var(--accent-cyan)', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
              OPERATIONAL UPLINK REQUIREMENT
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
              Sir, tap below to initialize ReportAnalyzer audio diagnostics and authorize microphone access for hands-free voice commands.
            </p>
            <button 
              className="audio-initializer-btn"
              onClick={async () => {
                setIsAudioInitialized(true);
                playReportAnalyzerSound('success');
                // Automatically activate always-listening wake-word mode!
                setTimeout(() => {
                  toggleAlwaysListening();
                }, 100);
              }}
            >
              INITIALIZE REPORT_ANALYZER DIAGNOSTICS
            </button>
          </div>
        </div>
      )}

      {/* Floating Animated Arc Reactor Core Console Widget */}
      {isAudioInitialized && (
        <div className="reportAnalyzer-core-widget">
          {/* Transcript Logs Panel */}
          {isConsoleExpanded && (
            <motion.div 
              className="reportAnalyzer-console-card"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              style={{ border: `1px solid ${isAlwaysListening ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.25rem', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: micError === 'denied' ? '#ef4444' : isAlwaysListening ? '#10b981' : 'var(--accent-cyan)' }}>
                  {micError === 'denied' ? '🚫 MIC BLOCKED' : micError === 'unsupported' ? '⚠️ NOT SUPPORTED' : isAlwaysListening ? '🎙️ LISTENING ("Report Analyzer")' : '🎤 MIC STANDBY'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConsoleExpanded(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontWeight: 'bold',
                    borderRadius: '4px'
                  }}
                  title="Minimize Logs Console"
                  onMouseEnter={(e) => { e.target.style.color = '#ef4444'; e.target.style.background = 'rgba(255,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.4)'; e.target.style.background = 'none'; }}
                >
                  ✕
                </button>
              </div>
              <div className="trace-log-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {reportAnalyzerConsoleLogs.map((log, idx) => {
                  const isSir = log.startsWith("Sir:");
                  const isReportAnalyzer = log.startsWith("ReportAnalyzer:");
                  const logColor = isSir ? '#06b6d4' : (isReportAnalyzer ? '#10b981' : 'var(--text-muted)');
                  return (
                    <div key={idx} className="console-log-item" style={{ color: logColor }}>
                      {log}
                    </div>
                  );
                })}
              </div>
              {isReportAnalyzerThinking && (
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.5rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                  ReportAnalyzer thinking...
                </div>
              )}
            </motion.div>
          )}

          {/* Collapsed Logs Tab Trigger */}
          {!isConsoleExpanded && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setIsConsoleExpanded(true);
              }}
              style={{
                position: 'absolute',
                top: '-32px',
                right: '4px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '0.65rem',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
                letterSpacing: '0.5px'
              }}
              title="Expand Console Logs"
              onMouseEnter={(e) => { e.target.style.borderColor = 'var(--accent-cyan-glow)'; e.target.style.boxShadow = '0 0 10px var(--accent-cyan)'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(6, 182, 212, 0.3)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; }}
            >
              💬 LOGS
            </div>
          )}

          {/* Tony Stark glowing concentric Arc Reactor Core with Microphone */}
          <div 
            onClick={toggleAlwaysListening}
            className={`arc-reactor-core ${isAlwaysListening ? 'arc-reactor-listening' : ''} ${isReportAnalyzerSpeaking ? 'arc-reactor-active' : ''}`}
            title="Toggle Always-On ReportAnalyzer voice command mode"
            style={{ position: 'relative' }}
          >
            <div className="arc-reactor-ring"></div>
            <div className="arc-reactor-triangles"></div>
            {isAlwaysListening ? (
              <Mic size={22} className="arc-reactor-mic-icon active" />
            ) : (
              <MicOff size={22} className="arc-reactor-mic-icon standby" />
            )}
          </div>
        </div>
      )}

      {/* Responsive Flex Header */}
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        position: 'relative'
      }}>
        {/* Status badges & triggers row */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          width: '100%',
          zIndex: 10,
          marginBottom: '0.5rem'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: `1px solid ${status.isLive ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: status.isLive ? '#06b6d4' : '#f59e0b',
            boxShadow: status.isLive ? '0 0 15px rgba(6, 182, 212, 0.15)' : '0 0 15px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textShadow: status.isLive ? '0 0 8px rgba(6, 182, 212, 0.3)' : 'none'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: status.isLive ? '#06b6d4' : '#f59e0b',
              boxShadow: `0 0 8px ${status.isLive ? '#06b6d4' : '#f59e0b'}`,
              display: 'inline-block'
            }}></span>
            {status.mode}
          </div>

          <button 
            onClick={handleReset}
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.05)';
              e.target.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(30, 41, 59, 0.5)';
              e.target.style.color = 'var(--text-muted)';
            }}
          >
            🔄 Diagnostics Reset
          </button>
        </div>

        {/* Dynamic Typography Title */}
        <div style={{ textAlign: 'center' }}>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              margin: 0,
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(6, 182, 212, 0.15)'
            }}
          >
            ReportAnalyzer AI Command Center
          </motion.h1>
          <motion.p 
            className="text-muted"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}
          >
            Holographic Cybernetic Intelligence System, Sir
          </motion.p>
        </div>
        
        {/* Responsive Tab Container */}
        <motion.div 
          className="tab-container"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button 
            className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
            style={{
              borderColor: activeTab === 'news' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === 'news' ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
              color: activeTab === 'news' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
          >
            📰 News Grounding
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('logistics')}
            style={{
              borderColor: activeTab === 'logistics' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === 'logistics' ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
              color: activeTab === 'logistics' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
          >
            🚢 Logistics Radar
          </button>
          <button 
            className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
            style={{
              borderColor: activeTab === 'finance' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === 'finance' ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
              color: activeTab === 'finance' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
          >
            💰 Financial Ledger
          </button>
        </motion.div>
      </header>
 
      <main style={{ position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'news' && (
              <NewsView dbState={dbState} triggerRefresh={triggerRefresh} />
            )}
            {activeTab === 'logistics' && (
              <LogisticsView dbState={dbState} />
            )}
            {activeTab === 'finance' && (
              <FinancialView dbState={dbState} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
