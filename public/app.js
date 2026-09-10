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
        btnWheat.className = "flex-1 py-3 rounded-2xl border-b-4 border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 font-black text-xs flex flex-col items-center justify-center shadow-md";
        btnCarrot.className = "flex-1 py-3 rounded-2xl border-b-4 border-transparent bg-slate-200 text-slate-700 font-black text-xs flex flex-col items-center justify-center shadow-inner";
    } else {
        btnWheat.className = "flex-1 py-3 rounded-2xl border-b-4 border-transparent bg-slate-200 text-slate-700 font-black text-xs flex flex-col items-center justify-center shadow-inner";
        btnCarrot.className = "flex-1 py-3 rounded-2xl border-b-4 border-orange-600 bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950 font-black text-xs flex flex-col items-center justify-center shadow-md";
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
    } catch (e) { console.error("Lỗi đồng bộ dữ liệu hệ thống", e); }
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
    } catch (e) { console.error("Lỗi truyền tin tương tác", e); }
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

        // 1. ĐẤT TRỐNG 3D (Đất bùn nổi khối nhẹ, có viền đổ bóng sâu)
        if (plot.status === 'empty') {
            style = "bg-gradient-to-b from-amber-800 to-amber-950 border-b-[6px] border-amber-950 shadow-xl flex items-center justify-center rounded-2xl transform active:translate-y-1 active:border-b-2 transition-all duration-75";
            content = `
                <div class="svg-icon-container drop-shadow-[0_4px_4px_rgba(0,0,0,0.35)]">
                    <svg viewBox="0 0 100 100" xmlns="http://w3.org">
                        <ellipse cx="50" cy="62" rx="35" ry="18" fill="#5C3317" />
                        <ellipse cx="50" cy="54" rx="28" ry="13" fill="#8B4513" />
                        <path d="M34 54c4-2 10-2 16 0M40 58c3-2 9-2 14 0" stroke="#3D1F08" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                    </svg>
                </div>
            `;
        } 
        // 2. MẦM CÂY ĐANG LỚN (Thân lá khối nổi 3D + Đồng hồ đếm ngược được căn giữa)
        else if (plot.status === 'growing' && now < plot.readyAt) {
            style = "bg-gradient-to-b from-amber-700 to-amber-900 border-b-[6px] border-amber-950 relative flex flex-col items-center justify-center rounded-2xl shadow-inner";
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="svg-icon-container drop-shadow-[0_5px_4px_rgba(0,0,0,0.4)] mb-2">
                    <svg viewBox="0 0 100 100" class="animate-pulse" xmlns="http://w3.org">
                        <ellipse cx="50" cy="68" rx="22" ry="9" fill="#5C3317" />
                        <path d="M50 68 Q46 48 51 28" stroke="#4CAF50" stroke-width="4.5" stroke-linecap="round" fill="none"/>
                        <path d="M51 28 C62 23 66 36 51 39 Z" fill="#8BC34A" stroke="#4CAF50" stroke-width="0.8"/>
                        <path d="M49 39 C33 36 37 49 50 45 Z" fill="#7CB342" stroke="#388E3C" stroke-width="0.8"/>
                    </svg>
                </div>
                <div class="absolute bottom-2 bg-black/75 text-yellow-300 font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-yellow-400/50 shadow-sm whitespace-nowrap">
                    ${secondsLeft}s
                </div>
            `;
        } 
        // 3. NÔNG SẢN CHÍN 3D (Đầy đủ khối màu Gradient + Hiệu ứng nảy lặp vô tận)
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "bg-gradient-to-b from-emerald-400 to-teal-600 border-b-[6px] border-teal-900 shadow-2xl flex flex-col items-center justify-center relative rounded-2xl active:translate-y-1 active:border-b-2 transition-all duration-75 animate-bounce";
            plot.status = 'ready'; 

            let graphicSvg = "";
            if (plot.cropType === 'wheat') {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" xmlns="http://w3.org">
                        <defs>
                            <linearGradient id="wGold" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#FFF5B0"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#C59300"/>
                            </linearGradient>
                        </defs>
                        <path d="M44 76 Q52 48 50 18M56 76 Q48 50 50 18" stroke="#8B7355" stroke-width="3.5" stroke-linecap="round"/>
                        <path d="M50 18C44 13 42 6 50 8C58 6 56 13 50 18Z" fill="url(#wGold)"/>
                        <path d="M42 31C35 26 37 17 46 22C50 26 48 33 42 31Z" fill="url(#wGold)"/>
                        <path d="M58 31C65 26 63 17 54 22C50 26 52 33 58 31Z" fill="url(#wGold)"/>
                        <path d="M40 47C33 42 35 33 44 38C48 42 46 49 40 47Z" fill="url(#wGold)"/>
                        <path d="M60 47C67 42 65 33 56 38C52 42 54 49 60 47Z" fill="url(#wGold)"/>
                    </svg>
                `;
            } else {
                graphicSvg = `
                    <svg viewBox="0 0 100 100" xmlns="http://w3.org">
                        <defs>
                            <linearGradient id="cOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#FFA726"/><stop offset="50%" stop-color="#FF9800"/><stop offset="100%" stop-color="#E65100"/>
                            </linearGradient>
                        </defs>
                        <path d="M50 32 C42 14 58 10 50 32 Z M50 32 C33 18 38 5 50 32 Z M50 32 C67 18 62 5 50 32 Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="0.8"/>
                        <path d="M35 32 C35 26 65 26 65 32 C65 43 54 72 50 82 C46 72 35 43 35 32 Z" fill="url(#cOrange)"/>
                        <path d="M40 43 Q50 46 58 41 M39 54 Q50 57 59 52 M43 65 Q50 67 55 64" stroke="#BF360C" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                `;
            }

            content = `
                <div class="svg-icon-container drop-shadow-[0_6px_4px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center w-full h-full">
                    ${graphicSvg}
                    <span class="text-[8px] bg-yellow-400 text-amber-950 font-black px-1.5 py-0.5 rounded-full border border-white shadow-sm uppercase tracking-wide whitespace-nowrap mt-0.5 scale-90">THU HOẠCH</span>
                </div>
            `;
        }

        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="aspect-square flex flex-col justify-center items-center transition-all duration-75 relative overflow-hidden ${style}">
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
