// Topics and words edited on the "Quản lý nội dung" page live in Supabase.
// They are loaded once, before the app modules run (see main.jsx), so data/vocab.js
// can simply pick them up. When Supabase has no published topics yet, or cannot be
// reached and nothing is cached, the content written in code is used.
import { supabase } from './supabase';

const CACHE_KEY = 'konnichiwa-content-v1';
const TIMEOUT_MS = 4000;

let remoteTopics = null; // [{ id, title, jpTitle, level, color, icon, words: [{ jp, kana, vi }] }] or null

export const getRemoteTopics = () => remoteTopics;

// Supabase returns at most 1000 rows per request, so read in pages.
export async function fetchAll(build, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

export function toAppTopics(topics, words) {
  const byTopic = new Map(topics.map((t) => [t.id, []]));
  words.forEach((w) => byTopic.get(w.topic_id)?.push({ jp: w.jp, kana: w.kana, vi: w.vi }));
  return topics
    .map((t) => ({
      id: t.id,
      title: t.title,
      jpTitle: t.jp_title,
      level: t.level,
      color: t.color,
      icon: t.icon,
      words: byTopic.get(t.id),
    }))
    .filter((t) => t.words.length > 0);
}

async function fetchPublished() {
  const [topics, words] = await Promise.all([
    fetchAll(() => supabase.from('content_topics').select('id,title,jp_title,level,color,icon')
      .eq('status', 'published').order('sort_order').order('id')),
    fetchAll(() => supabase.from('content_words').select('topic_id,jp,kana,vi')
      .eq('status', 'published').order('topic_id').order('sort_order').order('created_at')),
  ]);
  return toAppTopics(topics, words);
}

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function writeCache(topics) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(topics)); } catch { /* storage full or blocked */ }
}

export async function loadRemoteContent() {
  if (!supabase) return;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
  try {
    const topics = await Promise.race([fetchPublished(), timeout]);
    writeCache(topics);
    remoteTopics = topics.length ? topics : null;
  } catch {
    // offline, slow or tables not created yet: last good copy, else code content
    const cached = readCache();
    remoteTopics = cached?.length ? cached : null;
  }
}
