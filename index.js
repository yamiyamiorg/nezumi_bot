const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    AttachmentBuilder,
    ActionRowBuilder, // 💡 追加
    ButtonBuilder,    // 💡 追加
    ButtonStyle       // 💡 追加
} = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 💡 インテントの設定は、ここではなく「Client」を作る場所で行います
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions, // ⬅️ これでリアクションが検知可能になります！
    ],
});



const tarotCards = [
    { name: '0. 愚者', tone: 'positive', upright: '自由、冒険、新しい始まり', reversed: '無計画、わがまま、不注意', image: '00_Fool.jpg' },
    { name: 'I. 魔術師', tone: 'positive', upright: '創造、才能、自信', reversed: '混迷、消極的、技術不足', image: '01_Magician.jpg' },
    { name: 'II. 女教皇', tone: 'neutral', upright: '直感、知性、静寂', reversed: 'わがまま、神経質、批判的', image: '02_High_Priestess.jpg' },
    { name: 'III. 女帝', tone: 'positive', upright: '豊穣、母性、愛情', reversed: 'わがまま、嫉嫉、停滞', image: '03_Empress.jpg' },
    { name: 'IV. 皇帝', tone: 'positive', upright: '支配、安定、責任', reversed: '独裁、傲慢、無責任', image: '04_Emperor.jpg' },
    { name: 'V. 教皇', tone: 'positive', upright: '慈悲、連帯、信頼', reversed: '保守的、不信感、束縛', image: '05_Hierophant.jpg' },
    { name: 'VI. 恋人', tone: 'positive', upright: '選択、情熱、調和', reversed: '誘惑、不調和、優柔不断', image: '06_Lovers.jpg' },
    { name: 'VII. 戦車', tone: 'positive', upright: '勝利、前進、自制心', reversed: '暴走、挫折、好戦的', image: '07_Chariot.jpg' },
    { name: 'VIII. 正義', tone: 'neutral', upright: '公正、均衡、正しい判断', reversed: '不当、偏見、優柔不断', image: '08_Justice.jpg' },
    { name: 'IX. 隠者', tone: 'neutral', upright: '内省、探求、孤独', reversed: '閉鎖的、陰湿、疑い深い', image: '09_Hermit.jpg' },
    { name: 'X. 運命の輪', tone: 'positive', upright: '幸運、転換点、チャンス', reversed: '暗転、不運、一時的な停滞', image: '10_Wheel_of_Fortune.jpg' },
    { name: 'XI. 力', tone: 'positive', upright: '勇気、忍耐、強い意志', reversed: '自信喪失、甘え、無力', image: '11_Strength.jpg' },
    { name: 'XII. 刑死者', tone: 'neutral', upright: '忍耐、奉仕、視点の変化', reversed: '報われない、わがまま、無駄な努力', image: '12_Hanged_Man.jpg' },
    { name: 'XIII. 死神', tone: 'negative', upright: '終焉、再出発、変化', reversed: '執着、停滞、再起への不安', image: '13_Death.jpg' },
    { name: 'XIV. 節制', tone: 'positive', upright: '調和、自制、献身', reversed: '消耗、不摂生、不調和', image: '14_Temperance.jpg' },
    { name: 'XV. 悪魔', tone: 'negative', upright: '誘惑、束縛、執着', reversed: '解放、覚醒、再生', image: '15_Devil.jpg' },
    { name: 'XVI. 塔', tone: 'negative', upright: '崩壊、災難、突然の変化', reversed: '緊迫、不名誉、屈辱', image: '16_Tower.jpg' },
    { name: 'XVII. 星', tone: 'positive', upright: '希望、願い、ひらめき', reversed: '失望、無力感、高望み', image: '17_Star.jpg' },
    { name: 'XVIII. 月', tone: 'negative', upright: '不安、迷い、潜在意識', reversed: '不安の解消、好転、徐々に明るくなる', image: '18_Moon.jpg' },
    { name: 'XIX. 太陽', tone: 'positive', upright: '成功、誕生、明るい未来', reversed: '不調、延期、衰退', image: '19_Sun.jpg' },
    { name: 'XX. 審判', tone: 'positive', upright: '復活、再生、覚醒', reversed: '再起不能、後悔、行き詰まり', image: '20_Judgement.jpg' },
    { name: 'XXI. 世界', tone: 'positive', upright: '完成、成功、完璧', reversed: '未完成、中途半端、スランプ', image: '21_World.jpg' }
];

    // 主要都市の座標データ（例として一部抜粋）
    const prefCoords = {
    '北海道': { lat: 43.06, lon: 141.35 }, '青森': { lat: 40.82, lon: 140.74 },
    '岩手': { lat: 39.70, lon: 141.15 }, '宮城': { lat: 38.27, lon: 140.87 },
    '秋田': { lat: 39.72, lon: 140.10 }, '山形': { lat: 38.26, lon: 140.36 },
    '福島': { lat: 37.75, lon: 140.47 }, '茨城': { lat: 36.34, lon: 140.45 },
    '栃木': { lat: 36.57, lon: 139.88 }, '群馬': { lat: 36.39, lon: 139.06 },
    '埼玉': { lat: 35.86, lon: 139.65 }, '千葉': { lat: 35.61, lon: 140.12 },
    '東京': { lat: 35.69, lon: 139.69 }, '神奈川': { lat: 35.45, lon: 139.64 },
    '新潟': { lat: 37.90, lon: 139.02 }, '富山': { lat: 36.70, lon: 137.21 },
    '石川': { lat: 36.59, lon: 136.63 }, '福井': { lat: 36.07, lon: 136.22 },
    '山梨': { lat: 35.66, lon: 138.57 }, '長野': { lat: 36.65, lon: 138.18 },
    '岐阜': { lat: 35.39, lon: 136.72 }, '静岡': { lat: 34.98, lon: 138.38 },
    '愛知': { lat: 35.18, lon: 136.91 }, '三重': { lat: 34.73, lon: 136.51 },
    '滋賀': { lat: 35.00, lon: 135.87 }, '京都': { lat: 35.02, lon: 135.76 },
    '大阪': { lat: 34.69, lon: 135.50 }, '兵庫': { lat: 34.69, lon: 135.18 },
    '奈良': { lat: 34.69, lon: 135.83 }, '和歌山': { lat: 34.23, lon: 135.17 },
    '鳥取': { lat: 35.50, lon: 134.24 }, '島根': { lat: 35.47, lon: 133.05 },
    '岡山': { lat: 34.66, lon: 133.93 }, '広島': { lat: 34.40, lon: 132.46 },
    '山口': { lat: 34.19, lon: 131.47 }, '徳島': { lat: 34.07, lon: 134.56 },
    '香川': { lat: 34.34, lon: 134.04 }, '愛媛': { lat: 33.84, lon: 132.77 },
    '高知': { lat: 33.56, lon: 133.53 }, '福岡': { lat: 33.61, lon: 130.42 },
    '佐賀': { lat: 33.25, lon: 130.30 }, '長崎': { lat: 32.75, lon: 129.88 },
    '熊本': { lat: 32.79, lon: 130.74 }, '大分': { lat: 33.24, lon: 131.61 },
    '宮崎': { lat: 31.91, lon: 131.42 }, '鹿児島': { lat: 31.56, lon: 130.56 },
    '沖縄': { lat: 26.21, lon: 127.68 }
    };

