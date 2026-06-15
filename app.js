// ====================================================================
// EXACT SCRIPT PROVIDED BY USER (Mark Egli's Mersenne Twister)
// ====================================================================
var MersenneTwister = function(seed, is02) {
    if (seed == undefined) seed = new Date().getTime();
    this.N = 624;
    this.M = 397;
    this.MATRIX_A = 0x9908b0df;   
    this.UPPER_MASK = 0x80000000; 
    this.LOWER_MASK = 0x7fffffff; 
    
    this.mt = new Array(this.N); 
    this.mti=this.N+1; 

    if (!!is02) {
        this.init_new_genrand(seed);
    } else {
        this.init_old_genrand(seed);
    }
}
 
MersenneTwister.prototype.init_old_genrand = function(s) {
    this.mt[0] = s & 0xffffffff;
    for (this.mti=1; this.mti<this.N; this.mti++)
        this.mt[this.mti] = (69069 * this.mt[this.mti-1]) & 0xffffffff;
}
 
MersenneTwister.prototype.init_new_genrand = function(s) {
    this.mt[0] = s >>> 0;
    for (this.mti=1; this.mti<this.N; this.mti++) {
        var s_prev = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
        this.mt[this.mti] = (((((s_prev & 0xffff0000) >>> 16) * 1812433253) << 16) + (s_prev & 0x0000ffff) * 1812433253) + this.mti;
        this.mt[this.mti] >>>= 0;
    }
}
 
MersenneTwister.prototype.genrand_int32 = function() {
    var y;
    var mag01 = new Array(0x0, this.MATRIX_A);

    if (this.mti >= this.N) { 
        var kk;
        if (this.mti == this.N+1)   
            this.init_new_genrand(5489); 

        for (kk=0;kk<this.N-this.M;kk++) {
            y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
            this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        for (;kk<this.N-1;kk++) {
            y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
            this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
        this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

        this.mti = 0;
    }

    y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
}

// ====================================================================
// FFXII TRUE MAGICK HEALING FORMULA
// ====================================================================
function calculateHeal(rngValue, level, magick, spellPower, hasSerenity) {
    let modBase = spellPower * 12.5; 
    let variance = (rngValue % modBase) / 100.0; 
    let baseHeal = spellPower + variance; 
    
    let statScaling = ((level + magick) * magick / 256.0) + 2.0; 
    let finalHeal = baseHeal * statScaling;
    
    if (hasSerenity) finalHeal *= 1.5;

    let percent = (rngValue % 100);
    return { hp: Math.floor(finalHeal), percent: percent };
}

// ====================================================================
// STATE & VIRTUAL SCROLL LOGIC
// ====================================================================
let generatedData = [];
let highlightedIndex = 0; 
let sequenceStartIndex = -1; // Tracks the start of the sequence for green trail
let lastBaseIndex = -1;
let currentMode = 'chest'; 
let searchSequence = [];

const ITEM_HEIGHT = 32; // Taller for better readability 
const scroller = document.getElementById('scroller');
const spacer = document.getElementById('spacer');
const virtualList = document.getElementById('virtualList');

scroller.addEventListener('scroll', () => {
    requestAnimationFrame(updateVirtualScroll);
});

// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const iconOpen = document.getElementById('sidebarIconOpen');
    const iconClose = document.getElementById('sidebarIconClose');
    
    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        iconOpen.classList.remove('hidden'); iconOpen.classList.add('block');
        iconClose.classList.remove('block'); iconClose.classList.add('hidden');
    } else {
        sidebar.classList.add('hidden');
        iconOpen.classList.remove('block'); iconOpen.classList.add('hidden');
        iconClose.classList.remove('hidden'); iconClose.classList.add('block');
    }
}

