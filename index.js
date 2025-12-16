// index.js (সম্পূর্ণ কোড)

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const mongoose = require('mongoose');

// =========================================================
// ১. কাস্টম কনফিগারেশন ভেরিয়েবল (আপনার তথ্য দিয়ে পরিবর্তন করুন)
// =========================================================

const BOT_TOKEN = "8545244121:AAGovQWgpng0WkrKJfjQ6HmtWkK3izZJ0tg"; // আপনার বট টোকেন
const MONGO_URI = "mongodb+srv://manasichouni2024_db_user:manasi23@cluster0.jsolkip.mongodb.net/?appName=Cluster0"; // আপনার MongoDB URI
const WORKER_URL = "terabox.andrwamax.workers.dev"; // আপনার চূড়ান্ত Worker URL

// অ্যাডমিন ID-গুলি কমা সেপারেটেড স্ট্রিং হিসাবে দিন 
const ADMIN_IDS_RAW = "6295533968,9876543210"; 
const ADMIN_IDS = ADMIN_IDS_RAW.split(',').map(id => parseInt(id.trim()));

// =========================================================
// ২. MongoDB Schema এবং সংযোগ
// =========================================================

const userSchema = new mongoose.Schema({
    _id: Number, 
    username: String,
    // access_expires ডিফল্ট হিসাবে অতীতে সেট করা হলো, মানে অ্যাক্সেস নেই
    access_expires: { type: Date, default: () => new Date(Date.now() - 1000) } 
});

const configSchema = new mongoose.Schema({
    _id: String,
    value: String
});

const User = mongoose.model('User', userSchema);
const Config = mongoose.model('Config', configSchema);

// MongoDB সংযোগ চেষ্টা
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB সংযোগ সফল হয়েছে।'))
    .catch(err => console.error('❌ MongoDB সংযোগ ব্যর্থ:', err));


// =========================================================
// ৩. Utility ফাংশন
// =========================================================

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

async function ensureUserExists(userId, username) {
    let user = await User.findById(userId);
    if (!user) {
        user = new User({ _id: userId, username: username });
        await user.save();
    }
    return user;
}

async function hasActiveAccess(userId) {
    const user = await User.findById(userId);
    if (user && user.access_expires && user.access_expires > new Date()) {
        return true;
    }
    return false;
}

async function add24HourAccess(userId) {
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(userId, { access_expires: newExpiry }, { upsert: true });
}

// ... অন্যান্য utility functions (যেমন getConfig, setConfig) ...
// (যেহেতু আপনি শুধু কোড চেয়েছেন, আমি শুধু মূল ফাংশনগুলো রাখছি)


// =========================================================
// ৪. Telegraf বট ইনিসিয়ালাইজেশন এবং হ্যান্ডলার
// =========================================================
const bot = new Telegraf(BOT_TOKEN);

// --- /start কমান্ড ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    await ensureUserExists(userId, username);
    
    const hasAccess = await hasActiveAccess(userId);
    let message = `নমস্কার, আমি TeraBox ভিডিও ডাউনলোডার বট! 👋\n\n`;
    
    if (hasAccess) {
        message += `আপনার *অ্যাক্সেস সক্রিয়* আছে। এখন আমাকে TeraBox লিঙ্ক পাঠান।`;
    } else {
        message += `আপনার *অ্যাক্সেস মেয়াদ উত্তীর্ণ* হয়েছে।\n\nদয়া করে ডাউনলোড করার জন্য অ্যাক্সেস নিন।`;
    }

    ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            Markup.button.callback('অ্যাক্সেস কিনুন (এডমিন)', 'buy_access')
        ])
    });
});

