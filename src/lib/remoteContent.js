// Topics, words and relay ("Truyền tin") scenarios edited on the "Quản lý nội dung" page live in Supabase.
// They are loaded once, before the app modules run (see main.jsx), so data/vocab.js and
// lib/relayTiers.js can simply pick them up. When Supabase has nothing published yet, or cannot
// be reached and nothing is cached, the content written in code (plus the Google Sheet) is used.
// Topics and scenarios are loaded independently: one table missing does not affect the other.
import { supabase } from './supabase';
import { tilesMatch } from '../data/sheetFormat';

const CACHE_KEY = 'konnichiwa-content-v1';
const RELAY_CACHE_KEY = 'konnichiwa-relay-v1';
const TIMEOUT_MS = 4000;

let remoteTopics = null; // [{ id, title, jpTitle, level, color, icon, words: [{ jp, kana, vi }] }] or null
let remoteScenarios = null; // [{ id, title, place, level, tier?, cast, steps }] or null

export const getRemoteTopics = () => remoteTopics;
export const getRemoteScenarios = () => remoteScenarios;

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

// Rows of content_relay -> scenarios in the shape of data/relay.js. Only rows the relay screen
// can actually play are kept; tier 1 without tiles on every turn is moved to tier 2.
export function toAppScenarios(rows) {
  const out = [];
  for (const r of rows) {
    const cast = r.body?.cast;
    const steps = r.body?.steps;
    if (!cast || typeof cast !== 'object' || !Array.isArray(steps) || !steps.length) continue;
    const playable = steps.every((st) =>
      cast[st.from] && cast[st.to] && st.message?.jp && st.model?.jp && st.model?.kana
      && Array.isArray(st.keypoints) && st.keypoints.length
      && st.keypoints.every((kp) => kp.label && Array.isArray(kp.accept) && kp.accept.length));
    if (!playable) continue;
    const clean = steps.map((st) => {
      const { chunks, extra, ...rest } = st;
      return Array.isArray(chunks) && tilesMatch(chunks, st.model.jp)
        ? { ...rest, chunks, extra: Array.isArray(extra) ? extra : [] }
        : rest;
    });
    let tier = [1, 2, 3].includes(r.tier) ? r.tier : null;
    if (tier === 1 && clean.some((st) => !st.chunks)) tier = 2;
    out.push({
      id: r.id,
      title: r.title,
      place: r.place || '',
      level: r.level || 'N5',
      ...(tier ? { tier } : {}),
      cast,
      steps: clean,
    });
  }
  return out;
}

async function fetchPublishedScenarios() {
  const rows = await fetchAll(() => supabase.from('content_relay').select('id,title,place,level,tier,body')
    .eq('status', 'published').order('sort_order').order('id'));
  return toAppScenarios(rows);
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

function readCache(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function writeCache(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* storage full or blocked */ }
}

// Fresh list from Supabase (and cache it); on any failure the last good copy; else null (= code content).
async function loadOne(fetcher, key, timeout) {
  try {
    const list = await Promise.race([fetcher(), timeout]);
    writeCache(key, list);
    return list.length ? list : null;
  } catch {
    // offline, slow or table not created yet
    const cached = readCache(key);
    return cached?.length ? cached : null;
  }
}

export async function loadRemoteContent() {
  if (!supabase) return;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
  timeout.catch(() => {});
  [remoteTopics, remoteScenarios] = await Promise.all([
    loadOne(fetchPublished, CACHE_KEY, timeout),
    loadOne(fetchPublishedScenarios, RELAY_CACHE_KEY, timeout),
  ]);
}
