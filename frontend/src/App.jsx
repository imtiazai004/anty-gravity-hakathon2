import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import NewsView from './views/NewsView';
import SupplyChainView from './views/SupplyChainView';
import FinancialView from './views/FinancialView';
import { API_URL } from './config';
import { playSound, speakText } from './hooks/useAudio';

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
  const isAwakeRef = useRef(false);
  const awakeTimerRef = useRef(null);
  // Replaces the old window.speechServiceRunningLocked global — useRef is React-safe
  // and resets automatically when the component unmounts (e.g. hot reload, StrictMode).
  const speechLockedRef = useRef(false);

  const getWakeWordGreeting = () => {
    return "Yes, I am here to help. Haan ji, main kya madad kar sakta hoon?";
  };

  // Audio helpers come from the shared useAudio hook — no local duplication needed.
  // playSound and speakText are imported from hooks/useAudio.js

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
      
      playSound('success');
      speakText("Standard operational databases successfully reset, Sir. All metrics restored.");
      setReportAnalyzerConsoleLogs(prev => ["System: Database reset completed.", ...prev.slice(0, 5)]);
    } catch (err) {
      console.error('Failed to reset DB state:', err);
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Fuzzy wake-word detector (handles common speech-to-text mishearings) ---
  const detectWakeWord = (text) => {
    const lower = text.toLowerCase();
    // Common STT variations of "report analyzer"
    const wakePatterns = [
      "report analyzer", "reportanalyzer", "report analyser", "report analyze",
      "report and a lyzer", "report anna lyzer", "report anna laser",
      "reporter analyzer", "report analyzes", "report analysis",
      "hey report", "hey analyzer", "hey analyser",
      "report a nalyzer", "report analyseur", "reportanalyst"
    ];
    for (const pattern of wakePatterns) {
      if (lower.includes(pattern)) {
        // Extract command after the wake word
        const idx = lower.indexOf(pattern);
        const afterWake = text.substring(idx + pattern.length).trim();
        return { detected: true, command: afterWake };
      }
    }
    return { detected: false, command: "" };
  };

  // --- ALWAYS-ON SPEECH LISTENER LOOP INTEGRATION ---
  const toggleAlwaysListening = async () => {
    // Prevent duplicate StrictMode mount loops using a ref (not a window global)
    if (speechLockedRef.current && !listeningRef.current) {
      console.log("Speech service is already running. Ignoring duplicate trigger.");
      return;
    }
    speechLockedRef.current = true;

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
      speechLockedRef.current = false;
      if (window.wakeRecognitionInstance) {
        window.wakeRecognitionInstance.onend = null;
        try { window.wakeRecognitionInstance.stop(); } catch(e) {}
      }
      playSound('error');
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

    // Turn on — play start sound only ONCE here
    playSound('start');

    const createAndStartRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;       // Keep mic open — no on/off cycling!
      recognition.interimResults = false;   // Only fire on finalized sentences
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        listeningRef.current = true;
        setIsAlwaysListening(true);
        setMicError(null);
        
        // ONLY greet on the absolute FIRST launch, NOT during background loop restarts
        if (!hasGreetedRef.current) {
          hasGreetedRef.current = true;
          const initialText = "Report Analyzer system initialized, Sir. I am online and standing by.";
          setReportAnalyzerConsoleLogs(prev => ["System: 🎙️ Active Listening Loop initialized. Standing by...", ...prev.slice(0, 5)]);
          speakText(initialText);
        }
      };

      recognition.onresult = async (event) => {
        // In continuous mode, get the latest final result
        const lastIdx = event.results.length - 1;
        if (!event.results[lastIdx].isFinal) return;

        let transcript = event.results[lastIdx][0].transcript.trim();
        if (!transcript) return;
        console.log("ReportAnalyzer captured input:", transcript);

        const wakeResult = detectWakeWord(transcript);

        if (wakeResult.detected) {
          playSound('beep');
          
          if (wakeResult.command.length > 2) {
            // Wake word AND command in the same chunk
            setReportAnalyzerConsoleLogs(prev => [`You: "${transcript}"`, ...prev.slice(0, 5)]);
            processReportAnalyzerCommand(wakeResult.command);
          } else {
            // Wake word only - go into AWAKE state for 8 seconds
            isAwakeRef.current = true;
            if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
            awakeTimerRef.current = setTimeout(() => {
              isAwakeRef.current = false;
              playSound('error'); // Soft chime to indicate sleep
              setReportAnalyzerConsoleLogs(prev => [`System: ReportAnalyzer returned to standby mode.`, ...prev.slice(0, 5)]);
            }, 8000);

            const greetingText = getWakeWordGreeting();
            speakText(greetingText);
            setReportAnalyzerConsoleLogs(prev => [`ReportAnalyzer: "${greetingText}" (Awake for 8s)`, ...prev.slice(0, 5)]);
          }
        } else if (isAwakeRef.current) {
          // No wake word, but we are currently AWAKE!
          // Treat the entire transcript as a command
          if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
          isAwakeRef.current = false; // Reset state after capturing command
          
          setReportAnalyzerConsoleLogs(prev => [`You: "${transcript}"`, ...prev.slice(0, 5)]);
          processReportAnalyzerCommand(transcript);
        }
      };

      recognition.onerror = (e) => {
        // Silently ignore harmless errors that cause the annoying on/off beeping
        if (e.error === 'no-speech' || e.error === 'aborted') {
          return; // These are normal — no sound, no log, just let onend restart
        }
        console.error("Speech loop error:", e.error);
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          listeningRef.current = false;
          setIsAlwaysListening(false);
          setMicError('denied');
          setReportAnalyzerConsoleLogs(prev => ["System: ❌ Mic blocked! In Chrome: address bar 🔒 → Site Settings → Microphone → Allow → Refresh page.", ...prev.slice(0, 5)]);
        } else if (e.error === 'network') {
          console.warn('Speech network error, will retry on next cycle...');
        }
      };

      recognition.onend = () => {
        // Silently restart after a short delay to prevent rapid cycling on mobile
        if (listeningRef.current) {
          setTimeout(() => {
            if (listeningRef.current) {
              try {
                createAndStartRecognition();
              } catch (err) {
                console.error("Loop restart failed:", err);
              }
            }
          }, 600); // 600ms breathing room prevents InvalidStateError on mobile
        }
      };

      window.wakeRecognitionInstance = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.error("Recognition start failed:", err);
      }
    };

    createAndStartRecognition();
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

      // 3. Send raw command to the True LLM Orchestrator
      const lowerCmd = command.toLowerCase();
      if (lowerCmd.includes("reset") || lowerCmd.includes("clear") || lowerCmd.includes("database")) {
        handleReset();
      } else {
        const orchestrateRes = await fetch(API_URL + '/api/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command })
        });
        const orchestrateData = await orchestrateRes.json();
        
        if (orchestrateData.targetView) {
          setActiveTab(orchestrateData.targetView);
        }
        
        triggerRefresh(); // Refresh DB states
        playSound('success');
        
        if (orchestrateData.spokenBriefing) {
          speakText(orchestrateData.spokenBriefing);
          setReportAnalyzerConsoleLogs(prev => [`System: ${orchestrateData.spokenBriefing}`, ...prev.slice(0, 5)]);
        }
      }

    } catch (err) {
      console.error(err);
      playSound('error');
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
                playSound('success');
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
              playSound('beep');
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
