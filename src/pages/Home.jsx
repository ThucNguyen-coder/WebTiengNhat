import { useState } from 'react';
import {
  Star, RocketLaunch, Lock, Fire, Lightning, BookOpenText, ChatsCircle,
  HandWaving, UsersThree, Clock, BowlFood, Train, Student, Briefcase, MapPin, CloudSun,
  ShoppingCart, Heartbeat, House, Smiley, Sparkle, Suitcase, SoccerBall,
} from '@phosphor-icons/react';
import { TOPICS, lessonsOf } from '../data/vocab';
import { useProgress, go } from '../lib/store';
import { Daru, Hanko, ProgressRing } from '../components/Bits';
import './home.css';

export const TOPIC_ICONS = { HandWaving, UsersThree, Clock, BowlFood, Train, Student, Briefcase, MapPin, CloudSun, Lightning, ShoppingCart, Heartbeat, House, Smiley, Sparkle, Suitcase, SoccerBall };

const ZIG = [0, 1, 2, 1, 0, -1, -2, -1];

export function buildPath() {
  const nodes = [];
  TOPICS.forEach((t, ti) => {
    lessonsOf(t).forEach((_, li) =>
      nodes.push({ id: `${t.id}:L${li}`, kind: 'lesson', topic: t, unit: ti, index: li }),
    );
    nodes.push({ id: `${t.id}:game`, kind: 'game', topic: t, unit: ti });
  });
  return nodes;
}

export default function Home() {
  const p = useProgress();
  const [notice, setNotice] = useState('');
  const nodes = buildPath();
  const currentIdx = nodes.findIndex((n) => !p.completed[n.id]);
  const goalMet = p.dailyXp >= p.dailyGoal;
  const learnedCount = Object.keys(p.learned).length;

  const open = (n, i) => {
    if (i > currentIdx && currentIdx !== -1) {
      setNotice('Hoàn thành bài trước để mở khóa bài này.');
      setTimeout(() => setNotice(''), 2600);
      return;
    }
    if (n.kind === 'lesson') go(`/lesson/${n.topic.id}/${n.index}`);
    else go(`/game/${n.topic.id}`);
  };

  let globalIndex = 0;
  return (
    <div className="page page--with-rail">
      <section aria-labelledby="path-title">
        <h1 id="path-title" className="sr-only">Lộ trình học</h1>
        {TOPICS.map((t, ti) => {
          const unitNodes = nodes.filter((n) => n.unit === ti);
          const Icon = TOPIC_ICONS[t.icon] || Star;
          return (
            <div key={t.id} className={`unit tone-${t.color}`}>
              <header className="unit-head">
                <div>
                  <p className="unit-kicker">Bài {ti + 1}, trình độ {t.level}</p>
                  <h2 className="unit-title">{t.title}</h2>
                  <p className="unit-jp jp" lang="ja">{t.jpTitle}</p>
                </div>
                <a className="unit-book" href={`#/vocab/${t.id}`}>
                  <BookOpenText size={22} weight="bold" aria-hidden="true" />
                  <span>Sổ từ</span>
                </a>
                <Icon className="unit-watermark" size={120} weight="duotone" aria-hidden="true" />
              </header>

              <ol className="path">
                {unitNodes.map((n) => {
                  const i = globalIndex++;
                  const done = !!p.completed[n.id];
                  const isCurrent = i === currentIdx;
                  const locked = currentIdx !== -1 && i > currentIdx;
                  const offset = ZIG[i % ZIG.length] * 46;
                  const label =
                    n.kind === 'lesson'
                      ? `${t.title}, bài nhỏ ${n.index + 1}`
                      : `${t.title}, game bắn chữ ôn tập`;
                  return (
                    <li key={n.id} className="path-row" style={{ '--x': `${offset}px` }}>
                      {isCurrent && (
                        <span className="path-bubble" aria-hidden="true">
                          {n.kind === 'game' ? 'Bắn chữ ôn tập' : done ? 'Ôn lại' : 'Bắt đầu'}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`node${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${locked ? ' is-locked' : ''}${n.kind === 'game' ? ' is-game' : ''}`}
                        onClick={() => open(n, i)}
                        aria-label={`${label}${done ? ', đã hoàn thành' : locked ? ', đang khóa' : ''}`}
                        aria-disabled={locked || undefined}
                      >
                        {locked ? (
                          <Lock size={30} weight="fill" aria-hidden="true" />
                        ) : n.kind === 'game' ? (
                          <RocketLaunch size={34} weight="fill" aria-hidden="true" />
                        ) : (
                          <Star size={34} weight="fill" aria-hidden="true" />
                        )}
                        {done && (
                          <span className="node-stamp">
                            <Hanko char="済" size={30} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
        {currentIdx === -1 && (
          <div className="panel" style={{ textAlign: 'center' }}>
            <Hanko char="合" size={64} />
            <p style={{ marginTop: 12, fontWeight: 800 }}>Bạn đã hoàn thành toàn bộ lộ trình. Hãy ôn lại bằng game Bắn chữ.</p>
          </div>
        )}
      </section>

      <aside className="rail" aria-label="Tiến độ của bạn">
        <div className="panel goal">
          <Daru size={92} bothEyes={goalMet} mood={goalMet ? 'happy' : 'idle'} />
          <div>
            <h3>{goalMet ? 'Daru đã có đủ hai mắt' : 'Vẽ mắt cho Daru'}</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              {goalMet
                ? 'Bạn đã đạt mục tiêu hôm nay. Ngày mai Daru lại chờ bạn.'
                : `Đạt ${p.dailyGoal} XP hôm nay để vẽ con mắt thứ hai.`}
            </p>
            <div className="goal-row">
              <ProgressRing value={p.dailyXp} max={p.dailyGoal} size={52} stroke={7}>
                <Lightning size={20} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
              </ProgressRing>
              <strong>
                {Math.min(p.dailyXp, p.dailyGoal)} / {p.dailyGoal} XP
              </strong>
            </div>
          </div>
        </div>

        <div className="panel stats">
          <div>
            <Fire size={28} weight="fill" color="var(--shu)" aria-hidden="true" />
            <strong>{p.streak}</strong>
            <span>ngày liên tiếp</span>
          </div>
          <div>
            <Lightning size={28} weight="fill" color="var(--yamabuki-deep)" aria-hidden="true" />
            <strong>{p.xp}</strong>
            <span>tổng XP</span>
          </div>
          <div>
            <BookOpenText size={28} weight="fill" color="var(--matcha)" aria-hidden="true" />
            <strong>{learnedCount}</strong>
            <span>từ đã học</span>
          </div>
        </div>

        <a className="panel quick quick--game" href="#/game">
          <RocketLaunch size={34} weight="fill" aria-hidden="true" />
          <div>
            <h3>Bắn chữ</h3>
            <p>Gõ romaji để bắn hạ từ đang rơi. Kỷ lục: {p.gameBest} điểm</p>
          </div>
        </a>
        <a className="panel quick quick--relay" href="#/relay">
          <ChatsCircle size={34} weight="fill" aria-hidden="true" />
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
