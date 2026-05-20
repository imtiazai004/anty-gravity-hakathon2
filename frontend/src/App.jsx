import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import NewsView from './views/NewsView';
import SupplyChainView from './views/SupplyChainView';
import HealthcareView from './views/HealthcareView';
import FinancialView from './views/FinancialView';
import { API_URL } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('news');
  const [status, setStatus] = useState({ isLive: false, mode: 'Connecting...' });
  const [dbState, setDbState] = useState({ shipments: [], inventory: [], staffing: [], logs: [], finance: [], fuelSurchargeRate: 5, draftedNotification: "", shippingCostMultiplier: 1.0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Mobile Audio block (Defaulted to false for direct immersive onboarding & browser gesture security!)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // --- ALWAYS-ON CONVERSATIONAL REPORT_ANALYZER AI CORE STATE ---
  const [isAlwaysListening, setIsAlwaysListening] = useState(false);
  const [micError, setMicError] = useState(null); // 'denied' | 'unsupported' | null
  const [isReportAnalyzerThinking, setIsReportAnalyzerThinking] = useState(false);
  const [isReportAnalyzerSpeaking, setIsReportAnalyzerSpeaking] = useState(false);
  const [voicePersona, setVoicePersona] = useState('male');
  const [reportAnalyzerConsoleLogs, setReportAnalyzerConsoleLogs] = useState([
    "System: Standing by. Hands-free active listening loop initialized."
  ]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // useRef to avoid stale closure inside recognition.onend
  const listeningRef = useRef(false);
  const hasGreetedRef = useRef(false);

  const getWakeWordGreeting = () => {
    return "Yes, I am here to help. Haan ji, main kya madad kar sakta hoon?";
  };

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

  // Programmatic HTML5 Web Audio Synth SFX
  const playReportAnalyzerSound = (type) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
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
    
    // Find a premium masculine/deep voice (like David, George, Microsoft David, Google UK English Male, etc.)
    const maleVoice = voices.find(v => 
      v.name.toLowerCase().includes('male') || 
      v.name.toLowerCase().includes('david') || 
      v.name.toLowerCase().includes('george') || 
      v.name.toLowerCase().includes('microsoft david') ||
      v.name.toLowerCase().includes('google uk english male')
    ) || voices.find(v => v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (maleVoice) {
      u.voice = maleVoice;
    }
    u.pitch = 0.90; // Deep resonant masculine tone
    u.rate = 0.92;

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
    // Global lock to prevent duplicate StrictMode mount loops!
    if (window.speechServiceRunningLocked && !listeningRef.current) {
      console.log("Speech service is already running. Ignoring duplicate trigger.");
      return;
    }
    window.speechServiceRunningLocked = true;

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
      window.speechServiceRunningLocked = false;
      if (window.wakeRecognitionInstance) {
        window.wakeRecognitionInstance.onend = null;
        try { window.wakeRecognitionInstance.stop(); } catch(e) {}
      }
      playReportAnalyzerSound('error');
      setReportAnalyzerConsoleLogs(prev => ["System: Voice command listener deactivated.", ...prev.slice(0, 5)]);
      return;
    }

    // Request mic permission explicitly first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('unsupported');
      setReportAnalyzerConsoleLogs(prev => ["System: ❌ Microphone access not supported or blocked (requires HTTPS/localhost).", ...prev.slice(0, 5)]);
      return;
    }

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
        const initialText = "Report Analyzer system initialized, Sir. I am online and standing by.";
        setReportAnalyzerConsoleLogs(prev => ["System: 🎙️ Active Listening Loop initialized. Standing by...", ...prev.slice(0, 5)]);
        speakText(initialText);
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
          const greetingText = getWakeWordGreeting();
          speakText(greetingText);
          setReportAnalyzerConsoleLogs(prev => [`ReportAnalyzer: "${greetingText}"`, ...prev.slice(0, 5)]);
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
    const pronoun = voicePersona === 'male' ? 'Sir' : "Ma'am";
    setReportAnalyzerConsoleLogs(prev => [`${voicePersona === 'male' ? 'Sir' : 'Ma\'am'}: "${command}"`, ...prev.slice(0, 5)]);

    try {
      // 1. Get conversational reply from backend
      const chatRes = await fetch(API_URL + '/api/reportAnalyzer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: command })
      });
      const chatData = await chatRes.json();
      
      // 2. Speak ReportAnalyzer's initial quick response
      speakText(chatData.reply);
      setReportAnalyzerConsoleLogs(prev => [`ReportAnalyzer: "${chatData.reply}"`, ...prev.slice(0, 5)]);

      // 3. Detect operational keywords to auto-orchestrate actual simulated agents!
      const lowerCmd = command.toLowerCase();
      
      if (lowerCmd.includes("news") || lowerCmd.includes("google") || lowerCmd.includes("supply") || lowerCmd.includes("shipment") || lowerCmd.includes("strike") || lowerCmd.includes("la") || lowerCmd.includes("route") || lowerCmd.includes("port")) {
        // Redirect tab visual view
        setActiveTab('supply');
        
        setTimeout(async () => {
          speakText(`Initiating logistics mitigation protocols, ${pronoun}. Executing container rerouting schedules. STAND BY.`);
          try {
            await fetch(API_URL + '/api/scenarios/supplyChain/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: "Divert electronics cargo bound for Port of LA due to union labor gridlock strike." })
            });
            // Update database states in UI
            triggerRefresh();
            playReportAnalyzerSound('success');
            
            // Rich Audio Briefing explaining what is done and next steps!
            const supplyBriefing = `Status briefing, ${pronoun}. A labor union strike was reported at the Port of Los Angeles, exposing our high-priority cargo Shipment ID-8842 to severe gridlocks. To mitigate stockout risks for SKU-90210, I have successfully diverted the shipment to the Port of Seattle. Standard delivery ledgers have been adjusted with an updated 18 percent fuel surcharge. Moving forward, ${pronoun}, I recommend auditing inland truck dispatch schedules in Seattle to expedite final warehouse delivery. Standing by.`;
            speakText(supplyBriefing);
            setReportAnalyzerConsoleLogs(prev => [`System: ${supplyBriefing}`, ...prev.slice(0, 5)]);
          } catch (e) {
            console.error(e);
          }
        }, 3000);
      } 
      else if (lowerCmd.includes("nurse") || lowerCmd.includes("hospital") || lowerCmd.includes("healthcare") || lowerCmd.includes("staff") || lowerCmd.includes("icu") || lowerCmd.includes("shortage")) {
        setActiveTab('healthcare');
        
        setTimeout(async () => {
          speakText(`Initiating healthcare safety protocols, ${pronoun}. Conducting medical staffing audit. STAND BY.`);
          try {
            await fetch(API_URL + '/api/scenarios/healthcare/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: "Resolve staffing shortages. Reallocate SDU nurses to balance critical ICU safety limit ratios." })
            });
            // Update database states in UI
            triggerRefresh();
            playReportAnalyzerSound('success');
            
            // Rich Audio Briefing explaining what is done and next steps!
            const healthBriefing = `Status briefing, ${pronoun}. Severe nursing staff deficits were flagged at the General Hospital ICU, causing safe patient safety ratios to exceed standard regulatory limits. To secure patient safety, I have reallocated nurse resources from Step-Down Units directly to the ICU, restoring the safety index to stable levels. Moving forward, ${pronoun}, we must initiate priority agency nurse hiring campaigns to offset the high ICU census over the next seventy-two hours. Standing by.`;
            speakText(healthBriefing);
            setReportAnalyzerConsoleLogs(prev => [`System: ${healthBriefing}`, ...prev.slice(0, 5)]);
          } catch (e) {
            console.error(e);
          }
        }, 3000);
      }
      else if (lowerCmd.includes("reset") || lowerCmd.includes("clear") || lowerCmd.includes("database")) {
        handleReset();
      }

    } catch (err) {
      console.error(err);
      playReportAnalyzerSound('error');
      speakText(`Apologies, ${pronoun}. A communication delay occurred on the neural mainframe.`);
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
                // Synchronously activate always-listening wake-word mode!
                await toggleAlwaysListening();
              }}
            >
              INITIALIZE REPORT_ANALYZER DIAGNOSTICS
            </button>
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

          {/* Glowing Minimalist Header Voice Status Badge Button */}
          <button
            onClick={() => {
              playReportAnalyzerSound('beep');
              toggleAlwaysListening();
            }}
            style={{
              background: isAlwaysListening ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.7)',
              border: `1px solid ${isAlwaysListening ? '#10b981' : micError === 'denied' ? '#ef4444' : 'rgba(6, 182, 212, 0.4)'}`,
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: isAlwaysListening ? '#10b981' : micError === 'denied' ? '#ef4444' : '#06b6d4',
              boxShadow: isAlwaysListening ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '34px'
            }}
            title={micError === 'denied' ? 'Mic Blocked! Click to re-request permission' : 'Click to initialize or toggle Voice System Mode'}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isAlwaysListening ? '#10b981' : micError === 'denied' ? '#ef4444' : '#06b6d4',
              boxShadow: `0 0 8px ${isAlwaysListening ? '#10b981' : micError === 'denied' ? '#ef4444' : '#06b6d4'}`,
              display: 'inline-block',
              animation: isAlwaysListening ? 'micPulse 1.5s infinite' : 'none'
            }}></span>
            {micError === 'denied' ? '🚫 MIC BLOCKED' : isAlwaysListening ? '🎙️ VOICE ACTIVE' : '🎤 VOICE STANDBY'}
          </button>

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
            className={`tab-btn ${activeTab === 'supply' ? 'active' : ''}`}
            onClick={() => setActiveTab('supply')}
            style={{
              borderColor: activeTab === 'supply' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === 'supply' ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
              color: activeTab === 'supply' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
          >
            🚢 Supply Chain
          </button>
          <button 
            className={`tab-btn ${activeTab === 'healthcare' ? 'active' : ''}`}
            onClick={() => setActiveTab('healthcare')}
            style={{
              borderColor: activeTab === 'healthcare' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === 'healthcare' ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
              color: activeTab === 'healthcare' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
          >
            🏥 Healthcare Control
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
            {activeTab === 'supply' && (
              <SupplyChainView dbState={dbState} triggerRefresh={triggerRefresh} />
            )}
            {activeTab === 'healthcare' && (
              <HealthcareView dbState={dbState} triggerRefresh={triggerRefresh} />
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
