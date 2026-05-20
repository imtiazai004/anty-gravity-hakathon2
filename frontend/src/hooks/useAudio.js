/**
 * useAudio — shared hook for ReportAnalyzer synthesized sounds and TTS speech.
 *
 * Eliminates the triplicated playReportAnalyzerSound() / speakText() code that
 * previously lived separately in App.jsx, SupplyChainView.jsx, and NewsView.jsx.
 */

// Shared AudioContext singleton across all consumers (one context per page)
function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!window.sharedAudioCtx) {
    window.sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window.sharedAudioCtx.state === 'suspended') {
    window.sharedAudioCtx.resume();
  }
  return window.sharedAudioCtx;
}

/**
 * Plays a synthesized sound effect.
 * @param {'start'|'beep'|'success'|'error'} type
 */
export function playSound(type) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (type === 'start') {
      // Rising frequency sweep — mic opened / system woke up
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
      // Tech double blip — command captured
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
      // Rising 4-note C major arpeggio — action completed
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
      // Descending sawtooth alarm — warning / failure
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
    console.error('[useAudio] Sound synthesis failed:', e);
  }
}

/**
 * Speaks text via the Web Speech API with a British English / deep male voice.
 * @param {string} text - Text to speak
 * @param {boolean} [muted=false] - If true, skips speech
 * @param {Function} [onEnd] - Optional callback when speech ends
 */
export function speakText(text, muted = false, onEnd) {
  if (muted || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  // Prefer deep British English male voices (JARVIS persona)
  const preferredVoice =
    voices.find(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('david') ||
      v.name.toLowerCase().includes('george') ||
      v.name.toLowerCase().includes('microsoft david') ||
      v.name.toLowerCase().includes('google uk english male')
    ) ||
    voices.find(v => v.lang.startsWith('en-GB')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  if (preferredVoice) u.voice = preferredVoice;
  u.pitch = 0.90;  // Deep resonant masculine tone
  u.rate  = 0.92;  // Slightly deliberate, polished pacing

  if (onEnd) {
    u.onend   = onEnd;
    u.onerror = onEnd;
  }

  window.speechSynthesis.speak(u);
}

/**
 * React hook that returns bound audio helpers for a component.
 * Accepts an optional `muted` boolean ref or state value.
 *
 * Usage:
 *   const { playSound, speak } = useAudio(isMuted);
 */
export function useAudio(muted = false) {
  return {
    playSound,
    speak: (text, onEnd) => speakText(text, muted, onEnd),
  };
}
