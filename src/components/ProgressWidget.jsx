// Bảng tiến độ mini cho trang chủ: từ đã nắm theo trình độ, chuỗi ngày học, gợi ý bài tiếp theo.
import { useMemo } from 'react';
import { Fire, ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react';
import { TOPICS, lessonsOf } from '../data/vocab';
import { useProgress } from '../lib/store';
import { loadMarks } from '../lib/flashcardProgress';
import { dueWords } from '../lib/review';
import './progress.css';

const LEVELS = ['N5', 'N4'];

// Ga tiếp theo theo thứ tự lộ trình: lần lượt từng tuyến, các bài học rồi tới game.
function nextStation(completed) {
  for (const topic of TOPICS) {
    const lessons = lessonsOf(topic);
    for (let index = 0; index < lessons.length; index++) {
      if (!completed[`${topic.id}:L${index}`]) return { kind: 'lesson', index, topic };
    }
    if (!completed[`${topic.id}:game`]) return { kind: 'game', topic };
  }
  return null;
}

export default function ProgressWidget() {
  const { learned, completed, streak, review } = useProgress();
  const due = useMemo(() => dueWords(review).length, [review]);
  const marks = useMemo(loadMarks, []); // đọc lại mỗi lần vào trang chủ

  const stats = useMemo(() => {
    const isKnown = (w) => !!learned[w.jp] || marks[w.jp] === 'known';
    const all = TOPICS.flatMap((t) => t.words);
    const byLevel = LEVELS.map((level) => {
      const words = TOPICS.filter((t) => t.level === level).flatMap((t) => t.words);
      return { level, total: words.length, known: words.filter(isKnown).length };
    }).filter((l) => l.total > 0);
    return {
      byLevel,
      known: all.filter(isKnown).length,
      reviewTopic: TOPICS.find((t) => t.words.some((w) => marks[w.jp] === 'review')),
      review: all.filter((w) => marks[w.jp] === 'review').length,
    };
  }, [learned, marks]);

  const next = useMemo(() => nextStation(completed), [completed]);
  const nextHref = next && (next.kind === 'lesson' ? `#/lesson/${next.topic.id}/${next.index}` : `#/game/${next.topic.id}`);
  const nextLabel = next && (next.kind === 'lesson' ? `Bài ${next.index + 1}: ${next.topic.title}` : `Bắn chữ: ${next.topic.title}`);

  return (
    <section className="panel pw" aria-labelledby="pw-title">
      <div className="pw-head">
        <h3 id="pw-title">Tiến độ học tập</h3>
        <span className="pw-streak" title="Chuỗi ngày học liên tiếp">
          <Fire size={20} weight="fill" aria-hidden="true" />
          {streak}
          <span className="sr-only"> ngày liên tiếp</span>
        </span>
      </div>

      <p className="pw-big"><strong>{stats.known}</strong> từ đã nắm</p>
      {stats.byLevel.map((l) => (
        <div key={l.level} className="pw-level">
          <div className="pw-row"><span>{l.level}</span><span>{l.known}/{l.total}</span></div>
          <div className="bar" role="progressbar" aria-label={`Từ vựng ${l.level}`} aria-valuemin={0} aria-valuemax={l.total} aria-valuenow={l.known}>
            <span style={{ width: `${(l.known / l.total) * 100}%` }} />
          </div>
        </div>
      ))}

      {next ? (
        <a className="btn btn--ai btn--sm btn--block" href={nextHref}>
          Học tiếp: {nextLabel} <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </a>
      ) : (
        <p className="muted pw-note">Bạn đã đi hết mọi tuyến. Hãy ôn lại bằng thẻ từ vựng.</p>
      )}
      {due > 0 && (
        <a className="btn btn--sm btn--block" href="#/on-tap">
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Ôn {due} từ đến hạn hôm nay
        </a>
      )}
      {stats.review > 0 && stats.reviewTopic && (
        <a className="btn btn--sm btn--block" href={`#/vocab/${stats.reviewTopic.id}`}>
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Ôn {stats.review} từ đã đánh dấu
        </a>
      )}
    </section>
  );
}
