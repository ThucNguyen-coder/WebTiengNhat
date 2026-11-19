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

const splitList = (s) => s.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
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

function parseTiles(cell) {
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
      }).filter((k) => k.label && k.vi && k.accept.length);
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
        if (normalizeJa(chunks.map((c) => c.jp).join('')) !== normalizeJa(r.model_jp)) {
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
const tilesCell = (tiles = []) => tiles.map((t) => (t.kana && t.kana !== t.jp ? `${t.jp}=${t.kana}` : t.jp)).join(' / ');

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
