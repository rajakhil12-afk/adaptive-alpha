const fs = require('fs');
const path = require('path');
const readline = require('readline');

const scratchDir = path.join('C:', 'Users', 'compas laptop', '.gemini', 'antigravity', 'scratch');

// Helper for fetching URLs using Node's native fetch (available in modern Node)
async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

function loadTickers(csvPath) {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`File not found: ${csvPath}`);
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const stocks = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 3) {
            const name = parts[0].replace(/^"|"$/g, '').trim();
            const industry = parts[1].replace(/^"|"$/g, '').trim();
            const symbol = parts[parts.length - 3].trim();
            if (symbol && symbol !== 'Symbol') {
                stocks.push({ name, industry, symbol: `${symbol}.NS` });
            }
        }
    }
    return stocks;
}

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHistoricalData(ticker, range = "6y") {
    // Yahoo Finance v8 chart API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
    try {
        const json = await fetchJson(url);
        const result = json.chart?.result?.[0];
        if (!result) return null;
        
        const timestamps = result.timestamp || [];
        const indicators = result.indicators?.quote?.[0] || {};
        const close = indicators.close || [];
        const volume = indicators.volume || [];
        
        // Map to array of candles
        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
            // Filter out days with missing close price or volume
            if (close[i] !== null && close[i] !== undefined) {
                candles.push({
                    time: new Date(timestamps[i] * 1000),
                    timestamp: timestamps[i],
                    close: close[i],
                    volume: volume[i] || 0
                });
            }
        }
        return candles;
    } catch (e) {
        // Return null on failure
        return null;
    }
}

