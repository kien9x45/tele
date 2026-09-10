const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = tg?.initDataUnsafe?.user?.id || 12345; 
const username = tg?.initDataUnsafe?.user?.first_name || "Nông dân TON";

const SERVER_URL = ""; 

let currentSelectedCrop = 'wheat';
let localUserData = null;

function selectCrop(type) {
    currentSelectedCrop = type;
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    
    if (type === 'wheat') {
        btnWheat.className = "flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-200 text-amber-950 font-black text-xs flex flex-col items-center justify-center wood-btn";
        btnCarrot.className = "flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-100 text-slate-700 font-black text-xs flex flex-col items-center justify-center shadow-inner";
    } else {
        btnWheat.className = "flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-100 text-slate-700 font-black text-xs flex flex-col items-center justify-center shadow-inner";
        btnCarrot.className = "flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-orange-300 to-orange-500 border border-orange-200 text-orange-950 font-black text-xs flex flex-col items-center justify-center wood-btn";
    }
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
    } catch (e) { console.error("Lỗi đồng bộ dữ liệu Farm TON", e); }
}

async function handlePlotClick(index, currentStatus) {
    let endpoint = "";
    let payload = { userId, plotIndex: index };

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
        if (resData.error) return alert(resData.error);
        
        localUserData = resData.user;
        renderFarm();
        if (tg) tg.HapticFeedback.impactOccurred('heavy');
    } catch (e) { console.error("Lỗi kết nối API", e); }
}

function renderFarm() {
    if (!localUserData) return;

    document.getElementById('username').innerText = localUserData.username;
    document.getElementById('balance').innerText = localUserData.balance;

    const grid = document.getElementById('grid-container');
    grid.innerHTML = '';

    localUserData.plots.forEach((plot, index) => {
        let style = "";
        let content = "";
        const now = Date.now();

        // Cấu hình khối đất lập thể mặt trên (Top Face)
        if (plot.status === 'empty') {
            style = "bg-gradient-to-b from-amber-700 to-amber-900 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] border-t border-amber-600 hover:brightness-110";
            content = `
                <div class="w-full h-full flex items-center justify-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">
                    <svg viewBox="0 0 100 100" xmlns="http://w3.org">
                        <ellipse cx="50" cy="55" rx="36" ry="16" fill="#4e342e" opacity="0.6"/>
                        <ellipse cx="50" cy="48" rx="28" ry="12" fill="#5c3317" />
                        <path d="M30 46q10-4 20 0M42 50q4-2 8 0" stroke="#3e2723" stroke-width="3" stroke-linecap="round" fill="none"/>
                    </svg>
                </div>
            `;
        } 
        else if (plot.status === 'growing' && now < plot.readyAt) {
            style = "bg-gradient-to-b from-amber-700 to-amber-900 border-t border-amber-600";
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    <svg viewBox="0 0 100 100" class="w-14 h-14 animate-pulse drop-shadow-[0_6px_4px_rgba(0,0,0,0.5)]" xmlns="http://w3.org">
                        <ellipse cx="50" cy="65" rx="20" ry="8" fill="#3e2723" />
                        <path d="M50 65 Q45 42 52 22" stroke="#22c55e" stroke-width="5" stroke-linecap="round" fill="none"/>
                        <path d="M52 22 C64 16 68 30 52 34 Z" fill="#4ade80" stroke="#16a34a" stroke-width="0.8"/>
                        <path d="M48 34 C32 30 36 44 49 40 Z" fill="#22c55e" stroke="#15803d" stroke-width="0.8"/>
                    </svg>
                    <div class="absolute bottom-2 bg-slate-950/80 text-yellow-300 font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-yellow-400 shadow-md transform translate-z-10">
                        ${secondsLeft}s
                    </div>
                </div>
            `;
        } 
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "bg-gradient-to-b from-emerald-500 to-teal-600 border-t border-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:brightness-110";
            plot.status = 'ready'; 

            let graphicSvg = "";
            if (plot.cropType === 'wheat') {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" class="w-[85%] h-[85%] drop-shadow-[0_10px_6px_rgba(0,0,0,0.45)]" xmlns="http://w3.org">
                        <defs>
                            <linearGradient id="gGold" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#fffbeb"/><stop offset="50%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#b45309"/>
                            </linearGradient>
                        </defs>
                        <path d="M42 75 Q52 46 50 15M56 75 Q46 48 48 15" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
                        <path d="M50 15C42 10 40 2 50 4C60 2 58 10 50 15Z" fill="url(#gGold)"/>
                        <path d="M40 30C32 25 34 14 44 19C48 23 46 32 40 30Z" fill="url(#gGold)"/>
                        <path d="M60 30C68 25 66 14 56 19C52 23 54 32 60 30Z" fill="url(#gGold)"/>
                        <path d="M38 48C30 43 32 32 42 37C46 41 44 50 38 48Z" fill="url(#gGold)"/>
                        <path d="M62 48C70 43 68 32 58 37C54 41 56 50 62 48Z" fill="url(#gGold)"/>
                    </svg>
                `;
            } else {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" class="w-[85%] h-[85%] drop-shadow-[0_10px_6px_rgba(0,0,0,0.45)]" xmlns="http://w3.org">
                        <defs>
                            <linearGradient id="gOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#fed7aa"/><stop offset="40%" stop-color="#f97316"/><stop offset="100%" stop-color="#c2410c"/>
                            </linearGradient>
                        </defs>
                        <path d="M50 30 C38 10 62 4 50 30 Z M50 30 C30 12 36 0 50 30 Z M50 30 C70 12 64 0 50 30 Z" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
                        <path d="M34 30 C34 22 66 22 66 30 C66 45 54 75 50 86 C46 75 34 45 34 30 Z" fill="url(#gOrange)"/>
                        <path d="M40 42 Q50 45 58 41 M38 55 Q50 58 59 52 M43 68 Q50 70 54 67" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                `;
            }

            content = `
                <div class="w-full h-full flex flex-col items-center justify-center animate-bounce">
                    ${graphicSvg}
                    <span class="absolute bottom-1 bg-yellow-400 text-amber-950 font-black px-2 py-0.5 rounded-full border border-white text-[8px] uppercase tracking-wider shadow scale-90 whitespace-nowrap">THU HOẠCH</span>
                </div>
            `;
        }

        // Đóng gói cấu hình nhúng lớp mặt bên (plot-side) tạo chiều dày lập thể chân thực
        grid.insertAdjacentHTML('beforeend', `
            <div class="plot-container relative aspect-square">
                <button onclick="handlePlotClick(${index}, '${plot.status}')" class="plot-3d w-full h-full rounded-2xl flex flex-col justify-center items-center transition-all duration-150 relative overflow-hidden ${style}">
                    ${content}
                    <div class="plot-side"></div>
                </button>
            </div>
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
