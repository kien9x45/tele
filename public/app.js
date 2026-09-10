const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = tg?.initDataUnsafe?.user?.id || 12345; 
const username = tg?.initDataUnsafe?.user?.first_name || "Nông dân Pro";

const SERVER_URL = ""; 

let currentSelectedCrop = 'wheat';
let localUserData = null;

function selectCrop(type) {
    currentSelectedCrop = type;
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    
    if (type === 'wheat') {
        btnWheat.className = "flex-1 py-3 rounded-2xl border-b-4 border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 font-black text-xs flex flex-col items-center gap-1 shadow-md";
        btnCarrot.className = "flex-1 py-3 rounded-2xl border-b-4 border-transparent bg-slate-200 text-slate-700 font-black text-xs flex flex-col items-center gap-1 shadow-inner";
    } else {
        btnWheat.className = "flex-1 py-3 rounded-2xl border-b-4 border-transparent bg-slate-200 text-slate-700 font-black text-xs flex flex-col items-center gap-1 shadow-inner";
        btnCarrot.className = "flex-1 py-3 rounded-2xl border-b-4 border-orange-600 bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950 font-black text-xs flex flex-col items-center gap-1 shadow-md";
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
    } catch (e) { console.error("Lỗi đồng bộ Server", e); }
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
        if (tg) tg.HapticFeedback.impactOccurred('medium');
    } catch (e) { console.error("Lỗi gửi gói tin", e); }
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

        // 1. ĐẤT TRỐNG 3D (Đất xới nổi 3D có bóng đổ)
        if (plot.status === 'empty') {
            style = "bg-gradient-to-b from-amber-800 to-amber-950 border-b-8 border-amber-950 shadow-2xl flex items-center justify-center p-2 rounded-2xl transform hover:scale-105 duration-200 active:translate-y-1 active:border-b-2";
            content = `
                <svg viewBox="0 0 100 100" class="w-20 h-20 drop-shadow-[0_6px_6px_rgba(0,0,0,0.4)]">
                    <defs>
                        <radialGradient id="soilMud" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#A0522D"/>
                            <stop offset="100%" stop-color="#5C3317"/>
                        </radialGradient>
                    </defs>
                    <ellipse cx="50" cy="65" rx="38" ry="20" fill="url(#soilMud)" />
                    <ellipse cx="50" cy="53" rx="30" ry="14" fill="#8B4513" />
                    <path d="M30 55c5-3 12-4 20-1s15 3 22-1" stroke="#3D1F08" stroke-width="3" stroke-linecap="round" fill="none"/>
                </svg>
            `;
        } 
        // 2. MẦM CÂY 3D ĐANG LỚN (Mầm lập thể phát sáng xanh + Đồng hồ)
        else if (plot.status === 'growing' && now < plot.readyAt) {
            style = "bg-gradient-to-b from-amber-700 to-amber-900 border-b-8 border-amber-950 relative flex flex-col items-center justify-center p-2 rounded-2xl";
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <svg viewBox="0 0 100 100" class="w-16 h-16 animate-pulse drop-shadow-[0_6px_4px_rgba(0,0,0,0.5)]">
                    <ellipse cx="50" cy="70" rx="25" ry="10" fill="#5C3317" />
                    <!-- Thân mầm 3D -->
                    <path d="M50 70 Q45 45 52 25" stroke="#4CAF50" stroke-width="5" stroke-linecap="round" fill="none"/>
                    <!-- Lá 3D khối -->
                    <path d="M52 25 C65 20 70 35 52 38 Z" fill="#8BC34A" stroke="#4CAF50" stroke-width="1"/>
                    <path d="M48 38 C30 35 35 50 49 46 Z" fill="#7CB342" stroke="#388E3C" stroke-width="1"/>
                </svg>
                <div class="absolute bottom-2 bg-black/75 text-yellow-300 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full border border-yellow-400 shadow-md">
                    ${secondsLeft}s
                </div>
            `;
        } 
        // 3. NÔNG SẢN 3D CHÍN (Bóng đổ lập thể đổ màu gradient cực đỉnh + Bounce nhảy khối)
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "bg-gradient-to-b from-emerald-400 to-teal-600 border-b-8 border-teal-800 shadow-2xl flex flex-col items-center justify-center relative p-1 rounded-2xl active:translate-y-1 active:border-b-2 duration-150 animate-bounce";
            plot.status = 'ready'; 

            let graphicSvg = "";
            if (plot.cropType === 'wheat') {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" class="w-20 h-20 drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]">
                        <defs>
                            <linearGradient id="wheatGold" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#FFF3A1"/>
                                <stop offset="50%" stop-color="#FFD700"/>
                                <stop offset="100%" stop-color="#CC9900"/>
                            </linearGradient>
                        </defs>
                        <path d="M40 80 Q50 50 48 15M60 80 Q50 52 52 15" stroke="#8B7355" stroke-width="4" stroke-linecap="round"/>
                        <!-- Hạt lúa xếp chồng 3D -->
                        <path d="M48 15C42 10 40 2 48 5C56 2 54 10 48 15Z" fill="url(#wheatGold)"/>
                        <path d="M38 30C30 25 32 15 42 20C46 25 44 32 38 30Z" fill="url(#wheatGold)"/>
                        <path d="M58 30C66 25 64 15 54 20C50 25 52 32 58 30Z" fill="url(#wheatGold)"/>
                        <path d="M36 48C28 43 30 33 40 38C44 43 42 50 36 48Z" fill="url(#wheatGold)"/>
                        <path d="M60 48C68 43 66 33 56 38C52 43 54 50 60 48Z" fill="url(#wheatGold)"/>
                    </svg>
                `;
            } else {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" class="w-20 h-20 drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]">
                        <defs>
                            <linearGradient id="carrotOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#FFB74D"/>
                                <stop offset="40%" stop-color="#FF9800"/>
                                <stop offset="100%" stop-color="#E65100"/>
                            </linearGradient>
                        </defs>
                        <!-- Lá xanh chùm tươi -->
                        <path d="M50 30 C40 10 60 5 50 30 Z M50 30 C30 15 35 0 50 30 Z M50 30 C70 15 65 0 50 30 Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="1"/>
                        <!-- Củ cà rốt dày khối 3D -->
                        <path d="M32 30 C32 24 68 24 68 30 C68 42 55 75 50 85 C45 75 32 42 32 30 Z" fill="url(#carrotOrange)"/>
                        <!-- Ngấn củ nổi rõ -->
                        <path d="M38 42 Q50 45 58 40 M36 54 Q50 58 60 52 M42 68 Q50 70 54 67" stroke="#BF360C" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            }

            content = `
                <div class="flex flex-col items-center gap-0.5 w-full h-full justify-center">
                    ${graphicSvg}
                    <span class="text-[9px] bg-yellow-400 text-amber-950 font-black px-2 py-0.5 rounded-full border border-white shadow uppercase tracking-wide scale-95 drop-shadow-sm">THU HOẠCH</span>
                </div>
            `;
        }

        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="aspect-square flex flex-col justify-between items-center transition-all duration-150 plot-container ${style}">
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
