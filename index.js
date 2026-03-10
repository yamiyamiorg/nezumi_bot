const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder // 💡 これを忘れずに追加！
} = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
3. 絵文字（🐭、✨、🧀など）を適度に使って愛嬌を出すこと。
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
async function compressAndGetAttachment(imageFileName, targetWidth = 500) {
    try {
        const imagePath = path.join(__dirname, 'images', imageFileName);
        if (!fs.existsSync(imagePath)) return null;

        // 💡 Sharpでリサイズ＆WebP圧縮して、Discordに送れるAttachmentにするちゅ
        const imageBuffer = await sharp(imagePath)
            .resize(targetWidth) 
            .webp({ quality: 60 }) // 💡 画質を60%に落として圧縮！
            .toBuffer();
        
        const randomName = `s_${Date.now()}.webp`;
        return new AttachmentBuilder(imageBuffer, { name: randomName });
    } catch (error) {
        console.error('画像圧縮エラー:', error.message);
        return null; 
    }
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
//**************************************************************************************目指せネズミマスター******************************************************************************************** */
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 【追加】ペット育成ゲーム用のデータとセーブ機能
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const petDataFile = path.join(__dirname, 'pets.json');
let userPets = {};

// Bot起動時にセーブデータを読み込むちゅ！
if (fs.existsSync(petDataFile)) {
    try {
        userPets = JSON.parse(fs.readFileSync(petDataFile, 'utf8'));
    } catch (e) {
        console.error('ペットデータの読み込みに失敗したちゅ:', e);
    }
}

// セーブデータをファイルに書き込む魔法の関数ちゅ！
function savePets() {
    fs.writeFileSync(petDataFile, JSON.stringify(userPets, null, 2));
}

// 最初の相棒候補（種族データ）
const petSpecies = [
    { name: 'ヒノネズミ', emoji: '🔥', baseHp: 25, baseAtk: 6, desc: '燃える闘志を持った熱いねずみ。' },
    { name: 'ミズネズミ', emoji: '💧', baseHp: 30, baseAtk: 4, desc: 'マイペースでタフなねずみ。' },
    { name: 'クサネズミ', emoji: '🌿', baseHp: 28, baseAtk: 5, desc: '自然を愛する優しいねずみ。' },
    { name: 'エレキネズミ', emoji: '⚡', baseHp: 22, baseAtk: 7, desc: 'すばしっこくて攻撃力が高いねずみ。' }
];
//****************************************************************************************コマンド処理・開始処理****************************************************************************************** */
client.once('clientReady', async (c) => { // 💡 clientReadyを正しいreadyに修正しました
    console.log(`${c.user.tag} (ねずみタロット) がログインしました！🔮`);

    const data = [
        { name: 'tarot', description: 'タロットカードを1枚引きます' },
        { name: 'tarot3', description: '3枚のカードで過去・現在・未来を占います' },
        {
            name: 'hitandblow',
            description: '4桁の数字当てゲームに挑戦！',
            options: [{ name: 'guess', type: 3, description: '4桁の数字を入力（例: 1234）', required: true }]
        },
        {
            name: 'weather',
            description: '指定した都道府県の1週間（7日間）の天気を教えます',
            options: [{ name: 'prefecture', type: 3, description: '都道府県名を漢字で入力（例: 和歌山, 東京）', required: true }]
        },
        { name: 'mouse', description: '可愛いマウスの画像を表示するよ、ちゅ！' },
        { name: 'rat', description: 'かっこいいラットの画像を表示するよ、ちゅ！' },
        { name: 'nezumi', description: 'ねずみの画像……かな？' },
        { name: 'quiz', description: 'この画像はねずみかな？クイズに挑戦！' },
        { name: 'horoscope', description: '今日の星座運勢ランキングを表示するちゅ！' },
        { name: 'rune', description: 'ルーン文字で今日の運勢を占います' },
        { name: 'sushi_order', description: '大将特製！寿司リストから注文して画像を見るちゅ🍣' },
        { name: 'sushi_oaiso', description: 'ぴったり金額を狙っておあいそ（会計）ゲームだちゅ！💰' },
        { name: 'pet_catch', description: '草むらを探して、あなただけの相棒（ペット）を捕まえるちゅ！🌱' },
        { name: 'pet_status', description: 'あなたの相棒の現在のステータスを確認するちゅ！📊' },
        { name: 'pet_train', description: '相棒と猛特訓して経験値(EXP)を稼ぐちゅ！💪' }
    ];

    const guildIds = ['1450709451488100396','1455097564759330958']; 
    await client.application.commands.set([]);

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
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

    if (interaction.commandName === 'tarot') {
        await interaction.deferReply({ ephemeral: true });

        const personalSeed = getPersonalDailyRandom(interaction.user.id);
        const cardIndex = Math.floor(personalSeed * tarotCards.length);
        const selectedCard = tarotCards[cardIndex];

        const reverseSeed = getPersonalDailyRandom(interaction.user.id, 999);
        const isReversed = reverseSeed < 0.5;

        const mouseWhisper = getSingleCardComment(selectedCard, isReversed);
        const geminiExplanation = await getGeminiReading(selectedCard.name, isReversed, interaction.user.id);
        const imageAttachment = await getCardImage(selectedCard.image, isReversed);

        const embed = new EmbedBuilder()
            .setColor(isReversed ? 0xFF6347 : 0x00FA9A)
            .setTitle(`🐭 ${interaction.user.username}さんの今日のお告げ: ${selectedCard.name}`)
            .setDescription(`**${isReversed ? '逆位置 🙃' : '正位置 ✨'}**`)
            .addFields(
                { name: 'カードの意味', value: isReversed ? selectedCard.reversed : selectedCard.upright },
                { name: 'ねずみのささやき', value: `*「${mouseWhisper}」*` },
                { name: 'ねずみの特別解説', value: geminiExplanation }
            )
            .setFooter({ text: `今日（${new Date().toLocaleDateString('ja-JP')}）のお告げはこれって決まってたんだちゅ！` });

        if (imageAttachment) {
            embed.setImage(`attachment://${imageAttachment.name}`);
            await interaction.editReply({ embeds: [embed], files: [imageAttachment] });
        } else {
            await interaction.editReply({ embeds: [embed], content: '画像の読み込みに失敗しちゃった、ちゅ……。' });
        }
    }

    else if (interaction.commandName === 'tarot3') {
        await interaction.deferReply({ ephemeral: true });

        const positions = ['過去 🕰️', '現在 📍', '未来 🚀'];
        const drawnResults = []; 
        let tempDeck = [...tarotCards];

        for (let i = 0; i < 3; i++) {
            const personalSeed = getPersonalDailyRandom(interaction.user.id, (i + 1) * 777);
            const cardIndex = Math.floor(personalSeed * tempDeck.length);
            const card = tempDeck.splice(cardIndex, 1)[0];

            const reverseSeed = getPersonalDailyRandom(interaction.user.id, (i + 1) * 999);
            const isReversed = reverseSeed < 0.5;

            drawnResults.push({ name: card.name, isReversed: isReversed, card: card });
            const imageAttachment = await getCardImage(card.image, isReversed);

            const embed = new EmbedBuilder()
                .setColor(isReversed ? 0xFF6347 : 0x00FA9A)
                .setTitle(`${positions[i]}: ${card.name}`)
                .setDescription(`**${isReversed ? '逆位置 🙃' : '正位置 ✨'}**\n\n${isReversed ? card.reversed : card.upright}`);

            if (imageAttachment) {
                embed.setImage(`attachment://${imageAttachment.name}`);
                await interaction.followUp({ embeds: [embed], files: [imageAttachment], ephemeral: true });
            } else {
                await interaction.followUp({ embeds: [embed], content: '画像の読み込みに失敗しました。', ephemeral: true });
            }
        }

        const geminiExplanation = await getGeminiReading3(drawnResults, interaction.user.username);
        const storyResult = generateTarotStory(drawnResults[0], drawnResults[1], drawnResults[2]);

        const storyEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📖 あなたの物語: ${storyResult.storyType}`)
            .setDescription(storyResult.message)
            .addFields({ 
                name: '🐭 ねずみの統合リーディング', 
                value: geminiExplanation || "運命の糸が絡まってうまく読めなかったちゅ…。"
            })
            .setFooter({ text: `今日（${new Date().toLocaleDateString('ja-JP')}）の運命だちゅ！` });

        await interaction.followUp({ embeds: [storyEmbed], ephemeral: true });
    }

    else if (interaction.commandName === 'hitandblow') {
        await interaction.deferReply({ ephemeral: true });
        const guess = interaction.options.getString('guess');
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

    else if (interaction.commandName === 'weather') {
        await interaction.deferReply({ ephemeral: true });
        const pref = interaction.options.getString('prefecture');
        const target = prefCoords[pref.replace(/都|道|府|県/g, '')]; 

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

            for (let i = 0; i < 7; i++) {
                const code = daily.weathercode[i];
                const rainProb = daily.precipitation_probability_max[i];
                const maxTemp = daily.temperature_2m_max[i];
                const minTemp = daily.temperature_2m_min[i];
            
                const weatherStatus = getWeatherStatus(code);
                const mouseComment = getMouseComment(code, rainProb, maxTemp);

                embed.addFields({ 
                    name: `📅 ${daily.time[i]}`, 
                    value: `${weatherStatus}\n💧 降水確率: ${rainProb}%\n🌡️ ${maxTemp}℃ / ${minTemp}℃\n💬 *${mouseComment}*`, 
                    inline: false 
                });     
            }
            await interaction.editReply({ embeds: [embed]  ,ephemeral: true});
        } catch (error) {
            await interaction.editReply('天気情報の取得に失敗しました。',{ ephemeral: true});
        }
    }

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

        const chosen = selectedList[Math.floor(Math.random() * selectedList.length)];
        const attachment = await getJokeImage(chosen.file);
        
        if (attachment) {
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(titleMsg)
                .setDescription(`この子の名前は **${chosen.name}** だちゅ！`)
                .setImage(`attachment://${attachment.name}`); 
            await interaction.editReply({ embeds: [embed], files: [attachment], ephemeral: true });
        } else {
            await interaction.editReply({ content: 'ごめんね、その子は今お散歩中みたいだちゅ……。', ephemeral: true });
        }
    }

    else if (interaction.commandName === 'quiz') {
        await interaction.deferReply({ ephemeral: true });
        const isNezumi = Math.random() < 0.5;
        let category = isNezumi ? (Math.random() < 0.5 ? 'mouse' : 'rat') : 'not_mouse';
        const chosen = extraImages[category][Math.floor(Math.random() * extraImages[category].length)];
        const attachment = await getJokeImage(chosen.file);

        if (!attachment) return interaction.editReply({ content: '画像がお散歩中で見つからないちゅ…。', ephemeral: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('correct_nezumi').setLabel('ねずみだちゅ！').setEmoji('🐭').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('incorrect_nezumi').setLabel('ねずみじゃない！').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('❓ ねずみクイズ！')
            .setDescription('この画像の子は「ねずみ」かな？\n下のボタンを押して答えてね！')
            .setImage(`attachment://${attachment.name}`);

        const response = await interaction.editReply({ embeds: [embed], files: [attachment], components: [row], ephemeral: true });
        const filter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            const userChoice = (confirmation.customId === 'correct_nezumi');
            const isCorrect = (userChoice === isNezumi);

            const resultEmbed = new EmbedBuilder()
                .setColor(isCorrect ? 0x00FF00 : 0xFF0000)
                .setTitle(isCorrect ? '✨ 正解だちゅ！' : 'あちゃ〜、残念だちゅ…')
                .setDescription(`この子の正体は **${chosen.name}** でした！`)
                .setFooter({ text: isCorrect ? 'ねずみマスターだね！' : '次は当ててみてね！' });

            await confirmation.update({ content: isCorrect ? '🎊 おめでとう！' : '😢 どんまいだちゅ…', embeds: [resultEmbed], components: [], ephemeral: true });
        } catch (e) {
            await interaction.editReply({ content: '時間切れだちゅ…。また遊んでね！', components: [], ephemeral: true });
        }
    }

    else if (interaction.commandName === 'horoscope') {
        await interaction.deferReply({ ephemeral: true });
        const ranking = signs.map((name, index) => {
            const score = Math.floor(getDailyRandom(index) * 100) + 1;
            const itemIdx = Math.floor(getDailyRandom(index + 100) * luckyItems.length);
            return { name, score, luckyItem: luckyItems[itemIdx] };
        });
        ranking.sort((a, b) => b.score - a.score);

        const fullMessage = await getGeminiFullHoroscope(ranking);
        const lines = fullMessage.split('\n');
        
        // 💡 修正1：ローカルLLMが「抱負:」と半角にしたり「**抱負**」としたりしても読み取れるようにするちゅ！
        const houfuLine = lines.find(l => l.includes('抱負'));
        const houfu = houfuLine ? (houfuLine.split(/[：:]/)[1] || houfuLine).replace(/\*/g, '').trim() : "楽しく過ごそうちゅ！";

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🐭 ねずみ星座占い（${new Date().toLocaleDateString('ja-JP')}）`)
            .setDescription(`**✨ 今日の抱負 ✨**\n「${houfu}」`)
            

        ranking.forEach((item, i) => {
            const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `第${i+1}位: `;
            
            // 💡 修正2：ローカルLLMの「半角コロン」や「不要な記号（*など）」を無視してコメントだけを抜き出すちゅ！
            const targetLine = lines.find(l => l.includes(`${i+1}位`));
            let comment = "応援してるちゅ！";
            if (targetLine) {
                // 「：」か「:」で分割して、後ろの文章を取り出す
                const parts = targetLine.split(/[：:]/);
                if (parts.length > 1) {
                    comment = parts.slice(1).join(':').replace(/\*/g, '').trim();
                } else {
                    // もしコロンすら忘れていた場合は、順位の文字だけを消して採用するちゅ
                    comment = targetLine.replace(new RegExp(`.*${i+1}位.*`), '').replace(/\*/g, '').trim();
                }
            }

            if (i < 3) {
                embed.addFields({ name: `${medal}${item.name} (${item.score}点)`, value: `💬 ${comment}\n🎁 アイテム: \`${item.luckyItem}\`` });
            } else {
                embed.addFields({ name: `${medal}${item.name}`, value: `💬 ${comment}`, inline: true });
            }
        });

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    else if (interaction.commandName === 'rune') {
        await interaction.deferReply({ ephemeral: true });
        const personalSeed = getPersonalDailyRandom(interaction.user.id, 777);
        const runeIndex = Math.floor(personalSeed * runeAlphabet.length);
        const selectedRune = runeAlphabet[runeIndex];

        const noReverseRunes = ['ᛗ', 'ᚷ', 'ᚹ', 'ᚻ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛊ', 'ᛝ', 'ᛞ'];
        let isReversed = getPersonalDailyRandom(interaction.user.id, 888) < 0.5;
        if (noReverseRunes.includes(selectedRune.symbol)) isReversed = false;

        const imagePath = path.join(__dirname, 'images', selectedRune.image);

        try {
            if (!fs.existsSync(imagePath)) throw new Error(`FILE_NOT_FOUND: ${selectedRune.image}`);

            const imageBuffer = await sharp(imagePath)
                .resize(300, 300)
                .rotate(isReversed ? 180 : 0)
                .webp({ quality: 75 })
                .toBuffer();
            
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rune.webp' });
            const geminiMessage = await getGeminiRuneReading(selectedRune.name, isReversed, interaction.user.username);

            const embed = new EmbedBuilder()
                .setColor(0x8B4513)
                .setTitle(`ᚱ 今日のルーン：${selectedRune.symbol} ${selectedRune.name}`)
                .setImage('attachment://rune.webp')
                .addFields(
                    { name: '象徴', value: selectedRune.meaning, inline: true },
                    { name: '向き', value: isReversed ? '逆位置 🙃' : '正位置 ✨', inline: true },
                    { name: '石に刻まれた意味', value: isReversed ? selectedRune.reversed : selectedRune.upright },
                    { name: 'ねずみのお告げ', value: geminiMessage }
                )
                .setFooter({ text: `${new Date().toLocaleDateString('ja-JP')} の石の言葉だちゅ！` });

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Rune Command Error:', error);
            if (error.message.includes('FILE_NOT_FOUND')) {
                await interaction.editReply(`画像（${selectedRune.image}）が images フォルダに見当たらないちゅ…。`);
            } else {
                await interaction.editReply('ルーンを読み取ろうとしたけど、何かがおかしいちゅ…。ログを確認してちゅ！');
            }
        }
    }
    // 💡 【追加】/sushi_order コマンド (注文＆画像提示)
    else if (interaction.commandName === 'sushi_order') {
        await interaction.deferReply({ ephemeral: true }); // epemeral指定

        // 1. 大将の画像を圧縮して取得
        const daishoAttachment = await compressAndGetAttachment('daisho.jpg');
        
        // 2. 寿司リストのSelectMenu（プルダウン）を作成
        const sushiOptions = sushiMenu.map((item, index) => ({
            label: `${item.name} - ${item.price}円`,
            description: item.description,
            value: index.toString(), // インデックスを値にする
            emoji: '🍣'
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('sushi_select_order')
                .setPlaceholder('どのネタを見るちゅか？✨')
                .addOptions(sushiOptions)
        );

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🍣 いらっしゃい！ねずみ寿司の大将だちゅ！')
            .setDescription('ウチ自慢のネタを見てってちゅ！\n下のリストから選べば、握りたての画像を出すちゅよ！🐭')
            .setFooter({ text: 'らっしゃいらっしゃいちゅ！' });

        if (daishoAttachment) {
            embed.setImage(`attachment://${daishoAttachment.name}`);
            await interaction.editReply({ embeds: [embed], files: [daishoAttachment], components: [row] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }

    // 💡 【追加】寿司プルダウン選択時の処理 (圧縮画像提示)
    else if (interaction.isStringSelectMenu() && interaction.customId === 'sushi_select_order') {
        await interaction.deferUpdate(); // ephemeralなのでUpdateでOK

        const selectedIndex = parseInt(interaction.values[0], 10);
        const selectedSushi = sushiMenu[selectedIndex];

        // 指定された寿司の画像を圧縮して取得
        const sushiAttachment = await compressAndGetAttachment(selectedSushi.image);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`✨ はい、${selectedSushi.name} お待ちだちゅ！`)
            .setDescription(`${selectedSushi.description}\nお値段は **${selectedSushi.price}円** だちゅ！🐭💨`)
            .setFooter({ text: 'へいおまちちゅ！' });

        if (sushiAttachment) {
            embed.setImage(`attachment://${sushiAttachment.name}`);
            await interaction.followUp({ embeds: [embed], files: [sushiAttachment], ephemeral: true });
        } else {
            await interaction.followUp({ content: `ごめんちゅ… ${selectedSushi.name} の画像が見つからなかったちゅ…。`, ephemeral: true });
        }
    }

    // 💡 【追加】/sushi_oaiso コマンド (おあいそゲーム開始)
    // 💡 【修正】/sushi_oaiso コマンド (おあいそゲーム開始)
    else if (interaction.commandName === 'sushi_oaiso') {
        await interaction.deferReply({ ephemeral: true });

        // 目標金額を設定 (例: 2000円〜5000円の間)
        const targetPrice = Math.floor(Math.random() * 4) * 1000 + 2000; 
        
        // ゲーム状態をMapに保存
        oaisoGames.set(interaction.user.id, {
            target: targetPrice,
            currentTotal: 0,
            orderedItems: []
        });

        // 💡 修正：寿司リストのSelectMenuから値段を隠すちゅ！
        const sushiOptions = sushiMenu.map((item, index) => ({
            label: `${item.name}`, // item.price を消したちゅ！
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

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💰 おあいそゲーム！大将と勝負だちゅ！')
            .setDescription(`目標金額は **${targetPrice}円** だちゅ！\n下のリストから寿司を追加して、ぴったりを狙ってちゅ。\n（値段は『寿司リスト』で確認しておくか、大将の顔色を読んで予想してね！）`)
            .addFields(
                // 💡 修正：現在の合計を「？？？円」にして隠すちゅ！
                { name: '現在の合計', value: '？？？ 円', inline: true },
                { name: '目標金額', value: `${targetPrice}円`, inline: true }
            );

        await interaction.editReply({ embeds: [embed], components: [selectRow, buttonRow] });
    }

    // 💡 【追加】おあいそゲーム：アイテム追加処理
    else if (interaction.isStringSelectMenu() && interaction.customId === 'oaiso_add_item') {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = oaisoGames.get(userId);

        if (!game) return interaction.followUp({ content: 'ゲーム情報が見つからないちゅ。もう一度 `/sushi_oaiso` を打ってちゅ！', ephemeral: true });

        const selectedIndex = parseInt(interaction.values[0], 10);
        const selectedSushi = sushiMenu[selectedIndex];

        // 💡 裏側でコッソリ合計金額を更新するちゅ（ユーザーには見せない！）
        game.currentTotal += selectedSushi.price;
        game.orderedItems.push(selectedSushi.name);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🍣 注文を追加したちゅ！')
            // 💡 修正：追加した時の値段表示も消すちゅ！
            .setDescription(`へいお待ち！ **${selectedSushi.name}** を追加したちゅ。`)
            .addFields(
                // 💡 修正：ここでも合計金額は「？？？円」のままだちゅ！
                { name: '現在の合計', value: `？？？ 円`, inline: true },
                { name: '目標金額', value: `${game.target}円`, inline: true },
                { name: '注文履歴', value: game.orderedItems.join('、') || 'なし' }
            );

        await interaction.editReply({ embeds: [embed] });
    }

    // 💡 【追加】おあいそゲーム：おあいそ（結果発表）処理
    else if (interaction.isButton() && interaction.customId === 'oaiso_bill_please') {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = oaisoGames.get(userId);

        if (!game) return interaction.followUp({ content: 'ゲーム情報が見つからないちゅ。', ephemeral: true });

        const diff = game.currentTotal - game.target;
        let resultMsg = "";
        let color = 0x00FF00;

        if (diff === 0) {
            resultMsg = `🎉 **ピッタシだちゅ！！すごいちゅ！！** 🎉\n大将も脱帽だちゅ、この勘の良さは本物だちゅ！✨🧀`;
            color = 0xFFD700; // 金色
        } else if (Math.abs(diff) <= 200) {
            resultMsg = `😲 **惜しいちゅ！あとちょっとだったちゅ！**\n（差額: ${diff}円）。大将もヒヤヒヤしたちゅ、次はイケるちゅ！`;
            color = 0x00FA9A;
        } else {
            resultMsg = `😢 **あちゃ〜、大外れだちゅ…。**\n（差額: ${diff}円）。勘が鈍ってるちゅ、ひまわりの種でも食べて出直してちゅ！🐭💨`;
            color = 0xFF4500;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('💰 おあいそ結果発表！！💰')
            .setDescription(resultMsg)
            .addFields(
                { name: '最終合計', value: `${game.currentTotal}円`, inline: true },
                { name: '目標金額', value: `${game.target}円`, inline: true },
                { name: '注文したネタ', value: game.orderedItems.join('、') || 'なし' }
            )
            .setFooter({ text: '※ゲームは終了したちゅ。また勝負してちゅ！' });

        // ゲーム状態を削除
        oaisoGames.delete(userId);

        // ボタンとセレクトメニューを消して結果をUpdate
        await interaction.editReply({ embeds: [embed], components: [] });
    }
    // 💡 【追加】/pet_catch コマンド (相棒を捕まえる)
    else if (interaction.commandName === 'pet_catch') {
        await interaction.deferReply();
        const userId = interaction.user.id;

        // すでにペットを持っているかチェック
        if (userPets[userId]) {
            return interaction.editReply(`あなたは既に **${userPets[userId].name}** (${userPets[userId].emoji}) を連れているちゅ！浮気はダメだちゅ！🐭💢`);
        }

        // ランダムな種族を選ぶ
        const species = petSpecies[Math.floor(Math.random() * petSpecies.length)];

        // ユーザー専用のペットデータを作成
        userPets[userId] = {
            name: species.name,
            emoji: species.emoji,
            level: 1,
            exp: 0,
            hp: species.baseHp,
            maxHp: species.baseHp,
            atk: species.baseAtk
        };

        // 💡 ここが超重要！ファイルにセーブするちゅ！
        savePets();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`🎉 やったー！ ${species.name} が仲間になったちゅ！`)
            .setDescription(`${species.desc}\nこれから一緒に冒険して、最強の相棒に育てるちゅ！`)
            .addFields(
                { name: 'レベル', value: 'Lv.1', inline: true },
                { name: '体力 (HP)', value: `${species.baseHp}`, inline: true },
                { name: '攻撃力 (ATK)', value: `${species.baseAtk}`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    }

    // 💡 【追加】/pet_status コマンド (ステータス確認)
    else if (interaction.commandName === 'pet_status') {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const myPet = userPets[userId];

        if (!myPet) {
            return interaction.editReply('あなたはまだ相棒を持っていないちゅ。`/pet_catch` で探しに行こうちゅ！🌱');
        }

        // 次のレベルまでの必要経験値 (レベル×10 とするちゅ)
        const nextExp = myPet.level * 10;

        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle(`${myPet.emoji} ${interaction.user.username}の相棒：${myPet.name}`)
            .setDescription(`現在 **Lv.${myPet.level}** だちゅ！`)
            .addFields(
                { name: '体力 (HP)', value: `${myPet.hp} / ${myPet.maxHp}`, inline: true },
                { name: '攻撃力 (ATK)', value: `${myPet.atk}`, inline: true },
                { name: '経験値 (EXP)', value: `${myPet.exp} / ${nextExp}`, inline: true }
            )
            .setFooter({ text: '※これから特訓やバトル機能を実装していくちゅ！' });

        await interaction.editReply({ embeds: [embed] });
    }
    // 💡 【追加】/pet_train コマンド (特訓してレベルアップ)
    else if (interaction.commandName === 'pet_train') {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const myPet = userPets[userId];

        // 1. 相棒がいるかチェック
        if (!myPet) {
            return interaction.editReply('特訓する相棒がいないちゅ！まずは `/pet_catch` で見つけるちゅ！🌱');
        }

        // 2. 特訓で得られる経験値 (5〜15のランダム)
        const gainedExp = Math.floor(Math.random() * 11) + 5;
        myPet.exp += gainedExp;

        let levelUpMsg = "";
        let requiredExp = myPet.level * 10; // 次のレベルに必要な経験値

        // 3. レベルアップ判定！
        if (myPet.exp >= requiredExp) {
            myPet.level += 1;
            myPet.exp -= requiredExp; // 余った経験値を持ち越し

            // ステータスアップ (HP: 2〜5, ATK: 1〜3 がランダムで上がるちゅ)
            const hpGrowth = Math.floor(Math.random() * 4) + 2;
            const atkGrowth = Math.floor(Math.random() * 3) + 1;
            
            myPet.maxHp += hpGrowth;
            myPet.hp = myPet.maxHp; // 💡 レベルアップのオマケでHP全回復！
            myPet.atk += atkGrowth;

            levelUpMsg = `\n\n🎉 **レベルアップ！！ Lv.${myPet.level} になったちゅ！** 🎉\n最大HPが **+${hpGrowth}**、攻撃力が **+${atkGrowth}** 上がったちゅ！✨`;
        }

        // 4. 成長したデータをファイルにセーブ！ (これがないと忘れちゃうちゅ)
        savePets();

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle(`💦 ${myPet.emoji} ${myPet.name} は猛特訓をしたちゅ！`)
            .setDescription(`**+${gainedExp} EXP** を獲得したちゅ！${levelUpMsg}`)
            .addFields(
                { name: '現在のレベル', value: `Lv.${myPet.level}`, inline: true },
                { name: '経験値', value: `${myPet.exp} / ${myPet.level * 10}`, inline: true },
                { name: 'ステータス', value: `HP: ${myPet.maxHp} / ATK: ${myPet.atk}`, inline: true }
            )
            .setFooter({ text: 'どんどん特訓して、最強の相棒を目指すちゅ！' });

        await interaction.editReply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);