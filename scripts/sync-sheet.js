// Reads the Google Sheet (published as CSV), checks every row and writes
// src/data/generated/sheetContent.json, which the app merges on top of the code content.
//
// Set these to the "Publish to web > CSV" links of each tab (in .env.local or Vercel):
//   SHEET_TOPICS_CSV   tab ChuDe
//   SHEET_WORDS_CSV    tab TuVung
//   SHEET_RELAY_CSV    tab TruyenTin
// Missing links are skipped. If the sheet cannot be downloaded, the last good file is kept.
import { writeFileSync, readFileSync } from 'node:fs';
import { parseCsv } from './lib/csv';
import { parseSheet } from '../src/data/sheetFormat';
import { BASE_TOPICS } from '../src/data/vocab';

const OUT = 'src/data/generated/sheetContent.json';
const urls = {
  topicsRows: process.env.SHEET_TOPICS_CSV,
  wordsRows: process.env.SHEET_WORDS_CSV,
  relayRows: process.env.SHEET_RELAY_CSV,
};

export async function syncSheet() {
  if (!Object.values(urls).some(Boolean)) {
    console.log('[sheet] Chưa cấu hình link Google Sheet (SHEET_*_CSV), bỏ qua.');
    return;
  }
  const input = {};
  for (const [key, url] of Object.entries(urls)) {
    if (!url) { input[key] = []; continue; }
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error('Link không trả về CSV. Hãy dùng link "Xuất bản lên web" dạng CSV.');
      input[key] = parseCsv(text);
    } catch (err) {
      console.warn(`[sheet] Không tải được ${key}: ${err.message}. Giữ nguyên nội dung cũ.`);
      return;
    }
  }

  const { content, problems } = parseSheet(input, BASE_TOPICS.map((t) => t.id));
  const before = readFileSync(OUT, 'utf8');
  const after = JSON.stringify(content, null, 2) + '\n';
  if (before !== after) writeFileSync(OUT, after);

  console.log(`[sheet] ${content.topics.length} chủ đề, ${content.words.length} từ, ${content.relay.length} tình huống Truyền tin.${before === after ? ' (không đổi)' : ''}`);
  if (problems.length) {
    console.warn(`[sheet] ${problems.length} dòng bị bỏ qua hoặc cần sửa:`);
    problems.forEach((p) => console.warn(`  - Tab ${p.tab}, dòng ${p.row}: ${p.msg}`));
  }
}

if (process.argv[2]?.endsWith('sync-sheet.js')) await syncSheet();