function setMode(mode) {
    currentMode = mode;
    // Update Tab Buttons
    ['chest', 'steal', 'spawn', 'seitengrate'].forEach(m => {
        document.getElementById(`tabBtn-${m}`).classList.remove('active-tab');
        
        let leftPanel = document.getElementById(`left-panel-${m}`);
        if (leftPanel) { leftPanel.classList.add('hidden'); leftPanel.classList.remove('block'); }
        
        let topAdv = document.getElementById(`top-adv-${m}`);
        if (topAdv) { topAdv.classList.add('hidden'); topAdv.classList.remove('flex'); }
    });
    
    document.getElementById(`tabBtn-${mode}`).classList.add('active-tab');
    
    let activeLeft = document.getElementById(`left-panel-${mode}`);
    if (activeLeft) { activeLeft.classList.add('block'); activeLeft.classList.remove('hidden'); }
    
    let activeTop = document.getElementById(`top-adv-${mode}`);
    if (activeTop) { activeTop.classList.add('flex'); activeTop.classList.remove('hidden'); }

    // Update Table Headers
    let headerHtml = `<div class="px-2 md:px-4 py-2 cell-border text-slate-600 bg-slate-100">Row</div>
                      <div class="px-2 md:px-4 py-2 cell-border text-slate-600 bg-slate-100">Heal</div>`;
    let headerGridClass = "grid-cols-3";
    
    if (mode === 'chest') {
        headerHtml += `<div class="px-2 md:px-4 py-2 cell-border text-slate-500 bg-slate-50">%</div>
                       <div class="px-2 md:px-4 py-2 text-blue-700 bg-blue-50">Contents</div>`;
        headerGridClass = "grid-cols-4";
    } else if (mode === 'steal') {
        headerHtml += `<div class="px-2 md:px-4 py-2 cell-border text-slate-500 bg-slate-50">%</div>
                       <div class="px-2 md:px-4 py-2 cell-border text-indigo-700 bg-indigo-50">Normal</div>
                       <div class="px-2 md:px-4 py-2 text-purple-700 bg-purple-50">Thief's Cuffs</div>`;
        headerGridClass = "grid-cols-5";
    } else if (mode === 'spawn') {
        headerHtml += `<div class="px-2 md:px-4 py-2 text-red-600 bg-red-50 border-b border-red-200">Spawn?</div>`;
        headerGridClass = "grid-cols-3";
    } else if (mode === 'seitengrate') {
        headerHtml += `<div class="px-2 md:px-4 py-2 text-blue-700 bg-blue-50 border-b border-blue-200">Countdown</div>`;
        headerGridClass = "grid-cols-3";
    }
    
    let tableHeaders = document.getElementById('tableHeaders');
    tableHeaders.className = `grid ${headerGridClass} table-header sticky top-0 z-10 shadow-sm whitespace-nowrap`;
    tableHeaders.innerHTML = headerHtml;

    updateVirtualScroll();
    updateAdvances();
}

