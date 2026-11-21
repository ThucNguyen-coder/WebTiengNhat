// Romaji for whole sentences (Truyền tin). Câu kana không có khoảng trắng nên cần tách từ,
// rồi đọc trợ từ は/を/へ là wa/o/e (giống cách Từ vựng đọc こんにちは = konnichiwa).
//
// Cách làm: lấy ranh giới từ ở chữ Hán/katakana của câu gốc (jp); phần hiragana còn lại tách
// bằng danh sách từ đã biết (từ vựng + thẻ Truyền tin + trợ từ). Chỗ nào không chắc thì giữ
// nguyên một khối, không đoán bừa. Việc gõ/khớp romaji của học viên (kana.js) không bị ảnh hưởng.
import { kanaToRomaji, toHiragana } from './kana';
import { ALL_WORDS } from '../data/vocab';
import { ALL_SCENARIOS } from './relayTiers';

const PARTICLE_SOUND = { は: 'わ', を: 'お', へ: 'え' };

// Từ chức năng (hiragana) hay gặp trong câu nhắn.
const FUNC_WORDS = [
  'ください', 'でしょう', 'ですか', 'ですが', 'ですよ', 'ですね', 'でした', 'です', 'ました', 'ません', 'ましょう', 'ます',
  'から', 'まで', 'より', 'では', 'には', 'とは', 'でも', 'ので', 'のに', 'けど', 'だよ', 'だね', 'だから',
  'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ', 'なに', 'だれ', 'いつ', 'どう', 'この', 'その', 'あの', 'どの',
  'は', 'を', 'が', 'も', 'に', 'で', 'と', 'の', 'へ', 'や', 'か', 'ね', 'よ',
];
const FUNC = new Set(FUNC_WORDS);
// Một vài từ thường dùng chưa nằm trong bộ từ vựng.
const EXTRA_WORDS = [
  'いい', 'ない', 'ある', 'いる', 'する', 'なる', 'ほしい', 'そう', 'ため', 'ほう', 'よう', 'ところ', 'ただ', 'じゃ', 'じゃあ',
  'それから', 'いっぱい', 'こと', 'とのこと', 'もう', 'また', 'とても', 'すこし', 'ちょっと', 'たくさん', 'ぜんぶ', 'ごめん', 'どうぞ',
];
const SINGLE = new Set(['は', 'を', 'が', 'も', 'に', 'で', 'と', 'の', 'へ', 'や', 'か', 'ね', 'よ']);
// Đuôi động từ dính vào thân động từ lạ: わかり|ました -> わかりました
const VERB_END = ['ましょう', 'ました', 'ません', 'ます'];
// Từ chức năng dài chỉ tách khi đứng giữa một khối chưa biết (an toàn, ít khi nằm trong từ khác)
const MID_OK = new Set(['から', 'まで', 'より', 'では', 'には', 'とは', 'でも', 'ので', 'です', 'だよ', 'だね', 'ですか', 'ですよ', 'ですが', 'でした', 'ください']);
// Trợ từ đứng ngay sau danh từ (chữ Hán/katakana)
const AFTER_NOUN = ['だけ', 'ほど', 'ぐらい', 'くらい', 'ごろ', 'しか', 'など', 'から', 'まで', 'より', 'では', 'には', 'とは', 'でも', 'ですか', 'ですが', 'ですよ', 'ですね', 'でした', 'です', 'だから', 'だよ', 'だね', 'だって', 'だと', 'だ', 'は', 'を', 'が', 'も', 'に', 'の', 'へ', 'で', 'と', 'や'];
// Cụm bắt đầu giống trợ từ nhưng thực ra là động từ: できます, でかける
const NOT_PARTICLE_START = ['でき', 'でか'];
// Đuôi tách khỏi cụm chữ Hán + okurigana: 言ってね, 持ってきてください, 山田さんから, 好きです
const TAIL_MULTI = ['ください', 'ですか', 'ですよ', 'ですね', 'ですが', 'でした', 'です', 'から', 'まで', 'より', 'では', 'には', 'ので', 'けど', 'ほうがいい'];
// 2 = còn lại ít nhất 2 ký tự trước khi tách; で không có ở đây vì 読んで/行って... là dạng て
const TAIL_SINGLE = { ね: 2, よ: 2, と: 3, か: 3, に: 2, は: 2, が: 2, を: 2, も: 2, の: 2, へ: 2 };

let lexicon = null; // Set các từ hiragana đã biết (từ 2 ký tự trở lên)
function ensureLexicon() {
  if (lexicon) return;
  const words = ALL_WORDS.map((w) => w.kana).concat(EXTRA_WORDS);
  ALL_SCENARIOS.forEach((sc) =>
    sc.steps.forEach((st) => {
      (st.chunks || []).concat(st.extra || []).forEach((c) => words.push(c.kana));
      st.keypoints.forEach((kp) => kp.accept.forEach((a) => words.push(a)));
    }),
  );
  lexicon = new Set(words.map((w) => toHiragana(w)).filter((w) => w.length >= 2 && /^[ぁ-ゖー]+$/.test(w)));
}
const known = (w) => {
  ensureLexicon();
  return lexicon.has(w) || (w.length >= 2 && FUNC.has(w));
};

