// Creates natural Japanese audio (Google Cloud Text-to-Speech) for every word, kana and
// relay sentence the app can read aloud, and writes public/audio/manifest.json.
// Only missing files are created, so re-running costs almost nothing.
//
//   GOOGLE_TTS_API_KEY   API key restricted to "Cloud Text-to-Speech API" (secret: never VITE_)
//   GOOGLE_TTS_VOICE     optional, default ja-JP-Chirp3-HD-Aoede (e.g. ja-JP-Neural2-B)
//
// Usage: npm run audio            create missing files
//        npm run audio -- --dry   only count what would be created
//        npm run audio -- --prune also delete files no longer used
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOPICS } from '../src/data/vocab';
import { chart } from '../src/data/kanaChart';
import { ALL_SCENARIOS, previewWords } from '../src/lib/relayTiers';

const DIR = 'public/audio';
const VOICE = process.env.GOOGLE_TTS_VOICE || 'ja-JP-Chirp3-HD-Aoede';
const KEY = process.env.GOOGLE_TTS_API_KEY;
const args = process.argv.slice(3);
const DRY = args.includes('--dry');
const PRUNE = args.includes('--prune');

// The exact strings the app passes to speak(): keep in sync with the calls in src/.
export function collectTexts() {
  const set = new Set(['こんにちは、よろしくおねがいします']); // voice-speed preview in Settings
  TOPICS.forEach((t) => t.words.forEach((w) => set.add(w.kana)));
  chart('hira').forEach((sec) => sec.rows.flat().forEach((c) => c && set.add(c.hira)));
  ALL_SCENARIOS.forEach((sc) =>
    sc.steps.forEach((st) => {
      set.add(st.message.jp);
      set.add(st.model.jp);
      (st.chunks || []).forEach((c) => set.add(c.kana));
      (st.extra || []).forEach((c) => set.add(c.kana));
      previewWords(st).forEach((w) => set.add(w.kana));
    }),
  );
  return [...set].filter((t) => t && t.trim());
}

const fileFor = (text) => createHash('sha1').update(`${VOICE}|${text}`).digest('hex').slice(0, 16) + '.mp3';

async function synthesize(text) {
  const body = {
    input: { text },
    voice: { languageCode: 'ja-JP', name: VOICE },
    audioConfig: { audioEncoding: 'MP3' },
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { audioContent } = await res.json();
      return Buffer.from(audioContent, 'base64');
    }
    const msg = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${msg.slice(0, 300)}`);
  }
  throw new Error('unreachable');
}

export async function generateAudio() {
  mkdirSync(DIR, { recursive: true });
  const texts = collectTexts();
  const files = {};
  const todo = [];
  for (const t of texts) {
    const f = fileFor(t);
    files[t] = f;
    if (!existsSync(join(DIR, f))) todo.push(t);
  }
  const chars = todo.reduce((n, t) => n + [...t].length, 0);
  console.log(`[audio] ${texts.length} câu/từ, cần tạo mới ${todo.length} file (${chars} ký tự), giọng ${VOICE}.`);

  if (todo.length && !DRY) {
    if (!KEY) {
      console.log('[audio] Chưa có GOOGLE_TTS_API_KEY, bỏ qua tạo file mới. Web sẽ dùng giọng của trình duyệt cho phần còn thiếu.');
    } else {
      let done = 0;
      let failed = 0;
      const queue = [...todo];
      const worker = async () => {
        while (queue.length) {
          const t = queue.shift();
          try {
            writeFileSync(join(DIR, files[t]), await synthesize(t));
            done++;
          } catch (err) {
            failed++;
            delete files[t];
            if (failed <= 3) console.warn(`[audio] Lỗi khi tạo "${t}": ${err.message}`);
            if (/API key|PERMISSION_DENIED|billing|disabled/i.test(err.message)) queue.length = 0;
          }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      console.log(`[audio] Đã tạo ${done} file${failed ? `, lỗi ${failed}` : ''}.`);
      if (failed) console.warn('[audio] Nếu lỗi do tên giọng, thử đặt GOOGLE_TTS_VOICE=ja-JP-Neural2-B.');
    }
  }

  // manifest lists only files that exist
  const manifest = {};
  for (const [t, f] of Object.entries(files)) if (existsSync(join(DIR, f))) manifest[t] = f;
  if (!DRY) {
    const out = JSON.stringify({ voice: VOICE, files: manifest }, null, 1) + '\n';
    const p = join(DIR, 'manifest.json');
    if (!existsSync(p) || readFileSync(p, 'utf8') !== out) writeFileSync(p, out);
  }
  console.log(`[audio] Manifest: ${Object.keys(manifest).length}/${texts.length} câu/từ đã có giọng AI.`);

  if (PRUNE && !DRY) {
    const used = new Set(Object.values(manifest));
    const stale = readdirSync(DIR).filter((f) => f.endsWith('.mp3') && !used.has(f));
    stale.forEach((f) => unlinkSync(join(DIR, f)));
    console.log(`[audio] Đã xóa ${stale.length} file không còn dùng.`);
  }
}

if (process.argv[2]?.endsWith('gen-audio.js')) await generateAudio();
