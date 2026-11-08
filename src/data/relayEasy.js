// Bậc 1: very short relay messages with one idea each, built for beginners and young learners.
// Each step also carries `chunks` (the model sentence cut into word tiles, in order)
// and `extra` (decoy tiles) for the tile-building answer mode.
// Kept in its own file so it never conflicts with data/relay.js.

const p = (name, kana, role, glyph, tone) => ({ name, kana, role, glyph, tone });
const s = (jp, kana, vi) => ({ jp, kana, vi });
const k = (label, vi, accept) => ({ label, vi, accept });
const c = (jp, kana) => ({ jp, kana });

const haha = p('お母さん', 'おかあさん', 'Mẹ', '母', 'sakura');
const sensei = p('先生', 'せんせい', 'Cô giáo', '先', 'ai');
const minna = p('みんな', 'みんな', 'Các bạn trong lớp', '皆', 'yamabuki');

export const EASY_SCENARIOS = [
  {
    id: 'e-com-chin',
    tier: 1,
    title: 'Cơm chín rồi',
    place: 'Gia đình',
    level: 'N5',
    cast: { haha, ani: p('お兄ちゃん', 'おにいちゃん', 'Anh trai', '兄', 'ai') },
    steps: [
      {
        from: 'haha', to: 'ani',
        message: s('ごはんだよ、とお兄ちゃんに言ってね。', 'ごはんだよ、とおにいちゃんにいってね。', 'Cơm chín rồi, nói với anh nhé.'),
        model: s('お兄ちゃん、ごはんだよ。', 'おにいちゃん、ごはんだよ。', 'Anh ơi, ăn cơm thôi.'),
        chunks: [c('お兄ちゃん', 'おにいちゃん'), c('ごはん', 'ごはん'), c('だよ', 'だよ')],
        extra: [c('おやすみ', 'おやすみ')],
        keypoints: [
          k('Nhắn cho ai', 'anh trai', ['お兄ちゃん', 'おにいちゃん', '兄']),
          k('Việc gì', 'ăn cơm', ['ごはん', 'ご飯']),
        ],
      },
    ],
  },
  {
    id: 'e-di-boi',
    tier: 1,
    title: 'Ngày mai đi bơi',
    place: 'Trường học',
    level: 'N5',
    cast: { sensei, minna },
    steps: [
      {
        from: 'sensei', to: 'minna',
        message: s('あしたはプールです、とみんなに言ってね。', 'あしたはプールです、とみんなにいってね。', 'Ngày mai đi bơi, nói với mọi người nhé.'),
        model: s('みんな、あしたはプールだよ。', 'みんな、あしたはプールだよ。', 'Mọi người ơi, mai đi bơi nhé.'),
        chunks: [c('みんな', 'みんな'), c('あした', 'あした'), c('は', 'は'), c('プール', 'プール'), c('だよ', 'だよ')],
        extra: [c('きょう', 'きょう'), c('うみ', 'うみ')],
        keypoints: [
          k('Khi nào', 'ngày mai', ['あした', '明日']),
          k('Ở đâu', 'bể bơi', ['プール', 'ぷーる']),
        ],
      },
    ],
  },
  {
    id: 'e-mang-o',
    tier: 1,
    title: 'Nhớ mang ô',
    place: 'Gia đình',
    level: 'N5',
    cast: { haha, ane: p('お姉ちゃん', 'おねえちゃん', 'Chị gái', '姉', 'matcha') },
    steps: [
      {
        from: 'haha', to: 'ane',
        message: s('かさをもっていってね、とお姉ちゃんに言ってね。', 'かさをもっていってね、とおねえちゃんにいってね。', 'Mang ô theo nhé, nói với chị.'),
        model: s('お姉ちゃん、傘を持っていって。', 'おねえちゃん、かさをもっていって。', 'Chị ơi, mang ô theo nhé.'),
        chunks: [c('お姉ちゃん', 'おねえちゃん'), c('傘', 'かさ'), c('を', 'を'), c('持っていって', 'もっていって')],
        extra: [c('帽子', 'ぼうし')],
        keypoints: [
          k('Nhắn cho ai', 'chị gái', ['お姉ちゃん', 'おねえちゃん', '姉']),
          k('Mang gì', 'cái ô', ['傘', 'かさ']),
        ],
      },
    ],
  },
  {
    id: 'e-tiec-chu-nhat',
    tier: 1,
    title: 'Tiệc Chủ nhật',
    place: 'Bạn bè',
    level: 'N5',
    cast: {
      rin: p('リン', 'りん', 'Bạn thân', 'リ', 'sakura'),
      kenta: p('健太', 'けんた', 'Bạn của Rin', '健', 'matcha'),
    },
    steps: [
      {
        from: 'rin', to: 'kenta',
        message: s('パーティーは日曜日だよ、と健太に言ってね。', 'パーティーはにちようびだよ、とけんたにいってね。', 'Tiệc vào Chủ nhật, nói với Kenta nhé.'),
        model: s('健太、パーティーは日曜日だよ。', 'けんた、パーティーはにちようびだよ。', 'Kenta ơi, tiệc vào Chủ nhật đó.'),
        chunks: [c('健太', 'けんた'), c('パーティー', 'パーティー'), c('は', 'は'), c('日曜日', 'にちようび'), c('だよ', 'だよ')],
        extra: [c('土曜日', 'どようび'), c('月曜日', 'げつようび')],
        keypoints: [
          k('Nhắn cho ai', 'Kenta', ['健太', 'けんた']),
          k('Việc gì', 'bữa tiệc', ['パーティー', 'ぱーてぃー']),
          k('Ngày nào', 'Chủ nhật', ['日曜日', 'にちようび', '日曜']),
        ],
      },
    ],
  },
  {
    id: 'e-bai-tap',
    tier: 1,
    title: 'Bài tập 10 trang',
    place: 'Trường học',
    level: 'N5',
    cast: { sensei, minna },
    steps: [
      {
        from: 'sensei', to: 'minna',
        message: s('しゅくだいは十ページです、とみんなに言ってね。', 'しゅくだいはじゅうページです、とみんなにいってね。', 'Bài tập là 10 trang, nói với mọi người nhé.'),
        model: s('みんな、宿題は十ページです。', 'みんな、しゅくだいはじゅうページです。', 'Mọi người ơi, bài tập là 10 trang.'),
        chunks: [c('みんな', 'みんな'), c('宿題', 'しゅくだい'), c('は', 'は'), c('十ページ', 'じゅうページ'), c('です', 'です')],
        extra: [c('五ページ', 'ごページ'), c('本', 'ほん')],
        keypoints: [
          k('Việc gì', 'bài tập', ['宿題', 'しゅくだい']),
          k('Bao nhiêu', 'mười trang', ['十ページ', '10ページ', 'じゅうページ']),
        ],
      },
    ],
  },
  {
    id: 'e-mua-tao',
    tier: 1,
    title: 'Mua ba quả táo',
    place: 'Gia đình',
    level: 'N5',
    cast: { haha, chichi: p('お父さん', 'おとうさん', 'Bố', '父', 'shu') },
    steps: [
      {
        from: 'haha', to: 'chichi',
        message: s('りんごを三つ買ってきてね、とお父さんに言ってね。', 'りんごをみっつかってきてね、とおとうさんにいってね。', 'Mua 3 quả táo nhé, nói với bố.'),
        model: s('お父さん、りんごを三つ買ってきて。', 'おとうさん、りんごをみっつかってきて。', 'Bố ơi, mua giúp con 3 quả táo.'),
        chunks: [c('お父さん', 'おとうさん'), c('りんご', 'りんご'), c('を', 'を'), c('三つ', 'みっつ'), c('買ってきて', 'かってきて')],
        extra: [c('みかん', 'みかん'), c('二つ', 'ふたつ')],
        keypoints: [
          k('Nhắn cho ai', 'bố', ['お父さん', 'おとうさん', '父']),
          k('Mua gì', 'quả táo', ['りんご', '林檎']),
          k('Bao nhiêu', 'ba quả', ['三つ', 'みっつ', '3つ']),
        ],
      },
    ],
  },
  {
    id: 'e-da-ngoai',
    tier: 1,
    title: 'Ngày mai đi dã ngoại',
    place: 'Trường học',
    level: 'N5',
    cast: { sensei, tomo: p('友達', 'ともだち', 'Bạn cùng lớp', '友', 'yamabuki') },
    steps: [
      {
        from: 'sensei', to: 'tomo',
        message: s('あしたはえんそくです、と友達に言ってね。', 'あしたはえんそくです、とともだちにいってね。', 'Ngày mai đi dã ngoại, nói với bạn nhé.'),
        model: s('友達、あしたは遠足です。', 'ともだち、あしたはえんそくです。', 'Bạn ơi, mai đi dã ngoại đó.'),
        chunks: [c('友達', 'ともだち'), c('あした', 'あした'), c('は', 'は'), c('遠足', 'えんそく'), c('です', 'です')],
        extra: [c('運動会', 'うんどうかい'), c('きょう', 'きょう')],
        keypoints: [
          k('Khi nào', 'ngày mai', ['あした', '明日']),
          k('Việc gì', 'đi dã ngoại', ['遠足', 'えんそく']),
        ],
      },
    ],
  },
];