const extraImages = {
    mouse: [
        { file: 'mouse01_hatsukanezumi.jpg', name: 'ハツカネズミ' },
        { file: 'mouse02_akanezumi.jpg', name: 'アカネズミ' },
        { file: 'mouse03_sunanezumi.jpg', name: 'スナネズミ' },
        { file: 'mouse04_hamster.jpg', name: 'ハムスター' },
        { file: 'mouse05_hatanezumi.jpg', name: 'ハタネズミ' },
        { file: 'mouse06_tobinezumi.jpg', name: 'トビネズミ' },
        { file: 'mouse07_yamane.jpg', name: 'ヤマネ' }
    ],
    rat: [
        { file: 'rat01_kumanezumi.jpg', name: 'クマネズミ' },
        { file: 'rat02_fansyrat.jpg', name: 'ファンシーラット' },
        { file: 'rat04_africaoninezumi.jpg', name: 'アフリカオニネズミ' },
        { file: 'rat03_dobunezumi.jpg', name: 'ドブネズミ' },
        { file: 'rat05_mizuhatanezumi.jpg', name: 'ミズハタネズミ' },
        { file: 'rat06_mekuranezumi.jpg', name: 'メクラネズミ' }
    ],
    not_mouse: [
        { file: 'not01_mouse.jpg', name: 'マウス' },
        { file: 'not02_namako_uminezumi.jpg', name: 'ナマコ（海鼠）' },
        { file: 'not03_hukuronezumi.jpg', name: 'フクロネズミ' },
        { file: 'not04_hanejinezumi.jpg', name: 'ハネジネズミ' },
        { file: 'not05_harinezumi.jpg', name: 'ハリネズミ' },
        { file: 'not06_kawanezumi.jpg', name: 'カワネズミ' },
        { file: 'not07_jakounezumi.jpg', name: 'ジャコウネズミ' },
        { file: 'not08_togarinezumi.jpg', name: 'トガリネズミ' },
        { file: 'not09_debanezumi.jpg', name: 'デバネズミ' },
        { file: 'not10_africatogenezumi.jpg', name: 'アフリカトゲネズミ' },
        { file: 'not11_morumotto.jpg', name: 'モルモット' },
        { file: 'not12_kapibara.jpg', name: 'カピバラ' },
        { file: 'not13_mara.jpg', name: 'マーラ' },
        { file: 'not14_tintira.jpg', name: 'チンチラ' },
        { file: 'not15_degu.jpg', name: 'デグー' },
        { file: 'not16_tobiusagi.jpg', name: 'トビウサギ' },
        { file: 'not17_biba.jpg', name: 'ビーバー' },
        { file: 'not18_kanngaru-nezumi.jpg', name: 'カンガルーネズミ' },
        { file: 'not19_horinezumi.jpg', name: 'ホリネズミ' },
    ]
};
    