function updateVirtualScroll() {
    if (!generatedData.length) return;
    
    const scrollTop = scroller.scrollTop;
    const containerHeight = scroller.clientHeight;
    
    const offset = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT));
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + 2;
    
    const baseIndex = (sequenceStartIndex !== -1) ? Math.max(sequenceStartIndex, highlightedIndex - 5) : highlightedIndex;
    const remainingRows = generatedData.length - baseIndex;
    let maxRowsToShow = Math.min(500, remainingRows);
    if (currentMode === 'seitengrate') {
        if (sequenceStartIndex !== -1) {
            maxRowsToShow = Math.max(0, 544 - baseIndex);
        }
    }
    
    const startIndex = baseIndex + offset;
    const endIndex = Math.min(baseIndex + maxRowsToShow, startIndex + visibleCount); 
    
    virtualList.style.transform = `translateY(${offset * ITEM_HEIGHT}px)`;
    
    const gilChance  = parseInt(document.getElementById('gilChance').value)  || 0;
    const appChance  = parseInt(document.getElementById('appChance').value)   || 0;
    const rngPos     = parseInt(document.getElementById('rngPos').value)       || 1;
    const hasArmlet  = document.getElementById('diamondArmlet').checked;
    const item1Chance = hasArmlet ? 95 : 50;
    const gilAmt     = parseInt(document.getElementById('gilAmt').value)       || 1;

    let html = '';
    for (let i = startIndex; i < endIndex; i++) {
        let d = generatedData[i];
        let isHighlight = (i === highlightedIndex);
        let isSequenceTrail = (sequenceStartIndex !== -1 && i >= baseIndex && i < highlightedIndex);
        
        let isGoldRow = false;
        if (currentMode === 'steal') {
            const targetIdx = i + 1;
            if (targetIdx < generatedData.length) {
                const isNormalRare = generatedData[targetIdx].percent < 3;
                const isCuffsRare = generatedData[targetIdx].percent < 6;
                isGoldRow = isNormalRare || isCuffsRare;
            }
        }
        else if (currentMode === 'spawn') {
            const targetIdx = i + 1;
            if (targetIdx < generatedData.length) {
                isGoldRow = generatedData[targetIdx].raw < 16777216;
            }
        }
        else if (currentMode === 'seitengrate') {
            isGoldRow = (i === 543);
        }

        let rowClass = '';
        if (isHighlight) rowClass = 'highlight';
        else if (isGoldRow) rowClass = 'gold-row';
        else if (isSequenceTrail) rowClass = 'sequence-trail';
        
        let contentHtml = '';

        if (currentMode === 'chest') {
            // Spawn check → background only (Advance to Appear counter).
            // Table shows contents for EVERY row, no "No Spawn" label.
            //
            // Chest RNG sequence relative to row i:
            //   gilIdx     = i + 1  → Gil/Item check  (% < gilChance = Gil)
            //   contentIdx = i + 2  → Content          (Gil amt | Item A/B)
            const gilIdx     = i + 1;
            const contentIdx = i + 2;

            let contentsHtml = '<span class="text-slate-300">—</span>';

            if (contentIdx < generatedData.length) {
                const isGil = generatedData[gilIdx].percent < gilChance;

                if (isGil) {
                    const gilAmount = (generatedData[contentIdx].raw % gilAmt) + 1;
                    contentsHtml = `<span class="text-amber-600 font-bold">${gilAmount} Gil</span>`;
                } else {
                    const isItemA = generatedData[contentIdx].percent < item1Chance;
                    if (isItemA) {
                        contentsHtml = `<span class="text-emerald-600 font-bold bg-emerald-50/50 px-1.5 py-0.5 rounded">Item A</span>`;
                    } else {
                        contentsHtml = hasArmlet
                            ? `<span class="text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">⭐ Item B (Rare)</span>`
                            : `<span class="text-sky-600 font-bold bg-sky-50/50 px-1.5 py-0.5 rounded">Item B</span>`;
                    }
                }
            }
            contentHtml = `<div class="px-2 md:px-3 whitespace-nowrap">${contentsHtml}</div>`;
        } 
        else if (currentMode === 'steal') {
            let normal = "None";
            let cuffs = "None";
            let nColor = "text-slate-400";
            let cColor = "text-slate-400";

            if (i + 3 < generatedData.length) {
                let p1 = generatedData[i+1].percent;
                let p2 = generatedData[i+2].percent;
                let p3 = generatedData[i+3].percent;
                
                // Normal Steal
                if (p1 < 3) { normal = "Rare"; nColor = "text-amber-600 font-bold bg-amber-50/50 px-1 py-0.5 rounded"; }
                else if (p2 < 10) { normal = "Uncommon"; nColor = "text-emerald-600 font-bold bg-emerald-50/50 px-1 py-0.5 rounded"; }
                else if (p3 < 55) { normal = "Common"; nColor = "text-slate-600 font-semibold"; }
                
                // Thief's Cuffs Steal
                let cList = [];
                if (p1 < 6) cList.push("<span class='text-amber-600 font-bold bg-amber-50/50 px-1 py-0.5 rounded'>Rare</span>");
                if (p2 < 30) cList.push("<span class='text-emerald-600 font-bold bg-emerald-50/50 px-1 py-0.5 rounded'>Uncommon</span>");
                if (p3 < 80) cList.push("<span class='text-slate-600 font-semibold'>Common</span>");
                
                if (cList.length > 0) {
                    cuffs = cList.join(' <span class="text-slate-300 font-bold">+</span> ');
                    cColor = ""; 
                }
            }
            contentHtml = `<div class="px-2 md:px-4 cell-border whitespace-nowrap"><span class="${nColor}">${normal}</span></div><div class="px-2 md:px-4 whitespace-nowrap ${cColor}">${cuffs}</div>`;
        }
        else if (currentMode === 'spawn') {
            let Ys = i + 1;
            while (Ys < generatedData.length) {
                if (generatedData[Ys].raw < 16777216) break;
                Ys++;
            }
            let countdown = Ys - i - 1;
            let text = countdown.toString();
            let chocoClass = 'text-slate-400 font-mono';
            if (countdown === 0) {
                chocoClass = isHighlight ? 'text-blue-800 font-bold' : 'text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded border border-red-200';
            }
            contentHtml = `<div class="px-2 md:px-4"><span class="${chocoClass}">${text}</span></div>`;
        }
        else if (currentMode === 'seitengrate') {
            let countdown = 543 - i;
            let text = countdown >= 0 ? countdown.toString() : "-";
            let countClass = 'font-mono';
            if (countdown === 0) {
                countClass = isHighlight ? 'text-blue-800 font-bold' : 'text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200';
            } else if (countdown < 0) {
                countClass = 'text-slate-300';
            } else {
                countClass = 'text-slate-600';
            }
            contentHtml = `<div class="px-2 md:px-4"><span class="${countClass}">${text}</span></div>`;
        }

        // chest=4cols (Row,Heal,%,Contents), steal=5cols, spawn=3cols, seitengrate=3cols
        let gridClass = currentMode === 'chest' ? 'grid-cols-4' : 
                        (currentMode === 'spawn' || currentMode === 'seitengrate') ? 'grid-cols-3' : 'grid-cols-5';
        
        let textColor = 'text-slate-800 text-[13px] md:text-base';
        if (isHighlight) textColor = 'text-blue-800 text-sm md:text-lg';
        else if (isGoldRow) textColor = 'text-amber-900 text-sm md:text-lg';
        else if (isSequenceTrail) textColor = 'text-green-800 text-sm md:text-lg';

        // % cell only for chest and steal
        const percentCell = (currentMode !== 'spawn' && currentMode !== 'seitengrate')
            ? `<div class="px-2 md:px-3 cell-border font-mono text-slate-400 text-xs">${d.percent}</div>`
            : '';

        html += `<div class="grid ${gridClass} grid-row cursor-pointer ${rowClass} items-center" style="height: ${ITEM_HEIGHT}px;" onclick="setHighlight(${i}, true)">
            <div class="px-2 md:px-4 cell-border font-mono text-slate-400">${i + 1}</div>
            <div class="px-2 md:px-4 cell-border font-mono font-bold ${textColor}">${d.hp}</div>
            ${percentCell}
            ${contentHtml}
        </div>`;
    }
    virtualList.innerHTML = html;
}

