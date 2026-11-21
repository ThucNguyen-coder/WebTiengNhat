// Kiểm tra romaji câu của Truyền tin: tách từ, trợ từ は/を/へ đọc wa/o/e.
// Chạy: node scripts/run.mjs scripts/check-romaji.js   (thêm --all để in mọi câu trong app)
import { sentenceRomaji, sentenceWords, particleRomaji } from '../src/lib/sentenceRomaji';
import { kanaToRomaji, tokenize, matchRomaji } from '../src/lib/kana';
import { ALL_SCENARIOS } from '../src/lib/relayTiers';

const cases = [
  ['あしたはプールです。', 'あしたはプールです。', 'Ashita wa pu-ru desu.'],
  ['みんな、あしたはプールだよ。', 'みんな、あしたはプールだよ。', 'Minna, ashita wa pu-ru da yo.'],
  ['傘を持っていって', 'かさをもっていって', 'Kasa o motteitte'],
  ['お兄ちゃん、ごはんだよ。', 'おにいちゃん、ごはんだよ。', 'Oniichan, gohan da yo.'],
  ['会議は三時からになりました。', 'かいぎはさんじからになりました。', 'Kaigi wa sanji kara ni narimashita.'],
  ['こんにちは', 'こんにちは', 'Konnichiwa'],
  ['学校へ行きます。', 'がっこうへいきます。', 'Gakkou e ikimasu.'],
];
let bad = 0;
const dbg = process.argv.find((a) => a.startsWith('--jp='));
if (dbg) {
  const [jp, kana] = dbg.slice(5).split('|');
  console.log(JSON.stringify(sentenceWords(jp, kana)), sentenceRomaji(kana, jp));
}
const t = (name, ok, extra = '') => { if (!ok) { bad++; console.log('SAI:', name, extra); } };
for (const [jp, kana, want] of cases) {
  const got = sentenceRomaji(kana, jp);
  console.log(`${got === want ? 'ok ' : 'LỆCH'}  ${got}${got === want ? '' : `   (muốn: ${want})`}`);
  if (got !== want) bad++;
}
// không có câu gốc vẫn phải đọc trợ từ đúng
const noJp = sentenceRomaji('あしたはプールです。');
t('không jp', /wa/.test(noJp) && / /.test(noJp), noJp);
t('thẻ は', particleRomaji('は') === 'wa' && particleRomaji('を') === 'o' && particleRomaji('へ') === 'e' && particleRomaji('はな') === undefined);
// gõ romaji cho học viên vẫn nhận cả ha/wa, wo/o, he/e
const ok = (kana, typed) => matchRomaji(tokenize(kana), typed).done;
t('gõ ha', ok('あしたは', 'ashitaha'));
t('gõ wa', ok('あしたは', 'ashitawa'));
t('gõ wo', ok('かさを', 'kasawo'));
t('gõ o', ok('かさを', 'kasao'));
t('gõ he', ok('へ', 'he'));
t('gõ e', ok('へ', 'e'));
t('kanaToRomaji không đổi', kanaToRomaji('こんにちは') === 'konnichiwa' && kanaToRomaji('は') === 'ha');

if (process.argv.includes('--all')) {
  for (const sc of ALL_SCENARIOS) for (const st of sc.steps) for (const sen of [st.message, st.model]) console.log(sentenceRomaji(sen.kana, sen.jp), '   |', sen.jp);
}
// không câu nào được dính liền quá dài hoặc còn "ha"/"wo" đứng riêng
for (const sc of ALL_SCENARIOS) for (const st of sc.steps) for (const sen of [st.message, st.model]) {
  const r = sentenceRomaji(sen.kana, sen.jp);
  t(`wo đứng riêng: ${r}`, !/\bwo\b/.test(r));
  t(`ha đứng riêng: ${r}`, !/\bha\b/.test(r));
}
console.log(bad ? `${bad} lỗi` : 'Tất cả OK');
if (bad) process.exitCode = 1;