function longestAt(text, i, minLen = 2) {
  for (let len = Math.min(8, text.length - i); len >= minLen; len--) {
    if (known(text.slice(i, i + len))) return text.slice(i, i + len);
  }
  return null;
}

// Tách một khối hiragana thành các từ. Từ lạ giữ nguyên thành một khối.
export function splitRun(run) {
  const out = [];
  let buf = '';
  let prevKnown = false;
  const flush = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  let i = 0;
  while (i < run.length) {
    const ve = VERB_END.find((v) => run.startsWith(v, i));
    if (ve && buf) {
      out.push(buf + ve);
      buf = '';
      i += ve.length;
      prevKnown = true;
      continue;
    }
    const hit = longestAt(run, i);
    if (hit && (!buf || hit.length >= 3 || MID_OK.has(hit))) {
      flush();
      out.push(hit);
      i += hit.length;
      prevKnown = true;
      continue;
    }
    const c = run[i];
    if (SINGLE.has(c)) {
      const afterWord = prevKnown || buf.length >= 2;
      const beforeWord = !!longestAt(run, i + 1);
      const atEnd = i === run.length - 1;
      if ((afterWord && !(atEnd && !prevKnown && buf.length < 2)) || (beforeWord && !buf && !atEnd)) {
        flush();
        out.push(c);
        i += 1;
        prevKnown = true;
        continue;
      }
    }
    buf += c;
    prevKnown = false;
    i += 1;
  }
  flush();
  return out;
}

// Hiragana đi ngay sau danh từ: tách trợ từ ở đầu; phần còn lại tách theo từ đã biết.
function peelFunction(h) {
  if (NOT_PARTICLE_START.some((x) => h.startsWith(x))) return null;
  const words = [];
  let rest = h;
  while (rest) {
    if (NOT_PARTICLE_START.some((x) => rest.startsWith(x))) break;
    const f = AFTER_NOUN.find((w) => rest.startsWith(w));
    if (!f) break;
    words.push(f);
    rest = rest.slice(f.length);
  }
  if (!words.length) return null;
  const tail = rest ? splitRun(rest) : [];
  // が dễ nhầm với okurigana (上がる): chỉ tách khi phần sau là từ đã biết
  if (words[0] === 'が' && tail.length && !tail.every((w) => known(w) || VERB_END.some((v) => w.endsWith(v)))) return null;
  return [...words, ...tail];
}

const TOKEN = /([一-鿿々〆ヶ0-9０-９]+)|([ァ-ヴー]+)|([ぁ-ゖ]+)|(\s+)|([^])/g;
const typeOf = (m) => (m[1] ? 'kanji' : m[2] ? 'kata' : m[3] ? 'hira' : m[4] ? 'space' : 'punct');

// Ghép chữ Hán với cách đọc (có quay lui): mỗi token có `read` là kana tương ứng. null nếu không khớp.
function align(jp, kana) {
  const toks = [...jp.matchAll(TOKEN)].map((m) => ({ type: typeOf(m), text: m[0] }));
  const raw = kana.replace(/\s+/g, '');
  const target = toHiragana(raw);
  let maxPer = 3; // một chữ Hán thường đọc tối đa 3 kana (弟 おとうと, 兄弟 là ngoại lệ nên thử lại với giới hạn rộng)
  const solve = (t, pos) => {
    if (t === toks.length) return pos === target.length;
    const tok = toks[t];
    if (tok.type === 'space') { tok.read = ''; return solve(t + 1, pos); }
    if (tok.type !== 'kanji') {
      const lit = toHiragana(tok.text);
      if (!target.startsWith(lit, pos)) return false;
      tok.read = raw.slice(pos, pos + lit.length);
      return solve(t + 1, pos + lit.length);
    }
    // chữ Hán đọc từ pos tới chỗ xuất hiện chuỗi kana đứng sau (thử từng chỗ, sai thì quay lui)
    let anchor = '';
    for (let u = t + 1; u < toks.length && toks[u].type !== 'kanji'; u++) anchor += toHiragana(toks[u].text).replace(/\s+/g, '');
    if (!anchor) {
      if (target.length - pos > maxPer * [...tok.text].length) return false;
      tok.read = raw.slice(pos);
      return solve(t + 1, target.length);
    }
    for (let end = target.indexOf(anchor, pos + 1); end >= 0; end = target.indexOf(anchor, end + 1)) {
      if (end - pos > maxPer * [...tok.text].length) break; 
      tok.read = raw.slice(pos, end);
      if (solve(t + 1, end)) return true;
    }
    return false;
  };
  for (maxPer of [3, 5, 99]) if (solve(0, 0)) return toks;
  return null;
}

