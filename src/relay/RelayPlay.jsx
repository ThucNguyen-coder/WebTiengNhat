import { useEffect, useRef, useState } from 'react';
import {
  X, SpeakerHigh, Microphone, Stop, Keyboard, CheckCircle, XCircle, Eye, EyeSlash, ArrowRight, ArrowCounterClockwise,
  Lightning,
} from '@phosphor-icons/react';
import { scenarioById, DIFFICULTIES } from '../data/relay';
import { useProgress, go } from '../lib/store';
import { speak, stopSpeaking, listen, recognitionSupported, blip } from '../lib/speech';
import { normalizeJa, similarity, sentenceRomaji } from '../lib/kana';
import { Daru, Hanko } from '../components/Bits';
import '../pages/home.css';
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

function Avatar({ person, you, active, speaking }) {
  return (
    <div className={`actor${active ? ' is-active' : ''}${speaking ? ' is-speaking' : ''}`}>
      {you ? (
        <span className="avatar avatar--you"><Daru size={64} /></span>
      ) : (
        <span className={`avatar tone-${person.tone}`} aria-hidden="true">{person.glyph}</span>
      )}
      <strong>{you ? 'Bạn' : person.name}</strong>
      <small>{you ? 'Người truyền tin' : person.role}</small>
    </div>
  );
}

function Sentence({ s, showKana = true, showVi = false }) {
  const { settings } = useProgress();
  return (
    <div className="sentence">
      <p className="sentence-jp jp" lang="ja">{s.jp}</p>
      {showKana && settings.furigana && <p className="sentence-kana jp" lang="ja">{s.kana}</p>}
      {showKana && settings.romaji && <p className="sentence-romaji">{sentenceRomaji(s.kana)}</p>}
      {showVi && <p className="sentence-vi">{s.vi}</p>}
    </div>
  );
}

