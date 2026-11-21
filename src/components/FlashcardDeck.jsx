// Thẻ từ vựng: lật 3D (click hoặc phím Space), ← → chuyển thẻ, đánh dấu Đã thuộc / Cần ôn lại.
// Dùng lại các lớp .flash-* trong vocab.css để giữ nguyên giao diện hiện có.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise, Check, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Word } from './Bits';
import { speak } from '../lib/speech';
import { useProgress } from '../lib/store';
import { useFlashcardMarks } from '../lib/flashcardProgress';
import './flashcard.css';

const inField = (el) => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
const onControl = (el) => inField(el) || (!!el && ['BUTTON', 'A'].includes(el.tagName));

export default function FlashcardDeck({ words }) {
  const { settings, recordAnswers } = useProgress();
  const { marks, mark } = useFlashcardMarks();
  const [filter, setFilter] = useState('all'); // all | review
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const list = useMemo(
    () => (filter === 'review' ? words.filter((w) => marks[w.jp] === 'review') : words),
    [filter, words, marks],
  );
  const idx = list.length ? Math.min(i, list.length - 1) : 0;
  const w = list[idx];
  const known = words.filter((x) => marks[x.jp] === 'known').length;
  const review = words.filter((x) => marks[x.jp] === 'review').length;

  const move = useCallback((d) => {
    if (!list.length) return;
    setFlipped(false);
    setI((x) => (Math.min(x, list.length - 1) + d + list.length) % list.length);
  }, [list.length]);

  const flip = useCallback(() => {
    if (!w) return;
    const next = !flipped;
    setFlipped(next);
    if (next) speak(w.kana, { rate: settings.rate });
  }, [w, flipped, settings.rate]);

  const rate = (status) => {
    if (!w) return;
    mark(w.jp, status);
    recordAnswers([{ jp: w.jp, ok: status === 'known' }]); // lịch ôn tập: Đã thuộc = đúng, Cần ôn lại = sai
    setFlipped(false);
    if (!(filter === 'review' && status === 'known')) move(1); // thẻ đã thuộc tự rời khỏi bộ "cần ôn"
  };

  const pick = (f) => { setFilter(f); setI(0); setFlipped(false); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || inField(e.target)) return;
      if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
      else if ((e.key === ' ' || e.code === 'Space') && !onControl(e.target)) {
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, flip]);

  return (
    <div className="flash fc">
      <div className="seg" role="tablist" aria-label="Lọc thẻ" style={{ margin: 0 }}>
        <button role="tab" aria-selected={filter === 'all'} onClick={() => pick('all')}>Tất cả ({words.length})</button>
        <button role="tab" aria-selected={filter === 'review'} onClick={() => pick('review')}>Cần ôn lại ({review})</button>
      </div>

      {w ? (
        <>
          <button
            className={`flash-card${flipped ? ' is-flipped' : ''}`}
            onClick={flip}
            aria-label={flipped ? `Mặt sau: ${w.vi}. Bấm để lật lại` : `Mặt trước: ${w.jp}. Bấm để lật xem nghĩa`}
          >
            {marks[w.jp] && (
              <span className={`fc-badge fc-badge--${marks[w.jp]}`}>{marks[w.jp] === 'known' ? 'Đã thuộc' : 'Cần ôn'}</span>
            )}
            <span className="flash-face flash-front">
              <Word jp={w.jp} kana={w.kana} size={64} showFurigana={false} showRomaji={false} />
              <span className="flash-tip">Bấm hoặc nhấn Space để lật</span>
            </span>
            <span className="flash-face flash-back">
              <Word jp={w.jp} kana={w.kana} size={44} showFurigana showRomaji />
              <span className="flash-vi">{w.vi}</span>
            </span>
          </button>

          <div className="fc-rate">
            <button className="btn btn--sm" onClick={() => rate('review')} aria-pressed={marks[w.jp] === 'review'}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Cần ôn lại
            </button>
            <button className="btn btn--matcha btn--sm" onClick={() => rate('known')} aria-pressed={marks[w.jp] === 'known'}>
              <Check size={18} weight="bold" aria-hidden="true" /> Đã thuộc
            </button>
          </div>

          <div className="flash-nav">
            <button className="btn" onClick={() => move(-1)}>Thẻ trước</button>
            <span className="chip">{idx + 1} / {list.length}</span>
            <button className="btn btn--ai" onClick={() => move(1)}>Thẻ sau</button>
          </div>
        </>
      ) : (
        <p className="panel muted fc-empty">Chưa có thẻ nào cần ôn lại. Làm tốt lắm!</p>
      )}

      <p className="muted fc-hint">
        Đã thuộc {known}/{words.length}. Phím tắt: Space để lật, mũi tên trái phải để chuyển thẻ.
      </p>
      <button className="btn btn--ghost btn--sm" onClick={() => pick(filter)}>
        <ArrowsClockwise size={18} weight="bold" aria-hidden="true" /> Bắt đầu lại
      </button>
    </div>
  );
}
