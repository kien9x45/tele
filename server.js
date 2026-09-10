const express = require('express');
const cors = require('cors');
const path = require('path'); // Thư viện hệ thống xử lý đường dẫn file
const app = express();

// Cấu hình các tính năng trung gian (Middleware)
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Cho phép truy cập trực tiếp vào các file tĩnh trong thư mục public

// Cấu hình thông số cây trồng xử lý tập trung tại Server để chống hack/cheat xu
const CROPS_CONFIG = {
    wheat: { name: "Lúa mì", cost: 10, revenue: 20, time: 10 }, // Thời gian chín: 10 giây
    carrot: { name: "Cà rốt", cost: 30, revenue: 65, time: 25 }  // Thời gian chín: 25 giây
};

// Cơ sở dữ liệu tạm thời lưu trong RAM của Server Render
let usersDatabase = {};

// Hàm kiểm tra hoặc khởi tạo dữ liệu cho nông dân mới
function getOrCreateUser(userId, username) {
    if (!usersDatabase[userId]) {
        usersDatabase[userId] = {
            id: userId,
            username: username || "Nông dân ẩn danh",
            balance: 100, // Tặng sẵn 100 xu vàng trải nghiệm game ban đầu
            plots: Array(6).fill(null).map(() => ({ status: 'empty', cropType: null, readyAt: null }))
        };
    }
    return usersDatabase[userId];
}

// ----------------------------------------------------
// ĐỊNH TUYẾN PHỤC VỤ GIAO DIỆN CHÍNH (SỬA LỖI CANNOT GET /)
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// CÁC HỆ THỐNG API XỬ LÝ LOGIC GAME
// ----------------------------------------------------

// API 1: Đồng bộ dữ liệu nông trại của người chơi
app.post('/api/user-data', (req, res) => {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "Thiếu thông tin UserId!" });
    
    const user = getOrCreateUser(userId, username);
    const now = Date.now();
    
    // Tự động kiểm tra thời gian thực trên Server xem cây nào đã đến lúc chín chưa
    user.plots.forEach(plot => {
        if (plot.status === 'growing' && now >= plot.readyAt) {
            plot.status = 'ready';
        }
    });

    res.json(user);
});

// API 2: Gửi lệnh trồng hạt giống xuống ô đất
app.post('/api/plant', (req, res) => {
    const { userId, plotIndex, cropType } = req.body;
    const user = usersDatabase[userId];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người chơi" });
    
    const crop = CROPS_CONFIG[cropType];
    const plot = user.plots[plotIndex];

    if (!crop || !plot || plot.status !== 'empty' || user.balance < crop.cost) {
        return res.status(400).json({ error: "Hành động không hợp lệ hoặc tài khoản không đủ tiền!" });
    }

    // Trừ số dư vàng và đặt mốc thời gian chín chính xác dựa trên giờ hệ thống Server
    user.balance -= crop.cost;
    plot.status = 'growing';
    plot.cropType = cropType;
    plot.readyAt = Date.now() + (crop.time * 1000); 

    res.json({ success: true, user });
});

// API 3: Gửi lệnh thu hoạch nông sản đã chín để nhận vàng
app.post('/api/harvest', (req, res) => {
    const { userId, plotIndex } = req.body;
    const user = usersDatabase[userId];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người chơi" });

    const plot = user.plots[plotIndex];
    const now = Date.now();

    // Xác minh lại thời gian chín một lần nữa tại Server trước khi cho nhận tiền
    if (plot.status === 'growing' && now >= plot.readyAt) {
        plot.status = 'ready';
    }

    if (plot.status !== 'ready') {
        return res.status(400).json({ error: "Nông sản chưa chín hoặc đất đang trống!" });
    }

    const crop = CROPS_CONFIG[plot.cropType];
    user.balance += crop.revenue; // Cộng tiền thưởng vàng vào tài khoản người chơi

    // Khởi tạo lại ô đất về trạng thái trống ban đầu
    plot.status = 'empty';
    plot.cropType = null;
    plot.readyAt = null;

    res.json({ success: true, user });
});

// ----------------------------------------------------
// KHỞI ĐỘNG CỔNG KẾT NỐI (ĐỒNG BỘ MÔI TRƯỜNG RENDER)
// ----------------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Hệ thống Hay Farm Server đang chạy tại cổng ${port}`));
