/**
 * Konnichiwa: nút "Cập nhật web" trong Google Sheet.
 *
 * Cách cài (một lần):
 * 1. Trong Google Sheet: Tiện ích mở rộng (Extensions) > Apps Script.
 * 2. Xóa code mẫu, dán toàn bộ tệp này vào, bấm Lưu.
 * 3. Bấm biểu tượng bánh răng "Cài đặt dự án" (Project Settings) > "Thuộc tính tập lệnh"
 *    (Script properties) > Thêm thuộc tính:
 *      Tên:  VERCEL_DEPLOY_HOOK
 *      Giá trị: link Deploy Hook lấy từ Vercel (Settings > Git > Deploy Hooks)
 *    Link này để trong thuộc tính, không dán thẳng vào code, để người chỉ xem code không thấy.
 * 4. Tải lại Google Sheet. Trên thanh menu sẽ có mục "Konnichiwa" > "Cập nhật web".
 *    Lần đầu bấm, Google sẽ hỏi quyền cho tập lệnh gọi ra ngoài: chọn tài khoản và cho phép.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Konnichiwa')
    .addItem('Cập nhật web', 'updateWebsite')
    .addToUi();
}

function updateWebsite() {
  var ui = SpreadsheetApp.getUi();
  var hook = PropertiesService.getScriptProperties().getProperty('VERCEL_DEPLOY_HOOK');
  if (!hook) {
    ui.alert('Chưa có VERCEL_DEPLOY_HOOK trong Thuộc tính tập lệnh. Xem hướng dẫn ở đầu tệp.');
    return;
  }
  var res = UrlFetchApp.fetch(hook, { method: 'post', muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    ui.alert('Đã gửi yêu cầu cập nhật. Khoảng 1–2 phút nữa nội dung mới sẽ lên web.\n\n' +
      'Dòng nào bị lỗi sẽ được bỏ qua, xem chi tiết trong nhật ký build trên Vercel.');
  } else {
    ui.alert('Không gửi được yêu cầu (mã ' + code + '). Kiểm tra lại link Deploy Hook.');
  }
}
