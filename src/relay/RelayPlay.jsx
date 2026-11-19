import { useEffect, useRef, useState } from 'react';
import {
  X, SpeakerHigh, Microphone, Stop, Keyboard, Eye, EyeSlash, ArrowRight, ArrowCounterClockwise,
  Lightning, Lightbulb, Envelope, Cards, PencilSimple, Microphone as Mic,
} from '@phosphor-icons/react';
import {
  DIFFICULTIES, scenarioById, previewWords, buildFill, starsOf, delivered, feedbackText, tierUnlocked, tierProgress,
} from '../lib/relayTiers';
import { useProgress, go } from '../lib/store';
import { speak, stopSpeaking, listen, recognitionSupported, blip } from '../lib/speech';
import { normalizeJa, similarity, sentenceRomaji } from '../lib/kana';
import { Daru, Word, Stars, MailStamp } from '../components/Bits';
import { TileMode, FillMode } from './modes';
import '../pages/home.css';
import '../pages/vocab.css';
import '../pages/lesson.css';
import './relay.css';

export function scoreRelay(answer, step) {
  const norm = normalizeJa(answer);
  const hits = step.keypoints.map((kp) => kp.accept.some((a) => norm.includes(normalizeJa(a))));
  const kpRatio = hits.filter(Boolean).length / hits.length;
  const sim = Math.max(similarity(norm, normalizeJa(step.model.jp)), similarity(norm, normalizeJa(step.model.kana)));
  const score = Math.round(100 * (0.7 * kpRatio + 0.3 * Math.min(1, sim * 1.25)));
  return { score, hits, sim };
}

const HINT_PENALTY = 8;
const MODE_INFO = {
  tiles: { label: 'Ghép thẻ', Icon: Cards },
  fill: { label: 'Điền từ', Icon: PencilSimple },
  speak: { label: 'Nói / gõ', Icon: Mic },
};

function Avatar({ person, you, active, speaking }) {
  return (
    <div className={`actor${active ? ' is-active' : ''}${speaking ? ' is-speaking' : ''}`}>
      {you ? (
        <span className="avatar avatar--you"><Daru size={64} /></span>
      ) : (
        <span className={`avatar tone-${person.tone}`} aria-hidden="true">{person.glyph}</span>
      )}
      <strong>{you ? 'Bạn' : person.name}</strong>
      <small>{you ? 'Người đưa thư' : person.role}</small>
    </div>
  );
}

function Sentence({ s, showKana = true, showVi = false }) {
  const { settings } = useProgress();
  return (
    <div className="sentence">
      <p className="sentence-jp jp" lang="ja">{s.jp}</p>
      {showKana && settings.furigana && s.kana !== s.jp && <p className="sentence-kana jp" lang="ja">{s.kana}</p>}
      {showKana && settings.romaji && <p className="sentence-romaji">{sentenceRomaji(s.kana)}</p>}
      {showVi && <p className="sentence-vi">{s.vi}</p>}
    </div>
  );
}

