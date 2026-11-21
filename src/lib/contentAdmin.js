// Reads and writes for the "Quản lý nội dung" page. Row Level Security on Supabase
// decides who may write (see supabase/content.sql); these helpers only shape the data.
import { supabase } from './supabase';
import { fetchAll } from './remoteContent';

// Turn Supabase errors into sentences a teacher can act on.
export function explain(error) {
  if (!error) return '';
  const code = error.code || '';
  const msg = error.message || String(error);
  if ((code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg)) && /content_relay/.test(msg)) {
    return 'Chưa có bảng Truyền tin trên Supabase. Người quản trị cần chạy tệp supabase/relay.sql trong SQL Editor.';
  }
  if (code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg)) {
    return 'Chưa có bảng nội dung trên Supabase. Người quản trị cần chạy tệp supabase/content.sql trong SQL Editor.';
  }
  if (code === '23505') return 'Đã có mục này rồi (bị trùng).';
  if (code === '42501' || /row-level security|permission/i.test(msg)) return 'Tài khoản này không có quyền làm việc này.';
  if (/fetch|network/i.test(msg)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  return `Có lỗi: ${msg}`;
}

const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

/* ---------- roles ---------- */

// 'admin' | 'teacher' | null
export async function myRole(email) {
  if (!email) return null;
  const rows = ok(await supabase.from('content_editors').select('role').eq('email', email.toLowerCase()));
  return rows[0]?.role || null;
}

export const listEditors = async () =>
  ok(await supabase.from('content_editors').select('email,role,added_by,created_at').order('role').order('email'));

export const addTeacher = async (email, by) =>
  ok(await supabase.from('content_editors').insert({ email: email.trim().toLowerCase(), role: 'teacher', added_by: by }));

export const removeTeacher = async (email) =>
  ok(await supabase.from('content_editors').delete().eq('email', email).eq('role', 'teacher'));

/* ---------- topics and words ---------- */

export async function loadAll() {
  const [topics, words] = await Promise.all([
    fetchAll(() => supabase.from('content_topics').select('*').order('sort_order').order('id')),
    fetchAll(() => supabase.from('content_words').select('*').order('topic_id').order('sort_order').order('created_at')),
  ]);
  return { topics, words };
}

export const insertTopic = async (topic) => ok(await supabase.from('content_topics').insert(topic).select().single());

export const updateTopic = async (id, fields) =>
  ok(await supabase.from('content_topics').update(fields).eq('id', id).select().single());

export const deleteTopic = async (id) => ok(await supabase.from('content_topics').delete().eq('id', id));

// Save a new topic order: numbers 10, 20, 30... and only rows that changed are written.
export async function reorderTopics(ordered) {
  for (const [i, t] of ordered.entries()) {
    const n = (i + 1) * 10;
    if (t.sort_order !== n) await updateTopic(t.id, { sort_order: n });
  }
}

export const insertWord = async (word) => ok(await supabase.from('content_words').insert(word).select().single());

export const updateWord = async (id, fields) =>
  ok(await supabase.from('content_words').update(fields).eq('id', id).select().single());

export const deleteWord = async (id) => ok(await supabase.from('content_words').delete().eq('id', id));

export const publishWords = async (ids) =>
  ok(await supabase.from('content_words').update({ status: 'published' }).in('id', ids).select());

// One-time copy of the content written in code (and the Google Sheet) into Supabase.
// Everything is published, so learners see exactly what they saw before.
export async function importTopics(topics) {
  const topicRows = topics.map((t, i) => ({
    id: t.id,
    title: t.title,
    jp_title: t.jpTitle || '',
    level: t.level || 'N5',
    color: t.color || 'ai',
    icon: t.icon || 'Sparkle',
    sort_order: (i + 1) * 10,
    status: 'published',
  }));
  ok(await supabase.from('content_topics').upsert(topicRows, { onConflict: 'id', ignoreDuplicates: true }));
  const wordRows = topics.flatMap((t) =>
    t.words.map((w, i) => ({ topic_id: t.id, jp: w.jp, kana: w.kana, vi: w.vi, sort_order: (i + 1) * 10, status: 'published' })));
  for (let i = 0; i < wordRows.length; i += 500) {
    ok(await supabase.from('content_words').upsert(wordRows.slice(i, i + 500), { onConflict: 'topic_id,jp', ignoreDuplicates: true }));
  }
  return { topics: topicRows.length, words: wordRows.length };
}

/* ---------- relay ("Truyền tin") scenarios ---------- */

export const loadRelay = async () =>
  fetchAll(() => supabase.from('content_relay').select('*').order('sort_order').order('id'));

export const insertScenario = async (row) => ok(await supabase.from('content_relay').insert(row).select().single());

export const updateScenario = async (id, fields) =>
  ok(await supabase.from('content_relay').update(fields).eq('id', id).select().single());

export const deleteScenario = async (id) => ok(await supabase.from('content_relay').delete().eq('id', id));

// Same numbering as topics: 10, 20, 30... only changed rows are written.
export async function reorderScenarios(ordered) {
  for (const [i, sc] of ordered.entries()) {
    const n = (i + 1) * 10;
    if (sc.sort_order !== n) await updateScenario(sc.id, { sort_order: n });
  }
}

// App scenario (data/relay.js shape) -> content_relay row fields.
export const scenarioRow = (sc) => ({
  title: sc.title,
  place: sc.place || '',
  level: sc.level || 'N5',
  tier: [1, 2, 3].includes(sc.tier) ? sc.tier : null,
  body: { cast: sc.cast, steps: sc.steps },
});

// One-time copy of the scenarios written in code (and the Google Sheet), published.
// Scenarios already in Supabase (same id) are left alone.
export async function importScenarios(scenarios) {
  const rows = scenarios.map((sc, i) => ({ id: sc.id, ...scenarioRow(sc), sort_order: (i + 1) * 10, status: 'published' }));
  ok(await supabase.from('content_relay').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }));
  return rows.length;
}
