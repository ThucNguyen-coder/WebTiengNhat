// Chatbot Konnichiwa: nhúng widget Dify. Không có token hợp lệ thì không làm gì (không bao giờ ném lỗi).
// Cấu hình bằng biến môi trường, xem .env.example.
import { useEffect } from 'react';
import './chat.css';

const TOKEN = String(import.meta.env.VITE_DIFY_TOKEN || '').trim();
const BASE = String(import.meta.env.VITE_DIFY_BASE_URL || 'https://udify.app').trim().replace(/\/$/, '');
const BUBBLE_ID = 'dify-chatbot-bubble-button';
// Màn hình tập trung (bài học, game, đang chơi Truyền tin) thì ẩn bong bóng chat.
const FOCUSED = new Set(['lesson', 'game']);

// Kiểm tra đầu vào trước khi chèn script: token chỉ gồm chữ và số, địa chỉ phải là https (hoặc localhost khi dev).
const TOKEN_OK = /^[A-Za-z0-9]{8,64}$/.test(TOKEN);
const BASE_OK = /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(BASE) || /^http:\/\/localhost(:\d+)?$/.test(BASE);

const log = (...args) => console.warn('[ChatWidget]', ...args);
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
    if (!TOKEN) {
      log('Chưa có VITE_DIFY_TOKEN. Tạo .env.local ở thư mục gốc (cạnh package.json) rồi KHỞI ĐỘNG LẠI npm run dev.');
      return;
    }
    if (!TOKEN_OK || !BASE_OK) {
      log('VITE_DIFY_TOKEN hoặc VITE_DIFY_BASE_URL không hợp lệ, bỏ qua việc nhúng chatbot.');
      return;
    }
    if (document.getElementById(TOKEN)) return;

    try {
      window.difyChatbotConfig = { token: TOKEN, baseUrl: BASE };
      const script = document.createElement('script');
      script.src = `${BASE}/embed.min.js`;
      script.id = TOKEN;
      script.onload = () => {
        // Một số bản embed.min.js chỉ khởi tạo qua document.body.onload. Trang React nạp script
        // sau khi sự kiện load đã xảy ra nên phải gọi tay khi chưa thấy bong bóng.
        window.setTimeout(() => {
          if (document.getElementById(BUBBLE_ID)) return;
          if (typeof document.body.onload === 'function') document.body.onload(new Event('load'));
          window.setTimeout(() => {
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
  }, []);

  return null;
}
