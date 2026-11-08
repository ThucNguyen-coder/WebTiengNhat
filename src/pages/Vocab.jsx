import { useState } from 'react';
import { CaretLeft, Cards, ListBullets, ArrowsClockwise, Check, RocketLaunch, Star } from '@phosphor-icons/react';
import { TOPICS, topicById } from '../data/vocab';
import { useProgress } from '../lib/store';
import { speak } from '../lib/speech';
import { Word, SpeakButton } from '../components/Bits';
import { TOPIC_ICONS } from '../components/topicIcons';
import './home.css';
import './vocab.css';

export default function Vocab({ topicId }) {
  const topic = topicId && topicById(topicId);
  return topic ? <TopicWords topic={topic} /> : <TopicGrid />;
}

function TopicGrid() {
  const { learned } = useProgress();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Sổ từ vựng</h1>
          <p>Chọn chủ đề để xem danh sách từ hoặc lật thẻ ôn tập.</p>
        </div>
      </div>
      <ul className="topic-grid">
        {TOPICS.map((t) => {
          const Icon = TOPIC_ICONS[t.icon] || Star;
          const known = t.words.filter((w) => learned[w.jp]).length;
          return (
            <li key={t.id}>
              <a href={`#/vocab/${t.id}`} className={`topic-card tone-${t.color}`}>
                <span className="topic-icon"><Icon size={30} weight="fill" aria-hidden="true" /></span>
                <span className="topic-text">
                  <strong>{t.title}</strong>
                  <span className="jp" lang="ja">{t.jpTitle}</span>
                </span>
                <span className="topic-count">
                  {known}/{t.words.length}
                  <span className="sr-only"> từ đã học</span>
                </span>
                <span className="topic-bar" aria-hidden="true">
                  <span style={{ width: `${(known / t.words.length) * 100}%` }} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopicWords({ topic }) {
  const { learned } = useProgress();
  const [mode, setMode] = useState('list');
  return (
    <div className="page">
      <div className="page-head">
        <a className="icon-btn" href="#/vocab" aria-label="Quay lại danh sách chủ đề">
          <CaretLeft size={22} weight="bold" aria-hidden="true" />
        </a>
        <div style={{ flex: 1 }}>
          <h1>{topic.title}</h1>
          <p>
            <span className="jp" lang="ja">{topic.jpTitle}</span>, {topic.words.length} từ, trình độ {topic.level}
          </p>
        </div>
        <a className="btn btn--ai btn--sm" href={`#/game/${topic.id}`}>
          <RocketLaunch size={18} weight="fill" aria-hidden="true" /> Bắn chữ
        </a>
      </div>

      <div className="seg" role="tablist" aria-label="Chế độ xem">
        <button role="tab" aria-selected={mode === 'list'} onClick={() => setMode('list')}>
          <ListBullets size={20} weight="bold" aria-hidden="true" /> Danh sách
        </button>
        <button role="tab" aria-selected={mode === 'cards'} onClick={() => setMode('cards')}>
          <Cards size={20} weight="bold" aria-hidden="true" /> Lật thẻ
        </button>
      </div>

      {mode === 'list' ? (
        <ul className="word-list">
          {topic.words.map((w) => (
            <li key={w.jp}>
              <Word jp={w.jp} kana={w.kana} size={28} />
              <span className="word-vi">{w.vi}</span>
              {learned[w.jp] ? (
                <span className="chip learned" title="Đã học">
                  <Check size={14} weight="bold" aria-hidden="true" /> Đã học
                </span>
              ) : (
                <span />
              )}
              <SpeakButton text={w.kana} label={`Nghe ${w.jp}`} />
            </li>
          ))}
        </ul>
      ) : (
        <Flashcards words={topic.words} />
      )}
    </div>
  );
}

function Flashcards({ words }) {
  const { settings } = useProgress();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const w = words[i];
  const move = (d) => {
    setFlipped(false);
    setI((x) => (x + d + words.length) % words.length);
  };
  return (
    <div className="flash">
      <button
        className={`flash-card${flipped ? ' is-flipped' : ''}`}
        onClick={() => {
          setFlipped((f) => !f);
          if (!flipped) speak(w.kana, { rate: settings.rate });
        }}
        aria-label={flipped ? `Mặt sau: ${w.vi}. Bấm để lật lại` : `Mặt trước: ${w.jp}. Bấm để lật xem nghĩa`}
      >
        <span className="flash-face flash-front">
          <Word jp={w.jp} kana={w.kana} size={64} showFurigana={false} showRomaji={false} />
          <span className="flash-tip">Bấm để lật</span>
        </span>
        <span className="flash-face flash-back">
          <Word jp={w.jp} kana={w.kana} size={44} showFurigana showRomaji />
          <span className="flash-vi">{w.vi}</span>
        </span>
      </button>
      <div className="flash-nav">
        <button className="btn" onClick={() => move(-1)}>Thẻ trước</button>
        <span className="chip">{i + 1} / {words.length}</span>
        <button className="btn btn--ai" onClick={() => move(1)}>
          Thẻ sau
        </button>
      </div>
      <button className="btn btn--ghost btn--sm" onClick={() => { setI(0); setFlipped(false); }}>
        <ArrowsClockwise size={18} weight="bold" aria-hidden="true" /> Bắt đầu lại
      </button>
    </div>
  );
}
