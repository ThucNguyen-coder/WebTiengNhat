// Chatbot Konnichiwa Sensei: nhúng widget Dify. Giữ nguyên VITE_DIFY_TOKEN và VITE_DIFY_BASE_URL.
// Không có token hợp lệ thì không làm gì (không bao giờ ném lỗi).
import { useEffect, useRef } from 'react';
import { useProgress } from '../lib/store';
import { jlptLevel, pageName } from '../lib/chatContext';
import './chat.css';

const TOKEN = String(import.meta.env.VITE_DIFY_TOKEN || '').trim();
const BASE = String(import.meta.env.VITE_DIFY_BASE_URL || 'https://udify.app').trim().replace(/\/$/, '');
// Chỉ gửi biến ngữ cảnh khi đã khai báo current_page và jlpt_level ở node START của Dify.
const SEND_CONTEXT = String(import.meta.env.VITE_DIFY_SEND_CONTEXT || '').trim().toLowerCase() === 'true';
const BUBBLE_ID = 'dify-chatbot-bubble-button';
// Màn hình tập trung (bài học, game, đang chơi Truyền tin) thì ẩn bong bóng chat.
const FOCUSED = new Set(['lesson', 'game']);

const TOKEN_OK = /^[A-Za-z0-9]{8,64}$/.test(TOKEN);
const BASE_OK = /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(BASE) || /^http:\/\/localhost(:\d+)?$/.test(BASE);

const log = (...args) => console.warn('[ChatWidget]', ...args);
const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

// Hẹn giờ dùng chung ở mức module để dọn được kể cả khi StrictMode chạy effect hai lần.
let timers = [];
const later = (fn, ms) => { timers.push(window.setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach((id) => window.clearTimeout(id)); timers = []; };

export default function ChatWidget() {
  const progress = useProgress();
  const completedRef = useRef({});
  completedRef.current = progress?.completed || {};

  // Ẩn/hiện bong bóng theo route.
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

  // Nạp script Dify đúng một lần (id của thẻ script = token, nên StrictMode không chèn trùng).
  useEffect(() => {
    if (!TOKEN) {
      log('Chưa có VITE_DIFY_TOKEN. Tạo .env.local ở thư mục gốc (cạnh package.json) rồi KHỞI ĐỘNG LẠI npm run dev.');
      return undefined;
    }
    if (!TOKEN_OK || !BASE_OK) {
      log('VITE_DIFY_TOKEN hoặc VITE_DIFY_BASE_URL không hợp lệ, bỏ qua việc nhúng chatbot.');
      return undefined;
    }
    if (!document.getElementById(TOKEN)) {
      try {
        const config = { token: TOKEN, baseUrl: BASE };
        // Dify đọc cấu hình một lần lúc khởi tạo nên ngữ cảnh là của thời điểm mở trang.
        if (SEND_CONTEXT) {
          config.inputs = { current_page: pageName(readRoute()), jlpt_level: jlptLevel(completedRef.current) };
        }
        window.difyChatbotConfig = config;

        const script = document.createElement('script');
        script.src = `${BASE}/embed.min.js`;
        script.id = TOKEN;
        script.onload = () => {
          // Một số bản embed.min.js chỉ khởi tạo qua document.body.onload; trang React nạp script
          // sau sự kiện load nên phải gọi tay khi chưa thấy bong bóng.
          later(() => {
            if (document.getElementById(BUBBLE_ID)) return;
            if (typeof document.body.onload === 'function') document.body.onload(new Event('load'));
            later(() => {
              if (!document.getElementById(BUBBLE_ID)) {
                log('Đã tải embed.min.js nhưng không thấy bong bóng. Kiểm tra app Dify đã Publish và token đúng.');
              }
            }, 800);
          }, 300);
        };
        script.onerror = () => log(`Không tải được ${script.src} (mạng, tường lửa hoặc trình chặn quảng cáo?).`);
        document.body.appendChild(script);
      } catch (err) {
        log('Lỗi khi nhúng widget:', err);
      }
    }
    return clearTimers;
  }, []);

  return null;
}
