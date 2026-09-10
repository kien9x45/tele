const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = String(tg?.initDataUnsafe?.user?.id || "12345"); 
const username = tg?.initDataUnsafe?.user?.first_name || "TON Farmer";
const SERVER_URL = window.location.origin; 

let currentSelectedCrop = 'wheat';
let localUserData = null;
let isWalletConnected = false;

function selectCrop(type) {
    currentSelectedCrop = type;
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    btnWheat.classList.toggle('active', type === 'wheat');
    btnCarrot.classList.toggle('active', type === 'carrot');
}

function toggleWallet() {
    const text = document.getElementById('wallet-text');
    const btn = document.getElementById('btn-wallet');
    isWalletConnected = !isWalletConnected;
    if (isWalletConnected) {
        text.innerText = "UQ...8x9F";
        btn.className = "bg-gradient-to-r from-emerald-400 to-teal-600 text-white text-[9px] font-black px-3 py-2 rounded-xl border-b-4 border-emerald-800 shadow-md active:translate-y-0.5 active:border-b-2 transition-all";
        showToast("CONNECTED TON WALLET!");
    } else {
        text.innerText = "CONNECT TON";
        btn.className = "bg-gradient-to-r from-sky-400 to-blue-600 text-white text-[9px] font-black px-3 py-2 rounded-xl border-b-4 border-blue-800 shadow-md active:translate-y-0.5 active:border-b-2 transition-all";
        showToast("DISCONNECTED.");
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg; toast.classList.remove('opacity-0');
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
    } catch (e) { console.error(e); }
}

async function handlePlotClick(index, currentStatus) {
    let endpoint = currentStatus === 'empty' ? "/api/plant" : (currentStatus === 'ready' ? "/api/harvest" : "");
    if (!endpoint) return;

    let payload = { userId, username, plotIndex: index };
    if (currentStatus === 'empty') payload.cropType = currentSelectedCrop;

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
    } catch (e) { console.error(e); }
}

function renderFarm() {
    if (!localUserData) return;
    document.getElementById('username').innerText = localUserData.username;
    document.getElementById('balance').innerText = localUserData.balance;

    const grid = document.getElementById('grid-container');
    grid.innerHTML = '';

    localUserData.plots.forEach((plot, index) => {
        let style = "wood-plot aspect-square";
        let content = "";
        const now = Date.now();

        if (plot.status === 'empty') {
            content = `
                <svg viewBox="0 0 100 100" class="w-14 h-14 opacity-70">
                    <ellipse cx="50" cy="50" rx="30" ry="14" fill="#2d1a0f"/>
                    <path d="M35 48q15-4 30 0" stroke="#1b0e07" stroke-width="3" stroke-linecap="round" fill="none"/>
                </svg>
            `;
        } else if (plot.status === 'growing' && now < plot.readyAt) {
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    <svg viewBox="0 0 100 100" class="w-12 h-12 animate-pulse" xmlns="http://w3.org">
                        <path d="M50 65 Q45 40 52 20" stroke="#22c55e" stroke-width="5" stroke-linecap="round" fill="none"/>
                        <path d="M52 20 C64 15 68 28 52 32 Z" fill="#4ade80" stroke="#16a34a" stroke-width="1"/>
                    </svg>
                    <div class="absolute bottom-1 bg-amber-950/90 text-yellow-400 border border-amber-800 text-[8px] px-1.5 py-0.5 rounded-full font-mono">
                        ${secondsLeft}s
                    </div>
                </div>
            `;
        } else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "wood-plot aspect-square bg-emerald-800/20 border-emerald-500 animate-bounce";
            plot.status = 'ready';
            let icon = plot.cropType === 'wheat' ? '🌾' : '🥕';
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    <span class="text-3xl drop-shadow">${icon}</span>
                    <span class="absolute bottom-1 bg-yellow-400 border border-amber-900 text-amber-950 text-[7px] px-1.5 py-0.5 rounded-full uppercase scale-90 whitespace-nowrap">CLAIM</span>
                </div>
            `;
        }

        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="${style}">
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
