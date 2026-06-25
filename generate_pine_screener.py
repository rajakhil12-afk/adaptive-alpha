import os
import pandas as pd

def generate_pine_code(title, symbols, file_path):
    """
    Generates a Pine Script v5 screener for a list of symbols and writes it to a file.
    """
    # Header and settings
    code = f"""//@version=5
// ============================================================
// {title} Dashboard (Generated)
// Based on Premal Parekh's Multi-Sector ARS Screener v8.1
// ============================================================
indicator("{title}", overlay=false, max_bars_back=500)

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
"""
    
    # Declare symbols
    code += "\n// Stock Definitions\n"
    for idx, sym in enumerate(symbols):
        code += f's{idx+1} = "NSE:{sym}"\n'
        
    # Security calls
    code += "\n// Fetch Metrics\n"
    for idx in range(len(symbols)):
        code += f"[sa{idx+1}, ss{idx+1}, sv{idx+1}, sh{idx+1}] = f_ars_srs(s{idx+1}, bc)\n"
        
    # Breakout flags and passes
    code += "\n// Compute Status & Filters\n"
    for idx in range(len(symbols)):
        code += f"sb{idx+1} = f_is_breakout(sa{idx+1})\n"
        code += f"sp{idx+1} = f_passes(sa{idx+1}, sa{idx+1}[1], ss{idx+1}) ? 1 : 0\n"

    # Display helper function for row rendering
    code += """
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
    
    table.cell(tbl, 0, row, name + tag, bgcolor=color.new(color.black, 20), text_color=color.white, text_size=size.small)
    table.cell(tbl, 1, row, f_pct(ars) + " " + arrow, bgcolor=arsBg, text_color=color.black, text_size=size.small)
    table.cell(tbl, 2, row, f_pct(srs), bgcolor=color.new(color.gray, 75), text_color=color.white, text_size=size.small)
    table.cell(tbl, 3, row, hiStr, bgcolor=hiBg, text_color=color.black if (not na(hiProx) and hiProx * 100.0 >= -hiProxPct) else color.white, text_size=size.small)
    table.cell(tbl, 4, row, volTag, bgcolor=volTag == "VOL+" ? color.new(color.navy, 20) : color.new(color.gray, 75), text_color=color.white, text_size=size.small)
    table.cell(tbl, 5, row, statusText, bgcolor=statusBg, text_color=statusFg, text_size=size.small)
"""

    # Table layout initialization (1 header row + num_symbols rows)
    num_rows = len(symbols) + 2 # Header + symbols + footer
    code += f"""
// ============================================================
// MAIN TABLE (TOP-LEFT)
// ============================================================
var table tbl = table.new(position.top_left, 6, {num_rows},
     border_width = 1,
     border_color = color.new(color.gray, 55),
     frame_width  = 2,
     frame_color  = color.new(color.silver, 40))

if barstate.islast
    hBg = color.new(color.navy, 20)
    
    // Header
    table.cell(tbl, 0, 0, "TICKER", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 1, 0, "ARS", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 2, 0, "SRS", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 3, 0, "52W PROX", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 4, 0, "VOL SURGE", bgcolor=hBg, text_color=color.white, text_size=size.small)
    table.cell(tbl, 5, 0, "STATUS", bgcolor=hBg, text_color=color.white, text_size=size.small)
"""

    # Render rows
    for idx in range(len(symbols)):
        code += f"    f_set_row(tbl, {idx+1}, s{idx+1}, sa{idx+1}, sa{idx+1}[1], ss{idx+1}, sb{idx+1}, sv{idx+1}, sh{idx+1}, sp{idx+1})\n"

    # Total Pass Count
    sum_passes = " + ".join([f"sp{idx+1}" for idx in range(len(symbols))])
    
    code += f"""
    // Footer row with timestamp and stats
    totalPass = {sum_passes}
    lastDate = str.format_time(time, "dd MMM yyyy", "Asia/Kolkata")
    tsBg = color.new(color.navy, 40)
    
    table.cell(tbl, 0, {len(symbols)+1}, "TOTAL PASS", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 1, {len(symbols)+1}, str.tostring(totalPass) + "/{len(symbols)}", bgcolor=tsBg, text_color=color.white, text_size=size.tiny)
    table.cell(tbl, 2, {len(symbols)+1}, "Date: " + lastDate, bgcolor=tsBg, text_color=color.white, text_size=size.tiny)
    table.cell(tbl, 3, {len(symbols)+1}, "SRS: " + str.tostring(srsLen) + "d", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 4, {len(symbols)+1}, "VOL: x" + str.tostring(volSurgeMultiple,"#.#"), bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
    table.cell(tbl, 5, {len(symbols)+1}, "v8.1-Tab", bgcolor=tsBg, text_color=color.silver, text_size=size.tiny)
"""

    # Write to file
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"Generated {file_path} successfully!")

def main():
    scratch_dir = r"C:\Users\compas laptop\.gemini\antigravity\scratch"
    nifty50_csv = os.path.join(scratch_dir, "ind_nifty50list.csv")
    nifty100_csv = os.path.join(scratch_dir, "ind_nifty100list.csv")
    
    # Load tickers
    df_n50 = pd.read_csv(nifty50_csv)
    df_n100 = pd.read_csv(nifty100_csv)
    
    tickers_n50 = df_n50['Symbol'].tolist()
    tickers_n100 = df_n100['Symbol'].tolist()
    
    print(f"Loaded {len(tickers_n50)} Nifty 50 symbols and {len(tickers_n100)} Nifty 100 symbols.")
    
    # Nifty 50: Split into 2 parts of 25 symbols each
    generate_pine_code("Nifty 50 Screener Part 1", tickers_n50[:25], os.path.join(scratch_dir, "nifty50_screener_part1.txt"))
    generate_pine_code("Nifty 50 Screener Part 2", tickers_n50[25:50], os.path.join(scratch_dir, "nifty50_screener_part2.txt"))
    
    # Nifty 100: Split into 4 parts of 25 symbols each
    generate_pine_code("Nifty 100 Screener Part 1", tickers_n100[:25], os.path.join(scratch_dir, "nifty100_screener_part1.txt"))
    generate_pine_code("Nifty 100 Screener Part 2", tickers_n100[25:50], os.path.join(scratch_dir, "nifty100_screener_part2.txt"))
    generate_pine_code("Nifty 100 Screener Part 3", tickers_n100[50:75], os.path.join(scratch_dir, "nifty100_screener_part3.txt"))
    generate_pine_code("Nifty 100 Screener Part 4", tickers_n100[75:100], os.path.join(scratch_dir, "nifty100_screener_part4.txt"))

if __name__ == "__main__":
    main()
