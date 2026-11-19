# Giọng đọc AI và nội dung từ Google Sheet

Hai tính năng chạy tự động mỗi lần web build trên Vercel (`npm run build`):

1. Đọc nội dung từ Google Sheet (từ vựng và Truyền tin), kiểm tra lỗi, gộp vào web.
2. Tạo file âm thanh giọng AI (Google Cloud Text-to-Speech) cho những câu, từ còn thiếu.

Chưa cấu hình thì hai bước này tự bỏ qua, web vẫn build bình thường. Câu nào chưa có file âm thanh thì web dùng giọng của trình duyệt như trước.

---

## Phần 1. Giọng đọc AI (Google Cloud Text-to-Speech)

### 1.1. Bật dịch vụ và tạo khóa (làm một lần)

1. Vào https://console.cloud.google.com, chọn project (ví dụ `konnichiwa`).
2. **Gắn tài khoản thanh toán:** menu > **Billing** > liên kết một tài khoản thanh toán. Google yêu cầu bước này kể cả khi chỉ dùng trong mức miễn phí (1 triệu ký tự mỗi tháng với giọng Chirp 3 HD; toàn bộ nội dung hiện tại khoảng 3.700 ký tự).
3. **Đặt cảnh báo ngân sách:** Billing > **Budgets & alerts** > Create budget, ví dụ 1 USD, để được email báo nếu có phát sinh chi phí.
4. **Bật API:** menu > **APIs & Services** > **Library**, tìm **Cloud Text-to-Speech API**, bấm **Enable**.
5. **Tạo khóa:** APIs & Services > **Credentials** > **Create credentials** > **API key**.
6. **Giới hạn khóa:** bấm vào khóa vừa tạo > **API restrictions** > **Restrict key** > chỉ chọn **Cloud Text-to-Speech API** > Save.

### 1.2. Đặt khóa vào đúng chỗ

Khóa này là **bí mật**: không bắt đầu bằng `VITE_`, không đưa lên GitHub, không gửi cho ai.

- **Vercel:** Settings > Environment Variables > thêm `GOOGLE_TTS_API_KEY`, loại **Secret**. Từ đó mỗi lần build, Vercel tự tạo file cho câu, từ mới.
- **Máy của bạn (tùy chọn):** thêm vào `.env.local`:
  ```
  GOOGLE_TTS_API_KEY=khóa_của_bạn
  ```
  rồi chạy `npm run audio` để tạo trước toàn bộ file. Sau đó commit thư mục `public/audio/` lên GitHub, để các lần build sau không phải tạo lại (tiết kiệm lượt gọi).

### 1.3. Lệnh có sẵn

| Lệnh | Việc làm |
|---|---|
| `npm run audio -- --dry` | Chỉ đếm số file sẽ tạo và số ký tự, không gọi Google |
| `npm run audio` | Tạo file còn thiếu |
| `npm run audio -- --prune` | Tạo file còn thiếu và xóa file không còn dùng |

Đổi giọng: đặt `GOOGLE_TTS_VOICE` (mặc định `ja-JP-Chirp3-HD-Aoede`). Nếu Google báo không có giọng đó, thử `ja-JP-Neural2-B`. Đổi giọng thì tên file đổi theo, nên toàn bộ file sẽ được tạo lại.

---

## Phần 2. Nội dung từ Google Sheet

### 2.1. Tạo Sheet (làm một lần)

1. Tạo một Google Sheet mới, đặt tên ví dụ `Konnichiwa – Nội dung`.
2. Tạo **3 tab**, đặt tên đúng: `ChuDe`, `TuVung`, `TruyenTin`.
3. Ở mỗi tab: **Tệp (File) > Nhập (Import) > Tải lên**, chọn tệp tương ứng trong thư mục `content-templates/` của dự án (`ChuDe.csv`, `TuVung.csv`, `TruyenTin.csv`), chọn **Thay thế trang tính hiện tại**. Các tệp này chứa sẵn toàn bộ nội dung hiện có, nên Sheet bắt đầu đầy đủ.
   - Muốn tạo lại các tệp mẫu từ code mới nhất: `npm run content-templates`.

### 2.2. Xuất bản Sheet thành CSV

1. **Tệp > Chia sẻ > Xuất bản lên web (Publish to web)**.
2. Chọn tab `ChuDe`, định dạng **Giá trị được phân tách bằng dấu phẩy (.csv)**, bấm **Xuất bản**, copy link.
3. Làm tương tự cho `TuVung` và `TruyenTin`. Bạn có 3 link.

Ai có link đều **đọc** được nội dung (không sửa được). Đừng để thông tin riêng tư trong Sheet này.

### 2.3. Đặt link vào Vercel (và máy bạn nếu muốn thử)

Vercel > Settings > Environment Variables, loại **Config**:

