// Google Sheet <-> app content.
// The sheet has three tabs (each published as CSV):
//   ChuDe     : id | title | jp_title | level | color | icon
//   TuVung    : topic_id | jp | kana | vi
//   TruyenTin : id | title | place | level | tier | from | to |
//               message_jp | message_kana | message_vi | model_jp | model_kana | model_vi |
//               keypoints | chunks | extra
// One TruyenTin row is one step; rows with the same id form one scenario, in order.
//   from / to : "田中さん | たなかさん | Đồng nghiệp | 田 | ai"   (name | reading | role | avatar glyph | colour)
//   keypoints : one per line  "Khi nào | 3 giờ | 三時, 3時, さんじ"   (label | Vietnamese | accepted forms)
//   chunks    : word tiles for tier 1, "お兄ちゃん=おにいちゃん / ごはん / だよ"  (jp=reading, reading optional for kana)
//   extra     : decoy tiles, same format as chunks
import { tokenize, matchRomaji, kanaToRomaji, normalizeJa, isKana } from '../lib/kana';

export const TONES = ['shu', 'ai', 'matcha', 'yamabuki', 'sakura'];
export const ICONS = [
  'HandWaving', 'UsersThree', 'Clock', 'BowlFood', 'Train', 'Student', 'Briefcase', 'MapPin', 'CloudSun',
  'Lightning', 'ShoppingCart', 'Heartbeat', 'House', 'Smiley', 'Sparkle', 'Suitcase', 'SoccerBall',
];

const typeable = (kana) => {
  try {
    const units = tokenize(kana);
    return units.length > 0 && matchRomaji(units, kanaToRomaji(kana)).done;
  } catch {
    return false;
  }
};
const kanaOnly = (s) => isKana(s.replace(/ー/g, 'ー'));
// Sentence readings (and word tiles) may also hold punctuation and spaces.
const SENTENCE_MARKS = /[\s、。，．,.!?！？「」『』（）()・…〜~―-]/g;
export const sentenceKana = (s) => { const t = s.replace(SENTENCE_MARKS, ''); return t.length > 0 && kanaOnly(t); };

const KANA_MSG = 'chỉ được có hiragana hoặc katakana (không kanji, không chữ Latin)';

// Checks one word the way the app needs it. Returns { field, msg } or null when fine.
// Used by the Google Sheet import and by the "Quản lý nội dung" page.
export function wordProblem({ jp = '', kana = '', vi = '' }) {
  if (!jp.trim()) return { field: 'jp', msg: 'Cần nhập chữ Nhật' };
  if (!kana.trim()) return { field: 'kana', msg: 'Cần nhập cách đọc' };
  if (!kanaOnly(kana.trim())) return { field: 'kana', msg: 'Cách đọc chỉ được có hiragana hoặc katakana (không kanji, không chữ Latin)' };
  if (!typeable(kana.trim())) return { field: 'kana', msg: 'Cách đọc này không gõ được bằng romaji, hãy kiểm tra lại' };
  if (!vi.trim()) return { field: 'vi', msg: 'Cần nhập nghĩa tiếng Việt' };
  if (jp.trim().length > 40 || kana.trim().length > 40) return { field: 'jp', msg: 'Từ quá dài (tối đa 40 ký tự)' };
  if (vi.trim().length > 80) return { field: 'vi', msg: 'Nghĩa quá dài (tối đa 80 ký tự)' };
  return null;
}

