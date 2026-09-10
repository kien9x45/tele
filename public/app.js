const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = String(tg?.initDataUnsafe?.user?.id || "12345"); 
const username = tg?.initDataUnsafe?.user?.first_name || "Nông dân TON";
const SERVER_URL = window.location.origin; 

let currentSelectedCrop = 'wheat';
let localUserData = null;
let isWalletConnected = false;

function selectCrop(type) {
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    currentSelectedCrop = type;
    
    if (type === 'wheat') {
        btnWheat.className = "flex-1 py-3 rounded-xl bg-gradient-to-b from-cyan-600 to-blue-700 border border-cyan-400/40 text-white font-black text-xs flex flex-col items-center justify-center web3-btn";
        btnCarrot.className = "flex-1 py-3 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 text-xs flex flex-col items-center justify-center shadow-inner";
    } else {
        btnWheat.className = "flex-1 py-3 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 text-xs flex flex-col items-center justify-center shadow-inner";
        btnCarrot.className = "flex-1 py-3 rounded-xl bg-gradient-to-b from-cyan-600 to-blue-700 border border-cyan-400/40 text-white font-black text-xs flex flex-col items-center justify-center web3-btn";
    }
}

function toggleWallet() {
    const text = document.getElementById('wallet-text');
    const btn = document.getElementById('btn-wallet');
    
    if (!isWalletConnected) {
        isWalletConnected = true;
        text.innerText = "UQ...8x9F";
        btn.className = "text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-700 shadow-lg shadow-emerald-500/20";
        showToast("KẾT NỐI VÍ TON THÀNH CÔNG!");
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } else {
        isWalletConnected = false;
        text.innerText = "CONNECT WALLET";
        btn.className = "web3-btn text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/40";
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
        let style = "neon-border bg-slate-900/40";
        let content = "";
        const now = Date.now();

        if (plot.status === 'empty') {
            content = `
                <svg viewBox="0 0 40 40" class="w-10 h-10 opacity-20">
                    <rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="#00c6ff" stroke-width="1.5" stroke-dasharray="4"/>
                    <circle cx="20" cy="20" r="2" fill="#00c6ff"/>
                </svg>
            `;
        } 
        // ĐANG LỚN: Hộp đen tuyền, chữ Đếm ngược màu Trắng Neon cực rõ
        else if (plot.status === 'growing' && now < plot.readyAt) {
            style = "neon-border bg-slate-950 border-cyan-500/40";
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative p-1">
                    <svg viewBox="0 0 40 40" class="w-8 h-8 animate-pulse text-cyan-400">
                        <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
                        <path d="M20 11v9h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <div class="absolute bottom-1.5 bg-cyan-950 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap tracking-wide">
                        ${secondsLeft}S
                    </div>
                </div>
            `;
        } 
        // CHÍN: Nút Thu hoạch xanh lục bảo chữ Đen đậm tương phản tối đa
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "neon-plot-ready bg-gradient-to-b from-emerald-400 to-teal-500 animate-bounce";
            plot.status = 'ready'; 

            let icon = plot.cropType === 'wheat' ? '🌾' : '🥕';
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    <span class="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">${icon}</span>
                    <span class="absolute bottom-1.5 bg-slate-950 text-emerald-400 border border-emerald-400/40 text-[8px] font-black px-2 py-0.5 rounded shadow uppercase tracking-wider scale-95 whitespace-nowrap">
                        CLAIM
                    </span>
                </div>
            `;
        }

        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="${style} aspect-square flex items-center justify-center overflow-hidden rounded-2xl border transition-all duration-75 active:scale-95 shadow-lg">
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
