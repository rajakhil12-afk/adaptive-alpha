# Adaptive Alpha v10.0 — Quantitative Alpha Upgrade Release Notes

**Release Date:** August 20, 2026

---

## 🛠️ Bug Fixes & Resiliency Upgrades

1. **Telegram 52W High Proximity Filter**:
   - Fixed condition from `hi52_prox >= 0.95` to `hi52_prox >= -0.05` in `scripts/send_telegram_notification.js`.
2. **Constituent-Based Market Cap Categorization**:
   - Replaced arbitrary share price threshold with exact Nifty 50, Nifty Next 50, Midcap 100, and Smallcap 100 mappings.
3. **Telegram Message Length Chunking**:
   - Added automatic message splitting ensuring reports never exceed Telegram's 4096 character limit.
4. **Supertrend Wilder's RMA Smoothing**:
   - Resolved array initialization offset and eliminated index-0 direction flip bug across Node.js pipeline and client.
5. **52-Week High Calculation**:
   - Switched from close prices (`c.c`) to true session Highs (`c.h`).
6. **Symbol Ticker Mappings**:
   - Corrected Yahoo Finance mappings for `ETERNAL` (`ZOMATO.NS`), `FIRSTCRY` (`BRAINBEES.NS`), and `TMPV` (`TATAMOTORS.NS`).
7. **TradingView Logo Search Exchange Constraints**:
   - Constrained search matching to `NSE` and `BSE` exchanges to avoid foreign company logo mismatches.
8. **Multi-Timeframe ARS History Lookup**:
   - Fixed Weekly (`W`) and Monthly (`M`) resampled candle bucket alignment in `buildARSHistory()`.

---

## 🚀 Quantitative & Technical Analysis Features

9. **📈 Mansfield Relative Strength (MRS)**:
   - Stan Weinstein Stage-2 base breakout identification: computes 50-period SMA of stock/benchmark ratio and tracks upward momentum expansion.
10. **🧘 Quantitative VCP Squeeze Engine**:
    - True 2-dimensional Volatility Contraction Pattern: requires 5d/20d ATR ratio $\le 0.70$, volume dry-up $\le 0.75\text{x}$, and 5-day range tightness $\le 4.5\%$.
11. **⚡ Institutional Pocket Pivot Accumulation**:
    - Morales & Kacher footprint detector: flags up-days with volume exceeding the largest down-day volume over the prior 10 trading sessions.
12. **📊 RS 1-99 Factor Breakdown**:
    - Transparent percentile breakdown: 40% ARS, 30% SRS, 15% Volume Accumulation, 15% Trend Streak displayed with progress bars inside the stock detail modal.
13. **⚡ High-Speed Concurrent Async Engine**:
    - Replaced serial 500-stock loop with a chunked parallel worker pool (batch size = 8), speeding up EOD updates from 2.5 minutes to under 25 seconds.
14. **🎨 Landing Page & Playbook Updates**:
    - Updated `landing.html` and `preset_playbook.html` with complete entry, stop-loss, and target rules for all quantitative strategies.
