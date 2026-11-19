// Minimal RFC 4180 CSV parser and writer (quotes, commas and line breaks inside cells).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((x) => x.trim() !== ''));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r, idx) => {
    const o = { _row: idx + 2 }; // spreadsheet row number (header is row 1)
    header.forEach((h, j) => { o[h] = (r[j] ?? '').trim(); });
    return o;
  });
}

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) =>
  '\uFEFF' + [header.map(esc).join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\r\n') + '\r\n';
