const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CROPS_CONFIG = {
    wheat: { name: "Lúa mì", cost: 10, revenue: 20, time: 10 },
    carrot: { name: "Cà rốt", cost: 30, revenue: 65, time: 25 }
};

let usersDatabase = {};

// Hàm cốt lõi: Tự động kiểm tra và sinh dữ liệu nếu chưa tồn tại
function getOrCreateUser(userId, username) {
    const sId = String(userId);
    if (!usersDatabase[sId]) {
        usersDatabase[sId] = {
            id: sId,
            username: username || "Nông dân Mates",
            balance: 100, 
            plots: Array(6).fill(null).map(() => ({ status: 'empty', cropType: null, readyAt: null }))
        };
    }
    return usersDatabase[sId];
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 1: Đồng bộ dữ liệu
app.post('/api/user-data', (req, res) => {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "Thiếu thông tin UserId!" });
    
    const user = getOrCreateUser(userId, username);
    const now = Date.now();
    
    user.plots.forEach(plot => {
        if (plot.status === 'growing' && now >= plot.readyAt) {
            plot.status = 'ready';
        }
    });
    res.json(user);
});

// API 2: Trồng cây (Đã tích hợp tự động sửa lỗi thiếu User)
app.post('/api/plant', (req, res) => {
    const { userId, username, plotIndex, cropType } = req.body; // Lấy thêm username từ client gửi lên
    if (!userId) return res.status(400).json({ error: "Thiếu thông tin UserId!" });

    // VÁ LỖI: Nếu RAM server bị xóa, tự động tạo lại User ngay lập tức
    const user = getOrCreateUser(userId, username);
    
    const crop = CROPS_CONFIG[cropType];
    const plot = user.plots[plotIndex];

    if (!crop || !plot || plot.status !== 'empty' || user.balance < crop.cost) {
        return res.status(400).json({ error: "Hành động gieo hạt hoặc số dư không hợp lệ!" });
    }

    user.balance -= crop.cost;
    plot.status = 'growing';
    plot.cropType = cropType;
    plot.readyAt = Date.now() + (crop.time * 1000); 

    res.json({ success: true, user });
});

// API 3: Thu hoạch (Đã tích hợp tự động sửa lỗi thiếu User)
app.post('/api/harvest', (req, res) => {
    const { userId, username, plotIndex } = req.body;
    if (!userId) return res.status(400).json({ error: "Thiếu thông tin UserId!" });

    // VÁ LỖI: Tự động tạo lại User nếu không tìm thấy dữ liệu cũ trong RAM
    const user = getOrCreateUser(userId, username);

    const plot = user.plots[plotIndex];
    const now = Date.now();

    if (plot.status === 'growing' && now >= plot.readyAt) {
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

    res.json({ success: true, user });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Hệ thống hoạt động tại cổng ${port}`));