export default function RelayPlay({ id }) {
  const sc = scenarioById(id);
  const { settings, addXp, setRelayScore, relay } = useProgress();
  const diff = DIFFICULTIES[settings.relayDiff || 'easy'];
  const tier = sc?.tier || 3;
  const needsWords = tier < 3;
  const freeHint = tier === 1;

  const [stepIdx, setStepIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState(needsWords ? 'words' : 'listen'); // words | listen | hold | relay | result | done
  const [listensLeft, setListensLeft] = useState(diff.listens);
  const [speaking, setSpeaking] = useState(false);
  const [holdLeft, setHoldLeft] = useState(diff.delay);
  const [answer, setAnswer] = useState('');
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [typing, setTyping] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [mode, setMode] = useState(null);
  const [results, setResults] = useState([]);
  const [earned, setEarned] = useState(0);
  const stopRec = useRef(null);
  const step = sc?.steps[stepIdx];
  const inListen = phase === 'listen';

  const availableModes = step
    ? [step.chunks && 'tiles', buildFill(step) && 'fill', 'speak'].filter(Boolean)
    : ['speak'];
  const defaultMode = { 1: 'tiles', 2: 'fill', 3: 'speak' }[tier];
  const activeMode = availableModes.includes(mode) ? mode : availableModes.includes(defaultMode) ? defaultMode : 'speak';

  const play = (rate = settings.rate) => {
    if (listensLeft <= 0 || speaking) return;
    setListensLeft((n) => n - 1);
    setSpeaking(true);
    speak(step.message.jp, { rate, onEnd: () => setSpeaking(false) });
  };

  // read the message aloud automatically when a listening turn starts
  useEffect(() => {
    if (!sc || !inListen) return undefined;
    setListensLeft(diff.listens - 1);
    setSpeaking(true);
    const t = setTimeout(() => speak(step.message.jp, { rate: settings.rate, onEnd: () => setSpeaking(false) }), 450);
    return () => { clearTimeout(t); stopSpeaking(); };
  }, [stepIdx, attempt, inListen]); // eslint-disable-line react-hooks/exhaustive-deps

  // "walking to the next person" countdown (hard listening mode)
  useEffect(() => {
    if (phase !== 'hold') return undefined;
    if (holdLeft <= 0) { setPhase('relay'); return undefined; }
    const t = setTimeout(() => setHoldLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, holdLeft]);

  useEffect(() => () => stopRec.current?.(), []);

  if (!sc) {
    return (
      <div className="page">
        <p>Không tìm thấy lá thư này.</p>
        <a className="btn" href="#/relay">Về danh sách</a>
      </div>
    );
  }

  if (!tierUnlocked(tier, relay, settings.relayUnlockAll)) {
    const prog = tierProgress(tier, relay);
    return (
      <div className="page">
        <div className="panel" style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Lá thư này chưa mở</h1>
          <p className="muted" style={{ marginBottom: 16 }}>
            Giao thành công {prog.need} lá thư ở Bậc {tier - 1} (bạn mới giao {prog.have}) để mở Bậc {tier}.
          </p>
          <a className="btn btn--ai" href="#/relay">Về danh sách thư</a>
        </div>
      </div>
    );
  }

  const from = sc.cast[step.from];
  const to = sc.cast[step.to];
  const words = previewWords(step);

  const showHint = () => {
    setShowVi((v) => !v);
    setHintUsed(true);
  };

  const goRelay = () => {
    stopSpeaking();
    setSpeaking(false);
    if (diff.delay) { setHoldLeft(diff.delay); setPhase('hold'); } else setPhase('relay');
  };

  const toggleMic = () => {
    if (recording) { stopRec.current?.(); return; }
    setMicError('');
    setRecording(true);
    const base = answer ? answer + ' ' : '';
    stopRec.current = listen({
      onResult: (text) => setAnswer(base + text),
      onEnd: () => setRecording(false),
      onError: (err) => {
        setRecording(false);
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setMicError('Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép, hoặc gõ câu trả lời.');
          setTyping(true);
        } else if (err === 'no-speech') setMicError('Chưa nghe thấy giọng nói. Bấm micro và nói lại nhé.');
        else if (err !== 'aborted') { setMicError('Không nhận diện được giọng nói. Hãy thử lại hoặc gõ câu trả lời.'); setTyping(true); }
      },
    });
  };

  // every answer mode ends here: { answer, score, hits? | tested? }
  const finish = ({ answer: said, score, hits, tested }) => {
    stopRec.current?.();
    const h = hits || step.keypoints.map((kp, i) => (tested ? tested[i] : scoreRelay(said, step).hits[i]));
    const penalty = hintUsed && !freeHint ? HINT_PENALTY : 0;
    const final = Math.max(0, score - penalty);
    blip(delivered(final) ? 'ok' : 'bad', settings.sound);
    setResults((rs) => { const c = [...rs]; c[stepIdx] = { score: final, hits: h, answer: said, penalty }; return c; });
    setPhase('result');
  };

  const submitSpoken = () => {
    if (!answer.trim()) return;
    const r = scoreRelay(answer, step);
    finish({ answer, score: r.score, hits: r.hits });
  };

  const retry = () => {
    setAnswer('');
    setShowVi(false);
    setHintUsed(false);
    setAttempt((a) => a + 1);
    setListensLeft(diff.listens);
    setPhase('listen');
  };

  const resetStep = (nextPhase) => {
    setAnswer('');
    setShowVi(false);
    setHintUsed(false);
    setMicError('');
    setPhase(nextPhase);
  };

  const nextStep = () => {
    if (stepIdx + 1 < sc.steps.length) {
      setStepIdx(stepIdx + 1);
      resetStep(needsWords ? 'words' : 'listen');
    } else {
      const avg = Math.round(results.reduce((a, r) => a + r.score, 0) / sc.steps.length);
      const xp = 8 + starsOf(avg) * 4 + (diff.id === 'hard' ? 4 : 0);
      addXp(xp);
      setEarned(xp);
      setRelayScore(sc.id, avg);
      setPhase('done');
    }
  };

  const restart = () => {
    setResults([]);
    setStepIdx(0);
    setAttempt((a) => a + 1);
    setListensLeft(diff.listens);
    resetStep(needsWords ? 'words' : 'listen');
  };

  const res = results[stepIdx];
  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / sc.steps.length) : 0;
  const avgStars = starsOf(avg);

  return (
    <div className="relay">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="Thoát" onClick={() => { stopSpeaking(); go('/relay'); }}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <div className="relay-steps" aria-label={`Thư ${stepIdx + 1} trên ${sc.steps.length}`}>
          {sc.steps.map((_, i) => (
            <span key={i} className={i < stepIdx || phase === 'done' ? 'is-done' : i === stepIdx ? 'is-now' : ''} />
          ))}
        </div>
        <span className="chip">Bậc {tier}</span>
      </header>

      {phase === 'done' ? (
        <div className="relay-body relay-done">
          {avgStars >= 2 ? <MailStamp title={sc.title} size={104} tone="shu" /> : <Daru size={96} />}
          <h1>{avgStars >= 2 ? 'Thư đã giao tới nơi' : 'Thư chưa tới nơi'}</h1>
          <Stars value={avgStars} size={34} />
          <p className="muted">
            {sc.title}.{' '}
            {avgStars >= 2 ? 'Bạn vừa nhận thêm một tem thư vào sổ.' : 'Thử lại để nhận tem thư nhé, Daru tin là bạn làm được.'}
          </p>
          <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Lightning size={24} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
            <strong>+{earned} điểm</strong>
          </div>
          <div className="lesson-actions">
            <button className="btn" onClick={restart}>
              <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Giao lại
            </button>
            <a className="btn btn--ai" href="#/relay">Lá thư khác</a>
          </div>
        </div>
      ) : (
        <div className="relay-body">
          <p className="relay-place">{sc.title}, thư {stepIdx + 1}/{sc.steps.length}</p>

          <div className={`relay-line phase-${phase}`}>
            <Avatar person={from} active={phase === 'listen' || phase === 'words'} speaking={speaking && phase === 'listen'} />
            <span className="relay-arrow" aria-hidden="true"><ArrowRight size={26} weight="bold" /></span>
            <Avatar you active={phase === 'hold' || phase === 'relay'} />
            <span className="relay-arrow" aria-hidden="true"><ArrowRight size={26} weight="bold" /></span>
            <Avatar person={to} active={phase === 'relay' || phase === 'result'} />
          </div>

          {phase === 'words' && (
            <section className="relay-card" aria-labelledby="words-h">
              <h2 id="words-h">Học nhanh vài từ trước nhé</h2>
              <p className="muted">Lá thư này có những từ sau. Bấm vào thẻ để nghe.</p>
              <ul className="word-cards">
                {words.map((w) => (
                  <li key={w.jp}>
                    <button type="button" className="word-card" onClick={() => speak(w.kana, { rate: settings.rate })} aria-label={`Nghe ${w.jp}, nghĩa là ${w.vi}`}>
                      <Word jp={w.jp} kana={w.kana} size={28} />
                      <span className="word-card-vi">{w.vi}</span>
                      <SpeakerHigh size={18} weight="bold" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn btn--ai btn--block" onClick={() => setPhase('listen')}>
                Nghe lời nhắn của {from.name}
              </button>
            </section>
          )}

          {phase === 'listen' && (
            <section className="relay-card" aria-labelledby="listen-h">
              <h2 id="listen-h">{from.name} nhờ bạn nhắn lại cho {to.name}</h2>
              <div className={`bubble${speaking ? ' is-speaking' : ''}`}>
                {diff.showText ? (
                  <Sentence s={step.message} showVi={showVi} />
                ) : (
                  <div className="wave" aria-label={speaking ? 'Đang phát' : 'Nội dung bị ẩn, hãy nghe'}>
                    {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />)}
                    {showVi && <p className="sentence-vi wave-vi">{step.message.vi}</p>}
                  </div>
                )}
              </div>
              <div className="relay-actions">
                <button className="btn btn--ai" onClick={() => play()} disabled={listensLeft <= 0 || speaking}>
                  <SpeakerHigh size={20} weight="fill" aria-hidden="true" /> Nghe lại ({listensLeft})
                </button>
                <button className="btn" onClick={() => play(0.65)} disabled={listensLeft <= 0 || speaking}>
                  Nghe chậm
                </button>
                {diff.id !== 'hard' && (
                  <button className="btn btn--ghost" onClick={showHint} aria-pressed={showVi}>
                    {showVi ? <EyeSlash size={20} weight="bold" aria-hidden="true" /> : <Eye size={20} weight="bold" aria-hidden="true" />}
                    {showVi ? 'Ẩn nghĩa' : 'Xem nghĩa tiếng Việt'}
                  </button>
                )}
              </div>
              {!freeHint && diff.id !== 'hard' && <p className="hint-note"><Lightbulb size={16} weight="bold" aria-hidden="true" /> Xem nghĩa sẽ bị trừ một chút điểm.</p>}
              <button className="btn btn--ai btn--block" onClick={goRelay}>
                Mình nhớ rồi, đi giao thư
              </button>
            </section>
          )}

          {phase === 'hold' && (
            <section className="relay-card relay-hold" aria-live="polite">
              <h2>Daru đang mang thư tới {to.name}</h2>
              <div className="runner" aria-hidden="true">
                <span className="runner-track" />
                <span className="runner-daru" style={{ animationDuration: `${Math.max(1, diff.delay)}s` }}>
                  <Daru size={44} />
                  <Envelope size={22} weight="fill" className="runner-letter" />
                </span>
              </div>
              <p className="hold-count">{holdLeft}</p>
              <p className="muted">Nhẩm lại lời nhắn trong đầu nhé.</p>
            </section>
          )}

          {phase === 'relay' && (
            <section className="relay-card" aria-labelledby="relay-h">
              <h2 id="relay-h">Nhắn lại cho {to.name} ({to.role})</h2>
              <ul className="kp-hints" aria-label="Những ý cần nhắn">
                {step.keypoints.map((kp) => <li key={kp.label} className="chip">{kp.label}?</li>)}
              </ul>

              {availableModes.length > 1 && (
                <div className="seg" role="tablist" aria-label="Cách trả lời" style={{ margin: 0 }}>
                  {availableModes.map((m) => {
                    const { label, Icon } = MODE_INFO[m];
                    return (
                      <button key={m} role="tab" aria-selected={activeMode === m} onClick={() => setMode(m)}>
                        <Icon size={20} weight="bold" aria-hidden="true" /> {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {diff.id !== 'hard' && (
                <button className="btn btn--ghost btn--sm hint-btn" onClick={showHint} aria-pressed={showVi}>
                  <Lightbulb size={18} weight="bold" aria-hidden="true" />
                  {showVi ? 'Ẩn gợi ý' : 'Gợi ý bằng tiếng Việt'}
                </button>
              )}
              {showVi && <p className="hint-vi">{step.message.vi}</p>}

              {activeMode === 'tiles' && <TileMode key={`t${stepIdx}-${attempt}`} step={step} onSubmit={finish} />}
              {activeMode === 'fill' && <FillMode key={`f${stepIdx}-${attempt}`} step={step} onSubmit={finish} />}
              {activeMode === 'speak' && (
                <>
                  {recognitionSupported() && (
                    <div className="mic-wrap">
                      <button
                        className={`mic${recording ? ' is-rec' : ''}`}
                        onClick={toggleMic}
                        aria-pressed={recording}
                        aria-label={recording ? 'Dừng ghi âm' : 'Bấm để nói'}
                      >
                        {recording ? <Stop size={40} weight="fill" aria-hidden="true" /> : <Microphone size={40} weight="fill" aria-hidden="true" />}
                      </button>
                      <span className="muted">{recording ? 'Đang nghe, nói xong bấm dừng' : 'Bấm và nói bằng tiếng Nhật'}</span>
                    </div>
                  )}
                  {micError && <p className="relay-error" role="alert">{micError}</p>}
                  {(typing || answer || !recognitionSupported()) && (
                    <label className="answer-field">
                      <span>{recording || (!typing && answer) ? 'Bạn đã nói (có thể sửa)' : 'Câu trả lời (tiếng Nhật hoặc romaji)'}</span>
                      <textarea
                        value={answer}
                        onChange={(ev) => setAnswer(ev.target.value)}
                        rows={3}
                        lang="ja"
                        placeholder="ví dụ: 部長、会議は三時からになったそうです。"
                      />
                    </label>
                  )}
                  <div className="relay-actions">
                    {!typing && recognitionSupported() && (
                      <button className="btn btn--ghost" onClick={() => setTyping(true)}>
                        <Keyboard size={20} weight="bold" aria-hidden="true" /> Gõ thay vì nói
                      </button>
                    )}
                    <button className="btn btn--ai" onClick={submitSpoken} disabled={!answer.trim() || recording}>
                      Giao thư
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {phase === 'result' && res && (
            <section className="relay-card" aria-labelledby="result-h">
              <div className="result-head">
                <Daru size={72} mood={starsOf(res.score) >= 2 ? 'happy' : 'idle'} />
                <div>
                  <h2 id="result-h">
                    {starsOf(res.score) === 3 ? 'Giao thư rất chuẩn!' : starsOf(res.score) === 2 ? 'Thư đã tới nơi' : 'Thư còn thiếu ý'}
                  </h2>
                  <Stars value={starsOf(res.score)} size={28} />
                </div>
              </div>
              <p className="feedback-line">{feedbackText(step, res.hits)}</p>
              {res.penalty > 0 && <p className="hint-note"><Lightbulb size={16} weight="bold" aria-hidden="true" /> Bạn có xem gợi ý nên bị trừ một chút điểm.</p>}

              <ul className="kp-list">
                {step.keypoints.map((kp, i) =>
                  res.hits[i] === null || res.hits[i] === undefined ? null : (
                    <li key={kp.label} className={res.hits[i] ? 'hit' : 'miss'}>
                      <span className="kp-mark" aria-hidden="true">{res.hits[i] ? '○' : '×'}</span>
                      <span>
                        <strong>{kp.label}:</strong> {kp.vi} <span className="jp" lang="ja">({kp.accept[0]})</span>
                      </span>
                      <span className="sr-only">{res.hits[i] ? 'đã có' : 'bị thiếu'}</span>
                    </li>
                  ),
                )}
              </ul>

              <div className="compare">
                <div>
                  <h3>Bạn đã nhắn</h3>
                  <p className="jp" lang="ja">{res.answer}</p>
                </div>
                <div>
                  <h3>
                    Câu mẫu
                    <button className="icon-btn" aria-label="Nghe câu mẫu" onClick={() => speak(step.model.jp, { rate: settings.rate })}>
                      <SpeakerHigh size={20} weight="bold" aria-hidden="true" />
                    </button>
                  </h3>
                  <Sentence s={step.model} showVi />
                </div>
                <div>
                  <h3>
                    Lời nhắn gốc
                    <button className="icon-btn" aria-label="Nghe lời nhắn gốc" onClick={() => speak(step.message.jp, { rate: settings.rate })}>
                      <SpeakerHigh size={20} weight="bold" aria-hidden="true" />
                    </button>
                  </h3>
                  <Sentence s={step.message} showVi />
                </div>
              </div>

              <div className="relay-actions">
                <button className="btn" onClick={retry}>
                  <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Giao lại lá thư này
                </button>
                <button className="btn btn--ai" onClick={nextStep} autoFocus>
                  {stepIdx + 1 < sc.steps.length ? 'Lá thư tiếp theo' : 'Xem kết quả'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
