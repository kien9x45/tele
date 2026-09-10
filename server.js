const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Kích hoạt cấu hình trung gian bắt buộc cho API
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình cây trồng đồng bộ
const CROPS_CONFIG = {
    wheat: { name: "Lúa mì", cost: 10, revenue: 20, time: 10 },
    carrot: { name: "Cà rốt", cost: 30, revenue: 65, time: 25 }
};

let usersDatabase = {};

function getOrCreateUser(userId, username) {
    // Ép kiểu userId về dạng chuỗi để tránh lỗi so sánh kiểu dữ liệu giữa Client và Server
    const sId = String(userId);
    if (!usersDatabase[sId]) {
        usersDatabase[sId] = {
            id: sId,
            username: username || "Nông dân Mates",
            balance: 100, // Tặng 100 xu vàng trải nghiệm
            plots: Array(6).fill(null).map(() => ({ status: 'empty', cropType: null, readyAt: null }))
        };
    }
    return usersDatabase[sId];
}

// Điều hướng trang chủ phục vụ index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 1: Đồng bộ dữ liệu tài khoản
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

// API 2: Trồng cây
app.post('/api/plant', (req, res) => {
    const { userId, plotIndex, cropType } = req.body;
    const sId = String(userId);
    const user = usersDatabase[sId];
    
    if (!user) return res.status(444).json({ error: "Không tìm thấy thông tin người chơi trên hệ thống!" });
    
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

// API 3: Thu hoạch
app.post('/api/harvest', (req, res) => {
    const { userId, plotIndex } = req.body;
    const sId = String(userId);
    const user = usersDatabase[sId];
    
    if (!user) return res.status(444).json({ error: "Không tìm thấy thông tin người chơi trên hệ thống!" });

    const plot = user.plots[plotIndex];
    const now = Date.now();

    if (plot.status === 'growing' && now >= plot.readyAt) {
        plot.status = 'ready';
    }

    if (plot.status !== 'ready') {
        return res.status(400).json({ error: "Nông sản chưa chín để thu hoạch!" });
    }

    const crop = CROPS_CONFIG[plot.cropType];
    user.balance += crop.revenue;

    plot.status = 'empty';
    plot.cropType = null;
    plot.readyAt = null;

    res.json({ success: true, user });
});

// Tối ưu cổng mạng động cho Render
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Hệ thống đang chạy ổn định tại cổng ${port}`));