export default function RelayPlay({ id }) {
  const sc = scenarioById(id);
  const { settings, addXp, setRelayScore } = useProgress();
  const diff = DIFFICULTIES[settings.relayDiff || 'easy'];

  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState('listen'); // listen | hold | relay | result | done
  const [listensLeft, setListensLeft] = useState(diff.listens);
  const [speaking, setSpeaking] = useState(false);
  const [holdLeft, setHoldLeft] = useState(diff.delay);
  const [answer, setAnswer] = useState('');
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [typing, setTyping] = useState(!recognitionSupported());
  const [showVi, setShowVi] = useState(false);
  const [results, setResults] = useState([]);
  const [earned, setEarned] = useState(0);
  const stopRec = useRef(null);
  const step = sc?.steps[stepIdx];

  const play = (rate = settings.rate) => {
    if (listensLeft <= 0 || speaking) return;
    setListensLeft((n) => n - 1);
    setSpeaking(true);
    speak(step.message.jp, { rate, onEnd: () => setSpeaking(false) });
  };

  // auto-play the first listen of each step
  useEffect(() => {
    if (!sc) return undefined;
    setListensLeft(diff.listens - 1);
    setSpeaking(true);
    const t = setTimeout(() => speak(step.message.jp, { rate: settings.rate, onEnd: () => setSpeaking(false) }), 450);
    return () => { clearTimeout(t); stopSpeaking(); };
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // memory hold countdown (hard mode)
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
        <p>Không tìm thấy tình huống này.</p>
        <a className="btn" href="#/relay">Về danh sách</a>
      </div>
    );
  }

  const from = sc.cast[step.from];
  const to = sc.cast[step.to];

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
        } else if (err === 'no-speech') setMicError('Chưa nghe thấy giọng nói. Bấm micro và nói lại.');
        else if (err !== 'aborted') { setMicError('Không nhận diện được giọng nói. Hãy thử lại hoặc gõ câu trả lời.'); setTyping(true); }
      },
    });
  };

  const submit = () => {
    if (!answer.trim()) return;
    stopRec.current?.();
    const r = scoreRelay(answer, step);
    blip(r.score >= 60 ? 'ok' : 'bad', settings.sound);
    setResults((rs) => { const c = [...rs]; c[stepIdx] = { ...r, answer }; return c; });
    setPhase('result');
  };

  const retry = () => {
    setAnswer('');
    setShowVi(false);
    setPhase('listen');
    setListensLeft(diff.listens);
  };

  const nextStep = () => {
    setAnswer('');
    setShowVi(false);
    setMicError('');
    if (stepIdx + 1 < sc.steps.length) {
      setStepIdx(stepIdx + 1);
      setPhase('listen');
    } else {
      const avg = Math.round(results.reduce((a, r) => a + r.score, 0) / sc.steps.length);
      const xp = 10 + (avg >= 85 ? 5 : 0) + (diff.id === 'hard' ? 5 : 0);
      addXp(xp);
      setEarned(xp);
      setRelayScore(sc.id, avg);
      setPhase('done');
    }
  };

  const res = results[stepIdx];
  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / sc.steps.length) : 0;

  return (
    <div className="relay">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="Thoát" onClick={() => { stopSpeaking(); go('/relay'); }}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <div className="relay-steps" aria-label={`Lượt ${stepIdx + 1} trên ${sc.steps.length}`}>
          {sc.steps.map((_, i) => (
            <span key={i} className={i < stepIdx || phase === 'done' ? 'is-done' : i === stepIdx ? 'is-now' : ''} />
          ))}
        </div>
        <span className="chip">{diff.label}</span>
      </header>

      {phase === 'done' ? (
        <div className="relay-body relay-done">
          <Hanko char={avg >= 60 ? '伝' : '惜'} size={110} slam label={avg >= 60 ? 'Đã truyền tin thành công' : 'Gần được rồi'} />
          <h1>{avg >= 60 ? 'Tin nhắn đã đến nơi' : 'Tin nhắn bị thiếu ý'}</h1>
          <p className="muted">{sc.title}, điểm trung bình {avg}/100</p>
          <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Lightning size={24} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
            <strong>+{earned} XP</strong>
          </div>
          <div className="lesson-actions">
            <button className="btn" onClick={() => { setResults([]); setStepIdx(0); setPhase('listen'); setListensLeft(diff.listens); }}>
              <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Chơi lại
            </button>
            <a className="btn btn--matcha" href="#/relay">Tình huống khác</a>
          </div>
        </div>
      ) : (
        <div className="relay-body">
          <p className="relay-place">{sc.place}, lượt {stepIdx + 1}/{sc.steps.length}</p>

          {/* the relay line: from -> you -> to */}
          <div className={`relay-line phase-${phase}`}>
            <Avatar person={from} active={phase === 'listen'} speaking={speaking && phase === 'listen'} />
            <span className="relay-arrow" aria-hidden="true"><ArrowRight size={26} weight="bold" /></span>
            <Avatar you active={phase === 'hold' || phase === 'relay'} />
            <span className="relay-arrow" aria-hidden="true"><ArrowRight size={26} weight="bold" /></span>
            <Avatar person={to} active={phase === 'relay' || phase === 'result'} />
          </div>

          {phase === 'listen' && (
            <section className="relay-card" aria-labelledby="listen-h">
              <h2 id="listen-h">{from.name} nhờ bạn nhắn lại cho {to.name}</h2>
              <div className={`bubble${speaking ? ' is-speaking' : ''}`}>
                {diff.showText ? (
                  <Sentence s={step.message} showVi={showVi} />
                ) : (
                  <div className="wave" aria-label={speaking ? 'Đang phát' : 'Nội dung bị ẩn, hãy nghe'}>
                    {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />)}
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
                {diff.showText && (
                  <button className="btn btn--ghost" onClick={() => setShowVi((v) => !v)} aria-pressed={showVi}>
                    {showVi ? <EyeSlash size={20} weight="bold" aria-hidden="true" /> : <Eye size={20} weight="bold" aria-hidden="true" />}
                    {showVi ? 'Ẩn nghĩa' : 'Xem nghĩa'}
                  </button>
                )}
              </div>
              <button className="btn btn--matcha btn--block" onClick={goRelay}>
                Tôi đã nhớ, đi truyền tin
              </button>
            </section>
          )}

          {phase === 'hold' && (
            <section className="relay-card relay-hold" aria-live="polite">
              <h2>Đang đi tới chỗ {to.name}</h2>
              <p className="hold-count">{holdLeft}</p>
              <p className="muted">Nhẩm lại ý chính trong đầu nhé.</p>
            </section>
          )}

          {phase === 'relay' && (
            <section className="relay-card" aria-labelledby="relay-h">
              <h2 id="relay-h">Nói lại với {to.name} ({to.role.toLowerCase()})</h2>
              <ul className="kp-hints" aria-label="Ý chính cần truyền đạt">
                {step.keypoints.map((kp) => <li key={kp.label} className="chip">{kp.label}?</li>)}
              </ul>

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

              {(typing || answer) && (
                <label className="answer-field">
                  <span>{typing ? 'Câu trả lời (tiếng Nhật hoặc romaji)' : 'Bạn đã nói (có thể sửa)'}</span>
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
                {!typing && (
                  <button className="btn btn--ghost" onClick={() => setTyping(true)}>
                    <Keyboard size={20} weight="bold" aria-hidden="true" /> Gõ thay vì nói
                  </button>
                )}
                <button className="btn btn--matcha" onClick={submit} disabled={!answer.trim() || recording}>
                  Truyền tin
                </button>
              </div>
            </section>
          )}

          {phase === 'result' && res && (
            <section className="relay-card" aria-labelledby="result-h">
              <div className="result-head">
                <div className={`score-badge ${res.score >= 60 ? 'is-pass' : 'is-fail'}`}>
                  <strong>{res.score}</strong>
                  <span>điểm</span>
                </div>
                <div>
                  <h2 id="result-h">{res.score >= 85 ? 'Truyền đạt rất chuẩn' : res.score >= 60 ? 'Truyền đạt được ý chính' : 'Tin nhắn còn thiếu ý'}</h2>
                  <p className="muted">{to.name} đã nhận được {res.hits.filter(Boolean).length}/{res.hits.length} ý chính.</p>
                </div>
              </div>

              <ul className="kp-list">
                {step.keypoints.map((kp, i) => (
                  <li key={kp.label} className={res.hits[i] ? 'hit' : 'miss'}>
                    {res.hits[i] ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <XCircle size={22} weight="fill" aria-hidden="true" />}
                    <span><strong>{kp.label}:</strong> {kp.vi} <span className="jp" lang="ja">({kp.accept[0]})</span></span>
                    <span className="sr-only">{res.hits[i] ? 'đã có' : 'bị thiếu'}</span>
                  </li>
                ))}
              </ul>

              <div className="compare">
                <div>
                  <h3>Bạn đã nói</h3>
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
                  <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Làm lại lượt này
                </button>
                <button className="btn btn--matcha" onClick={nextStep} autoFocus>
                  {stepIdx + 1 < sc.steps.length ? 'Lượt tiếp theo' : 'Xem kết quả'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
