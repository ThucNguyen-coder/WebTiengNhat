import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Trophy, Flag, Heart, X, Pause, Play, SpeakerHigh, SpeakerSlash, Keyboard, RocketLaunch, ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { TOPICS, ALL_WORDS, topicById } from '../data/vocab';
import { useProgress, go } from '../lib/store';
import { tokenize, matchRomaji, kanaToRomaji, toHiragana, rubyParts } from '../lib/kana';
import { speak, blip } from '../lib/speech';
import { SpeakButton, shuffle } from '../components/Bits';
import './game.css';

const MILESTONES = 20;
const KILLS_PER_MILESTONE = 8;
const GROUND = 118; // px from bottom where words crash
const WORD_H = 58; // approx. height of a falling pill
const DIFF = {
  easy: { label: 'Dễ', desc: 'Có romaji gợi ý, rơi chậm', speed: 22, spawn: 3300, furigana: true, romaji: true },
  normal: { label: 'Thường', desc: 'Chỉ có furigana', speed: 30, spawn: 2700, furigana: true, romaji: false },
  hard: { label: 'Khó', desc: 'Chỉ Kanji, rơi nhanh', speed: 40, spawn: 2200, furigana: false, romaji: false },
};
const TONES = ['shu', 'ai', 'matcha', 'yamabuki', 'sakura'];

const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  s: Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1,
  d: (Math.random() * 4).toFixed(2),
}));

export default function SpaceGame({ topicId }) {
  const p = useProgress();
  const [topic, setTopic] = useState(topicId && topicById(topicId) ? topicId : 'all');
  const [diff, setDiff] = useState('easy');
  const [phase, setPhase] = useState('menu'); // menu | play | over
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (topicId && topicById(topicId)) setTopic(topicId);
  }, [topicId]);

  const finish = useCallback(
    (result) => {
      const xp = Math.min(30, Math.round(result.kills * 1.5));
      if (xp > 0) p.addXp(xp);
      p.setGameBest(result.score);
      if (topic !== 'all' && result.kills >= 10) p.completeNode(`${topic}:game`, result.lives > 0 ? 3 : 2);
      if (result.killed.length) p.markLearned(result.killed);
      setSummary({ ...result, xp, best: Math.max(p.gameBest, result.score), newBest: result.score > p.gameBest });
      setPhase('over');
    },
    [p, topic],
  );

  return (
    <div className="page game-page">
      {phase === 'play' ? (
        <Arena topic={topic} diff={diff} onEnd={finish} onQuit={() => setPhase('menu')} />
      ) : (
        <div className="arena arena--static">
          <Starfield />
          {phase === 'menu' && (
            <Menu topic={topic} setTopic={setTopic} diff={diff} setDiff={setDiff} best={p.gameBest} onStart={() => setPhase('play')} />
          )}
          {phase === 'over' && summary && (
            <Over s={summary} onAgain={() => setPhase('play')} onMenu={() => setPhase('menu')} />
          )}
        </div>
      )}
    </div>
  );
}

