// Romaji <-> kana utilities.
// The typing engine is target-driven: given the kana of a word, it accepts any
// common romanization (Hepburn, Kunrei, IME-style), so "shi"/"si", "tsu"/"tu",
// "n"/"nn" and doubled consonants for っ all work.

const BASE = {
  あ: ['a'], い: ['i'], う: ['u', 'wu'], え: ['e'], お: ['o'],
  か: ['ka', 'ca'], き: ['ki'], く: ['ku', 'cu'], け: ['ke'], こ: ['ko', 'co'],
  さ: ['sa'], し: ['shi', 'si', 'ci'], す: ['su'], せ: ['se', 'ce'], そ: ['so'],
  た: ['ta'], ち: ['chi', 'ti'], つ: ['tsu', 'tu'], て: ['te'], と: ['to'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha', 'wa'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he', 'e'], ほ: ['ho'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'],
  ら: ['ra', 'la'], り: ['ri', 'li'], る: ['ru', 'lu'], れ: ['re', 'le'], ろ: ['ro', 'lo'],
  わ: ['wa'], を: ['wo', 'o'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  だ: ['da'], ぢ: ['di', 'ji'], づ: ['du', 'zu'], で: ['de'], ど: ['do'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
  ゔ: ['vu'],
  ぁ: ['xa', 'la'], ぃ: ['xi', 'li'], ぅ: ['xu', 'lu'], ぇ: ['xe', 'le'], ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'], ゅ: ['xyu', 'lyu'], ょ: ['xyo', 'lyo'], ゎ: ['xwa', 'lwa'],
  ー: ['-'],
};

const YOON_ROWS = {
  き: ['ky'], ぎ: ['gy'], に: ['ny'], ひ: ['hy'], び: ['by'], ぴ: ['py'], み: ['my'], り: ['ry', 'ly'],
};
const COMBO = {};
for (const [k, prefixes] of Object.entries(YOON_ROWS)) {
  COMBO[k + 'ゃ'] = prefixes.map((p) => p + 'a');
  COMBO[k + 'ゅ'] = prefixes.map((p) => p + 'u');
  COMBO[k + 'ょ'] = prefixes.map((p) => p + 'o');
}
Object.assign(COMBO, {
  しゃ: ['sha', 'sya'], しゅ: ['shu', 'syu'], しぇ: ['she', 'sye'], しょ: ['sho', 'syo'],
  ちゃ: ['cha', 'tya', 'cya'], ちゅ: ['chu', 'tyu', 'cyu'], ちぇ: ['che', 'tye', 'cye'], ちょ: ['cho', 'tyo', 'cyo'],
  じゃ: ['ja', 'zya', 'jya'], じゅ: ['ju', 'zyu', 'jyu'], じぇ: ['je', 'zye', 'jye'], じょ: ['jo', 'zyo', 'jyo'],
  ぢゃ: ['dya'], ぢゅ: ['dyu'], ぢょ: ['dyo'],
  ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'], ふゅ: ['fyu'],
  てぃ: ['thi'], でぃ: ['dhi'], でゅ: ['dhu'], とぅ: ['twu'], どぅ: ['dwu'],
  うぃ: ['wi'], うぇ: ['we'], うぉ: ['who'],
  ゔぁ: ['va'], ゔぃ: ['vi'], ゔぇ: ['ve'], ゔぉ: ['vo'],
  つぁ: ['tsa'], くぁ: ['kwa', 'qa'],
});

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

export function toHiragana(str = '') {
  return str.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function isKana(str) {
  return /^[぀-ヿ]+$/.test(str);
}

// Split kana into units, each with a list of accepted romaji spellings.
export function tokenize(kana) {
  const h = toHiragana(kana);
  const raw = [];
  for (let i = 0; i < h.length; i++) {
    const pair = h.slice(i, i + 2);
    if (COMBO[pair]) {
      raw.push({ kana: pair, opts: COMBO[pair] });
      i++;
    } else if (BASE[h[i]]) {
      raw.push({ kana: h[i], opts: BASE[h[i]] });
    } else if (h[i] === 'っ' || h[i] === 'ん') {
      raw.push({ kana: h[i], opts: null });
    }
    // anything else (spaces, punctuation) is ignored
  }
  // resolve っ and ん which depend on the following unit
  const units = [];
  for (let i = 0; i < raw.length; i++) {
    const u = raw[i];
    const next = raw[i + 1];
    if (u.kana === 'っ') {
      if (next && next.opts) {
        const doubled = next.opts
          .filter((o) => !VOWELS.has(o[0]) && o[0] !== 'n' && o[0] !== '-')
          .map((o) => o[0] + o);
        next.opts.filter((o) => o.startsWith('ch')).forEach((o) => doubled.push('t' + o));
        const small = ['xtu', 'ltu', 'xtsu'].flatMap((p) => next.opts.map((o) => p + o));
        units.push({ kana: 'っ' + next.kana, opts: [...doubled, ...small] });
        i++;
      } else {
        units.push({ kana: 'っ', opts: ['xtu', 'ltu', 'xtsu'] });
      }
    } else if (u.kana === 'ん') {
      // Target-driven, so a single 'n' is always safe to accept
      // (konnichiha, kinen, honya all resolve against the known word).
      units.push({ kana: 'ん', opts: ['n', 'nn', "n'", 'xn'] });
    } else {
      units.push(u);
    }
  }
  return units;
}

// Is `input` a valid (partial) romanization of `units`?
// Returns { ok, done, unitsDone } where unitsDone counts fully typed units.
export function matchRomaji(units, input) {
  let best = { ok: false, done: false, unitsDone: 0 };
  const dfs = (ui, ii) => {
    if (ii === input.length) {
      const res = { ok: true, done: ui === units.length, unitsDone: ui };
      if (!best.ok || res.done || (!best.done && res.unitsDone > best.unitsDone)) best = res;
      return res.done;
    }
    if (ui >= units.length) return false;
    const rest = input.slice(ii);
    for (const o of units[ui].opts) {
      if (rest.startsWith(o)) {
        if (dfs(ui + 1, ii + o.length)) return true;
      } else if (o.startsWith(rest)) {
        if (!best.ok || (!best.done && ui > best.unitsDone)) best = { ok: true, done: false, unitsDone: ui };
      }
    }
    return false;
  };
  dfs(0, 0);
  return best;
}

// Canonical romaji for display (first option of every unit).
export function kanaToRomaji(kana) {
  return tokenize(kana)
    .map((u, idx, arr) => {
      if (u.kana === 'ん') {
        const next = arr[idx + 1];
        const needsApos = next && /^[aiueoy]/.test(next.opts[0]);
        return needsApos ? "n'" : 'n';
      }
      return u.opts[0];
    })
    .join('')
    .replace(/n'(?=[^aiueoy])/g, 'n')
    // greetings like こんにちは / こんばんは are pronounced "wa"
    .replace(/(nichi|ban)ha$/, '$1wa');
}

// Free-form romaji -> hiragana (used for typed answers without a known target).
const REVERSE = (() => {
  const map = {};
  const add = (k, opts) => opts.forEach((o) => { if (!map[o]) map[o] = k; });
  Object.entries(COMBO).forEach(([k, o]) => add(k, o));
  Object.entries(BASE).forEach(([k, o]) => add(k, o));
  map.wa = 'わ'; map.o = 'お'; map.e = 'え'; map.u = 'う';
  return map;
})();

export function romajiToKana(input) {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const n1 = s[i + 1];
    if (c === 'n') {
      if (n1 === undefined) { out += 'ん'; i++; continue; }
      if (n1 === "'") { out += 'ん'; i += 2; continue; }
      if (n1 === 'n') {
        const n2 = s[i + 2];
        if (n2 && (VOWELS.has(n2) || n2 === 'y')) { out += 'ん'; i += 1; } else { out += 'ん'; i += 2; }
        continue;
      }
      if (!VOWELS.has(n1) && n1 !== 'y') { out += 'ん'; i++; continue; }
    }
    if (n1 && c === n1 && /[bcdfghjklmpqrstvwxyz]/.test(c)) { out += 'っ'; i++; continue; }
    if (c === 't' && s.slice(i + 1, i + 4) === 'chi') { out += 'っ'; i++; continue; }
    let matched = false;
    for (let len = 4; len >= 1; len--) {
      const chunk = s.slice(i, i + len);
      if (REVERSE[chunk]) { out += REVERSE[chunk]; i += len; matched = true; break; }
    }
    if (!matched) { out += c; i++; }
  }
  return out;
}

// Furigana helper: split a word into [{text, ruby?}] by trimming shared kana
// at the start and end, e.g. 食べる/たべる -> 食(た) + べる.
export function rubyParts(jp, kana) {
  if (!kana || jp === kana || isKana(jp)) return [{ text: jp }];
  const h = toHiragana(kana);
  const hj = toHiragana(jp);
  let pre = 0;
  while (pre < jp.length && pre < h.length && hj[pre] === h[pre] && isKana(jp[pre])) pre++;
  let suf = 0;
  while (
    suf < jp.length - pre && suf < h.length - pre &&
    hj[jp.length - 1 - suf] === h[h.length - 1 - suf] && isKana(jp[jp.length - 1 - suf])
  ) suf++;
  const parts = [];
  if (pre) parts.push({ text: jp.slice(0, pre) });
  parts.push({ text: jp.slice(pre, jp.length - suf), ruby: kana.slice(pre, kana.length - suf) });
  if (suf) parts.push({ text: jp.slice(jp.length - suf) });
  return parts;
}

// Normalization for comparing spoken/typed Japanese.
const FW_DIGITS = /[０-９]/g;
export function normalizeJa(str = '') {
  let s = str.trim();
  if (/^[a-z0-9\s'.,!?-]+$/i.test(s) && /[a-z]/i.test(s)) s = romajiToKana(s.replace(/[\s.,!?]/g, ''));
  return toHiragana(s)
    .replace(FW_DIGITS, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[\s、。，．,.!?！？「」『』（）()・…〜~ー―-]/g, '');
}

// Longest common subsequence ratio, 0..1
export function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length] / Math.max(a.length, b.length);
}

// Romaji for a full sentence: keeps clause punctuation so it stays readable.
export function sentenceRomaji(kana) {
  return kana
    .split(/([、。？！?!])/)
    .map((chunk) => {
      if (chunk === '、') return ', ';
      if (/[。？！?!]/.test(chunk)) return chunk === '。' ? '. ' : '? ';
      return chunk ? kanaToRomaji(chunk) : '';
    })
    .join('')
    .trim()
    .replace(/(^|\. |\? )([a-z])/g, (m, a, b) => a + b.toUpperCase());
}
