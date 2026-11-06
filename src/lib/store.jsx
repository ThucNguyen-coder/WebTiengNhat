import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Storage key kept from the first version so existing progress is not lost.
const KEY = 'kotoba-progress-v1';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const DEFAULT = {
  xp: 0,
  streak: 0,
  lastActive: null,
  daily: { date: null, xp: 0 },
  dailyGoal: 30,
  completed: {}, // nodeId -> { stars, at }
  learned: {}, // word jp -> times correct
  gameBest: 0,
  relay: {}, // scenarioId -> best score
  settings: { furigana: true, romaji: true, theme: 'system', sound: true, rate: 0.95 },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const data = JSON.parse(raw);
    return { ...DEFAULT, ...data, settings: { ...DEFAULT.settings, ...data.settings } };
  } catch {
    return DEFAULT;
  }
}

const Ctx = createContext(null);

export function ProgressProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  }, [state]);

  // Streak breaks if a day was skipped.
  const t = today();
  const streak = state.lastActive && dayDiff(state.lastActive, t) > 1 ? 0 : state.streak;
  const dailyXp = state.daily.date === t ? state.daily.xp : 0;

  const addXp = useCallback((amount) => {
    setState((s) => {
      const d = today();
      const gap = s.lastActive ? dayDiff(s.lastActive, d) : null;
      const newStreak = gap === 0 ? s.streak : gap === 1 ? s.streak + 1 : 1;
      return {
        ...s,
        xp: s.xp + amount,
        streak: newStreak,
        lastActive: d,
        daily: { date: d, xp: (s.daily.date === d ? s.daily.xp : 0) + amount },
      };
    });
  }, []);

  const completeNode = useCallback((id, stars = 3) => {
    setState((s) => ({
      ...s,
      completed: { ...s.completed, [id]: { stars: Math.max(stars, s.completed[id]?.stars || 0), at: Date.now() } },
    }));
  }, []);

  const markLearned = useCallback((jpList) => {
    setState((s) => {
      const learned = { ...s.learned };
      jpList.forEach((jp) => { learned[jp] = (learned[jp] || 0) + 1; });
      return { ...s, learned };
    });
  }, []);

  const setGameBest = useCallback((score) => setState((s) => ({ ...s, gameBest: Math.max(s.gameBest, score) })), []);
  const setRelayScore = useCallback(
    (id, score) => setState((s) => ({ ...s, relay: { ...s.relay, [id]: Math.max(s.relay[id] || 0, score) } })),
    [],
  );
  const updateSettings = useCallback((patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);
  const setDailyGoal = useCallback((goal) => setState((s) => ({ ...s, dailyGoal: goal })), []);
  const reset = useCallback(() => setState({ ...DEFAULT, settings: state.settings }), [state.settings]);

  const value = useMemo(
    () => ({
      ...state, streak, dailyXp,
      addXp, completeNode, markLearned, setGameBest, setRelayScore, updateSettings, setDailyGoal, reset,
    }),
    [state, streak, dailyXp, addXp, completeNode, markLearned, setGameBest, setRelayScore, updateSettings, setDailyGoal, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProgress = () => useContext(Ctx);

// Tiny hash router: #/path/segments
export function useRoute() {
  const parse = () => (window.location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = path; };
