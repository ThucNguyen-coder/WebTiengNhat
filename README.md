# Konnichiwa – Học tiếng Nhật

Web học tiếng Nhật (N5–N4) cho người Việt: lộ trình bài học, bảng chữ cái, sổ từ vựng,
game **Bắn chữ** và luyện **Truyền tin** (nghe, ghi nhớ, nói lại cho người tiếp theo).

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Nên dùng **Chrome hoặc Edge** để có giọng đọc tiếng Nhật và nhận diện giọng nói.

## Cấu trúc

- `src/data/vocab.js`: từ vựng theo chủ đề (thêm chủ đề mới ở đây)
- `src/data/relay.js`: tình huống Truyền tin (lời nhắn, câu mẫu, ý chính để chấm điểm)
- `src/lib/kana.js`: chuyển romaji ↔ kana, chấp nhận nhiều kiểu gõ (shi/si, tsu/tu, n/nn…)
- `src/game/`: game Bắn chữ
- `src/relay/`: tính năng Truyền tin
- Tiến độ lưu trong localStorage của trình duyệt.

## Tài khoản và lưu tiến độ (Supabase)

Đăng nhập bằng Google, tiến độ lưu vào Supabase. Không có biến môi trường thì web vẫn chạy, chỉ ẩn phần đăng nhập.

1. Tạo bảng: mở `supabase/schema.sql`, dán toàn bộ vào Supabase > SQL Editor, bấm Run (chạy lại nhiều lần vẫn an toàn).
2. Biến môi trường (công khai, chỉ là địa chỉ dự án và khóa publishable):
   - Trên máy: chép `.env.example` thành `.env.local` rồi điền giá trị.
   - Trên Vercel: Settings > Environment Variables, loại **Config**.
3. Google: bật provider Google trong Supabase > Authentication, khai báo Site URL và Redirect URLs.

Không bao giờ đưa khóa `sb_secret_` / `service_role` hay Client secret của Google vào code hoặc GitHub.

- `src/lib/supabase.js`: tạo kết nối
- `src/lib/auth.jsx`: đăng nhập, đăng xuất, xóa tài khoản
- `src/lib/sync.js`: gộp và lưu tiến độ
- `src/components/Account.jsx`: giao diện tài khoản

## Quản lý nội dung (giáo viên)

Giáo viên thêm, sửa chủ đề và từ vựng ngay trên web. Cài đặt và hướng dẫn: [docs/quan-ly-noi-dung.md](docs/quan-ly-noi-dung.md).

## Giọng đọc AI và nội dung từ Google Sheet

Xem hướng dẫn đầy đủ trong [docs/giong-doc-va-google-sheet.md](docs/giong-doc-va-google-sheet.md).

- `npm run audio`: tạo file giọng AI (Google Cloud Text-to-Speech) cho câu, từ còn thiếu
- `npm run content`: lấy nội dung từ Google Sheet
- `npm run check-content`: kiểm tra các tệp CSV của Sheet
- `npm run content-templates`: xuất nội dung hiện có ra CSV để nhập vào Sheet

Cả hai bước tự chạy trước mỗi lần build, và tự bỏ qua khi chưa cấu hình.
