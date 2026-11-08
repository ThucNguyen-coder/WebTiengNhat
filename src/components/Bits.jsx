import { rubyParts, kanaToRomaji } from '../lib/kana';
import { speak } from '../lib/speech';
import { useProgress } from '../lib/store';
import { SpeakerHigh, Star } from '@phosphor-icons/react';

// Word with optional furigana and romaji, driven by user settings.
export function Word({ jp, kana, size = 32, showRomaji, showFurigana, className = '' }) {
  const { settings } = useProgress();
  const furi = showFurigana ?? settings.furigana;
  const roma = showRomaji ?? settings.romaji;
  const parts = rubyParts(jp, kana);
  return (
    <span className={`word ${className}`} style={{ fontSize: size }}>
      <span className="jp" lang="ja">
        {parts.map((p, i) =>
          p.ruby && furi ? (
            <ruby key={i}>
              {p.text}
              <rt>{p.ruby}</rt>
            </ruby>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </span>
      {roma && <span className="word-romaji">{kanaToRomaji(kana)}</span>}
    </span>
  );
}

export function SpeakButton({ text, label = 'Nghe phát âm', size = 22, className = 'icon-btn' }) {
  const { settings } = useProgress();
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { rate: settings.rate });
      }}
    >
      <SpeakerHigh size={size} weight="bold" aria-hidden="true" />
    </button>
  );
}

export function Hanko({ char = '済', size = 44, slam = false, label }) {
  return (
    <span
      className={`hanko${slam ? ' hanko--slam' : ''}`}
      style={{ '--size': `${size}px` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {char}
    </span>
  );
}

// Daru: the daruma mascot. Its second eye is painted when the daily goal is met.
export function Daru({ size = 96, bothEyes = false, mood = 'idle' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={bothEyes ? 'Daru đã được vẽ đủ hai mắt' : 'Daru đang chờ bạn đạt mục tiêu'}
      className={`daru daru--${mood}`}
    >
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="currentColor" opacity="0.12" />
      <path d="M60 8C30 8 14 34 14 62c0 30 20 46 46 46s46-16 46-46C106 34 90 8 60 8z" fill="var(--shu)" />
      <path d="M60 14c-6 0-12 2-16 5 10-2 22-2 32 0-4-3-10-5-16-5z" fill="#fff" opacity="0.25" />
      <ellipse cx="60" cy="56" rx="30" ry="27" fill="#fbf6ee" />
      {/* eyebrows */}
      <path d="M36 40c6-6 14-6 18-2" stroke="#1e2a2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M84 40c-6-6-14-6-18-2" stroke="#1e2a2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* eyes: left always painted, right painted on goal */}
      <circle cx="46" cy="54" r="9" fill="#fff" stroke="#1e2a2f" strokeWidth="2.5" />
      <circle cx="46" cy="54" r="5.5" fill="#1e2a2f" />
      <circle cx="74" cy="54" r="9" fill="#fff" stroke="#1e2a2f" strokeWidth="2.5" />
      {bothEyes && <circle cx="74" cy="54" r="5.5" fill="#1e2a2f" className="daru-eye-new" />}
      {/* mustache & mouth */}
      <path d="M48 70c4 3 8 3 12 0 4 3 8 3 12 0" stroke="#1e2a2f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {mood === 'happy' ? (
        <path d="M54 76c3 4 9 4 12 0" stroke="#1e2a2f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M55 78h10" stroke="#1e2a2f" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {/* belly kanji 福 */}
      <text x="60" y="101" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f6d27a" fontFamily="Klee One, serif">
        福
      </text>
    </svg>
  );
}

export function ProgressRing({ value, max, size = 64, stroke = 8, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max ? value / max : 0);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--yamabuki)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hanamaru (花丸): the flower-shaped circle Japanese teachers draw on good work.
export function Hanamaru({ size = 64, className = '' }) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x: 32 + Math.cos(a) * 17, y: 32 + Math.sin(a) * 17 };
  });
  return (
    <svg className={`hanamaru ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Đúng, được chấm hoa mã">
      <g fill="none" stroke="var(--pen)" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="32" cy="32" r="10" pathLength="1" />
        {petals.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="8" pathLength="1" style={{ '--i': i }} />
        ))}
      </g>
    </svg>
  );
}

// Red-pen cross for a wrong answer. Shape is an X, never a tick.
export function PenCross({ size = 28, className = '' }) {
  return (
    <svg className={`pencross ${className}`} width={size} height={size} viewBox="0 0 28 28" role="img" aria-label="Sai">
      <path d="M5 5L23 23M23 5L5 23" fill="none" stroke="var(--pen)" strokeWidth="3.4" strokeLinecap="round" pathLength="1" />
    </svg>
  );
}

// Ticket-style progress: one punch hole per step, punched as you go.
export function TicketProgress({ code, label, done, total }) {
  return (
    <div
      className="ticket"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Tiến độ bài học"
    >
      <span className="ticket-code">{code}</span>
      <span className="ticket-label">{label}</span>
      <span className="ticket-holes" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < done ? 'is-punched' : ''} />
        ))}
      </span>
    </div>
  );
}

// Station stamp (駅スタンプ): square stamp in the line colour with the station code.
export function StationStamp({ code, name, date, tone, Icon, size = 92, empty = false }) {
  if (empty) {
    return (
      <span className="stamp stamp--empty" style={{ '--size': `${size}px` }} role="img" aria-label={`${code}, chưa có dấu`}>
        <span className="stamp-code">{code}</span>
      </span>
    );
  }
  return (
    <span className={`stamp tone-${tone}`} style={{ '--size': `${size}px` }} role="img" aria-label={`Dấu ga ${code}, ${name}`}>
      <span className="stamp-code">{code}</span>
      {Icon && <Icon size={size * 0.34} weight="duotone" aria-hidden="true" />}
      <span className="stamp-name jp" lang="ja">{name}</span>
      {date && <span className="stamp-date">{date}</span>}
    </span>
  );
}

// 1-3 star rating. Filled stars are earned, outlined ones are not.
export function Stars({ value, max = 3, size = 20, className = '' }) {
  return (
    <span className={`star-rating ${className}`} role="img" aria-label={`${value} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={size} weight={i < value ? 'fill' : 'bold'} className={i < value ? 'is-on' : ''} aria-hidden="true" />
      ))}
    </span>
  );
}

