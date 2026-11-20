// Ngữ cảnh gửi cho Dify (biến START: current_page, jlpt_level).
// Chỉ phụ thuộc data/vocab.js. Id ga giống quy ước của lộ trình: `${topic.id}:L${n}` và `${topic.id}:game`.
import { TOPICS, lessonsOf } from '../data/vocab';

const PAGES = {
  '': 'home', kana: 'kana', vocab: 'vocab', game: 'game',
  relay: 'relay', stamps: 'stamps', settings: 'settings', lesson: 'lesson',
  'on-tap': 'review', 'hom-nay': 'daily',
};

export const pageName = (route) => PAGES[route[0] || ''] || 'other';

const stationIds = (topic) => [...lessonsOf(topic).map((_, i) => `${topic.id}:L${i}`), `${topic.id}:game`];

// N5 cho tới khi hoàn thành mọi ga của các tuyến N5, sau đó là N4.
export function jlptLevel(completed = {}) {
  const n5 = TOPICS.filter((t) => t.level === 'N5');
  const done = n5.length > 0 && n5.every((t) => stationIds(t).every((id) => completed[id]));
  return done ? 'N4' : 'N5';
}

// Mô tả ngắn cách dùng web để chatbot trả lời được "làm sao chơi / chỉnh ở đâu".
// Gửi sang Dify qua biến `site_guide` (xem ChatWidget, cờ VITE_DIFY_SEND_GUIDE); nếu không dùng biến,
// dán nguyên văn đoạn này vào prompt hệ thống của app Dify. Giữ ngắn, đúng với giao diện hiện tại.
export const SITE_GUIDE = `Konnichiwa là web học tiếng Nhật (N5–N4) cho học sinh cấp 2 và người mới học. Khi bạn hỏi cách dùng web, hãy trả lời ngắn gọn, chỉ đúng chỗ bấm. Web không có bộ phận hỗ trợ hay email liên hệ: nếu không chắc, nói thật là chưa rõ và gợi ý mục gần nhất bên dưới.

Menu chính (thanh bên trên máy tính, thanh dưới trên điện thoại): Học, Chữ cái, Từ vựng, Bắn chữ, Truyền tin. Ở góc có chuỗi ngày học, điểm hôm nay, tài khoản và Cài đặt (bánh răng).
- Học (trang chủ): bản đồ như tuyến tàu, mỗi chủ đề là một tuyến, mỗi bài là một "ga". Bấm vào ga để học 5 từ rồi làm bài tập (trắc nghiệm, nghe chọn, gõ romaji). Làm xong sẽ được điểm và đóng dấu ga. Cuối mỗi tuyến có ga trò chơi.
- Thẻ "Bài hôm nay" ở đầu trang chủ: bài ngắn khoảng 5 phút mỗi ngày, gồm từ cần ôn và từ mới. Bấm "Bắt đầu bài hôm nay".
- Ôn tập: ôn lại từ đã học đúng lúc sắp quên (6 hộp ôn tập). Vào từ thẻ "Từ cần ôn" ở trang chủ hoặc trang Ôn tập. "Từ hay sai" gom các từ bạn hay trả lời sai để luyện riêng.
- Chữ cái: bảng Hiragana và Katakana, bấm vào chữ để nghe và xem cách đọc.
- Từ vựng: danh sách từ theo chủ đề, bấm vào chủ đề để xem từ hoặc lật thẻ ghi nhớ (flashcard) rồi chọn "Đã thuộc" hay "Cần ôn lại".
- Bắn chữ: trò chơi. Chọn chủ đề và độ khó (Dễ có romaji gợi ý, Thường chỉ có furigana, Khó chỉ có chữ Kanji), bấm Bắt đầu. Từ tiếng Nhật rơi xuống, gõ cách đọc bằng romaji (bàn phím tiếng Anh) để bắn hạ trước khi chạm đất. Esc để tạm dừng. Có 20 mốc.
- Truyền tin: nhận lời nhắn từ một nhân vật rồi nhắn lại cho người khác bằng tiếng Nhật. Có 3 bậc: Bậc 1 Nhập môn (ghép thẻ từ), Bậc 2 Làm quen (nhớ ý chính rồi điền từ vào câu), Bậc 3 Thử thách (nghe câu dài, tự nói hoặc gõ lại). Giao đủ 3 thư ở bậc dưới thì mở bậc trên, hoặc bật "Mình đã biết tiếng Nhật, mở hết các bậc". Mỗi thư được tối đa 3 sao.
- Cài đặt (bánh răng): bật/tắt Furigana (cách đọc nhỏ trên chữ Hán) và Romaji; chọn Giao diện Theo máy, Sáng hoặc Tối (trên máy tính còn có nút đổi sáng/tối ở thanh bên); chọn Tốc độ giọng đọc Chậm, Vừa, Nhanh; bật/tắt hiệu ứng âm thanh; chọn mục tiêu điểm mỗi ngày; đăng nhập hoặc xóa tiến độ.
- Đăng nhập: bấm biểu tượng tài khoản (hoặc vào Cài đặt) rồi "Đăng nhập bằng Google" để lưu tiến độ và học tiếp trên máy khác. Không đăng nhập vẫn học được, tiến độ chỉ lưu trong trình duyệt này.
- Nghe phát âm cần trình duyệt có giọng tiếng Nhật; nói trong Truyền tin cần Chrome hoặc Edge, nếu không thì gõ câu trả lời.

Cách đọc: は khi là trợ từ đọc "wa", を đọc "o", へ đọc "e" (ví dụ わたしは = watashi wa, がっこうへ = gakkou e).`;
