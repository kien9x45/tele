const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const userId = String(tg?.initDataUnsafe?.user?.id || "12345"); 
const username = tg?.initDataUnsafe?.user?.first_name || "Nông dân Mates";
const SERVER_URL = window.location.origin; 

let currentSelectedCrop = 'wheat';
let localUserData = null;

function selectCrop(type) {
    currentSelectedCrop = type;
    const btnWheat = document.getElementById('btn-wheat');
    const btnCarrot = document.getElementById('btn-carrot');
    
    if (type === 'wheat') {
        btnWheat.className = "flex-1 py-3 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 font-black text-xs flex flex-col items-center justify-center pixel-btn border-amber-700";
        btnCarrot.className = "flex-1 py-3 rounded-lg bg-[#3a2212] text-amber-500 font-black text-xs flex flex-col items-center justify-center pixel-btn border-[#1a0e06]";
    } else {
        btnWheat.className = "flex-1 py-3 rounded-lg bg-[#3a2212] text-amber-500 font-black text-xs flex flex-col items-center justify-center pixel-btn border-[#1a0e06]";
        btnCarrot.className = "flex-1 py-3 rounded-lg bg-gradient-to-b from-orange-400 to-orange-600 text-orange-950 font-black text-xs flex flex-col items-center justify-center pixel-btn border-orange-700";
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
    } catch (e) { console.error("Lỗi đồng bộ máy chủ", e); }
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
        if (resData.error) return alert("Lỗi: " + resData.error);
        
        localUserData = resData.user;
        renderFarm();
        if (tg) tg.HapticFeedback.impactOccurred('medium');
    } catch (e) { console.error("Lỗi truyền tin nhấp chuột", e); }
}

function renderFarm() {
    if (!localUserData) return;

    document.getElementById('username').innerText = localUserData.username;
    document.getElementById('balance').innerText = localUserData.balance;

    const grid = document.getElementById('grid-container');
    grid.innerHTML = '';

    localUserData.plots.forEach((plot, index) => {
        let style = "pixel-plot";
        let content = "";
        const now = Date.now();

        if (plot.status === 'empty') {
            content = `
                <svg viewBox="0 0 32 32" class="w-10 h-10" style="image-rendering: pixelated;">
                    <rect x="4" y="8" width="24" height="16" fill="#3d2314"/>
                    <rect x="6" y="10" width="20" height="12" fill="#472917"/>
                    <rect x="8" y="12" width="4" height="2" fill="#2b180a"/>
                    <rect x="18" y="16" width="6" height="2" fill="#2b180a"/>
                </svg>
            `;
        } 
        else if (plot.status === 'growing' && now < plot.readyAt) {
            const secondsLeft = Math.ceil((plot.readyAt - now) / 1000);
            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative p-1">
                    <svg viewBox="0 0 32 32" class="w-9 h-9 animate-pulse" style="image-rendering: pixelated;">
                        <rect x="15" y="16" width="2" height="10" fill="#4caf50"/>
                        <rect x="12" y="14" width="4" height="3" fill="#8bc34a"/>
                        <rect x="16" y="12" width="5" height="3" fill="#8bc34a"/>
                    </svg>
                    <div class="absolute bottom-1 bg-[#1a0e06] border border-[#3a2212] text-green-400 font-mono text-[7px] px-1 py-0.5 rounded scale-90 whitespace-nowrap">
                        ${secondsLeft}s
                    </div>
                </div>
            `;
        } 
        else if (plot.status === 'ready' || (plot.status === 'growing' && now >= plot.readyAt)) {
            style = "pixel-plot bg-emerald-950/30 border-emerald-500 animate-pulse";
            plot.status = 'ready'; 

            let graphicSvg = "";
            if (plot.cropType === 'wheat') {
                graphicSvg = `
                    <svg viewBox="0 0 32 32" class="w-10 h-10" style="image-rendering: pixelated;">
                        <path d="M16 26V8M13 13l3-3 3 3M13 18l3-3 3 3M13 23l3-3 3 3" stroke="#fcd34d" stroke-width="2" stroke-linecap="square"/>
                        <circle cx="16" cy="5" r="1.5" fill="#fbbf24"/>
                    </svg>
                `;
            } else {
                graphicSvg = `
                    <svg viewBox="0 0 32 32" class="w-10 h-10" style="image-rendering: pixelated;">
                        <rect x="14" y="6" width="4" height="4" fill="#22c55e"/>
                        <path d="M12 10h8l-2 14h-4z" fill="#ea580c"/>
                        <rect x="13" y="14" width="6" height="1.5" fill="#b45309"/>
                    </svg>
                `;
            }

            content = `
                <div class="w-full h-full flex flex-col items-center justify-center relative">
                    ${graphicSvg}
                    <span class="absolute bottom-0.5 bg-[#22c55e] border border-[#14532d] text-white text-[7px] font-black px-1 rounded uppercase tracking-wide scale-90">TAKE</span>
                </div>
            `;
        }

        // Bổ sung thuộc tính ép cứng tỷ lệ ô đất vuông vức (aspect-square)
        grid.insertAdjacentHTML('beforeend', `
            <button onclick="handlePlotClick(${index}, '${plot.status}')" class="${style} aspect-square flex items-center justify-center overflow-hidden rounded-xl">
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

