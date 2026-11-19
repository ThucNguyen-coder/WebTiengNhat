import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUp, ArrowDown, Plus, PencilSimple, Trash, Check, X, Eye, EyeSlash,
  DownloadSimple, UserPlus, Star, Info,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { authEnabled } from '../lib/supabase';
import { GoogleButton } from '../components/Account';
import { TOPIC_ICONS } from '../components/topicIcons';
import { TONES, ICONS, wordProblem, slugify } from '../data/sheetFormat';
import { isKana } from '../lib/kana';
import { CODE_TOPICS, CONTENT_SOURCE } from '../data/vocab';
import * as api from '../lib/contentAdmin';
import { useEditorRole } from '../lib/useEditorRole';
import './admin.css';

const TONE_NAMES = { shu: 'Đỏ son', ai: 'Xanh chàm', matcha: 'Xanh trà', yamabuki: 'Vàng', sakura: 'Hồng' };
const LEVELS = ['N5', 'N4', 'N3'];

function StatusChip({ status }) {
  return status === 'published'
    ? <span className="ad-chip ad-chip--on"><Eye size={14} weight="bold" aria-hidden="true" />Đã xuất bản</span>
    : <span className="ad-chip"><EyeSlash size={14} weight="bold" aria-hidden="true" />Bản nháp</span>;
}