| Tên biến | Giá trị |
|---|---|
| `SHEET_TOPICS_CSV` | link CSV của tab `ChuDe` |
| `SHEET_WORDS_CSV` | link CSV của tab `TuVung` |
| `SHEET_RELAY_CSV` | link CSV của tab `TruyenTin` |

Thử trên máy: thêm 3 dòng đó vào `.env.local`, chạy `npm run content`. Lệnh in ra số chủ đề, số từ và các dòng bị lỗi (tab nào, dòng mấy, lỗi gì).

### 2.4. Nút "Cập nhật web" trong Sheet

1. Vercel > Settings > **Git** > **Deploy Hooks**: tên `google-sheet`, nhánh `main`, bấm **Create Hook**, copy link.
2. Trong Sheet: **Tiện ích mở rộng > Apps Script**, dán nội dung tệp `docs/google-sheet-apps-script.gs`, lưu.
3. Làm theo hướng dẫn ở đầu tệp đó để lưu link Deploy Hook vào **Thuộc tính tập lệnh**.
4. Tải lại Sheet, dùng menu **Konnichiwa > Cập nhật web**. Khoảng 1–2 phút sau nội dung mới lên web.

Link Deploy Hook cho phép bất kỳ ai có nó yêu cầu build lại web, nên chỉ để trong Thuộc tính tập lệnh, không chia sẻ.

---

## Cách điền Sheet

**Quy tắc chung:** nội dung trong Sheet **ghi đè** nội dung trong code khi trùng (cùng id chủ đề, cùng từ `jp` trong một chủ đề, cùng id tình huống). Dòng mới thì được thêm vào. Dòng lỗi bị **bỏ qua** (web giữ phần còn lại) và được liệt kê trong nhật ký build.

### Tab `ChuDe`

| Cột | Ý nghĩa | Ví dụ |
|---|---|---|
| `id` | Mã chủ đề: chữ thường không dấu, số, dấu gạch ngang | `con-vat` |
| `title` | Tên tiếng Việt | `Con vật` |
| `jp_title` | Tên tiếng Nhật | `どうぶつ` |
| `level` | Trình độ | `N5` |
| `color` | Màu tuyến: `shu`, `ai`, `matcha`, `yamabuki`, `sakura` | `matcha` |
| `icon` | Biểu tượng (xem danh sách trong `src/data/sheetFormat.js`) | `Sparkle` |

### Tab `TuVung`

| Cột | Ý nghĩa | Ví dụ |
|---|---|---|
| `topic_id` | id của chủ đề | `con-vat` |
| `jp` | Chữ Nhật (có thể có kanji) | `猫` |
| `kana` | Cách đọc, chỉ hiragana hoặc katakana | `ねこ` |
| `vi` | Nghĩa tiếng Việt | `con mèo` |

Từ có cách đọc không gõ được bằng romaji sẽ bị bỏ qua.

### Tab `TruyenTin`

Mỗi dòng là **một lượt truyền**. Nhiều dòng cùng `id` là một tình huống nhiều lượt, theo thứ tự từ trên xuống. Các cột `title`, `place`, `level`, `tier` lấy ở dòng đầu.

| Cột | Ý nghĩa | Ví dụ |
|---|---|---|
| `id` | Mã tình huống | `mua-banh` |
| `title`, `place`, `level` | Tên, địa điểm, trình độ | `Mua bánh`, `Cửa hàng`, `N5` |
| `tier` | Bậc 1, 2 hoặc 3. Để trống thì web tự xếp | `1` |
| `from`, `to` | `Tên \| cách đọc \| vai trò \| chữ đại diện \| màu` | `お母さん \| おかあさん \| Mẹ \| 母 \| sakura` |
| `message_jp`, `message_kana`, `message_vi` | Lời nhắn người gửi nói | |
| `model_jp`, `model_kana`, `model_vi` | Câu mẫu khi nhắn lại | |
| `keypoints` | Ý chính, **mỗi dòng một ý** (Alt + Enter để xuống dòng trong ô): `Nhãn \| nghĩa \| dạng chấp nhận 1, dạng 2` | `Khi nào \| ngày mai \| 明日, あした` |
| `chunks` | Bậc 1: các thẻ ghép thành câu mẫu, cách nhau bằng `/`, dạng `chữ=cách đọc` (kana thì không cần `=`) | `お兄ちゃん=おにいちゃん / ごはん / だよ` |
| `extra` | Thẻ nhiễu, cùng cách viết với `chunks` | `おやすみ` |

Các thẻ trong `chunks` ghép lại phải đúng bằng `model_jp` (bỏ qua dấu câu). Tình huống Bậc 1 thiếu `chunks` sẽ được xếp vào Bậc 2.

### Kiểm tra trước khi cập nhật

Tải 3 tab về dạng CSV, đặt vào một thư mục, chạy:

```
npm run check-content -- thư-mục-đó
```
