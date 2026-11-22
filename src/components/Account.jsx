import { useState } from 'react';
import { GoogleLogo, SignOut, UserCircle, CloudCheck, CloudArrowUp, CloudSlash, Warning } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { useProgress } from '../lib/store';
import './account.css';

export function Avatar({ size = 32 }) {
  const { avatar, name } = useAuth();
  const [broken, setBroken] = useState(false);
  if (avatar && !broken) {
    return (
      <img
        className="acc-avatar"
        src={avatar}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="acc-avatar acc-avatar--letter" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function GoogleButton({ block = false, small = false, label = 'Đăng nhập bằng Google' }) {
  const { signInWithGoogle, loading } = useAuth();
  return (
    <button
      type="button"
      className={`btn acc-google${block ? ' btn--block' : ''}${small ? ' btn--sm' : ''}`}
      onClick={signInWithGoogle}
      disabled={loading}
    >
      <GoogleLogo size={small ? 18 : 20} weight="bold" aria-hidden="true" />
      {label}
    </button>
  );
}

export function SyncStatus() {
  const { sync } = useProgress();
  const map = {
    syncing: { Icon: CloudArrowUp, text: 'Đang lưu lên tài khoản…', cls: '' },
    synced: { Icon: CloudCheck, text: 'Tiến độ đã được lưu vào tài khoản', cls: 'is-ok' },
    error: { Icon: CloudSlash, text: 'Chưa lưu được, sẽ thử lại khi có thay đổi tiếp theo', cls: 'is-bad' },
    idle: { Icon: CloudArrowUp, text: 'Đang kết nối tài khoản…', cls: '' },
  };
  const m = map[sync.status] || map.idle;
  return (
    <p className={`acc-sync ${m.cls}`} role="status">
      <m.Icon size={18} weight="bold" aria-hidden="true" />
      <span>{m.text}</span>
    </p>
  );
}

// Compact block for the bottom of the sidebar.
export function SidebarAccount() {
  const { enabled, user, name, loading } = useAuth();
  if (!enabled || loading) return null;
  if (!user) {
    return (
      <div className="acc-side">
        <p className="acc-side-note">Đăng nhập để giữ tiến độ trên mọi thiết bị.</p>
        <GoogleButton block small label="Đăng nhập Google" />
      </div>
    );
  }
  return (
    <a className="acc-side acc-side--user" href="#/settings" aria-label={`Tài khoản: ${name}. Mở cài đặt tài khoản`}>
      <Avatar size={34} />
      <span className="acc-side-name">{name}</span>
    </a>
  );
}

// Icon for the phone top bar.
export function TopbarAccount() {
  const { enabled, user, loading } = useAuth();
  if (!enabled || loading) return null;
  return (
    <a className="icon-btn acc-top" href="#/settings" aria-label={user ? 'Tài khoản của bạn' : 'Đăng nhập'}>
      {user ? <Avatar size={28} /> : <UserCircle size={24} weight="bold" aria-hidden="true" />}
    </a>
  );
}

// Card on the home page asking guests to sign in.
export function SignInPrompt() {
  const { enabled, user, loading } = useAuth();
  if (!enabled || loading || user) return null;
  return (
    <div className="panel acc-prompt">
      <h3>Giữ tiến độ của bạn</h3>
      <p className="muted">Hiện tiến độ chỉ nằm trên trình duyệt này. Đăng nhập để học tiếp trên điện thoại hay máy khác.</p>
      <GoogleButton block small />
      <p className="muted acc-legal">
        Khi đăng nhập, bạn đồng ý với <a href="/dieu-khoan.html">Điều khoản</a> và <a href="/chinh-sach.html">Chính sách quyền riêng tư</a>.
      </p>
    </div>
  );
}

// Full account section for the Settings page.
export function AccountPanel() {
  const { enabled, user, name, error, clearError, signOut, deleteAccount, loading } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  return (
    <section className="panel acc-panel" id="account" aria-labelledby="acc-h">
      <h2 id="acc-h">Tài khoản</h2>
      {error && (
        <p className="acc-error" role="alert">
          <Warning size={18} weight="bold" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearError}>Đóng</button>
        </p>
      )}

      {loading ? (
        <p className="muted">Đang kiểm tra đăng nhập…</p>
      ) : !user ? (
        <>
          <p className="muted">
            Đăng nhập bằng Google để lưu tiến độ, dấu ga và tem thư vào tài khoản. Tiến độ bạn đang có trên trình duyệt này sẽ được giữ và chuyển lên tài khoản.
          </p>
          <GoogleButton />
          <p className="acc-note">Đăng nhập đang trong giai đoạn thử nghiệm: chỉ những tài khoản Google được mời mới dùng được.</p>
        </>
      ) : (
        <>
          <div className="acc-who">
            <Avatar size={48} />
            <div>
              <strong>{name}</strong>
              <SyncStatus />
            </div>
          </div>
          <p className="acc-note">Đăng xuất sẽ xóa tiến độ khỏi trình duyệt này (tiến độ vẫn còn trong tài khoản), để người khác dùng máy không thấy dữ liệu của bạn.</p>
          <div className="acc-actions">
            <button type="button" className="btn btn--sm" onClick={signOut}>
              <SignOut size={18} weight="bold" aria-hidden="true" /> Đăng xuất
            </button>
          </div>

          <div className="acc-danger">
            <h3>Xóa tài khoản</h3>
            <p className="muted">Xóa vĩnh viễn tài khoản và toàn bộ tiến độ đã lưu. Không thể hoàn tác.</p>
            {confirm ? (
              <div className="acc-actions">
                <span className="acc-confirm">Bạn chắc chắn muốn xóa vĩnh viễn?</span>
                <button
                  type="button"
                  className="btn btn--shu btn--sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await deleteAccount();
                    setBusy(false);
                    if (ok) setConfirm(false);
                  }}
                >
                  {busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setConfirm(false)} disabled={busy}>Giữ lại</button>
              </div>
            ) : (
              <button type="button" className="btn btn--sm" onClick={() => setConfirm(true)}>Xóa tài khoản</button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// Short-lived message after a failed Google redirect, shown anywhere in the app.
export function AuthToast() {
  const { error, clearError } = useAuth();
  if (!error) return null;
  return (
    <div className="toast acc-toast" role="alert">
      <span>{error}</span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={clearError}>Đóng</button>
    </div>
  );
}
