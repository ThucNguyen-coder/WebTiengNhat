import { useState } from 'react';
import { chart } from '../data/kanaChart';
import { useProgress } from '../lib/store';
import { speak } from '../lib/speech';
import './vocab.css';
import './kana.css';

export default function Kana() {
  const { settings } = useProgress();
  const [script, setScript] = useState('hira');
  const [active, setActive] = useState(null);
  const sections = chart(script);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bảng chữ cái</h1>
          <p>Bấm vào từng chữ để nghe cách đọc. Học Hiragana trước, sau đó tới Katakana.</p>
        </div>
      </div>
      <div className="seg" role="tablist" aria-label="Chọn bảng chữ">
        <button role="tab" aria-selected={script === 'hira'} onClick={() => setScript('hira')}>
          <span className="jp" lang="ja">あ</span> Hiragana
        </button>
        <button role="tab" aria-selected={script === 'kata'} onClick={() => setScript('kata')}>
          <span className="jp" lang="ja">ア</span> Katakana
        </button>
      </div>

      {sections.map((sec) => (
        <section key={sec.id} className="kana-sec" aria-labelledby={`k-${sec.id}`}>
          <h2 id={`k-${sec.id}`}>{sec.title}</h2>
          <div className="kana-grid" style={{ '--cols': sec.cols }}>
            {sec.rows.flat().map((c, i) =>
              c ? (
                <button
                  key={i}
                  className={`kana-cell${active === c.char ? ' is-active' : ''}`}
                  onClick={() => {
                    setActive(c.char);
                    speak(c.hira, { rate: settings.rate * 0.85 });
                  }}
                  aria-label={`${c.char}, đọc là ${c.romaji}`}
                >
                  <span className="jp" lang="ja">{c.char}</span>
                  <small>{c.romaji}</small>
                </button>
              ) : (
                <span key={i} className="kana-empty" aria-hidden="true" />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
