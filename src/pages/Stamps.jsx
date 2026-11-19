import { CaretLeft, Stamp } from '@phosphor-icons/react';
import { buildLines, flattenStations, formatStampDate } from '../lib/lines';
import { useProgress } from '../lib/store';
import { StationStamp } from '../components/Bits';
import { TOPIC_ICONS } from '../components/topicIcons';
import './home.css';
import './stamps.css';

export default function Stamps() {
  const { completed } = useProgress();
  const lines = buildLines();
  const all = flattenStations(lines);
  const got = all.filter((s) => completed[s.id]).length;

  return (
    <div className="page">
      <div className="page-head">
        <a className="icon-btn" href="#/" aria-label="Quay lại bản đồ tuyến">
          <CaretLeft size={22} weight="bold" aria-hidden="true" />
        </a>
        <div>
          <h1>Sổ dấu</h1>
          <p>Mỗi ga học xong được đóng một dấu. Bạn có {got} trên {all.length} dấu.</p>
        </div>
      </div>

      {got === 0 && (
        <div className="panel stamps-empty">
          <Stamp size={32} weight="duotone" aria-hidden="true" />
          <div>
            <h2>Sổ dấu còn trống</h2>
            <p className="muted">Học xong một bài ở bản đồ tuyến để nhận dấu ga đầu tiên.</p>
            <a className="btn btn--shu btn--sm" href="#/">Về bản đồ tuyến</a>
          </div>
        </div>
      )}

      {lines.map((line) => {
        const t = line.topic;
        const Icon = TOPIC_ICONS[t.icon];
        const n = line.stations.filter((s) => completed[s.id]).length;
        return (
          <section key={t.id} className={`stamp-line tone-${t.color}`} aria-labelledby={`sl-${t.id}`}>
            <h2 id={`sl-${t.id}`}>
              <span className="line-code">{line.code}</span>
              Tuyến {t.title}
              <span className="stamp-line-count">{n}/{line.stations.length}</span>
            </h2>
            <ul className="stamp-grid">
              {line.stations.map((st) => {
                const c = completed[st.id];
                return (
                  <li key={st.id}>
                    {c ? (
                      <StationStamp code={st.code} name={st.label} date={formatStampDate(c.at)} tone={t.color} Icon={Icon} />
                    ) : (
                      <StationStamp code={st.code} empty />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
