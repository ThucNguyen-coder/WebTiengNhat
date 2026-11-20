# Trang "Quản lý nội dung"

Giáo viên đăng nhập bằng Google, vào **Cài đặt > Quản lý nội dung** (hoặc mở `#/noi-dung`)
để thêm, sửa, ẩn, xóa chủ đề, từ vựng (tab **Chủ đề & từ vựng**) và tình huống Truyền tin (tab **Truyền tin**).
Lưu xong là xong: không cần Google Sheet, không cần Vercel.

Học viên thấy nội dung mới ở lần **mở hoặc tải lại web** tiếp theo. Chỉ mục **Đã xuất bản** mới hiện cho học viên.

---

## Cài đặt lần đầu (người quản trị làm, khoảng 5 phút)

### 1. Tạo bảng trên Supabase

1. Mở Supabase > dự án Konnichiwa > **SQL Editor** > **New query**.
2. Mở tệp `supabase/content.sql` trong dự án, copy **toàn bộ**, dán vào, bấm **Run**.
   Chạy lại nhiều lần vẫn an toàn.
3. Làm tương tự với tệp `supabase/relay.sql` (bảng cho Truyền tin). Phải chạy **sau** `content.sql`.

> Đã chạy `content.sql` từ trước? Chỉ cần chạy thêm `supabase/relay.sql` (New query > dán toàn bộ > Run).

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
4. Mở tab **Truyền tin**, bấm **Chép 23 tình huống** (cũng ở trạng thái Đã xuất bản).
5. Tải lại trang. Từ giờ web lấy nội dung từ kho này.

### 4. Thêm giáo viên

Ở cuối trang quản lý, mục **Giáo viên**: nhập email Google của giáo viên, bấm **Thêm**.

Khi Google đăng nhập còn ở chế độ thử nghiệm, email đó cũng phải có trong
Google Cloud > **Audience** > **Test users**, nếu không giáo viên sẽ không đăng nhập được.

### 5. (Sau khi đã chép) thôi dùng Google Sheet

Sau bước 3, Sheet không còn ảnh hưởng tới chủ đề, từ vựng và Truyền tin. Có thể xóa các biến
`SHEET_TOPICS_CSV`, `SHEET_WORDS_CSV`, `SHEET_RELAY_CSV` trên Vercel.
(Nếu kho Truyền tin trên máy chủ chưa có tình huống nào đã xuất bản, web vẫn dùng tình huống trong code và Sheet.)

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

### Truyền tin

Mở tab **Truyền tin**. Danh sách xếp theo bậc (Bậc 1 Nhập môn, Bậc 2 Làm quen, Bậc 3 Thử thách);
mũi tên lên, xuống đổi thứ tự trong cùng bậc. Nhãn đỏ **N lỗi** nghĩa là tình huống còn chỗ cần sửa.

**Thêm tình huống:** bấm **Thêm tình huống**, rồi điền từ trên xuống:

1. **Thông tin:** tên (mã tự tạo), nơi diễn ra, trình độ, bậc.
   - Bậc 1: học viên ghép thẻ từ. Mỗi lượt phải có thẻ từ.
   - Bậc 2: học viên điền ý chính vào chỗ trống. Bậc 3: học viên tự nói hoặc gõ.
   - "Để web tự xếp bậc": lời nhắn ngắn ở N5 vào Bậc 2, còn lại Bậc 3.
2. **Nhân vật** (ít nhất 2): tên tiếng Nhật, cách đọc (chỉ hiragana/katakana), vai trò tiếng Việt,
   chữ hiện trên hình tròn (để trống thì lấy chữ đầu của tên), màu.
3. **Mỗi lượt nhắn:** chọn người nhờ nhắn và người nhận, rồi điền:
   - **Lời nhắn**: câu học viên nghe (tiếng Nhật, cách đọc, nghĩa);
   - **Câu mẫu**: câu học viên nên nói lại với người nhận;
   - **Ý chính**: mỗi ý gồm nhãn (Khi nào, Ở đâu…), nghĩa, và các cách viết được chấp nhận cách nhau bằng dấu phẩy
     (ví dụ `三時, 3時, さんじ`). Câu mẫu phải chứa ít nhất một cách viết của mỗi ý;
   - **Thẻ từ** (Bậc 1): viết lại câu mẫu, đặt `/` giữa các thẻ, ví dụ `お兄ちゃん / ごはん / だよ`.
     Thẻ có kanji thì nhập thêm cách đọc. Thẻ nhiễu là các thẻ sai để học viên chọn lọc (không bắt buộc).
     Phần xem trước cho biết các thẻ ghép lại có đúng câu mẫu không.
   Bấm **Thêm lượt nhắn** để thêm lượt (lượt mới tự đổi chiều người nhắn, người nhận).

**Lưu:** **Lưu bản nháp** lưu được cả khi chưa điền xong. **Xuất bản** chỉ bấm được khi không còn lỗi;
trang liệt kê các chỗ cần sửa và báo chữ đỏ ngay dưới ô. Tình huống đã xuất bản: **Lưu thay đổi**,
hoặc **Chuyển về bản nháp** để ẩn tạm. **Xóa tình huống** không hoàn tác được.

Không đổi được mã tình huống sau khi tạo (tiến độ, tem của học viên gắn với mã này).

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
- Truyền tin: bảng `content_relay` (xem `supabase/relay.sql`), RLS giống `content_topics`. Mỗi dòng có
  `title`, `place`, `level`, `tier` (1/2/3 hoặc trống = tự xếp bằng `deriveTier`) và `body` jsonb
  `{ cast, steps }` đúng dạng của `src/data/relay.js`. `loadRemoteContent()` nạp tình huống đã xuất bản cùng lúc
  với chủ đề (cùng thời hạn 4 giây, bản lưu `konnichiwa-relay-v1`); `ALL_SCENARIOS` trong `src/lib/relayTiers.js`
  dùng chúng khi có ít nhất một tình huống, nếu không thì dùng code + Google Sheet (`CODE_SCENARIOS`).
  Dòng nào không chơi được (thiếu nhân vật, thiếu ý chính…) bị bỏ qua; Bậc 1 thiếu thẻ từ thì chuyển sang Bậc 2.
- Các quy tắc kiểm tra (`scenarioProblems`, `readingProblem`, `tilesMatch`…) nằm trong `src/data/sheetFormat.js`,
  dùng chung với bước nhập Google Sheet.
