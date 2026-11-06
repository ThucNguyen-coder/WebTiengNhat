import { ChatsCircle, Ear, Brain, Microphone, MapPin, Stack } from '@phosphor-icons/react';
import { SCENARIOS, DIFFICULTIES } from '../data/relay';
import { useProgress } from '../lib/store';
import { recognitionSupported } from '../lib/speech';
import { Hanko } from '../components/Bits';
import '../pages/vocab.css';
import './relay.css';

export default function RelayList() {
  const { relay, settings, updateSettings } = useProgress();
  const diff = settings.relayDiff || 'easy';
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Truyền tin</h1>
          <p>Một người nhờ bạn nhắn lại. Hãy nghe, ghi nhớ rồi nói lại bằng tiếng Nhật cho người tiếp theo.</p>
        </div>
      </div>

      <ol className="relay-how" aria-label="Cách chơi">
        <li>
          <Ear size={28} weight="fill" aria-hidden="true" />
          <span><strong>Nghe</strong> lời nhắn từ người thứ nhất</span>
        </li>
        <li>
          <Brain size={28} weight="fill" aria-hidden="true" />
          <span><strong>Ghi nhớ</strong> ý chính: ai, cái gì, khi nào, ở đâu</span>
        </li>
        <li>
          <Microphone size={28} weight="fill" aria-hidden="true" />
          <span><strong>Nói lại</strong> cho người tiếp theo qua micro hoặc gõ phím</span>
        </li>
      </ol>

      <div className="relay-diff">
        <span className="relay-diff-label" id="diff-label">Độ khó</span>
        <div className="seg" role="radiogroup" aria-labelledby="diff-label" style={{ margin: 0 }}>
          {Object.values(DIFFICULTIES).map((d) => (
            <button
              key={d.id}
              role="radio"
              aria-checked={diff === d.id}
              aria-selected={diff === d.id}
              onClick={() => updateSettings({ relayDiff: d.id })}
            >
              {d.label}
            </button>
          ))}
        </div>
        <span className="muted">{DIFFICULTIES[diff].desc}</span>
      </div>

      {!recognitionSupported() && (
        <p className="relay-warn">
          Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn vẫn chơi được bằng cách gõ câu trả lời (tiếng Nhật hoặc romaji). Dùng Chrome hoặc Edge để nói qua micro.
        </p>
      )}

      <ul className="scenario-list">
        {SCENARIOS.map((sc) => {
          const best = relay[sc.id];
          const people = Object.values(sc.cast);
          return (
            <li key={sc.id}>
              <a className="scenario" href={`#/relay/${sc.id}`}>
                <span className="scenario-cast" aria-hidden="true">
                  {people.map((pp) => (
                    <span key={pp.name} className={`avatar avatar--sm tone-${pp.tone}`}>{pp.glyph}</span>
                  ))}
                </span>
                <span className="scenario-text">
                  <strong>{sc.title}</strong>
                  <span className="scenario-meta">
                    <span><MapPin size={14} weight="bold" aria-hidden="true" /> {sc.place}</span>
                    <span><Stack size={14} weight="bold" aria-hidden="true" /> {sc.steps.length} lượt truyền</span>
                    <span>{sc.level}</span>
                  </span>
                </span>
                {best != null ? (
                  <span className="scenario-best">
                    {best >= 60 && <Hanko char="伝" size={34} />}
                    <span>{best} điểm</span>
                  </span>
                ) : (
                  <span className="chip">Chưa chơi</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="muted" style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <ChatsCircle size={20} weight="bold" aria-hidden="true" /> Được từ 60 điểm trở lên thì tình huống được đóng dấu 伝 (truyền đạt).
      </p>
    </div>
  );
}