// "Đồ ăn & thức uống" -> "do-an-thuc-uong"
export function slugify(text) {
  return text
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/* ---------- small checks shared by the sheet import and the "Quản lý nội dung" page ---------- */

// Reading of a name or a word tile: kana only. Returns a message or ''.
export function readingProblem(kana = '') {
  if (!kana.trim()) return 'Cần nhập cách đọc';
  return kanaOnly(kana.trim()) ? '' : `Cách đọc ${KANA_MSG}`;
}

// Reading of a whole sentence: kana plus punctuation. Returns a message or ''.
export function sentenceReadingProblem(kana = '') {
  if (!kana.trim()) return 'Cần nhập cách đọc';
  return sentenceKana(kana.trim()) ? '' : `Cách đọc ${KANA_MSG}`;
}

// A key point { label, vi, accept: [...] }. Returns a message or ''.
export function keypointProblem(kp) {
  if (!kp.label?.trim()) return 'Cần nhãn (ví dụ: Khi nào)';
  if (!kp.vi?.trim()) return 'Cần nghĩa tiếng Việt';
  if (!kp.accept?.length) return 'Cần ít nhất một cách viết được chấp nhận';
  return '';
}

// Do the word tiles, put together in order, give the model sentence?
export const tilesMatch = (chunks, modelJp) =>
  chunks.length > 0 && normalizeJa(chunks.map((c) => c.jp).join('')) === normalizeJa(modelJp);

const SENTENCE_FIELDS = [['message', 'Lời nhắn'], ['model', 'Câu mẫu']];

// Every problem of one scenario (app shape: { id, title, place, level, tier, cast: {key: person}, steps }).
// Returns [{ path, msg }]; path is e.g. "title", "cast.p1.kana", "steps.0.model.jp", "steps.1.chunks".
export function scenarioProblems(sc) {
  const out = [];
  const add = (path, msg) => msg && out.push({ path, msg });
  if (!sc.title?.trim()) add('title', 'Cần nhập tên tình huống');
  else if (sc.title.trim().length > 80) add('title', 'Tên quá dài (tối đa 80 ký tự)');
  if ((sc.place || '').length > 60) add('place', 'Tối đa 60 ký tự');
  const cast = sc.cast || {};
  const keys = Object.keys(cast);
  if (keys.length < 2) add('cast', 'Cần ít nhất 2 nhân vật');
  keys.forEach((k) => {
    const p = cast[k];
    if (!p.name?.trim()) add(`cast.${k}.name`, 'Cần nhập tên');
    add(`cast.${k}.kana`, readingProblem(p.kana));
    if (!TONES.includes(p.tone)) add(`cast.${k}.tone`, 'Chọn một màu');
  });
  const names = keys.map((k) => cast[k].name?.trim()).filter(Boolean);
  keys.forEach((k) => {
    const n = cast[k].name?.trim();
    if (n && names.indexOf(n) !== names.lastIndexOf(n)) add(`cast.${k}.name`, 'Hai nhân vật trùng tên');
  });
  const steps = sc.steps || [];
  if (!steps.length) add('steps', 'Cần ít nhất một lượt nhắn');
  steps.forEach((st, i) => {
    const at = `steps.${i}`;
    if (!cast[st.from]) add(`${at}.from`, 'Chọn người nhắn');
    if (!cast[st.to]) add(`${at}.to`, 'Chọn người nhận');
    if (st.from && st.from === st.to) add(`${at}.to`, 'Người nhận phải khác người nhắn');
    SENTENCE_FIELDS.forEach(([f, name]) => {
      const s = st[f] || {};
      if (!s.jp?.trim()) add(`${at}.${f}.jp`, `Cần nhập ${name.toLowerCase()} tiếng Nhật`);
      add(`${at}.${f}.kana`, sentenceReadingProblem(s.kana));
      if (!s.vi?.trim()) add(`${at}.${f}.vi`, 'Cần nhập nghĩa tiếng Việt');
    });
    const kps = st.keypoints || [];
    if (!kps.length) add(`${at}.keypoints`, 'Cần ít nhất một ý chính');
    kps.forEach((kp, j) => {
      const msg = keypointProblem(kp);
      const model = [normalizeJa(st.model?.jp || ''), normalizeJa(st.model?.kana || '')];
      const inModel = (kp.accept || []).some((a) => model.some((m) => m && normalizeJa(a) && m.includes(normalizeJa(a))));
      add(`${at}.keypoints.${j}`, msg || (st.model?.jp?.trim() && !inModel
        ? 'Câu mẫu chưa có cách viết nào của ý này (học viên nói đúng câu mẫu cũng bị trừ điểm)' : ''));
    });
    const chunks = st.chunks || [];
    if (sc.tier === 1 && !chunks.length) add(`${at}.chunks`, 'Bậc 1 cần các thẻ từ để học viên ghép câu');
    [['chunks', chunks], ['extra', st.extra || []]].forEach(([f, list]) =>
      list.forEach((c, j) => {
        if (!c.jp?.trim()) add(`${at}.${f}.${j}`, 'Thẻ trống');
        else add(`${at}.${f}.${j}`, sentenceReadingProblem(c.kana));
      }));
    if (chunks.length && st.model?.jp?.trim() && !tilesMatch(chunks, st.model.jp)) {
      add(`${at}.chunks`, 'Các thẻ ghép lại chưa khớp câu mẫu');
    }
  });
  return out;
}

export const splitList = (s) => s.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
const splitLines = (s) => s.split(/\r?\n|\s##\s/).map((x) => x.trim()).filter(Boolean);

function parsePerson(cell) {
  const [name, kana, role, glyph, tone] = cell.split('|').map((x) => x.trim());
  if (!name) return null;
  return {
    name,
    kana: kana || name,
    role: role || '',
    glyph: glyph || [...name][0],
    tone: TONES.includes(tone) ? tone : 'ai',
  };
}

export function parseTiles(cell) {
  if (!cell) return [];
  return cell.split('/').map((x) => x.trim()).filter(Boolean).map((t) => {
    const [jp, kana] = t.split('=').map((x) => x.trim());
    return { jp, kana: kana || jp };
  });
}

/* ---------- sheet rows -> content (with problems found) ---------- */

export function parseSheet({ topicsRows = [], wordsRows = [], relayRows = [] }, baseTopicIds = []) {
  const problems = [];
  const warn = (tab, row, msg) => problems.push({ tab, row, msg });

  // topics
  const topics = [];
  const topicIds = new Set(baseTopicIds);
  for (const r of topicsRows) {
    if (!r.id) { if (r.title) warn('ChuDe', r._row, 'Thiếu id'); continue; }
    if (!/^[a-z0-9-]+$/.test(r.id)) { warn('ChuDe', r._row, `id "${r.id}" chỉ được dùng chữ thường không dấu, số và dấu gạch ngang`); continue; }
    if (!r.title) { warn('ChuDe', r._row, 'Thiếu title'); continue; }
    topics.push({
      id: r.id,
      title: r.title,
      jpTitle: r.jp_title || '',
      level: r.level || 'N5',
      color: TONES.includes(r.color) ? r.color : 'ai',
      icon: ICONS.includes(r.icon) ? r.icon : 'Sparkle',
    });
    topicIds.add(r.id);
  }

  // words
  const words = [];
  const seen = new Set();
  for (const r of wordsRows) {
    if (!r.jp && !r.kana && !r.vi) continue;
    const where = `${r.topic_id}/${r.jp}`;
    if (!r.topic_id || !topicIds.has(r.topic_id)) { warn('TuVung', r._row, `Chủ đề "${r.topic_id}" không tồn tại`); continue; }
    if (!r.jp || !r.kana || !r.vi) { warn('TuVung', r._row, 'Cần đủ jp, kana và vi'); continue; }
    if (!kanaOnly(r.kana)) { warn('TuVung', r._row, `Cột kana "${r.kana}" chỉ được chứa hiragana/katakana`); continue; }
    if (!typeable(r.kana)) { warn('TuVung', r._row, `"${r.kana}" không gõ được bằng romaji`); continue; }
    if (seen.has(where)) { warn('TuVung', r._row, `Từ "${r.jp}" bị trùng trong chủ đề ${r.topic_id}`); continue; }
    seen.add(where);
    words.push({ topic: r.topic_id, jp: r.jp, kana: r.kana, vi: r.vi });
  }

  // relay scenarios
  const byId = new Map();
  for (const r of relayRows) {
    if (!r.id) { if (r.message_jp) warn('TruyenTin', r._row, 'Thiếu id'); continue; }
    if (!/^[a-z0-9-]+$/.test(r.id)) { warn('TruyenTin', r._row, `id "${r.id}" chỉ được dùng chữ thường không dấu, số và dấu gạch ngang`); continue; }
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  const relay = [];
  for (const [id, rows] of byId) {
    const head = rows[0];
    const cast = {};
    const keyOf = (person) => {
      const found = Object.entries(cast).find(([, v]) => v.name === person.name);
      if (found) return found[0];
      const key = `p${Object.keys(cast).length + 1}`;
      cast[key] = person;
      return key;
    };
    const steps = [];
    let bad = false;
    for (const r of rows) {
      const from = parsePerson(r.from || '');
      const to = parsePerson(r.to || '');
      const need = ['message_jp', 'message_kana', 'message_vi', 'model_jp', 'model_kana', 'model_vi'];
      const missing = need.filter((c) => !r[c]);
      if (!from || !to) { warn('TruyenTin', r._row, 'Cột from và to cần dạng "Tên | cách đọc | vai trò | chữ đại diện | màu"'); bad = true; continue; }
      if (missing.length) { warn('TruyenTin', r._row, `Thiếu cột: ${missing.join(', ')}`); bad = true; continue; }
      const keypoints = splitLines(r.keypoints || '').map((line) => {
        const [label, vi, forms] = line.split('|').map((x) => x.trim());
        return { label, vi, accept: splitList(forms || '') };
      }).filter((k) => !keypointProblem(k));
      if (!keypoints.length) { warn('TruyenTin', r._row, 'Cần ít nhất một ý chính dạng "Nhãn | nghĩa | dạng 1, dạng 2"'); bad = true; continue; }
      const step = {
        from: keyOf(from),
        to: keyOf(to),
        message: { jp: r.message_jp, kana: r.message_kana, vi: r.message_vi },
        model: { jp: r.model_jp, kana: r.model_kana, vi: r.model_vi },
        keypoints,
      };
      const chunks = parseTiles(r.chunks);
      if (chunks.length) {
        if (!tilesMatch(chunks, r.model_jp)) {
          warn('TruyenTin', r._row, 'Các thẻ trong cột chunks ghép lại không khớp câu model_jp');
        } else {
          step.chunks = chunks;
          step.extra = parseTiles(r.extra);
        }
      }
      steps.push(step);
    }
    if (bad || !steps.length) { warn('TruyenTin', head._row, `Bỏ qua tình huống "${id}" vì có dòng lỗi`); continue; }
    const tier = Number(head.tier);
    if (tier === 1 && steps.some((s) => !s.chunks)) {
      warn('TruyenTin', head._row, `Tình huống "${id}" ở Bậc 1 cần cột chunks cho mọi dòng, sẽ xếp vào Bậc 2`);
    }
    relay.push({
      id,
      title: head.title || id,
      place: head.place || '',
      level: head.level || 'N5',
      ...([1, 2, 3].includes(tier) ? { tier: tier === 1 && steps.some((s) => !s.chunks) ? 2 : tier } : {}),
      cast,
      steps,
    });
  }
  return { content: { topics, words, relay }, problems };
}

/* ---------- app content -> sheet rows (to seed the sheet) ---------- */

const personCell = (p) => [p.name, p.kana, p.role, p.glyph, p.tone].join(' | ');
export const tilesCell = (tiles = []) => tiles.map((t) => (t.kana && t.kana !== t.jp ? `${t.jp}=${t.kana}` : t.jp)).join(' / ');

export function toSheetRows(topics, scenarios) {
  const topicsRows = topics.map((t) => ({
    id: t.id, title: t.title, jp_title: t.jpTitle, level: t.level, color: t.color, icon: t.icon,
  }));
  const wordsRows = topics.flatMap((t) => t.words.map((w) => ({ topic_id: t.id, jp: w.jp, kana: w.kana, vi: w.vi })));
  const relayRows = scenarios.flatMap((sc) =>
    sc.steps.map((st) => ({
      id: sc.id,
      title: sc.title,
      place: sc.place,
      level: sc.level,
      tier: sc.tier ?? '',
      from: personCell(sc.cast[st.from]),
      to: personCell(sc.cast[st.to]),
      message_jp: st.message.jp,
      message_kana: st.message.kana,
      message_vi: st.message.vi,
      model_jp: st.model.jp,
      model_kana: st.model.kana,
      model_vi: st.model.vi,
      keypoints: st.keypoints.map((k) => `${k.label} | ${k.vi} | ${k.accept.join(', ')}`).join('\n'),
      chunks: tilesCell(st.chunks),
      extra: tilesCell(st.extra),
    })),
  );
  return { topicsRows, wordsRows, relayRows };
}

export const SHEET_COLUMNS = {
  ChuDe: ['id', 'title', 'jp_title', 'level', 'color', 'icon'],
  TuVung: ['topic_id', 'jp', 'kana', 'vi'],
  TruyenTin: [
    'id', 'title', 'place', 'level', 'tier', 'from', 'to',
    'message_jp', 'message_kana', 'message_vi', 'model_jp', 'model_kana', 'model_vi',
    'keypoints', 'chunks', 'extra',
  ],
};
