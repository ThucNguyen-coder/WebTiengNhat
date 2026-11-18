// Ngữ cảnh gửi cho Dify (biến START: current_page, jlpt_level).
// Chỉ phụ thuộc data/vocab.js. Id ga giống quy ước của lộ trình: `${topic.id}:L${n}` và `${topic.id}:game`.
import { TOPICS, lessonsOf } from '../data/vocab';

const PAGES = {
  '': 'home', kana: 'kana', vocab: 'vocab', game: 'game',
  relay: 'relay', stamps: 'stamps', settings: 'settings', lesson: 'lesson',
};

export const pageName = (route) => PAGES[route[0] || ''] || 'other';

const stationIds = (topic) => [...lessonsOf(topic).map((_, i) => `${topic.id}:L${i}`), `${topic.id}:game`];

// N5 cho tới khi hoàn thành mọi ga của các tuyến N5, sau đó là N4.
export function jlptLevel(completed = {}) {
  const n5 = TOPICS.filter((t) => t.level === 'N5');
  const done = n5.length > 0 && n5.every((t) => stationIds(t).every((id) => completed[id]));
  return done ? 'N4' : 'N5';
}
