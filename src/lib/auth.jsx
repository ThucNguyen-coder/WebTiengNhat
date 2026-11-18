import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, authEnabled } from './supabase';

const AuthCtx = createContext({ enabled: false, user: null, loading: false });

// Remove ?code=... / ?error=... left in the address bar after the Google redirect.
function cleanAuthParams() {
  const u = new URL(window.location.href);
  const had = ['code', 'error', 'error_code', 'error_description', 'state'].some((k) => u.searchParams.has(k));
  if (!had) return;
  ['code', 'error', 'error_code', 'error_description', 'state'].forEach((k) => u.searchParams.delete(k));
  window.history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || '#/'));
}

function readRedirectError() {
  const u = new URL(window.location.href);
  const code = u.searchParams.get('error') || '';
  const desc = u.searchParams.get('error_description') || code;
  if (!desc) return '';
  if (code === 'access_denied' || /access.denied|not.*allowed|test user/i.test(desc)) {
    return 'Tài khoản Google này chưa được mời dùng thử. Hãy nhờ quản trị viên thêm email của bạn vào danh sách người thử.';
  }
  return `Đăng nhập không thành công: ${desc}`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authEnabled);
  const [error, setError] = useState(() => (authEnabled ? readRedirectError() : ''));

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(`Không khôi phục được phiên đăng nhập: ${err.message}`);
      setSession(data?.session ?? null);
      setLoading(false);
      cleanAuthParams();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      if (s) cleanAuthParams();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (err) setError(`Không mở được trang đăng nhập Google: ${err.message}`);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: err } = await supabase.auth.signOut();
    if (err) setError(`Đăng xuất không thành công: ${err.message}`);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return false;
    const { error: err } = await supabase.rpc('delete_my_account');
    if (err) {
      setError(`Chưa xóa được tài khoản: ${err.message}`);
      return false;
    }
    await supabase.auth.signOut();
    return true;
  }, []);

  const user = session?.user ?? null;
  const value = useMemo(
    () => ({
      enabled: authEnabled,
      loading,
      user,
      name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '',
      avatar: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '',
      error,
      clearError: () => setError(''),
      signInWithGoogle,
      signOut,
      deleteAccount,
    }),
    [loading, user, error, signInWithGoogle, signOut, deleteAccount],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