// --- TeraBox লিঙ্ক হ্যান্ডলিং ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const link = ctx.message.text.trim();

    // TeraBox লিঙ্ক যাচাই
    const teraboxUrlRegex = /https?:\/\/(www\.)?(terabox|4funbox|nephobox)\.com\/\S+/i;

    if (!link.match(teraboxUrlRegex)) {
        return ctx.reply("এটি বৈধ TeraBox লিঙ্ক নয়। অনুগ্রহ করে একটি সঠিক লিঙ্ক পাঠান।");
    }

    const hasAccess = await hasActiveAccess(userId);
    if (!hasAccess && !isAdmin(userId)) {
        return ctx.reply("দুঃখিত, আপনার ডাউনলোড অ্যাক্সেস নেই। অ্যাক্সেস কিনতে /start চাপুন।");
    }

    // --- আসল ডাউনলোড লজিক এখানে বসান ---
    try {
        await ctx.reply(`🔗 লিঙ্কটি পেয়েছি। ডাউনলোড প্রক্রিয়া শুরু হচ্ছে...`);
        
        // ******************************************************************
        // *** আপনার মূল TeraBox ডাউনলোড এবং ফাইল আপলোডের কোড এখানে বসান ***
        // *** যেমন, axios.post() কল করে API থেকে ভিডিও তথ্য আনা,
        // *** তারপর টেলিগ্রামে ভিডিও আপলোড করা।
        // ******************************************************************

        // উদাহরণ রেসপন্স:
        // await ctx.reply("ভিডিওটি সফলভাবে ডাউনলোড এবং পাঠানো হয়েছে!"); 

    } catch (error) {
        console.error("Download Error:", error);
        ctx.reply("❌ ডাউনলোড প্রক্রিয়াকরণে একটি ত্রুটি হয়েছে।");
    }
});

// --- অ্যাডমিন কমান্ড: অ্যাক্সেস প্রদান ---
bot.command('addaccess', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.reply("আপনি এই কমান্ড ব্যবহার করার জন্য অনুমোদিত নন।");
    }
    
    const parts = ctx.message.text.split(' ');
    const targetUserId = parseInt(parts[1]);

    if (!targetUserId) {
        return ctx.reply("ব্যবহারের নিয়ম: /addaccess <ইউজার আইডি>");
    }

    try {
        await add24HourAccess(targetUserId);
        ctx.reply(`✅ ইউজার ID ${targetUserId}-কে ২৪ ঘন্টার জন্য অ্যাক্সেস দেওয়া হয়েছে।`);
    } catch (e) {
        ctx.reply("❌ অ্যাক্সেস দেওয়ার সময় ত্রুটি হয়েছে।");
    }
});

// --- Inline Button Handlers ---
bot.action('buy_access', (ctx) => {
    ctx.editMessageText(`অ্যাক্সেস কিনতে এডমিন-কে মেসেজ করুন:\nএডমিন ID: ${ADMIN_IDS[0]}`, { 
        reply_markup: Markup.inlineKeyboard([
            Markup.button.url('এডমিন-কে মেসেজ করুন', `tg://user?id=${ADMIN_IDS[0]}`)
        ])
    });
});

// =========================================================
// ৫. Cloudflare Worker Webhook Setup
// =========================================================

module.exports = {
    /**
     * Cloudflare Worker-এর প্রধান এন্ট্রি পয়েন্ট।
     * @param {Request} request 
     * @returns {Response}
     */
    async fetch(request) {
        // GET রিকোয়েস্ট পেলে শুধু হেলথ চেক বা তথ্য দিন
        if (request.method === 'GET') {
            return new Response(`TeraBox Bot Worker চলছে। Webhook URL: ${WORKER_URL}`, { status: 200 });
        }
        
        // শুধুমাত্র POST রিকোয়েস্ট (Webhook) হ্যান্ডেল করুন
        if (request.method === 'POST') {
            try {
                // টেলিগ্রাম থেকে আসা Webhook ডেটা
                const update = await request.json();
                await bot.handleUpdate(update); // Telegraf-কে আপডেট হ্যান্ডেল করতে দিন
                return new Response('OK', { status: 200 });
            } catch (e) {
                console.error('Webhook Error:', e);
                // Worker ত্রুটি হলেও 200 OK পাঠানো উচিত, যাতে টেলিগ্রাম রিকোয়েস্ট বাতিল না করে।
                return new Response('Error Processing Update', { status: 200 }); 
            }
        }

        // অন্য কোনো রিকোয়েস্ট মেথড হলে
        return new Response('Method Not Allowed', { status: 405 });
    }
};
