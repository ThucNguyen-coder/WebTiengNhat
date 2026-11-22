// Chế độ "mở khóa tất cả bài" cho người đã biết tiếng Nhật hoặc muốn xem thử.
// Lưu riêng trong localStorage của trình duyệt (không đụng tới store tiến độ hay đồng bộ tài khoản).
import { useCallback, useEffect, useState } from 'react';

const KEY = "konnichiwa-unlock-all-v1";

const read = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export function useUnlockAll() {
  const [unlocked, setState] = useState(read);

  const setUnlocked = useCallback((value) => {
    setState(!!value);
    try {
      if (value) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    } catch { /* storage blocked */ }
  }, []);

  // Đồng bộ giữa các tab đang mở cùng lúc.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY || e.key === null) setState(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { unlocked, setUnlocked };
}