function Gate({ title, children }) {
  return (
    <div className="page ad">
      <div className="page-head"><div><h1>Quản lý nội dung</h1></div></div>
      <section className="panel ad-gate">
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function ContentAdmin() {
  const { enabled, user, loading } = useAuth();
  const role = useEditorRole();
  if (!authEnabled || !enabled) {
    return <Gate title="Chưa kết nối máy chủ"><p className="muted">Trang này cần Supabase. Bản web hiện tại chưa có biến VITE_SUPABASE_URL.</p></Gate>;
  }
  if (loading || role.loading) return <Gate title="Đang kiểm tra tài khoản…"><p className="muted">Chờ một chút.</p></Gate>;
  if (!user) {
    return (
      <Gate title="Đăng nhập để quản lý nội dung">
        <p className="muted">Dùng tài khoản Google đã được thêm vào danh sách giáo viên.</p>
        <GoogleButton />
      </Gate>
    );
  }
  if (role.error) return <Gate title="Không mở được trang"><p className="ad-error">{role.error}</p></Gate>;
  if (!role.role) {
    return (
      <Gate title="Tài khoản này chưa có quyền">
        <p className="muted">
          Bạn đang đăng nhập bằng <strong>{user.email}</strong>. Hãy nhờ quản trị viên thêm email này vào danh sách giáo viên,
          rồi tải lại trang.
        </p>
      </Gate>
    );
  }
  return <Editor role={role.role} email={user.email} />;
}

/* ================= main editor ================= */

function Editor({ role, email }) {
  const [data, setData] = useState(null); // { topics, words }
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [view, setView] = useState({ name: 'list' }); // list | topic {id} | new
  const noteTimer = useRef(0);

  const flash = useCallback((text) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 3500);
  }, []);

  const reload = useCallback(async () => {
    try {
      setData(await api.loadAll());
      setError('');
    } catch (e) {
      setError(api.explain(e));
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Runs a write, shows the problem if any, reloads on success.
  const run = useCallback(async (fn, done) => {
    try {
      const out = await fn();
      await reload();
      if (done) flash(done);
      return out ?? true;
    } catch (e) {
      setError(api.explain(e));
      return false;
    }
  }, [reload, flash]);

  if (!data) {
    return (
      <div className="page ad">
        <Head role={role} />
        {error ? <p className="ad-error" role="alert">{error}</p> : <p className="muted">Đang tải nội dung…</p>}
      </div>
    );
  }

  const topic = view.name === 'topic' ? data.topics.find((t) => t.id === view.id) : null;

  return (
    <div className="page ad">
      <Head role={role} />
      {error && (
        <p className="ad-error" role="alert">
          {error}
          <button className="ad-link" onClick={() => setError('')}>Đóng</button>
        </p>
      )}
      <p className="ad-note" role="status" aria-live="polite">{note}</p>

      {view.name === 'list' && (
        <>
          {data.topics.length === 0 && <ImportPanel role={role} run={run} />}
          <TopicList data={data} run={run} open={(id) => setView({ name: 'topic', id })} add={() => setView({ name: 'new' })} />
          {role === 'admin' && <TeachersPanel email={email} flash={flash} setError={setError} />}
        </>
      )}

      {view.name === 'new' && (
        <>
          <BackLink onClick={() => setView({ name: 'list' })} />
          <TopicForm
            existingIds={data.topics.map((t) => t.id)}
            nextOrder={(Math.max(0, ...data.topics.map((t) => t.sort_order)) || 0) + 10}
            onSave={async (fields) => {
              const ok = await run(() => api.insertTopic(fields), `Đã tạo chủ đề "${fields.title}". Giờ thêm từ vựng nhé.`);
              if (ok) setView({ name: 'topic', id: fields.id });
            }}
          />
        </>
      )}

      {view.name === 'topic' && topic && (
        <>
          <BackLink onClick={() => setView({ name: 'list' })} />
          <TopicForm
            key={topic.id}
            topic={topic}
            onSave={(fields) => run(() => api.updateTopic(topic.id, fields), 'Đã lưu chủ đề.')}
            onDelete={async () => {
              const ok = await run(() => api.deleteTopic(topic.id), `Đã xóa chủ đề "${topic.title}".`);
              if (ok) setView({ name: 'list' });
            }}
            wordCount={data.words.filter((w) => w.topic_id === topic.id).length}
          />
          <WordsPanel topic={topic} words={data.words.filter((w) => w.topic_id === topic.id)} run={run} />
        </>
      )}
      {view.name === 'topic' && !topic && <BackLink onClick={() => setView({ name: 'list' })} />}
    </div>
  );
}

function Head({ role }) {
  return (
    <div className="page-head">
      <div>
        <h1>Quản lý nội dung</h1>
        <p>
          Thêm, sửa chủ đề và từ vựng. Chỉ mục <strong>Đã xuất bản</strong> mới hiện cho học viên,
          ở lần mở hoặc tải lại web tiếp theo.
        </p>
      </div>
      <span className="ad-chip ad-chip--role">{role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</span>
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <button className="btn btn--ghost btn--sm ad-back" onClick={onClick}>
      <ArrowLeft size={18} weight="bold" aria-hidden="true" />Tất cả chủ đề
    </button>
  );
}

/* ---------- first-time import ---------- */

function ImportPanel({ role, run }) {
  const [busy, setBusy] = useState(false);
  const words = CODE_TOPICS.reduce((n, t) => n + t.words.length, 0);
  return (
    <section className="panel ad-import">
      <h2><DownloadSimple size={22} weight="bold" aria-hidden="true" /> Bắt đầu: chép nội dung có sẵn</h2>
      <p className="muted">
        Kho nội dung trên máy chủ đang trống, nên web vẫn dùng nội dung viết sẵn ({CODE_TOPICS.length} chủ đề, {words} từ).
        Chép một lần vào đây để giáo viên sửa được. Học viên vẫn thấy y như cũ.
      </p>
      {role === 'admin' ? (
        <button
          className="btn btn--matcha"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await run(() => api.importTopics(CODE_TOPICS), `Đã chép ${CODE_TOPICS.length} chủ đề và ${words} từ.`);
            setBusy(false);
          }}
        >
          {busy ? 'Đang chép…' : `Chép ${CODE_TOPICS.length} chủ đề, ${words} từ`}
        </button>
      ) : (
        <p className="muted">Việc này chỉ quản trị viên làm được.</p>
      )}
    </section>
  );
}

/* ---------- topic list ---------- */

function TopicList({ data, run, open, add }) {
  const counts = useMemo(() => {
    const m = {};
    data.words.forEach((w) => {
      const c = (m[w.topic_id] ||= { all: 0, draft: 0 });
      c.all += 1;
      if (w.status !== 'published') c.draft += 1;
    });
    return m;
  }, [data.words]);
  const [busy, setBusy] = useState(false);
  const move = async (i, d) => {
    if (!data.topics[i + d]) return;
    const next = [...data.topics];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setBusy(true);
    await run(() => api.reorderTopics(next));
    setBusy(false);
  };

  return (
    <section className="panel">
      <div className="ad-row-head">
        <h2>Chủ đề ({data.topics.length})</h2>
        <button className="btn btn--shu btn--sm" onClick={add}><Plus size={18} weight="bold" aria-hidden="true" />Thêm chủ đề</button>
      </div>
      {CONTENT_SOURCE === 'code' && data.topics.length > 0 && (
        <p className="ad-hint"><Info size={16} weight="bold" aria-hidden="true" />Tải lại trang để web dùng nội dung trên máy chủ.</p>
      )}
      {data.topics.length === 0 ? (
        <p className="muted">Chưa có chủ đề nào.</p>
      ) : (
        <ul className="ad-topics">
          {data.topics.map((t, i) => {
            const Icon = TOPIC_ICONS[t.icon] || Star;
            const c = counts[t.id] || { all: 0, draft: 0 };
            return (
              <li key={t.id} className="ad-topic">
                <button className="ad-topic-main" onClick={() => open(t.id)}>
                  <span className={`ad-icon tone-${t.color}`}><Icon size={22} weight="fill" aria-hidden="true" /></span>
                  <span className="ad-topic-text">
                    <strong>{t.title}</strong>
                    <small>{t.jp_title} · {t.level} · {c.all} từ{c.draft ? `, ${c.draft} nháp` : ''}<span className="ad-mobile-only">{t.status === 'published' ? '' : ' · Chủ đề nháp'}</span></small>
                  </span>
                  <StatusChip status={t.status} />
                </button>
                <span className="ad-order">
                  <button className="icon-btn" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Đưa ${t.title} lên trên`}>
                    <ArrowUp size={18} weight="bold" aria-hidden="true" />
                  </button>
                  <button className="icon-btn" disabled={busy || i === data.topics.length - 1} onClick={() => move(i, 1)} aria-label={`Đưa ${t.title} xuống dưới`}>
                    <ArrowDown size={18} weight="bold" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- topic form ---------- */

function TopicForm({ topic, existingIds = [], nextOrder = 10, onSave, onDelete, wordCount = 0 }) {
  const isNew = !topic;
  const [f, setF] = useState(() => ({
    title: topic?.title || '',
    jp_title: topic?.jp_title || '',
    id: topic?.id || '',
    level: topic?.level || 'N5',
    color: topic?.color || 'ai',
    icon: topic?.icon || 'Sparkle',
    status: topic?.status || 'draft',
  }));
  const [idTouched, setIdTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, ...(k === 'title' && isNew && !idTouched ? { id: slugify(v) } : {}) }));

  const errors = {};
  if (!f.title.trim()) errors.title = 'Cần nhập tên chủ đề';
  else if (f.title.trim().length > 60) errors.title = 'Tên quá dài (tối đa 60 ký tự)';
  if (f.jp_title.length > 40) errors.jp_title = 'Tối đa 40 ký tự';
  if (isNew) {
    if (!f.id) errors.id = 'Cần mã chủ đề';
    else if (!/^[a-z0-9-]{1,40}$/.test(f.id)) errors.id = 'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang';
    else if (existingIds.includes(f.id)) errors.id = 'Mã này đã có chủ đề khác dùng';
  }
  const invalid = Object.keys(errors).length > 0;
  const show = (k) => (tried || f[k]) && errors[k];
  const dirty = isNew || ['title', 'jp_title', 'level', 'color', 'icon', 'status'].some((k) => f[k] !== topic[k]);

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    setBusy(true);
    const fields = { title: f.title.trim(), jp_title: f.jp_title.trim(), level: f.level, color: f.color, icon: f.icon, status: f.status };
    await onSave(isNew ? { ...fields, id: f.id, sort_order: nextOrder } : fields);
    setBusy(false);
  };

  return (
    <form className="panel ad-form" onSubmit={submit} noValidate>
      <h2>{isNew ? 'Chủ đề mới' : 'Thông tin chủ đề'}</h2>
      <div className="ad-grid">
        <Field label="Tên tiếng Việt" error={show('title')} hint="Ví dụ: Con vật">
          {(p) => <input {...p} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={60} autoFocus={isNew} />}
        </Field>
        <Field label="Tên tiếng Nhật" error={show('jp_title')} hint="Ví dụ: どうぶつ (không bắt buộc)">
          {(p) => <input {...p} lang="ja" value={f.jp_title} onChange={(e) => set('jp_title', e.target.value)} maxLength={40} />}
        </Field>
        <Field
          label="Mã chủ đề"
          error={isNew && show('id')}
          hint={isNew ? 'Tự tạo từ tên. Không đổi được sau khi tạo.' : 'Không đổi được (tiến độ học viên gắn với mã này).'}
        >
          {(p) => (
            <input
              {...p}
              value={f.id}
              readOnly={!isNew}
              onChange={(e) => { setIdTouched(true); set('id', e.target.value.toLowerCase()); }}
              maxLength={40}
            />
          )}
        </Field>
        <Field label="Trình độ">
          {(p) => (
            <select {...p} value={f.level} onChange={(e) => set('level', e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </Field>
      </div>

      <fieldset className="ad-fieldset">
        <legend>Màu tuyến</legend>
        <div className="ad-swatches">
          {TONES.map((t) => (
            <label key={t} className={`ad-swatch tone-${t}`} title={TONE_NAMES[t]}>
              <input type="radio" name="color" value={t} checked={f.color === t} onChange={() => set('color', t)} />
              <span className="sr-only">{TONE_NAMES[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="ad-fieldset">
        <legend>Biểu tượng</legend>
        <div className="ad-icons">
          {ICONS.map((name) => {
            const Icon = TOPIC_ICONS[name] || Star;
            return (
              <label key={name} className={`ad-iconpick tone-${f.color}`} title={name}>
                <input type="radio" name="icon" value={name} checked={f.icon === name} onChange={() => set('icon', name)} />
                <Icon size={22} weight="fill" aria-hidden="true" />
                <span className="sr-only">{name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="ad-publish">
        <input type="checkbox" className="switch" checked={f.status === 'published'} onChange={(e) => set('status', e.target.checked ? 'published' : 'draft')} />
        <span>
          <strong>Xuất bản chủ đề</strong>
          <small>Tắt thì học viên không thấy chủ đề này (kể cả các từ bên trong).</small>
        </span>
      </label>

      <div className="ad-actions">
        <button className="btn btn--ai" type="submit" disabled={busy || !dirty}>
          <Check size={18} weight="bold" aria-hidden="true" />{busy ? 'Đang lưu…' : isNew ? 'Tạo chủ đề' : 'Lưu thay đổi'}
        </button>
        {!isNew && !confirmDel && (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmDel(true)}>
            <Trash size={18} weight="bold" aria-hidden="true" />Xóa chủ đề
          </button>
        )}
      </div>
      {confirmDel && (
        <div className="ad-confirm" role="alertdialog" aria-label="Xác nhận xóa chủ đề">
          <p>
            Xóa hẳn chủ đề <strong>{topic.title}</strong> và {wordCount} từ bên trong? Không hoàn tác được.
            Nếu chỉ muốn ẩn, hãy tắt "Xuất bản chủ đề".
          </p>
          <div className="ad-actions">
            <button type="button" className="btn btn--shu btn--sm" onClick={onDelete}>Xóa hẳn</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDel(false)}>Thôi</button>
          </div>
        </div>
      )}
    </form>
  );
}

let fieldSeq = 0;
function Field({ label, hint, error, children }) {
  const [id] = useState(() => `adf-${++fieldSeq}`);
  return (
    <div className={`ad-field${error ? ' is-bad' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': `${id}-msg` })}
      <small id={`${id}-msg`} className={error ? 'ad-bad' : 'muted'}>{error || hint || ''}</small>
    </div>
  );
}

/* ---------- words ---------- */

function WordsPanel({ topic, words, run }) {
  const drafts = words.filter((w) => w.status !== 'published');
  const [editing, setEditing] = useState(null);
  const nextOrder = (Math.max(0, ...words.map((w) => w.sort_order)) || 0) + 10;
  const taken = (jp, exceptId) => words.some((w) => w.jp === jp.trim() && w.id !== exceptId);

  return (
    <section className="panel">
      <div className="ad-row-head">
        <h2>Từ vựng ({words.length})</h2>
        {drafts.length > 0 && (
          <button className="btn btn--matcha btn--sm" onClick={() => run(() => api.publishWords(drafts.map((w) => w.id)), `Đã xuất bản ${drafts.length} từ.`)}>
            <Eye size={18} weight="bold" aria-hidden="true" />Xuất bản {drafts.length} từ nháp
          </button>
        )}
      </div>
      {topic.status !== 'published' && (
        <p className="ad-hint"><Info size={16} weight="bold" aria-hidden="true" />Chủ đề đang là bản nháp nên học viên chưa thấy các từ này.</p>
      )}

      <WordEditor
        submitLabel="Thêm từ"
        taken={(jp) => taken(jp)}
        onSave={(w) => run(() => api.insertWord({ ...w, topic_id: topic.id, sort_order: nextOrder, status: 'draft' }), `Đã thêm "${w.jp}" (bản nháp).`)}
      />

      {words.length === 0 ? (
        <p className="muted">Chưa có từ nào. Thêm từ đầu tiên ở trên.</p>
      ) : (
        <ul className="ad-words">
          {words.map((w) => (
            <li key={w.id} className="ad-word">
              {editing === w.id ? (
                <WordEditor
                  word={w}
                  submitLabel="Lưu"
                  taken={(jp) => taken(jp, w.id)}
                  onCancel={() => setEditing(null)}
                  onSave={async (fields) => {
                    const ok = await run(() => api.updateWord(w.id, fields), 'Đã lưu từ.');
                    if (ok) setEditing(null);
                    return ok;
                  }}
                />
              ) : (
                <WordRow
                  w={w}
                  onEdit={() => setEditing(w.id)}
                  onToggle={() => run(() => api.updateWord(w.id, { status: w.status === 'published' ? 'draft' : 'published' }))}
                  onDelete={() => run(() => api.deleteWord(w.id), `Đã xóa "${w.jp}".`)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WordRow({ w, onEdit, onToggle, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="ad-word-row">
      <span className="ad-word-jp" lang="ja">
        <strong>{w.jp}</strong>
        {w.kana !== w.jp && <small>{w.kana}</small>}
      </span>
      <span className="ad-word-vi">{w.vi}</span>
      <button className="ad-chip-btn" onClick={onToggle} title="Bấm để đổi">
        <StatusChip status={w.status} />
      </button>
      {confirm ? (
        <span className="ad-word-tools">
          <button className="btn btn--shu btn--sm" onClick={onDelete}>Xóa</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>Thôi</button>
        </span>
      ) : (
        <span className="ad-word-tools">
          <button className="icon-btn" onClick={onEdit} aria-label={`Sửa ${w.jp}`}><PencilSimple size={18} weight="bold" aria-hidden="true" /></button>
          <button className="icon-btn" onClick={() => setConfirm(true)} aria-label={`Xóa ${w.jp}`}><Trash size={18} weight="bold" aria-hidden="true" /></button>
        </span>
      )}
    </div>
  );
}

function WordEditor({ word, submitLabel, taken, onSave, onCancel }) {
  const [f, setF] = useState({ jp: word?.jp || '', kana: word?.kana || '', vi: word?.vi || '' });
  const jpRef = useRef(null);
  const [kanaTouched, setKanaTouched] = useState(!!word);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setF((s) => {
    const next = { ...s, [k]: v };
    // a word written only in kana reads the same: fill the reading for the teacher
    if (k === 'jp' && !kanaTouched) next.kana = isKana(v.trim()) ? v.trim() : '';
    return next;
  });

  const dup = f.jp.trim() && taken(f.jp);
  const problem = dup ? { field: 'jp', msg: `Chủ đề này đã có từ "${f.jp.trim()}"` } : wordProblem(f);
  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    setBusy(true);
    const ok = await onSave({ jp: f.jp.trim(), kana: f.kana.trim(), vi: f.vi.trim() });
    setBusy(false);
    if (ok && !word) {
      // ready for the next word right away
      setF({ jp: '', kana: '', vi: '' }); setKanaTouched(false); setTried(false);
      jpRef.current?.focus();
    }
  };

  // Missing fields are reported after pressing the button; wrong readings and duplicates right while typing.
  const live = problem && ((problem.field === 'kana' && f.kana) || dup || (problem.field === 'vi' && f.vi));
  const msg = problem && (tried || live) ? problem.msg : '';

  return (
    <form className={`ad-word-form${word ? ' is-edit' : ''}`} onSubmit={submit} noValidate>
      <input
        ref={jpRef} autoFocus={!!word}
        lang="ja" placeholder="Chữ Nhật (猫)" aria-label="Chữ Nhật" value={f.jp} maxLength={40}
        aria-invalid={!!msg && problem.field === 'jp'} onChange={(e) => set('jp', e.target.value)}
      />
      <input
        lang="ja" placeholder="Cách đọc (ねこ)" aria-label="Cách đọc bằng hiragana hoặc katakana" value={f.kana} maxLength={40}
        aria-invalid={!!msg && problem.field === 'kana'} onChange={(e) => { setKanaTouched(true); set('kana', e.target.value); }}
      />
      <input
        placeholder="Nghĩa (con mèo)" aria-label="Nghĩa tiếng Việt" value={f.vi} maxLength={80}
        aria-invalid={!!msg && problem.field === 'vi'} onChange={(e) => set('vi', e.target.value)}
      />
      <span className="ad-word-tools">
        <button className="btn btn--ai btn--sm" type="submit" disabled={busy}>
          {word ? <Check size={18} weight="bold" aria-hidden="true" /> : <Plus size={18} weight="bold" aria-hidden="true" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button className="icon-btn" type="button" onClick={onCancel} aria-label="Hủy sửa"><X size={18} weight="bold" aria-hidden="true" /></button>
        )}
      </span>
      <small className="ad-bad ad-word-msg" role={msg ? 'alert' : undefined}>{msg}</small>
    </form>
  );
}

/* ---------- teachers (admin only) ---------- */

function TeachersPanel({ email, flash, setError }) {
  const [list, setList] = useState(null);
  const [value, setValue] = useState('');
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState('');

  const load = useCallback(() => api.listEditors().then(setList).catch((e) => setError(api.explain(e))), [setError]);
  useEffect(() => { load(); }, [load]);

  const clean = value.trim().toLowerCase();
  let problem = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) problem = 'Email chưa đúng dạng, ví dụ: co.lan@gmail.com';
  else if (list?.some((x) => x.email === clean)) problem = 'Email này đã có trong danh sách';

  const add = async (e) => {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    try {
      await api.addTeacher(clean, email);
      setValue(''); setTried(false);
      flash(`Đã thêm giáo viên ${clean}.`);
      load();
    } catch (err) { setError(api.explain(err)); }
  };

  return (
    <section className="panel">
      <h2>Giáo viên</h2>
      <p className="muted">
        Người trong danh sách đăng nhập bằng Google đúng email này là sửa được nội dung. Email cũng phải có trong danh sách
        người dùng thử của Google (Google Cloud &gt; Audience &gt; Test users) cho tới khi web mở công khai.
      </p>
      <form className="ad-teacher-form" onSubmit={add} noValidate>
        <input
          type="email" inputMode="email" placeholder="email.giao.vien@gmail.com" aria-label="Email giáo viên"
          value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={tried && !!problem}
        />
        <button className="btn btn--ai btn--sm" type="submit"><UserPlus size={18} weight="bold" aria-hidden="true" />Thêm</button>
        <small className="ad-bad">{(tried || value.includes('@')) && value ? problem : ''}</small>
      </form>
      <ul className="ad-teachers">
        {(list || []).map((x) => (
          <li key={x.email}>
            <span>{x.email}</span>
            <span className="ad-chip">{x.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</span>
            {x.role === 'teacher' && (confirm === x.email ? (
              <span className="ad-word-tools">
                <button className="btn btn--shu btn--sm" onClick={async () => {
                  try { await api.removeTeacher(x.email); flash(`Đã bỏ quyền của ${x.email}.`); setConfirm(''); load(); } catch (err) { setError(api.explain(err)); }
                }}>Bỏ quyền</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirm('')}>Thôi</button>
              </span>
            ) : (
              <button className="icon-btn" onClick={() => setConfirm(x.email)} aria-label={`Bỏ quyền ${x.email}`}><Trash size={18} weight="bold" aria-hidden="true" /></button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
