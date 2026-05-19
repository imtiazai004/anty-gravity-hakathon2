import React, { useState, useEffect } from 'react';
import AgentTraceView from '../components/AgentTraceView';
import { API_URL } from '../config';

function NewsView({ dbState, triggerRefresh }) {
  const [inputText, setInputText] = useState('News article about crude oil fuel price increase and supply shortages...');
  const [traces, setTraces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState([]);

  // Voice Agent States
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const getActiveStepIndex = () => {
    if (!isProcessing) return -1;
    // Map active pipeline indices: 
    // Ingestion (0), Insight (1), Impact (2), Action (3), Simulator (4)
    return traces.length;
  };

  // Synth sounds
  const playReportAnalyzerSound = (type) => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(850, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
          }, i * 70);
        });
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(160, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      }
    } catch(e) {}
  };

  const speakText = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v => v.lang.startsWith('en-GB') || v.name.includes('UK') || v.name.includes('British')) || voices[0];
    if (britishVoice) u.voice = britishVoice;
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  // Fetch live articles matching text alert
  const fetchMatchingNews = async (query) => {
    try {
      const res = await fetch(`${API_URL}/api/news/scrape?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setNewsHeadlines(data.slice(0, 3));
    } catch(e) {
      console.error(e);
    }
  };

  // Trigger initial live news crawl on mount
  useEffect(() => {
    fetchMatchingNews("oil fuel prices");
  }, []);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      if (window.recognitionInstance) window.recognitionInstance.stop();
      setIsListening(false);
      return;
    }
    playReportAnalyzerSound('start');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      playReportAnalyzerSound('beep');
      speakText(`Understood, Sir. News instruction parsed: ${transcript}.`);
    };
    recognition.onend = () => setIsListening(false);
    window.recognitionInstance = recognition;
    recognition.start();
  };

  const handleSimulate = async () => {
    setIsProcessing(true);
    setTraces([]);
    playReportAnalyzerSound('beep');
    speakText("Parsing unstructured alert, Sir. Grounding search queries on global news tickers.");

    try {
      const response = await fetch(`${API_URL}/api/scenarios/supplyChain/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: inputText })
      });
      const data = await response.json();
      
      const mappedTraces = data.trace.map(t => ({
        title: t.action,
        content: t.details
      }));
      setTraces(mappedTraces);
      
      // Update the live headlines list as well
      fetchMatchingNews(inputText);

      triggerRefresh();

      if (data.trace && data.trace.length > 0) {
        const lastStep = data.trace[data.trace.length - 1];
        playReportAnalyzerSound('success');
        speakText(`Scan resolved, Sir. Surcharge schedules recalculated.`);
      }
    } catch (error) {
      playReportAnalyzerSound('error');
      setTraces([{ title: 'Error', content: 'Connection gridlocks on agent orchestrator.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Column 1: Alert Ingestion & Agent Voice Controls */}
      <div className="glass-panel holographic-panel">
        <div className="laser-scan-line"></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>📰 Unstructured Report Ingestion</h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button 
              onClick={handleVoiceInput}
              style={{
                background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                border: isListening ? '1px solid #ef4444' : '1px solid rgba(6, 182, 212, 0.2)',
                color: 'var(--text-main)', padding: '0.35rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {isListening ? '🛑 Stop' : '🎙️ Voice input'}
            </button>
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) window.speechSynthesis?.cancel();
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: isMuted ? 'var(--text-muted)' : '#06b6d4', padding: '0.35rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {isMuted ? '🔇 Mute' : '🔊 Vocals'}
            </button>
          </div>
        </div>

        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            width: '100%', height: '110px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(6, 182, 212, 0.25)',
            color: 'var(--text-main)', borderRadius: '6px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none', marginBottom: '1rem', position: 'relative', zIndex: 10
          }}
        />

        <button 
          className="btn-primary" 
          onClick={handleSimulate} 
          disabled={isProcessing}
          style={{ width: '100%', padding: '0.7rem', fontWeight: '600', background: 'linear-gradient(135deg, #0891b2, #2563eb)', border: '1px solid rgba(6, 182, 212, 0.4)', position: 'relative', zIndex: 10 }}
        >
          {isProcessing ? '⚡ Analyzing News feeds...' : 'Analyze Market Signals'}
        </button>

        {/* Glowing visual agent pipeline flow */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(6, 182, 212, 0.15)',
          borderRadius: '8px',
          padding: '0.75rem 0.5rem',
          marginTop: '1rem',
          position: 'relative',
          zIndex: 10,
          boxShadow: 'inset 0 0 12px rgba(6, 182, 212, 0.05)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#06b6d4', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }}></span>
            Agent Pipeline
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.15rem' }}>
            
            {/* Step 1: Ingestion */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0.2rem', borderRadius: '4px',
              background: getActiveStepIndex() === 0 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: getActiveStepIndex() === 0 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              boxShadow: getActiveStepIndex() === 0 ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              transform: getActiveStepIndex() === 0 ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>📥</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main)' }}>Ingestion</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.1' }}>Reads & cleans</div>
            </div>

            <div style={{ color: getActiveStepIndex() === 0 ? '#06b6d4' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.3s' }}>→</div>

            {/* Step 2: Insight */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0.2rem', borderRadius: '4px',
              background: getActiveStepIndex() === 1 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: getActiveStepIndex() === 1 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              boxShadow: getActiveStepIndex() === 1 ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              transform: getActiveStepIndex() === 1 ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>🔍</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main)' }}>Insight</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.1' }}>Extracts patterns</div>
            </div>

            <div style={{ color: getActiveStepIndex() === 1 ? '#06b6d4' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.3s' }}>→</div>

            {/* Step 3: Impact */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0.2rem', borderRadius: '4px',
              background: getActiveStepIndex() === 2 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: getActiveStepIndex() === 2 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              boxShadow: getActiveStepIndex() === 2 ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              transform: getActiveStepIndex() === 2 ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>⚡</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main)' }}>Impact</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.1' }}>Analyzes severity</div>
            </div>

            <div style={{ color: getActiveStepIndex() === 2 ? '#06b6d4' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.3s' }}>→</div>

            {/* Step 4: Action */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0.2rem', borderRadius: '4px',
              background: getActiveStepIndex() === 3 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: getActiveStepIndex() === 3 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              boxShadow: getActiveStepIndex() === 3 ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              transform: getActiveStepIndex() === 3 ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>🎯</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main)' }}>Action</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.1' }}>Generates actions</div>
            </div>

            <div style={{ color: getActiveStepIndex() === 3 ? '#06b6d4' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.3s' }}>→</div>

            {/* Step 5: Simulator */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0.2rem', borderRadius: '4px',
              background: getActiveStepIndex() === 4 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: getActiveStepIndex() === 4 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              boxShadow: getActiveStepIndex() === 4 ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              transform: getActiveStepIndex() === 4 ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>🤖</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main)' }}>Simulator</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.1' }}>Executes actions</div>
            </div>

          </div>
        </div>

        <h3 style={{ marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-main)', position: 'relative', zIndex: 10 }}>
          Trace Analysis
        </h3>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <AgentTraceView traces={traces} isProcessing={isProcessing} />
        </div>
      </div>

      {/* Column 2: Live News Grounding Feed */}
      <div className="glass-panel holographic-panel">
        <div className="laser-scan-line"></div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>🌐 Google News Press Wires</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 10 }}>
          {newsHeadlines.length > 0 ? (
            newsHeadlines.map((article, idx) => (
              <a 
                key={idx}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(6, 182, 212, 0.1)',
                  padding: '1rem', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'; e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.1)'; e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#06b6d4', fontWeight: 'bold', marginBottom: '0.35rem' }}>
                  <span>📢 {article.source || "Google RSS Feed"}</span>
                  <span>{article.time || "Today"}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500', lineHeight: '1.4' }}>{article.title}</div>
              </a>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '2rem' }}>
              Scanning local satellites for wire broadcasts...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewsView;
