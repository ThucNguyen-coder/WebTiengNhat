# Trang "Quản lý nội dung"

Giáo viên đăng nhập bằng Google, vào **Cài đặt > Quản lý nội dung** (hoặc mở `#/noi-dung`)
để thêm, sửa, ẩn, xóa chủ đề và từ vựng. Lưu xong là xong: không cần Google Sheet, không cần Vercel.

Học viên thấy nội dung mới ở lần **mở hoặc tải lại web** tiếp theo. Chỉ mục **Đã xuất bản** mới hiện cho học viên.

Phần Truyền tin chưa có trên trang này (vẫn lấy từ code và Google Sheet như cũ).

---

## Cài đặt lần đầu (người quản trị làm, khoảng 5 phút)

### 1. Tạo bảng trên Supabase

1. Mở Supabase > dự án Konnichiwa > **SQL Editor** > **New query**.
2. Mở tệp `supabase/content.sql` trong dự án, copy **toàn bộ**, dán vào, bấm **Run**.
   Chạy lại nhiều lần vẫn an toàn.

### 2. Cấp quyền quản trị cho chính bạn

Vẫn trong SQL Editor, chạy một dòng (thay bằng email Google bạn dùng để đăng nhập web):

```sql
insert into public.content_editors (email, role) values ('email-cua-ban@gmail.com', 'admin');
```

Viết email bằng **chữ thường**.

### 3. Chép nội dung có sẵn vào kho

1. Mở web, đăng nhập bằng email vừa cấp quyền.
2. Vào **Cài đặt**, sẽ thấy mục **Quản lý nội dung** > **Mở trang quản lý**.
3. Bấm **Chép 17 chủ đề, 253 từ**. Toàn bộ nội dung hiện có được chép vào, ở trạng thái Đã xuất bản.
4. Tải lại trang. Từ giờ web lấy nội dung từ kho này.

### 4. Thêm giáo viên

Ở cuối trang quản lý, mục **Giáo viên**: nhập email Google của giáo viên, bấm **Thêm**.

Khi Google đăng nhập còn ở chế độ thử nghiệm, email đó cũng phải có trong
Google Cloud > **Audience** > **Test users**, nếu không giáo viên sẽ không đăng nhập được.

### 5. (Sau khi đã chép) thôi dùng Google Sheet cho từ vựng

Sau bước 3, Sheet không còn ảnh hưởng tới chủ đề và từ vựng. Bạn có thể giữ tab `TruyenTin`
và biến `SHEET_RELAY_CSV` trên Vercel cho phần Truyền tin; có thể xóa biến `SHEET_TOPICS_CSV`, `SHEET_WORDS_CSV`.

---

## Hướng dẫn cho giáo viên

**Thêm chủ đề:** bấm **Thêm chủ đề**, nhập tên tiếng Việt (mã chủ đề tự tạo), tên tiếng Nhật,
chọn trình độ, màu và biểu tượng, bấm **Tạo chủ đề**. Chủ đề mới là **bản nháp**.

**Thêm từ:** trong chủ đề, nhập ba ô: chữ Nhật, cách đọc (chỉ hiragana hoặc katakana), nghĩa tiếng Việt.
Bấm **Thêm từ** hoặc Enter. Từ chỉ viết bằng kana thì cách đọc tự điền. Từ mới là **bản nháp**.

Trang báo lỗi ngay dưới ô nhập khi: cách đọc có kanji hoặc chữ Latin, cách đọc không gõ được bằng romaji,
từ đã có trong chủ đề, hoặc thiếu ô.

**Cho học viên thấy:**
- bật **Xuất bản chủ đề** trong thông tin chủ đề, bấm **Lưu thay đổi**;
- bấm **Xuất bản N từ nháp**, hoặc bấm vào nhãn trạng thái của từng từ để đổi qua lại.

**Ẩn tạm** thì chuyển về bản nháp. **Xóa** thì không hoàn tác được.

**Thứ tự chủ đề** trên bản đồ tuyến: dùng mũi tên lên, xuống ở danh sách chủ đề.

Mỗi chủ đề cần ít nhất 1 từ đã xuất bản mới hiện cho học viên; nên có từ 4 từ trở lên để bài học có đủ đáp án nhiễu.

---

## Cách hoạt động (cho người lập trình)

- Bảng: `content_topics`, `content_words`, `content_editors` (xem `supabase/content.sql`). RLS: ai cũng đọc được
  mục đã xuất bản; chỉ email trong `content_editors` được ghi; chỉ admin thêm, bớt giáo viên.
- `src/main.jsx` gọi `loadRemoteContent()` (tối đa 4 giây) **trước** khi nạp các trang, nên `TOPICS` trong
  `src/data/vocab.js` đã là nội dung từ Supabase. Kho chưa có chủ đề nào, hoặc mất mạng và chưa có bản lưu
  trong trình duyệt, thì dùng nội dung trong code (cộng Google Sheet) như trước.
- Bản sao gần nhất lưu ở `localStorage` (`konnichiwa-content-v1`) để lần sau mở khi mất mạng vẫn có nội dung mới.
- Tiến độ học viên gắn với **mã chủ đề** và **chữ Nhật** của từ, nên trang không cho đổi mã chủ đề.
  Sửa chữ Nhật của một từ thì học viên mất dấu "đã học" của riêng từ đó.
