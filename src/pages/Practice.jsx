// Một lượt luyện ngắn, dùng lại câu hỏi của bài học:
//   mode 'review' -> các từ đến hạn ôn hôm nay (#/on-tap/choi)
//   mode 'hard'   -> các từ hay sai (#/on-tap/hay-sai)
//   mode 'daily'  -> Bài hôm nay: ôn từ đến hạn trước, rồi vài từ mới (#/hom-nay)
import { useEffect, useMemo, useState } from 'react';
import { X, Lightning, Target } from '@phosphor-icons/react';
import { ALL_WORDS, topicById } from '../data/vocab';
import { useProgress, go } from '../lib/store';
import { speak, blip } from '../lib/speech';
import { tokenize, matchRomaji } from '../lib/kana';
import { Word, Hanko, TicketProgress, shuffle } from '../components/Bits';
import DayStrip from '../components/DayStrip';
import { dueWords, hardWords, planDaily, REVIEW_MAX, INTERVALS, whenText, today } from '../lib/review';
import { Exercise, IntroCard, buildExercises } from './Lesson';
import './lesson.css';
import './review.css';

const TYPES = ['meaning', 'reverse', 'listen', 'type'];

function topicWords(word) {
  const t = word.topic && topicById(word.topic);
  return t && t.words.length >= 4 ? t.words : ALL_WORDS;
}

// Ôn tập: mỗi từ một câu, đổi kiểu câu hỏi lần lượt cho đỡ chán.
function reviewSteps(words) {
  return words.map((w, i) => {
    const pool = topicWords(w);
    const options = shuffle([w, ...shuffle(pool.filter((x) => x.jp !== w.jp)).slice(0, 3)]);
    return { type: TYPES[i % TYPES.length], word: w, options };
  });
}

function makePlan(mode, p) {
  if (mode === 'daily') {
    const plan = planDaily(p);
    const fresh = plan.fresh;
    const steps = [
      ...reviewSteps(shuffle(plan.reviews)),
      ...fresh.map((w, i) => ({ type: 'intro', word: w, n: i + 1, of: fresh.length })),
      ...(fresh.length ? buildExercises(fresh, topicWords(fresh[0])) : []),
    ];
    return { steps, words: [...plan.reviews, ...fresh], fresh };
  }
  const words = mode === 'hard'
    ? hardWords(p.review, 10).map((h) => h.word)
    : dueWords(p.review).slice(0, REVIEW_MAX);
  return { steps: reviewSteps(shuffle(words)), words, fresh: [] };
}

const TITLES = {
  review: { code: '復習', label: 'Ôn tập hôm nay' },
  hard: { code: '苦手', label: 'Luyện từ hay sai' },
  daily: { code: '今日', label: 'Bài hôm nay' },
};