// Postage stamp (tem thư) for a delivered letter: perforated edge, Daru in the middle.
export function MailStamp({ title, size = 96, tone = 'shu', empty = false }) {
  const w = 80;
  const h = 100;
  const dots = [];
  for (let x = 6; x < w; x += 9) dots.push([x, 0], [x, h]);
  for (let y = 6; y < h; y += 9) dots.push([0, y], [w, y]);
  return (
    <span className={`mailstamp tone-${tone}${empty ? ' is-empty' : ''}`} style={{ width: size, height: (size * h) / w }}>
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} width="100%" height="100%" role="img" aria-label={empty ? 'Chưa có tem' : `Tem thư: ${title}`}>
        <rect x="0" y="0" width={w} height={h} fill={empty ? 'none' : 'var(--tone-tint)'} stroke="var(--tone)" strokeWidth="2" strokeDasharray={empty ? '4 4' : undefined} />
        {!empty && dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill="var(--stamp-bg, var(--surface))" />)}
        {!empty && <rect x="9" y="9" width={w - 18} height={h - 18} fill="none" stroke="var(--tone)" strokeWidth="1" />}
        {!empty && (
          <g transform="translate(20 18)">
            <circle cx="20" cy="22" r="17" fill="var(--shu)" />
            <ellipse cx="20" cy="20" rx="11" ry="10" fill="#fbf6ee" />
            <circle cx="16" cy="19" r="3" fill="#fff" stroke="#16203a" strokeWidth="1.1" />
            <circle cx="16" cy="19" r="1.8" fill="#16203a" />
            <circle cx="25" cy="19" r="3" fill="#fff" stroke="#16203a" strokeWidth="1.1" />
            <circle cx="25" cy="19" r="1.8" fill="#16203a" />
            <path d="M17 26c2 1.6 5 1.6 7 0" stroke="#16203a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </g>
        )}
        {!empty && <text x={w / 2} y={h - 15} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--tone)">Đã giao</text>}
      </svg>
    </span>
  );
}