function Starfield() {
  return (
    <div className="stars" aria-hidden="true">
      {STARS.map((s) => (
        <i key={s.id} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
      <div className="planet" />
    </div>
  );
}

function Menu({ topic, setTopic, diff, setDiff, best, onStart }) {
  return (
    <div className="g-card" role="dialog" aria-labelledby="g-menu-title">
      <div className="g-card-head">
        <RocketLaunch size={40} weight="fill" aria-hidden="true" />
        <div>
          <h1 id="g-menu-title">Bắn chữ</h1>
          <p>Từ tiếng Nhật rơi xuống. Gõ cách đọc bằng romaji để bắn hạ trước khi chúng chạm đất.</p>
        </div>
      </div>

      <fieldset className="g-field">
        <legend>Chủ đề</legend>
        <div className="g-chips">
          <button className="g-chip" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
            Tất cả
          </button>
          {TOPICS.map((t) => (
            <button key={t.id} className="g-chip" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>
              {t.title}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="g-field">
        <legend>Độ khó</legend>
        <div className="g-diff">
          {Object.entries(DIFF).map(([id, d]) => (
            <button key={id} className="g-diff-btn" aria-pressed={diff === id} onClick={() => setDiff(id)}>
              <strong>{d.label}</strong>
              <span>{d.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="g-card-foot">
        <span className="g-best">
          <Trophy size={20} weight="fill" aria-hidden="true" /> Kỷ lục: {best}
        </span>
        <button className="btn btn--shu" onClick={onStart} autoFocus>
          Bắt đầu
        </button>
      </div>
      <p className="g-note">
        <Keyboard size={18} weight="bold" aria-hidden="true" /> Chuyển bàn phím sang tiếng Anh. Có thể gõ shi hoặc si, tsu hoặc tu, nn cho ん. Esc để tạm dừng.
      </p>
    </div>
  );
}

function Over({ s, onAgain, onMenu }) {
  return (
    <div className="g-card" role="dialog" aria-labelledby="g-over-title">
      <h1 id="g-over-title">{s.won ? 'Bạn đã qua cả 20 mốc!' : 'Hết lượt'}</h1>
      <div className="g-results">
        <div><strong>{s.score}</strong><span>điểm{s.newBest ? ', kỷ lục mới' : ''}</span></div>
        <div><strong>{s.kills}</strong><span>từ bắn hạ</span></div>
        <div><strong>{s.milestone}/{MILESTONES}</strong><span>mốc đạt được</span></div>
        <div><strong>+{s.xp}</strong><span>XP</span></div>
      </div>
      {s.missed.length > 0 && (
        <>
          <h2 className="g-sub">Từ cần ôn lại</h2>
          <ul className="g-missed">
            {s.missed.map((w, i) => (
              <li key={w.jp + i}>
                <span className="jp" lang="ja">{w.jp}</span>
                <span className="g-missed-read">{w.kana}, {kanaToRomaji(w.kana)}</span>
                <span className="g-missed-vi">{w.vi}</span>
                <SpeakButton text={w.kana} label={`Nghe ${w.jp}`} className="g-icon" size={18} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="g-card-foot">
        <button className="btn" onClick={onMenu}>Đổi chủ đề</button>
        <button className="btn btn--shu" onClick={onAgain} autoFocus>
          <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Chơi lại
        </button>
      </div>
    </div>
  );
}

/* ================= Arena (the actual game) ================= */

function Arena({ topic, diff, onEnd, onQuit }) {
  const { settings, updateSettings } = useProgress();
  const cfg = DIFF[diff];
  const topicTitle = topic === 'all' ? 'Tất cả chủ đề' : topicById(topic)?.title;
  const pool = useMemo(() => (topic === 'all' ? ALL_WORDS : topicById(topic).words), [topic]);

  const arenaRef = useRef(null);
  const inputRef = useRef(null);
  const size = useRef({ w: 800, h: 600 });
  const eng = useRef(null);
  const [, setTick] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [paused, setPaused] = useState(false);
  const [shake, setShake] = useState(0);
  const sound = settings.sound;
  const soundRef = useRef(sound);
  soundRef.current = sound;

  if (!eng.current) {
    eng.current = {
      words: [], effects: [], queue: shuffle(pool), nextId: 1,
      kills: 0, score: 0, lives: 3, combo: 0, killed: [], missed: [],
      lastSpawn: -Infinity, time: 0, target: null, over: false,
    };
  }
  const e = eng.current;
  const milestone = Math.min(MILESTONES, 1 + Math.floor(e.kills / KILLS_PER_MILESTONE));

  // measure arena
  useEffect(() => {
    const el = arenaRef.current;
    const ro = new ResizeObserver(([entry]) => {
      size.current = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const end = useCallback(
    (won) => {
      if (e.over) return;
      e.over = true;
      onEnd({
        won, score: e.score, kills: e.kills, lives: e.lives,
        milestone: Math.min(MILESTONES, 1 + Math.floor(e.kills / KILLS_PER_MILESTONE)),
        missed: e.missed, killed: e.killed,
      });
    },
    [e, onEnd],
  );

  const spawn = useCallback(() => {
    if (!e.queue.length) e.queue = shuffle(pool);
    const onScreen = new Set(e.words.map((w) => w.w.jp));
    let idx = e.queue.findIndex((w) => !onScreen.has(w.jp));
    if (idx < 0) return;
    const w = e.queue.splice(idx, 1)[0];
    const { w: W } = size.current;
    const est = Math.max(110, w.jp.length * 46 + 40);
    let x = 0;
    for (let tries = 0; tries < 8; tries++) {
      x = 16 + Math.random() * Math.max(10, W - est - 90);
      if (e.words.every((o) => o.y > 140 || Math.abs(o.x - x) > est)) break;
    }
    e.words.push({
      id: e.nextId++, w, units: tokenize(w.kana), x, y: -70, done: 0,
      tone: TONES[e.nextId % TONES.length],
    });
  }, [e, pool]);

  // main loop
  useEffect(() => {
    if (paused) return undefined;
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      e.time += dt * 1000;
      const m = Math.min(MILESTONES, 1 + Math.floor(e.kills / KILLS_PER_MILESTONE));
      const speed = cfg.speed + (m - 1) * 3.2;
      const interval = Math.max(950, cfg.spawn - (m - 1) * 95);
      const maxOn = Math.min(8, 3 + Math.floor(m / 3));
      if ((e.time - e.lastSpawn > interval || e.words.length === 0) && e.words.length < maxOn) {
        spawn();
        e.lastSpawn = e.time;
      }
      const floor = size.current.h - GROUND;
      for (const w of e.words) w.y += speed * dt * (w.id === e.target ? 0.85 : 1);
      const crashed = e.words.filter((w) => w.y + WORD_H > floor);
      if (crashed.length) {
        e.words = e.words.filter((w) => w.y + WORD_H <= floor);
        crashed.forEach((w) => {
          e.lives -= 1;
          e.combo = 0;
          e.missed.push(w.w);
          e.effects.push({ id: `c${w.id}`, type: 'crash', x: w.x + 50, y: floor, t: e.time });
          if (w.id === e.target) {
            e.target = null;
            setBuffer('');
          }
        });
        blip('hit', soundRef.current);
        setShake((s) => s + 1);
        if (e.lives <= 0) {
          end(false);
          return;
        }
      }
      e.effects = e.effects.filter((fx) => e.time - fx.t < (fx.type === 'pop' ? 1400 : 650));
      setTick((t) => (t + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, cfg, e, spawn, end]);

  // pause on tab switch, Esc toggles pause
  useEffect(() => {
    const vis = () => document.hidden && setPaused(true);
    const key = (ev) => {
      if (ev.key === 'Escape') setPaused((p) => !p);
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('keydown', key);
    };
  }, []);

  useEffect(() => {
    if (!paused) inputRef.current?.focus();
  }, [paused]);

  const kill = (w) => {
    const { w: W, h: H } = size.current;
    e.words = e.words.filter((o) => o.id !== w.id);
    e.target = null;
    e.combo += 1;
    e.kills += 1;
    e.killed.push(w.w.jp);
    const gained = Math.round(10 * w.units.length * (1 + Math.min(e.combo, 10) * 0.1));
    e.score += gained;
    const cx = w.x + 60;
    const cy = w.y + 30;
    e.effects.push({ id: `l${w.id}`, type: 'laser', x1: W / 2, y1: H - 70, x2: cx, y2: cy, t: e.time });
    e.effects.push({ id: `b${w.id}`, type: 'boom', x: cx, y: cy, t: e.time, tone: w.tone });
    e.effects.push({ id: `p${w.id}`, type: 'pop', x: cx, y: cy, t: e.time, text: `${w.w.jp} = ${w.w.vi}`, gained });
    blip('laser', soundRef.current);
    if (soundRef.current) speak(w.w.kana, { rate: 1.05 });
    if (e.kills >= MILESTONES * KILLS_PER_MILESTONE) end(true);
  };

  const onType = (raw) => {
    if (paused || e.over) return;
    const v = raw.toLowerCase().replace(/\s/g, '');
    if (v.length <= buffer.length) {
      // deleting: keep target, recompute progress
      setBuffer(v);
      const t = e.words.find((w) => w.id === e.target);
      if (t) t.done = v ? matchRomaji(t.units, v).unitsDone : 0;
      if (!v) e.target = null;
      return;
    }
    const kanaMode = /[぀-ヿ]/.test(v);
    const test = (w) => {
      if (kanaMode) {
        const a = toHiragana(v);
        const target = toHiragana(w.w.kana);
        return { ok: target.startsWith(a), done: target === a, unitsDone: a.length };
      }
      return matchRomaji(w.units, v);
    };
    const cands = e.words.map((w) => ({ w, r: test(w) })).filter((c) => c.r.ok);
    if (!cands.length) {
      e.combo = 0;
      blip('bad', soundRef.current);
      setShake((s) => s + 1);
      return; // reject keystroke
    }
    const locked = cands.find((c) => c.w.id === e.target);
    const pick = locked || cands.sort((a, b) => b.w.y - a.w.y)[0];
    e.words.forEach((w) => { w.done = 0; });
    e.target = pick.w.id;
    pick.w.done = pick.r.unitsDone;
    if (pick.r.done) {
      kill(pick.w);
      setBuffer('');
    } else {
      setBuffer(v);
      blip('key', soundRef.current);
    }
  };

  const { w: W, h: H } = size.current;
  const target = e.words.find((w) => w.id === e.target);
  const angle = target ? (Math.atan2(target.x + 60 - W / 2, H - 70 - (target.y + 30)) * 180) / Math.PI : 0;

  return (
    <div
      className={`arena${shake % 2 ? ' shake-a' : shake ? ' shake-b' : ''}`}
      ref={arenaRef}
      onPointerDown={(ev) => {
        if (ev.target.closest('button')) return;
        ev.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <Starfield />

      <div className="hud">
        <span className="hud-pill">
          <Trophy size={20} weight="fill" color="var(--yamabuki)" aria-hidden="true" />
          <strong>{e.score}</strong>
          {e.combo > 1 && <span className="hud-combo">x{e.combo}</span>}
        </span>
        <span className="hud-pill hud-mile">
          <Flag size={20} weight="bold" aria-hidden="true" />
          <strong>Mốc {milestone}/{MILESTONES}</strong>
          <span className="hud-topic">{topicTitle}</span>
        </span>
        <span className="hud-pill" aria-label={`Còn ${e.lives} mạng`}>
          {[0, 1, 2].map((i) => (
            <Heart key={i} size={20} weight={i < e.lives ? 'fill' : 'bold'} color={i < e.lives ? '#ff5d73' : '#8c90b8'} aria-hidden="true" />
          ))}
        </span>
      </div>

      <div className="side-ctrl">
        <button className="g-icon" aria-label="Thoát game" onClick={onQuit}>
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
        <button className="g-icon" aria-label={paused ? 'Tiếp tục' : 'Tạm dừng'} onClick={() => setPaused((x) => !x)}>
          {paused ? <Play size={20} weight="fill" aria-hidden="true" /> : <Pause size={20} weight="fill" aria-hidden="true" />}
        </button>
        <button
          className="g-icon"
          aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
          aria-pressed={!sound}
          onClick={() => updateSettings({ sound: !sound })}
        >
          {sound ? <SpeakerHigh size={20} weight="fill" aria-hidden="true" /> : <SpeakerSlash size={20} weight="fill" aria-hidden="true" />}
        </button>
      </div>

      {/* falling words */}
      {e.words.map((w) => (
        <FallingWord key={w.id} w={w} cfg={cfg} isTarget={w.id === e.target} />
      ))}

      {/* effects */}
      <svg className="fx-layer" width={W} height={H} aria-hidden="true">
        {e.effects.filter((f) => f.type === 'laser').map((f) => (
          <line key={f.id} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} className="laser" />
        ))}
      </svg>
      {e.effects.filter((f) => f.type === 'boom').map((f) => (
        <div key={f.id} className={`boom tone-${f.tone}`} style={{ left: f.x, top: f.y }} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ '--a': `${i * 36}deg` }} />
          ))}
        </div>
      ))}
      {e.effects.filter((f) => f.type === 'pop').map((f) => (
        <div key={f.id} className="pop" style={{ left: f.x, top: f.y }}>
          <span className="jp" lang="ja">{f.text}</span>
          <small>+{f.gained}</small>
        </div>
      ))}
      {e.effects.filter((f) => f.type === 'crash').map((f) => (
        <div key={f.id} className="crash" style={{ left: f.x, top: f.y }} aria-hidden="true" />
      ))}

      {/* ground, defender, ship */}
      <div className="ground" style={{ bottom: GROUND - 2 }} aria-hidden="true" />
      <div className="ship" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} aria-hidden="true">
        <svg viewBox="0 0 64 80" width="56" height="70">
          <path d="M32 2C20 14 16 34 18 54h28c2-20-2-40-14-52z" fill="#e8eef8" />
          <path d="M32 2c-5 5-8 11-10 18h20C40 13 37 7 32 2z" fill="var(--shu)" />
          <circle cx="32" cy="34" r="7" fill="#24456b" stroke="#9fc3f0" strokeWidth="3" />
          <path d="M18 40L6 58l14-4zM46 40l12 18-14-4z" fill="var(--shu)" />
          <path d="M24 54h16l-3 10h-10z" fill="#9fb1c9" />
          <path className="flame" d="M26 64h12l-6 14z" fill="#f2b230" />
        </svg>
      </div>

      <label className="type-bar">
        <span className="sr-only">Gõ romaji để bắn</span>
        <input
          ref={inputRef}
          value={buffer}
          onChange={(ev) => onType(ev.target.value)}
          placeholder="gõ romaji..."
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby="g-live"
        />
      </label>
      <p id="g-live" className="sr-only" aria-live="polite">
        {target ? `Đang nhắm: ${target.w.vi}` : ''}
      </p>

      {paused && (
        <div className="g-pause" role="dialog" aria-labelledby="g-paused">
          <div className="g-card g-card--sm">
            <h2 id="g-paused">Tạm dừng</h2>
            <p>Mốc {milestone}/{MILESTONES}, {e.score} điểm, còn {e.lives} mạng.</p>
            <div className="g-card-foot">
              <button className="btn" onClick={onQuit}>Thoát</button>
              <button className="btn btn--shu" onClick={() => setPaused(false)} autoFocus>
                Chơi tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FallingWord({ w, cfg, isTarget }) {
  const parts = rubyParts(w.w.jp, w.w.kana);
  const typedLen = w.units.slice(0, w.done).reduce((n, u) => n + u.kana.length, 0);
  const typed = w.w.kana.slice(0, typedLen); // keeps katakana as katakana
  const romaji = kanaToRomaji(w.w.kana);
  return (
    <div
      className={`fword tone-${w.tone}${isTarget ? ' is-target' : ''}`}
      style={{ transform: `translate(${w.x}px, ${w.y}px)` }}
    >
      <span className="fword-jp jp" lang="ja">
        {parts.map((pt, i) =>
          pt.ruby && cfg.furigana ? (
            <ruby key={i}>
              {pt.text}
              <rt>{pt.ruby}</rt>
            </ruby>
          ) : (
            <span key={i}>{pt.text}</span>
          ),
        )}
      </span>
      {(isTarget || cfg.romaji) && (
        <span className="fword-read">
          {isTarget && <span className="fword-typed jp">{typed}</span>}
          {cfg.romaji && <span className="fword-romaji">{romaji}</span>}
        </span>
      )}
    </div>
  );
}
