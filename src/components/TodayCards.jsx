// Hai thẻ đầu trang chủ: "Bài hôm nay" (khoảng 5 phút) và số từ cần ôn hôm nay.
import { useMemo } from 'react';
import { Play, Clock, ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react';
import { useProgress } from '../lib/store';
import { planDaily, estimateMinutes, hardWords, today } from '../lib/review';
import DayStrip from './DayStrip';

export default function TodayCards() {
  const p = useProgress();
  const plan = useMemo(() => planDaily(p), [p.review, p.learned, p.completed]); // eslint-disable-line react-hooks/exhaustive-deps
  const hardCount = useMemo(() => hardWords(p.review, 99).length, [p.review]);
  const doneToday = p.dayStamps.includes(today());
  const mins = estimateMinutes(plan);
  const parts = [];
  if (plan.dueTotal > 0) parts.push(`${plan.reviews.length} từ ôn`);
  else if (plan.reviews.length) parts.push(`${plan.reviews.length} từ luyện lại`);
  if (plan.fresh.length) parts.push(`${plan.fresh.length} từ mới${plan.station ? ` ở ga ${plan.station.code}` : ''}`);
  const steps = plan.reviews.length + plan.fresh.length;

  return (
    <div className="today">
      <section className={`panel today-card${doneToday ? ' is-done' : ''}`} aria-labelledby="today-title">
        <div className="today-head">
          <span className="today-badge jp" lang="ja" aria-hidden="true">今日</span>
          <div>
            <h2 id="today-title">Bài hôm nay</h2>
            <p className="muted today-sub">
              {doneToday ? (
                <><CheckCircle size={16} weight="fill" aria-hidden="true" color="var(--matcha)" /> Đã xong hôm nay</>
              ) : steps ? (
                <><Clock size={16} weight="bold" aria-hidden="true" /> Khoảng {mins} phút · {parts.join(' + ')}</>
              ) : (
                'Chưa có gì để học hôm nay'
              )}
            </p>
          </div>
        </div>
        <DayStrip stamps={p.dayStamps} />
        {doneToday ? (
          <a className="btn btn--block" href="#/on-tap">
            <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Luyện thêm
          </a>
        ) : (
          steps > 0 && (
            <a className="btn btn--shu btn--block" href="#/hom-nay">
              <Play size={18} weight="fill" aria-hidden="true" /> Bắt đầu bài hôm nay
            </a>
          )
        )}
      </section>

      <a className={`panel today-review${plan.dueTotal ? ' has-due' : ''}`} href="#/on-tap">
        <strong className="today-review-n">{plan.dueTotal}</strong>
        <span className="today-review-text">
          <span className="today-review-title">
            {plan.dueTotal ? `Hôm nay có ${plan.dueTotal} từ cần ôn` : 'Không có từ cần ôn'}
          </span>
          <span className="muted">{hardCount ? `${hardCount} từ hay sai · Xem trang Ôn tập` : 'Xem trang Ôn tập'}</span>
        </span>
      </a>
    </div>
  );
}
