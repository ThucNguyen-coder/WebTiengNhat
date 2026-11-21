// "Truyền tin" tab of the "Quản lý nội dung" page: list, create, edit, publish and delete
// relay scenarios stored in Supabase (table content_relay, see supabase/relay.sql).
// The checks are the same ones the Google Sheet import uses (data/sheetFormat.js).
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowUp, ArrowDown, Plus, Trash, Check, Eye, EyeSlash, DownloadSimple, Info,
  Warning, CheckCircle, XCircle, UserPlus, ArrowRight,
} from '@phosphor-icons/react';
import {
  TONES, slugify, scenarioProblems, splitList, parseTiles, sentenceKana, tilesMatch,
} from '../data/sheetFormat';
import { isKana, normalizeJa } from '../lib/kana';
import { CODE_SCENARIOS, RELAY_SOURCE, TIERS, deriveTier } from '../lib/relayTiers';
import { Word } from '../components/Bits';
import * as api from '../lib/contentAdmin';
import { StatusChip, Field, TONE_NAMES, LEVELS } from './shared';
import '../relay/relay.css';

const LABELS = ['Nhắn cho ai', 'Ai', 'Việc gì', 'Khi nào', 'Ở đâu', 'Cái gì', 'Bao nhiêu', 'Làm gì', 'Vì sao', 'Mang gì'];
const TIER_HELP = {
  1: 'Học viên ghép các thẻ từ thành câu. Mỗi lượt cần thẻ từ.',
  2: 'Học viên điền các ý chính vào chỗ trống trong câu mẫu.',
  3: 'Học viên tự nói hoặc gõ lại lời nhắn.',
  auto: 'Lời nhắn ngắn (tối đa 40 chữ) ở N5 vào Bậc 2, còn lại vào Bậc 3.',
};

/* ---------- row <-> form <-> app scenario ---------- */

const rowToScenario = (r) => ({
  id: r.id, title: r.title, place: r.place, level: r.level,
  ...([1, 2, 3].includes(r.tier) ? { tier: r.tier } : {}),
  cast: r.body?.cast || {}, steps: r.body?.steps || [],
});

const emptySentence = () => ({ jp: '', kana: '', vi: '' });
const emptyKeypoint = () => ({ label: '', vi: '', accept: '' });
const emptyStep = (from = 'p1', to = 'p2') => ({
  from, to, message: emptySentence(), model: emptySentence(), keypoints: [emptyKeypoint()],
  tiles: '', extras: '', readings: {},
});
const emptyPerson = (key, tone) => ({ key, name: '', kana: '', role: '', glyph: '', tone });

function rowToForm(r) {
  if (!r) {
    return {
      id: '', title: '', place: '', level: 'N5', tier: '2', status: 'draft',
      cast: [emptyPerson('p1', 'ai'), emptyPerson('p2', 'shu')],
      steps: [emptyStep()],
    };
  }
  const sc = rowToScenario(r);
  return {
    id: sc.id, title: sc.title, place: sc.place || '', level: sc.level || 'N5',
    tier: sc.tier ? String(sc.tier) : 'auto', status: r.status,
    cast: Object.entries(sc.cast).map(([key, p]) => ({ key, ...emptyPerson(key, 'ai'), ...p })),
    steps: sc.steps.map((st) => {
      const tiles = [...(st.chunks || []), ...(st.extra || [])];
      return {
        from: st.from, to: st.to,
        message: { ...emptySentence(), ...st.message },
        model: { ...emptySentence(), ...st.model },
        keypoints: st.keypoints?.length
          ? st.keypoints.map((kp) => ({ label: kp.label || '', vi: kp.vi || '', accept: (kp.accept || []).join(', ') }))
          : [emptyKeypoint()],
        tiles: (st.chunks || []).map((c) => c.jp).join(' / '),
        extras: (st.extra || []).map((c) => c.jp).join(' / '),
        readings: Object.fromEntries(tiles.filter((c) => c.kana && c.kana !== c.jp).map((c) => [c.jp, c.kana])),
      };
    }),
  };
}

// A tile written only in kana reads as written; others take the reading typed for them.
const needsReading = (jp) => !sentenceKana(jp);
function tilesOf(text, readings) {
  return parseTiles(text).map((t) => ({
    jp: t.jp,
    kana: t.kana !== t.jp ? t.kana : needsReading(t.jp) ? (readings[t.jp] || '').trim() : t.jp,
  }));
}

const trimS = (s) => ({ jp: s.jp.trim(), kana: s.kana.trim(), vi: s.vi.trim() });

