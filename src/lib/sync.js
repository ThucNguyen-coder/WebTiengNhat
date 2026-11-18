// Sync between the progress kept in the browser and the user's Supabase rows.
// The local shape stays the source the UI reads; Supabase is the copy that follows the account.
import { supabase } from './supabase';

const isoDay = (d) => (d ? String(d).slice(0, 10) : null);
const later = (a, b) => (!a ? b : !b ? a : a >= b ? a : b);

/* ---------- read ---------- */

export async function fetchRemote(userId) {
  const [profile, progress, completions, words, relay] = await Promise.all([
    supabase.from('profiles').select('settings, daily_goal').eq('id', userId).maybeSingle(),
    supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('lesson_completions').select('node_id, stars, completed_at').eq('user_id', userId),
    supabase.from('words_learned').select('word, times_correct').eq('user_id', userId),
    supabase.from('relay_results').select('scenario_id, best_score').eq('user_id', userId),
  ]);
  const err = [profile, progress, completions, words, relay].find((r) => r.error);
  if (err) throw err.error;

  const p = progress.data || {};
  return {
    settings: profile.data?.settings || {},
    dailyGoal: profile.data?.daily_goal ?? null,
    xp: p.xp || 0,
    streak: p.streak || 0,
    lastActive: isoDay(p.last_active),
    daily: { date: isoDay(p.daily_date), xp: p.daily_xp || 0 },
    gameBest: p.game_best || 0,
    completed: Object.fromEntries(
      (completions.data || []).map((r) => [r.node_id, { stars: r.stars, at: new Date(r.completed_at).getTime() }]),
    ),
    learned: Object.fromEntries((words.data || []).map((r) => [r.word, r.times_correct])),
    relay: Object.fromEntries((relay.data || []).map((r) => [r.scenario_id, r.best_score])),
  };
}

/* ---------- merge (first sign-in on a device) ---------- */

// Keep whichever side has more: nobody loses progress when signing in.
export function mergeStates(local, remote) {
  const completed = { ...remote.completed };
  Object.entries(local.completed || {}).forEach(([id, c]) => {
    const r = completed[id];
    completed[id] = r ? { stars: Math.max(r.stars, c.stars || 0), at: Math.min(r.at || c.at, c.at || r.at) } : c;
  });
  const learned = { ...remote.learned };
  Object.entries(local.learned || {}).forEach(([w, n]) => { learned[w] = Math.max(learned[w] || 0, n); });
  const relay = { ...remote.relay };
  Object.entries(local.relay || {}).forEach(([id, s]) => { relay[id] = Math.max(relay[id] ?? 0, s); });

  const lastActive = later(local.lastActive, remote.lastActive);
  let streak;
  if (local.lastActive === remote.lastActive) streak = Math.max(local.streak, remote.streak);
  else streak = lastActive === local.lastActive ? local.streak : remote.streak;

  let daily;
  if (local.daily?.date === remote.daily?.date) daily = { date: local.daily.date, xp: Math.max(local.daily.xp, remote.daily.xp) };
  else daily = later(local.daily?.date, remote.daily?.date) === local.daily?.date ? local.daily : remote.daily;

  const hasRemoteSettings = remote.settings && Object.keys(remote.settings).length > 0;
  return {
    ...local,
    xp: Math.max(local.xp, remote.xp),
    streak,
    lastActive,
    daily,
    gameBest: Math.max(local.gameBest, remote.gameBest),
    dailyGoal: hasRemoteSettings && remote.dailyGoal ? remote.dailyGoal : local.dailyGoal,
    settings: hasRemoteSettings ? { ...local.settings, ...remote.settings } : local.settings,
    completed,
    learned,
    relay,
  };
}

/* ---------- write only what changed ---------- */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function pushDiff(userId, prev, next) {
  const jobs = [];
  const p = prev || {};

  if (!same(p.settings, next.settings) || p.dailyGoal !== next.dailyGoal) {
    jobs.push(supabase.from('profiles').upsert({ id: userId, settings: next.settings, daily_goal: next.dailyGoal }));
  }
  if (
    p.xp !== next.xp || p.streak !== next.streak || p.lastActive !== next.lastActive ||
    !same(p.daily, next.daily) || p.gameBest !== next.gameBest
  ) {
    jobs.push(
      supabase.from('user_progress').upsert({
        user_id: userId,
        xp: next.xp,
        streak: next.streak,
        last_active: next.lastActive,
        daily_date: next.daily?.date || null,
        daily_xp: next.daily?.xp || 0,
        game_best: next.gameBest,
      }),
    );
  }

  const comp = Object.entries(next.completed || {})
    .filter(([id, c]) => !same(p.completed?.[id], c))
    .map(([id, c]) => ({ user_id: userId, node_id: id, stars: c.stars ?? 1, completed_at: new Date(c.at || Date.now()).toISOString() }));
  if (comp.length) jobs.push(supabase.from('lesson_completions').upsert(comp, { onConflict: 'user_id,node_id' }));

  const words = Object.entries(next.learned || {})
    .filter(([w, n]) => p.learned?.[w] !== n)
    .map(([w, n]) => ({ user_id: userId, word: w, times_correct: n }));
  if (words.length) jobs.push(supabase.from('words_learned').upsert(words, { onConflict: 'user_id,word' }));

  const relay = Object.entries(next.relay || {})
    .filter(([id, s]) => p.relay?.[id] !== s)
    .map(([id, s]) => ({ user_id: userId, scenario_id: id, best_score: Math.max(0, Math.min(100, Math.round(s))) }));
  if (relay.length) jobs.push(supabase.from('relay_results').upsert(relay, { onConflict: 'user_id,scenario_id' }));

  const results = await Promise.all(jobs);
  const err = results.find((r) => r.error);
  if (err) throw err.error;
  return jobs.length;
}

/* ---------- reset progress (keeps the account) ---------- */

export async function clearRemoteProgress(userId) {
  const results = await Promise.all([
    supabase.from('lesson_completions').delete().eq('user_id', userId),
    supabase.from('words_learned').delete().eq('user_id', userId),
    supabase.from('relay_results').delete().eq('user_id', userId),
    supabase.from('user_progress').upsert({
      user_id: userId, xp: 0, streak: 0, last_active: null, daily_date: null, daily_xp: 0, game_best: 0,
    }),
  ]);
  const err = results.find((r) => r.error);
  if (err) throw err.error;
}
