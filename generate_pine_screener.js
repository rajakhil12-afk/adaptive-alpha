const fs = require('fs');
const path = require('path');

const scratchDir = 'C:\\Users\\compas laptop\\.gemini\\antigravity\\scratch';

function loadTickers(csvPath) {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`File not found: ${csvPath}`);
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const tickers = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 3) {
            // Extract symbol (3rd from the right to avoid issues with commas in company names)
            const symbol = parts[parts.length - 3].trim();
            if (symbol && symbol !== 'Symbol' && !symbol.startsWith('DUMMY') && symbol !== 'ETERNAL') {
                tickers.push(symbol);
            }
        }
    }
    return tickers;
}

function generatePineCode(title, symbols, outputPath) {
    let code = `//@version=5
// ============================================================
// ${title} Dashboard (Generated)
// Based on Premal Parekh's Multi-Sector ARS Screener v8.1
// ============================================================
indicator("${title}", overlay=false, max_bars_back=500)

// ============================================================
// USER INPUTS
// ============================================================
startYear  = input.int(2021, title="Start Year",  minval=2000, maxval=2030, group="ARS Settings")
startMonth = input.int(1,    title="Start Month", minval=1,    maxval=12,   group="ARS Settings")
startDay   = input.int(1,    title="Start Day",   minval=1,    maxval=31,   group="ARS Settings")

srsLen = input.int(63, title="SRS Lookback (days)", minval=10, maxval=500, group="ARS Settings")
arsMaLen = input.int(20, title="ARS MA Length", minval=5, maxval=100, group="ARS Settings")

volSurgeMultiple = input.float(1.5, title="Volume Surge Multiple", step=0.1, minval=1.1, maxval=5.0, group="Volume Settings")
hiProxPct = input.float(5.0, title="52W High Proximity %", step=0.5, minval=1.0, maxval=20.0, group="52W Settings")
arsThreshPct = input.float(0.0, title="ARS Threshold (%)", step=0.5, group="Screening Filters")

filterArsGtThresh = input.bool(true,  title="Filter: ARS > Threshold%", group="Screening Filters")
filterArsTrending = input.bool(true,  title="Filter: ARS trending UP", group="Screening Filters")
filterArsAboveMa  = input.bool(false, title="Filter: ARS above MA", group="Screening Filters")
filterSrsGtZero   = input.bool(false, title="Filter: SRS > 0%", group="Screening Filters")

arsThreshold = arsThreshPct / 100.0
breakoutBars = input.int(10, title="Breakout Lookback (bars)", minval=3, maxval=50, group="Screening Filters")
onlyShowPass = input.bool(true, title="Show Only Passing Stocks", group="Display Settings", tooltip="If checked, the table compresses and only displays stocks that pass the filters.")

// ============================================================
// CORE FUNCTIONS
// ============================================================
f_len() =>
    cutoff = timestamp(startYear, startMonth, startDay, 0, 0)
    raw    = ta.barssince(time >= cutoff)
    int result = 20
    if not na(raw)
        result := math.max(raw, 20)
    result

f_bench(sym) =>
    request.security(sym, "D", close, lookahead=barmerge.lookahead_off)

f_ars_srs(stockSym, benchClose) =>
    len = f_len()
    [stockClose, stockVol] = request.security(stockSym, "D", [close, volume], lookahead=barmerge.lookahead_off)
    float ars      = na
    float srs      = na
    float volRatio = na
    float hiProx   = na
    bool arsOk = not na(stockClose[len]) and not na(benchClose[len]) and stockClose[len] != 0.0 and benchClose[len] != 0.0
    bool srsOk = not na(stockClose[srsLen]) and not na(benchClose[srsLen]) and stockClose[srsLen] != 0.0 and benchClose[srsLen] != 0.0
    if arsOk
        ars := (stockClose / stockClose[len]) / (benchClose / benchClose[len]) - 1.0
    if srsOk
        srs := (stockClose / stockClose[srsLen]) / (benchClose / benchClose[srsLen]) - 1.0
    avgVol = ta.sma(stockVol, 20)
    if not na(avgVol) and avgVol > 0
        volRatio := stockVol / avgVol
    hi52 = ta.highest(stockClose, 252)
    if not na(hi52) and hi52 > 0
        hiProx := (stockClose - hi52) / hi52
    [ars, srs, volRatio, hiProx]

f_above_ma(v) =>
    ma = ta.sma(v, arsMaLen)
    not na(ma) and v > ma

f_is_breakout(ars) =>
    bool broke = false
    if not na(ars) and ars > 0.0
        i = 1
        while i <= breakoutBars
            if not na(ars[i]) and ars[i] <= 0.0
                broke := true
            i := i + 1
    broke

f_passes(ars, prevArs, srs) =>
    bool isTrending = not na(ars) and not na(prevArs) and ars > prevArs
    bool p = true
    if filterArsGtThresh
        p := p and (not na(ars) and ars > arsThreshold)
    if filterArsTrending
        p := p and isTrending
    if filterArsAboveMa
        p := p and f_above_ma(ars)
    if filterSrsGtZero
        p := p and (not na(srs) and srs > 0.0)
    p

f_pct(v) =>
    na(v) ? "--" : str.tostring(v * 100.0, "#.##") + "%"

// ============================================================
// SYMBOLS & FETCH BENCHMARK
// ============================================================
bc = f_bench("NSE:NIFTY")
`;

    code += '\n// Stock Definitions\n';
    symbols.forEach((sym, idx) => {
        const tvSym = sym.replace(/[-&]/g, '_');
        code += `s${idx+1} = "NSE:${tvSym}"\n`;
    });

    code += '\n// Fetch Metrics\n';
    symbols.forEach((_, idx) => {
        code += `[sa${idx+1}, ss${idx+1}, sv${idx+1}, sh${idx+1}] = f_ars_srs(s${idx+1}, bc)\n`;
    });

    code += '\n// Compute Status & Filters\n';
    symbols.forEach((_, idx) => {
        code += `sb${idx+1} = f_is_breakout(sa${idx+1})\n`;
        code += `sp${idx+1} = f_passes(sa${idx+1}, sa${idx+1}[1], ss${idx+1}) ? 1 : 0\n`;
    });

    code += `
// Row renderer
f_set_row(tbl, row, sym, ars, prevArs, srs, isBreakout, volRatio, hiProx, passes) =>
    name    = str.replace(sym, "NSE:", "")
    arrow   = na(ars) or na(prevArs) ? "-" : ars > prevArs ? "^" : "v"
    tag     = isBreakout ? " *NEW*" : ""
    volTag  = not na(volRatio) and volRatio >= volSurgeMultiple ? "VOL+" : "--"
    hiStr   = not na(hiProx) ? str.tostring(hiProx * 100.0, "#.##") + "%" : "--"
    
    // Set cell backgrounds based on performance
    color arsBg = color.new(color.gray, 65)
    if not na(ars)
        if ars > 0.15
            arsBg := color.new(color.lime, 15)
        else if ars > 0.05
            arsBg := color.new(color.green, 25)
        else if ars > 0.0
            arsBg := color.new(color.teal, 35)
        else if ars > -0.05
            arsBg := color.new(color.orange, 25)
        else
            arsBg := color.new(color.red, 25)
            
    color hiBg = not na(hiProx) and (hiProx * 100.0 >= -hiProxPct) ? color.new(color.lime, 20) : color.new(color.gray, 75)
    color statusBg = passes > 0 ? color.new(color.lime, 15) : color.new(color.gray, 65)
    string statusText = passes > 0 ? "PASS" : "FAIL"
    color statusFg = passes > 0 ? color.black : color.gray
    
    table.cell(tbl, 0, row, name + tag, bgcolor=isBreakout ? color.new(color.yellow, 15) : color.new(color.black, 20), text_color=isBreakout ? color.black : color.white, text_size=size.small)
    table.cell(tbl, 1, row, f_pct(ars) + " " + arrow, bgcolor=arsBg, text_color=color.black, text_size=size.small)
    table.cell(tbl, 2, row, f_pct(srs), bgcolor=color.new(color.gray, 75), text_color=color.white, text_size=size.small)
    table.cell(tbl, 3, row, hiStr, bgcolor=hiBg, text_color=(not na(hiProx) and (hiProx * 100.0 >= -hiProxPct)) ? color.black : color.white, text_size=size.small)
    table.cell(tbl, 4, row, volTag, bgcolor=volTag == "VOL+" ? color.new(color.navy, 20) : color.new(color.gray, 75), text_color=color.white, text_size=size.small)
    table.cell(tbl, 5, row, statusText, bgcolor=statusBg, text_color=statusFg, text_size=size.small)

// ============================================================
// MAIN TABLE (TOP-LEFT)
// ============================================================
var table tbl = table.new(position.top_left, 6, ${symbols.length + 2},
     border_width = 0,
     frame_width  = 0)

if barstate.islast
    // Clear all cells from previous bars to avoid ghosts
    table.clear(tbl, 0, 0, 5, ${symbols.length + 1})
    
    hBg = color.new(color.navy, 20)
    
    // Header
    table.cell(tbl, 0, 0, "TICKER", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 1, 0, "ARS", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 2, 0, "SRS", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 3, 0, "52W PROX", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 4, 0, "VOL SURGE", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 5, 0, "STATUS", bgcolor=hBg, text_color=color.white, text_size=size.small)
    
    int curRow = 1
`;

    symbols.forEach((_, idx) => {
        code += `    if not onlyShowPass or sp${idx+1} > 0\n`;
        code += `        f_set_row(tbl, curRow, s${idx+1}, sa${idx+1}, sa${idx+1}[1], ss${idx+1}, sb${idx+1}, sv${idx+1}, sh${idx+1}, sp${idx+1})\n`;
        code += `        curRow := curRow + 1\n`;
    });

    const sumPasses = symbols.map((_, idx) => `sp${idx+1}`).join(' + ');

    code += `
    // Footer row
    totalPass = ${sumPasses}
    lastDate = str.format_time(time, "dd MMM yyyy", "Asia/Kolkata")
    tsBg = color.new(color.navy, 40)
    
    table.cell(tbl, 0, curRow, "TOTAL PASS", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 1, curRow, str.tostring(totalPass) + "/${symbols.length}", bgcolor=tsBg, text_color=color.white, text_size=size.tiny)
    table.cell(tbl, 2, curRow, "Date: " + lastDate, bgcolor=tsBg, text_color=color.white, text_size=size.tiny)
    table.cell(tbl, 3, curRow, "SRS: " + str.tostring(srsLen) + "d", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 4, curRow, "VOL: x" + str.tostring(volSurgeMultiple,"#.#"), bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 5, curRow, "v8.1-Tab", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
`;

    fs.writeFileSync(outputPath, code, 'utf8');
    console.log(`Generated ${path.basename(outputPath)} successfully!`);
}