// ====================================================================
// CORE ENGINE & SEARCH
// ====================================================================
function generateList() {
    const level = parseInt(document.getElementById('levelInput').value) || 1;
    const magick = parseInt(document.getElementById('magickInput').value) || 1;
    const spellPower = parseInt(document.getElementById('spellSelect').value);
    const hasSerenity = document.getElementById('serenityCheck').checked;
    const version = document.getElementById('versionSelect').value;
    const is02 = (version === 'tza');
    
    const rng = new MersenneTwister(4537, is02);
    rng.genrand_int32(); // Discard the first generated RNG value to align rows with standard helpers
    
    const maxRows = 100000;
    generatedData = [];

    for (let i = 0; i < maxRows; i++) {
        let val = rng.genrand_int32();
        let hpData = calculateHeal(val, level, magick, spellPower, hasSerenity);
        generatedData.push({ raw: val, hp: hpData.hp, percent: hpData.percent });
    }

    spacer.style.height = `${maxRows * ITEM_HEIGHT}px`;
    clearSearch(); 
}

function setHighlight(idx, isManualClick = false) {
    highlightedIndex = idx;
    
    if (isManualClick) {
        if (sequenceStartIndex !== -1) {
            searchSequence = [];
            const start = sequenceStartIndex;
            const end = idx;
            if (end >= start) {
                for (let k = start; k <= end; k++) {
                    searchSequence.push(generatedData[k].hp);
                }
                document.getElementById('sequenceDisplay').innerHTML = "Seq: <span class='text-blue-600'>" + searchSequence.join("</span>→<span class='text-blue-600'>") + "</span>";
                if (idx + 1 < generatedData.length) {
                    document.getElementById('healInput').value = generatedData[idx + 1].hp;
                }
            } else {
                searchSequence = [];
                sequenceStartIndex = -1;
                document.getElementById('sequenceDisplay').innerText = "Seq: (None)";
                document.getElementById('healInput').value = "";
            }
        }
    }

    const baseIndex = (sequenceStartIndex !== -1) ? Math.max(sequenceStartIndex, highlightedIndex - 5) : highlightedIndex;
    
    // Set scroll container height to show exactly 500 rows from the base index
    const remainingRows = generatedData.length - baseIndex;
    const scrollRows = Math.min(500, remainingRows);
    spacer.style.height = `${scrollRows * ITEM_HEIGHT}px`;
    
    // Only reset scroll to top if the base index has changed
    if (baseIndex !== lastBaseIndex) {
        scroller.scrollTop = 0;
        lastBaseIndex = baseIndex;
    }
    
    updateVirtualScroll();
    updateAdvances();
}

