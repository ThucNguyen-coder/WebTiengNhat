import { useState } from 'react';
import { useProgress } from '../lib/store';
import { speak, hasJapaneseVoice, recognitionSupported } from '../lib/speech';
import './settings.css';

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="setting">
      <span>
        <strong>{label}</strong>
        {desc && <small>{desc}</small>}
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Choice({ label, value, options, onChange }) {
  return (
    <div className="setting">
      <span><strong>{label}</strong></span>
      <div className="seg" role="radiogroup" aria-label={label} style={{ margin: 0 }}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-selected={value === o.value} aria-checked={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const p = useProgress();
  const s = p.settings;
  const [confirm, setConfirm] = useState(false);
  const voice = hasJapaneseVoice();
  const mic = recognitionSupported();

  return (
    <div className="page settings">
      <div className="page-head">
        <div>
          <h1>Cài đặt</h1>
          <p>Tùy chỉnh cách hiển thị chữ Nhật, âm thanh và mục tiêu mỗi ngày.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Hiển thị</h2>
        <Toggle label="Furigana" desc="Hiện cách đọc nhỏ phía trên chữ Kanji" checked={s.furigana} onChange={(v) => p.updateSettings({ furigana: v })} />
        <Toggle label="Romaji" desc="Hiện phiên âm chữ Latin dưới từ" checked={s.romaji} onChange={(v) => p.updateSettings({ romaji: v })} />
        <Choice
          label="Giao diện"
          value={s.theme}
          onChange={(v) => p.updateSettings({ theme: v })}
          options={[
            { value: 'system', label: 'Theo máy' },
            { value: 'light', label: 'Sáng' },
            { value: 'dark', label: 'Tối' },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Âm thanh</h2>
        <Toggle label="Hiệu ứng âm thanh" desc="Tiếng khi trả lời đúng, sai và khi bắn" checked={s.sound} onChange={(v) => p.updateSettings({ sound: v })} />
        <Choice
          label="Tốc độ giọng đọc"
          value={s.rate}
          onChange={(v) => {
            p.updateSettings({ rate: v });
            speak('こんにちは、よろしくおねがいします', { rate: v });
          }}
          options={[
            { value: 0.7, label: 'Chậm' },
            { value: 0.95, label: 'Vừa' },
            { value: 1.15, label: 'Nhanh' },
          ]}
        />
        <ul className="env">
          <li className={voice ? 'ok' : 'warn'}>
            {voice
              ? 'Đã tìm thấy giọng đọc tiếng Nhật trên máy.'
              : 'Chưa thấy giọng đọc tiếng Nhật. Trên Windows: Cài đặt > Thời gian & ngôn ngữ > Giọng nói > thêm Japanese. Hoặc dùng Chrome/Edge.'}
          </li>
          <li className={mic ? 'ok' : 'warn'}>
            {mic
              ? 'Trình duyệt hỗ trợ nhận diện giọng nói cho phần Truyền tin.'
              : 'Trình duyệt chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge, hoặc gõ câu trả lời thay vì nói.'}
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>Mục tiêu mỗi ngày</h2>
        <Choice
          label="XP mỗi ngày"
          value={p.dailyGoal}
          onChange={p.setDailyGoal}
          options={[10, 20, 30, 50].map((v) => ({ value: v, label: `${v} XP` }))}
        />
      </section>

      <section className="panel">
        <h2>Dữ liệu</h2>
        <p className="muted" style={{ marginBottom: 12 }}>Tiến độ được lưu trên trình duyệt này.</p>
        {confirm ? (
          <div className="danger-row">
            <span>Xóa toàn bộ XP, chuỗi ngày và bài đã học?</span>
            <button className="btn btn--shu btn--sm" onClick={() => { p.reset(); setConfirm(false); }}>Xóa tiến độ</button>
            <button className="btn btn--sm" onClick={() => setConfirm(false)}>Giữ lại</button>
          </div>
        ) : (
          <button className="btn btn--sm" onClick={() => setConfirm(true)}>Xóa tiến độ</button>
        )}
      </section>
    </div>
  );
}