//********************************************************************タロット*************************************************************************************************************
// --- [追加] 画像をダウンロードして、必要なら反転させる関数 ---
async function getCardImage(imageFileName, isReversed) {
    try {
        const imagePath = path.join(__dirname, 'images', imageFileName);

        let imageProcessor = sharp(imagePath)
            // 💡 1. リサイズする（幅500pxに固定し、高さは自動調整）
            .resize(500);
        
        if (isReversed) {
            imageProcessor = imageProcessor.flip();
        }

        // 💡 2. 圧縮設定（PNGのままでもいいですが、JPEGにすると劇的に軽くなります）
        // png({ quality: 80 }) や jpeg({ quality: 80 }) を使います
        // index.js の画像処理部分をさらに軽量化
        const processedImageBuffer = await imageProcessor
            .webp({ quality: 60 }) // 💡 WebPに変更し、画質を60%まで落とす（見た目はほぼ変わりません）
            .toBuffer();

        const filename = `n_${Math.floor(Math.random() * 1000)}.webp`; // 💡 拡張子も.webpに
        return new AttachmentBuilder(processedImageBuffer, { name: filename });

    } catch (error) {
        console.error('画像処理エラー:', error.message);
        return null; 
    }
}

// 1. スコア計算関数（パターンB：悪いカードの逆位置は緩和と捉える）
function calculateScore(card, isReversed) {
    if (card.tone === 'positive') {
        return isReversed ? 1 : 2;  // 正位置：大吉(+2)、逆位置：停滞(+1)
    } else if (card.tone === 'negative') {
        return isReversed ? -1 : -2; // 正位置：凶(-2)、逆位置：緩和(-1)
    } else {
        return 0; // 中立
    }
}
//* 2. メインの診断ロジック
function generateTarotStory(past, present, future) {
    const s1 = calculateScore(past.card, past.isReversed);
    const s2 = calculateScore(present.card, present.isReversed);
    const s3 = calculateScore(future.card, future.isReversed);
    const totalScore = s1 + s2 + s3;

    let storyType = "";
    let message = "";

    // 3. ねずみ風ストーリー判定
    if (s1 < s2 && s2 < s3) {
        if (s1 < 0) {
            storyType = "夜明け（V字回復） 🌅";
            message = "過去はボロボロのチーズみたいに大変だったけど、ついに光が見えてきたよ！これからは美味しいごちそうが待ってる予感がするんだ、ちゅ！";
        } else {
            storyType = "飛躍（右肩上がり） 🚀";
            message = "今の勢いは本物だよ！まるで大きなひまわりの種を見つけた時みたいに、どんどん良くなっていくよ。自信を持って進んでね！";
        }
    } else if (s1 > s2 && s2 > s3) {
        storyType = "警告（右肩下がり） ⚠️";
        message = "ううっ、なんだか嫌な予感がするよ……。今は無理に動かず、巣穴でじっとして体力を蓄えるのが一番。足元をよーく確認してね！";
    } else {
        storyType = "つかの間の停滞 ☕";
        if (totalScore >= 0) {
            message = "今はちょっと一休み。お気に入りの場所で毛づくろいでもして、エネルギーを貯めよう。またすぐに良い波がやってくるはずだよ、ちゅ！";
        } else {
            message = "周りがバタバタしてるけど、慌てちゃダメだよ。一歩ずつ、鼻をヒクヒクさせて慎重に進めば、きっと出口が見つかるからね。";
        }
    }

    return { storyType, totalScore, message };
}// --------------------------------------------------------
function getSingleCardComment(card, isReversed) {
    if (!isReversed) {
        // 正位置のとき
        if (card.tone === 'positive') return "わあ！とっても良いカードだね。今日は美味しいチーズに出会えるかも！ちゅ！";
        if (card.tone === 'negative') return "ちょっと怖いカードだけど、正位置なら「新しい出発」の意味もあるよ。鼻をヒクヒクさせて慎重に進もう！";
        return "落ち着いた運勢だね。たまには巣穴でゆっくり毛づくろいするのもいいと思うよ。";
    } else {
        // 逆位置のとき
        if (card.tone === 'positive') return "せっかくの良い運勢がひっくり返っちゃった。焦らずに、ひまわりの種でも食べて落ち着いてね。";
        if (card.tone === 'negative') return "運気が逆転して、悪いことが去っていくサインかも！これからどんどん良くなるよ、ちゅ！";
        return "なんだかソワソワしちゃうね。深呼吸して、尻尾を落ち着かせてから行動しよう！";
    }
}

