const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = String(tg?.initDataUnsafe?.user?.id || "12345"); 
const username = tg?.initDataUnsafe?.user?.first_name || "Nông dân TON";
const SERVER_URL = window.location.origin; 

let currentSelectedCrop = 'wheat';
let localUserData = null;
let isWalletConnected = false;

function selectCrop(type) {
    currentSelectedCrop = type;
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    
    if (type === 'wheat') {
        btnWheat.className = "flex-1 py-3 rounded-xl bg-gradient-to-b from-cyan-600 to-blue-700 border border-cyan-400/40 text-white font-black text-xs flex flex-col items-center justify-center web3-btn";
        btnCarrot.className = "flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs flex flex-col items-center justify-center shadow-inner";
    } else {
        btnWheat.className = "flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs flex flex-col items-center justify-center shadow-inner";
        btnCarrot.className = "flex-1 py-3 rounded-xl bg-gradient-to-b from-cyan-600 to-blue-700 border border-cyan-400/40 text-white font-black text-xs flex flex-col items-center justify-center web3-btn";
    }
}

// Bổ sung hàm bật tắt kết nối ví TON giả lập
function toggleWallet() {
    const text = document.getElementById('wallet-text');
    const btn = document.getElementById('btn-wallet');
    
    if (!isWalletConnected) {
        isWalletConnected = true;
        text.innerText = "UQ...8x9F"; // Địa chỉ ví TON giả định
        btn.className = "text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-700 shadow-lg shadow-emerald-500/20";
        showToast("KẾT NỐI VÍ TON THÀNH CÔNG!");
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } else {
        isWalletConnected = false;
        text.innerText = "CONNECT WALLET";
        btn.className = "web3-btn text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20";
        showToast("ĐÃ NGẮT KẾT NỐI VÍ.");
        if (tg) tg.HapticFeedback.impactOccurred('light');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 2000);
}

async function fetchUserData() {
    try {
        const response = await fetch(`${SERVER_URL}/api/user-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, username })
        });
        localUserData = await response.json();
        renderFarm();
    } catch (e) { console.error("Lỗi kết nối", e); }
}

async function handlePlotClick(index, currentStatus) {
    let endpoint = "";
    let payload = { userId, username, plotIndex: index };

    if (currentStatus === 'empty') {
        endpoint = "/api/plant";
        payload.cropType = currentSelectedCrop;
    } else if (currentStatus === 'ready') {
        endpoint = "/api/harvest";
    } else {
        if (tg) tg.HapticFeedback.notificationOccurred('warning');
        return; 
    }

    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if (resData.error) return showToast(resData.error);
        
        localUserData = resData.user;
        renderFarm();
        if (tg) tg.HapticFeedback.impactOccurred('medium');
    } catch (e) { console.error("Lỗi", e); }
}

function renderFarm() {
    if (!localUserData) return;

    document.getElementById('username').innerText = localUserData.username;
    document.getElementById('balance').innerText = localUserData.balance;

    const grid = document.getElementById('grid-container');
    grid.innerHTML = '';

    localUserData.plots.forEach((plot, index) => {
        let style = "neon-border bg-slate-900/60";
        let content = "";
        const now = Date.now();

        // 1. Ô ĐẤT TRỐNG WEB3 (Ma trận mạch điện tử rỗng)
        if (plot.status === 'empty') {
            content = `
                <svg viewBox="0 0 40 40" class="w-10 h-10 opacity-30">
                    <rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="#00c6ff" stroke-width="1.5" stroke-dasharray="4"/>
                    <circle cx="20" cy="20" r="3" fill="#00c6ff"/>
                </svg>
            `;
        } 
        // 2. CÂY ĐANG LỚN (Mạch lõi hạt nhân nhấp nháy phát sáng)
        else if (plot.status === 'growing' && now < plot.readyAt) {
            style = "neon-border bg-cyan-950/20 border-cyan-500/50";
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative p-1">
                    <svg viewBox="0 0 40 40" class="w-9 h-9 animate-pulse">
                        <circle cx="20" cy="20" r="10" fill="none" stroke="#00c6ff" stroke-width="2"/>
                        <path d="M20 10v20M10 20h20" stroke="#00c6ff" stroke-width="1.5"/>
                    </svg>
                    <div class="absolute bottom-1 bg-cyan-500 text-slate-950 font-mono text-[7px] font-black px-1.5 py-0.5 rounded whitespace-nowrap scale-90">
                        ${secondsLeft}S
                    </div>
                </div>
            `;
        } 
        // 3. NÔNG SẢN ĐÃ CHÍN (Biểu tượng Token vàng phát sáng chói lọi + Bounce nhảy khối)
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "neon-plot-ready bg-emerald-950/40 border-emerald-400 animate-bounce";
            plot.status = 'ready'; 

            let icon = plot.cropType === 'wheat' ? '🌾' : '🥕';
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    <span class="text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">${icon}</span>
                    <span class="absolute bottom-1 bg-emerald-500 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider scale-90">CLAIM</span>
                </div>
            `;
        }

        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="${style} aspect-square flex items-center justify-center overflow-hidden rounded-2xl border transition-all duration-75 active:scale-95">
                ${content}
            </button>
        `);
    });
}

setInterval(() => {
    if (!localUserData) return;
    let needReRender = false;
    const now = Date.now();

    localUserData.plots.forEach(plot => {
        if (plot.status === 'growing') {
            needReRender = true; 
            if (now >= plot.readyAt) plot.status = 'ready';
        }
    });

    if (needReRender) renderFarm();
}, 1000);

fetchUserData();
