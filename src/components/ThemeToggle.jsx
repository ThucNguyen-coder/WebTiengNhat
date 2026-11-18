import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../lib/useTheme';
import './theme.css';

// variant="icon": nút tròn cho thanh trên (điện thoại); variant="nav": một mục trong thanh bên.
export default function ThemeToggle({ variant = 'icon' }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  const Icon = dark ? Sun : Moon;
  const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';

  if (variant === 'nav') {
    return (
      <button type="button" className="nav-item nav-item--btn" onClick={toggle} title={label}>
        <Icon key={resolved} className="theme-icon" size={26} weight="bold" aria-hidden="true" />
        {dark ? 'Giao diện sáng' : 'Giao diện tối'}
      </button>
    );
  }
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      <Icon key={resolved} className="theme-icon" size={22} weight="bold" aria-hidden="true" />
    </button>
  );
}