//**********************************************************************************************ヒットアンドブロー********************************************************************************************** */

function generateAnswer() {
    const digits = ['0','1','2','3','4','5','6','7','8','9'];
    let res = "";
    for(let i=0; i<4; i++) {
        const idx = Math.floor(Math.random() * digits.length);
        res += digits.splice(idx, 1)[0];
    }
    return res;
}

function checkHitAndBlow(ans, gus) {
    let hit = 0, blow = 0;
    for(let i=0; i<4; i++) {
        if (gus[i] === ans[i]) hit++;
        else if (ans.includes(gus[i])) blow++;
    }
    return { hit, blow };
}


// Botのインスタンスを作成

//*****************************************************************************天気予報********************************************************************************************************************* */
function getWeatherStatus(code) {
    const codes = {
        0: '☀️ 快晴', 1: '🌤️ 晴れ', 2: '⛅ 時々曇り', 3: '☁️ 曇り',
        45: '🌫️ 霧', 48: '🌫️ 氷霧',
        51: '🌦️ 小雨', 53: '🌦️ 雨', 55: '🌧️ 激しい雨',
        61: '🌦️ 弱い雨', 63: '🌧️ 雨', 65: '🌊 豪雨',
        71: '❄️ 弱い雪', 73: '❄️ 雪', 75: '☃️ 豪雪',
        80: '🌦️ にわか雨', 81: '🌧️ 強いにわか雨', 82: '🌊 激しいにわか雨',
        95: '⛈️ 雷雨', 96: '⛈️ 雹を伴う雷雨', 99: '⛈️ 激しい雷雨'
    };
    return codes[code] || '❓ 不明';
}
function getMouseComment(code, rainProb, maxTemp) {
    // 1. 激しい天気の時 (雷雨や雪)
    if (code >= 95) return "ひえ〜っ、カミナリだ！おへそを隠して、安全なところでチーズを食べてよう... ⚡🧀";
    if (code >= 71) return "外は真っ白！雪合戦もいいけど、ねずみはコタツで丸くなりたいな ☃️❄️";

    // 2. 雨の心配がある時
    if (rainProb >= 60) return "雨が降りそうだよ！傘を忘れずにね。ねずみが濡れたら、乾かすのが大変なんだ ☂️🐭";
    if (rainProb >= 30) return "空模様が怪しいかも... 念のために折りたたみ傘を持っていくのが正解だね ☁️🌂";

    // 3. 気温に関するコメント
    if (maxTemp >= 32) return "暑すぎる〜！チーズが溶けてフォンデュになっちゃうよ。水分補給を忘れずにね！ 🔥💧";
    if (maxTemp <= 5) return "ぶるぶる... 今日はとっても寒いね。マフラーをしっかり巻いてお出かけしてね！ 🧣🧣";

    // 4. 平穏な時
    if (code <= 1) return "最高のお出かけ日和！ねずみもどこかへ遊びに行きたい気分だよ ☀️🌷";
    
    return "今日も一日、あなたにとって素敵な日になりますように！🐭✨";
}
//*******************************************************************************************ネズミクイズ*********************************************************************************************** */
// --- [追加] ジョーク画像の軽量化処理 ---
async function getJokeImage(fileName) {
    // 💡 絶対パスを作成
    const imagePath = path.resolve(__dirname, 'images', fileName);

    // 💡 ファイルが存在するかチェック（ログに出す）
    if (!fs.existsSync(imagePath)) {
        console.log(`❌ ファイル不在: ${imagePath}`); // これが out.log に出るはず
        return null;
    }

    try {
        // sharpで画像を読み込む
        const imageProcessor = sharp(imagePath);
        
        // 💡 [超軽量化] WebP形式に変換し、画質を60に設定
        const processedImageBuffer = await imageProcessor
            .webp({ quality: 60 }) 
            .toBuffer();

        // ランダムなファイル名を生成（キャッシュ対策）
        const randomName = `j_${Math.floor(Math.random() * 1000)}.webp`;

        // Discord用のAttachmentBuilderを作成
        return new AttachmentBuilder(processedImageBuffer, { name: randomName });
    } catch (error) {
        console.error(`❌ ジョーク画像の処理に失敗: ${error.message}`);
        return null;
    }
}
//****************************************************************************************コマンド処理・開始処理****************************************************************************************** */
// 1. ログイン確認用のコードを追加（client.onの上に入れる）
client.once('clientReady', async (c) => {
    console.log(`${c.user.tag} (ねずみタロット) がログインしました！🔮`);

    const data = [
        { name: 'tarot', description: 'タロットカードを1枚引きます' },
        { name: 'tarot3', description: '3枚のカードで過去・現在・未来を占います' },
        {
        name: 'hitandblow',
        description: '4桁の数字当てゲームに挑戦！',
        options: [{
            name: 'guess',
            type: 3, // STRING型
            description: '4桁の数字を入力（例: 1234）',
            required: true,
        }]
    },
    {
    name: 'weather',
    description: '指定した都道府県の1週間（7日間）の天気を教えます',
    options: [{
        name: 'prefecture',
        type: 3, // STRING
        description: '都道府県名を漢字で入力（例: 和歌山, 東京）',
        required: true,
    }]
    },
    { name: 'mouse', description: '可愛いマウスの画像を表示するよ、ちゅ！' },
    { name: 'rat', description: 'かっこいいラットの画像を表示するよ、ちゅ！' },
    { name: 'nezumi', description: 'ねずみの画像……かな？' },
    { name: 'quiz', description: 'この画像はねずみかな？クイズに挑戦！' },
    ];

    // 1. 拠点となるサーバーのIDを指定（ここにコピーしたIDを貼り付け）
    const guildIds = ['1450709451488100396','1455097564759330958']; 
    const guild = client.guilds.cache.get(guildIds);

   // 以前のグローバルコマンドが残っている場合は削除（混信を防ぐため）
    await client.application.commands.set([]);

    // 各ギルドに対してループで登録
    for (const id of guildIds) {
        try {
            const guild = client.guilds.cache.get(id);
            if (guild) {
                await guild.commands.set(data);
                console.log(`✅ サーバー [${guild.name}] にコマンドを登録しました。`);
            } else {
                console.warn(`⚠️ サーバーID [${id}] が見つかりません。Botが参加しているか確認してください。`);
            }
        } catch (error) {
            console.error(`❌ サーバーID [${id}] への登録中にエラーが発生しました:`, error.message);
        }
    }
    console.log('すべての指定サーバーへの登録処理が完了しました！✨');
});