export default function Practice({ mode }) {
  const p = useProgress();
  const { settings, addXp, markLearned, recordAnswers, finishDaily } = p;
  const [plan] = useState(() => makePlan(mode, p));
  const [queue, setQueue] = useState(plan.steps);
  const [firstTotal] = useState(() => plan.steps.filter((s) => s.type !== 'intro').length);
  const [pos, setPos] = useState(0);
  const [choice, setChoice] = useState(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  const [done, setDone] = useState(false);
  const title = TITLES[mode] || TITLES.review;

  const step = queue[pos];

  useEffect(() => {
    if (done || !step) return;
    if (step.type === 'intro' || step.type === 'listen' || step.type === 'meaning') speak(step.word.kana, { rate: settings.rate });
  }, [pos, done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan.steps.length) return <Empty mode={mode} />;

  const canCheck = step && step.type !== 'intro' && (step.type === 'type' ? typed.trim().length > 0 : choice !== null);

  const finish = () => {
    const perfect = mistakes === 0;
    const xp = mode === 'daily' ? 20 + (perfect ? 5 : 0) : Math.min(20, Math.max(5, plan.words.length * 2));
    setEarned(xp);
    addXp(xp);
    markLearned(plan.words.map((w) => w.jp));
    if (mode === 'daily') finishDaily();
    setDone(true);
  };

  const next = () => {
    setResult(null);
    setChoice(null);
    setTyped('');
    if (pos + 1 >= queue.length) finish();
    else setPos(pos + 1);
  };

  const check = () => {
    if (!canCheck || result) return;
    const ok = step.type === 'type'
      ? matchRomaji(tokenize(step.word.kana), typed.trim().toLowerCase()).done
      : step.options[choice].jp === step.word.jp;
    setResult(ok ? 'right' : 'wrong');
    blip(ok ? 'ok' : 'bad', settings.sound);
    recordAnswers([{ jp: step.word.jp, ok }]);
    if (!ok) {
      setMistakes((m) => m + 1);
      setQueue((q) => [...q, { ...step, options: step.options && shuffle(step.options) }]);
    }
    if (step.type !== 'listen' && step.type !== 'meaning') speak(step.word.kana, { rate: settings.rate });
  };

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="Thoát" onClick={() => go(mode === 'daily' ? '/' : '/on-tap')}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <TicketProgress code={title.code} label={title.label} done={done ? queue.length : pos} total={queue.length} />
      </header>

      {!done && step?.type === 'intro' && (
        <IntroCard key={pos} word={step.word} n={step.n} of={step.of} onNext={next} />
      )}

      {!done && step && step.type !== 'intro' && (
        <Exercise
          key={pos}
          ex={step}
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

      {done && (
        <Done mode={mode} plan={plan} earned={earned} accuracy={Math.round((Math.max(0, firstTotal - mistakes) / Math.max(1, firstTotal)) * 100)} />
      )}
    </div>
  );
}

function Done({ mode, plan, earned, accuracy }) {
  const { review, dayStamps } = useProgress();
  const d = today();
  const freshSet = useMemo(() => new Set(plan.fresh.map((w) => w.jp)), [plan.fresh]);
  return (
    <div className="lesson-body lesson-done">
      {mode === 'daily' ? (
        <>
          <Hanko char="今日" size={112} slam label="Dấu bài hôm nay" />
          <h1>Xong bài hôm nay</h1>
          <p className="muted">Đã đóng dấu ngày {d.slice(8, 10)}/{d.slice(5, 7)}. Hẹn gặp lại ngày mai.</p>
          <DayStrip stamps={dayStamps} />
        </>
      ) : (
        <>
          <Hanko char="済" size={112} slam label="Đã ôn xong" />
          <h1>{mode === 'hard' ? 'Đã luyện xong từ hay sai' : 'Ôn tập xong'}</h1>
          <p className="muted">Mỗi từ đã được xếp lịch ôn mới bên dưới.</p>
        </>
      )}
      <div className="done-stats">
        <div className="panel">
          <Lightning size={26} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
          <strong>+{earned} điểm</strong>
        </div>
        <div className="panel">
          <Target size={26} weight="fill" color="var(--matcha)" aria-hidden="true" />
          <strong>{accuracy}% chính xác</strong>
        </div>
      </div>
      <ul className="done-words">
        {plan.words.map((w) => {
          const e = review[w.jp];
          return (
            <li key={w.jp}>
              <Word jp={w.jp} kana={w.kana} size={22} showRomaji={false} />
              <span className="done-word-info">
                <span className="muted">{w.vi}</span>
                {e && (
                  <span className={`box-tag box-${(e.box ?? 0) + 1}`}>
                    {freshSet.has(w.jp) ? 'Từ mới · ' : ''}Hộp {(e.box ?? 0) + 1} · ôn {whenText(e.due, d)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="lesson-actions">
        <a className="btn" href="#/on-tap">{mode === 'daily' ? 'Luyện thêm' : 'Về trang Ôn tập'}</a>
        <button className="btn btn--ai" onClick={() => go('/')} autoFocus>
          Về bản đồ tuyến
        </button>
      </div>
    </div>
  );
}

function Empty({ mode }) {
  return (
    <div className="lesson">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="Thoát" onClick={() => go(mode === 'daily' ? '/' : '/on-tap')}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
      </header>
      <div className="lesson-body lesson-done">
        <Hanko char="空" size={96} label="Không có từ" />
        <h1>{mode === 'hard' ? 'Chưa có từ nào hay sai' : 'Hôm nay không có từ nào cần ôn'}</h1>
        <p className="muted">
          Từ sẽ được xếp lịch sau khi bạn học. Hộp 1 ôn sau {INTERVALS[0]} ngày, hộp cuối sau {INTERVALS[INTERVALS.length - 1]} ngày.
        </p>
        <div className="lesson-actions">
          <a className="btn btn--ai" href="#/">Về bản đồ tuyến</a>
        </div>
      </div>
    </div>
  );
}
