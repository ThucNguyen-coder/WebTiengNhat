import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { myRole, explain } from './contentAdmin';

// May the signed-in person edit content? { loading, role: 'admin' | 'teacher' | null, error }
export function useEditorRole() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: !!user, role: null, error: '' });
  useEffect(() => {
    if (!user) { setState({ loading: false, role: null, error: '' }); return undefined; }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    myRole(user.email)
      .then((role) => alive && setState({ loading: false, role, error: '' }))
      .catch((e) => alive && setState({ loading: false, role: null, error: explain(e) }));
    return () => { alive = false; };
  }, [user]);
  return state;
}