//*******************************************************************************************メイン関数***************************************************************************************** */
// 2. メッセージ反応部分（全角スペースを除去し、構造を整理）
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // --- 1枚引き (/tarot) ---
	if (interaction.commandName === 'tarot') {
    await interaction.deferReply({ ephemeral: true }); // 自分だけに見える設定

    const selectedCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const isReversed = Math.random() < 0.5;

    // 💡 [追加] カードごとの「ねずみのささやき」を生成
    const mouseWhisper = getSingleCardComment(selectedCard, isReversed);

    const imageAttachment = await getCardImage(selectedCard.image, isReversed);

    const embed = new EmbedBuilder()
        .setColor(isReversed ? 0xFF6347 : 0x00FA9A)
        .setTitle(`🐭 ねずみの1枚引きお告げ: ${selectedCard.name}`)
        .setDescription(`**${isReversed ? '逆位置 🙃' : '正位置 ✨'}**`)
        .addFields(
            { name: 'カードの意味', value: isReversed ? selectedCard.reversed : selectedCard.upright },
            { name: 'ねずみのささやき', value: `*「${mouseWhisper}」*` } // 💡 ここにコメントを追加
        )
        .setFooter({ text: 'あなたに素敵な種が見つかりますように！ 🌻' });

    if (imageAttachment) {
        embed.setImage(`attachment://${imageAttachment.name}`);
        await interaction.editReply({ embeds: [embed], files: [imageAttachment] });
    } else {
        await interaction.editReply({ embeds: [embed], content: '画像の読み込みに失敗しちゃった、ちゅ……。' });
    }
}

	// --- 3枚引き (/tarot3) ---
	else if (interaction.commandName === 'tarot3') {
    	// 💡 ここも ephemeral: true にする
    	await interaction.deferReply({ ephemeral: true });
	
    	let deck = [...tarotCards];
    	const positions = ['過去 🕰️', '現在 📍', '未来 🚀'];
    	const drawnResults = []; // 診断用にデータを溜める配列
	
    	for (let i = 0; i < 3; i++) {
        	const randomIndex = Math.floor(Math.random() * deck.length);
        	const card = deck.splice(randomIndex, 1)[0];
        	const isReversed = Math.random() < 0.5;
	
        	// 診断ロジックに渡すために保存
        	drawnResults.push({ card, isReversed });
	
        	const imageAttachment = await getCardImage(card.image, isReversed);
	
        	const embed = new EmbedBuilder()
            	.setColor(isReversed ? 0xFF0000 : 0x00FF00)
            	.setTitle(`${positions[i]}: ${card.name}`)
            	.setDescription(`**${isReversed ? '逆位置 🙃' : '正位置 ✨'}**\n\n${isReversed ? card.reversed : card.upright}`);
	
        	if (imageAttachment) {
            	embed.setImage(`attachment://${imageAttachment.name}`);
            	await interaction.followUp({ embeds: [embed], files: [imageAttachment] ,ephemeral: true});
        	} else {
            	await interaction.followUp({ embeds: [embed], content: '画像の読み込みに失敗しました。',ephemeral: true });
        	}
    	}
	
    	// --- 🏆 3枚引き終わった後に総合診断を表示 ---
    	const storyResult = generateTarotStory(drawnResults[0], drawnResults[1], drawnResults[2]);
	
    	const storyEmbed = new EmbedBuilder()
        	.setColor(0x5865F2) // Discordのブランドカラー（青色）
        	.setTitle(`📖 あなたの物語: ${storyResult.storyType}`)
        	.setDescription(storyResult.message)
        	.setFooter({ text: 'タロットはあなたの可能性を示しています。' });
	
    	await interaction.followUp({ embeds: [storyEmbed] ,ephemeral: true});

        
    }

    else if (interaction.commandName === 'hitandblow') {
    await interaction.deferReply({ ephemeral: true });

    const guess = interaction.options.getString('guess');
    
    // 💡 本来はサーバーごとに正解を保持すべきですが、
    // まずは「実行するたびに正解が変わる1回勝負モード」で作ってみます。
    const answer = generateAnswer(); 
    const result = checkHitAndBlow(answer, guess);

    const embed = new EmbedBuilder()
        .setColor(result.hit === 4 ? 0xFFD700 : 0x0099FF)
        .setTitle('🔢 ヒットアンドブローの結果')
        .setDescription(`あなたの予想: **${guess}**`)
        .addFields(
            { name: '結果', value: `**${result.hit}** Hit / **${result.blow}** Blow`, inline: true },
            { name: '判定', value: result.hit === 4 ? '🎉 チーズの匂いがする！' : '何も落ちてないみたい...' }
        )
        .setFooter({ text: '※1回ごとに正解が変わるモードです。' });

    await interaction.editReply({ embeds: [embed] ,ephemeral: true });
    }

    //*
    else if (interaction.commandName === 'weather') {
    await interaction.deferReply({ ephemeral: true });
    const pref = interaction.options.getString('prefecture');



    const target = prefCoords[pref.replace(/都|道|府|県/g, '')]; // 「県」などを抜いても動くように

    if (!target) {
        return interaction.editReply('その都道府県の座標データが見つかりませんでした。',{ ephemeral: true});
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;
        const response = await axios.get(url);
        const daily = response.data.daily;

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`☀️ ${pref}の1週間予報`)
            .setDescription('ねずみが空模様を調べてきました！🐭');

        // 7日分のデータをループで追加
        for (let i = 0; i < 7; i++) {
        const code = daily.weathercode[i];
        const rainProb = daily.precipitation_probability_max[i];
        const maxTemp = daily.temperature_2m_max[i];
        const minTemp = daily.temperature_2m_min[i];
    
        const weatherStatus = getWeatherStatus(code);
        // 💡 ここで「ねずみの一言」を取得
        const mouseComment = getMouseComment(code, rainProb, maxTemp);

        embed.addFields({ 
            name: `📅 ${daily.time[i]}`, 
            // 💡 一言をメッセージに含める
            value: `${weatherStatus}\n💧 降水確率: ${rainProb}%\n🌡️ ${maxTemp}℃ / ${minTemp}℃\n💬 *${mouseComment}*`, 
            inline: false // 一言が長いので、inline: false（縦並び）の方が見やすいかもしれません
        });     
    }

        await interaction.editReply({ embeds: [embed]  ,ephemeral: true});
    } catch (error) {
        await interaction.editReply('天気情報の取得に失敗しました。',{ ephemeral: true});
    }
}
// --- 隠しコマンド: mouse / rat / nezumi ---
if (['mouse', 'rat', 'nezumi'].includes(interaction.commandName)) {
    await interaction.deferReply({ ephemeral: true });

    let selectedList = [];
    let titleMsg = "";

    if (interaction.commandName === 'mouse') {
        selectedList = extraImages.mouse;
        titleMsg = '🐭 可愛いねずみが見つかったよ！';
    } else if (interaction.commandName === 'rat') {
        selectedList = extraImages.rat;
        titleMsg = '🐀 かっこいいラットが登場だちゅ！';
    } else if (interaction.commandName === 'nezumi') {
        selectedList = extraImages.not_mouse;
        titleMsg = '🤔 これ……ねずみなのかなぁ……？';
    }

    // 💡 ランダムにオブジェクトを選択
    const chosen = selectedList[Math.floor(Math.random() * selectedList.length)];
    
    // 💡 [修正] 以前の直接ファイル読み込みを止め、新しい関数を呼び出す
    const attachment = await getJokeImage(chosen.file);
    
    if (attachment) {
        // 💡 [修正] AttachmentBuilderのname属性（WebP）を使うようにEmbedを調整
        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(titleMsg)
            .setDescription(`この子の名前は **${chosen.name}** だちゅ！`)
            .setImage(`attachment://${attachment.name}`); // 💡 生成されたファイル名を指定

        await interaction.editReply({ embeds: [embed], files: [attachment], ephemeral: true });
    } else {
        await interaction.editReply({ content: 'ごめんね、その子は今お散歩中みたいだちゅ……。', ephemeral: true });
    }
}
else if (interaction.commandName === 'quiz') {
    await interaction.deferReply({ ephemeral: true });

    // 💡 1. まず、正解を「ねずみ(true)」か「それ以外(false)」で 50:50 に決める
    const isNezumi = Math.random() < 0.5;
    
    let category;
    if (isNezumi) {
        // 💡 正解がねずみの場合：mouse か rat からランダムに選ぶ
        category = Math.random() < 0.5 ? 'mouse' : 'rat';
    } else {
        // 💡 正解がねずみじゃない場合：not_mouse を選ぶ
        category = 'not_mouse';
    }

    // 💡 2. 決まったカテゴリの中からランダムに1枚選ぶ
    const chosen = extraImages[category][Math.floor(Math.random() * extraImages[category].length)];

    const attachment = await getJokeImage(chosen.file);
    if (!attachment) return interaction.editReply({ content: '画像がお散歩中で見つからないちゅ…。', ephemeral: true });

    // --- 以下、ボタン作成と Embed 表示の処理 ---
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('correct_nezumi')
                .setLabel('ねずみだちゅ！')
                .setEmoji('🐭')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('incorrect_nezumi')
                .setLabel('ねずみじゃない！')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('❓ ねずみクイズ！')
        .setDescription('この画像の子は「ねずみ」かな？\n下のボタンを押して答えてね！')
        .setImage(`attachment://${attachment.name}`);

    const response = await interaction.editReply({ 
        embeds: [embed], 
        files: [attachment], 
        components: [row],
        ephemeral: true
    });

    // --- ボタン入力待ち以降の処理（変更なし） ---
    try {
        // 30秒間ボタン入力を待機
        const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

        const userChoice = (confirmation.customId === 'correct_nezumi');
        const isCorrect = (userChoice === isNezumi);

        const resultEmbed = new EmbedBuilder()
            .setColor(isCorrect ? 0x00FF00 : 0xFF0000)
            .setTitle(isCorrect ? '✨ 正解だちゅ！' : 'あちゃ〜、残念だちゅ…')
            .setDescription(`この子の正体は **${chosen.name}** でした！`)
            .setFooter({ text: isCorrect ? 'ねずみマスターだね！' : '次は当ててみてね！' });

        // 💡 ポイント1: followUpではなく、この操作自体を「完了」させるためにupdateを使う
        // これにより「不明なインタラクション」エラーを防ぎつつ結果を表示できます
        await confirmation.update({ 
            content: isCorrect ? '🎊 おめでとう！' : '😢 どんまいだちゅ…',
            embeds: [resultEmbed], 
            components: [], // ボタンを消す
            ephemeral: true 
        });

    } catch (e) {
        // タイムアウト時の処理
        await interaction.editReply({ 
            content: '時間切れだちゅ…。また遊んでね！', 
            components: [], 
            ephemeral: true 
        });
    }

}
});
// ここに先ほどコピーした「トークン」を貼り付けます
client.login(process.env.DISCORD_TOKEN);