async function runScreener() {
    console.log("=================================================");
    console.log("    NIFTY MULTI-SECTOR ARS SCREENER (v8.1)       ");
    console.log("=================================================");
    
    let choice = '';
    if (process.argv.includes('--nifty50')) {
        choice = '1';
    } else if (process.argv.includes('--nifty100')) {
        choice = '2';
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        choice = await question("Select List to screen:\n1. Nifty 50\n2. Nifty 100\nEnter choice (1 or 2): ");
        rl.close();
    }
    
    const isNifty50 = choice.trim() === '1';
    const csvFileName = isNifty50 ? 'ind_nifty50list.csv' : 'ind_nifty100list.csv';
    const listName = isNifty50 ? 'Nifty 50' : 'Nifty 100';
    const csvPath = path.join(scratchDir, csvFileName);
    
    let stocks = [];
    try {
        stocks = loadTickers(csvPath);
    } catch (e) {
        console.error(`Error loading CSV: ${e.message}`);
        return;
    }
    
    console.log(`\nLoaded ${stocks.length} stocks from ${listName} list.`);
    console.log("Fetching Nifty 50 benchmark index (^NSEI)...");
    
    const benchmarkData = await fetchHistoricalData("^NSEI", "6y");
    if (!benchmarkData || benchmarkData.length === 0) {
        console.error("Failed to load benchmark index data. Exiting.");
        return;
    }
    
    console.log(`Loaded benchmark index. Total days: ${benchmarkData.length}`);
    
    // Find benchmark prices
    const bLen = benchmarkData.length;
    const bToday = benchmarkData[bLen - 1];
    
    // Cutoff: 2021-01-01
    const cutoffTime = new Date("2021-01-01").getTime() / 1000;
    let bStartIndex = 0;
    for (let i = 0; i < bLen; i++) {
        if (benchmarkData[i].timestamp >= cutoffTime) {
            bStartIndex = i;
            break;
        }
    }
    const bStart = benchmarkData[bStartIndex];
    
    // 63-bar lookback for SRS
    const srsLen = 63;
    const b63Index = Math.max(0, bLen - 1 - srsLen);
    const b63 = benchmarkData[b63Index];
    
    console.log(`ARS Start Date: ${bStart.time.toDateString()} (Index close: ${bStart.close.toFixed(2)})`);
    console.log(`SRS Start Date: ${b63.time.toDateString()} (Index close: ${b63.close.toFixed(2)})`);
    console.log(`Today's Date:   ${bToday.time.toDateString()} (Index close: ${bToday.close.toFixed(2)})`);
    
    const results = [];
    let count = 0;
    
    console.log("\nScreening stocks (this may take a minute, running with rate-limiting)...");
    
    // Concurrency / serial execution with delay
    for (const stock of stocks) {
        count++;
        process.stdout.write(`\rProgress: [${count}/${stocks.length}] Processing ${stock.symbol}...`);
        
        const data = await fetchHistoricalData(stock.symbol, "6y");
        await sleep(80); // Rate-limiting delay to avoid 429
        
        if (!data || data.length < 63) {
            continue;
        }
        
        const len = data.length;
        const today = data[len - 1];
        
        // Find stock price near 2021-01-01
        // We match benchmark index start index by timestamp
        let stockStartIndex = 0;
        for (let i = 0; i < len; i++) {
            if (data[i].timestamp >= bStart.timestamp) {
                stockStartIndex = i;
                break;
            }
        }
        const start = data[stockStartIndex];
        
        // Find stock price near 63 bars ago (aligned with index)
        let stock63Index = 0;
        for (let i = 0; i < len; i++) {
            if (data[i].timestamp >= b63.timestamp) {
                stock63Index = i;
                break;
            }
        }
        const s63 = data[stock63Index];
        
        // ARS Calculation
        const stockReturnARS = (today.close / start.close) - 1;
        const benchReturnARS = (bToday.close / bStart.close) - 1;
        const ars = (1 + stockReturnARS) / (1 + benchReturnARS) - 1;
        
        // Yesterday's ARS (for trend checking)
        const yesterday = data[len - 2];
        let stockStartPrevIndex = Math.max(0, stockStartIndex - 1);
        const startPrev = data[stockStartPrevIndex];
        const bTodayPrev = benchmarkData[bLen - 2];
        const stockReturnARSPrev = (yesterday.close / startPrev.close) - 1;
        const benchReturnARSPrev = (bTodayPrev.close / bStart.close) - 1;
        const arsPrev = (1 + stockReturnARSPrev) / (1 + benchReturnARSPrev) - 1;
        const arsRising = ars > arsPrev;
        
        // SRS Calculation
        const stockReturnSRS = (today.close / s63.close) - 1;
        const benchReturnSRS = (bToday.close / b63.close) - 1;
        const srs = (1 + stockReturnSRS) / (1 + benchReturnSRS) - 1;
        
        // Volume Surge calculation (vs 20-day SMA of Volume)
        let volSum = 0;
        const volPeriod = 20;
        const startVolIdx = Math.max(0, len - volPeriod);
        for (let i = startVolIdx; i < len; i++) {
            volSum += data[i].volume;
        }
        const avgVol = volSum / volPeriod;
        const volRatio = avgVol > 0 ? today.volume / avgVol : 0;
        const volSurge = volRatio >= 1.5;
        
        // 52-Week High Proximity (252 bars)
        let hi52 = 0;
        const highPeriod = 252;
        const startHighIdx = Math.max(0, len - highPeriod);
        for (let i = startHighIdx; i < len; i++) {
            if (data[i].close > hi52) {
                hi52 = data[i].close;
            }
        }
        const hiProx = hi52 > 0 ? (today.close - hi52) / hi52 : 0;
        const nearHigh = hiProx >= -0.05; // within 5%
        
        // Filters
        // 1. ARS > 0%
        // 2. ARS trending up
        const passesFilters = ars > 0 && arsRising;
        
        // Breakout trigger (ARS just crossed above 0 in the last 10 bars)
        let isBreakout = false;
        if (ars > 0) {
            // Find if any of the last 10 bars had ARS <= 0
            const checkBars = Math.min(10, len - 2);
            for (let checkOffset = 1; checkOffset <= checkBars; checkOffset++) {
                const stockValAtOffset = data[len - 1 - checkOffset];
                const bValAtOffset = benchmarkData[bLen - 1 - checkOffset];
                
                // Estimate ARS at this historical bar
                let stockStartOffsetIndex = Math.max(0, stockStartIndex - checkOffset);
                const startOffset = data[stockStartOffsetIndex];
                
                const stockRetOffset = (stockValAtOffset.close / startOffset.close) - 1;
                const benchRetOffset = (bValAtOffset.close / bStart.close) - 1;
                const arsOffset = (1 + stockRetOffset) / (1 + benchRetOffset) - 1;
                
                if (arsOffset <= 0) {
                    isBreakout = true;
                    break;
                }
            }
        }
        
        results.push({
            symbol: stock.symbol.replace('.NS', ''),
            name: stock.name,
            industry: stock.industry,
            close: today.close,
            ars: ars,
            arsRising: arsRising,
            srs: srs,
            volRatio: volRatio,
            volSurge: volSurge,
            hiProx: hiProx,
            nearHigh: nearHigh,
            isBreakout: isBreakout,
            verdict: passesFilters ? "PASS" : "FAIL"
        });
    }
    
    process.stdout.write("\rScreener complete! Formatting output...                      \n");
    
    // Sort by ARS Score
    results.sort((a, b) => b.ars - a.ars);
    
    // Print top 20 passing stocks
    const passing = results.filter(r => r.verdict === "PASS");
    console.log(`\n--- TOP MOMENTUM STOCKS (PASSING FILTERS: ${passing.length}/${results.length}) ---`);
    console.log("----------------------------------------------------------------------------------");
    console.log(String("TICKER").padEnd(12) + " | " + 
                String("INDUSTRY").padEnd(25) + " | " + 
                String("ARS").padEnd(8) + " | " + 
                String("SRS").padEnd(8) + " | " + 
                String("52W PROX").padEnd(9) + " | " + 
                String("VOL RATIO").padEnd(9) + " | " + 
                String("FLAGS"));
    console.log("----------------------------------------------------------------------------------");
    
    passing.slice(0, 20).forEach(r => {
        const flags = [];
        if (r.volSurge) flags.push("VOL+");
        if (r.isBreakout) flags.push("*NEW*");
        if (r.nearHigh) flags.push("NEAR_52W");
        
        console.log(
            r.symbol.padEnd(12) + " | " + 
            r.industry.slice(0, 25).padEnd(25) + " | " + 
            (r.ars * 100).toFixed(2).padStart(6) + "%" + " | " + 
            (r.srs * 100).toFixed(2).padStart(6) + "%" + " | " + 
            (r.hiProx * 100).toFixed(2).padStart(7) + "%" + " | " + 
            r.volRatio.toFixed(2).padStart(9) + " | " + 
            flags.join(", ")
        );
    });
    
    // Save to CSV
    const csvHeader = "Ticker,Company Name,Industry,Current Price,ARS %,ARS Trending Up,SRS %,Volume Ratio,Volume Surge,52W High Proximity,Near 52W High,Is Breakout,Verdict\n";
    const csvRows = results.map(r => 
        `${r.symbol},"${r.name}","${r.industry}",${r.close.toFixed(2)},${(r.ars*100).toFixed(4)},${r.arsRising},${(r.srs*100).toFixed(4)},${r.volRatio.toFixed(4)},${r.volSurge},${(r.hiProx*100).toFixed(4)},${r.nearHigh},${r.isBreakout},${r.verdict}`
    ).join('\n');
    
    const outputFilename = `screener_results_${listName.toLowerCase().replace(' ', '_')}.csv`;
    const outputPath = path.join(scratchDir, outputFilename);
    fs.writeFileSync(outputPath, csvHeader + csvRows, 'utf8');
    
    console.log(`\nSuccess! Full screener database saved to:`);
    console.log(`file:///${outputPath.replace(/\\/g, '/')}`);
    console.log("----------------------------------------------------------------------------------");
}

runScreener().catch(console.error);
