// Train-line model: every topic is a "line", every lesson a "station",
// and the game after the lessons is the interchange station.
import { TOPICS, lessonsOf } from '../data/vocab';

// Two-letter line codes from the topic id (chao-hoi -> CH).
// Collisions get a third letter or a digit so every code stays unique.
function makeCodes() {
  const used = new Set();
  const codes = {};
  TOPICS.forEach((t) => {
    const parts = t.id.split('-');
    let base = parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    if (base.length < 2) base = t.id.slice(0, 2).toUpperCase();
    let code = base;
    // try extending with letters of the last word, then digits
    const tail = (parts[parts.length - 1] || '').toUpperCase();
    for (let i = 1; used.has(code) && i < tail.length; i++) code = base + tail[i];
    for (let n = 2; used.has(code); n++) code = base + n;
    used.add(code);
    codes[t.id] = code;
  });
  return codes;
}

export function buildLines() {
  const codes = makeCodes();
  return TOPICS.map((topic, ti) => {
    const lessons = lessonsOf(topic);
    const code = codes[topic.id];
    const stations = lessons.map((words, li) => ({
      id: `${topic.id}:L${li}`,
      kind: 'lesson',
      index: li,
      code: `${code}${String(li + 1).padStart(2, '0')}`,
      label: words[0].jp,
    }));
    stations.push({
      id: `${topic.id}:game`,
      kind: 'game',
      code: `${code}${String(lessons.length + 1).padStart(2, '0')}`,
      label: 'Bắn chữ',
    });
    return { topic, code, order: ti + 1, stations };
  });
}

export function flattenStations(lines) {
  return lines.flatMap((line) => line.stations.map((s) => ({ ...s, line })));
}

export function formatStampDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
