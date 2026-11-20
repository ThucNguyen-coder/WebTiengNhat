// Ôn tập đúng lúc: mỗi từ nằm trong một "hộp" (kiểu Leitner).
// Trả lời đúng một từ đang đến hạn -> lên hộp sau, lâu hơn mới phải ôn lại.
// Trả lời sai -> quay về hộp 1, ngày mai ôn lại.
// Dữ liệu: state.review = { [jp]: { box, right, wrong, seen, due } }
//   box: 0..5 (hiển thị 1..6), seen/due: 'YYYY-MM-DD'.
import { ALL_WORDS, TOPICS, lessonsOf } from '../data/vocab';
import { buildLines, flattenStations } from './lines';

export const INTERVALS = [1, 2, 4, 7, 15, 30]; // số ngày chờ của từng hộp
export const REVIEW_MAX = 12; // một lượt ôn tối đa bao nhiêu từ
const BACKFILL_PER_DAY = 5; // từ đã học từ trước (chưa có lịch) được chia ra mỗi ngày 5 từ

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// Cập nhật lịch của một từ sau một câu trả lời.
// Đúng nhiều lần trong cùng một ngày chỉ được lên hộp một lần, và chỉ khi từ đã đến hạn.
export function applyAnswer(entry, ok, day = today()) {
  if (!ok) {
    return {
      box: 0,
      right: entry?.right || 0,
      wrong: (entry?.wrong || 0) + 1,
      seen: day,
      due: addDays(day, INTERVALS[0]),
    };
  }
  if (!entry) return { box: 0, right: 1, wrong: 0, seen: day, due: addDays(day, INTERVALS[0]) };
  const isDue = !entry.due || entry.due <= day;
  if (isDue && entry.seen !== day) {
    const box = Math.min((entry.box ?? 0) + 1, INTERVALS.length - 1);
    return { ...entry, box, right: (entry.right || 0) + 1, seen: day, due: addDays(day, INTERVALS[box]) };
  }
  return { ...entry, right: (entry.right || 0) + 1, seen: day };
}

let byJp = null;
export function wordOf(jp) {
  if (!byJp) byJp = new Map(ALL_WORDS.map((w) => [w.jp, w]));
  return byJp.get(jp) || null;
}

// Từ đến hạn hôm nay: hạn sớm nhất trước, cùng hạn thì từ hay sai trước.
export function dueWords(review, day = today()) {
  return Object.entries(review || {})
    .filter(([jp, e]) => e && e.due && e.due <= day && wordOf(jp))
    .sort(([, a], [, b]) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (b.wrong || 0) - (a.wrong || 0)))
    .map(([jp]) => wordOf(jp));
}

// Từ hay sai: nhiều lần sai nhất trước; sai bằng nhau thì từ ít đúng hơn trước.
export function hardWords(review, limit = 20) {
  return Object.entries(review || {})
    .filter(([jp, e]) => e && e.wrong > 0 && wordOf(jp))
    .sort(([, a], [, b]) => b.wrong - a.wrong || (a.right || 0) - (b.right || 0))
    .slice(0, limit)
    .map(([jp, e]) => ({ word: wordOf(jp), ...e }));
}

// Ngày gần nhất có từ đến hạn (sau hôm nay), để báo "lần ôn tiếp theo".
export function nextDue(review, day = today()) {
  let best = null;
  Object.entries(review || {}).forEach(([jp, e]) => {
    if (e?.due && e.due > day && wordOf(jp) && (!best || e.due < best)) best = e.due;
  });
  return best;
}

export function boxCounts(review) {
  const counts = INTERVALS.map(() => 0);
  Object.entries(review || {}).forEach(([jp, e]) => {
    if (e && wordOf(jp)) counts[Math.min(e.box ?? 0, counts.length - 1)] += 1;
  });
  return counts;
}

// Những từ đã học trước khi có lịch ôn: chia đều mỗi ngày 5 từ, bắt đầu từ hôm nay.
export function backfillReviews(state, day = today()) {
  const review = { ...(state.review || {}) };
  let i = 0;
  let changed = false;
  Object.entries(state.learned || {}).forEach(([jp, n]) => {
    if (review[jp]) return;
    review[jp] = { box: 0, right: n || 0, wrong: 0, seen: null, due: addDays(day, Math.floor(i / BACKFILL_PER_DAY)) };
    i += 1;
    changed = true;
  });
  return changed ? { ...state, review } : state;
}

// Gộp hai bản lịch (máy này và tài khoản): ai vừa ôn gần hơn thì giữ lịch đó, số lần đúng/sai lấy số lớn.
export function mergeReview(local = {}, remote = {}) {
  const out = { ...remote };
  Object.entries(local).forEach(([jp, l]) => {
    const r = out[jp];
    if (!r) { out[jp] = l; return; }
    const lSeen = l.seen || '';
    const rSeen = r.seen || '';
    const pick = lSeen > rSeen || (lSeen === rSeen && (l.due || '') >= (r.due || '')) ? l : r;
    out[jp] = { ...pick, right: Math.max(l.right || 0, r.right || 0), wrong: Math.max(l.wrong || 0, r.wrong || 0) };
  });
  return out;
}

/* ---------- Bài 5 phút mỗi ngày ---------- */

const DAILY_REVIEWS = 6;
const DAILY_NEW = 3;
const SEC_QUESTION = 15;
const SEC_INTRO = 20;

// Kế hoạch bài hôm nay: từ đến hạn trước, rồi vài từ mới của ga chưa xong tiếp theo.
export function planDaily(state, day = today()) {
  const due = dueWords(state.review, day);
  const reviews = due.slice(0, DAILY_REVIEWS);
  const fresh = [];
  let station = null;
  const known = (jp) => state.learned?.[jp] || state.review?.[jp];
  const lines = buildLines();
  const stations = flattenStations(lines).filter((s) => s.kind === 'lesson' && !state.completed?.[s.id]);
  for (const st of stations) {
    if (fresh.length >= DAILY_NEW) break;
    const topic = TOPICS.find((t) => t.id === st.line.topic.id);
    const words = (lessonsOf(topic)[st.index] || []).filter((w) => !known(w.jp));
    if (!words.length) continue;
    if (!station) station = { code: st.code, topic };
    words.slice(0, DAILY_NEW - fresh.length).forEach((w) => fresh.push({ ...w, topic: topic.id }));
  }
  // Không còn từ mới và chưa có gì để ôn: luyện lại vài từ hay sai hoặc đã học.
  let extra = [];
  if (!reviews.length && !fresh.length) {
    const hard = hardWords(state.review, DAILY_REVIEWS).map((h) => h.word);
    const learned = Object.keys(state.review || {}).map(wordOf).filter(Boolean);
    extra = (hard.length ? hard : learned).slice(0, DAILY_REVIEWS);
  }
  return { reviews: reviews.length ? reviews : extra, fresh, station, dueTotal: due.length };
}

export function estimateMinutes(plan) {
  const secs = plan.reviews.length * SEC_QUESTION + plan.fresh.length * (SEC_INTRO + 2 * SEC_QUESTION);
  return Math.max(1, Math.round(secs / 60));
}

// Dòng chữ dễ hiểu cho lịch của một từ.
export function whenText(due, day = today()) {
  if (!due) return '';
  const n = dayDiff(day, due);
  if (n <= 0) return 'hôm nay';
  if (n === 1) return 'ngày mai';
  return `sau ${n} ngày`;
}