function rawWords(jp, kana) {
  const toks = jp && jp !== kana ? align(jp, kana) : null;
  if (!toks) {
    // không có câu gốc hoặc không ghép được: tách theo dấu câu/katakana, rồi theo từ đã biết
    return kana.split(/([、。？！?!，．,.])/).flatMap((chunk) => {
      if (!chunk.trim()) return [];
      if (/^[、。？！?!，．,.]$/.test(chunk)) return [{ w: chunk, punct: true }];
      return chunk.split(/([ァ-ヴー]+)/).flatMap((part) =>
        /^[ァ-ヴー]+$/.test(part) ? [{ w: part }] : part ? splitRun(toHiragana(part)).map((w) => ({ w })) : [],
      );
    });
  }

  const words = [];
  const push = (w) => { if (w) words.push({ w }); };
  let cur = ''; // từ đang ghép (chữ Hán + okurigana)
  const endWord = () => { push(cur); cur = ''; };
  toks.forEach((tok, i) => {
    const prev = toks[i - 1];
    const next = toks[i + 1];
    if (tok.type === 'space') { endWord(); return; }
    if (tok.type === 'punct') { endWord(); words.push({ w: tok.read, punct: true }); return; }
    if (tok.type === 'kata') { endWord(); push(tok.read); return; }
    if (tok.type === 'kanji') {
      // chữ Hán ngay sau tiền tố お/ご (お兄ちゃん) hoặc sau okurigana (食べ物) thì dính vào từ đang ghép
      if (!(prev && prev.type === 'hira' && cur)) endWord();
      cur += tok.read;
      return;
    }

    // ---- hiragana ----
    let run = tok.read;
    const h = toHiragana(run);
    const afterKanji = prev && prev.type === 'kanji';
    const afterContent = afterKanji || (prev && prev.type === 'kata');
    const beforeKanji = next && next.type === 'kanji';

    // 晩ご飯: ご nằm giữa hai cụm chữ Hán -> cùng một từ
    if (afterKanji && beforeKanji && /^[おご]$/.test(h)) { cur += run; return; }
    // お/ご ở cuối khối, ngay trước chữ Hán: tiền tố lịch sự
    let prefix = '';
    if (beforeKanji && /[おご]$/.test(h)) {
      prefix = run.slice(-1);
      run = run.slice(0, -1);
    }

    if (run) {
      if (afterContent) {
        const peeled = peelFunction(toHiragana(run));
        const lead = longestAt(toHiragana(run), 0, 3);
        if (peeled) {
          endWord();
          peeled.forEach(push);
        } else if (afterKanji && !(lead && !FUNC.has(lead))) {
          // okurigana: dính vào động từ/tính từ; chỉ tách đuôi (ね, よ, ください, から...)
          let body = run;
          const tail = [];
          for (let guard = 0; guard < 4; guard++) {
            const hb = toHiragana(body);
            const t = TAIL_MULTI.find((x) => hb.length > x.length && hb.endsWith(x))
              || Object.keys(TAIL_SINGLE).find((x) => hb.length >= TAIL_SINGLE[x] && hb.endsWith(x));
            if (!t) break;
            tail.unshift(t);
            body = body.slice(0, -t.length);
          }
          cur += body;
          endWord();
          tail.forEach(push);
        } else {
          endWord();
          splitRun(toHiragana(run)).forEach(push);
        }
      } else {
        endWord();
        splitRun(toHiragana(run)).forEach(push);
      }
    } else {
      endWord();
    }
    if (prefix) cur = prefix;
  });
  endWord();
  return words;
}

// Trả về mảng { w: kana của từ, punct?: true }
export function sentenceWords(jp, kana) {
  // ですか -> です + か (đọc "desu ka"), だよ -> だ + よ
  return rawWords(jp, kana).flatMap((x) => {
    const m = !x.punct && /^(です|だ)(か|よ|ね|が)$/.exec(toHiragana(x.w));
    return m ? [{ w: m[1] }, { w: m[2] }] : [x];
  });
}

const PUNCT_OUT = { '、': ',', '，': ',', ',': ',', '。': '.', '．': '.', '.': '.', '！': '!', '!': '!', '？': '?', '?': '?' };

// kana: cách đọc cả câu; jp: câu viết bình thường (để biết ranh giới từ), không bắt buộc.
export function sentenceRomaji(kana, jp = '') {
  if (!kana) return '';
  let out = '';
  sentenceWords(jp, kana).forEach((x) => {
    if (x.punct) {
      out += PUNCT_OUT[x.w] || x.w;
      return;
    }
    const h = toHiragana(x.w);
    let base = x.w;
    if (PARTICLE_SOUND[h]) base = PARTICLE_SOUND[h];
    else if (FUNC.has(h) && h.length > 1 && /[はへ]$/.test(h)) base = h.slice(0, -1) + PARTICLE_SOUND[h.slice(-1)]; // では, には, とは
    out += (out && !/[ (]$/.test(out) ? ' ' : '') + kanaToRomaji(base);
  });
  return out.trim().replace(/(^|[.?!] )([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// Thẻ chỉ có một trợ từ (は/を/へ) thì hiện cách đọc trợ từ; còn lại để Word tự đọc.
export function particleRomaji(kana) {
  const h = toHiragana(kana || '');
  return PARTICLE_SOUND[h] ? kanaToRomaji(PARTICLE_SOUND[h]) : undefined;
}
