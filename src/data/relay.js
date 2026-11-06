// "Truyền tin" relay scenarios.
// Each step: `from` says `message` to you, you must relay it to `to`.
// `model` is a sample relay; scoring checks `keypoints` (any accepted form) plus
// overall similarity to the model sentence.

const p = (name, kana, role, glyph, tone) => ({ name, kana, role, glyph, tone });
const s = (jp, kana, vi) => ({ jp, kana, vi });
const k = (label, vi, accept) => ({ label, vi, accept });

export const SCENARIOS = [
  {
    id: 'hop-doi-gio',
    title: 'Cuộc họp đổi giờ',
    place: 'Văn phòng',
    level: 'N4',
    cast: {
      tanaka: p('田中さん', 'たなかさん', 'Đồng nghiệp', '田', 'ai'),
      bucho: p('部長', 'ぶちょう', 'Trưởng phòng', '部', 'shu'),
    },
    steps: [
      {
        from: 'tanaka', to: 'bucho',
        message: s('すみません、部長に伝えてください。会議は三時からになりました。',
          'すみません、ぶちょうにつたえてください。かいぎはさんじからになりました。',
          'Xin lỗi, nhờ bạn nói với trưởng phòng: cuộc họp chuyển sang bắt đầu từ 3 giờ.'),
        model: s('部長、会議は三時からになったそうです。',
          'ぶちょう、かいぎはさんじからになったそうです。',
          'Thưa trưởng phòng, nghe nói cuộc họp sẽ bắt đầu từ 3 giờ.'),
        keypoints: [
          k('Việc gì', 'cuộc họp', ['会議', 'かいぎ', 'ミーティング']),
          k('Khi nào', '3 giờ', ['三時', '3時', 'さんじ', '15時', 'じゅうごじ']),
        ],
      },
      {
        from: 'bucho', to: 'tanaka',
        message: s('わかりました。じゃ、資料を十部コピーしておいてください、と田中さんに言ってください。',
          'わかりました。じゃ、しりょうをじゅうぶコピーしておいてください、とたなかさんにいってください。',
          'Tôi hiểu rồi. Vậy nhờ nói với anh Tanaka hãy photo sẵn 10 bộ tài liệu.'),
        model: s('田中さん、部長が資料を十部コピーしておいてくださいと言っていました。',
          'たなかさん、ぶちょうがしりょうをじゅうぶコピーしておいてくださいといっていました。',
          'Anh Tanaka, trưởng phòng dặn anh photo sẵn 10 bộ tài liệu.'),
        keypoints: [
          k('Cái gì', 'tài liệu', ['資料', 'しりょう']),
          k('Bao nhiêu', '10 bộ', ['十部', '10部', 'じゅうぶ', 'じゅっぷ', '10']),
          k('Làm gì', 'photo', ['コピー', 'こぴ']),
        ],
      },
    ],
  },
  {
    id: 'loi-nhan-dien-thoai',
    title: 'Lời nhắn qua điện thoại',
    place: 'Văn phòng',
    level: 'N4',
    cast: {
      yamada: p('山田さん', 'やまださん', 'Khách hàng (gọi điện)', '山', 'matcha'),
      suzuki: p('鈴木さん', 'すずきさん', 'Đồng nghiệp', '鈴', 'ai'),
    },
    steps: [
      {
        from: 'yamada', to: 'suzuki',
        message: s('山田です。明日の約束ですが、十時ではなく十一時にしてください。',
          'やまだです。あしたのやくそくですが、じゅうじではなくじゅういちじにしてください。',
          'Tôi là Yamada. Về cuộc hẹn ngày mai, xin đổi từ 10 giờ sang 11 giờ.'),
        model: s('鈴木さん、山田さんから電話がありました。明日の約束を十一時にしてほしいそうです。',
          'すずきさん、やまださんからでんわがありました。あしたのやくそくをじゅういちじにしてほしいそうです。',
          'Anh Suzuki, anh Yamada gọi điện. Anh ấy muốn đổi cuộc hẹn ngày mai sang 11 giờ.'),
        keypoints: [
          k('Ai', 'anh Yamada', ['山田', 'やまだ']),
          k('Khi nào', 'ngày mai', ['明日', 'あした', 'あす']),
          k('Giờ mới', '11 giờ', ['十一時', '11時', 'じゅういちじ']),
        ],
      },
    ],
  },
  {
    id: 'loi-dan-thay-giao',
    title: 'Lời dặn của thầy giáo',
    place: 'Trường học',
    level: 'N5',
    cast: {
      sensei: p('先生', 'せんせい', 'Thầy giáo', '先', 'ai'),
      minna: p('クラスのみんな', 'くらすのみんな', 'Các bạn cùng lớp', '皆', 'yamabuki'),
    },
    steps: [
      {
        from: 'sensei', to: 'minna',
        message: s('明日は試験がありますから、辞書を持ってきてください、とみんなに伝えてください。',
          'あしたはしけんがありますから、じしょをもってきてください、とみんなにつたえてください。',
          'Ngày mai có bài thi nên các em hãy mang từ điển đến. Nhờ em nói với mọi người.'),
        model: s('みんな、明日は試験があるから、辞書を持ってきてって先生が言ってたよ。',
          'みんな、あしたはしけんがあるから、じしょをもってきてってせんせいがいってたよ。',
          'Mọi người ơi, thầy dặn mai có bài thi nên nhớ mang từ điển nhé.'),
        keypoints: [
          k('Khi nào', 'ngày mai', ['明日', 'あした']),
          k('Sự kiện', 'bài thi', ['試験', 'しけん', 'テスト']),
          k('Mang gì', 'từ điển', ['辞書', 'じしょ']),
        ],
      },
    ],
  },
  {
    id: 'bua-toi',
    title: 'Bữa tối ở nhà',
    place: 'Gia đình',
    level: 'N5',
    cast: {
      haha: p('お母さん', 'おかあさん', 'Mẹ', '母', 'sakura'),
      otouto: p('弟', 'おとうと', 'Em trai', '弟', 'matcha'),
    },
    steps: [
      {
        from: 'haha', to: 'otouto',
        message: s('晩ご飯は七時だから、それまでに帰ってきて、と弟に言ってね。',
          'ばんごはんはしちじだから、それまでにかえってきて、とおとうとにいってね。',
          'Bữa tối lúc 7 giờ nên dặn em trai về trước giờ đó nhé.'),
        model: s('お母さんが、晩ご飯は七時だから、それまでに帰ってきてって。',
          'おかあさんが、ばんごはんはしちじだから、それまでにかえってきてって。',
          'Mẹ bảo bữa tối lúc 7 giờ, về trước giờ đó nhé.'),
        keypoints: [
          k('Việc gì', 'bữa tối', ['晩ご飯', '晩御飯', 'ばんごはん', '夕ご飯', 'ゆうごはん', 'ご飯', 'ごはん']),
          k('Mấy giờ', '7 giờ', ['七時', '7時', 'しちじ', 'ななじ', '19時']),
          k('Dặn gì', 'về nhà', ['帰って', 'かえって', '帰る', 'かえる']),
        ],
      },
      {
        from: 'otouto', to: 'haha',
        message: s('ごめん、今日は友達の家で勉強するから、八時ごろ帰るよ。',
          'ごめん、きょうはともだちのいえでべんきょうするから、はちじごろかえるよ。',
          'Xin lỗi, hôm nay em học ở nhà bạn nên khoảng 8 giờ mới về.'),
        model: s('お母さん、弟は友達の家で勉強するから、八時ごろ帰るそうです。',
          'おかあさん、おとうとはともだちのいえでべんきょうするから、はちじごろかえるそうです。',
          'Mẹ ơi, em nó học ở nhà bạn nên khoảng 8 giờ mới về ạ.'),
        keypoints: [
          k('Ở đâu', 'nhà bạn', ['友達', 'ともだち']),
          k('Làm gì', 'học bài', ['勉強', 'べんきょう']),
          k('Mấy giờ về', 'khoảng 8 giờ', ['八時', '8時', 'はちじ', '20時']),
        ],
      },
    ],
  },
  {
    id: 'tau-bi-tre',
    title: 'Tàu bị trễ',
    place: 'Nhà ga',
    level: 'N4',
    cast: {
      ekiin: p('駅員さん', 'えきいんさん', 'Nhân viên nhà ga', '駅', 'ai'),
      linh: p('リンさん', 'りんさん', 'Bạn đi cùng', 'リ', 'sakura'),
    },
    steps: [
      {
        from: 'ekiin', to: 'linh',
        message: s('事故のため、電車が三十分ぐらい遅れています。',
          'じこのため、でんしゃがさんじゅっぷんぐらいおくれています。',
          'Do tai nạn, tàu đang bị trễ khoảng 30 phút.'),
        model: s('電車が事故で三十分ぐらい遅れているって。',
          'でんしゃがじこでさんじゅっぷんぐらいおくれているって。',
          'Nghe nói tàu bị trễ khoảng 30 phút vì tai nạn.'),
        keypoints: [
          k('Cái gì', 'tàu điện', ['電車', 'でんしゃ']),
          k('Bao lâu', '30 phút', ['三十分', '30分', 'さんじゅっぷん', 'さんじっぷん']),
          k('Tình trạng', 'bị trễ', ['遅れ', 'おくれ']),
        ],
      },
      {
        from: 'linh', to: 'ekiin',
        message: s('じゃ、バスで行ったほうがいいか、駅員さんに聞いてくれる？',
          'じゃ、バスでいったほうがいいか、えきいんさんにきいてくれる？',
          'Vậy hỏi nhân viên nhà ga giúp mình xem có nên đi xe buýt không?'),
        model: s('すみません、バスで行ったほうがいいですか。',
          'すみません、バスでいったほうがいいですか。',
          'Xin lỗi, tôi có nên đi bằng xe buýt không ạ?'),
        keypoints: [
          k('Phương tiện', 'xe buýt', ['バス', 'ばす']),
          k('Hỏi gì', 'có nên đi', ['ほうがいい', '行った', 'いった', '行く', 'いく']),
        ],
      },
      {
        from: 'ekiin', to: 'linh',
        message: s('はい、駅の前から空港行きのバスが十分おきに出ていますよ。',
          'はい、えきのまえからくうこういきのバスがじゅっぷんおきにでていますよ。',
          'Vâng, xe buýt đi sân bay chạy 10 phút một chuyến từ trước nhà ga.'),
        model: s('駅の前から空港行きのバスが十分おきに出ているって。',
          'えきのまえからくうこういきのバスがじゅっぷんおきにでているって。',
          'Có xe buýt đi sân bay từ trước nhà ga, 10 phút một chuyến.'),
        keypoints: [
          k('Ở đâu', 'trước nhà ga', ['駅の前', 'えきのまえ', '駅前', 'えきまえ']),
          k('Đi đâu', 'sân bay', ['空港', 'くうこう']),
          k('Bao lâu một chuyến', '10 phút', ['十分', '10分', 'じゅっぷん', 'じっぷん']),
        ],
      },
    ],
  },
  {
    id: 'nha-hang-het-cho',
    title: 'Nhà hàng hết chỗ',
    place: 'Nhà hàng',
    level: 'N4',
    cast: {
      tenin: p('店員さん', 'てんいんさん', 'Nhân viên nhà hàng', '店', 'yamabuki'),
      ken: p('健太', 'けんた', 'Bạn thân', '健', 'matcha'),
    },
    steps: [
      {
        from: 'tenin', to: 'ken',
        message: s('すみません、今満席なので、二十分ほどお待ちいただけますか。',
          'すみません、いままんせきなので、にじゅっぷんほどおまちいただけますか。',
          'Xin lỗi, hiện đã kín chỗ, quý khách chờ khoảng 20 phút được không ạ?'),
        model: s('今いっぱいだから、二十分ぐらい待ってほしいって。',
          'いまいっぱいだから、にじゅっぷんぐらいまってほしいって。',
          'Giờ kín chỗ rồi, họ nhờ mình chờ khoảng 20 phút.'),
        keypoints: [
          k('Tình trạng', 'kín chỗ', ['満席', 'まんせき', 'いっぱい']),
          k('Bao lâu', '20 phút', ['二十分', '20分', 'にじゅっぷん', 'にじっぷん']),
          k('Yêu cầu', 'chờ', ['待', 'まっ', 'まつ', 'まち']),
        ],
      },
      {
        from: 'ken', to: 'tenin',
        message: s('いいよ、待つって伝えて。名前はグエンです。',
          'いいよ、まつってつたえて。なまえはグエンです。',
          'Được, nói là mình chờ nhé. Tên là Nguyễn.'),
        model: s('じゃ、待ちます。名前はグエンです。',
          'じゃ、まちます。なまえはグエンです。',
          'Vậy chúng tôi sẽ chờ. Tên là Nguyễn.'),
        keypoints: [
          k('Trả lời', 'sẽ chờ', ['待', 'まち', 'まつ']),
          k('Tên', 'Nguyễn', ['グエン', 'ぐえん']),
        ],
      },
    ],
  },
  {
    id: 'ket-qua-kham',
    title: 'Kết quả khám bệnh',
    place: 'Bệnh viện',
    level: 'N4',
    cast: {
      uketsuke: p('受付の人', 'うけつけのひと', 'Lễ tân bệnh viện', '受', 'ai'),
      chichi: p('お父さん', 'おとうさん', 'Bố', '父', 'shu'),
    },
    steps: [
      {
        from: 'uketsuke', to: 'chichi',
        message: s('お父様の検査の結果は来週の月曜日に出ます。',
          'おとうさまのけんさのけっかはらいしゅうのげつようびにでます。',
          'Kết quả xét nghiệm của bố bạn sẽ có vào thứ Hai tuần sau.'),
        model: s('お父さん、検査の結果は来週の月曜日に出るって。',
          'おとうさん、けんさのけっかはらいしゅうのげつようびにでるって。',
          'Bố ơi, kết quả xét nghiệm thứ Hai tuần sau mới có.'),
        keypoints: [
          k('Cái gì', 'kết quả xét nghiệm', ['結果', 'けっか']),
          k('Tuần nào', 'tuần sau', ['来週', 'らいしゅう']),
          k('Thứ mấy', 'thứ Hai', ['月曜', 'げつよう']),
        ],
      },
    ],
  },
  {
    id: 'du-bao-thoi-tiet',
    title: 'Dự báo thời tiết',
    place: 'Ở nhà',
    level: 'N5',
    cast: {
      radio: p('ラジオ', 'らじお', 'Bản tin radio', '天', 'ai'),
      ane: p('お姉ちゃん', 'おねえちゃん', 'Chị gái', '姉', 'sakura'),
    },
    steps: [
      {
        from: 'radio', to: 'ane',
        message: s('明日は午後から雨が降るでしょう。気温は低く、寒くなりそうです。',
          'あしたはごごからあめがふるでしょう。きおんはひくく、さむくなりそうです。',
          'Ngày mai từ chiều sẽ có mưa. Nhiệt độ thấp, trời có vẻ sẽ lạnh.'),
        model: s('お姉ちゃん、明日は午後から雨で寒くなるって。',
          'おねえちゃん、あしたはごごからあめでさむくなるって。',
          'Chị ơi, mai từ chiều trời mưa và lạnh đấy.'),
        keypoints: [
          k('Khi nào', 'ngày mai', ['明日', 'あした']),
          k('Từ lúc nào', 'buổi chiều', ['午後', 'ごご']),
          k('Thời tiết', 'mưa', ['雨', 'あめ']),
          k('Nhiệt độ', 'lạnh', ['寒', 'さむ']),
        ],
      },
    ],
  },
  {
    id: 'cong-tac-osaka',
    title: 'Chuyến công tác Osaka',
    place: 'Văn phòng',
    level: 'N4',
    cast: {
      bucho: p('部長', 'ぶちょう', 'Trưởng phòng', '部', 'shu'),
      sato: p('佐藤さん', 'さとうさん', 'Đồng nghiệp', '佐', 'matcha'),
    },
    steps: [
      {
        from: 'bucho', to: 'sato',
        message: s('来週の大阪の出張は、佐藤さんにお願いしたいと伝えてくれますか。新幹線の切符は私が準備します。',
          'らいしゅうのおおさかのしゅっちょうは、さとうさんにおねがいしたいとつたえてくれますか。しんかんせんのきっぷはわたしがじゅんびします。',
          'Nhờ cậu nói với anh Sato: tôi muốn nhờ anh ấy đi công tác Osaka tuần sau. Vé Shinkansen tôi sẽ chuẩn bị.'),
        model: s('佐藤さん、部長が来週の大阪出張をお願いしたいそうです。新幹線の切符は部長が準備するそうです。',
          'さとうさん、ぶちょうがらいしゅうのおおさかしゅっちょうをおねがいしたいそうです。しんかんせんのきっぷはぶちょうがじゅんびするそうです。',
          'Anh Sato, trưởng phòng muốn nhờ anh đi công tác Osaka tuần sau. Vé Shinkansen trưởng phòng sẽ chuẩn bị.'),
        keypoints: [
          k('Khi nào', 'tuần sau', ['来週', 'らいしゅう']),
          k('Đi đâu', 'Osaka', ['大阪', 'おおさか']),
          k('Việc gì', 'công tác', ['出張', 'しゅっちょう']),
          k('Vé tàu', 'vé Shinkansen', ['切符', 'きっぷ', 'チケット', '新幹線', 'しんかんせん']),
        ],
      },
      {
        from: 'sato', to: 'bucho',
        message: s('わかりました。でも、木曜日は午前中に別の会議があるので、午後から出発してもいいか聞いてください。',
          'わかりました。でも、もくようびはごぜんちゅうにべつのかいぎがあるので、ごごからしゅっぱつしてもいいかきいてください。',
          'Tôi hiểu. Nhưng sáng thứ Năm tôi có cuộc họp khác, nhờ hỏi giúp xuất phát từ buổi chiều có được không.'),
        model: s('部長、佐藤さんは木曜日の午前中に別の会議があるので、午後から出発してもいいですか、とのことです。',
          'ぶちょう、さとうさんはもくようびのごぜんちゅうにべつのかいぎがあるので、ごごからしゅっぱつしてもいいですか、とのことです。',
          'Thưa trưởng phòng, anh Sato có cuộc họp khác sáng thứ Năm nên hỏi có thể xuất phát từ chiều được không.'),
        keypoints: [
          k('Thứ mấy', 'thứ Năm', ['木曜', 'もくよう']),
          k('Lý do', 'có cuộc họp khác', ['会議', 'かいぎ']),
          k('Đề nghị', 'đi từ buổi chiều', ['午後', 'ごご']),
        ],
      },
    ],
  },
  {
    id: 'hen-tiec-thu-bay',
    title: 'Hẹn đi tiệc thứ Bảy',
    place: 'Bạn bè',
    level: 'N5',
    cast: {
      linh: p('リン', 'りん', 'Bạn cùng lớp', 'リ', 'sakura'),
      kenta: p('健太', 'けんた', 'Bạn thân', '健', 'matcha'),
    },
    steps: [
      {
        from: 'linh', to: 'kenta',
        message: s('土曜日のパーティー、六時に駅の北口で会おうって健太に言っておいて。',
          'どようびのパーティー、ろくじにえきのきたぐちであおうってけんたにいっておいて。',
          'Nhắn Kenta giúp mình: tiệc thứ Bảy, gặp nhau lúc 6 giờ ở cửa Bắc nhà ga nhé.'),
        model: s('健太、土曜日のパーティーは六時に駅の北口で会おうってリンが言ってたよ。',
          'けんた、どようびのパーティーはろくじにえきのきたぐちであおうってリンがいってたよ。',
          'Kenta ơi, Linh nói tiệc thứ Bảy gặp nhau lúc 6 giờ ở cửa Bắc nhà ga.'),
        keypoints: [
          k('Ngày nào', 'thứ Bảy', ['土曜', 'どよう']),
          k('Mấy giờ', '6 giờ', ['六時', '6時', 'ろくじ', '18時']),
          k('Ở đâu', 'cửa Bắc nhà ga', ['北口', 'きたぐち']),
        ],
      },
    ],
  },
];

export const scenarioById = (id) => SCENARIOS.find((sc) => sc.id === id);

export const DIFFICULTIES = {
  easy: { id: 'easy', label: 'Dễ', listens: 3, showText: true, delay: 0, desc: 'Nghe 3 lần, có hiện chữ' },
  medium: { id: 'medium', label: 'Vừa', listens: 2, showText: false, delay: 0, desc: 'Nghe 2 lần, chữ bị ẩn' },
  hard: { id: 'hard', label: 'Khó', listens: 1, showText: false, delay: 5, desc: 'Nghe 1 lần, chờ 5 giây rồi mới được nói' },
};
