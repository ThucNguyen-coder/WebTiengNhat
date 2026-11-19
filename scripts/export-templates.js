// Writes the current content into CSV files (content-templates/) so the Google Sheet
// can start with everything that already exists: File > Import in each tab.
import { writeFileSync, mkdirSync } from 'node:fs';
import { toCsv } from './lib/csv';
import { toSheetRows, SHEET_COLUMNS } from '../src/data/sheetFormat';
import { BASE_TOPICS } from '../src/data/vocab';
import { SCENARIOS } from '../src/data/relay';
import { EASY_SCENARIOS } from '../src/data/relayEasy';

mkdirSync('content-templates', { recursive: true });
const { topicsRows, wordsRows, relayRows } = toSheetRows(BASE_TOPICS, [...EASY_SCENARIOS, ...SCENARIOS]);
writeFileSync('content-templates/ChuDe.csv', toCsv(SHEET_COLUMNS.ChuDe, topicsRows));
writeFileSync('content-templates/TuVung.csv', toCsv(SHEET_COLUMNS.TuVung, wordsRows));
writeFileSync('content-templates/TruyenTin.csv', toCsv(SHEET_COLUMNS.TruyenTin, relayRows));
console.log(`Đã ghi content-templates/: ${topicsRows.length} chủ đề, ${wordsRows.length} từ, ${relayRows.length} dòng Truyền tin.`);
