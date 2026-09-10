const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const CROPS_CONFIG = {
    wheat: { name: "Lúa mì", cost: 10, revenue: 20, time: 10 },
    carrot: { name: "Cà rốt", cost: 30, revenue: 65, time: 25 }
};

let usersDatabase = {};

function getOrCreateUser(userId, username) {
    if (!usersDatabase[userId]) {
        usersDatabase[userId] = {
            id: userId,
            username: username || "Nông dân ẩn danh",
            balance: 100,
            plots: Array(6).fill(null).map(() => ({ status: 'empty', cropType: null, readyAt: null }))
        };
    }
    return usersDatabase[userId];
}

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

app.post('/api/plant', (req, res) => {
    const { userId, plotIndex, cropType } = req.body;
    const user = usersDatabase[userId];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người chơi" });
    
    const crop = CROPS_CONFIG[cropType];
    const plot = user.plots[plotIndex];

    if (!crop || !plot || plot.status !== 'empty' || user.balance < crop.cost) {
        return res.status(400).json({ error: "Hành động không hợp lệ hoặc tài khoản không đủ tiền!" });
    }

    user.balance -= crop.cost;
    plot.status = 'growing';
    plot.cropType = cropType;
    plot.readyAt = Date.now() + (crop.time * 1000); 
    res.json({ success: true, user });
});

app.post('/api/harvest', (req, res) => {
    const { userId, plotIndex } = req.body;
    const user = usersDatabase[userId];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người chơi" });

    const plot = user.plots[plotIndex];
    const now = Date.now();

    if (plot.status === 'growing' && now >= plot.readyAt) {
        plot.status = 'ready';
    }

    if (plot.status !== 'ready') {
        return res.status(400).json({ error: "Nông sản chưa chín hoặc đất đang trống!" });
    }

    const crop = CROPS_CONFIG[plot.cropType];
    user.balance += crop.revenue;

    plot.status = 'empty';
    plot.cropType = null;
    plot.readyAt = null;

    res.json({ success: true, user });
});

// Thay đổi dòng listen cũ thành đoạn này:
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server đang chạy tại cổng ${port}`));

