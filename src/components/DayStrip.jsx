// Dải 7 ngày gần nhất: ngày nào xong "Bài hôm nay" thì có con dấu đỏ.
import { addDays, today } from '../lib/review';

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function DayStrip({ stamps = [] }) {
  const d = today();
  const set = new Set(stamps);
  const days = Array.from({ length: 7 }, (_, i) => addDays(d, i - 6));
  const count = days.filter((x) => set.has(x)).length;
  return (
    <ol className="day-strip" aria-label={`7 ngày gần nhất: ${count} ngày đã xong bài`}>
      {days.map((x) => {
        const [y, m, dd] = x.split('-').map(Number);
        const wd = WEEKDAY[new Date(y, m - 1, dd).getDay()];
        const on = set.has(x);
        return (
          <li key={x} className={`day${on ? ' is-on' : ''}${x === d ? ' is-today' : ''}`}>
            <span className="day-mark" aria-hidden="true">{on ? '済' : ''}</span>
            <span className="day-label">{x === d ? 'Nay' : wd}</span>
            <span className="sr-only">{on ? ', đã xong' : ', chưa học'}</span>
          </li>
        );
      })}
    </ol>
  );
}
