// Web Speech API helpers: Japanese text-to-speech and speech recognition.

let cachedVoice = null;

function pickVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
  if (!ja.length) return null;
  // Prefer natural/online voices when available (Edge "Natural", Google 日本語)
  cachedVoice =
    ja.find((v) => /natural|online/i.test(v.name)) ||
    ja.find((v) => /google/i.test(v.name)) ||
    ja[0];
  return cachedVoice;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = () => pickVoice();
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const hasJapaneseVoice = () => !!(cachedVoice || pickVoice());

export function speak(text, { rate = 0.95, onEnd } = {}) {
  if (!ttsSupported()) { onEnd?.(); return; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  const v = cachedVoice || pickVoice();
  if (v) u.voice = v;
  u.rate = rate;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  synth.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const recognitionSupported = () => !!Recognition;

// Starts Japanese recognition. Returns a stop() function.
export function listen({ onResult, onEnd, onError }) {
  if (!Recognition) { onError?.('unsupported'); return () => {}; }
  const rec = new Recognition();
  rec.lang = 'ja-JP';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onResult?.(finalText + interim, !interim);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.(finalText);
  try { rec.start(); } catch { onError?.('start-failed'); }
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

// Short UI sound effects synthesized with WebAudio (no asset files).
let ctx = null;
export function blip(kind = 'ok', enabled = true) {
  if (!enabled) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const presets = {
      ok: { type: 'triangle', f: [660, 990], d: 0.14 },
      laser: { type: 'square', f: [1200, 300], d: 0.12 },
      bad: { type: 'sawtooth', f: [220, 140], d: 0.18 },
      hit: { type: 'sine', f: [180, 60], d: 0.3 },
      key: { type: 'sine', f: [880, 880], d: 0.03 },
    };
    const p = presets[kind] || presets.ok;
    o.type = p.type;
    o.frequency.setValueAtTime(p.f[0], now);
    o.frequency.exponentialRampToValueAtTime(p.f[1], now + p.d);
    g.gain.setValueAtTime(kind === 'key' ? 0.02 : 0.07, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + p.d);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + p.d + 0.02);
  } catch { /* audio unavailable */ }
}
