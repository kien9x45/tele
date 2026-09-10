const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Bot, InlineKeyboard } = require('grammy');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// TELEGRAM BOT CONFIG (Dán Token của bạn vào đây)
// ----------------------------------------------------
const BOT_TOKEN = "7832658924:AAFlkX..."; 
const bot = new Bot(BOT_TOKEN);
const WEB_APP_URL = "https://onrender.com"; 

bot.command("start", async (ctx) => {
    const username = ctx.from.first_name || "Nông dân";
    const keyboard = new InlineKeyboard().webApp("👨‍🌾 Vào Nông Trại FarmerTON", WEB_APP_URL);
    await ctx.reply(
        `👋 Xin chào ${username} đã đến với *FarmerTON Clone*!\n\n` +
        `🌾 Hãy gieo hạt, nâng cấp ô đất và tích lũy $GOLD để sẵn sàng Airdrop nhé.`,
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});
bot.start().catch(err => console.error("Lỗi Bot:", err));

// ----------------------------------------------------
// DATABASE FILE SYSTEM
// ----------------------------------------------------
const DB_FILE = path.join(__dirname, 'database.json');
let usersDatabase = {};

if (fs.existsSync(DB_FILE)) {
    try { usersDatabase = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
    catch (e) { usersDatabase = {}; }
}
function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(usersDatabase, null, 2), 'utf8');
}

const CROPS_CONFIG = {
    wheat: { name: "Lúa mì", cost: 10, revenue: 20, time: 10 },
    carrot: { name: "Cà rốt", cost: 30, revenue: 65, time: 25 }
};

function getOrCreateUser(userId, username) {
    const sId = String(userId);
    if (!usersDatabase[sId]) {
        usersDatabase[sId] = {
            id: sId,
            username: username || "Farmer",
            balance: 100, 
            plots: Array(6).fill(null).map(() => ({ status: 'empty', cropType: null, readyAt: null }))
        };
        saveDatabase();
    }
    return usersDatabase[sId];
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/user-data', (req, res) => {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "Thiếu UserId!" });
    
    const user = getOrCreateUser(userId, username);
    const now = Date.now();
    
    user.plots.forEach(plot => {
        if (plot.status === 'growing' && (now + 1500) >= plot.readyAt) {
            plot.status = 'ready';
        }
    });
    res.json(user);
});

app.post('/api/plant', (req, res) => {
    const { userId, username, plotIndex, cropType } = req.body;
    const user = getOrCreateUser(userId, username);
    const crop = CROPS_CONFIG[cropType];
    const plot = user.plots[plotIndex];

    if (!crop || !plot || plot.status !== 'empty' || user.balance < crop.cost) {
        return res.status(400).json({ error: "Hành động hoặc số dư không đủ xu!" });
    }

    user.balance -= crop.cost;
    plot.status = 'growing';
    plot.cropType = cropType;
    plot.readyAt = Date.now() + (crop.time * 1000); 

    saveDatabase();
    res.json({ success: true, user });
});

app.post('/api/harvest', (req, res) => {
    const { userId, username, plotIndex } = req.body;
    const user = getOrCreateUser(userId, username);
    const plot = user.plots[plotIndex];
    const now = Date.now();

    // Bù 1.5 giây dung sai mạng chống lỗi nông sản chưa chín
    if (plot.status === 'growing' && (now + 1500) >= plot.readyAt) {
        plot.status = 'ready';
    }

    if (plot.status !== 'ready') {
        return res.status(400).json({ error: "Nông sản chưa chín!" });
    }

    const crop = CROPS_CONFIG[plot.cropType];
    user.balance += crop.revenue;

    plot.status = 'empty';
    plot.cropType = null;
    plot.readyAt = null;

    saveDatabase();
    res.json({ success: true, user });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server FarmerTON chạy tại cổng ${port}`));
