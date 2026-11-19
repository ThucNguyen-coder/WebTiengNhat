// Chạy ở THƯ MỤC GỐC của repo:
//   node resolve-conflicts.mjs --check   chỉ liệt kê, không sửa
//   node resolve-conflicts.mjs           tự gỡ dấu xung đột ở những chỗ AN TOÀN, chỗ còn lại để nguyên và báo
// Chỗ an toàn = một bên rỗng, hai bên giống hệt, hoặc cả hai bên chỉ toàn dòng import (giữ cả hai, bỏ dòng trùng).
// Chỗ hai bên sửa khác nhau trên cùng đoạn code thì KHÔNG tự quyết, anh gửi em xem.
import fs from 'node:fs';
import path from 'node:path';

const CHECK = process.argv.includes('--check');
const strip = (l) => l.replace(/\r$/, '');
const isStart = (l) => /^<{7}( |$)/.test(strip(l));
const isMid = (l) => /^={7}$/.test(strip(l));
const isEnd = (l) => /^>{7}( |$)/.test(strip(l));
const blank = (a) => a.every((l) => strip(l).trim() === '');
const importsOnly = (a) => a.every((l) => strip(l).trim() === '' || /^\s*import\s.+;?\s*$/.test(strip(l)));

function resolve(text) {
  const lines = text.split('\n');
  const out = [];
  const left = [];
  let fixed = 0;
  for (let i = 0; i < lines.length; ) {
    if (!isStart(lines[i])) { out.push(lines[i]); i += 1; continue; }
    let mid = -1;
    let end = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (mid < 0 && isMid(lines[j])) mid = j;
      else if (isEnd(lines[j])) { end = j; break; }
    }
    if (mid < 0 || end < 0) { left.push(`dòng ${i + 1} (dấu xung đột không đủ cặp)`); out.push(lines[i]); i += 1; continue; }
    const ours = lines.slice(i + 1, mid);
    const theirs = lines.slice(mid + 1, end);
    let keep = null;
    if (blank(ours)) keep = theirs;
    else if (blank(theirs)) keep = ours;
    else if (JSON.stringify(ours.map(strip)) === JSON.stringify(theirs.map(strip))) keep = ours;
    else if (importsOnly(ours) && importsOnly(theirs)) {
      const seen = new Set();
      keep = [...ours, ...theirs].filter((l) => { const k = strip(l).trim(); if (!k || seen.has(k)) return k === ''; seen.add(k); return true; });
    }
    if (keep) { out.push(...keep); fixed += 1; } else { left.push(`dòng ${i + 1} đến ${end + 1}`); out.push(...lines.slice(i, end + 1)); }
    i = end + 1;
  }
  return { text: out.join('\n'), fixed, left };
}

const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
const files = [...walk('src'), 'package.json', 'index.html', 'vite.config.js'].filter((f) => fs.existsSync(f) && /\.(jsx?|css|html|json)$/.test(f));

let total = 0;
let remaining = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  if (!raw.split('\n').some(isStart)) continue;
  const { text, fixed, left } = resolve(raw);
  total += 1;
  console.log(`${f}: ${fixed} chỗ ${CHECK ? 'có thể tự gỡ' : 'đã gỡ'}${left.length ? `, ${left.length} chỗ CẦN XEM TAY (${left.join('; ')})` : ''}`);
  remaining += left.length;
  if (!CHECK && fixed) fs.writeFileSync(f, text);
}
if (!total) console.log('Không có file nào còn dấu xung đột.');
else if (remaining) { console.log('\nCòn chỗ cần xem tay. Gửi em nội dung đoạn từ <<<<<<< đến >>>>>>> của các file ở trên.'); process.exit(1); }
else console.log(CHECK ? '\nTất cả đều gỡ tự động được. Chạy lại không kèm --check.' : '\nXong. Bước tiếp: git add các file trên, node apply-upgrade.mjs, npm run dev.');