function formToScenario(f) {
  const tier = Number(f.tier);
  return {
    id: f.id,
    title: f.title.trim(),
    place: f.place.trim(),
    level: f.level,
    ...([1, 2, 3].includes(tier) ? { tier } : {}),
    cast: Object.fromEntries(f.cast.map((p) => {
      const name = p.name.trim();
      return [p.key, {
        name,
        kana: p.kana.trim() || (isKana(name) ? name : ''),
        role: p.role.trim(),
        glyph: p.glyph.trim() || [...name][0] || '?',
        tone: p.tone,
      }];
    })),
    steps: f.steps.map((st) => {
      const out = {
        from: st.from,
        to: st.to,
        message: trimS(st.message),
        model: trimS(st.model),
        keypoints: st.keypoints
          .filter((kp) => kp.label.trim() || kp.vi.trim() || kp.accept.trim())
          .map((kp) => ({ label: kp.label.trim(), vi: kp.vi.trim(), accept: splitList(kp.accept) })),
      };
      const chunks = tilesOf(st.tiles, st.readings);
      if (chunks.length) {
        out.chunks = chunks;
        out.extra = tilesOf(st.extras, st.readings);
      }
      return out;
    }),
  };
}

const firstProblems = (list) => {
  const m = {};
  list.forEach((p) => { if (!m[p.path]) m[p.path] = p.msg; });
  return m;
};

// "steps.2.model.kana" -> "Lượt 3"; used in the summary of problems.
function whereOf(path, f) {
  const [head, i] = path.split('.');
  if (head === 'steps' && i !== undefined) return `Lượt ${Number(i) + 1}`;
  if (head === 'cast' && i !== undefined) {
    const p = f.cast.find((x) => x.key === i);
    return `Nhân vật ${p?.name.trim() || f.cast.indexOf(p) + 1}`;
  }
  return 'Thông tin chung';
}

/* ================= tab ================= */

export default function RelayAdmin({ role, flash, setError }) {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState({ name: 'list' }); // list | edit {id} | new

  const reload = useCallback(async () => {
    try {
      setRows(await api.loadRelay());
      setLoadError('');
    } catch (e) {
      setLoadError(api.explain(e));
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

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
  }, [reload, flash, setError]);

  if (!rows) {
    return loadError
      ? <p className="ad-error" role="alert">{loadError}</p>
      : <p className="muted">Đang tải tình huống…</p>;
  }

  const back = () => { setView({ name: 'list' }); window.scrollTo(0, 0); };
  const row = view.name === 'edit' ? rows.find((r) => r.id === view.id) : null;

  if (view.name === 'new' || row) {
    return (
      <>
        <BackLink onClick={back} />
        <ScenarioForm
          key={row?.id || 'new'}
          row={row}
          existingIds={rows.map((r) => r.id)}
          onSave={async (sc, status) => {
            const fields = { ...api.scenarioRow(sc), status };
            const what = status === 'published' ? 'đã xuất bản' : 'bản nháp';
            if (row) return run(() => api.updateScenario(row.id, fields), `Đã lưu "${sc.title}" (${what}).`);
            const nextOrder = (Math.max(0, ...rows.map((r) => r.sort_order)) || 0) + 10;
            const ok = await run(() => api.insertScenario({ ...fields, id: sc.id, sort_order: nextOrder }), `Đã tạo "${sc.title}" (${what}).`);
            if (ok) setView({ name: 'edit', id: sc.id });
            return ok;
          }}
          onDelete={async () => {
            const ok = await run(() => api.deleteScenario(row.id), `Đã xóa tình huống "${row.title}".`);
            if (ok) back();
          }}
        />
      </>
    );
  }

  return (
    <>
      {!CODE_SCENARIOS.some((sc) => rows.some((r) => r.id === sc.id)) && (
        <RelayImport role={role} run={run} published={rows.filter((r) => r.status === 'published').length} />
      )}
      <ScenarioList rows={rows} run={run} open={(id) => { setView({ name: 'edit', id }); window.scrollTo(0, 0); }} add={() => setView({ name: 'new' })} />
    </>
  );
}

function BackLink({ onClick }) {
  return (
    <button className="btn btn--ghost btn--sm ad-back" onClick={onClick}>
      <ArrowLeft size={18} weight="bold" aria-hidden="true" />Tất cả tình huống
    </button>
  );
}

/* ---------- first-time import ---------- */

// Shown until the scenarios written in code are in Supabase (scenarios with the same id are skipped).
function RelayImport({ role, run, published }) {
  const [busy, setBusy] = useState(false);
  const n = CODE_SCENARIOS.length;
  return (
    <section className="panel ad-import">
      <h2><DownloadSimple size={22} weight="bold" aria-hidden="true" /> Bắt đầu: chép tình huống có sẵn</h2>
      {published > 0 ? (
        <p className="ad-bad">
          Chú ý: máy chủ đã có {published} tình huống xuất bản, nên học viên chỉ thấy các tình huống đó và không còn thấy
          {' '}{n} tình huống viết sẵn. Hãy chép {n} tình huống vào đây để không mất chúng.
        </p>
      ) : (
        <p className="muted">
          Kho Truyền tin trên máy chủ chưa có tình huống nào xuất bản, nên web vẫn dùng {n} tình huống viết sẵn.
          Chép một lần vào đây để giáo viên sửa được. Học viên vẫn thấy y như cũ, tiến độ không mất.
        </p>
      )}
      {role === 'admin' ? (
        <button
          className="btn btn--matcha"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await run(() => api.importScenarios(CODE_SCENARIOS), `Đã chép ${n} tình huống Truyền tin.`);
            setBusy(false);
          }}
        >
          {busy ? 'Đang chép…' : `Chép ${n} tình huống`}
        </button>
      ) : (
        <p className="muted">Việc này chỉ quản trị viên làm được.</p>
      )}
    </section>
  );
}

