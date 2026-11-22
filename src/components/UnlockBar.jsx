import { useState } from 'react';
import { Lock, LockOpen } from '@phosphor-icons/react';
import './unlock.css';

// Thanh mở khóa ở trang Học. Mở khóa cần xác nhận một lần; khóa lại thì bấm là xong.
export default function UnlockBar({ unlocked, onChange }) {
  const [asking, setAsking] = useState(false);

  if (unlocked) {
    return (
      <section className="panel unlock is-on" aria-label="Đã mở khóa tất cả bài">
        <LockOpen size={28} weight="fill" aria-hidden="true" />
        <div className="unlock-text">
          <strong>Đã mở khóa tất cả bài</strong>
          <span className="muted">Bạn học được bất kỳ bài nào. Điểm và dấu ga chỉ tính khi bạn học xong bài đó.</span>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => onChange(false)}>
          <Lock size={18} weight="bold" aria-hidden="true" /> Khóa lại
        </button>
      </section>
    );
  }

  return (
    <section
      className="panel unlock"
      aria-label="Mở khóa bài học"
      onKeyDown={(e) => { if (e.key === "Escape") setAsking(false); }}
    >
      <LockOpen size={28} weight="fill" aria-hidden="true" />
      <div className="unlock-text">
        <strong>Đã biết tiếng Nhật? Muốn xem thử bài học?</strong>
        <span className="muted" aria-live="polite">
          {asking
            ? "Bạn sẽ học được bất kỳ bài nào, không cần đi theo thứ tự. Có thể khóa lại bất cứ lúc nào."
            : "Mở khóa để học ở trình độ cao hơn hoặc xem trước các bài."}
        </span>
      </div>
      {asking ? (
        <div className="unlock-actions">
          <button type="button" className="btn btn--ai btn--sm" autoFocus onClick={() => { onChange(true); setAsking(false); }}>
            Mở khóa
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAsking(false)}>Thôi</button>
        </div>
      ) : (
        <button type="button" className="btn btn--sm" onClick={() => setAsking(true)}>Mở khóa tất cả bài</button>
      )}
    </section>
  );
}
