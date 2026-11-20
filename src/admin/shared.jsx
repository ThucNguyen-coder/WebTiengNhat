// Small pieces used by both tabs of the "Quản lý nội dung" page.
import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

export const TONE_NAMES = { shu: 'Đỏ son', ai: 'Xanh chàm', matcha: 'Xanh trà', yamabuki: 'Vàng', sakura: 'Hồng' };
export const LEVELS = ['N5', 'N4', 'N3'];

export function StatusChip({ status }) {
  return status === 'published'
    ? <span className="ad-chip ad-chip--on"><Eye size={14} weight="bold" aria-hidden="true" />Đã xuất bản</span>
    : <span className="ad-chip"><EyeSlash size={14} weight="bold" aria-hidden="true" />Bản nháp</span>;
}

// Label + control + one line under it (the hint, or the problem in red).
let fieldSeq = 0;
export function Field({ label, hint, error, className = '', children }) {
  const [id] = useState(() => `adf-${++fieldSeq}`);
  return (
    <div className={`ad-field${error ? ' is-bad' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': `${id}-msg` })}
      <small id={`${id}-msg`} className={error ? 'ad-bad' : 'muted'}>{error || hint || ''}</small>
    </div>
  );
}
