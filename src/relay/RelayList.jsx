import { Ear, Brain, Envelope, MapPin, Stack, Lock } from '@phosphor-icons/react';
import {
  TIERS, DIFFICULTIES, scenariosOfTier, ALL_SCENARIOS, tierProgress, tierUnlocked, starsOf, delivered,
} from '../lib/relayTiers';
import { useProgress } from '../lib/store';
import { recognitionSupported } from '../lib/speech';
import { Stars, MailStamp } from '../components/Bits';
import '../pages/vocab.css';
import './relay.css';

export default function RelayList() {
  const { relay, settings, updateSettings } = useProgress();
  const diff = settings.relayDiff || 'easy';
  const unlockAll = !!settings.relayUnlockAll;
  const stampCount = ALL_SCENARIOS.filter((sc) => delivered(relay[sc.id])).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Truyền tin cùng Daru</h1>
          <p>Daru nhận được thư nhờ giao. Bạn hãy nghe lời nhắn, nhớ thật kỹ rồi nhắn lại đúng người nhé.</p>
        </div>
      </div>

      <ol className="relay-how" aria-label="Cách chơi">
        <li>
          <Ear size={28} weight="fill" aria-hidden="true" />
          <span><strong>Nghe</strong> lời nhắn của người gửi</span>
        </li>
        <li>
          <Brain size={28} weight="fill" aria-hidden="true" />
          <span><strong>Nhớ</strong> các ý chính: ai, việc gì, khi nào, ở đâu</span>
        </li>
        <li>
          <Envelope size={28} weight="fill" aria-hidden="true" />
          <span><strong>Giao thư</strong> bằng cách ghép thẻ, điền từ hoặc nói lại</span>
        </li>
      </ol>

      <div className="stamp-book panel">
        <div>
          <h2>Sổ tem thư</h2>
          <p className="muted">Giao được thư (từ 2 sao) là nhận một tem. Bạn có {stampCount} trên {ALL_SCENARIOS.length} tem.</p>
        </div>
        <div className="stamp-row" aria-hidden="true">
          {ALL_SCENARIOS.filter((sc) => delivered(relay[sc.id])).slice(-4).map((sc) => (
            <MailStamp key={sc.id} title={sc.title} size={44} tone="shu" />
          ))}
          {stampCount === 0 && <MailStamp empty size={44} />}
        </div>
      </div>

      <div className="relay-diff">
        <span className="relay-diff-label" id="diff-label">Cách nghe</span>
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
          Trình duyệt này chưa nghe được giọng nói, nhưng bạn vẫn chơi được bằng cách ghép thẻ, điền từ hoặc gõ câu trả lời. Dùng Chrome hoặc Edge nếu muốn nói qua micro.
        </p>
      )}

      {TIERS.map((tier) => {
        const list = scenariosOfTier(tier.id);
        const prog = tierProgress(tier.id, relay);
        const open = tierUnlocked(tier.id, relay, unlockAll);
        return (
          <section key={tier.id} className="tier" aria-labelledby={`tier-${tier.id}`}>
            <div className="tier-head">
              <h2 id={`tier-${tier.id}`}>
                {tier.label}: {tier.name}
              </h2>
              {!open && (
                <span className="chip">
                  <Lock size={14} weight="bold" aria-hidden="true" /> Giao {prog.have}/{prog.need} thư ở Bậc {tier.id - 1} để mở
                </span>
              )}
            </div>
            <p className="muted tier-desc">{tier.desc}</p>

            {open ? (
              <ul className="scenario-list">
                {list.map((sc) => {
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
                            <span><Stack size={14} weight="bold" aria-hidden="true" /> {sc.steps.length} lá thư</span>
                          </span>
                        </span>
                        {best != null ? (
                          <span className="scenario-best">
                            <Stars value={starsOf(best)} size={16} />
                            {delivered(best) && <MailStamp title={sc.title} size={26} tone="shu" />}
                          </span>
                        ) : (
                          <span className="chip">Chưa giao</span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="tier-locked">
                Giao thành công {prog.need} lá thư ở Bậc {tier.id - 1} để mở các thư ở đây.
              </p>
            )}
          </section>
        );
      })}

      <label className="relay-unlock">
        <input type="checkbox" checked={unlockAll} onChange={(e) => updateSettings({ relayUnlockAll: e.target.checked })} />
        <span>Mình đã biết tiếng Nhật, mở hết các bậc</span>
      </label>
    </div>
  );
}
