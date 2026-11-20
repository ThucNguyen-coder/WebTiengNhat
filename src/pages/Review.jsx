// Trang Ôn tập: số từ đến hạn hôm nay, 6 hộp ôn tập, danh sách từ hay sai.
import { useMemo } from 'react';
import { ArrowCounterClockwise, WarningCircle, Play } from '@phosphor-icons/react';
import { useProgress } from '../lib/store';
import { Word, SpeakButton, Hanko } from '../components/Bits';
import { dueWords, hardWords, nextDue, boxCounts, INTERVALS, REVIEW_MAX, whenText } from '../lib/review';
import './review.css';

export default function Review() {
  const { review } = useProgress();
  const due = useMemo(() => dueWords(review), [review]);
  const hard = useMemo(() => hardWords(review, 20), [review]);
  const boxes = useMemo(() => boxCounts(review), [review]);
  const upcoming = nextDue(review);
  const total = boxes.reduce((a, b) => a + b, 0);

  return (
    <div className="page review-page">
      <div className="page-head">
        <div>
          <h1>Ôn tập</h1>
          <p>Ôn lại từ đã học đúng lúc bạn sắp quên. Mỗi lượt ngắn, tối đa {REVIEW_MAX} từ.</p>
        </div>
      </div>

      <section className="panel review-today" aria-labelledby="rv-today">
        <Hanko char="復" size={56} />
        <div className="review-today-text">
          <h2 id="rv-today">
            {due.length ? `Hôm nay có ${due.length} từ cần ôn` : 'Hôm nay không có từ nào cần ôn'}
          </h2>
          <p className="muted">
            {due.length
              ? due.length > REVIEW_MAX
                ? `Lượt này ôn ${REVIEW_MAX} từ, phần còn lại để lượt sau.`
                : `Khoảng ${Math.max(1, Math.round((due.length * 15) / 60))} phút.`
              : total
                ? `Lần ôn tiếp theo: ${upcoming ? whenText(upcoming) : 'chưa có'}.`
                : 'Học vài bài trên bản đồ tuyến, từ sẽ tự được xếp lịch ôn.'}
          </p>
        </div>
        {due.length > 0 && (
          <a className="btn btn--ai" href="#/on-tap/choi">
            <Play size={18} weight="fill" aria-hidden="true" /> Bắt đầu ôn
          </a>
        )}
      </section>

      <section aria-labelledby="rv-boxes" className="review-section">
        <h2 id="rv-boxes" className="review-h2">6 hộp ôn tập</h2>
        <p className="muted review-explain">
          Trả lời đúng: từ lên hộp sau, lâu hơn mới phải ôn lại. Trả lời sai: từ về Hộp 1 và ngày mai ôn lại.
        </p>
        <ol className="boxes">
          {INTERVALS.map((days, i) => (
            <li key={days} className={`box box-${i + 1}`}>
              <span className="box-name">Hộp {i + 1}</span>
              <strong className="box-count">{boxes[i]}</strong>
              <span className="box-days">ôn sau {days} ngày</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="rv-hard" className="review-section">
        <div className="review-h2-row">
          <h2 id="rv-hard" className="review-h2">
            <WarningCircle size={22} weight="fill" aria-hidden="true" /> Từ hay sai
          </h2>
          {hard.length > 0 && (
            <a className="btn btn--shu btn--sm" href="#/on-tap/hay-sai">
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Luyện {Math.min(10, hard.length)} từ này
            </a>
          )}
        </div>
        {hard.length ? (
          <ol className="hard-list">
            {hard.map((h, i) => (
              <li key={h.word.jp} className={i < 10 ? 'is-top' : ''}>
                <Word jp={h.word.jp} kana={h.word.kana} size={24} showRomaji={false} />
                <span className="hard-vi">{h.word.vi}</span>
                <span className="hard-count">
                  <strong>sai {h.wrong}</strong> · đúng {h.right}
                </span>
                <SpeakButton text={h.word.kana} label={`Nghe ${h.word.jp}`} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="panel muted">Chưa có từ nào hay sai. Giỏi lắm!</p>
        )}
      </section>
    </div>
  );
}
