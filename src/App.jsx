import { useEffect } from 'react';
import {
  Path, Translate, BookOpenText, RocketLaunch, ChatsCircle, GearSix, Fire, Lightning,
} from '@phosphor-icons/react';
import { useProgress, useRoute } from './lib/store';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Vocab from './pages/Vocab';
import Kana from './pages/Kana';
import Settings from './pages/Settings';
import SpaceGame from './game/SpaceGame';
import RelayList from './relay/RelayList';
import RelayPlay from './relay/RelayPlay';

const NAV = [
  { href: '#/', key: '', label: 'Học', Icon: Path },
  { href: '#/kana', key: 'kana', label: 'Chữ cái', Icon: Translate },
  { href: '#/vocab', key: 'vocab', label: 'Từ vựng', Icon: BookOpenText },
  { href: '#/game', key: 'game', label: 'Bắn chữ', Icon: RocketLaunch },
  { href: '#/relay', key: 'relay', label: 'Truyền tin', Icon: ChatsCircle },
];

function Brand({ stacked = false }) {
  return (
    <a className={`brand${stacked ? ' brand--stacked' : ''}`} href="#/" aria-label="Konnichiwa, về trang chủ">
      <img className="brand-mark" src="/logo-mark.png" alt="" width="195" height="148" />
      <span className="brand-name" aria-hidden="true">
        K<span className="brand-dot" />NNICHIWA
      </span>
    </a>
  );
}

export default function App() {
  const route = useRoute();
  const { settings, streak, dailyXp } = useProgress();
  const [section, ...params] = route;
  const current = section || '';

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Focused, full-screen flows hide the navigation.
  if (current === 'lesson') return <Lesson topicId={params[0]} index={Number(params[1] || 0)} />;
  if (current === 'relay' && params[0]) return <RelayPlay id={params[0]} />;

  let page;
  switch (current) {
    case 'kana': page = <Kana />; break;
    case 'vocab': page = <Vocab topicId={params[0]} />; break;
    case 'game': page = <SpaceGame topicId={params[0]} />; break;
    case 'relay': page = <RelayList />; break;
    case 'settings': page = <Settings />; break;
    default: page = <Home />;
  }

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Brand stacked />
        <nav style={{ display: 'contents' }}>
          {NAV.map(({ href, key, label, Icon }) => (
            <a key={key} href={href} className="nav-item" aria-current={current === key ? 'page' : undefined}>
              <Icon size={26} weight={current === key ? 'fill' : 'bold'} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-spacer" />
        <a href="#/settings" className="nav-item" aria-current={current === 'settings' ? 'page' : undefined}>
          <GearSix size={26} weight={current === 'settings' ? 'fill' : 'bold'} aria-hidden="true" />
          Cài đặt
        </a>
      </aside>

      <div className="main">
        <header className="topbar-mobile">
          <Brand />
          <div className="topbar-stats">
            <span title="Chuỗi ngày học" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--shu)' }}>
              <Fire size={22} weight="fill" aria-hidden="true" />
              {streak}
              <span className="sr-only">ngày liên tiếp</span>
            </span>
            <span title="XP hôm nay" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--yamabuki-deep)' }}>
              <Lightning size={22} weight="fill" aria-hidden="true" />
              {dailyXp}
              <span className="sr-only">XP hôm nay</span>
            </span>
            <a href="#/settings" className="icon-btn" aria-label="Cài đặt">
              <GearSix size={22} weight="bold" aria-hidden="true" />
            </a>
          </div>
        </header>

        <main id="main">{page}</main>

        <nav className="bottom-nav" aria-label="Điều hướng chính">
          {NAV.map(({ href, key, label, Icon }) => (
            <a key={key} href={href} aria-current={current === key ? 'page' : undefined}>
              <Icon size={24} weight={current === key ? 'fill' : 'bold'} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
