// Chatbot Konnichiwa: nhúng widget Dify (không có token thì không làm gì cả).
// Cấu hình bằng biến môi trường, xem .env.example.
import { useEffect } from 'react';
import './chat.css';

const TOKEN = import.meta.env.VITE_DIFY_TOKEN;
const BASE = (import.meta.env.VITE_DIFY_BASE_URL || 'https://udify.app').replace(/\/$/, '');
// Màn hình tập trung (bài học, game, đang chơi Truyền tin) thì ẩn bong bóng chat.
const FOCUSED = new Set(['lesson', 'game']);

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export default function ChatWidget() {
  useEffect(() => {
    const sync = () => {
      const [section, id] = readRoute();
      const hide = FOCUSED.has(section) || (section === 'relay' && !!id);
      document.body.toggleAttribute('data-hide-chat', hide);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      document.body.removeAttribute('data-hide-chat');
    };
  }, []);

  useEffect(() => {
    if (!TOKEN || document.getElementById(TOKEN)) return;
    window.difyChatbotConfig = { token: TOKEN, baseUrl: BASE };
    const s = document.createElement('script');
    s.src = `${BASE}/embed.min.js`;
    s.id = TOKEN;
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return null;
}
