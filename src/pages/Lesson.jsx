import { useEffect, useMemo, useRef, useState } from 'react';
import { X, SpeakerHigh, Lightning, Target } from '@phosphor-icons/react';
import { topicById, lessonsOf, ALL_WORDS } from '../data/vocab';
import { useProgress, go } from '../lib/store';
import { speak, blip } from '../lib/speech';
import { tokenize, matchRomaji, kanaToRomaji } from '../lib/kana';
import { Word, Hanko, Daru, Hanamaru, PenCross, TicketProgress, StationStamp, shuffle } from '../components/Bits';
import { TOPIC_ICONS } from '../components/topicIcons';
import { buildLines } from '../lib/lines';
import './lesson.css';

function buildExercises(words, topicWords) {
  const pool = topicWords.length >= 4 ? topicWords : ALL_WORDS;
  const options = (word) => shuffle([word, ...shuffle(pool.filter((x) => x.jp !== word.jp)).slice(0, 3)]);
  const second = ['listen', 'reverse', 'type'];
  const ex = [];
  words.forEach((w, i) => {
    ex.push({ type: 'meaning', word: w, options: options(w) });
    ex.push({ type: second[i % 3], word: w, options: options(w) });
  });
  return shuffle(ex);
}

export default function Lesson({ topicId, index }) {
  const topic = topicById(topicId);
  const { settings, addXp, completeNode, markLearned } = useProgress();
  const words = useMemo(() => (topic ? lessonsOf(topic)[index] || [] : []), [topic, index]);
  const station = useMemo(() => {
    const line = buildLines().find((l) => l.topic.id === topicId);
    return line ? line.stations[index] : null;
  }, [topicId, index]);

  const [stage, setStage] = useState('intro'); // intro | quiz | done
  const [introIdx, setIntroIdx] = useState(0);
  const [queue, setQueue] = useState(() => buildExercises(words, topic?.words || []));
  const [pos, setPos] = useState(0);
  const [choice, setChoice] = useState(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null); // null | 'right' | 'wrong'
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  const total = words.length + queue.length;
  const doneCount = stage === 'intro' ? introIdx : stage === 'quiz' ? words.length + pos : total;

  const ex = queue[pos];
  const introWord = words[introIdx];

  // auto-play audio for intro cards and listening tasks
  useEffect(() => {
    if (stage === 'intro' && introWord) speak(introWord.kana, { rate: settings.rate });
    if (stage === 'quiz' && ex && (ex.type === 'listen' || ex.type === 'meaning')) speak(ex.word.kana, { rate: settings.rate });
  }, [stage, introIdx, pos]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!topic || !words.length) {
    return (
      <div className="page">
        <p>Không tìm thấy bài học này.</p>
        <a className="btn" href="#/">Về bản đồ tuyến</a>
      </div>
    );
  }

  const canCheck = ex && (ex.type === 'type' ? typed.trim().length > 0 : choice !== null);

  const check = () => {
    if (!canCheck || result) return;
    let ok;
    if (ex.type === 'type') ok = matchRomaji(tokenize(ex.word.kana), typed.trim().toLowerCase()).done;
    else ok = ex.options[choice].jp === ex.word.jp;
    setResult(ok ? 'right' : 'wrong');
    blip(ok ? 'ok' : 'bad', settings.sound);
    if (!ok) {
      setMistakes((m) => m + 1);
      setQueue((q) => [...q, { ...ex, options: shuffle(ex.options) }]); // retry later
    }
    if (ex.type !== 'listen' && ex.type !== 'meaning') speak(ex.word.kana, { rate: settings.rate });
  };

  const next = () => {
    setResult(null);
    setChoice(null);
    setTyped('');
    if (pos + 1 >= queue.length) {
      const perfect = mistakes === 0;
      const xp = 15 + (perfect ? 5 : 0);
      setEarned(xp);
      addXp(xp);
      completeNode(`${topic.id}:L${index}`, perfect ? 3 : 2);
      markLearned(words.map((w) => w.jp));
      setStage('done');
    } else setPos(pos + 1);
  };

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="Thoát bài học" onClick={() => go('/')}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <TicketProgress code={station?.code || ''} label={topic.title} done={doneCount} total={total} />
      </header>

      {stage === 'intro' && (
        <IntroCard
          key={introIdx}
          word={introWord}
          n={introIdx + 1}
          of={words.length}
          onNext={() => (introIdx + 1 >= words.length ? setStage('quiz') : setIntroIdx(introIdx + 1))}
        />
      )}

      {stage === 'quiz' && ex && (
        <Exercise
          key={pos}
          ex={ex}
          choice={choice}
          setChoice={setChoice}
          typed={typed}
          setTyped={setTyped}
          result={result}
          canCheck={canCheck}
          onCheck={check}
          onNext={next}
        />
      )}

      {stage === 'done' && (
        <div className="lesson-body lesson-done">
          {station ? (
            <span className="stamp-slam">
              <StationStamp code={station.code} name={station.label} tone={topic.color} Icon={TOPIC_ICONS[topic.icon]} size={120} />
            </span>
          ) : (
            <Hanko char="合格" size={120} slam label="Đóng dấu đạt" />
          )}
          <h1>Đã đóng dấu ga {station?.code}</h1>
          <p className="muted">Xong bài {index + 1}, {topic.title}</p>
          <div className="done-stats">
            <div className="panel">
              <Lightning size={26} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
              <strong>+{earned} điểm</strong>
            </div>
            <div className="panel">
              <Target size={26} weight="fill" color="var(--matcha)" aria-hidden="true" />
              <strong>{Math.round((queue.length - mistakes) / queue.length * 100)}% chính xác</strong>
            </div>
          </div>
          <ul className="done-words">
            {words.map((w) => (
              <li key={w.jp}>
                <Word jp={w.jp} kana={w.kana} size={22} showRomaji={false} />
                <span className="muted">{w.vi}</span>
              </li>
            ))}
          </ul>
          <div className="lesson-actions">
            <a className="btn" href={`#/game/${topic.id}`}>Bắn chữ chủ đề này</a>
            <button className="btn btn--ai" onClick={() => go('/')} autoFocus>
              Về bản đồ tuyến
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IntroCard({ word, n, of, onNext }) {
  const { settings } = useProgress();
  useEffect(() => {
    const onKey = (e) => e.key === 'Enter' && onNext();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);
  return (
    <>
      <div className="lesson-body">
        <p className="lesson-prompt">Từ mới {n}/{of}</p>
        <div className="intro-card">
          <Word jp={word.jp} kana={word.kana} size={64} showFurigana showRomaji />
          <p className="intro-vi">{word.vi}</p>
          <button className="btn btn--sm" onClick={() => speak(word.kana, { rate: settings.rate })}>
            <SpeakerHigh size={20} weight="bold" aria-hidden="true" /> Nghe lại
          </button>
        </div>
      </div>
      <footer className="lesson-foot">
        <div className="lesson-foot-inner">
          <Daru size={56} />
          <button className="btn btn--ai" onClick={onNext} autoFocus>
            Tiếp tục
          </button>
        </div>
      </footer>
    </>
  );
}

const PROMPTS = {
  meaning: 'Từ này nghĩa là gì?',
  reverse: 'Chọn từ tiếng Nhật đúng',
  listen: 'Nghe và chọn từ bạn nghe được',
  type: 'Gõ cách đọc bằng romaji',
};

function Exercise({ ex, choice, setChoice, typed, setTyped, result, canCheck, onCheck, onNext }) {
  const { settings } = useProgress();
  const inputRef = useRef(null);
  const actionRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        result ? onNext() : onCheck();
        return;
      }
      if (!result && ex.type !== 'type' && /^[1-4]$/.test(e.key)) setChoice(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, onNext, onCheck, ex.type, setChoice]);

  useEffect(() => {
    if (result) actionRef.current?.focus();
    else if (ex.type === 'type') inputRef.current?.focus();
  }, [result, ex.type]);

  const w = ex.word;
  const typedState = ex.type === 'type' && typed ? matchRomaji(tokenize(w.kana), typed.trim().toLowerCase()) : null;

  return (
    <>
      <div className="lesson-body">
        <p className="lesson-prompt">{PROMPTS[ex.type]}</p>

        <div className="ex-stage">
        {ex.type === 'meaning' && (
          <div className="ex-prompt">
            <Word jp={w.jp} kana={w.kana} size={52} showRomaji={false} />
            <button className="icon-btn" aria-label="Nghe phát âm" onClick={() => speak(w.kana, { rate: settings.rate })}>
              <SpeakerHigh size={22} weight="bold" aria-hidden="true" />
            </button>
          </div>
        )}
        {ex.type === 'reverse' && (
          <div className="ex-prompt">
            <p className="ex-vi">{w.vi}</p>
          </div>
        )}
        {ex.type === 'listen' && (
          <div className="ex-prompt">
            <button className="listen-big" onClick={() => speak(w.kana, { rate: settings.rate })} aria-label="Phát lại âm thanh">
              <SpeakerHigh size={44} weight="fill" aria-hidden="true" />
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => speak(w.kana, { rate: 0.6 })}>
              Nghe chậm
            </button>
          </div>
        )}
        {ex.type === 'type' && (
          <div className="ex-prompt ex-prompt--col">
            <Word jp={w.jp} kana={w.kana} size={52} showRomaji={false} showFurigana={false} />
            <p className="muted">{w.vi}</p>
            <label className="type-field">
              <span className="sr-only">Cách đọc bằng romaji</span>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => !result && setTyped(e.target.value)}
                placeholder="ví dụ: densha"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={typedState && !typedState.ok ? true : undefined}
                readOnly={!!result}
              />
            </label>
            <p className={`type-hint${typedState && !typedState.ok ? ' is-bad' : ''}`} aria-live="polite">
              {typedState
                ? typedState.ok
                  ? `${tokenize(w.kana).slice(0, typedState.unitsDone).map((u) => u.kana).join('')}…`
                  : 'Chưa đúng cách đọc, thử lại nhé'
                : 'Gõ bằng bàn phím tiếng Anh'}
            </p>
          </div>
        )}

        {result === 'right' && <Hanamaru className="mark-right" size={76} />}
        {result === 'wrong' && ex.type === 'type' && <PenCross className="mark-wrong" size={34} />}
        </div>

        {ex.type !== 'type' && (
          <div className="options" role="radiogroup" aria-label="Các lựa chọn">
            {ex.options.map((o, i) => {
              const isAnswer = o.jp === w.jp;
              const state = result ? (isAnswer ? 'right' : i === choice ? 'wrong' : '') : i === choice ? 'picked' : '';
              return (
                <button
                  key={o.jp + i}
                  role="radio"
                  aria-checked={i === choice}
                  className={`option ${state}`}
                  onClick={() => !result && setChoice(i)}
                  disabled={!!result && !isAnswer && i !== choice}
                >
                  <span className="option-key" aria-hidden="true">{i + 1}</span>
                  {state === 'wrong' && <PenCross className="opt-cross" size={26} />}
                  {ex.type === 'meaning' ? (
                    <span>{o.vi}</span>
                  ) : (
                    <Word jp={o.jp} kana={o.kana} size={26} showRomaji={false} showFurigana={ex.type !== 'listen'} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <footer className="lesson-foot">
        <div className="lesson-foot-inner">
          <div className={`feedback${result ? ` is-${result}` : ''}`} aria-live="assertive">
            {result === 'right' && (
              <div>
                <strong>Chính xác</strong>
                <p>
                  <span className="jp" lang="ja">{w.jp}</span> ({kanaToRomaji(w.kana)}) nghĩa là {w.vi}.
                </p>
              </div>
            )}
            {result === 'wrong' && (
              <div>
                <strong>Chưa đúng</strong>
                <p className="pen-answer jp" lang="ja">
                  正解: {w.jp} ({w.kana})
                </p>
                <p>
                  {kanaToRomaji(w.kana)} nghĩa là {w.vi}. Câu này sẽ quay lại ở cuối bài.
                </p>
              </div>
            )}
          </div>
          {result ? (
            <button ref={actionRef} className="btn btn--ai" onClick={onNext}>
              {result === 'right' ? 'Câu tiếp theo' : 'Tiếp tục'}
            </button>
          ) : (
            <button className="btn btn--ai" onClick={onCheck} disabled={!canCheck}>
              Kiểm tra
            </button>
          )}
        </div>
      </footer>
    </>
  );
}
