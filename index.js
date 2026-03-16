const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags // 💡 【超重要】これを忘れずに追加するちゅ！
} = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
// 💡 【追加】satori関連のライブラリ
const satori = require('satori').default;
const { Resvg } = require('@resvg/resvg-js');
const React = require('react');
const { html } = require('satori-html');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
// 💡 【追加】フォントファイルを読み込む

const fontPath = path.join(__dirname, 'fonts', 'LINESeedJP-Regular.ttf');
try {
    GlobalFonts.registerFromPath(fontPath, 'NotoSansJP');
} catch (e) {
    console.error('❌ フォントの読み込みエラーちゅ。fontsフォルダに .ttf ファイルがあるか確認してちゅ！', e);
}
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel(
    { model: "models/gemini-2.5-flash" },
    { apiVersion: "v1" }
);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// --- タロット・ルーン等のデータ ---
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
const signs = [
    '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', 
    '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'
];

const luckyItems = ['チーズ', 'ひまわりの種', '銀のさじ', '赤いリボン', '和歌山みかん', 'お気に入りの靴下']; 
const runeAlphabet = [
    { name: 'フェイヒュー (Fehu)', symbol: 'ᚠ', meaning: '富・家畜', upright: '金運上昇。努力が形になる時だちゅ！', reversed: '無駄遣いや損失に注意が必要だちゅ。' ,image: 'R_01_Fehu.jpg'},
    { name: 'ウルズ (Uruz)', symbol: 'ᚢ', meaning: '力・野生牛', upright: '強いエネルギーに満ちているちゅ！前進あるのみ。', reversed: '力が空回りしそう。休息も大事だちゅ。' ,image: 'R_02_Uruz.jpg'},
    { name: 'ソーン (Thurisaz)', symbol: 'ᚦ', meaning: '巨人・トゲ', upright: '守護と決断。慎重に状況を見極めてちゅ。', reversed: '強引な行動はトラブルの元。立ち止まってちゅ。' ,image: 'R_03_Thurisaz.jpg'},
    { name: 'アンスズ (Ansuz)', symbol: 'ᚨ', meaning: '口・神', upright: '良い知らせや知恵が届くちゅ。対話を大切に。', reversed: '誤解や情報の混乱に気をつけてちゅ。' ,image: 'R_04_Ansuz.jpg'},
    { name: 'ライド (Raido)', symbol: 'ᚱ', meaning: '旅・車輪', upright: 'スムーズな進行。旅行や移動にツキがあるちゅ！', reversed: '計画の遅延や足止めの予感。焦りは禁物だちゅ。' ,image: 'R_05_Raidho.jpg'},
    { name: 'ケナズ (Kenaz)', symbol: 'ᚲ', meaning: '松明・火', upright: '才能の開花。アイデアが次々湧いてくるちゅ！', reversed: '情熱の減退。今は無理に動かず充電してちゅ。' ,image: 'R_06_Kenaz.jpg'},
    { name: 'ゲーボ (Gebo)', symbol: 'ᚷ', meaning: '贈り物・愛', upright: '対等な関係や素晴らしいギフトが届く予感だちゅ。', reversed: '対等な関係や素晴らしいギフトが届く予感だちゅ。' ,image: 'R_07_Gebo.jpg'},
    { name: 'ウンニョ (Wunjo)', symbol: 'ᚹ', meaning: '喜び・勝利', upright: '願いが叶う幸運期だちゅ！心から楽しんで。', reversed: '期待しすぎに注意。小さな幸せを大切にしてちゅ。' ,image: 'R_08_Wunjo.jpg'},
    { name: 'ハガラズ (Hagalaz)', symbol: 'ᚻ', meaning: '雹（ひょう）', upright: '予期せぬ変化。古いものを壊して次に進むちゅ！', reversed: '予期せぬ変化。古いものを壊して次に進むちゅ！' ,image: 'R_09_Hagalaz.jpg'},
    { name: 'ナウズ (Nauthiz)', symbol: 'ᚾ', meaning: '欠乏・束縛', upright: '忍耐の時。不自由さの中から学びがあるちゅ。', reversed: '焦って動くと裏目に出るちゅ。慎重に。' ,image: 'R_10_Nauthiz.jpg'},
    { name: 'イサ (Isa)', symbol: 'ᛁ', meaning: '氷・停止', upright: '今は停止の時。静かにチャンスを待つんだちゅ。', reversed: '今は停止の時。静かにチャンスを待つんだちゅ。' ,image: 'R_11_Isa.jpg'},
    { name: 'ジェラ (Jera)', symbol: 'ᛃ', meaning: '収穫・一年', upright: 'これまでの努力が実を結ぶ収穫の時だちゅ！', reversed: 'これまでの努力が実を結ぶ収穫の時だちゅ！' ,image: 'R_12_Jera.jpg'},
    { name: 'エイワズ (Eihwaz)', symbol: 'ᛇ', meaning: 'イチイの木・死', upright: '変化と再生。古い自分から脱皮する時だちゅ。', reversed: '変化と再生。古い自分から脱皮する時だちゅ。' ,image: 'R_13_Eihwaz.jpg'},
    { name: 'パース (Pertho)', symbol: 'ᛈ', meaning: '運命の袋・秘密', upright: '隠れた才能や予期せぬ幸運が見つかるちゅ！', reversed: '秘密が漏れるかも。軽はずみな言動に注意だちゅ。' ,image: 'R_14_Pertho.jpg'},
    { name: 'アルジズ (Algiz)', symbol: 'ᛉ', meaning: '保護・ヘラジカ', upright: '強い守護があるちゅ。直感を信じて進んで！', reversed: '無防備な状態。隙を見せないように用心してちゅ。' ,image: 'R_15_Algiz.jpg'},
    { name: 'ソウィロ (Sowilo)', symbol: 'ᛊ', meaning: '太陽・勝利', upright: '大成功の兆し！明るい未来が待っているちゅ。', reversed: '大成功の兆し！明るい未来が待っているちゅ。' ,image: 'R_16_Sowilo.jpg'},
    { name: 'ティワズ (Tiwaz)', symbol: 'ᛏ', meaning: '戦士・勝利', upright: '強い意志で勝利を掴めるちゅ。勇気を出して。', reversed: '意欲の低下。自信を失わないようにしてちゅ。' ,image: 'R_17_Tiwaz.jpg'},
    { name: 'ベルカナ (Berkana)', symbol: 'ᛒ', meaning: '樺の木・誕生', upright: '新しい始まりや成長。優しさが鍵になるちゅ。', reversed: '成長の停滞。家庭内の不和に注意してちゅ。' ,image: 'R_18_Berkana.jpg'},
    { name: 'エワズ (Ehwaz)', symbol: 'ᛖ', meaning: '馬・協力', upright: '良きパートナーシップ。協力して進むと吉だちゅ。', reversed: '足並みが揃わない。無理に合わせず様子を見てちゅ。' ,image: 'R_19_Ehwaz.jpg'},
    { name: 'マナズ (Mannaz)', symbol: 'ᛗ', meaning: '人間・自己', upright: '自分自身を見つめ直す時。謙虚さが運を呼ぶちゅ。', reversed: '自己中心的な考えに注意。周囲を大切にしてちゅ。' ,image: 'R_20_Mannaz.jpg'},
    { name: 'ラグズ (Laguz)', symbol: 'ᛚ', meaning: '水・直感', upright: '豊かな感性。インスピレーションを大切にちゅ。', reversed: '感情に流されやすい時。冷静さを保ってちゅ。' ,image: 'R_21_Laguz.jpg'},
    { name: 'イングズ (Inguz)', symbol: 'ᛝ', meaning:'豊穣の神・完成', upright: '一つの区切り。満たされた気持ちになれるちゅ。', reversed:'一つの区切り。満たされた気持ちになれるちゅ。' ,image:'R_22_Inguz.jpg'},
    { name:'ダガズ (Dagaz)', symbol:'ᛞ', meaning:'一日・光', upright:'暗闇が終わり、光が差す時。希望を持ってちゅ！', reversed:'暗闇が終わり、光が差す時。希望を持ってちゅ！' ,image:'R_23_Dagaz.jpg'},
    { name:'オサラ (Othala)', symbol:'ᛟ', meaning:'故郷・伝統', upright:'伝統や家族からの恩恵。基盤を固める時だちゅ。', reversed:'執着しすぎに注意。新しい風を取り入れてちゅ。' ,image:'R_24_Othala.jpg'}
];
const sushiMenu = [
    { name: 'マグロ (2貫)', price: 400, image: 's_maguro.jpg', description: '定番の赤身。濃厚な旨味だちゅ！' },
    { name: 'サーモン (2貫)', price: 500, image: 's_salmon.jpg', description: 'とろける脂がたまらないちゅ。' },
    { name: '玉子 (2貫)', price: 200, image: 's_tamago.jpg', description: '大将特製。優しい甘さだちゅ。' },
    { name: 'イクラ軍艦 (2貫)', price: 1000, image: 's_ikura.jpg', description: 'プチプチ弾ける海の宝石だちゅ✨' },
    { name: 'ウニ軍艦 (1貫)', price: 1000, image: 's_uni.jpg', description: '口の中でとろける最高級品だちゅ！' },
    { name: 'カッパ巻き (4本)', price: 200, image: 's_kappa.jpg', description: 'さっぱり箸休めに最適だちゅ。' },
];

// 日本時間を取得する共通関数
function getJSTInfo() {
    const now = new Date();
    const jstStr = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstStr);
    
    const y = jstDate.getFullYear();
    const m = jstDate.getMonth() + 1;
    const d = jstDate.getDate();
    
    return {
        dateStr: `${y}-${m}-${d}`,
        displayDate: `${y}/${m}/${d}`,
        seedDate: (y * 10000) + (m * 100) + d
    };
}

// 💡 【追加】ローカルLLM（Ollama）を呼び出すヘルパー関数
// 💡 【追加】ローカルLLM（Ollama）を呼び出すヘルパー関数
async function callLocalLLM(prompt) {
    const localUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434/api/generate';
    const localModel = process.env.LOCAL_LLM_MODEL || 'gemma2:9b';
    const systemInstruction = `
あなたは「ねずみ」という名前の、愛らしくて凄腕のタロット・ルーン占い師です。
以下のルールを【絶対に】守って回答してください。
1. 語尾は必ず「〜ちゅ」「〜だちゅ」「〜するちゅよ」などにすること。
2. 「〜です」「〜ます」といった普通の敬語は絶対に使わないこと。
3. 絵文字を一切使わずに愛嬌を出すこと。
4. ユーザーを励まし、癒やすような優しい言葉遣いをすること。
`;
    try {
        console.log(`🔄 ローカルLLM (${localModel}) に助けを求めるちゅ...`);
        const response = await axios.post(localUrl, {
            model: localModel,
            prompt: prompt,
            system: systemInstruction,
            stream: false,
            options: {
                temperature: 0.7, // 💡 0.7くらいにすると、少し真面目になって設定を守りやすいちゅ
            }
        });
        return response.data.response.trim();
    } catch (error) {
        console.error('❌ ローカルLLMもダウンしてるちゅ:', error.message);
        
        // 💡 ここを追加！Ollamaの本当の文句（404の理由）をログに詳しく出すちゅ！
        if (error.response && error.response.data) {
            console.error('🔍 Ollamaの言い分:', error.response.data);
        }
        
        throw error; 
    }
}
// 💡 【修正】画像圧縮関数 (接頭辞 prefix を追加して、寿司とペットを区別できるようにしたちゅ！)
async function compressAndGetAttachment(imageFileName, targetWidth = 500, prefix = 'img') {
    try {
        const imagePath = path.join(__dirname, 'images', imageFileName);
        if (!fs.existsSync(imagePath)) return null;

        // 💡 Sharpでリサイズ＆WebP圧縮して、Discordに送れるAttachmentにするちゅ
        const imageBuffer = await sharp(imagePath)
            .resize(targetWidth) 
            .webp({ quality: 60 }) // 💡 画質を60%に落として圧縮！
            .toBuffer();
        
        // 接頭辞prefixを使ってランダムな名前を作るちゅ
        const randomName = `${prefix}_${Date.now()}.webp`;
        return new AttachmentBuilder(imageBuffer, { name: randomName });
    } catch (error) {
        console.error('画像圧縮エラー:', error.message);
        return null; 
    }
}
// 💡 【追加】Canvasで長い文章を指定の幅で綺麗に折り返して描画する魔法の関数だちゅ！
function drawCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let currentY = y;
    for (const p of paragraphs) {
        if (p === '') {
            currentY += lineHeight;
            continue;
        }
        let line = '';
        for (let i = 0; i < p.length; i++) {
            const testLine = line + p[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, x, currentY);
                line = p[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    }
    return currentY;
}
// 💡 【追加】事前に文章の高さを計算して、キャンバスの大きさを決める魔法だちゅ！
function measureTextHeight(ctx, text, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let height = 0;
    for (const p of paragraphs) {
        if (p === '') {
            height += lineHeight;
            continue;
        }
        let line = '';
        for (let i = 0; i < p.length; i++) {
            const testLine = line + p[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                height += lineHeight;
                line = p[i];
            } else {
                line = testLine;
            }
        }
        height += lineHeight;
    }
    return height;
}
// 💡 【追加】おあいそゲームの状態管理用Map (ユーザーIDをキーにするちゅ)
const oaisoGames = new Map();
//********************************************************************タロット*************************************************************************************************************
async function getCardImage(imageFileName, isReversed) {
    try {
        const imagePath = path.join(__dirname, 'images', imageFileName);
        let imageProcessor = sharp(imagePath).resize(500);
        if (isReversed) imageProcessor = imageProcessor.flip();

        const processedImageBuffer = await imageProcessor.webp({ quality: 60 }).toBuffer();
        const filename = `n_${Math.floor(Math.random() * 1000)}.webp`;
        return new AttachmentBuilder(processedImageBuffer, { name: filename });
    } catch (error) {
        console.error('画像処理エラー:', error.message);
        return null; 
    }
}

function getPersonalDailyRandom(userId, seedOffset = 0) {
    const jst = getJSTInfo();
    const dateNum = jst.seedDate; 
    const userNumericId = parseInt(userId.slice(-8), 10); 
    const finalSeed = dateNum + userNumericId + seedOffset;
    const x = Math.sin(finalSeed) * 10000;
    return x - Math.floor(x);
}

function calculateScore(card, isReversed) {
    if (card.tone === 'positive') return isReversed ? 1 : 2;  
    if (card.tone === 'negative') return isReversed ? -1 : -2; 
    return 0; 
}

function generateTarotStory(past, present, future) {
    const s1 = calculateScore(past.card, past.isReversed);
    const s2 = calculateScore(present.card, present.isReversed);
    const s3 = calculateScore(future.card, future.isReversed);
    const totalScore = s1 + s2 + s3;

    let storyType = "";
    let message = "";

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
}

function getSingleCardComment(card, isReversed) {
    if (!isReversed) {
        if (card.tone === 'positive') return "わあ！とっても良いカードだね。今日は美味しいチーズに出会えるかも！ちゅ！";
        if (card.tone === 'negative') return "ちょっと怖いカードだけど、正位置なら「新しい出発」の意味もあるよ。鼻をヒクヒクさせて慎重に進もう！";
        return "落ち着いた運勢だね。たまには巣穴でゆっくり毛づくろいするのもいいと思うよ。";
    } else {
        if (card.tone === 'positive') return "せっかくの良い運勢がひっくり返っちゃった。焦らずに、ひまわりの種でも食べて落ち着いてね。";
        if (card.tone === 'negative') return "運気が逆転して、悪いことが去っていくサインかも！これからどんどん良くなるよ、ちゅ！";
        return "なんだかソワソワしちゃうね。深呼吸して、尻尾を落ち着かせてから行動しよう！";
    }
}

const readingCache = new Map();

// 💡 修正：Geminiが失敗したらローカルLLMに回すハイブリッド版
async function getGeminiReading(cardName, isReversed, username) {
    const jst = getJSTInfo();
    const dateStr = jst.dateStr; 
    const cacheKey = `tarot-${dateStr}-${username}-${cardName}-${isReversed}`;

    if (readingCache.has(cacheKey)) return readingCache.get(cacheKey);

    const orientation = isReversed ? "逆位置" : "正位置";
    const prompt = `あなたは「ねずみ」という占い師です。引かれたカード：${cardName}の${orientation}。200文字以内で、癒やしのアドバイスを1つだけ言って。語尾は「ちゅ」。`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        readingCache.set(cacheKey, text); 
        return text;
    } catch (error) {
        console.error('⚠️ Gemini API Error (Tarot 1):', error.message);
        try {
            // 💡 ここでローカルAIにバトンタッチ！
            const localText = await callLocalLLM(prompt);
            readingCache.set(cacheKey, localText);
            return localText;
        } catch (localError) {
            return "占いの言葉がうまくまとまらなかったちゅ…。でも、きっと大丈夫だちゅ！";
        }
    }
}