function setStatus(text, colorClass) {
    const box = document.getElementById('statusBox');
    box.innerText = text;
    box.className = `text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase shrink-0 ${colorClass}`;
}

function searchHeal(isContinue) {
    let target = parseInt(document.getElementById('healInput').value);
    if (isNaN(target)) return;

    if (!isContinue) {
        searchSequence = [target];
    } else {
        searchSequence.push(target);
    }
    
    document.getElementById('sequenceDisplay').innerHTML = "Seq: <span class='text-blue-600'>" + searchSequence.join("</span>→<span class='text-blue-600'>") + "</span>";
    
    let found = -1;
    let seqLen = searchSequence.length;
    
    // Search for the sequence
    for (let i = 0; i <= generatedData.length - seqLen; i++) {
        let match = true;
        for (let j = 0; j < seqLen; j++) {
            if (generatedData[i + j].hp !== searchSequence[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            found = i;
            break;
        }
    }

    if (found !== -1) {
        // Highlight trail in green, current position in blue
        sequenceStartIndex = found;
        let targetIndex = found + seqLen - 1;
        setHighlight(targetIndex);
        setStatus("MATCH FOUND", "text-sky-700 bg-sky-100 border-sky-300");
        
        if (seqLen >= 2 && targetIndex + 1 < generatedData.length) {
            let nextCure = generatedData[targetIndex + 1].hp;
            document.getElementById('healInput').value = nextCure;
        } else {
            document.getElementById('healInput').value = ""; // clear for next input
        }
    } else {
        setStatus("NOT FOUND", "text-red-700 bg-red-100 border-red-300");
        searchSequence.pop(); // Remove the bad input
        if (searchSequence.length === 0) {
            document.getElementById('sequenceDisplay').innerText = "Seq: (None)";
            sequenceStartIndex = -1;
        } else {
            document.getElementById('sequenceDisplay').innerHTML = "Seq: <span class='text-blue-600'>" + searchSequence.join("</span>→<span class='text-blue-600'>") + "</span> <span class='text-red-500 font-normal'>(Last input failed)</span>";
        }
    }
}

function consumeRNG() {
    let amount = parseInt(document.getElementById('consumeInput').value) || 10;
    if (amount <= 0) return;
    if (highlightedIndex + amount < generatedData.length) {
        if (sequenceStartIndex === -1) {
            sequenceStartIndex = highlightedIndex;
            searchSequence.push(generatedData[highlightedIndex].hp);
        }
        
        for (let k = 1; k <= amount; k++) {
            searchSequence.push(generatedData[highlightedIndex + k].hp);
        }
        
        document.getElementById('sequenceDisplay').innerHTML = "Seq: <span class='text-blue-600'>" + searchSequence.join("</span>→<span class='text-blue-600'>") + "</span>";
        
        setHighlight(highlightedIndex + amount);
        setStatus(`ADV ${amount}`, "text-emerald-700 bg-emerald-100 border-emerald-300");
        
        if (highlightedIndex + 1 < generatedData.length) {
            let nextCure = generatedData[highlightedIndex + 1].hp;
            document.getElementById('healInput').value = nextCure;
        }
    }
}

function clearSearch() {
    searchSequence = [];
    sequenceStartIndex = -1;
    lastBaseIndex = -1;
    document.getElementById('sequenceDisplay').innerText = "Seq: (None)";
    document.getElementById('healInput').value = "";
    setHighlight(0);
    setStatus("RESET", "text-slate-500 bg-slate-50 border-slate-300");
}

function updateAdvances() {
    if (generatedData.length === 0) return;
    let P = highlightedIndex;

    if (currentMode === 'chest') {
        const appChance  = parseInt(document.getElementById('appChance').value)  || 0;
        const rngPos     = parseInt(document.getElementById('rngPos').value)      || 1;
        const gilChance  = parseInt(document.getElementById('gilChance').value)   || 0;
        const hasArmlet  = document.getElementById('diamondArmlet').checked;
        const item1Chance = hasArmlet ? 95 : 50;
        const wantItem1  = document.getElementById('wantItem1').checked;

        // --- Advance to Appear (Zoning-in required to spawn the chest) ---
        // Find smallest spawnIdx >= P + rngPos where spawn check passes
        let spawnIdx = P + rngPos;
        let foundAppear = false;
        while (spawnIdx < generatedData.length) {
            if (generatedData[spawnIdx].percent < appChance) {
                foundAppear = true;
                break;
            }
            spawnIdx++;
        }
        document.getElementById('advAppear').innerText = foundAppear ? spawnIdx - P - rngPos : "-";

        // --- Advance for Item (Loot from ALREADY spawned chest) ---
        // Find smallest W >= P + 1 where:
        //   1. Gil/Item check = Item (NOT Gil, at W)
        //   2. Item selection = desired item (Item 1 or Item 2, at W + 1)
        let advItem = "-";
        for (let W = P + 1; W < generatedData.length; W++) {
            const gilIdx     = W;          // gil vs item check
            const contentIdx = W + 1;      // item selection / gil amount

            if (contentIdx >= generatedData.length) break;

            // 1. Must be Item (not Gil)
            if (generatedData[gilIdx].percent < gilChance) continue;

            // 2. Check which item
            const isItem1 = generatedData[contentIdx].percent < item1Chance;
            if (wantItem1 && isItem1)  { advItem = W - P - 1; break; }
            if (!wantItem1 && !isItem1) { advItem = W - P - 1; break; }
        }
        document.getElementById('advItem').innerText = advItem;
    } 
    else if (currentMode === 'steal') {
        // Normal
        let Yn = P + 1;
        let foundNormal = false;
        while (Yn < generatedData.length) {
            if (generatedData[Yn].percent < 3) {
                foundNormal = true;
                break;
            }
            Yn++;
        }
        document.getElementById('advRareNormal').innerText = foundNormal ? Yn - P - 1 : "-";

        // Cuffs
        let Yc = P + 1;
        let foundCuffs = false;
        while (Yc < generatedData.length) {
            if (generatedData[Yc].percent < 6) {
                foundCuffs = true;
                break;
            }
            Yc++;
        }
        document.getElementById('advRareCuffs').innerText = foundCuffs ? Yc - P - 1 : "-";
    }
    else if (currentMode === 'spawn') {
        let Ys = P + 1;
        let foundSpawn = false;
        while (Ys < generatedData.length) {
            if (generatedData[Ys].raw < 16777216) {
                foundSpawn = true;
                break;
            }
            Ys++;
        }
        document.getElementById('advSpawn').innerText = foundSpawn ? (Ys - P - 1) : "-";
    }
    else if (currentMode === 'seitengrate') {
        if (sequenceStartIndex !== -1) {
            let steps = 543 - P;
            document.getElementById('advSeitengrate').innerText = steps >= 0 ? steps : "-";
        } else {
            document.getElementById('advSeitengrate').innerText = "-";
        }
    }
}

// Initialize
window.onload = () => {
    setMode('chest'); 
    generateList();
};
