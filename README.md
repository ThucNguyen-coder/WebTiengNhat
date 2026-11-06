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
