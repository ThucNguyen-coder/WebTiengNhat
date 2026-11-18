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

// Pre-generated natural voices (public/audio, made by `npm run audio`).
// When a sentence has a file it is played; otherwise the browser voice is used.
let manifest = null;
let currentAudio = null;
let currentDone = null; // lets stopSpeaking() report the end, like speechSynthesis.cancel() does
if (typeof window !== 'undefined') {
  fetch('/audio/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { manifest = m?.files || null; })
    .catch(() => { manifest = null; });
}
export const hasRecordedVoice = (text) => !!manifest?.[text];

function speakBrowser(text, rate, onEnd) {
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

export function speak(text, { rate = 0.95, onEnd } = {}) {
  stopSpeaking();
  const file = manifest?.[text];
  if (!file || typeof Audio === 'undefined') {
    speakBrowser(text, rate, onEnd);
    return;
  }
  const audio = new Audio(`/audio/${file}`);
  currentAudio = audio;
  // settings use 0.7 / 0.95 / 1.15 for the browser voice; 0.95 is the natural speed of the files
  audio.playbackRate = Math.min(2, Math.max(0.5, rate / 0.95));
  audio.preservesPitch = true;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };
  currentDone = done;
  audio.addEventListener('ended', done);
  audio.addEventListener('error', () => { if (!finished) { finished = true; speakBrowser(text, rate, onEnd); } });
  audio.play().catch(() => {
    // blocked (e.g. autoplay without a tap on iPhone) or failed: fall back to the browser voice
    if (!finished) { finished = true; speakBrowser(text, rate, onEnd); }
  });
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    const d = currentDone;
    currentDone = null;
    d?.();
  }
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
