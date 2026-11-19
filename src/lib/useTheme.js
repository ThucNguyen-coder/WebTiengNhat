// Giao diện sáng/tối: dùng lại settings.theme trong store (đã lưu localStorage), không tạo kho lưu thứ hai.
import { useCallback, useEffect, useState } from 'react';
import { useProgress } from './store';

const QUERY = '(prefers-color-scheme: dark)';

function systemDark() {
  try { return window.matchMedia(QUERY).matches; } catch { return false; }
}

export function useTheme() {
  const { settings, updateSettings } = useProgress();
  const [sys, setSys] = useState(systemDark);

  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(QUERY); } catch { return undefined; }
    const onChange = (e) => setSys(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = settings.theme || 'system';
  const resolved = theme === 'system' ? (sys ? 'dark' : 'light') : theme;
  const toggle = useCallback(
    () => updateSettings({ theme: resolved === 'dark' ? 'light' : 'dark' }),
    [resolved, updateSettings],
  );
  return { theme, resolved, toggle };
}
