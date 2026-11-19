// Answer modes for the relay screen that need no speaking or typing:
// building the sentence from word tiles (tier 1) and filling in the key words (tier 2).
import { useMemo, useState } from 'react';
import { ArrowCounterClockwise, Check } from '@phosphor-icons/react';
import { Word, shuffle } from '../components/Bits';
import { buildFill } from '../lib/relayTiers';
import { normalizeJa, similarity } from '../lib/kana';
import { speak } from '../lib/speech';
import { useProgress } from '../lib/store';

/* ---------- tiles ---------- */

export function TileMode({ step, onSubmit }) {
  const { settings } = useProgress();
  const tiles = useMemo(() => shuffle([...step.chunks, ...(step.extra || [])].map((t, i) => ({ ...t, id: i }))), [step]);
  const [placed, setPlaced] = useState([]); // tile ids in answer order
  const byId = (id) => tiles.find((t) => t.id === id);
  const used = new Set(placed);

  const add = (t) => {
    speak(t.kana, { rate: settings.rate });
    setPlaced((p) => [...p, t.id]);
  };
  const remove = (id) => setPlaced((p) => p.filter((x) => x !== id));

  const submit = () => {
    const answer = placed.map((id) => byId(id).jp).join('');
    const exact = normalizeJa(answer) === normalizeJa(step.chunks.map((c) => c.jp).join(''));
    const sim = similarity(normalizeJa(answer), normalizeJa(step.chunks.map((c) => c.jp).join('')));
    onSubmit({ answer, score: exact ? 100 : Math.min(80, Math.round(sim * 90)), tested: null });
  };

  return (
    <div className="tilemode">
      <div className="tile-line" aria-label="Câu của bạn" aria-live="polite">
        {placed.length === 0 && <span className="tile-hint">Bấm các thẻ bên dưới để ghép thành lời nhắn</span>}
        {placed.map((id) => {
          const t = byId(id);
          return (
            <button key={id} type="button" className="tile tile--placed" onClick={() => remove(id)} aria-label={`Bỏ thẻ ${t.jp}`}>
              <Word jp={t.jp} kana={t.kana} size={22} />
            </button>
          );
        })}
      </div>
      <div className="tile-pool" role="group" aria-label="Các thẻ từ">
        {tiles.map((t) => (
          <button key={t.id} type="button" className="tile" disabled={used.has(t.id)} onClick={() => add(t)}>
            <Word jp={t.jp} kana={t.kana} size={22} />
          </button>
        ))}
      </div>
      <div className="relay-actions">
        <button className="btn btn--ghost" type="button" onClick={() => setPlaced([])} disabled={!placed.length}>
          <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> Xóa hết
        </button>
        <button className="btn btn--ai" type="button" onClick={submit} disabled={!placed.length}>
          Giao thư
        </button>
      </div>
    </div>
  );
}

/* ---------- fill in the key words ---------- */

export function FillMode({ step, onSubmit }) {
  const fill = useMemo(() => buildFill(step), [step]);
  const [picks, setPicks] = useState(() => fill.blanks.map(() => null)); // chosen option index per blank
  const active = picks.findIndex((x) => x === null);
  const allFilled = active === -1;

  const choose = (bi, oi) => setPicks((p) => p.map((x, i) => (i === bi ? oi : x)));
  const clear = (bi) => setPicks((p) => p.map((x, i) => (i === bi ? null : x)));

  const submit = () => {
    const tested = step.keypoints.map(() => null);
    let right = 0;
    fill.blanks.forEach((b, i) => {
      const ok = b.options[picks[i]].form === b.answer.form;
      tested[b.kpIndex] = ok;
      if (ok) right += 1;
    });
    const answer = fill.segs.map((sg) => ('text' in sg ? sg.text : fill.blanks[sg.blank].options[picks[sg.blank]].form)).join('');
    onSubmit({ answer, score: Math.round((100 * right) / fill.blanks.length), tested });
  };

  const current = !allFilled ? fill.blanks[active] : null;

  return (
    <div className="fillmode">
      <p className="fill-sentence jp" lang="ja">
        {fill.segs.map((sg, i) =>
          'text' in sg ? (
            <span key={i}>{sg.text}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={`blank${picks[sg.blank] !== null ? ' is-filled' : ''}${sg.blank === active ? ' is-active' : ''}`}
              onClick={() => clear(sg.blank)}
              aria-label={picks[sg.blank] !== null ? `${fill.blanks[sg.blank].label}: ${fill.blanks[sg.blank].options[picks[sg.blank]].form}. Bấm để chọn lại` : `Chỗ trống: ${fill.blanks[sg.blank].label}`}
            >
              {picks[sg.blank] !== null ? fill.blanks[sg.blank].options[picks[sg.blank]].form : '＿＿'}
            </button>
          ),
        )}
      </p>

      {current ? (
        <div className="fill-ask">
          <p className="fill-q">
            {current.label}? <span className="muted">({current.vi})</span>
          </p>
          <div className="fill-options" role="group" aria-label={`Chọn: ${current.label}`}>
            {current.options.map((o, oi) => (
              <button key={o.form} type="button" className="tile" onClick={() => choose(active, oi)}>
                <Word jp={o.form} kana={o.kana} size={24} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="fill-q">Điền đủ rồi. Bấm vào chỗ đã điền nếu muốn đổi.</p>
      )}

      <div className="relay-actions">
        <button className="btn btn--ai" type="button" onClick={submit} disabled={!allFilled}>
          <Check size={20} weight="bold" aria-hidden="true" /> Giao thư
        </button>
      </div>
    </div>
  );
}
