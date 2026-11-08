import { useState } from 'react';
import {
  Star, RocketLaunch, Lock, Check, Fire, Lightning, BookOpenText, ChatsCircle, CaretDown, Stamp, ArrowsLeftRight,
} from '@phosphor-icons/react';
import { useProgress, go } from '../lib/store';
import { buildLines, flattenStations } from '../lib/lines';
import { Daru, ProgressRing } from '../components/Bits';
import './home.css';

export default function Home() {
  const p = useProgress();
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState({}); // topicId -> true/false once the user toggles a line

  const lines = buildLines();
  const stations = flattenStations(lines);
  const currentIdx = stations.findIndex((s) => !p.completed[s.id]);
  const finished = currentIdx === -1;
  const currentLine = finished ? lines.length - 1 : lines.findIndex((l) => l.topic.id === stations[currentIdx].line.topic.id);
  const goalMet = p.dailyXp >= p.dailyGoal;
  const learnedCount = Object.keys(p.learned).length;
  const stampCount = stations.filter((s) => p.completed[s.id]).length;

  // The line being studied and the next one are open; every other line folds into one row.
  const isOpen = (line, i) => manual[line.topic.id] ?? (i === currentLine || i === currentLine + 1);

  const open = (st, idx, topicId) => {
    if (!finished && idx > currentIdx) {
      setNotice('Hoàn thành ga trước để mở ga này.');
      setTimeout(() => setNotice(''), 2600);
      return;
    }
    if (st.kind === 'lesson') go(`/lesson/${topicId}/${st.index}`);
    else go(`/game/${topicId}`);
  };

  const indexOf = (id) => stations.findIndex((s) => s.id === id);

  return (
    <div className="page page--with-rail">
      <section aria-labelledby="map-title">
        <h1 id="map-title" className="sr-only">Bản đồ tuyến học</h1>
        <div className="map">
          {lines.map((line, li) => {
            const t = line.topic;
            const doneHere = line.stations.filter((s) => p.completed[s.id]).length;
            const total = line.stations.length;
            const expanded = isOpen(line, li);
            const prevOpen = li > 0 && isOpen(lines[li - 1], li - 1);
            return (
              <div key={t.id} className={`line tone-${t.color}${expanded ? ' is-open' : ''}${li === currentLine ? ' is-current' : ''}`}>
                {expanded && prevOpen && (
                  <div className="transfer" aria-hidden="true">
                    <ArrowsLeftRight size={16} weight="bold" />
                    <span>Đổi tuyến</span>
                  </div>
                )}
                <div className="line-head">
                  <button
                    type="button"
                    className="line-toggle"
                    aria-expanded={expanded}
                    aria-controls={`stations-${t.id}`}
                    onClick={() => setManual((m) => ({ ...m, [t.id]: !expanded }))}
                  >
                    <span className="line-bar" aria-hidden="true" />
                    <span className="line-code" aria-hidden="true">{line.code}</span>
                    <span className="line-title">
                      <strong>Tuyến {t.title}</strong>
                      <span className="jp" lang="ja">{t.jpTitle}</span>
                    </span>
                    <span className="line-count">
                      {doneHere}/{total} ga
                      <span className="sr-only">, tuyến {t.title}</span>
                    </span>
                    <CaretDown className="line-caret" size={18} weight="bold" aria-hidden="true" />
                  </button>
                  {expanded && (
                    <a className="line-book" href={`#/vocab/${t.id}`}>
                      <BookOpenText size={20} weight="bold" aria-hidden="true" />
                      <span>Sổ từ</span>
                    </a>
                  )}
                </div>

                {expanded && (
                  <ol className="stations" id={`stations-${t.id}`}>
                    {line.stations.map((st, si) => {
                      const idx = indexOf(st.id);
                      const done = !!p.completed[st.id];
                      const isCurrent = idx === currentIdx;
                      const locked = !finished && idx > currentIdx;
                      const label = `${st.code}, ${st.kind === 'game' ? 'ga đổi tàu, bắn chữ ôn tập' : `bài ${st.index + 1}`}`;
                      return (
                        <li
                          key={st.id}
                          className={`station${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${locked ? ' is-locked' : ''}${st.kind === 'game' ? ' is-game' : ''}`}
                        >
                          {isCurrent && <span className="here" aria-hidden="true">Bạn đang ở đây</span>}
                          <button
                            type="button"
                            className="station-btn"
                            onClick={() => open(st, idx, t.id)}
                            aria-label={`${label}${done ? ', đã có dấu' : locked ? ', đang khóa' : isCurrent ? ', bài hiện tại' : ''}`}
                            aria-disabled={locked || undefined}
                          >
                            <span className="station-mark">
                              {locked ? (
                                <Lock size={20} weight="bold" aria-hidden="true" />
                              ) : done ? (
                                <Check size={22} weight="bold" aria-hidden="true" />
                              ) : st.kind === 'game' ? (
                                <RocketLaunch size={22} weight="bold" aria-hidden="true" />
                              ) : isCurrent ? (
                                <span className="station-dot" />
                              ) : (
                                <Star size={20} weight="bold" aria-hidden="true" />
                              )}
                            </span>
                            <span className="station-text">
                              <span className="station-code">{st.code}</span>
                              <span className="station-name jp" lang="ja">{st.label}</span>
                            </span>
                          </button>
                          {done && <span className="station-stamp" aria-hidden="true">済</span>}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        {finished && (
          <div className="panel" style={{ marginTop: 20 }}>
            <strong>Bạn đã đi hết mọi tuyến.</strong>
            <p className="muted">Hãy ôn lại bằng game Bắn chữ hoặc luyện Truyền tin.</p>
          </div>
        )}
      </section>

      <aside className="rail" aria-label="Thẻ tàu của bạn">
        <div className="panel goal">
          <Daru size={84} bothEyes={goalMet} mood={goalMet ? 'happy' : 'idle'} />
          <div>
            <h3>{goalMet ? 'Daru đã có đủ hai mắt' : 'Vẽ mắt cho Daru'}</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              {goalMet
                ? 'Bạn đã đạt mục tiêu hôm nay. Ngày mai Daru lại chờ bạn.'
                : `Đạt ${p.dailyGoal} điểm hôm nay để vẽ con mắt thứ hai.`}
            </p>
            <div className="goal-row">
              <ProgressRing value={p.dailyXp} max={p.dailyGoal} size={48} stroke={6}>
                <Lightning size={18} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
              </ProgressRing>
              <strong>
                {Math.min(p.dailyXp, p.dailyGoal)} / {p.dailyGoal} điểm
              </strong>
            </div>
          </div>
        </div>

        <div className="panel stats">
          <div>
            <Fire size={26} weight="fill" color="var(--shu)" aria-hidden="true" />
            <strong>{p.streak}</strong>
            <span>ngày liền</span>
          </div>
          <div>
            <Stamp size={26} weight="fill" color="var(--ai)" aria-hidden="true" />
            <strong>{stampCount}</strong>
            <span>dấu ga</span>
          </div>
          <div>
            <BookOpenText size={26} weight="fill" color="var(--matcha)" aria-hidden="true" />
            <strong>{learnedCount}</strong>
            <span>từ đã học</span>
          </div>
        </div>

        <a className="panel quick" href="#/stamps">
          <Stamp size={30} weight="fill" aria-hidden="true" style={{ color: 'var(--shu)' }} />
          <div>
            <h3>Sổ dấu</h3>
            <p>Xem các dấu ga bạn đã sưu tầm.</p>
          </div>
        </a>
        <a className="panel quick quick--game" href="#/game">
          <RocketLaunch size={30} weight="fill" aria-hidden="true" />
          <div>
            <h3>Bắn chữ</h3>
            <p>Gõ romaji để bắn hạ từ đang rơi. Kỷ lục: {p.gameBest} điểm</p>
          </div>
        </a>
        <a className="panel quick quick--relay" href="#/relay">
          <ChatsCircle size={30} weight="fill" aria-hidden="true" />
          <div>
            <h3>Truyền tin</h3>
            <p>Nghe, ghi nhớ rồi nói lại cho người tiếp theo.</p>
          </div>
        </a>
      </aside>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