function main() {
    const nifty50Csv = path.join(scratchDir, 'ind_nifty50list.csv');
    const nifty100Csv = path.join(scratchDir, 'ind_nifty100list.csv');
    
    const tickersN50 = loadTickers(nifty50Csv);
    const tickersN100 = loadTickers(nifty100Csv);
    
    console.log(`Loaded ${tickersN50.length} Nifty 50 and ${tickersN100.length} Nifty 100 symbols.`);
    
    // Nifty 50: Split into 2 parts of 25 symbols each
    generatePineCode("Nifty 50 Screener Part 1", tickersN50.slice(0, 25), path.join(scratchDir, 'nifty50_screener_part1.txt'));
    generatePineCode("Nifty 50 Screener Part 2", tickersN50.slice(25, 50), path.join(scratchDir, 'nifty50_screener_part2.txt'));
    
    // Nifty 100: Split into 4 parts of 25 symbols each
    generatePineCode("Nifty 100 Screener Part 1", tickersN100.slice(0, 25), path.join(scratchDir, 'nifty100_screener_part1.txt'));
    generatePineCode("Nifty 100 Screener Part 2", tickersN100.slice(25, 50), path.join(scratchDir, 'nifty100_screener_part2.txt'));
    generatePineCode("Nifty 100 Screener Part 3", tickersN100.slice(50, 75), path.join(scratchDir, 'nifty100_screener_part3.txt'));
    generatePineCode("Nifty 100 Screener Part 4", tickersN100.slice(75), path.join(scratchDir, 'nifty100_screener_part4.txt'));
}

main();