async function getGeminiReading3(cards, username) {
    const jst = getJSTInfo();
    const dateStr = jst.dateStr; 
    const cacheKey = `tarot3-${dateStr}-${username}-${cards.map(c => c.name + c.isReversed).join('-')}`;
    
    if (readingCache.has(cacheKey)) return readingCache.get(cacheKey);

    const cardInfo = cards.map((c, i) => 
        `${['過去', '現在', '未来'][i]}: ${c.name}(${c.isReversed ? '逆位置' : '正位置'})`
    ).join('、');

    const prompt = `占い師「ねずみ」として、${username}さんの3枚引き（${cardInfo}）を統合して、400文字以内で一言でアドバイスして。最後は「ちゅ」で締めて。`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        readingCache.set(cacheKey, text);
        return text;
    } catch (error) {
        console.error('⚠️ Gemini API Error (Tarot 3):', error.message);
        try {
            // 💡 ここでローカルAIにバトンタッチ！
            const localText = await callLocalLLM(prompt);
            readingCache.set(cacheKey, localText);
            return localText;
        } catch (localError) {
            return "3枚の運命が複雑すぎて、ねずみの頭がパンクしちゃったちゅ…。でも、どのカードもあなたを応援してるちゅ！";
        }
    }
}
// 💡 【追加】カード画像をBase64文字列として取得する関数
async function getCardImageBase64(imageFileName, isReversed) {
    try {
        const imagePath = path.join(__dirname, 'images', imageFileName);
        if (!fs.existsSync(imagePath)) return null;

        let transform = sharp(imagePath)
            .resize(250) // satori上の表示サイズに合わせて少しリサイズ
            .webp({ quality: 80 }); // WebPに変換して少し軽くするちゅ

        if (isReversed) {
            transform = transform.rotate(180);
        }

        const buffer = await transform.toBuffer();
        // Base64の魔法の文字列（data:image/webp;base64,...）にして返すちゅ！
        return `data:image/webp;base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error('Base64画像生成エラー:', error.message);
        return null; 
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
    if (code >= 95) return "ひえ〜っ、カミナリだ！おへそを隠して、安全なところでチーズを食べてよう... ⚡🧀";
    if (code >= 71) return "外は真っ白！雪合戦もいいけど、ねずみはコタツで丸くなりたいな ☃️❄️";
    if (rainProb >= 60) return "雨が降りそうだよ！傘を忘れずにね。ねずみが濡れたら、乾かすのが大変なんだ ☂️🐭";
    if (rainProb >= 30) return "空模様が怪しいかも... 念のために折りたたみ傘を持っていくのが正解だね ☁️🌂";
    if (maxTemp >= 32) return "暑すぎる〜！チーズが溶けてフォンデュになっちゃうよ。水分補給を忘れずにね！ 🔥💧";
    if (maxTemp <= 5) return "ぶるぶる... 今日はとっても寒いね。マフラーをしっかり巻いてお出かけしてね！ 🧣🧣";
    if (code <= 1) return "最高のお出かけ日和！ねずみもどこかへ遊びに行きたい気分だよ ☀️🌷";
    return "今日も一日、あなたにとって素敵な日になりますように！🐭✨";
}

//*******************************************************************************************ネズミクイズ*********************************************************************************************** */
async function getJokeImage(fileName) {
    const imagePath = path.resolve(__dirname, 'images', fileName);
    if (!fs.existsSync(imagePath)) {
        console.log(`❌ ファイル不在: ${imagePath}`); 
        return null;
    }
    try {
        const imageProcessor = sharp(imagePath);
        const processedImageBuffer = await imageProcessor.webp({ quality: 60 }).toBuffer();
        const randomName = `j_${Math.floor(Math.random() * 1000)}.webp`;
        return new AttachmentBuilder(processedImageBuffer, { name: randomName });
    } catch (error) {
        console.error(`❌ ジョーク画像の処理に失敗: ${error.message}`);
        return null;
    }
}

//*****************************************************************************************星座占い****************************************************************************************************** */
// ✅ 修正後（星座占いはみんな共通だから、これだけでOKだちゅ！）
function getDailyRandom(seedOffset = 0) {
    const jst = getJSTInfo(); 
    const dateNum = jst.seedDate; 
    // 💡 ユーザーIDは使わず、日付と星座の番号だけで固定の乱数を作るちゅ
    const finalSeed = dateNum + seedOffset;
    const x = Math.sin(finalSeed) * 10000;
    return x - Math.floor(x);
}

// 💡 修正：Geminiが失敗したらローカルLLMに回すハイブリッド版
async function getGeminiFullHoroscope(rankingList) {
    const jst = getJSTInfo();
    const dateStr = jst.dateStr;
    const cacheKey = `full-horoscope-${dateStr}`; 
    
    if (readingCache.has(cacheKey)) return readingCache.get(cacheKey);

    const rankingInfo = rankingList.map((item, i) => `${i+1}位:${item.name}`).join('、');
    
    const prompt = `占い師「ねずみ」として、以下の星座ランキング各々に50文字以内で短い一言コメントを、最後に「今日の全体の抱負」を300文字以内で作成して。
リスト：${rankingInfo}
形式：
1位：コメント
2位：コメント
...
抱負：抱負の内容
語尾は「ちゅ」で統一して。`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        readingCache.set(cacheKey, text);
        return text;
    } catch (error) {
        console.error('⚠️ Gemini API Error (Horoscope):', error.message);
        try {
            // 💡 ここでローカルAIにバトンタッチ！
            const localText = await callLocalLLM(prompt);
            readingCache.set(cacheKey, localText);
            return localText;
        } catch (localError) {
            return "みんなにとって素敵な一日になるちゅ！\n抱負：みんなに良いことがありますようにちゅ！";
        }
    }
}

//****************************************************************************************ルーン占い***************************************************************************************************** */
// 💡 修正：Geminiが失敗したらローカルLLMに回すハイブリッド版
async function getGeminiRuneReading(runeName, isReversed, username) {
    const jst = getJSTInfo(); 
    const dateStr = jst.dateStr; 
    const cacheKey = `rune-${dateStr}-${username}-${runeName}-${isReversed}`;
    
    if (readingCache.has(cacheKey)) return readingCache.get(cacheKey);

    const orientation = isReversed ? "逆位置" : "正位置";
    const prompt = `占い師「ねずみ」として、ルーン文字「${runeName}」の${orientation}が出た${username}さんに、300文字以内で神秘的な助言をして。語尾は「ちゅ」。`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        readingCache.set(cacheKey, text);
        return text;
    } catch (error) {
        console.error('⚠️ Gemini API Error (Rune):', error.message); 
        try {
            // 💡 ここでローカルAIにバトンタッチ！
            const localText = await callLocalLLM(prompt);
            readingCache.set(cacheKey, localText);
            return localText;
        } catch (localError) {
            return "石に刻まれた文字が読めないちゅ…。でも運命は味方してるちゅ！";
        }
    }
}
//******************************************************************************************寿司******************************************************************************************************* */
const generateOaisoCanvas = async (game, state, extraMsg, displayImageName) => {
        const canvasWidth = 600;
        const dummyCanvas = createCanvas(1, 1);
        const dummyCtx = dummyCanvas.getContext('2d');

        const orderText = game.orderedItems.length > 0 ? game.orderedItems.join('、') : 'まだ注文はないちゅ';
        
        // テキストの高さを事前計算
        dummyCtx.font = '20px NotoSansJP';
        const orderTextHeight = measureTextHeight(dummyCtx, orderText, canvasWidth - 120, 30);

        dummyCtx.font = 'bold 22px NotoSansJP';
        const msgHeight = extraMsg ? measureTextHeight(dummyCtx, extraMsg, canvasWidth - 120, 32) : 0;

        // 💡 新規追加：画像の読み込みと高さ計算！
        let img = null;
        let imgDrawHeight = 0;
        const imgContentWidth = 500; // 画像の横幅を500pxに固定
        
        if (displayImageName) {
            const imagePath = path.join(__dirname, 'images', displayImageName);
            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                const aspectRatio = img.width / img.height;
                // アスペクト比を維持して高さを割り出すちゅ！
                imgDrawHeight = imgContentWidth / Math.max(0.1, aspectRatio); 
            }
        }

        // 各パーツの高さ
        const headerHeight = 100;
        // 💡 画像があれば、画像の高さ＋上下の余白(40px)を足すちゅ
        const imgSectionHeight = img ? (imgDrawHeight + 40) : 0; 
        const infoBoxHeight = 140; 
        const orderBoxHeight = 60 + orderTextHeight;
        const msgBoxHeight = extraMsg ? 40 + msgHeight : 0;
        const padding = 20;

        // 💡 全体のキャンバス高さを決定（画像スペース分だけ自動で縦に伸びるちゅ！）
        const canvasHeight = headerHeight + imgSectionHeight + infoBoxHeight + padding + orderBoxHeight + padding + msgBoxHeight + padding + 40;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // 結果発表時の色（ピタリ賞:金, 惜しい:緑, 外れ:赤, プレイ中:木の色）
        let mainColor = '#d4a373';
        if (state === 'result') {
            const diff = Math.abs(game.currentTotal - game.target);
            if (diff === 0) mainColor = '#FFD700';
            else if (diff <= 200) mainColor = '#00FA9A';
            else mainColor = '#ff6b6b';
        }

        // 背景と枠線（お寿司屋さんの木目調）
        ctx.fillStyle = '#2c221a'; 
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // タイトル
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px NotoSansJP';
        ctx.fillStyle = mainColor;
        ctx.fillText(state === 'result' ? 'おあいそ結果発表！！' : 'おあいそゲーム！', canvasWidth / 2, 60);

        let currentY = headerHeight;

        // 💡 0. 画像の描画（大将 または 寿司）
        if (img) {
            const imgX = (canvasWidth - imgContentWidth) / 2;
            ctx.drawImage(img, imgX, currentY, imgContentWidth, imgDrawHeight);
            // 写真風の白い枠線をつけるちゅ
            ctx.strokeStyle = '#faedcd';
            ctx.lineWidth = 4;
            ctx.strokeRect(imgX, currentY, imgContentWidth, imgDrawHeight);
            
            // 次のパーツのためにY座標を進めるちゅ
            currentY += imgDrawHeight + 40; 
        }

        // ① 情報ボックス (目標金額と現在の合計)
        ctx.fillStyle = '#3e2f23';
        ctx.fillRect(40, currentY, canvasWidth - 80, infoBoxHeight);
        ctx.strokeStyle = '#5a4535';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, currentY, canvasWidth - 80, infoBoxHeight);

        ctx.textAlign = 'center';
        ctx.font = 'bold 26px NotoSansJP';
        ctx.fillStyle = '#fefae0';
        ctx.fillText(`目標金額: ${game.target}円`, canvasWidth / 2, currentY + 45);
        
        ctx.font = 'bold 32px NotoSansJP';
        ctx.fillStyle = state === 'result' ? mainColor : '#87CEEB';
        ctx.fillText(`現在の合計: ${state === 'result' ? game.currentTotal : '？？？'} 円`, canvasWidth / 2, currentY + 100);

        currentY += infoBoxHeight + padding;

        // ② 注文履歴ボックス
        ctx.fillStyle = '#3e2f23';
        ctx.fillRect(40, currentY, canvasWidth - 80, orderBoxHeight);
        ctx.strokeRect(40, currentY, canvasWidth - 80, orderBoxHeight);

        ctx.textAlign = 'left';
        ctx.font = 'bold 22px NotoSansJP';
        ctx.fillStyle = '#d4a373';
        ctx.fillText('注文履歴', 60, currentY + 40);

        ctx.font = '20px NotoSansJP';
        ctx.fillStyle = '#e0e0e0';
        drawCanvasText(ctx, orderText, 60, currentY + 80, canvasWidth - 120, 30);

        currentY += orderBoxHeight + padding;

        // ③ メッセージボックス
        if (extraMsg) {
            ctx.fillStyle = '#3e2f23';
            ctx.fillRect(40, currentY, canvasWidth - 80, msgBoxHeight);
            ctx.strokeRect(40, currentY, canvasWidth - 80, msgBoxHeight);

            ctx.textAlign = 'left';
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, extraMsg, 60, currentY + 40, canvasWidth - 120, 32);
        }

        return await canvas.encode('png');
    };
    // 💡 【追加】寿司の注文メニュー専用のCanvas画像生成魔法だちゅ！
const generateSushiWelcomeCanvas = async () => {
    const canvasWidth = 800;
    const canvasHeight = 500;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 背景と枠線（渋いブラウン）
    ctx.fillStyle = '#3e2f23'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#faedcd';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // タイトル
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px NotoSansJP';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('- ねずみ寿司へようこそ！ -', canvasWidth / 2, 70);
    
    ctx.font = '24px NotoSansJP';
    ctx.fillText('ウチ自慢のネタを見てってちゅ！', canvasWidth / 2, 110);

    // 大将の画像
    let img = null;
    const imagePath = path.join(__dirname, 'images', 'daisho.jpg');
    if (fs.existsSync(imagePath)) {
        img = await loadImage(imagePath);
        const imgWidth = 500;
        const imgHeight = 250;
        ctx.drawImage(img, (canvasWidth - imgWidth) / 2, 140, imgWidth, imgHeight);
        ctx.strokeStyle = '#faedcd';
        ctx.lineWidth = 4;
        ctx.strokeRect((canvasWidth - imgWidth) / 2, 140, imgWidth, imgHeight);
    } else {
        ctx.fillStyle = '#2c221a';
        ctx.fillRect((canvasWidth - 500) / 2, 140, 500, 250);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('大将仕込み中...', canvasWidth / 2, 265);
    }

    ctx.font = 'bold 30px NotoSansJP';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('- 下のリストから注文してちゅ！ -', canvasWidth / 2, 450);

    return await canvas.encode('png');
};
//**************************************************************************************目指せネズミマスター******************************************************************************************** */
const petDataFile = path.join(__dirname, 'pets.json');
const petCatches = new Map();

// 🌟 箱を作る宣言を【絶対に一番上】に書くちゅ！
let userPets = {}; 

// 1. データの読み込み（箱を作ったあとに中身を入れる！）
if (fs.existsSync(petDataFile)) {
    try {
        userPets = JSON.parse(fs.readFileSync(petDataFile, 'utf8'));
    } catch (e) {
        console.error('ペットデータの読み込みに失敗したちゅ:', e);
    }
}

// 2. ランクの自動割り当て（下剋上用）
let maxRank = 0;
// 2. データの整合性チェックとランクの自己修復（空席詰め）
let needsSave = false;

for (const id in userPets) {
    const pet = userPets[id];
    // 古いバージョンのペットにDEFやSPDがなければ追加する
    if (pet.def === undefined) { pet.def = 3; needsSave = true; }
    if (pet.spd === undefined) { pet.spd = 5; needsSave = true; }
    if (pet.maxSp === undefined) { pet.maxSp = 15; needsSave = true; }
    if (pet.staggerMax === undefined) { pet.staggerMax = 20; needsSave = true; }
    // ランクがない新規ペットには、一旦すごく大きな数字を入れておくちゅ
    if (!pet.rank) { pet.rank = 99999; needsSave = true; } 
}

// 💡 修正：ランキングの空席を詰める処理！
// 全員をランク順に並べてから、上から 1, 2, 3... と綺麗な連番を振り直すちゅ！
const sortedIds = Object.keys(userPets).sort((a, b) => userPets[a].rank - userPets[b].rank);
let expectedRank = 1;
for (const id of sortedIds) {
    if (userPets[id].rank !== expectedRank) {
        userPets[id].rank = expectedRank;
        needsSave = true;
    }
    expectedRank++;
}

// データを補完・修正した場合はすぐにセーブ！
if (needsSave) savePets();

// 3. セーブ用関数
function savePets() {
    fs.writeFileSync(petDataFile, JSON.stringify(userPets, null, 2));
}

// 最初の相棒候補（種族データ）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 【進化】最初の相棒候補（画像ファイル名の追加！）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 【進化】最初の相棒候補（種族画像 image フィールドを追加したちゅ！）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const petSpecies = [
    { 
        name: 'カワウソ', emoji: '🦦', 
baseHp: 30, baseAtk: 3, baseDef: 3, baseSpd: 3, maxSp: 3, staggerMax: 10, 
        desc: 'ネズミに倒される哀れな生き物だっちゅ。',
        growth: { hp: [1, 1], atk: [1, 1], def: [1, 1], spd: [1, 1], maxSp: [1, 1], staggerMax: [1, 1] },
        image: 'p_kawauso.jpg' // 【追加】カワウソの画像だちゅ！
    },
    { 
        name: 'ヒノネズミ', emoji: '🔥', 
baseHp: 45, baseAtk: 7, baseDef: 3, baseSpd: 5, maxSp: 15, staggerMax: 20, 
        desc: '燃える闘志を持ったバランス型。攻撃と素早さが安定して育つちゅ。',
        growth: { hp: [2, 4], atk: [1, 3], def: [0, 1], spd: [1, 2], maxSp: [0, 2], staggerMax: [1, 2] },
        image: 'p_hino.jpg' // 【追加】ヒノネズミの画像だちゅ！
    },
    { 
        name: 'ミズネズミ', emoji: '💧', 
baseHp: 55, baseAtk: 4, baseDef: 5, baseSpd: 2, maxSp: 15, staggerMax: 25, 
        desc: 'マイペースな要塞。HP・防御力・混乱耐性がグングン伸びる最強の壁役だちゅ。',
        growth: { hp: [3, 6], atk: [0, 2], def: [1, 3], spd: [0, 1], maxSp: [0, 1], staggerMax: [1, 3] },
        image: 'p_mizu.jpg' // 【追加】ミズネズミの画像だちゅ！
    },
    { 
        name: 'クサネズミ', emoji: '🌿', 
baseHp: 50, baseAtk: 5, baseDef: 4, baseSpd: 4, maxSp: 20, staggerMax: 15, 
        desc: '自然を愛する優しいねずみ。SP上限が圧倒的に伸びやすく、必殺技を狙いやすいちゅ。',
        growth: { hp: [2, 5], atk: [1, 2], def: [0, 2], spd: [0, 2], maxSp: [2, 4], staggerMax: [0, 2] },
        image: 'p_kusa.jpg' // 【追加】クサネズミの画像だちゅ！
    },
    { 
        name: 'エレキネズミ', emoji: '⚡', 
baseHp: 35, baseAtk: 8, baseDef: 2, baseSpd: 7, maxSp: 10, staggerMax: 15, 
        desc: '超高速の紙装甲アタッカー。素早さと攻撃力は最強だけど、とっても打たれ弱いちゅ。',
        growth: { hp: [1, 3], atk: [2, 4], def: [0, 1], spd: [1, 3], maxSp: [0, 1], staggerMax: [0, 1] },
        image: 'p_eleki.jpg' // 【追加】エレキネズミの画像だちゅ！
    }
];
// 💡 【超・軽量爆速版】ペットキャッチ専用のCanvas画像生成魔法だちゅ！
    const generatePetCatchCanvas = async (pet, state, extraMsg) => {
        const canvasWidth = 600;
        const dummyCanvas = createCanvas(1, 1);
        const dummyCtx = dummyCanvas.getContext('2d');

        // メッセージの高さを事前計算
        dummyCtx.font = 'bold 22px NotoSansJP';
        const msgHeight = extraMsg ? measureTextHeight(dummyCtx, extraMsg, canvasWidth - 120, 32) : 0;

        // 画像の読み込みと高さ計算！
        let img = null;
        let imgDrawHeight = 0;
        const imgContentWidth = 500;
        
        // 💡 修正：モンスターデータ(image)と写真データ(file)の両方に対応するちゅ！
        const imageFileName = pet.image || pet.file; 
        const imagePath = path.resolve(__dirname, 'images', imageFileName);
        
        if (fs.existsSync(imagePath)) {
            img = await loadImage(imagePath);
            const aspectRatio = img.width / img.height;
            imgDrawHeight = imgContentWidth / Math.max(0.1, aspectRatio); 
        } else {
            imgDrawHeight = 300; // 画像がない時の仮の高さ
        }

        // 各パーツの高さ
        const headerHeight = 100;
        const imgSectionHeight = imgDrawHeight + 40; 
        const msgBoxHeight = extraMsg ? 40 + msgHeight : 0;
        const padding = 20;

        // 全体のキャンバス高さを決定
        const canvasHeight = headerHeight + imgSectionHeight + msgBoxHeight + padding + 20;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // テーマカラー（出現:草むらグリーン, 成功:ゴールド, 失敗:ブルーグレー）
        let mainColor = '#32CD32'; 
        if (state === 'success') mainColor = '#FFD700';
        else if (state === 'fail') mainColor = '#607B8B';

        // 背景と枠線
        ctx.fillStyle = '#1e1e24'; 
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // タイトル
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px NotoSansJP';
        ctx.fillStyle = mainColor;
        let titleText = '';
        if (state === 'appear') titleText = 'あっ！野生の仲間が飛び出してきた！';
        else if (state === 'success') titleText = 'やったー！捕獲成功だちゅ！';
        else titleText = 'あぁっ…逃げられちゃったちゅ…';
        ctx.fillText(titleText, canvasWidth / 2, 60);

        let currentY = headerHeight;

        // ① 画像の描画
        const imgX = (canvasWidth - imgContentWidth) / 2;
        if (img) {
            ctx.drawImage(img, imgX, currentY, imgContentWidth, imgDrawHeight);
            // 写真風の白い枠線
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(imgX, currentY, imgContentWidth, imgDrawHeight);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(imgX, currentY, imgContentWidth, imgDrawHeight);
            ctx.fillStyle = '#fff';
            ctx.fillText('画像なし', canvasWidth / 2, currentY + imgDrawHeight / 2);
        }
        currentY += imgSectionHeight;

        // ② メッセージボックス
        if (extraMsg) {
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, currentY, canvasWidth - 80, msgBoxHeight);
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(40, currentY, canvasWidth - 80, msgBoxHeight);

            ctx.textAlign = 'left';
            ctx.font = 'bold 24px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, extraMsg, 60, currentY + 45, canvasWidth - 120, 32);
        }

        return await canvas.encode('png');
    };
    // 💡 【追加】ペットバトル専用のCanvas画像生成魔法だちゅ！
const generatePetBattleCanvas = async (challenger, opponent, myState, oppState, log, turn) => {
    const canvasWidth = 800;
    const dummyCanvas = createCanvas(1, 1);
    const dummyCtx = dummyCanvas.getContext('2d');

    // ログの高さを計算
    const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();
    const safeLog = stripEmoji(log);
    dummyCtx.font = '16px NotoSansJP';
    const logHeight = measureTextHeight(dummyCtx, safeLog, canvasWidth - 80, 22); //

    const headerHeight = 100;
    const arenaHeight = 350; // バトル画面（キャラが並ぶ場所）
    const logBoxHeight = Math.max(150, logHeight + 40);
    const canvasHeight = headerHeight + arenaHeight + logBoxHeight + 60;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 背景（闘技場風のダークカラー）
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#8B0000'; // 血の滴るようなレッド
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // タイトル
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px NotoSansJP';
    ctx.fillStyle = '#FF4500';
    ctx.fillText(`死闘：ターン ${turn}`, canvasWidth / 2, 60);

    // 💡 互いの相棒を描画するちゅ！
    const drawPetSide = async (pet, state, x, isRight) => {
        const species = petSpecies.find(s => s.name === pet.name); //
        const imgPath = path.join(__dirname, 'images', species.image);
        const pWidth = 200;
        
        if (fs.existsSync(imgPath)) {
            const img = await loadImage(imgPath);
            const ratio = img.width / img.height;
            const pHeight = pWidth / ratio;
            
            ctx.save();
            if (isRight) {
                // 右側の敵は左を向かせるために反転させるちゅ！
                ctx.translate(x + pWidth, 120);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, pWidth, pHeight);
            } else {
                ctx.drawImage(img, x, 120, pWidth, pHeight);
            }
            ctx.restore();
        }

        // ステータスゲージ（HP、SP、混乱）
        const gaugeX = isRight ? x : x;
        const gaugeY = 120 + 220;
        const barW = 200;

        // HPバー
        ctx.fillStyle = '#333';
        ctx.fillRect(gaugeX, gaugeY, barW, 15);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(gaugeX, gaugeY, barW * (state.hp / pet.maxHp), 15);
        
        // 混乱（Stagger）バー
        ctx.fillStyle = '#333';
        ctx.fillRect(gaugeX, gaugeY + 20, barW, 10);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(gaugeX, gaugeY + 20, barW * (state.stagger / (pet.staggerMax || 20)), 10);

        ctx.textAlign = 'left';
        ctx.font = 'bold 18px NotoSansJP';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(stripEmoji(pet.name), gaugeX, gaugeY - 10);
    };

    await drawPetSide(challenger, myState, 80, false);
    await drawPetSide(opponent, oppState, 520, true);

    // VSマーク
    ctx.textAlign = 'center';
    ctx.font = 'bold 60px NotoSansJP';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('VS', canvasWidth / 2, 280);

    // 💡 バトルログボックス
    const logY = headerHeight + arenaHeight;
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(40, logY, canvasWidth - 80, logBoxHeight);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, logY, canvasWidth - 80, logBoxHeight);

    ctx.textAlign = 'left';
    ctx.font = '16px NotoSansJP';
    ctx.fillStyle = '#ffffff';
    drawCanvasText(ctx, safeLog, 60, logY + 35, canvasWidth - 120, 22); //

    return await canvas.encode('png');
};
// 💡 【追加】ペットバトル・リザルト専用のCanvas画像生成魔法だちゅ！
// 💡 【修正版】ペットバトル・リザルト専用のCanvas画像生成魔法（はみ出し防止）
const generatePetBattleResultCanvas = async (winnerPet, winnerUsername, rankMsg, aiCommentary) => {
    const canvasWidth = 600;
    const dummyCanvas = createCanvas(1, 1);
    const dummyCtx = dummyCanvas.getContext('2d');

    const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();
    const safeRank = stripEmoji(rankMsg);
    const safeComment = stripEmoji(aiCommentary);

    const textPadding = 60; // 左右の余白
    const maxWidth = canvasWidth - (textPadding * 2);

    // 💡 1. 文章の高さを正確に測るちゅ！
    dummyCtx.font = 'bold 22px NotoSansJP';
    const rankHeight = measureTextHeight(dummyCtx, safeRank, maxWidth, 32);
    
    dummyCtx.font = 'italic 20px NotoSansJP';
    const commentHeight = measureTextHeight(dummyCtx, safeComment, maxWidth, 28);

    // 画像読み込み
    const species = petSpecies.find(s => s.name === winnerPet.name);
    const imgPath = path.join(__dirname, 'images', species.image);
    let img = null;
    let drawHeight = 300;
    const contentWidth = 400;

    if (fs.existsSync(imgPath)) {
        img = await loadImage(imgPath);
        drawHeight = contentWidth / (img.width / img.height);
    }

    const headerHeight = 120;
    const imgSectionHeight = drawHeight + 40;

    // 💡 2. ボックス内の「全ての要素」の高さを足し算して、boxHeightを計算するちゅ！
    // (勝者名エリア: 80) + (ランク見出し: 40 + 本文: rankHeight) + (間隔: 30) + (実況見出し: 40 + 本文: commentHeight) + (下の余白: 60)
    const boxContentHeight = 80 + 40 + rankHeight + 30 + 40 + commentHeight + 60;
    const canvasHeight = headerHeight + imgSectionHeight + boxContentHeight + 40;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 背景と外枠
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#FFD700'; 
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // タイトル
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px NotoSansJP';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('🏆 BATTLE RESULT 🏆', canvasWidth / 2, 70);

    let currentY = headerHeight;

    // 勝者の画像
    const imgX = (canvasWidth - contentWidth) / 2;
    if (img) {
        ctx.drawImage(img, imgX, currentY, contentWidth, drawHeight);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.strokeRect(imgX, currentY, contentWidth, drawHeight);
    }
    currentY += imgSectionHeight;

    // 💡 3. 計算した boxContentHeight を使って背景を描くちゅ
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(40, currentY, canvasWidth - 80, boxContentHeight);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, currentY, canvasWidth - 80, boxContentHeight);

    // 勝者名
    ctx.font = 'bold 28px NotoSansJP';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`WINNER: ${winnerUsername}`, canvasWidth / 2, currentY + 50);

    // ランク変動
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px NotoSansJP';
    ctx.fillStyle = '#00FF00';
    ctx.fillText('📊 ランク変動', 60, currentY + 110);
    ctx.fillStyle = '#ffffff';
    let nextY = drawCanvasText(ctx, safeRank, 60, currentY + 145, maxWidth, 32);

    // AI実況
    nextY += 30;
    ctx.font = 'bold 22px NotoSansJP';
    ctx.fillStyle = '#87CEEB';
    ctx.fillText('🎙️ ねずみの実況', 60, nextY);
    ctx.font = 'italic 20px NotoSansJP';
    ctx.fillStyle = '#e0e0e0';
    drawCanvasText(ctx, safeComment, 60, nextY + 35, maxWidth, 28);

    return await canvas.encode('png');
};
// 💡 【追加】ペットランキング専用のCanvas画像生成魔法だちゅ！
const generatePetRankingCanvas = async (sortedPets) => {
    const canvasWidth = 800;
    const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

    const headerHeight = 150;
    const panelHeight = 90; // 1人あたりの高さ
    const panelGap = 15;
    const footerHeight = 60;
    
    // 最大10位まで表示するちゅ
    const displayCount = Math.min(10, sortedPets.length);
    const canvasHeight = headerHeight + (panelHeight + panelGap) * displayCount + footerHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 背景（高級感のあるダークグレーとゴールドの枠線）
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#FFD700'; 
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // タイトル
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px NotoSansJP';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('🏆 ペットバトル 殿堂入りランキング 🏆', canvasWidth / 2, 70);
    
    ctx.font = '20px NotoSansJP';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('最強のテイマーたちの記録だちゅ！', canvasWidth / 2, 110);

    let currentY = headerHeight;

    for (let i = 0; i < displayCount; i++) {
        const pet = sortedPets[i];
        const rank = i + 1;
        const startX = 40;
        const panelWidth = canvasWidth - 80;

        // パネルの色（1位:金, 2位:銀, 3位:銅, その他:ダーク）
        let panelColor = '#2b2d31';
        let borderColor = '#444';
        let rankColor = '#ffffff';

        if (rank === 1) { panelColor = '#4d4400'; borderColor = '#FFD700'; rankColor = '#FFD700'; }
        else if (rank === 2) { panelColor = '#333333'; borderColor = '#C0C0C0'; rankColor = '#C0C0C0'; }
        else if (rank === 3) { panelColor = '#3d2b1f'; borderColor = '#CD7F32'; rankColor = '#CD7F32'; }

        ctx.fillStyle = panelColor;
        ctx.fillRect(startX, currentY, panelWidth, panelHeight);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, currentY, panelWidth, panelHeight);

        // 順位表示
        ctx.textAlign = 'left';
        ctx.font = 'bold 32px NotoSansJP';
        ctx.fillStyle = rankColor;
        ctx.fillText(`${rank}位`, startX + 20, currentY + 55);

        // ペット名とテイマー名
        const safePetName = stripEmoji(pet.name);
        const userName = pet.userName || '不明なテイマー';
        
        ctx.font = 'bold 24px NotoSansJP';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(safePetName, startX + 120, currentY + 40);
        
        ctx.font = '18px NotoSansJP';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`テイマー: ${userName} (Lv.${pet.level})`, startX + 120, currentY + 70);

        // 右側のステータスサマリー
        ctx.textAlign = 'right';
        ctx.font = 'bold 18px NotoSansJP';
        ctx.fillStyle = '#87CEEB';
        ctx.fillText(`HP:${pet.maxHp} ATK:${pet.atk} DEF:${pet.def} SPD:${pet.spd}`, startX + panelWidth - 20, currentY + 55);

        currentY += panelHeight + panelGap;
    }

    // フッター
    ctx.textAlign = 'center';
    ctx.font = '14px NotoSansJP';
    ctx.fillStyle = '#666';
    ctx.fillText(`集計日：${getJSTInfo().displayDate}`, canvasWidth / 2, canvasHeight - 25);

    return await canvas.encode('png');
};
// 💡 【追加】ペットリリース専用のCanvas画像生成魔法だちゅ！
const generatePetReleaseCanvas = async (pet, username) => {
    const canvasWidth = 600;
    const dummyCanvas = createCanvas(1, 1);
    const dummyCtx = dummyCanvas.getContext('2d');

    const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();
    const safePetName = stripEmoji(pet.name);
    
    const releaseMsg = `Lv.${pet.level}まで一緒に過ごした ${safePetName} を自然に還したちゅ。\n今まで本当にありがとう、元気でね…！`;
    const safeMsg = stripEmoji(releaseMsg);

    // テキストの高さを計算
    dummyCtx.font = 'italic 20px NotoSansJP';
    const msgHeight = measureTextHeight(dummyCtx, safeMsg, canvasWidth - 120, 30);

    // 画像読み込み
    const species = petSpecies.find(s => s.name === pet.name);
    const imgPath = path.join(__dirname, 'images', species ? species.image : 'default_pet.jpg');
    let img = null;
    let drawHeight = 300;
    const contentWidth = 400;

    if (fs.existsSync(imgPath)) {
        img = await loadImage(imgPath);
        drawHeight = contentWidth / (img.width / img.height);
    }

    const headerHeight = 100;
    const imgSectionHeight = drawHeight + 40;
    const boxHeight = msgHeight + 80;
    const canvasHeight = headerHeight + imgSectionHeight + boxHeight + 60;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 背景（お別れの寂しさと温かさを表すグレー・ベージュ系）
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#808080'; // 落ち着いたグレーの枠線
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // タイトル
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px NotoSansJP';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('🍃 自然へ還る相棒', canvasWidth / 2, 60);

    let currentY = headerHeight;

    // ペットの画像（モノクロっぽく加工はせず、そのままの姿を焼き付けるちゅ）
    const imgX = (canvasWidth - contentWidth) / 2;
    if (img) {
        ctx.drawImage(img, imgX, currentY, contentWidth, drawHeight);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(imgX, currentY, contentWidth, drawHeight);
    }
    currentY += imgSectionHeight;

    // メッセージボックス
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(40, currentY, canvasWidth - 80, boxHeight);
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, currentY, canvasWidth - 80, boxHeight);

    ctx.textAlign = 'left';
    ctx.font = 'italic 20px NotoSansJP';
    ctx.fillStyle = '#ffffff';
    drawCanvasText(ctx, safeMsg, 60, currentY + 50, canvasWidth - 120, 30);

    // フッター
    ctx.textAlign = 'right';
    ctx.font = '14px NotoSansJP';
    ctx.fillStyle = '#888';
    ctx.fillText(`${username} との思い出を胸に…`, canvasWidth - 50, canvasHeight - 20);

    return await canvas.encode('png');
};
//**************************************************************************************心の天気図（気分記録）******************************************************************************************** */
const kibunDataFile = path.join(__dirname, 'kibun.json');
let userKibun = {}; 
if (fs.existsSync(kibunDataFile)) {
    try { userKibun = JSON.parse(fs.readFileSync(kibunDataFile, 'utf8')); } 
    catch (e) { console.error('気分データの読み込みに失敗したちゅ:', e); }
}
function saveKibun() {
    fs.writeFileSync(kibunDataFile, JSON.stringify(userKibun, null, 2));
}

// レポートを送信するチャンネルを記憶するノート
const kibunSettingsFile = path.join(__dirname, 'kibun_settings.json');
let kibunSettings = {}; 
if (fs.existsSync(kibunSettingsFile)) {
    try { kibunSettings = JSON.parse(fs.readFileSync(kibunSettingsFile, 'utf8')); } 
    catch (e) { console.error('気分設定の読み込みに失敗したちゅ:', e); }
}
function saveKibunSettings() {
    fs.writeFileSync(kibunSettingsFile, JSON.stringify(kibunSettings, null, 2));
}
//****************************************************************************************コマンド処理・開始処理****************************************************************************************** */
client.once('clientReady', async (c) => {
    console.log(`${c.user.tag} (ねずみタロット) がログインしました！🔮`);

    // 💡 統合コマンドと、裏機能(気分記録)だけにするちゅ！
    // 💡 統合コマンドと、裏機能(気分記録)だけにするちゅ！
    const data = [
        { 
            name: 'nezumi', 
            description: 'ねずみの機能（占い・ゲーム・相棒など）を使う総合メニューを開くちゅ！',
            options: [
                {
                    name: 'hidden',
                    type: 5, // 5 は BOOLEAN (True/False) の意味だちゅ！
                    description: '結果を自分だけに見えるようにするかどうか選べるちゅ！(デフォルトはみんなに見えるちゅ)',
                    required: false
                }
            ]
        },
        { name: 'kibun_setchannel', description: '心の天気図（週次レポート）を送信するチャンネルを、自分用に指定するちゅ！☁️' },
        { name: 'kibun_resetchannel', description: '心の天気図のレポート送信先設定をリセット（解除）するちゅ！☁️' },
        {
            name: 'design_upload',
            description: '【管理者用】日替わり看板のHTML/CSSデザインを登録するちゅ！',
            options: [
                {
                    name: 'date',
                    type: 3, // STRING (文字列)
                    description: '表示したい日付（例: 03-16 または 12-25）',
                    required: true
                },
                // 💡 【追加】イベント名を入力する枠だちゅ！
                {
                    name: 'event_name',
                    type: 3, // STRING (文字列)
                    description: 'イベントの名前（例: ひな祭り、クリスマス）',
                    required: true
                },
                {
                    name: 'html_file',
                    type: 11, // ATTACHMENT (ファイル添付)
                    description: 'Satori用のHTMLファイル（文字を入れる場所には {{text}} と書いてちゅ！）',
                    required: true
                },
                {
                    name: 'css_file',
                    type: 11, // ATTACHMENT (ファイル添付)
                    description: '読み込ませたいCSSファイル（オプションだちゅ）',
                    required: false
                }
            ]
        },
        {
            name: 'design_list',
            description: '【管理者用】現在登録されている日替わり看板のリストを確認するちゅ！'
        },
        {
            name: 'design_delete',
            description: '【管理者用】登録した日替わり看板のデザインを削除するちゅ！',
            options: [
                {
                    name: 'date',
                    type: 3, // STRING (文字列)
                    description: '削除したい日付（例: 03-16）',
                    required: true
                }
            ]
        }
    ];

    const guildIds = ['1450709451488100396','1455097564759330958', '1480458980655366188']; 
    await client.application.commands.set([]); // グローバルコマンドをリセット

    for (const id of guildIds) {
        try {
            const guild = client.guilds.cache.get(id);
            if (guild) {
                await guild.commands.set(data);
                console.log(`✅ サーバー [${guild.name}] にコマンドを登録しました。`);
            }
        } catch (error) {
            console.error(`❌ エラー:`, error.message);
        }
    }
    console.log('すべての指定サーバーへの登録処理が完了しました！✨');
    // 💡 毎週日曜日の夜22:00に「心の天気図」を各ユーザーの指定チャンネルに送るタイマー！
    cron.schedule('0 22 * * 0', async () => {
        console.log('🗺️ 心の天気図レポートの送信を開始するちゅ...');
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); 
        const emojis = { 5: '✨', 4: '☀️', 3: '☁️', 2: '🌧️', 1: '⚡' };

        for (const userId in userKibun) {
            const recentRecords = userKibun[userId].filter(r => r.date >= oneWeekAgo);
            if (recentRecords.length === 0) continue; 

            // 💡 ユーザー個人の送信先設定を探す
            const channelId = kibunSettings[userId];
            if (!channelId) continue; // 設定されていなければスキップするちゅ

            let totalLevel = 0;
            let reportText = '';

            recentRecords.forEach(r => {
                totalLevel += r.level;
                const d = new Date(r.date);
                const jstD = new Date(d.getTime() + (9 * 60 * 60 * 1000)); 
                const dateStr = `${jstD.getUTCMonth() + 1}/${jstD.getUTCDate()} ${jstD.getUTCHours()}:${jstD.getUTCMinutes().toString().padStart(2, '0')}`;
                
                reportText += `・${dateStr} | ${emojis[r.level]} Lv.${r.level} ${r.memo ? `(*${r.memo}*)` : ''}\n`;
            });

            const avgLevel = (totalLevel / recentRecords.length).toFixed(1);
            
            let userName = "不明なユーザー";
            try {
                const user = await client.users.fetch(userId);
                userName = user.username;
            } catch(e) {}

            const embed = new EmbedBuilder()
                .setColor(0x9370DB) 
                .setTitle(`🗺️ ${userName} の今週の心の天気図だちゅ！`)
                .setDescription(`今週は **${recentRecords.length}回** 気分を記録してくれたちゅ！\n今週の平均気分レベル: **${avgLevel}**\n\n**【記録まとめ】**\n${reportText.length > 3000 ? "（記録が多すぎるので少し省略するちゅ…！）\n" + reportText.slice(-3000) : reportText}`)
                .setFooter({ text: '来週もマイペースに、無理せず過ごしてちゅ！🍵' });

            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.send({ content: `<@${userId}>`, embeds: [embed] });
                }
            } catch (e) {
                console.log(`❌ チャンネルID: ${channelId} への送信に失敗したちゅ。`);
            }
        }
    }, {
        timezone: "Asia/Tokyo" 
    });
});

//*******************************************************************************************メイン関数***************************************************************************************** */
//*******************************************************************************************メイン関数***************************************************************************************** */
//*******************************************************************************************メイン関数***************************************************************************************** */
client.on('interactionCreate', async (interaction) => {
    // 💡 Modal(ポップアップ)やUserSelectMenuの判定も追加するちゅ！
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu()) return;

    // 💡 元のメッセージが「自分だけに見える（Ephemeral）」設定かどうかを引き継ぐちゅ！
    const isMessageHidden = interaction.message?.flags?.has(MessageFlags.Ephemeral) || false;
    let currentFlags = isMessageHidden ? MessageFlags.Ephemeral : undefined;

    // ==========================================================
    // 🚪 1. 入り口： /nezumi コマンド
    // ==========================================================
    if (interaction.isChatInputCommand() && interaction.commandName === 'nezumi') {
        // 💡 コマンドを打つ時にユーザーが選んだ設定を受け取るちゅ！
        const userWantsHidden = interaction.options.getBoolean('hidden') || false;
        currentFlags = userWantsHidden ? MessageFlags.Ephemeral : undefined;

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('nezumi_main_menu')
                .setPlaceholder('何をして遊ぶちゅ？✨')
                .addOptions([
                    { label: '🔮 占い・スピリチュアル', description: 'タロット、星座、ルーン', value: 'cat_fortune' },
                    { label: '🎮 ゲーム・天気予報', description: '天気、ヒット＆ブロー', value: 'cat_game' },
                    { label: '🐭 ねずみの写真・クイズ', description: '動物画像、ねずみクイズ', value: 'cat_animal' },
                    { label: '🍣 ねずみ寿司', description: 'お寿司の注文、おあいそゲーム', value: 'cat_sushi' },
                    { label: '⚔️ 目指せ！ネズミマスター', description: '相棒のゲット、特訓、バトルなど', value: 'cat_pet' }
                ])
        );
        // 💡 ここで currentFlags を渡して、表示/非表示を決定するちゅ！
        await interaction.reply({ content: 'いらっしゃいちゅ！メニューを選んでね！🐭', components: [row], flags: currentFlags });
    }

    // ==========================================================
    // 📂 2. メインメニューのカテゴリ選択
    // ==========================================================
    else if (interaction.isStringSelectMenu() && interaction.customId === 'nezumi_main_menu') {
        const category = interaction.values[0];
        let buttons = [];

        if (category === 'cat_fortune') {
            buttons = [
                new ButtonBuilder().setCustomId('btn_tarot').setLabel('タロット(1枚)').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_tarot3').setLabel('タロット(3枚)').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_horoscope').setLabel('星座占い').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_rune').setLabel('ルーン占い').setStyle(ButtonStyle.Secondary)
            ];
        } else if (category === 'cat_game') {
            buttons = [
                new ButtonBuilder().setCustomId('btn_weather').setLabel('一週間天気予報').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_hitandblow').setLabel('ヒット＆ブロー').setStyle(ButtonStyle.Success)
            ];
        } else if (category === 'cat_animal') {
            buttons = [
                new ButtonBuilder().setCustomId('btn_mouse').setLabel('マウス').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_rat').setLabel('ラット').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_not_mouse').setLabel('ねずみ？！').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_quiz').setLabel('ねずみクイズ').setStyle(ButtonStyle.Success)
            ];
        } else if (category === 'cat_sushi') {
            buttons = [
                new ButtonBuilder().setCustomId('btn_sushi_order').setLabel('寿司の注文').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_sushi_oaiso').setLabel('おあいそクイズ').setStyle(ButtonStyle.Success)
            ];
        } else if (category === 'cat_pet') {
            buttons = [
                new ButtonBuilder().setCustomId('btn_pet_catch').setLabel('ゲット！🌱').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_pet_status').setLabel('ステータス📊').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_pet_train_menu').setLabel('訓練💪').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_pet_battle_menu').setLabel('バトル⚔️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_pet_ranking').setLabel('ランキング🏆').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_pet_release').setLabel('お別れ🍃').setStyle(ButtonStyle.Secondary)
            ];
        }

        // ボタンは1行につき最大5個なので、必要に応じて分割するちゅ
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        await interaction.update({ content: '遊びたい機能のボタンを押してちゅ！👇', components: rows });
    }

    // ==========================================================
    // 📝 3. モーダル（ポップアップ入力）を開くボタン
    // ==========================================================
    else if (interaction.isButton() && (interaction.customId === 'btn_weather' || interaction.customId === 'btn_hitandblow')) {
        // ※モーダルを開く時は deferUpdate() をしちゃダメだちゅ！
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js'); 
        
        if (interaction.customId === 'btn_weather') {
            const modal = new ModalBuilder().setCustomId('modal_weather').setTitle('一週間天気予報');
            const input = new TextInputBuilder()
                .setCustomId('input_prefecture')
                .setLabel('都道府県の名前を漢字で入力してちゅ')
                .setPlaceholder('例: 和歌山、東京')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            
            await interaction.showModal(modal);
            // 💡 【追加】モーダルを開いた直後、元のメッセージのボタンを消すちゅ！
            try { await interaction.message.edit({ components: [] }); } catch(e) {}
            
        } else if (interaction.customId === 'btn_hitandblow') {
            const modal = new ModalBuilder().setCustomId('modal_hitandblow').setTitle('ヒット＆ブロー');
            const input = new TextInputBuilder()
                .setCustomId('input_guess')
                .setLabel('4桁の数字を入力してちゅ')
                .setPlaceholder('例: 1234')
                .setStyle(TextInputStyle.Short)
                .setMinLength(4).setMaxLength(4)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            
            await interaction.showModal(modal);
            // 💡 【追加】モーダルを開いた直後、元のメッセージのボタンを消すちゅ！
            try { await interaction.message.edit({ components: [] }); } catch(e) {}
        }
    }

    // ==========================================================
    // 👤 4. 特殊な選択メニューを開くボタン（対戦相手、訓練コース）
    // ==========================================================
    else if (interaction.isButton() && interaction.customId === 'btn_pet_train_menu') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_pet_train')
                .setPlaceholder('特訓コースを選んでちゅ！💪')
                .addOptions([
                    { label: '🔥 筋力トレーニング', description: 'ATK・HP重視', value: 'atk' },
                    { label: '🛡️ 防御訓練', description: 'DEF・HP重視', value: 'def' },
                    { label: '💨 走り込み', description: 'SPD重視', value: 'spd' },
                    { label: '🧠 瞑想', description: 'SP・混乱耐性重視', value: 'sp' },
                    { label: '🌟 総合特訓', description: 'バランス良く', value: 'all' }
                ])
        );
        await interaction.update({ content: '相棒の特訓コースを選んでちゅ！', components: [row] });
    }
    
    else if (interaction.isButton() && interaction.customId === 'btn_pet_battle_menu') {
        // Discordの「ユーザー選択メニュー」を使うちゅ！
        const { UserSelectMenuBuilder } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId('select_pet_battle')
                .setPlaceholder('対戦相手のテイマーを選んでちゅ！⚔️')
        );
        await interaction.update({ content: 'バトルを挑む相手を選んでちゅ！', components: [row] });
    }

    // ==========================================================
    // 🚀 5. モーダルの送信 ＆ 選択メニューの確定 ＆ 即実行ボタン
    // ==========================================================
    // (これ以降の処理は、元の処理と同じように deferUpdate() してから editReply() して画像を上書きするちゅ！)
    else {
        // 💡 【超重要】他人がボタンやメニューを横取りするのを防ぐ魔法だちゅ！
        if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) && interaction.message && interaction.message.interaction) {
            // 最初にコマンドを打った本人じゃなかったら、こっそり弾くちゅ！
            if (interaction.user.id !== interaction.message.interaction.user.id) {
                return interaction.reply({ 
                    content: 'これは他の人のメニューだちゅ！自分で `/nezumi` を打って遊んでちゅ！🐭', 
                    flags: MessageFlags.Ephemeral 
                }).catch(e => console.error('横取り防止メッセージの送信エラー:', e));
            }
        }

        // ここに引っかかったら、まずはローディング状態にするちゅ
        if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
            
            // 例外処理：おあいそゲームの中のボタン・メニューは deferUpdate 済みなのでスキップ
            if (interaction.customId !== 'sushi_select_order' && interaction.customId !== 'oaiso_add_item' && interaction.customId !== 'oaiso_bill_please' && !interaction.customId.startsWith('btn_atk') && !interaction.customId.startsWith('btn_def') && !interaction.customId.startsWith('btn_sp') && !interaction.customId.startsWith('btn_special') && interaction.customId !== 'catch_attempt' && interaction.customId !== 'catch_ignore' && interaction.customId !== 'kibun_select_channel' && interaction.customId !== 'correct_nezumi' && interaction.customId !== 'incorrect_nezumi') {
                try { 
                    if (interaction.isModalSubmit()) {
                        // 💡 モーダル送信後も、非表示/表示の設定を引き継いで結果を出すちゅ！
                        await interaction.deferReply({ flags: currentFlags });
                    } else {
                        await interaction.deferUpdate(); 
                        await interaction.editReply({ components: [] });
                    }
                } catch(e) {} 
            }
        }
        
        // 🔮 タロット (btn_tarot)
        if (interaction.customId === 'btn_tarot') {
            await interaction.editReply({ content: '🌌 星の導きを読み解きながら、今日の1枚を描いているちゅ…！🐭🎨' });

        const personalSeed = getPersonalDailyRandom(interaction.user.id);
        const cardIndex = Math.floor(personalSeed * tarotCards.length);
        const selectedCard = tarotCards[cardIndex];

        const reverseSeed = getPersonalDailyRandom(interaction.user.id, 999);
        const isReversed = reverseSeed < 0.5;

        const mouseWhisper = getSingleCardComment(selectedCard, isReversed);
        const geminiPromise = getGeminiReading(selectedCard.name, isReversed, interaction.user.id);

        // 絵文字を取り除く魔法
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '');

        try {
            // 💡 1. カード画像を読み込み、アスペクト比を計算するちゅ！
            const cardWidth = 250;
            let drawHeight = 430; // 仮の高さ
            let img = null;
            const imagePath = path.join(__dirname, 'images', selectedCard.image);
            
            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                const aspectRatio = img.width / img.height;
                drawHeight = cardWidth / Math.max(0.1, aspectRatio);
            }

            // AIの文章を待つちゅ
            const geminiExplanation = await geminiPromise;
            const finalExplanation = geminiExplanation || "運命の糸が絡まってうまく読めなかったちゅ…。";
            
            // 安全なテキストに変換
            const safeExp = stripEmoji(finalExplanation);
            const safeWhisper = stripEmoji(mouseWhisper);
            const safeMeaning = stripEmoji(isReversed ? selectedCard.reversed : selectedCard.upright);

            // 💡 2. 文章の高さを測って、キャンバスの縦幅を決めるちゅ！
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            const maxTextWidth = 600 - 120; // 左右の余白を引いたテキストエリアの幅
            
            dummyCtx.font = '18px NotoSansJP';
            const meaningHeight = measureTextHeight(dummyCtx, safeMeaning, maxTextWidth, 26);
            
            dummyCtx.font = 'italic 18px NotoSansJP';
            const whisperHeight = measureTextHeight(dummyCtx, safeWhisper, maxTextWidth, 26);
            
            dummyCtx.font = '18px NotoSansJP';
            const expHeight = measureTextHeight(dummyCtx, safeExp, maxTextWidth, 26);

            // 枠の中の文字の高さを全部足し算するちゅ
            // (タイトル高さ+余白+本文高さ) を3項目分足す
            const boxContentHeight = (24 + 15 + meaningHeight) + 25 + (24 + 15 + whisperHeight) + 25 + (24 + 15 + expHeight);
            const boxPadding = 40;
            const boxHeight = boxContentHeight + boxPadding * 2;

            // レイアウトの基準位置（Y座標）
            const cardAreaTop = 110;
            const textYStart = cardAreaTop + drawHeight + 35;
            const boxStartY = textYStart + 60; 
            
            const canvasWidth = 600; // 1枚引きだからスリムにするちゅ！
            const canvasHeight = boxStartY + boxHeight + 50; 

            // 💡 3. ピッタリサイズのキャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#5865F2';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${interaction.user.username}さんの今日のお告げ`, canvasWidth / 2, 60);

            // 💡 カード画像の描画
            const centerX = canvasWidth / 2;
            if (img) {
                ctx.save();
                ctx.translate(centerX, cardAreaTop + drawHeight / 2);
                if (isReversed) ctx.rotate(Math.PI);
                ctx.drawImage(img, -cardWidth / 2, -drawHeight / 2, cardWidth, drawHeight);
                ctx.restore();
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(centerX - cardWidth / 2, cardAreaTop, cardWidth, drawHeight);
                ctx.fillStyle = '#fff';
                ctx.font = '16px NotoSansJP';
                ctx.fillText('画像なし', centerX, cardAreaTop + drawHeight / 2);
            }

            // カード名と正逆
            ctx.font = 'bold 24px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(selectedCard.name, centerX, textYStart);

            ctx.font = '20px NotoSansJP';
            ctx.fillStyle = isReversed ? '#FF6347' : '#e0e0e0';
            ctx.fillText(isReversed ? '逆位置' : '正位置', centerX, textYStart + 30);

            // 💡 解説エリアの背景
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, boxStartY, canvasWidth - 80, boxHeight);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, boxStartY, canvasWidth - 80, boxHeight);

            // 💡 解説テキストの描画
            let textY = boxStartY + 45; 
            const textX = 60;

            // ① カードの意味
            ctx.textAlign = 'left';
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#5865F2';
            ctx.fillText('カードの意味', textX, textY);
            textY += 30;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            textY = drawCanvasText(ctx, safeMeaning, textX, textY, maxTextWidth, 26);
            
            textY += 25;
            
            // ② ねずみのささやき
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#00FA9A';
            ctx.fillText('ねずみのささやき', textX, textY);
            textY += 30;
            ctx.font = 'italic 18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            textY = drawCanvasText(ctx, safeWhisper, textX, textY, maxTextWidth, 26);

            textY += 25;

            // ③ ねずみの特別解説 (Gemini)
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('ねずみの特別解説', textX, textY);
            textY += 30;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, safeExp, textX, textY, maxTextWidth, 26);

            // 日付
            ctx.textAlign = 'right';
            ctx.font = '16px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`今日（${getJSTInfo().displayDate}）のお告げだちゅ！`, canvasWidth - 50, canvasHeight - 20);

            // 💡 PNG画像に変換して送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'tarot1_canvas.png' });

            await interaction.editReply({ content: 'お待たせしたちゅ！今日のあなたへのお告げだちゅ！✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvas描画エラー(tarot1):', error);
            await interaction.editReply({ content: '絵を描く途中で筆が折れちゃったちゅ…。ログを確認してちゅ💦' });
        }
        }
        
        // 🔮 タロット3枚 (btn_tarot3)
        else if (interaction.customId === 'btn_tarot3') {
            await interaction.editReply({ content: '🌌 星の導きを読み解きながら、1枚の絵を描いているちゅ…！🐭🎨' });

        const positions = ['過去', '現在', '未来'];
        const drawnResults = []; 
        let tempDeck = [...tarotCards];

        for (let i = 0; i < 3; i++) {
            const personalSeed = getPersonalDailyRandom(interaction.user.id, (i + 1) * 777);
            const cardIndex = Math.floor(personalSeed * tempDeck.length);
            const card = tempDeck.splice(cardIndex, 1)[0];

            const reverseSeed = getPersonalDailyRandom(interaction.user.id, (i + 1) * 999);
            const isReversed = reverseSeed < 0.5;

            drawnResults.push({ name: card.name, isReversed: isReversed, card: card, position: positions[i] });
        }

        const geminiPromise = getGeminiReading3(drawnResults, interaction.user.username);
        const storyResult = generateTarotStory(drawnResults[0], drawnResults[1], drawnResults[2]);
        
        // 絵文字を取り除く魔法
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '');

        try {
            // 💡 1. 最初に画像を全部読み込んで、一番背が高いカードのサイズ（maxDrawHeight）を計算するちゅ！
            const loadedImages = [];
            let maxDrawHeight = 0;
            const cardWidth = 200;

            for (let i = 0; i < 3; i++) {
                const imagePath = path.join(__dirname, 'images', drawnResults[i].card.image);
                if (fs.existsSync(imagePath)) {
                    const img = await loadImage(imagePath);
                    loadedImages.push(img);
                    const aspectRatio = img.width / img.height;
                    const drawHeight = cardWidth / Math.max(0.1, aspectRatio); // アスペクト比を維持！
                    if (drawHeight > maxDrawHeight) maxDrawHeight = drawHeight;
                } else {
                    loadedImages.push(null);
                    if (344 > maxDrawHeight) maxDrawHeight = 344;
                }
            }

            // AIの文章を待つちゅ
            const geminiExplanation = await geminiPromise;
            const finalExplanation = geminiExplanation || "運命の糸が絡まってうまく読めなかったちゅ…。";
            const shortExp = finalExplanation.length > 400 ? finalExplanation.slice(0, 400) + '...' : finalExplanation;
            const safeExp = stripEmoji(shortExp);

            // 💡 2. 文章の高さを測って、全体のキャンバスサイズをピッタリ決めるちゅ！
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            
            dummyCtx.font = 'italic 18px NotoSansJP';
            const storyHeight = measureTextHeight(dummyCtx, storyResult.message, 840 - 120, 26);
            
            dummyCtx.font = '18px NotoSansJP';
            const expHeight = measureTextHeight(dummyCtx, safeExp, 840 - 120, 26);

            const boxPadding = 40;
            // 枠の中の文字の高さを全部足し算するちゅ
            const boxContentHeight = 24 + 15 + storyHeight + 25 + 22 + 15 + expHeight;
            const boxHeight = boxContentHeight + boxPadding * 2;

            // カードの開始位置と、解説枠の開始位置
            const cardAreaTop = 140;
            const boxStartY = cardAreaTop + maxDrawHeight + 90; // 💡 カードの高さに合わせて枠を上に詰めるちゅ！
            
            const canvasWidth = 840;
            const canvasHeight = boxStartY + boxHeight + 50; // 余白を足して最終的なキャンバスサイズを決定！

            // 💡 3. ピッタリサイズのキャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#5865F2';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            ctx.textAlign = 'center';
            ctx.font = 'bold 36px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${interaction.user.username}さんの運命の3枚引き`, canvasWidth / 2, 60);

            // 3枚のカードを描画
            const startX = 60;
            const gap = 60;

            for (let i = 0; i < 3; i++) {
                const result = drawnResults[i];
                const cx = startX + (cardWidth + gap) * i;
                const centerX = cx + cardWidth / 2;

                ctx.textAlign = 'center';
                ctx.font = 'bold 24px NotoSansJP';
                ctx.fillStyle = '#00FA9A';
                ctx.fillText(result.position, centerX, 120);

                const img = loadedImages[i];
                if (img) {
                    const aspectRatio = img.width / img.height;
                    const drawHeight = cardWidth / aspectRatio;
                    
                    ctx.save();
                    // 💡 画像の中心を「一番高いカードの中央」に合わせることで、ガタガタにならないようにするちゅ！
                    const yOffset = (maxDrawHeight - drawHeight) / 2;
                    ctx.translate(cx + cardWidth / 2, cardAreaTop + yOffset + drawHeight / 2);
                    if (result.isReversed) ctx.rotate(Math.PI); 
                    ctx.drawImage(img, -cardWidth / 2, -drawHeight / 2, cardWidth, drawHeight);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(cx, cardAreaTop, cardWidth, 344);
                    ctx.fillStyle = '#fff';
                    ctx.font = '16px NotoSansJP';
                    ctx.fillText('画像なし', centerX, cardAreaTop + 344 / 2);
                }

                // 💡 カードの下の文字も、一番高いカード（maxDrawHeight）を基準に揃えるちゅ！
                const textYStart = cardAreaTop + maxDrawHeight + 35;
                ctx.font = 'bold 20px NotoSansJP';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(result.card.name, centerX, textYStart);

                ctx.font = '18px NotoSansJP';
                ctx.fillStyle = result.isReversed ? '#FF6347' : '#e0e0e0';
                ctx.fillText(result.isReversed ? '逆位置' : '正位置', centerX, textYStart + 30);
            }

            // 解説エリアの背景
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, boxStartY, canvasWidth - 80, boxHeight);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, boxStartY, canvasWidth - 80, boxHeight);

            // 解説テキストの描画
            let textY = boxStartY + 45; // 枠内のスタート位置
            ctx.textAlign = 'left';
            ctx.font = 'bold 24px NotoSansJP';
            ctx.fillStyle = '#5865F2';
            ctx.fillText(`あなたの物語: ${stripEmoji(storyResult.storyType)}`, 60, textY);

            textY += 35;
            ctx.font = 'italic 18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            textY = drawCanvasText(ctx, storyResult.message, 60, textY, canvasWidth - 120, 26);

            textY += 25;
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            ctx.fillText('ねずみの統合リーディング', 60, textY);

            textY += 35;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, safeExp, 60, textY, canvasWidth - 120, 26);

            // 日付
            ctx.textAlign = 'right';
            ctx.font = '16px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`今日（${getJSTInfo().displayDate}）の運命だちゅ！`, canvasWidth - 50, canvasHeight - 20);

            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'tarot3_canvas.png' });

            await interaction.editReply({ content: 'お待たせしたちゅ！あなたの運命の3枚引きだちゅ！✨', files: [attachment] });

        } catch (error) {
            console.error('Canvas描画エラー:', error);
            await interaction.editReply({ content: '絵を描く途中で筆が折れちゃったちゅ…。ログを確認してちゅ💦' });
        }
        }
        
        // 🔮 星座占い (btn_horoscope)
        else if (interaction.customId === 'btn_horoscope') {
            await interaction.editReply({ content: '🌌 星座の瞬きを読み解いて、占いボードを描いているちゅ…！🐭🎨' });

        const ranking = signs.map((name, index) => {
            const score = Math.floor(getDailyRandom(index) * 100) + 1;
            const itemIdx = Math.floor(getDailyRandom(index + 100) * luckyItems.length);
            return { name, score, luckyItem: luckyItems[itemIdx] };
        });
        ranking.sort((a, b) => b.score - a.score);

        const fullMessage = await getGeminiFullHoroscope(ranking);
        const lines = fullMessage.split('\n');
        
        // 💡 修正：抱負が空欄になるのを防ぐ、完璧な読み取り魔法だちゅ！
        let rawHoufu = "楽しく過ごそうちゅ！";
        const houfuIndex = lines.findIndex(l => l.includes('抱負'));
        if (houfuIndex !== -1) {
            const parts = lines[houfuIndex].split(/[：:]/);
            let extracted = parts.slice(1).join(':').trim(); // コロン以降を取得（スペースは取り除く）
            
            // 「抱負：」の後に改行して次の行に書かれている場合の対策
            if (extracted === '' && lines.length > houfuIndex + 1) {
                extracted = lines.slice(houfuIndex + 1).join(' ').trim();
            }
            
            if (extracted !== '') {
                rawHoufu = extracted.replace(/\*/g, '');
            }
        }

        // 絵文字を取り除く魔法（Canvasの文字化け防止！）
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();
        
        let safeHoufu = stripEmoji(rawHoufu);
        
        // 💡 安全装置：絵文字だけで消えちゃったり、取得失敗した時はデフォルトの言葉を入れるちゅ！
        if (!safeHoufu || safeHoufu === '') {
            safeHoufu = "今日も1日、自分のペースで楽しく過ごそうちゅ！";
        }

        try {
            const canvasWidth = 800;
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            
            // 抱負の高さ計算
            dummyCtx.font = 'italic 20px NotoSansJP';
            const houfuHeight = measureTextHeight(dummyCtx, safeHoufu, canvasWidth - 120, 28);
            
            const headerHeight = 180 + houfuHeight; 
            
            const panelsData = [];
            let totalPanelsHeight = 0;
            const panelPadding = 20;

            for (let i = 0; i < ranking.length; i++) {
                const item = ranking[i];
                
                const targetLine = lines.find(l => l.includes(`${i+1}位`));
                let comment = "";
                if (targetLine) {
                    const parts = targetLine.split(/[：:]/);
                    if (parts.length > 1) {
                        comment = parts.slice(1).join(':').replace(/\*/g, '').trim();
                    } else {
                        comment = targetLine.replace(new RegExp(`.*${i+1}位.*`), '').replace(/\*/g, '').trim();
                    }
                }
                comment = comment.replace(new RegExp(`${item.name}[:：]?`), '').trim();
                
                let safeComment = stripEmoji(comment);
                
                // 💡 各星座のコメントも空欄にならないように安全装置を追加だちゅ！
                if (!safeComment || safeComment === '') {
                    safeComment = "今日はきっといいことがあるちゅ！応援してるちゅ！";
                }

                dummyCtx.font = '18px NotoSansJP';
                const commentWidth = canvasWidth - 120;
                const commentHeight = measureTextHeight(dummyCtx, safeComment, commentWidth, 26);
                
                const isTop3 = i < 3;
                const extraHeight = isTop3 ? 30 : 0;
                const panelHeight = 40 + commentHeight + extraHeight + panelPadding * 2;
                
                panelsData.push({
                    rankNum: i + 1,
                    name: item.name,
                    score: item.score,
                    luckyItem: item.luckyItem,
                    comment: safeComment,
                    panelHeight,
                    isTop3
                });
                
                totalPanelsHeight += panelHeight + 15;
            }

            const footerHeight = 60;
            const canvasHeight = headerHeight + totalPanelsHeight + footerHeight;

            // キャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // ヘッダー（タイトル）
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`ねずみ星座占い（${getJSTInfo().displayDate}）`, canvasWidth / 2, 60);

            // 抱負エリア
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, 90, canvasWidth - 80, 50 + houfuHeight);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 90, canvasWidth - 80, 50 + houfuHeight);

            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('今日の抱負', canvasWidth / 2, 125);
            
            ctx.textAlign = 'left';
            ctx.font = 'italic 20px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, safeHoufu, 60, 160, canvasWidth - 120, 28);

            // 各星座のパネルを描画
            let currentY = headerHeight;
            const startX = 40;
            const panelWidth = canvasWidth - 80;

            for (let i = 0; i < panelsData.length; i++) {
                const day = panelsData[i];
                
                // パネルの背景色と枠線 (1位:金, 2位:銀, 3位:銅, 4位以下:グレー)
                ctx.fillStyle = i === 0 ? '#3a3515' : i === 1 ? '#2a2a2a' : i === 2 ? '#362210' : '#2b2d31';
                ctx.fillRect(startX, currentY, panelWidth, day.panelHeight);
                ctx.strokeStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#444';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, currentY, panelWidth, day.panelHeight);

                // 星座名と順位
                ctx.textAlign = 'left';
                ctx.font = 'bold 24px NotoSansJP';
                ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#87CEEB';
                
                const scoreText = day.isTop3 ? ` (${day.score}点)` : '';
                ctx.fillText(`第${day.rankNum}位 : ${day.name}${scoreText}`, startX + 20, currentY + 35);

                // コメント
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '18px NotoSansJP';
                let nextY = drawCanvasText(ctx, day.comment, startX + 20, currentY + 70, panelWidth - 40, 26);

                // ラッキーアイテム (Top 3 のみ表示)
                if (day.isTop3) {
                    ctx.fillStyle = '#FFB6C1';
                    ctx.font = 'bold 18px NotoSansJP';
                    ctx.fillText(`ラッキーアイテム: ${day.luckyItem}`, startX + 20, nextY + 10);
                }

                currentY += day.panelHeight + 15;
            }

            // フッター
            ctx.textAlign = 'right';
            ctx.font = '16px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`今日調べた運勢だちゅ！`, canvasWidth - 30, canvasHeight - 20);

            // PNG画像に変換！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'horoscope_canvas.png' });

            await interaction.editReply({ content: 'お待たせしたちゅ！今日の星座ランキングだちゅ！✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvas星座占いエラー:', error);
            await interaction.editReply({ content: '星の軌道を計算中に、望遠鏡が壊れちゃったちゅ…。' });
        }
        }
        
        // 🔮 ルーン占い (btn_rune)
        else if (interaction.customId === 'btn_rune') {
            await interaction.editReply({ content: '🌌 石に刻まれた古代の文字を読み解いて、1枚の絵にしているちゅ…！🐭🎨' });

        const personalSeed = getPersonalDailyRandom(interaction.user.id, 777);
        const runeIndex = Math.floor(personalSeed * runeAlphabet.length);
        const selectedRune = runeAlphabet[runeIndex];

        // 逆位置が存在しないルーン文字のリスト
        const noReverseRunes = ['ᛗ', 'ᚷ', 'ᚹ', 'ᚻ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛊ', 'ᛝ', 'ᛞ'];
        let isReversed = getPersonalDailyRandom(interaction.user.id, 888) < 0.5;
        if (noReverseRunes.includes(selectedRune.symbol)) isReversed = false;

        const geminiPromise = getGeminiRuneReading(selectedRune.name, isReversed, interaction.user.username);

        // 絵文字を取り除く魔法（Canvasの文字化け防止！）
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

        try {
            // 💡 1. ルーン画像を読み込み、アスペクト比を計算するちゅ！
            const cardWidth = 250;
            let drawHeight = 250; 
            let img = null;
            const imagePath = path.join(__dirname, 'images', selectedRune.image);
            
            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                const aspectRatio = img.width / img.height;
                drawHeight = cardWidth / Math.max(0.1, aspectRatio);
            }

            // AIの文章を待つちゅ
            const geminiExplanation = await geminiPromise;
            const finalExplanation = geminiExplanation || "石の言葉がうまく読み取れなかったちゅ…。";
            
            // 安全なテキストに変換
            const safeSymbol = selectedRune.symbol; 
            const safeMeaning = stripEmoji(selectedRune.meaning);
            const safeStoneMeaning = stripEmoji(isReversed ? selectedRune.reversed : selectedRune.upright);
            const safeExp = stripEmoji(finalExplanation);

            // 💡 2. 文章の高さを測って、キャンバスの縦幅を決めるちゅ！
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            const maxTextWidth = 600 - 120; 
            
            dummyCtx.font = '18px NotoSansJP';
            const meaningHeight = measureTextHeight(dummyCtx, safeStoneMeaning, maxTextWidth, 26);
            const expHeight = measureTextHeight(dummyCtx, safeExp, maxTextWidth, 26);

            // 枠の中の文字の高さを全部足し算するちゅ
            const symbolTitleHeight = 24 + 15 + 26; // 象徴タイトル + 余白 + 中身
            const meaningSectionHeight = 24 + 15 + meaningHeight;
            const expSectionHeight = 24 + 15 + expHeight;
            
            const boxContentHeight = symbolTitleHeight + 25 + meaningSectionHeight + 25 + expSectionHeight;
            const boxPadding = 40;
            const boxHeight = boxContentHeight + boxPadding * 2;

            // レイアウトの基準位置（Y座標）
            const cardAreaTop = 110;
            const textYStart = cardAreaTop + drawHeight + 35;
            const boxStartY = textYStart + 60; 
            
            const canvasWidth = 600; 
            const canvasHeight = boxStartY + boxHeight + 50; 

            // 💡 3. ピッタリサイズのキャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線（古代の石板をイメージしたブラウン系）
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#8B4513'; 
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px NotoSansJP';
            ctx.fillStyle = '#FFD700'; 
            ctx.fillText(`今日のルーン：${safeSymbol} ${selectedRune.name}`, canvasWidth / 2, 60);

            // 💡 石の画像の描画
            const centerX = canvasWidth / 2;
            if (img) {
                ctx.save();
                ctx.translate(centerX, cardAreaTop + drawHeight / 2);
                if (isReversed) ctx.rotate(Math.PI);
                ctx.drawImage(img, -cardWidth / 2, -drawHeight / 2, cardWidth, drawHeight);
                ctx.restore();
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(centerX - cardWidth / 2, cardAreaTop, cardWidth, drawHeight);
                ctx.fillStyle = '#fff';
                ctx.font = '16px NotoSansJP';
                ctx.fillText('画像なし', centerX, cardAreaTop + drawHeight / 2);
            }

            // ルーン名と正逆
            ctx.font = 'bold 24px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(selectedRune.name, centerX, textYStart);

            ctx.font = '20px NotoSansJP';
            ctx.fillStyle = isReversed ? '#FF6347' : '#e0e0e0';
            ctx.fillText(isReversed ? '逆位置' : '正位置', centerX, textYStart + 30);

            // 💡 解説エリアの背景
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, boxStartY, canvasWidth - 80, boxHeight);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, boxStartY, canvasWidth - 80, boxHeight);

            // 💡 解説テキストの描画
            let textY = boxStartY + 45; 
            const textX = 60;

            // ① 象徴
            ctx.textAlign = 'left';
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#D2691E'; // チョコレートのような濃いオレンジ
            ctx.fillText('象徴', textX, textY);
            textY += 30;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            ctx.fillText(safeMeaning, textX, textY);
            
            textY += 35; 
            
            // ② 石に刻まれた意味
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#D2691E';
            ctx.fillText('石に刻まれた意味', textX, textY);
            textY += 30;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            textY = drawCanvasText(ctx, safeStoneMeaning, textX, textY, maxTextWidth, 26);

            textY += 25;

            // ③ ねずみのお告げ (Gemini)
            ctx.font = 'bold 22px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('ねずみのお告げ', textX, textY);
            textY += 30;
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            drawCanvasText(ctx, safeExp, textX, textY, maxTextWidth, 26);

            // 日付
            ctx.textAlign = 'right';
            ctx.font = '16px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`${getJSTInfo().displayDate} の石の言葉だちゅ！`, canvasWidth - 50, canvasHeight - 20);

            // 💡 PNG画像に変換して送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'rune_canvas.png' });

            await interaction.editReply({ content: 'お待たせしたちゅ！今日のあなたへの石の言葉だちゅ！✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvasルーン占いエラー:', error);
            await interaction.editReply({ content: '石の言葉を読み取る途中でつまづいちゃったちゅ…。ログを確認してちゅ💦' });
        }
        }

        // 🌤️ 天気予報 (モーダルの送信)
        // 🌤️ 天気予報 (モーダルの送信)
        else if (interaction.isModalSubmit() && interaction.customId === 'modal_weather') {
            // モーダルから入力された都道府県を取得！
            const pref = interaction.fields.getTextInputValue('input_prefecture');
            await interaction.editReply({ content: '🌤️ 空模様を調べて、1枚の天気図を描いているちゅ…！🐭🎨' });

            // 💡 修正：「北海道」の「道」が消えないように、末尾の「都・府・県」だけを消す魔法だちゅ！
            const target = prefCoords[pref.replace(/(都|府|県)$/, '')]; 

            if (!target) {
                return interaction.editReply({ content: 'その都道府県のデータが見つからなかったちゅ…。漢字で正しく入力してちゅ！（例：東京、北海道、京都）' });
            }
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;
            const response = await axios.get(url);
            const daily = response.data.daily;

            // 絵文字を取り除く魔法（文字化け防止）
            const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

            const canvasWidth = 800;
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            
            // 💡 1. データの準備と、各曜日の「パネルの高さ」を事前計算するちゅ！
            const daysData = [];
            let totalPanelsHeight = 0;
            const panelPadding = 20;

            for (let i = 0; i < 7; i++) {
                const code = daily.weathercode[i];
                const rainProb = daily.precipitation_probability_max[i];
                const maxTemp = daily.temperature_2m_max[i];
                const minTemp = daily.temperature_2m_min[i];
            
                const weatherStatus = stripEmoji(getWeatherStatus(code));
                const mouseComment = stripEmoji(getMouseComment(code, rainProb, maxTemp));
                const dateStr = daily.time[i];

                dummyCtx.font = '18px NotoSansJP';
                // 右側のコメントエリアの幅 (全体の幅 - 左側の情報幅 - パディング)
                const commentAreaWidth = canvasWidth - 360 - panelPadding * 3;
                const commentHeight = measureTextHeight(dummyCtx, mouseComment, commentAreaWidth, 26);
                
                // パネルの高さ（最低90px、コメントが長ければそれに合わせる）
                const panelHeight = Math.max(90, commentHeight + panelPadding * 2);
                
                daysData.push({
                    date: dateStr,
                    status: weatherStatus,
                    maxTemp, minTemp, rainProb,
                    comment: mouseComment,
                    panelHeight
                });
                
                totalPanelsHeight += panelHeight + 15; // 15はパネル同士の隙間
            }

            // 💡 2. キャンバス全体の高さを決定！
            const headerHeight = 120;
            const footerHeight = 60;
            const canvasHeight = headerHeight + totalPanelsHeight + footerHeight;

            // 💡 3. ピッタリサイズのキャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#0099FF';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px NotoSansJP';
            ctx.fillStyle = '#87CEEB';
            ctx.fillText(`${pref}の1週間予報`, canvasWidth / 2, 60);
            
            ctx.font = '20px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            ctx.fillText('ねずみが空模様を調べてきたちゅ！', canvasWidth / 2, 95);

            // 各曜日のパネルを描画
            let currentY = headerHeight;
            const startX = 40;
            const panelWidth = canvasWidth - 80;

            for (let i = 0; i < 7; i++) {
                const day = daysData[i];
                
                // パネルの背景
                ctx.fillStyle = '#2b2d31';
                ctx.fillRect(startX, currentY, panelWidth, day.panelHeight);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, currentY, panelWidth, day.panelHeight);

                // 左側の情報 (日付、天気、気温、降水確率)
                ctx.textAlign = 'left';
                
                // 日付
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 22px NotoSansJP';
                ctx.fillText(day.date, startX + 20, currentY + 35);

                // 天気ステータス
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px NotoSansJP';
                ctx.fillText(day.status, startX + 160, currentY + 35);

                // 気温と降水確率
                ctx.fillStyle = '#ff6b6b'; // 最高気温(赤系)
                ctx.font = '20px NotoSansJP';
                ctx.fillText(`${day.maxTemp}℃`, startX + 20, currentY + 70);
                
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`/`, startX + 80, currentY + 70);

                ctx.fillStyle = '#4dabf7'; // 最低気温(青系)
                ctx.fillText(`${day.minTemp}℃`, startX + 100, currentY + 70);

                ctx.fillStyle = '#87CEEB'; // 降水確率
                ctx.fillText(`降水確率: ${day.rainProb}%`, startX + 180, currentY + 70);

                // 右側のねずみコメント
                ctx.fillStyle = '#e0e0e0';
                ctx.font = 'italic 18px NotoSansJP';
                drawCanvasText(ctx, day.comment, startX + 360, currentY + 35, panelWidth - 360 - 20, 26);

                // 次のパネルのY座標へ移動
                currentY += day.panelHeight + 15;
            }

            // フッター
            ctx.textAlign = 'right';
            ctx.font = '16px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`今日（${getJSTInfo().displayDate}）調べたお天気だちゅ！`, canvasWidth - 30, canvasHeight - 20);

            // 💡 PNG画像に変換して送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'weather_canvas.png' });

            await interaction.editReply({ content: 'お待たせしたちゅ！今週の空模様だちゅ！☁️✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvas天気予報エラー:', error);
            await interaction.editReply({ content: 'お天気を調べてる途中で、風に飛ばされちゃったちゅ…。' });
        }
        }

        // 🔢 ヒットアンドブロー (モーダルの送信)
        // 🔢 ヒットアンドブロー (モーダルの送信)
        else if (interaction.isModalSubmit() && interaction.customId === 'modal_hitandblow') {
            // 💡 修正：モーダルの入力値は options ではなく fields.getTextInputValue で受け取るちゅ！
            const guess = interaction.fields.getTextInputValue('input_guess');
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

            // 💡 元のメニューボタンを綺麗に消して、結果を表示するちゅ！
            await interaction.editReply({ 
                content: 'ヒット＆ブローの結果だちゅ！🎯', 
                embeds: [embed], 
                components: [] 
            });
        }

        // 🐭 ねずみ画像関連
        else if (['btn_mouse', 'btn_rat', 'btn_not_mouse'].includes(interaction.customId)) {
        let selectedList = [];
        let titleMsg = "";
        let themeColor = ""; // 💡 枠線や文字の色をコマンドごとに変えるちゅ！

        // 💡 絵文字(🐭や🐀)はCanvasの文字化けを防ぐためにタイトルから抜いておくちゅ
        if (interaction.commandName === 'mouse') {
            selectedList = extraImages.mouse;
            titleMsg = '可愛いねずみが見つかったよ！';
            themeColor = '#FFB6C1'; // ピンク系
        } else if (interaction.commandName === 'rat') {
            selectedList = extraImages.rat;
            titleMsg = 'かっこいいラットが登場だちゅ！';
            themeColor = '#87CEFA'; // ブルー系
        } else if (interaction.commandName === 'nezumi') {
            selectedList = extraImages.not_mouse;
            titleMsg = 'これ……ねずみなのかなぁ……？';
            themeColor = '#FFD700'; // ゴールド系
        }

        const chosen = selectedList[Math.floor(Math.random() * selectedList.length)];
        const imagePath = path.resolve(__dirname, 'images', chosen.file);

        if (!fs.existsSync(imagePath)) {
            return interaction.editReply({ content: 'ごめんね、その子は今お散歩中みたいだちゅ……。' });
        }

        try {
            // 💡 1. 画像を読み込んでアスペクト比を計算！
            const img = await loadImage(imagePath);
            const canvasWidth = 600;
            const contentWidth = 500; // 画像の表示幅
            
            // アスペクト比を維持した高さを計算するちゅ
            const aspectRatio = img.width / img.height;
            const drawHeight = contentWidth / Math.max(0.1, aspectRatio);
            
            // 全体のキャンバス高さを決定 (上の余白 + 画像の高さ + 下の余白)
            const headerHeight = 100;
            const footerHeight = 80;
            const canvasHeight = headerHeight + drawHeight + footerHeight;

            // 💡 2. ピッタリサイズのキャンバスを作って描画スタート！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px NotoSansJP';
            ctx.fillStyle = themeColor;
            ctx.fillText(titleMsg, canvasWidth / 2, 60);

            // 💡 写真の描画
            const imgX = (canvasWidth - contentWidth) / 2;
            const imgY = headerHeight;
            
            // 画像を描画
            ctx.drawImage(img, imgX, imgY, contentWidth, drawHeight);
            
            // 写真の周りに白い枠線をつけて、ポラロイドっぽくするちゅ！
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(imgX, imgY, contentWidth, drawHeight);

            // 下部に名前を描画
            ctx.font = 'bold 26px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`この子の名前は ${chosen.name} だちゅ！`, canvasWidth / 2, imgY + drawHeight + 50);

            // 💡 PNG画像に変換して送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'animal_canvas.png' });

            // Discordのテキスト部分には絵文字をつけて送るちゅ！🐾
            await interaction.editReply({ content: 'お友達を連れてきたちゅ！🐾✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvas動物画像エラー:', error);
            await interaction.editReply({ content: '写真の現像に失敗しちゃったちゅ…。' });
        }
        }
        
        // 🐭 ねずみクイズ (btn_quiz)
        else if (interaction.customId === 'btn_quiz') {
            const isNezumi = Math.random() < 0.5;
        let category = isNezumi ? (Math.random() < 0.5 ? 'mouse' : 'rat') : 'not_mouse';
        const chosen = extraImages[category][Math.floor(Math.random() * extraImages[category].length)];
        const imagePath = path.resolve(__dirname, 'images', chosen.file);

        if (!fs.existsSync(imagePath)) {
            return interaction.editReply({ content: '画像がお散歩中で見つからないちゅ…。' });
        }

        try {
            // 💡 1. 画像を読み込んでアスペクト比を計算！
            const img = await loadImage(imagePath);
            const canvasWidth = 600;
            const contentWidth = 500;
            
            const aspectRatio = img.width / img.height;
            const drawHeight = contentWidth / Math.max(0.1, aspectRatio);
            
            // キャンバス高さを決定
            const headerHeight = 120;
            const footerHeight = 40;
            const canvasHeight = headerHeight + drawHeight + footerHeight;

            // 💡 2. キャンバスを作る魔法の関数（問題用と結果用で使い回すちゅ！）
            const buildQuizCanvas = async (isResult = false, isCorrect = false) => {
                const canvas = createCanvas(canvasWidth, canvasHeight);
                const ctx = canvas.getContext('2d');

                // 枠線の色 (出題中:オレンジ, 正解:緑, 不正解:赤)
                let themeColor = isResult ? (isCorrect ? '#00FF00' : '#FF0000') : '#FFA500';

                // 背景と枠線
                ctx.fillStyle = '#1e1e24';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

                ctx.textAlign = 'center';
                
                // タイトルとサブタイトルの文字を描画（※文字化け防止のため絵文字はナシだちゅ）
                if (!isResult) {
                    ctx.font = 'bold 36px NotoSansJP';
                    ctx.fillStyle = themeColor;
                    ctx.fillText('ねずみクイズ！', canvasWidth / 2, 50);
                    ctx.font = '20px NotoSansJP';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText('この画像の子は「ねずみ」かな？', canvasWidth / 2, 90);
                } else {
                    ctx.font = 'bold 36px NotoSansJP';
                    ctx.fillStyle = themeColor;
                    ctx.fillText(isCorrect ? '正解だちゅ！' : 'あちゃ〜、残念だちゅ…', canvasWidth / 2, 50);
                    ctx.font = '20px NotoSansJP';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`この子の正体は ${chosen.name} でした！`, canvasWidth / 2, 90);
                }

                // 写真の描画（アスペクト比維持！）
                const imgX = (canvasWidth - contentWidth) / 2;
                const imgY = headerHeight;
                ctx.drawImage(img, imgX, imgY, contentWidth, drawHeight);
                
                // 写真の白い枠線
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(imgX, imgY, contentWidth, drawHeight);

                return await canvas.encode('png');
            };

            // 💡 3. まずは「問題の画像」を作って送信するちゅ！
            const questionPng = await buildQuizCanvas(false, false);
            const attachment = new AttachmentBuilder(questionPng, { name: 'quiz_canvas.png' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('correct_nezumi').setLabel('ねずみだちゅ！').setEmoji('🐭').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('incorrect_nezumi').setLabel('ねずみじゃない！').setEmoji('❌').setStyle(ButtonStyle.Danger)
            );

            // 💡 修正：response に直接入れるのではなく、一度送信してから fetchReply() で掴むちゅ！
            await interaction.editReply({ 
                content: '❓ クイズの時間だちゅ！下のボタンから選んでね！', 
                embeds: [], // 古いEmbedが残らないように空にするちゅ
                files: [attachment], 
                components: [row] 
            });

            // 💡 【超重要】送信したメッセージをここでしっかりと掴むちゅ！
            const message = await interaction.fetchReply();
            const filter = i => i.user.id === interaction.user.id;
            
            try {
                // 💡 4. ボタンが押されるのを待つちゅ（余裕をもって60秒に変更！）
                const confirmation = await message.awaitMessageComponent({ filter, time: 60000 });
                const userChoice = (confirmation.customId === 'correct_nezumi');
                const isCorrect = (userChoice === isNezumi);

                // 💡 5. ボタンが押されたら「結果の画像」を作り直して上書きするちゅ！
                const resultPng = await buildQuizCanvas(true, isCorrect);
                const resultAttachment = new AttachmentBuilder(resultPng, { name: 'quiz_result.png' });

                await confirmation.update({ 
                    content: isCorrect ? '🎊 おめでとう！ねずみマスターだちゅ！' : '😢 どんまいだちゅ…次は当ててね！', 
                    files: [resultAttachment], 
                    components: [] // ボタンを消すちゅ
                });
            } catch (e) {
                // 時間切れ、またはエラーの場合
                console.error('クイズの待機エラー:', e.message); // エラーの理由も出しておくちゅ
                await interaction.editReply({ content: '時間切れだちゅ…。また遊んでね！', components: [] });
            }

        } catch (error) {
            console.error('Canvasクイズエラー:', error);
            await interaction.editReply({ content: 'クイズの準備中にエラーが起きたちゅ…。' });
        }
        }

    // 🍣 寿司の注文 (btn_sushi_order)
        // 💡 【追加】ボタンを押した時に、お寿司のリストを表示する処理だちゅ！
        // 🍣 寿司の注文 (btn_sushi_order)
        else if (interaction.customId === 'btn_sushi_order') {
            const sushiOptions = sushiMenu.map((item, index) => ({
                label: `${item.name} (${item.price}円)`,
                description: item.description,
                value: index.toString(),
                emoji: '🍣' // Discordのシステム絵文字は文字化けしないからOKちゅ！
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('sushi_select_order')
                    .setPlaceholder('どのネタを握るちゅ？🍣')
                    .addOptions(sushiOptions)
            );

            try {
                // 💡 ここでさっき作った歓迎キャンバスを呼び出すちゅ！
                const pngBuffer = await generateSushiWelcomeCanvas();
                const attachment = new AttachmentBuilder(pngBuffer, { name: 'sushi_welcome.png' });

                await interaction.editReply({ 
                    content: 'へいらっしゃい！', 
                    files: [attachment],
                    components: [row] 
                });
            } catch (e) {
                console.error('寿司歓迎描画エラー:', e);
                await interaction.editReply({ 
                    content: 'へいらっしゃい！新鮮なネタが揃ってるちゅ！注文を選んでね！', 
                    components: [row] 
                });
            }
        }

        // 💡 【超・軽量爆速版】プルダウンで注文した時の処理 (Canvasでお寿司の提供！)
        else if (interaction.isStringSelectMenu() && interaction.customId === 'sushi_select_order') {
            await interaction.deferUpdate(); 

            // 💡 メニューを消しつつ、ローディングメッセージで確実に上書きするちゅ！
            try { await interaction.editReply({ content: '🍣 大将が心を込めて握っているちゅ…お待ちを！', components: [] }); } catch(e) {}

            const selectedIndex = parseInt(interaction.values[0], 10);
            const selectedSushi = sushiMenu[selectedIndex];

            const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

            try {
                const imagePath = path.join(__dirname, 'images', selectedSushi.image);
                const canvasWidth = 600;
                const contentWidth = 500;
                let drawHeight = 300;
                let img = null;

                if (fs.existsSync(imagePath)) {
                    img = await loadImage(imagePath);
                    const aspectRatio = img.width / img.height;
                    drawHeight = contentWidth / Math.max(0.1, aspectRatio);
                }

                const safeName = stripEmoji(selectedSushi.name);
                const safeDesc = stripEmoji(selectedSushi.description);

                const dummyCanvas = createCanvas(1, 1);
                const dummyCtx = dummyCanvas.getContext('2d');
                dummyCtx.font = '22px NotoSansJP';
                const descHeight = measureTextHeight(dummyCtx, safeDesc, contentWidth - 40, 32);

                const headerHeight = 100;
                const textYStart = headerHeight + drawHeight + 30;
                const boxHeight = 50 + descHeight + 40; 
                const canvasHeight = textYStart + boxHeight + 40;

                const canvas = createCanvas(canvasWidth, canvasHeight);
                const ctx = canvas.getContext('2d');

                // 背景と枠線
                ctx.fillStyle = '#1e1e24';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.strokeStyle = '#00FA9A'; 
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

                ctx.textAlign = 'center';
                ctx.font = 'bold 36px NotoSansJP';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('へいお待ち！', canvasWidth / 2, 60);

                const imgX = (canvasWidth - contentWidth) / 2;
                const imgY = headerHeight;
                if (img) {
                    ctx.drawImage(img, imgX, imgY, contentWidth, drawHeight);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(imgX, imgY, contentWidth, drawHeight);
                } else {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(imgX, imgY, contentWidth, drawHeight);
                    ctx.fillStyle = '#fff';
                    ctx.fillText('画像なし', canvasWidth / 2, imgY + drawHeight / 2);
                }

                ctx.fillStyle = '#2b2d31';
                ctx.fillRect(imgX, textYStart, contentWidth, boxHeight);
                ctx.strokeStyle = '#00FA9A';
                ctx.lineWidth = 2;
                ctx.strokeRect(imgX, textYStart, contentWidth, boxHeight);

                ctx.textAlign = 'left';
                ctx.font = 'bold 28px NotoSansJP';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(safeName, imgX + 20, textYStart + 40);

                ctx.textAlign = 'right';
                ctx.font = 'bold 24px NotoSansJP';
                ctx.fillStyle = '#ff6b6b';
                ctx.fillText(`${selectedSushi.price}円`, imgX + contentWidth - 20, textYStart + 40);

                ctx.textAlign = 'left';
                ctx.font = '22px NotoSansJP';
                ctx.fillStyle = '#e0e0e0';
                drawCanvasText(ctx, safeDesc, imgX + 20, textYStart + 80, contentWidth - 40, 32);

                const pngBuffer = await canvas.encode('png');
                const attachment = new AttachmentBuilder(pngBuffer, { name: 'sushi_canvas.png' });

                await interaction.editReply({ 
                    content: `✨ 握りたての **${safeName}** だちゅ！`, 
                    embeds: [], 
                    components: [], // 完全にメニューを消す！
                    files: [attachment]
                });

            } catch (error) {
                console.error('Canvas寿司提供エラー:', error);
                await interaction.editReply({ content: 'お寿司を落としちゃったちゅ…', components: [] });
            }
        }

        // 💰 おあいそクイズ (btn_sushi_oaiso)
        else if (interaction.customId === 'btn_sushi_oaiso') {
            const targetPrice = Math.floor(Math.random() * 4) * 1000 + 2000; 
        
        oaisoGames.set(interaction.user.id, {
            target: targetPrice,
            currentTotal: 0,
            orderedItems: []
        });

        const sushiOptions = sushiMenu.map((item, index) => ({
            label: `${item.name}`,
            value: index.toString(),
            emoji: '🍣'
        }));

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('oaiso_add_item')
                .setPlaceholder('注文を追加するちゅ！(値段はヒミツ)')
                .addOptions(sushiOptions)
        );

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('oaiso_bill_please')
                .setLabel('おあいそ！（会計）💰')
                .setStyle(ButtonStyle.Success)
        );

        try {
            const extraMsg = "下のリストから寿司を追加して、ぴったりを狙ってちゅ！\n（値段は大将の顔色を読んで予想してね！）";
            // 💡 最初は大将（daisho.jpg）を表示するちゅ！
            const pngBuffer = await generateOaisoCanvas(oaisoGames.get(interaction.user.id), 'playing', extraMsg, 'daisho.jpg');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'oaiso_start.png' });

            await interaction.editReply({ 
                content: '大将と勝負だちゅ！🍣', 
                embeds: [], 
                files: [attachment], 
                components: [selectRow, buttonRow] 
            });
        } catch (e) {
            console.error('おあいそ開始エラー:', e);
            await interaction.editReply({ content: 'のれんを出すのに失敗したちゅ…' });
        }
        }

        // 🌱 ペットキャッチ (btn_pet_catch)
        else if (interaction.customId === 'btn_pet_catch') {
            try {
            // 💡 修正：クイズの写真リストではなく、ペット(モンスター)のリストから選ぶちゅ！
            const targetPet = petSpecies[Math.floor(Math.random() * petSpecies.length)];
            
            // プレイヤーがどの動物に遭遇したか記憶するちゅ
            petCatches.set(interaction.user.id, targetPet);

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('catch_attempt')
                    .setLabel('捕まえる！🐭')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('catch_ignore')
                    .setLabel('見逃す💨')
                    .setStyle(ButtonStyle.Secondary)
            );

            // 種族の説明(desc)も一緒に表示してあげるちゅ！
            const extraMsg = `野生の「${targetPet.name}」が現れたちゅ！\n${targetPet.desc}\nそーっと近づいて、捕まえるちゅ！`;
            const pngBuffer = await generatePetCatchCanvas(targetPet, 'appear', extraMsg);
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'pet_appear.png' });

            await interaction.editReply({ 
                content: 'ガサガサッ…！🌿', 
                embeds: [], 
                files: [attachment], 
                components: [buttonRow] 
            });
        } catch (e) {
            console.error('ペット出現エラー:', e);
            await interaction.editReply({ content: '草むらに逃げられちゃったちゅ…（※黒い画面のエラーログを見てちゅ！）' });
        }
        }

        // 📊 ペットステータス (btn_pet_status)
        else if (interaction.customId === 'btn_pet_status') {
            const userId = interaction.user.id;
        const myPet = userPets[userId];

        if (!myPet) {
            return interaction.editReply({ content: 'あなたはまだ相棒を持っていないちゅ。`/pet_catch` で探しに行こうちゅ！🌱' });
        }

        // 絵文字を取り除く魔法（Canvasの文字化け防止！）
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

        try {
            // 💡 1. 相棒の種族データを取得して画像を読み込むちゅ！
            const speciesData = petSpecies.find(s => s.name === myPet.name);
            const imageFileName = speciesData ? speciesData.image : 'default_pet.jpg';
            const imagePath = path.join(__dirname, 'images', imageFileName);

            let img = null;
            let drawHeight = 300;
            const cardWidth = 300;

            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                const aspectRatio = img.width / img.height;
                drawHeight = cardWidth / Math.max(0.1, aspectRatio);
            }

            // 💡 2. キャンバスのサイズを決定（ステータス情報が多いから縦長にするちゅ！）
            const canvasWidth = 600;
            const headerHeight = 100;
            const statusBoxHeight = 350; 
            const canvasHeight = headerHeight + drawHeight + statusBoxHeight + 60;

            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線（サイバー・クールなブルー系）
            ctx.fillStyle = '#1a1c2c';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px NotoSansJP';
            ctx.fillStyle = '#00BFFF';
            ctx.fillText(`第${myPet.rank}位：${interaction.user.username}の相棒`, canvasWidth / 2, 60);

            // 💡 画像の描画（アスペクト比維持！）
            const centerX = canvasWidth / 2;
            const imgY = headerHeight;
            if (img) {
                ctx.drawImage(img, centerX - cardWidth / 2, imgY, cardWidth, drawHeight);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(centerX - cardWidth / 2, imgY, cardWidth, drawHeight);
            }

            // 💡 ステータスエリアの描画
            const boxY = imgY + drawHeight + 30;
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(40, boxY, canvasWidth - 80, statusBoxHeight - 40);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, boxY, canvasWidth - 80, statusBoxHeight - 40);

            // 種族名とレベル
            ctx.textAlign = 'left';
            ctx.font = 'bold 28px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${myPet.name} (Lv.${myPet.level})`, 60, boxY + 50);

            // ステータス項目
            ctx.font = '22px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            const statsY = boxY + 100;
            ctx.fillText(`❤️ HP: ${myPet.hp} / ${myPet.maxHp}`, 60, statsY);
            ctx.fillText(`🗡️ ATK: ${myPet.atk}`, 60, statsY + 40);
            ctx.fillText(`🛡️ DEF: ${myPet.def}`, 60, statsY + 80);
            ctx.fillText(`💨 SPD: ${myPet.spd}`, 60, statsY + 120);

            // 経験値（EXP）バーの描画
            const nextExp = myPet.level * 10;
            const expPercent = Math.min(1, myPet.exp / nextExp);
            const barWidth = canvasWidth - 120;
            const barY = statsY + 170;

            ctx.fillStyle = '#333'; // バーの背景
            ctx.fillRect(60, barY, barWidth, 30);
            ctx.fillStyle = '#00FF00'; // 経験値の色
            ctx.fillRect(60, barY, barWidth * expPercent, 30);
            
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`EXP: ${myPet.exp} / ${nextExp}`, canvasWidth / 2, barY + 22);

            // 統合コメント（スタミナや混乱耐性など）
            ctx.textAlign = 'left';
            ctx.font = '18px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            ctx.fillText(`SP上限: ${myPet.maxSp || 15} | 混乱耐性: ${myPet.staggerMax || 20}`, 60, barY + 70);

            // 日付
            ctx.textAlign = 'right';
            ctx.font = '14px NotoSansJP';
            ctx.fillStyle = '#888';
            ctx.fillText(`ステータス確認日：${getJSTInfo().displayDate}`, canvasWidth - 50, canvasHeight - 20);

            // PNG画像にして送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'pet_status_canvas.png' });

            await interaction.editReply({ content: '相棒の調子を調べてきたちゅ！📊✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvasペットステータスエラー:', error);
            await interaction.editReply({ content: 'ステータス画面を作るのに失敗しちゃったちゅ…。' });
        }
        }

        // 💪 ペット特訓 (コース選択メニューの送信)
        else if (interaction.isStringSelectMenu() && interaction.customId === 'select_pet_train') {
            const course = interaction.values[0]; // 選択されたコース
            const userId = interaction.user.id;
        const myPet = userPets[userId];
        
        // 💡 クールダウン管理（もし一番上に無ければここでも動くようにしておくちゅ）
        if (!global.trainCooldowns) global.trainCooldowns = new Map();
        
        if (!myPet) {
            return interaction.editReply({ content: '特訓する相棒がいないちゅ！まずは `/pet_catch` で見つけるちゅ！🌱' });
        }

        const COOLDOWN_TIME = 5 * 60 * 1000; 
        const lastTrain = global.trainCooldowns.get(userId);
        
        if (lastTrain && (Date.now() - lastTrain) < COOLDOWN_TIME) {
            const timeLeft = COOLDOWN_TIME - (Date.now() - lastTrain);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return interaction.editReply({ content: `💦 相棒がヘトヘトだちゅ！次の特訓まであと **${minutes}分${seconds}秒** 休ませてあげてちゅ！🍵` });
        }

        global.trainCooldowns.set(userId, Date.now());

        // 特訓の計算処理
        let bonus = { hp: 0, atk: 0, def: 0, spd: 0, sp: 0, stagger: 0 };
        let flavorText = "";
        if (course === 'atk') { bonus.atk = 2; bonus.hp = 1; flavorText = "重い丸太を持ち上げてスクワットをしたちゅ！筋肉がパンパンだちゅ！"; }
        else if (course === 'def') { bonus.def = 2; bonus.hp = 1; flavorText = "飛んでくる木の実をひたすらガードしたちゅ！打たれ強くなったちゅ！"; }
        else if (course === 'spd') { bonus.spd = 2; flavorText = "川沿いを全速力で猛ダッシュしたちゅ！足腰が鍛えられたちゅ！"; }
        else if (course === 'sp') { bonus.sp = 2; bonus.stagger = 2; flavorText = "冷たい滝に打たれて精神を統一したちゅ！心が研ぎ澄まされたちゅ！"; }
        else if (course === 'all') { bonus.hp = 1; bonus.atk = 1; bonus.def = 1; bonus.spd = 1; flavorText = "いろんな基礎特訓をまんべんなくこなしたちゅ！いい汗かいたちゅ！"; }

        const gainedExp = Math.floor(Math.random() * 11) + 5;
        myPet.exp += gainedExp;

        let levelUpInfo = null;
        let requiredExp = myPet.level * 10;

        if (myPet.exp >= requiredExp) {
            myPet.level += 1;
            myPet.exp -= requiredExp;
            const speciesData = petSpecies.find(s => s.name === myPet.name) || petSpecies[0];
            const g = speciesData.growth;
            const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            const grow = {
                hp: rand(g.hp[0], g.hp[1]) + bonus.hp,
                atk: rand(g.atk[0], g.atk[1]) + bonus.atk,
                def: rand(g.def[0], g.def[1]) + bonus.def,
                spd: rand(g.spd[0], g.spd[1]) + bonus.spd,
                sp: rand(g.maxSp[0], g.maxSp[1]) + bonus.sp,
                stg: rand(g.staggerMax[0], g.staggerMax[1]) + bonus.stagger
            };

            myPet.maxHp += grow.hp; myPet.hp = myPet.maxHp;
            myPet.atk += grow.atk; myPet.def += grow.def; myPet.spd += grow.spd;
            myPet.maxSp += grow.sp; myPet.staggerMax += grow.stg;
            levelUpInfo = grow;
        }
        savePets();

        // 💡 ここからCanvas描画
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

        try {
            const speciesData = petSpecies.find(s => s.name === myPet.name);
            const imagePath = path.join(__dirname, 'images', speciesData.image);
            let img = null; let drawHeight = 250; const cardWidth = 250;
            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                drawHeight = cardWidth / (img.width / img.height);
            }

            const canvasWidth = 600;
            const headerHeight = 100;
            const resultBoxHeight = levelUpInfo ? 450 : 300; // レベルアップ時は枠を広げる
            const canvasHeight = headerHeight + drawHeight + resultBoxHeight + 60;

            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線
            ctx.fillStyle = '#1e1e24'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center'; ctx.font = 'bold 36px NotoSansJP'; ctx.fillStyle = '#FFA500';
            ctx.fillText(`${stripEmoji(myPet.name)}の猛特訓リザルト`, canvasWidth / 2, 60);

            // 画像描画
            if (img) {
                ctx.drawImage(img, (canvasWidth - cardWidth) / 2, headerHeight, cardWidth, drawHeight);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect((canvasWidth - cardWidth) / 2, headerHeight, cardWidth, drawHeight);
            }

            // 結果エリア
            let currentY = headerHeight + drawHeight + 30;
            ctx.fillStyle = '#2b2d31'; ctx.fillRect(40, currentY, canvasWidth - 80, resultBoxHeight - 40);
            ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(40, currentY, canvasWidth - 80, resultBoxHeight - 40);

            ctx.textAlign = 'left'; ctx.font = 'italic 20px NotoSansJP'; ctx.fillStyle = '#e0e0e0';
            currentY += 45;
            currentY = drawCanvasText(ctx, stripEmoji(flavorText), 60, currentY, canvasWidth - 120, 28);

            currentY += 30; ctx.font = 'bold 24px NotoSansJP'; ctx.fillStyle = '#00FF00';
            ctx.fillText(`+${gainedExp} EXP 獲得！`, 60, currentY);

            // レベルアップ表示
            if (levelUpInfo) {
                currentY += 40; ctx.font = 'bold 28px NotoSansJP'; ctx.fillStyle = '#FFD700';
                ctx.fillText(`🎉 レベルアップ！ Lv.${myPet.level}`, 60, currentY);
                ctx.font = '18px NotoSansJP'; ctx.fillStyle = '#ffffff';
                currentY += 35;
                ctx.fillText(`HP+${levelUpInfo.hp} ATK+${levelUpInfo.atk} DEF+${levelUpInfo.def} SPD+${levelUpInfo.spd} SP+${levelUpInfo.sp}`, 60, currentY);
            }

            // ステータスサマリー
            currentY = canvasHeight - 80;
            ctx.font = 'bold 20px NotoSansJP'; ctx.fillStyle = '#ffffff';
            ctx.fillText(`現在の能力：HP ${myPet.maxHp} | ATK ${myPet.atk} | DEF ${myPet.def} | SPD ${myPet.spd}`, 60, currentY);

            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'pet_train_canvas.png' });
            await interaction.editReply({ content: '特訓お疲れ様だちゅ！いい汗かいたちゅね！💪✨', embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Canvas特訓エラー:', error);
            await interaction.editReply({ content: '特訓の記録中に筆が折れちゃったちゅ…。' });
        }
        }

        // ⚔️ ペットバトル (対戦相手選択メニューの送信)
        else if (interaction.isUserSelectMenu() && interaction.customId === 'select_pet_battle') {
            const opponentUser = interaction.users.first(); // 選択されたユーザーを取得！
            const challengerId = interaction.user.id;
        const opponentId = opponentUser.id;

        let myPet = userPets[challengerId];
        let oppPet = userPets[opponentId];

        if (!myPet) return interaction.editReply({ content: 'あなたは相棒を持っていないちゅ！🌱' });
        if (!oppPet) return interaction.editReply({ content: `${opponentUser.username}さんはまだ相棒を持っていないちゅ…。` });
        if (challengerId === opponentId) return interaction.editReply({ content: '自分自身とは戦えないちゅ！🐭💦' });

        const initStats = (pet) => ({
            hp: pet.maxHp, 
            stagger: pet.staggerMax || 20, 
            sp: 0,
            atk: pet.atk, 
            def: pet.def || 3, 
            spd: pet.spd || 5
        });

        let myState = initStats(myPet);
        let oppState = initStats(oppPet);
        let turn = 1;
        let battleLog = "⚔️ BATTLE START ⚔️";
        let isGameOver = false;

        const getActionRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_atk').setLabel('🗡️ 攻撃').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_def').setLabel('🛡️ 防御').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_sp').setLabel('🌀 集中').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_special').setLabel('🔥 必殺技').setStyle(ButtonStyle.Danger).setDisabled(myState.sp < 10)
        );

        // 💡 ターン画面生成
        const sendBattleTurn = async (isFinal = false) => {
            const pngBuffer = await generatePetBattleCanvas(myPet, oppPet, myState, oppState, battleLog, turn);
            const attachment = new AttachmentBuilder(pngBuffer, { name: `battle_t${turn}_${Date.now()}.png` });
            
            return await interaction.editReply({ 
                content: isFinal ? '✨ 決着がついたちゅ！！' : `⚔️ バトル進行中！ (ターン ${turn})`, 
                files: [attachment], 
                components: isFinal ? [] : [getActionRow()] 
            });
        };

        await sendBattleTurn();
        
        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ filter: i => i.user.id === challengerId, time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            let myAction = i.customId;
            let oppAction = (oppState.sp >= 10 && Math.random() < 0.7) ? 'btn_special' : ['btn_atk', 'btn_atk', 'btn_def', 'btn_sp'][Math.floor(Math.random() * 4)];

            battleLog = ""; 

            const doAction = (isMe, action, isEnemyDefending) => {
                let attackerBase = isMe ? myPet : oppPet;
                let attackerState = isMe ? myState : oppState;
                let defenderState = isMe ? oppState : myState;

                if (action === 'btn_atk') {
                    let dmg = Math.max(1, (attackerState.atk + Math.floor(Math.random() * 4)) - (isEnemyDefending ? defenderState.def * 2 : defenderState.def));
                    defenderState.hp = Math.max(0, defenderState.hp - dmg);
                    defenderState.stagger -= dmg;
                    battleLog += `🗡️ ${attackerBase.name}: ${dmg}ダメ！\n`;
                } else if (action === 'btn_def') {
                    attackerState.stagger = Math.min(attackerBase.staggerMax || 20, attackerState.stagger + 10);
                    battleLog += `🛡️ ${attackerBase.name}: ガード＆回復！\n`;
                } else if (action === 'btn_sp') {
                    attackerState.sp += 5;
                    battleLog += `🌀 ${attackerBase.name}: 集中(SP+5)\n`;
                } else if (action === 'btn_special') {
                    attackerState.sp -= 10;
                    let dmg = Math.floor(attackerState.atk * 2.5);
                    defenderState.hp = Math.max(0, defenderState.hp - dmg);
                    battleLog += `💥 ${attackerBase.name}: 必殺技で ${dmg}ダメ！\n`;
                }
            };

            if (myState.spd >= oppState.spd) {
                doAction(true, myAction, oppAction === 'btn_def');
                if (oppState.hp > 0) doAction(false, oppAction, myAction === 'btn_def');
            } else {
                doAction(false, oppAction, myAction === 'btn_def');
                if (myState.hp > 0) doAction(true, myAction, oppAction === 'btn_def');
            }

            if (myState.hp <= 0 || oppState.hp <= 0) {
                isGameOver = true;
                collector.stop();
            } else {
                turn++;
                await sendBattleTurn();
            }
        });

        collector.on('end', async () => {
            if (!isGameOver) {
                // タイムアップの時は画像なしでメッセージだけ送るちゅ
                await interaction.editReply({ content: '⏳ タイムアップだちゅ…。引き分けだちゅね。', components: [] });
            } else {
                let winnerUser = myState.hp > 0 ? interaction.user : opponentUser;
                let winnerPet = myState.hp > 0 ? myPet : oppPet;
                
                let rankMsg = "";
                let myOldRank = myPet.rank;
                let oppOldRank = oppPet.rank;

                if (myState.hp > 0) {
                    if (myOldRank > oppOldRank) {
                        myPet.rank = oppOldRank;
                        oppPet.rank = myOldRank;
                        rankMsg = `下剋上達成！！ 第${myOldRank}位 から 第${oppOldRank}位 に上がったちゅ！`;
                    } else {
                        rankMsg = `防衛成功だちゅ！ 現在 第${myPet.rank}位 をキープしてるちゅ！`;
                    }
                    myPet.exp += 20; 
                } else {
                    if (oppOldRank > myOldRank) {
                        oppPet.rank = myOldRank;
                        myPet.rank = oppOldRank;
                        rankMsg = `陥落だちゅ…。 第${myOldRank}位 から 第${oppOldRank}位 に下がっちゃったちゅ。`;
                    } else {
                        rankMsg = `相手の防衛成功だちゅ。 第${myPet.rank}位 のまま変動なしだちゅ。`;
                    }
                }
                savePets();

                // AI実況の生成
                const prompt = `ねずみ実況者としてバトルの結末を150文字以内で熱く語ってちゅ。勝者: ${winnerUser.username}。語尾は「ちゅ」。`;
                let aiCommentary = "死闘すぎて言葉が出ないちゅ…！";
                try {
                    aiCommentary = await callLocalLLM(prompt);
                } catch (e) { console.log('実況エラー'); }

                // 💡 リザルト画像を生成！
                try {
                    const resultPng = await generatePetBattleResultCanvas(winnerPet, winnerUser.username, rankMsg, aiCommentary);
                    const resultAttach = new AttachmentBuilder(resultPng, { name: `battle_result_${Date.now()}.png` });

                    // 💡 最後のバトル画面を上書きして、結果画像を表示するちゅ！
                    await interaction.editReply({ 
                        content: '🎊 決着！リザルトボードだちゅ！', 
                        files: [resultAttach], 
                        components: [] 
                    });
                } catch (err) {
                    console.error('リザルト描画エラー:', err);
                    await interaction.followUp({ content: '結果画面の描画に失敗したちゅ…でもランクは保存したちゅ！' });
                }
            }
        });
        }

        // 🏆 ペットランキング (btn_pet_ranking)
        else if (interaction.customId === 'btn_pet_ranking') {
            const sortedPets = await Promise.all(
            Object.entries(userPets).map(async ([userId, pet]) => {
                let userName = '不明なテイマー';
                try {
                    const user = await client.users.fetch(userId);
                    userName = user.username;
                } catch(e) {}
                return { userId, userName, ...pet };
            })
        );
        
        // ランク順に並べるちゅ
        sortedPets.sort((a, b) => a.rank - b.rank);

        if (sortedPets.length === 0) {
            return interaction.editReply({ content: 'まだ誰も相棒を持っていないちゅ…。' });
        }

        try {
            // 💡 ランキング画像を生成！
            const pngBuffer = await generatePetRankingCanvas(sortedPets);
            const attachment = new AttachmentBuilder(pngBuffer, { name: `ranking_${Date.now()}.png` });

            await interaction.editReply({ 
                content: '🏆 現在のトップテイマーたちの記録だちゅ！', 
                files: [attachment] 
            });
        } catch (error) {
            console.error('ランキング描画エラー:', error);
            await interaction.editReply({ content: 'ランキングボードが重すぎて持ち上げられなかったちゅ…💦' });
        }
        }

        // 🍃 ペットリリース (btn_pet_release)
        else if (interaction.customId === 'btn_pet_release') {
            const userId = interaction.user.id;
        const myPet = userPets[userId];

        if (!myPet) {
            return interaction.editReply({ content: 'お別れする相棒がいないちゅ！まずは `/pet_catch` で見つけるちゅ！🌱' });
        }

        try {
            // 💡 1. 削除する前に、お別れ画像用のデータを生成するちゅ！
            const pngBuffer = await generatePetReleaseCanvas(myPet, interaction.user.username);
            const attachment = new AttachmentBuilder(pngBuffer, { name: `release_${Date.now()}.png` });

            // 💡 2. データを削除し、ランキングを詰めるちゅ
            const releasedRank = myPet.rank; 
            delete userPets[userId];

            for (const id in userPets) {
                if (userPets[id].rank > releasedRank) {
                    userPets[id].rank -= 1;
                }
            }
            savePets();

            // 💡 3. 画像を送信してお別れだちゅ…
            await interaction.editReply({ 
                content: '相棒を自然に還してきたちゅ。元気でね…！🍃', 
                embeds: [], 
                files: [attachment] 
            });

        } catch (error) {
            console.error('ペットリリース描画エラー:', error);
            await interaction.editReply({ content: 'お別れの準備中に、切なくて筆が止まっちゃったちゅ…💦' });
        }
        }

        // 💡 この下には、既存のゲーム進行用ボタンの処理（寿司選択、バトル選択など）や、
        // 💡 【超・軽量爆速版】プルダウンで注文した時の処理 (Canvasでお寿司の提供！)
    else if (interaction.isStringSelectMenu() && interaction.customId === 'sushi_select_order') {
        await interaction.deferUpdate(); 

        const selectedIndex = parseInt(interaction.values[0], 10);
        const selectedSushi = sushiMenu[selectedIndex];

        // 絵文字を取り除く魔法（文字化け防止）
        const stripEmoji = (str) => str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u2600-\u27BF]/g, '').trim();

        try {
            const imagePath = path.join(__dirname, 'images', selectedSushi.image);
            const canvasWidth = 600;
            const contentWidth = 500;
            let drawHeight = 300;
            let img = null;

            if (fs.existsSync(imagePath)) {
                img = await loadImage(imagePath);
                const aspectRatio = img.width / img.height;
                drawHeight = contentWidth / Math.max(0.1, aspectRatio);
            }

            const safeName = stripEmoji(selectedSushi.name);
            const safeDesc = stripEmoji(selectedSushi.description);

            // 💡 1. 説明文の高さを測るちゅ
            const dummyCanvas = createCanvas(1, 1);
            const dummyCtx = dummyCanvas.getContext('2d');
            dummyCtx.font = '22px NotoSansJP';
            const descHeight = measureTextHeight(dummyCtx, safeDesc, contentWidth - 40, 32);

            const headerHeight = 100;
            const textYStart = headerHeight + drawHeight + 30;
            const boxHeight = 50 + descHeight + 40; // ネタ名・値段エリア + 説明文エリア + 余白
            const canvasHeight = textYStart + boxHeight + 40;

            // 💡 2. お寿司提供用キャンバスを作る！
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // 背景と枠線 (和風の漆器やお皿をイメージしたカラー)
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.strokeStyle = '#00FA9A'; // 新鮮さを表すグリーン
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            // タイトル
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px NotoSansJP';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('へいお待ち！', canvasWidth / 2, 60);

            // 💡 お寿司画像の描画
            const imgX = (canvasWidth - contentWidth) / 2;
            const imgY = headerHeight;
            if (img) {
                ctx.drawImage(img, imgX, imgY, contentWidth, drawHeight);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(imgX, imgY, contentWidth, drawHeight);
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(imgX, imgY, contentWidth, drawHeight);
                ctx.fillStyle = '#fff';
                ctx.fillText('画像なし', canvasWidth / 2, imgY + drawHeight / 2);
            }

            // 💡 お寿司の情報枠
            ctx.fillStyle = '#2b2d31';
            ctx.fillRect(imgX, textYStart, contentWidth, boxHeight);
            ctx.strokeStyle = '#00FA9A';
            ctx.lineWidth = 2;
            ctx.strokeRect(imgX, textYStart, contentWidth, boxHeight);

            // ネタの名前と値段
            ctx.textAlign = 'left';
            ctx.font = 'bold 28px NotoSansJP';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(safeName, imgX + 20, textYStart + 40);

            ctx.textAlign = 'right';
            ctx.font = 'bold 24px NotoSansJP';
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText(`${selectedSushi.price}円`, imgX + contentWidth - 20, textYStart + 40);

            // ネタの説明
            ctx.textAlign = 'left';
            ctx.font = '22px NotoSansJP';
            ctx.fillStyle = '#e0e0e0';
            drawCanvasText(ctx, safeDesc, imgX + 20, textYStart + 80, contentWidth - 40, 32);

            // PNGに変換して送信！
            const pngBuffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'sushi_canvas.png' });

            await interaction.followUp({ 
                content: `✨ 握りたての **${safeName}** だちゅ！`, 
                embeds: [], 
                files: [attachment], 
                ephemeral: isHidden 
            });

        } catch (error) {
            console.error('Canvas寿司提供エラー:', error);
            await interaction.followUp({ content: 'お寿司を落としちゃったちゅ…', ephemeral: isHidden });
        }
    }
    

    // 💡 【超・軽量爆速版】おあいそボタンを押した時の結果発表 (メニューを消して結果を表示！)
    // 💡 【追加・復活！】おあいそクイズで注文を追加した時の処理
    else if (interaction.isStringSelectMenu() && interaction.customId === 'oaiso_add_item') {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = oaisoGames.get(userId);

        if (!game) return interaction.followUp({ content: '大将が注文を忘れちゃったちゅ。もう一度 /nezumi から始めてちゅ！', flags: MessageFlags.Ephemeral });

        const selectedIndex = parseInt(interaction.values[0], 10);
        const selectedSushi = sushiMenu[selectedIndex];

        // 合計金額と履歴を更新するちゅ！
        game.currentTotal += selectedSushi.price;
        game.orderedItems.push(selectedSushi.name);

        try {
            // 💡 選んだお寿司の画像を表示しながら更新するちゅ！
            const extraMsg = `${selectedSushi.name} 一丁！\n（今の合計金額を予想して、まだ頼むかおあいそするか決めてちゅ！）`;
            const pngBuffer = await generateOaisoCanvas(game, 'playing', extraMsg, selectedSushi.image);
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'oaiso_playing.png' });

            await interaction.editReply({ 
                content: 'へいお待ち！🍣', 
                files: [attachment] 
            });
        } catch (e) {
            console.error('おあいそ追加エラー:', e);
        }
    }
    // 💡 【復活！】おあいそボタンを押した時の結果発表 (メニューを消して結果を表示！)
    else if (interaction.isButton() && interaction.customId === 'oaiso_bill_please') {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = oaisoGames.get(userId);

        if (!game) return interaction.followUp({ content: '大将が注文を忘れちゃったちゅ。もう一度 /nezumi から始めてちゅ！', flags: MessageFlags.Ephemeral });

        const diff = Math.abs(game.currentTotal - game.target);
        let resultMsg = "";
        let daishoImage = "daisho.jpg";

        if (diff === 0) {
            resultMsg = "ピタリ賞だちゅ！！！大将もひっくり返るほどの完璧な注文だちゅ！🎉✨";
        } else if (diff <= 500) {
            resultMsg = `おしいっ！誤差たったの ${diff} 円だちゅ！大将もニッコリだちゅ！🍣`;
        } else {
            resultMsg = `あちゃー…誤差 ${diff} 円だちゅ。大将の修行からやり直しだちゅ！💥`;
        }

        try {
            const pngBuffer = await generateOaisoCanvas(game, 'result', resultMsg, daishoImage);
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'oaiso_result.png' });

            oaisoGames.delete(userId);

            await interaction.editReply({ 
                content: 'おあいそだちゅ！結果発表〜！🥁✨', 
                files: [attachment],
                components: [] 
            });
        } catch (e) {
            console.error('おあいそ結果エラー:', e);
        }
    }

    // 💡 【超・軽量爆速版】捕まえるボタンを押した時の処理 (警告対策版)
    // 💡 【超・軽量爆速版】捕まえるボタンを押した時の処理 (データ保存処理を追加！)
    else if (interaction.isButton() && (interaction.customId === 'catch_attempt' || interaction.customId === 'catch_ignore')) {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const targetPet = petCatches.get(userId);

        if (!targetPet) {
            return interaction.followUp({ 
                content: 'もうその子はどこかに行っちゃったみたいだちゅ。', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (interaction.customId === 'catch_ignore') {
            petCatches.delete(userId);
            return interaction.editReply({ 
                content: 'そっと見逃してあげたちゅ。バイバイ！👋', 
                embeds: [], components: [], files: [] 
            });
        }

        // 捕まえる処理（50%の確率で成功！）
        const isSuccess = Math.random() < 0.5;
        const state = isSuccess ? 'success' : 'fail';
        let resultMsg = "";

        if (isSuccess) {
            resultMsg = `お見事だちゅ！\n「${targetPet.name}」が新しくお友達になったちゅ！🎉`;

            // 💡 超重要：捕獲成功したら、ちゃんと自分のデータとして登録・保存するちゅ！
            userPets[userId] = {
                name: targetPet.name,
                emoji: targetPet.emoji,
                level: 1,
                exp: 0,
                hp: targetPet.baseHp,
                maxHp: targetPet.baseHp,
                atk: targetPet.baseAtk,
                def: targetPet.baseDef,
                spd: targetPet.baseSpd,
                maxSp: targetPet.maxSp,
                staggerMax: targetPet.staggerMax,
                rank: 99999 // 一旦一番下に配置するちゅ
            };

            // ランキングの空席を詰めて綺麗に並び直すちゅ
            const sortedIds = Object.keys(userPets).sort((a, b) => userPets[a].rank - userPets[b].rank);
            let expectedRank = 1;
            for (const id of sortedIds) {
                userPets[id].rank = expectedRank;
                expectedRank++;
            }
            // データをセーブ！
            savePets();

        } else {
            resultMsg = `ああっ！素早くて逃げられちゃったちゅ…\n「${targetPet.name}」は草むらの奥へ消えていったちゅ。🍃`;
        }

        try {
            const pngBuffer = await generatePetCatchCanvas(targetPet, state, resultMsg);
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'pet_result.png' });

            petCatches.delete(userId);
            
            await interaction.editReply({ 
                content: isSuccess ? 'やったね！✨' : '残念だちゅ…💦', 
                embeds: [], 
                components: [], 
                files: [attachment]
            });
        } catch (e) {
            console.error('ペット捕獲結果エラー:', e);
            await interaction.followUp({ 
                content: 'モンスターボールが壊れちゃったちゅ…', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
    // 💡 /kibun コマンド (気分を記録する)
    else if (interaction.commandName === 'kibun') {
        await interaction.deferReply({ ephemeral: true }); 
        const userId = interaction.user.id;
        const level = interaction.options.getInteger('level');
        const memo = interaction.options.getString('memo') || '';

        if (!userKibun[userId]) {
            userKibun[userId] = [];
        }

        const now = Date.now();
        userKibun[userId].push({ date: now, level: level, memo: memo });
        saveKibun(); 

        const emojis = { 5: '✨', 4: '☀️', 3: '☁️', 2: '🌧️', 1: '⚡' };
        const embed = new EmbedBuilder()
            .setColor(0x87CEEB) 
            .setTitle(`心の天気図に記録したちゅ！ ${emojis[level]}`)
            .setDescription(`今の気分: **レベル${level}**\n${memo ? `メモ: ${memo}` : ''}`)
            .setFooter({ text: '日曜日の夜22時に、セットされたチャンネルへまとめを送るちゅよ！' });

        await interaction.editReply({ embeds: [embed] });
    }

    // 💡 /kibun_setchannel コマンド (安全なチャンネルだけをリストアップするちゅ！)
    else if (interaction.commandName === 'kibun_setchannel') {
        await interaction.deferReply({ ephemeral: true });

        const channels = interaction.guild.channels.cache.filter(c => c.type === 0 || c.type === 5); // 0:テキスト, 5:アナウンス
        const validChannels = [];

        for (const [id, channel] of channels) {
            const userPerms = channel.permissionsFor(interaction.member);
            const botPerms = channel.permissionsFor(interaction.guild.members.me);
            
            if (userPerms?.has('SendMessages') && userPerms?.has('ViewChannel') &&
                botPerms?.has('SendMessages') && botPerms?.has('ViewChannel')) {
                
                validChannels.push({
                    label: `#${channel.name}`,
                    value: channel.id,
                    description: 'ここに自分のレポートを送るちゅ！'
                });
            }
        }

        if (validChannels.length === 0) {
            return interaction.editReply('ねずみとあなたが両方書き込めるテキストチャンネルが1つも見つからなかったちゅ…！');
        }

        const options = validChannels.slice(0, 25);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('kibun_select_channel')
                .setPlaceholder('あなたのレポートを送るチャンネルを選ぶちゅ！✨')
                .addOptions(options)
        );

        await interaction.editReply({
            content: 'あなたの「心の天気図（週次レポート）」を届けるチャンネルを選んでちゅ！\n（※ねずみが書き込めるチャンネルだけを表示しているちゅ🐭）',
            components: [row]
        });
    }

    // 💡 プルダウンメニューでチャンネルが選ばれた時の処理（個人用に保存！）
    else if (interaction.isStringSelectMenu() && interaction.customId === 'kibun_select_channel') {
        await interaction.deferUpdate({ ephemeral: true });
        
        const userId = interaction.user.id; 
        const channelId = interaction.values[0]; 

        kibunSettings[userId] = channelId;
        saveKibunSettings();

        await interaction.editReply({
            content: `あなたの心の天気図の送信先を <#${channelId}> にセットしたちゅ！\n毎週日曜の夜22時に、あなたのレポートがここに届くちゅよ！☁️✨`,
            components: [] 
        });
    }

    // 💡 /kibun_resetchannel コマンド (個人の設定をリセット)
    else if (interaction.commandName === 'kibun_resetchannel') {
        await interaction.deferReply({ ephemeral: true });
        
        const userId = interaction.user.id;

        if (kibunSettings[userId]) {
            delete kibunSettings[userId];
            saveKibunSettings(); 
            await interaction.editReply('あなたの心の天気図の送信先設定をリセットしたちゅ！\n自動レポートの送信は一旦ストップするちゅよ。☁️🛑');
        } else {
            await interaction.editReply('もともと送信先チャンネルはセットされていないみたいだちゅ！☁️');
        }
    }
    // 💡 /design_upload コマンド (日替わり看板デザインの登録)
    // 💡 /design_upload コマンド (日替わり看板デザインの登録)
    else if (interaction.commandName === 'design_upload') {
        await interaction.deferReply({ ephemeral: true });
        
        const dateStr = interaction.options.getString('date');
        const eventName = interaction.options.getString('event_name'); // 💡 イベント名を受け取るちゅ！
        const htmlFile = interaction.options.getAttachment('html_file');
        const cssFile = interaction.options.getAttachment('css_file');

        const designsDir = path.join(__dirname, 'designs');
        if (!fs.existsSync(designsDir)) {
            fs.mkdirSync(designsDir);
        }

        try {
            // HTMLとCSSの保存
            const htmlRes = await axios.get(htmlFile.url);
            fs.writeFileSync(path.join(designsDir, `${dateStr}.html`), htmlRes.data);

            if (cssFile) {
                const cssRes = await axios.get(cssFile.url);
                fs.writeFileSync(path.join(designsDir, `${dateStr}.css`), cssRes.data);
            }

            // 💡 イベント名を events.json というメモ帳に保存するちゅ！
            const eventsPath = path.join(designsDir, 'events.json');
            let eventsData = {};
            if (fs.existsSync(eventsPath)) {
                eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
            }
            eventsData[dateStr] = eventName; // 日付と名前をセットで記録！
            fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2));

            await interaction.editReply(`📅 **${dateStr}** [🏷️ ${eventName}] のデザインを保存したちゅ！🎨✨`);
        } catch (error) {
            console.error('デザイン保存エラー:', error);
            await interaction.editReply('ファイルの保存に失敗しちゃったちゅ…。');
        }
    }

    // 💡 /design_list コマンド (登録済みデザインのリスト表示)
    else if (interaction.commandName === 'design_list') {
        await interaction.deferReply({ ephemeral: true });
        
        const designsDir = path.join(__dirname, 'designs');

        if (!fs.existsSync(designsDir)) {
            return interaction.editReply('まだ何もデザインが登録されていないみたいだちゅ！📂');
        }

        const files = fs.readdirSync(designsDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        if (htmlFiles.length === 0) {
            return interaction.editReply('登録されている日替わり看板はないみたいだちゅ！📂');
        }

        // 💡 イベント名のメモ帳を読み込むちゅ！
        const eventsPath = path.join(designsDir, 'events.json');
        let eventsData = {};
        if (fs.existsSync(eventsPath)) {
            eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
        }

        let listStr = '📋 **現在登録されている日替わりデザイン一覧だちゅ！**\n\n';
        htmlFiles.forEach(file => {
            const dateStr = file.replace('.html', '');
            const hasCss = files.includes(`${dateStr}.css`);
            const eName = eventsData[dateStr] || '名前なし'; // メモ帳から名前を引っ張ってくるちゅ！
            
            listStr += `・📅 **${dateStr}** 🏷️ **${eName}** (HTML${hasCss ? ' ＆ CSS' : ''})\n`;
        });

        await interaction.editReply(listStr);
    }

    // 💡 /design_delete コマンド (デザインの削除)
    else if (interaction.commandName === 'design_delete') {
        await interaction.deferReply({ ephemeral: true });
        
        const dateStr = interaction.options.getString('date');
        const designsDir = path.join(__dirname, 'designs');
        
        const htmlPath = path.join(designsDir, `${dateStr}.html`);
        const cssPath = path.join(designsDir, `${dateStr}.css`);
        const eventsPath = path.join(designsDir, 'events.json'); // 💡 メモ帳のパス

        let deleted = false;

        // 画像の元データを消すちゅ
        if (fs.existsSync(htmlPath)) { fs.unlinkSync(htmlPath); deleted = true; }
        if (fs.existsSync(cssPath)) { fs.unlinkSync(cssPath); deleted = true; }

        // 💡 メモ帳（events.json）からも名前の記録を消しておくちゅ！
        if (deleted && fs.existsSync(eventsPath)) {
            let eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
            if (eventsData[dateStr]) {
                delete eventsData[dateStr];
                fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2));
            }
        }

        if (deleted) {
            await interaction.editReply(`🗑️ **${dateStr}** のデザインと記録を綺麗にお掃除したちゅ！✨`);
        } else {
            await interaction.editReply(`🤔 **${dateStr}** のデザインは見つからなかったちゅ。 \`/design_list\` で日付が合っているか確認してみてちゅ！`);
        }
    }
    }
});
// ==========================================================
// 📌 チャンネル最下段固定画像（Sticky Message）の魔法
// ==========================================================

