// Tiers, unlocking, stars and the helpers that build easier answer modes
// (vocabulary preview, fill-in blanks) out of the existing scenario data.
import { SCENARIOS, DIFFICULTIES } from '../data/relay';
import { EASY_SCENARIOS } from '../data/relayEasy';
import { isKana } from './kana';

export { DIFFICULTIES };

export const TIERS = [
  { id: 1, label: 'Bậc 1', name: 'Nhập môn', desc: 'Lời nhắn ngắn, ghép thẻ từ là xong.', mode: 'tiles' },
  { id: 2, label: 'Bậc 2', name: 'Làm quen', desc: 'Nhớ các ý chính rồi điền vào câu.', mode: 'fill' },
  { id: 3, label: 'Bậc 3', name: 'Thử thách', desc: 'Nghe câu dài, tự nói hoặc gõ lại.', mode: 'speak' },
];

// Scenarios in data/relay.js may set `tier`; otherwise short N5 messages are tier 2, the rest tier 3.
function deriveTier(sc) {
  const short = sc.steps.every((st) => st.message.jp.length <= 40);
  return sc.level === 'N5' && short ? 2 : 3;
}

export const ALL_SCENARIOS = [
  ...EASY_SCENARIOS,
  ...SCENARIOS.map((sc) => ({ ...sc, tier: sc.tier ?? deriveTier(sc) })),
];

export const scenarioById = (id) => ALL_SCENARIOS.find((sc) => sc.id === id);
export const scenariosOfTier = (tier) => ALL_SCENARIOS.filter((sc) => sc.tier === tier);

/* ---------- stars and delivery ---------- */

export const PASS_SCORE = 60;
export const starsOf = (score) => (score >= 85 ? 3 : score >= PASS_SCORE ? 2 : score >= 30 ? 1 : 0);
export const delivered = (score) => score != null && score >= PASS_SCORE;

export const UNLOCK_NEED = 3; // letters delivered in the tier below
export function tierProgress(tier, relay) {
  const prev = tier - 1;
  if (prev < 1) return { unlocked: true, have: 0, need: 0 };
  const have = scenariosOfTier(prev).filter((sc) => delivered(relay[sc.id])).length;
  const need = Math.min(UNLOCK_NEED, scenariosOfTier(prev).length);
  return { unlocked: have >= need, have, need };
}
export const tierUnlocked = (tier, relay, unlockAll) => unlockAll || tierProgress(tier, relay).unlocked;

/* ---------- vocabulary preview ---------- */

const formIn = (kp, text) =>
  [...kp.accept].sort((a, b) => b.length - a.length).find((f) => text.includes(f));

// Key words of a step (word + reading + Vietnamese meaning), taken from its key points.
export function previewWords(step) {
  const seen = new Set();
  const out = [];
  step.keypoints.forEach((kp) => {
    const jp = formIn(kp, step.model.jp) || formIn(kp, step.message.jp) || kp.accept[0];
    if (seen.has(jp)) return;
    seen.add(jp);
    out.push({ jp, kana: kp.accept.find((a) => isKana(a)) || jp, vi: kp.vi });
  });
  return out.slice(0, 4);
}

/* ---------- fill-in blanks ---------- */

let pool = null;
function formPool() {
  if (pool) return pool;
  pool = new Map(); // label -> [{form, kana}]
  ALL_SCENARIOS.forEach((sc) =>
    sc.steps.forEach((st) =>
      st.keypoints.forEach((kp) => {
        const form = formIn(kp, st.model.jp);
        if (!form || form.length > 8) return;
        const list = pool.get(kp.label) || [];
        if (!list.some((x) => x.form === form)) list.push({ form, kana: kp.accept.find((a) => isKana(a)) || form });
        pool.set(kp.label, list);
      }),
    ),
  );
  return pool;
}

const pickSome = (list, n) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

// Turns the model sentence into a sentence with blanks: the key points become the blanks.
// Returns null when no key point can be found inside the sentence.
export function buildFill(step) {
  const text = step.model.jp;
  const found = [];
  step.keypoints.forEach((kp, kpIndex) => {
    const form = formIn(kp, text);
    if (!form || form.length > 8) return;
    found.push({ kp, kpIndex, form, at: text.indexOf(form) });
  });
  found.sort((a, b) => a.at - b.at);
  const picked = [];
  let end = -1;
  for (const f of found) {
    if (f.at >= end && picked.length < 3) {
      picked.push(f);
      end = f.at + f.form.length;
    }
  }
  if (!picked.length) return null;

  const all = [...formPool().values()].flat();
  const blanks = picked.map((f) => {
    const answer = { form: f.form, kana: f.kp.accept.find((a) => isKana(a)) || f.form };
    const clash = (x) => x.form === f.form || x.form.includes(f.form) || f.form.includes(x.form);
    let decoys = pickSome((formPool().get(f.kp.label) || []).filter((x) => !clash(x)), 2);
    if (decoys.length < 2) {
      const more = pickSome(all.filter((x) => !clash(x) && !decoys.some((d) => d.form === x.form)), 2 - decoys.length);
      decoys = [...decoys, ...more];
    }
    return {
      kpIndex: f.kpIndex,
      label: f.kp.label,
      vi: f.kp.vi,
      answer,
      options: pickSome([answer, ...decoys], 3),
    };
  });

  const segs = [];
  let cursor = 0;
  picked.forEach((f, i) => {
    if (f.at > cursor) segs.push({ text: text.slice(cursor, f.at) });
    segs.push({ blank: i });
    cursor = f.at + f.form.length;
  });
  if (cursor < text.length) segs.push({ text: text.slice(cursor) });
  return { segs, blanks };
}

/* ---------- friendly feedback ---------- */

const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
export function feedbackText(step, hits) {
  const got = [];
  const missing = [];
  step.keypoints.forEach((kp, i) => {
    if (hits[i] === null || hits[i] === undefined) return;
    (hits[i] ? got : missing).push(kp);
  });
  if (!missing.length) return `Tuyệt vời! Bạn đã nhắn đủ ${got.length} ý.`;
  const have = got.length ? `Bạn đã nhắn đúng: ${got.map((k) => k.vi).join(', ')}. ` : 'Chưa có ý nào tới nơi. ';
  return `${have}Còn thiếu: ${missing.map((k) => lower(k.label)).join(', ')}.`;
}