/* ---------- list, grouped by tier ---------- */

function ScenarioList({ rows, run, open, add }) {
  const [busy, setBusy] = useState(false);
  const info = useMemo(() => rows.map((r) => {
    const sc = rowToScenario(r);
    return { r, sc, tier: sc.tier ?? deriveTier(sc), auto: !sc.tier, problems: scenarioProblems(sc).length };
  }), [rows]);

  // Moving swaps two scenarios of the same tier; the whole list is then renumbered.
  const move = async (group, i, d) => {
    const a = group[i]; const b = group[i + d];
    if (!b) return;
    const next = [...rows];
    const ia = next.indexOf(a.r); const ib = next.indexOf(b.r);
    [next[ia], next[ib]] = [next[ib], next[ia]];
    setBusy(true);
    await run(() => api.reorderScenarios(next));
    setBusy(false);
  };

  return (
    <section className="panel">
      <div className="ad-row-head">
        <h2>Tình huống Truyền tin ({rows.length})</h2>
        <button className="btn btn--shu btn--sm" onClick={add}><Plus size={18} weight="bold" aria-hidden="true" />Thêm tình huống</button>
      </div>
      {RELAY_SOURCE === 'code' && rows.some((r) => r.status === 'published') && (
        <p className="ad-hint"><Info size={16} weight="bold" aria-hidden="true" />Tải lại trang để web dùng Truyền tin trên máy chủ.</p>
      )}
      {rows.length === 0 && <p className="muted">Chưa có tình huống nào.</p>}
      {TIERS.map((t) => {
        const group = info.filter((x) => x.tier === t.id);
        if (!group.length) return null;
        return (
          <div key={t.id} className="rl-group">
            <h3>{t.label} · {t.name} <small>({group.length})</small></h3>
            <ul className="ad-topics">
              {group.map((x, i) => (
                <li key={x.r.id} className="ad-topic">
                  <button className="ad-topic-main" onClick={() => open(x.r.id)}>
                    <span className="rl-cast-mini" aria-hidden="true">
                      {Object.values(x.sc.cast).slice(0, 2).map((p, k) => (
                        <span key={k} className={`avatar avatar--sm tone-${TONES.includes(p.tone) ? p.tone : 'ai'}`}>{p.glyph || '?'}</span>
                      ))}
                    </span>
                    <span className="ad-topic-text">
                      <strong>{x.r.title}</strong>
                      <small>
                        {[x.r.place, x.r.level, `${x.sc.steps.length} lượt`, x.auto ? 'tự xếp bậc' : ''].filter(Boolean).join(' · ')}
                        <span className="ad-mobile-only">{x.r.status === 'published' ? '' : ' · Bản nháp'}</span>
                      </small>
                    </span>
                    {x.problems > 0 && <span className="ad-chip rl-chip-bad"><Warning size={14} weight="bold" aria-hidden="true" />{x.problems} lỗi</span>}
                    <StatusChip status={x.r.status} />
                  </button>
                  <span className="ad-order">
                    <button className="icon-btn" disabled={busy || i === 0} onClick={() => move(group, i, -1)} aria-label={`Đưa ${x.r.title} lên trên`}>
                      <ArrowUp size={18} weight="bold" aria-hidden="true" />
                    </button>
                    <button className="icon-btn" disabled={busy || i === group.length - 1} onClick={() => move(group, i, 1)} aria-label={`Đưa ${x.r.title} xuống dưới`}>
                      <ArrowDown size={18} weight="bold" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/* ---------- scenario form ---------- */

function ScenarioForm({ row, existingIds, onSave, onDelete }) {
  const isNew = !row;
  const [f, setF] = useState(() => rowToForm(row));
  const [saved, setSaved] = useState(() => JSON.stringify(rowToForm(row)));
  const [idTouched, setIdTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v, ...(k === 'title' && isNew && !idTouched ? { id: slugify(v) } : {}) }));
  const setPerson = (i, k, v) => setF((s) => ({ ...s, cast: s.cast.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const setStep = (i, fn) => setF((s) => ({ ...s, steps: s.steps.map((st, j) => (j === i ? fn(st) : st)) }));

  const sc = useMemo(() => formToScenario(f), [f]);
  const problems = useMemo(() => scenarioProblems(sc), [sc]);
  const bad = useMemo(() => firstProblems(problems), [problems]);

  let idError = '';
  if (isNew) {
    if (!f.id) idError = 'Cần mã tình huống';
    else if (!/^[a-z0-9-]{1,40}$/.test(f.id)) idError = 'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang';
    else if (existingIds.includes(f.id)) idError = 'Mã này đã có tình huống khác dùng';
  }
  const canDraft = !idError && !bad.title;
  const valid = canDraft && problems.length === 0;
  const dirty = isNew || JSON.stringify(f) !== saved;

  // Empty required fields show their message after the first save; wrong values right away.
  const err = (path, value) => (tried || (value !== undefined && String(value).trim()) ? bad[path] || '' : '');

  const save = async (status) => {
    setTried(true);
    if (status === 'published' ? !valid : !canDraft) return;
    setBusy(true);
    const ok = await onSave(sc, status);
    setBusy(false);
    if (ok) {
      const next = { ...f, status };
      setF(next);
      setSaved(JSON.stringify(next));
      if (status === 'draft' || problems.length === 0) setTried(false);
    }
  };

  const usedKeys = new Set(f.steps.flatMap((st) => [st.from, st.to]));
  const addPerson = () => setF((s) => {
    let n = s.cast.length + 1;
    while (s.cast.some((p) => p.key === `p${n}`)) n += 1;
    return { ...s, cast: [...s.cast, emptyPerson(`p${n}`, TONES[(s.cast.length + 1) % TONES.length])] };
  });
  const addStep = () => setF((s) => {
    const last = s.steps[s.steps.length - 1];
    const keys = s.cast.map((p) => p.key);
    // the next turn usually goes back the other way
    return { ...s, steps: [...s.steps, emptyStep(last?.to || keys[0], last?.from || keys[1])] };
  });
  const moveStep = (i, d) => setF((s) => {
    const steps = [...s.steps];
    [steps[i], steps[i + d]] = [steps[i + d], steps[i]];
    return { ...s, steps };
  });

  const published = f.status === 'published';
  const summary = problems.length > 0 && (tried || !isNew) && (
    <div className="rl-summary" role="alert">
      <strong><Warning size={18} weight="bold" aria-hidden="true" /> Còn {problems.length} chỗ cần sửa trước khi xuất bản</strong>
      <ul>
        {problems.slice(0, 6).map((p, i) => <li key={i}>{whereOf(p.path, f)}: {p.msg}</li>)}
        {problems.length > 6 && <li>… và {problems.length - 6} chỗ khác (xem chữ đỏ dưới từng ô)</li>}
      </ul>
    </div>
  );

  return (
    <form className="ad-form rl-form" onSubmit={(e) => { e.preventDefault(); save(published ? 'published' : 'draft'); }} noValidate>
      <section className="panel">
        <div className="ad-row-head">
          <h2>{isNew ? 'Tình huống mới' : 'Thông tin tình huống'}</h2>
          {!isNew && <StatusChip status={row.status} />}
        </div>
        <div className="ad-grid">
          <Field label="Tên tình huống" error={err('title', f.title)} hint="Ví dụ: Cuộc họp đổi giờ">
            {(p) => <input {...p} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={80} autoFocus={isNew} />}
          </Field>
          <Field label="Nơi diễn ra" error={err('place', f.place)} hint="Ví dụ: Văn phòng, Gia đình, Trường học">
            {(p) => <input {...p} value={f.place} onChange={(e) => set('place', e.target.value)} maxLength={60} />}
          </Field>
          <Field
            label="Mã tình huống"
            error={isNew && (tried || f.id) ? idError : ''}
            hint={isNew ? 'Tự tạo từ tên. Không đổi được sau khi tạo.' : 'Không đổi được (tiến độ học viên gắn với mã này).'}
          >
            {(p) => (
              <input
                {...p} value={f.id} readOnly={!isNew} maxLength={40}
                onChange={(e) => { setIdTouched(true); set('id', e.target.value.toLowerCase()); }}
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
          <Field label="Bậc" hint={TIER_HELP[f.tier]} className="rl-span">
            {(p) => (
              <select {...p} value={f.tier} onChange={(e) => set('tier', e.target.value)}>
                {TIERS.map((t) => <option key={t.id} value={String(t.id)}>{t.label} · {t.name}</option>)}
                <option value="auto">Để web tự xếp bậc</option>
              </select>
            )}
          </Field>
        </div>
      </section>

      <section className="panel">
        <h2>Nhân vật</h2>
        <p className="muted rl-lead">Những người nhờ nhắn và nhận lời nhắn. Học viên là người đưa thư ở giữa.</p>
        {tried && bad.cast && <p className="ad-bad">{bad.cast}</p>}
        <ul className="rl-cast">
          {f.cast.map((p, i) => {
            const at = `cast.${p.key}`;
            const inUse = usedKeys.has(p.key);
            return (
              <li key={p.key} className="rl-person">
                <span className={`avatar avatar--sm tone-${p.tone}`} aria-hidden="true">{p.glyph.trim() || [...p.name.trim()][0] || '?'}</span>
                <div className="rl-person-grid">
                  <Field label="Tên (tiếng Nhật)" error={err(`${at}.name`, p.name)} hint="Ví dụ: 田中さん">
                    {(q) => (
                      <input
                        {...q} lang="ja" value={p.name} maxLength={20}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPerson(i, 'name', v);
                          if (!p.kana || p.kana === p.name) setPerson(i, 'kana', isKana(v.trim()) ? v.trim() : '');
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Cách đọc" error={err(`${at}.kana`, p.kana)} hint="Ví dụ: たなかさん">
                    {(q) => <input {...q} lang="ja" value={p.kana} maxLength={30} onChange={(e) => setPerson(i, 'kana', e.target.value)} />}
                  </Field>
                  <Field label="Vai trò (tiếng Việt)" hint="Ví dụ: Đồng nghiệp">
                    {(q) => <input {...q} value={p.role} maxLength={40} onChange={(e) => setPerson(i, 'role', e.target.value)} />}
                  </Field>
                  <Field label="Chữ trên hình" hint="1 chữ, để trống = chữ đầu của tên">
                    {(q) => (
                      <input
                        {...q} lang="ja" value={p.glyph} maxLength={2} placeholder={[...p.name.trim()][0] || ''}
                        onChange={(e) => setPerson(i, 'glyph', e.target.value)}
                      />
                    )}
                  </Field>
                </div>
                <div className="rl-person-side">
                  <div className="ad-swatches rl-swatches" role="radiogroup" aria-label={`Màu của ${p.name || `nhân vật ${i + 1}`}`}>
                    {TONES.map((t) => (
                      <label key={t} className={`ad-swatch tone-${t}`} title={TONE_NAMES[t]}>
                        <input type="radio" name={`tone-${p.key}`} value={t} checked={p.tone === t} onChange={() => setPerson(i, 'tone', t)} />
                        <span className="sr-only">{TONE_NAMES[t]}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button" className="btn btn--ghost btn--sm"
                    disabled={f.cast.length <= 2 || inUse}
                    title={inUse ? 'Nhân vật đang có trong một lượt nhắn' : f.cast.length <= 2 ? 'Cần ít nhất 2 nhân vật' : ''}
                    onClick={() => setF((s) => ({ ...s, cast: s.cast.filter((x) => x.key !== p.key) }))}
                  >
                    <Trash size={16} weight="bold" aria-hidden="true" />Bỏ
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addPerson} disabled={f.cast.length >= 6}>
          <UserPlus size={18} weight="bold" aria-hidden="true" />Thêm nhân vật
        </button>
      </section>

      {f.steps.map((st, i) => (
        <StepEditor
          key={i}
          index={i}
          count={f.steps.length}
          step={st}
          cast={f.cast}
          tier={f.tier}
          err={err}
          bad={bad}
          tried={tried}
          set={(fn) => setStep(i, fn)}
          move={(d) => moveStep(i, d)}
          remove={() => setF((s) => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }))}
        />
      ))}
      <button type="button" className="btn btn--ghost rl-add-step" onClick={addStep} disabled={f.steps.length >= 8}>
        <Plus size={18} weight="bold" aria-hidden="true" />Thêm lượt nhắn
      </button>

      <section className="panel rl-save">
        {summary}
        {!summary && problems.length === 0 && !published && (
          <p className="rl-ok"><CheckCircle size={18} weight="fill" aria-hidden="true" />Đã đủ thông tin, có thể xuất bản.</p>
        )}
        <div className="ad-actions">
          {published ? (
            <>
              <button className="btn btn--ai" type="button" disabled={busy || !dirty} onClick={() => save('published')}>
                <Check size={18} weight="bold" aria-hidden="true" />{busy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
              <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => save('draft')}>
                <EyeSlash size={18} weight="bold" aria-hidden="true" />Chuyển về bản nháp
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--ai" type="button" disabled={busy || (!dirty && !isNew)} onClick={() => save('draft')}>
                <Check size={18} weight="bold" aria-hidden="true" />{busy ? 'Đang lưu…' : 'Lưu bản nháp'}
              </button>
              <button className="btn btn--matcha" type="button" disabled={busy} onClick={() => save('published')}>
                <Eye size={18} weight="bold" aria-hidden="true" />{isNew ? 'Lưu và xuất bản' : 'Xuất bản'}
              </button>
            </>
          )}
          {!isNew && !confirmDel && (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDel(true)}>
              <Trash size={18} weight="bold" aria-hidden="true" />Xóa tình huống
            </button>
          )}
        </div>
        <p className="muted rl-lead">
          Bản nháp lưu được cả khi chưa điền xong. Học viên chỉ thấy tình huống đã xuất bản, ở lần mở hoặc tải lại web tiếp theo.
        </p>
        {confirmDel && (
          <div className="ad-confirm" role="alertdialog" aria-label="Xác nhận xóa tình huống">
            <p>
              Xóa hẳn tình huống <strong>{row.title}</strong>? Không hoàn tác được.
              Nếu chỉ muốn ẩn, hãy bấm "Chuyển về bản nháp".
            </p>
            <div className="ad-actions">
              <button type="button" className="btn btn--shu btn--sm" onClick={onDelete}>Xóa hẳn</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDel(false)}>Thôi</button>
            </div>
          </div>
        )}
      </section>
    </form>
  );
}

/* ---------- one turn ---------- */

const who = (p, i) => `${p.name.trim() || `Nhân vật ${i + 1}`}${p.role.trim() ? ` (${p.role.trim()})` : ''}`;

function StepEditor({ index, count, step, cast, tier, err, bad, tried, set, move, remove }) {
  const at = `steps.${index}`;
  const [confirm, setConfirm] = useState(false);
  const setS = (part, k, v) => set((st) => ({ ...st, [part]: { ...st[part], [k]: v } }));
  const setKp = (j, k, v) => set((st) => ({ ...st, keypoints: st.keypoints.map((kp, n) => (n === j ? { ...kp, [k]: v } : kp)) }));
  const showTiles = tier === '1' || step.tiles.trim() || step.extras.trim();
  const listId = `rl-labels-${index}`;

  const sentence = (part, title, hint) => (
    <fieldset className="rl-sentence">
      <legend>{title}</legend>
      {hint && <p className="muted rl-lead">{hint}</p>}
      <Field label="Tiếng Nhật" error={err(`${at}.${part}.jp`, step[part].jp)}>
        {(p) => <textarea {...p} lang="ja" rows={2} value={step[part].jp} maxLength={200} onChange={(e) => setS(part, 'jp', e.target.value)} />}
      </Field>
      <Field label="Cách đọc (hiragana / katakana)" error={err(`${at}.${part}.kana`, step[part].kana)}>
        {(p) => <textarea {...p} lang="ja" rows={2} value={step[part].kana} maxLength={300} onChange={(e) => setS(part, 'kana', e.target.value)} />}
      </Field>
      <Field label="Nghĩa tiếng Việt" error={err(`${at}.${part}.vi`, step[part].vi)}>
        {(p) => <textarea {...p} rows={2} value={step[part].vi} maxLength={300} onChange={(e) => setS(part, 'vi', e.target.value)} />}
      </Field>
    </fieldset>
  );

  return (
    <section className="panel rl-step">
      <div className="ad-row-head">
        <h2>Lượt {index + 1}</h2>
        <span className="ad-order">
          <button type="button" className="icon-btn" disabled={index === 0} onClick={() => move(-1)} aria-label={`Đưa lượt ${index + 1} lên trên`}>
            <ArrowUp size={18} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" disabled={index === count - 1} onClick={() => move(1)} aria-label={`Đưa lượt ${index + 1} xuống dưới`}>
            <ArrowDown size={18} weight="bold" aria-hidden="true" />
          </button>
          {count > 1 && !confirm && (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label={`Xóa lượt ${index + 1}`}>
              <Trash size={18} weight="bold" aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      {confirm && (
        <div className="ad-confirm rl-confirm-step" role="alertdialog" aria-label={`Xác nhận xóa lượt ${index + 1}`}>
          <span>Xóa lượt {index + 1}?</span>
          <button type="button" className="btn btn--shu btn--sm" onClick={() => { setConfirm(false); remove(); }}>Xóa</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>Thôi</button>
        </div>
      )}

      <div className="rl-route">
        <Field label="Người nhờ nhắn" error={err(`${at}.from`, step.from)}>
          {(p) => (
            <select {...p} value={step.from} onChange={(e) => set((st) => ({ ...st, from: e.target.value }))}>
              <option value="">Chọn…</option>
              {cast.map((c, i) => <option key={c.key} value={c.key}>{who(c, i)}</option>)}
            </select>
          )}
        </Field>
        <ArrowRight size={22} weight="bold" className="rl-route-arrow" aria-hidden="true" />
        <Field label="Người nhận" error={err(`${at}.to`, step.to)}>
          {(p) => (
            <select {...p} value={step.to} onChange={(e) => set((st) => ({ ...st, to: e.target.value }))}>
              <option value="">Chọn…</option>
              {cast.map((c, i) => <option key={c.key} value={c.key}>{who(c, i)}</option>)}
            </select>
          )}
        </Field>
      </div>

      <div className="rl-sentences">
        {sentence('message', 'Lời nhắn (học viên nghe)', 'Người nhờ nhắn nói câu này với học viên.')}
        {sentence('model', 'Câu mẫu (học viên nói lại)', 'Câu học viên nên nói với người nhận.')}
      </div>

      <fieldset className="rl-kps">
        <legend>Ý chính cần nhắn đủ</legend>
        <p className="muted rl-lead">
          Mỗi ý: nhãn, nghĩa, và các cách viết được chấp nhận (cách nhau bằng dấu phẩy, ví dụ: 三時, 3時, さんじ).
          Học viên nói có một trong các cách viết là được tính ý đó.
        </p>
        <datalist id={listId}>{LABELS.map((l) => <option key={l} value={l} />)}</datalist>
        {(tried || step.keypoints.length === 0) && bad[`${at}.keypoints`] && <p className="ad-bad">{bad[`${at}.keypoints`]}</p>}
        <ul className="rl-kp-list">
          {step.keypoints.map((kp, j) => {
            const msg = err(`${at}.keypoints.${j}`, kp.label + kp.vi + kp.accept);
            return (
              <li key={j} className="rl-kp">
                <input aria-label={`Nhãn ý ${j + 1}`} placeholder="Nhãn (Khi nào)" list={listId} value={kp.label} maxLength={30} onChange={(e) => setKp(j, 'label', e.target.value)} aria-invalid={!!msg && !kp.label.trim()} />
                <input aria-label={`Nghĩa ý ${j + 1}`} placeholder="Nghĩa (3 giờ)" value={kp.vi} maxLength={60} onChange={(e) => setKp(j, 'vi', e.target.value)} aria-invalid={!!msg && !kp.vi.trim()} />
                <input aria-label={`Cách viết được chấp nhận của ý ${j + 1}`} lang="ja" placeholder="三時, 3時, さんじ" value={kp.accept} maxLength={200} onChange={(e) => setKp(j, 'accept', e.target.value)} aria-invalid={!!msg && kp.label.trim() !== '' && kp.vi.trim() !== ''} />
                <button
                  type="button" className="icon-btn" aria-label={`Bỏ ý ${j + 1}`}
                  onClick={() => set((st) => ({ ...st, keypoints: st.keypoints.filter((_, n) => n !== j) }))}
                >
                  <Trash size={18} weight="bold" aria-hidden="true" />
                </button>
                {msg && <small className="ad-bad rl-kp-msg">{msg}</small>}
              </li>
            );
          })}
        </ul>
        <button
          type="button" className="btn btn--ghost btn--sm" disabled={step.keypoints.length >= 6}
          onClick={() => set((st) => ({ ...st, keypoints: [...st.keypoints, emptyKeypoint()] }))}
        >
          <Plus size={18} weight="bold" aria-hidden="true" />Thêm ý
        </button>
      </fieldset>

      {showTiles ? (
        <TilesEditor at={at} step={step} tier={tier} err={err} bad={bad} tried={tried} set={set} />
      ) : (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => set((st) => ({ ...st, tiles: st.model.jp.trim() }))}>
          <Plus size={18} weight="bold" aria-hidden="true" />Thêm thẻ từ (cho học viên ghép câu)
        </button>
      )}
    </section>
  );
}

/* ---------- word tiles (tier 1) ---------- */

function TilesEditor({ at, step, tier, err, bad, tried, set }) {
  const chunks = tilesOf(step.tiles, step.readings);
  const extra = tilesOf(step.extras, step.readings);
  const all = [...chunks, ...extra];
  const toRead = [...new Set(parseTiles(`${step.tiles}/${step.extras}`).filter((t) => t.kana === t.jp && needsReading(t.jp)).map((t) => t.jp))];
  const joined = chunks.map((c) => c.jp).join('');
  const model = step.model.jp.trim();
  const match = chunks.length > 0 && model && tilesMatch(chunks, model);
  const chunkMsg = (tried || chunks.length) ? bad[`${at}.chunks`] : '';
  // problems of single tiles (empty reading, reading not in kana) are shown next to that tile's reading
  const tileMsg = (jp) => {
    const i = chunks.findIndex((c) => c.jp === jp);
    const j = extra.findIndex((c) => c.jp === jp);
    return (i >= 0 && err(`${at}.chunks.${i}`, step.readings[jp])) || (j >= 0 && err(`${at}.extra.${j}`, step.readings[jp])) || '';
  };
  // suggestion: cut the model sentence at punctuation, the teacher then adds more "/"
  const suggest = () => set((st) => ({
    ...st,
    tiles: st.model.jp.split(/[、。，．,.!?！？\s]+/).map((x) => x.trim()).filter(Boolean).join(' / '),
  }));

  return (
    <fieldset className="rl-tiles">
      <legend>Thẻ từ {tier === '1' ? '' : '(không bắt buộc ở bậc này)'}</legend>
      <p className="muted rl-lead">
        Viết lại câu mẫu, đặt dấu <strong>/</strong> giữa các thẻ. Ví dụ: お兄ちゃん / ごはん / だよ.
        Dấu câu (、。) không cần đưa vào thẻ.
      </p>
      <Field label="Các thẻ đúng (theo thứ tự)" error={chunkMsg || ''}>
        {(p) => (
          <input {...p} lang="ja" value={step.tiles} maxLength={300} placeholder="お兄ちゃん / ごはん / だよ" onChange={(e) => set((st) => ({ ...st, tiles: e.target.value }))} />
        )}
      </Field>
      {model && !step.tiles.trim() && (
        <button type="button" className="btn btn--ghost btn--sm rl-suggest" onClick={suggest}>Lấy câu mẫu làm điểm bắt đầu</button>
      )}
      <Field label="Thẻ nhiễu (sai, để học viên chọn lọc)" hint="Không bắt buộc. Ví dụ: おやすみ / きょう">
        {(p) => (
          <input {...p} lang="ja" value={step.extras} maxLength={200} placeholder="おやすみ" onChange={(e) => set((st) => ({ ...st, extras: e.target.value }))} />
        )}
      </Field>

      {toRead.length > 0 && (
        <div className="rl-readings">
          <p className="rl-readings-title">Cách đọc của thẻ có kanji</p>
          {toRead.map((jp) => (
            <Field key={jp} label={jp} error={tileMsg(jp)} className="rl-reading">
              {(p) => (
                <input
                  {...p} lang="ja" value={step.readings[jp] || ''} maxLength={40} placeholder="hiragana"
                  onChange={(e) => set((st) => ({ ...st, readings: { ...st.readings, [jp]: e.target.value } }))}
                />
              )}
            </Field>
          ))}
        </div>
      )}

      {all.length > 0 && (
        <div className="rl-preview" aria-label="Xem trước thẻ từ">
          <p className="rl-readings-title">Học viên sẽ thấy (trộn thứ tự khi chơi):</p>
          <div className="tile-pool">
            {all.map((t, i) => (
              <span key={i} className={`tile${i >= chunks.length ? ' rl-tile-extra' : ''}`}>
                <Word jp={t.jp} kana={t.kana || t.jp} size={20} showRomaji={false} />
              </span>
            ))}
          </div>
          {model && chunks.length > 0 && (match ? (
            <p className="rl-ok"><CheckCircle size={18} weight="fill" aria-hidden="true" />Ghép đúng thứ tự thì ra câu mẫu.</p>
          ) : (
            <p className="ad-bad rl-mismatch">
              <XCircle size={18} weight="fill" aria-hidden="true" />
              <span>Ghép lại: <span lang="ja">{joined}</span><br />Câu mẫu: <span lang="ja">{model}</span>
                {normalizeJa(joined).length < normalizeJa(model).length ? ' (còn thiếu chữ)' : ''}</span>
            </p>
          ))}
        </div>
      )}
    </fieldset>
  );
}