// 💡 1. 固定表示したいチャンネルのIDをここに入れるちゅ！
const STICKY_CHANNEL_ID = '1479824114293145621';

// 💡 再起動しても忘れないようにメモ帳(JSON)を用意するちゅ！
const stickyDataPath = path.join(__dirname, 'sticky.json');
const stickyMessageIds = new Map();

// 💡 起動時にメモ帳を読み込んで、「前の看板の場所」を思い出すだけにするちゅ！（ここではまだ消さないちゅ！）
if (fs.existsSync(stickyDataPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(stickyDataPath, 'utf8'));
        for (const [chId, msgId] of Object.entries(data)) {
            stickyMessageIds.set(chId, msgId);
        }
    } catch(e) { console.error('看板データの読み込みエラーだちゅ:', e); }
}

// メモ帳に保存する関数
const saveStickyData = () => {
    const obj = Object.fromEntries(stickyMessageIds);
    fs.writeFileSync(stickyDataPath, JSON.stringify(obj, null, 2));
};

// 💡 Satoriを使った看板画像の生成関数（日替わり対応版）
const generateStickyImage = async (text) => {
    const d = new Date();
    const jstD = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    const month = String(jstD.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstD.getUTCDate()).padStart(2, '0');
    const todayStr = `${month}-${day}`; 

    const htmlPath = path.join(__dirname, 'designs', `${todayStr}.html`);
    const cssPath = path.join(__dirname, 'designs', `${todayStr}.css`);

    let finalMarkupStr = '';

    if (fs.existsSync(htmlPath)) {
        let customHtml = fs.readFileSync(htmlPath, 'utf8');
        let customCss = '';
        if (fs.existsSync(cssPath)) {
            customCss = fs.readFileSync(cssPath, 'utf8');
        }
        customHtml = customHtml.replace('{{text}}', text);
        finalMarkupStr = customCss ? `<style>${customCss}</style>${customHtml}` : customHtml;
    } else {
        finalMarkupStr = `<div style="display: flex; flex-direction: column; background-color: #2b2d31; color: white; width: 600px; height: 150px; align-items: center; justify-content: center; border: 4px solid #FFD700; border-radius: 15px; box-shadow: 0 8px 16px rgba(0,0,0,0.5);">
            <div style="display: flex; font-size: 32px; font-weight: bold; margin-bottom: 10px; color: #FFD700;">
                🐭 ねずみの案内板 🧀
            </div>
            <div style="display: flex; font-size: 24px; color: #e0e0e0;">
                ${text}
            </div>
        </div>`;
    }

    // 💡 日本語フォントを読み込むちゅ
    const fontBuffer = fs.readFileSync(path.join(__dirname, 'fonts', 'LINESeedJP-Regular.ttf'));
    // 💡 【追加】絵文字用のフォントも読み込むちゅ！
    const emojiFontBuffer = fs.readFileSync(path.join(__dirname, 'fonts', 'NotoColorEmoji.ttf'));

    const svg = await satori(html(finalMarkupStr), {
        width: 600,
        height: 150,
        // 💡 【変更】フォントのリストに絵文字フォントを追加するちゅ！
        fonts: [
            { 
                name: 'NotoSansJP', 
                data: fontBuffer, 
                weight: 400, 
                style: 'normal' 
            },
            { 
                name: 'Noto Color Emoji', 
                data: emojiFontBuffer, 
                weight: 400, 
                style: 'normal' 
            }
        ]
    });

    const resvg = new Resvg(svg, { background: 'transparent', fitTo: { mode: 'original' } });
    return resvg.render().asPng();
};

// 💡 誰かがメッセージを書き込んだ時の処理
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channelId === STICKY_CHANNEL_ID) {
        
        // ① 前にねずみが置いた画像があれば（再起動前の記憶も含めて）ここで消すちゅ！
        const lastId = stickyMessageIds.get(message.channelId);
        if (lastId) {
            try {
                const lastMsg = await message.channel.messages.fetch(lastId);
                if (lastMsg) await lastMsg.delete();
            } catch (e) {}
        }

        // ② Satoriで新しい画像を作って、一番下に送信するちゅ！
        try {
            const pngBuffer = await generateStickyImage('いつでも最新の情報をここでお知らせするちゅ！');
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'sticky_banner.png' });
            const sentMsg = await message.channel.send({ files: [attachment] });

            // ③ 新しく置いた画像のIDを記憶して、メモ帳に保存するちゅ！
            stickyMessageIds.set(message.channelId, sentMsg.id);
            saveStickyData();
        } catch (e) {
            console.error('最下段画像の設置エラーだちゅ:', e);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);