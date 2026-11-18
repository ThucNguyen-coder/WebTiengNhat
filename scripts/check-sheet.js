// Checks CSV files exported from the sheet (default: content-templates/) without touching the app.
// Usage: npm run check-content [folder]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './lib/csv';
import { parseSheet } from '../src/data/sheetFormat';
import { BASE_TOPICS } from '../src/data/vocab';

const dir = process.argv[3] || 'content-templates';
const read = (f) => (existsSync(join(dir, f)) ? parseCsv(readFileSync(join(dir, f), 'utf8')) : []);
const { content, problems } = parseSheet(
  { topicsRows: read('ChuDe.csv'), wordsRows: read('TuVung.csv'), relayRows: read('TruyenTin.csv') },
  BASE_TOPICS.map((t) => t.id),
);
console.log(`${content.topics.length} chủ đề, ${content.words.length} từ, ${content.relay.length} tình huống, ${content.relay.reduce((n, s) => n + s.steps.length, 0)} lượt.`);
problems.forEach((p) => console.log(`  - Tab ${p.tab}, dòng ${p.row}: ${p.msg}`));
if (problems.length) process.exitCode = 1;
