// Chạy ở THƯ MỤC GỐC của repo (cạnh package.json):  node apply-upgrade.mjs
// Gắn ThemeToggle, FlashcardDeck, ProgressWidget vào App.jsx, Vocab.jsx, Home.jsx.
// Nhận được cả bản cũ lẫn bản main mới. Chỉ chèn thêm dòng hoặc thay đúng một chuỗi.
// Có chỗ nào không khớp là dừng, không ghi file nào. Chạy lại nhiều lần vẫn an toàn.
import fs from 'node:fs';

// marker: nếu file đã chứa chuỗi này thì bước đó đã làm rồi.
// anchors: các chuỗi neo có thể có (bản cũ / bản mới); dùng cái khớp đúng một chỗ.
const EDITS = [
  {
    file: 'src/App.jsx',
    changes: [
      { marker: 'import ThemeToggle', anchors: ["import RelayPlay from './relay/RelayPlay';"], build: (a) => `${a}\nimport ThemeToggle from './components/ThemeToggle';` },
      { marker: '<ThemeToggle variant="nav" />', anchors: ['<div className="nav-spacer" />'], build: (a) => `${a}\n<ThemeToggle variant="nav" />` },
      { marker: '<ThemeToggle />', anchors: ['<a href="#/settings" className="icon-btn" aria-label="Cài đặt">'], build: (a) => `<ThemeToggle />\n${a}` },
    ],
  },
  {
    file: 'src/pages/Vocab.jsx',
    changes: [
      { marker: 'import FlashcardDeck', anchors: ["import { Word, SpeakButton } from '../components/Bits';"], build: (a) => `${a}\nimport FlashcardDeck from '../components/FlashcardDeck';` },
      { marker: '<FlashcardDeck words', anchors: ['<Flashcards words={topic.words} />'], build: () => '<FlashcardDeck words={topic.words} />' },
    ],
  },
  {
    file: 'src/pages/Home.jsx',
    changes: [
      { marker: 'import ProgressWidget', anchors: ["import './home.css';"], build: (a) => `${a}\nimport ProgressWidget from '../components/ProgressWidget';` },
      { marker: '<ProgressWidget />', anchors: ['<div className="panel stats">'], build: (a) => `<ProgressWidget />\n${a}` },
    ],
  },
];

const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const errors = [];

for (const { file, changes } of EDITS) {
  if (!fs.existsSync(file)) { errors.push(`Không thấy file: ${file}`); continue; }
  let text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  for (const { marker, anchors, build } of changes) {
    if (text.includes(marker)) continue; // đã áp dụng
    const anchor = anchors.find((a) => count(text, a) === 1);
    if (!anchor) {
      const seen = anchors.map((a) => `${count(text, a)}x "${a}"`).join(' | ');
      errors.push(`${file}: không có chỗ khớp đúng 1 lần (${seen})`);
      continue;
    }
    const at = text.indexOf(anchor);
    const ind = text.slice(text.lastIndexOf('\n', at) + 1, at).match(/^\s*/)[0];
    const repl = build(anchor).split('\n').map((l, i) => (i === 0 ? l : ind + l)).join(eol);
    text = text.replace(anchor, () => repl);
  }
  plan.push([file, text]);
}

if (errors.length) {
  console.error('DỪNG, chưa ghi file nào:\n- ' + errors.join('\n- '));
  process.exit(1);
}
for (const [file, text] of plan) fs.writeFileSync(file, text);
console.log('Xong. Đã cập nhật:', plan.map(([f]) => f).join(', '));
