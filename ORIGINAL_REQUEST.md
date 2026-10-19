# Original User Request

## 2026-10-19T11:30:45Z

Implement the complete 4-Pillar architecture for Adaptive Alpha: The Scout (momentum & relative strength), The Truth Inspector (NSE delivery volume & forensic trap elimination), The Story Analyst (AI quantitative trade thesis), and The Risk Copilot (volatility position sizing & automated trailing stop management), along with pro trader workflow enhancements (1-click TradingView watchlist export and keyboard navigation).

Working directory: c:\Users\compas laptop\Desktop\github_upload   ARS Screener Final Files
Integrity mode: development

## Requirements

### R1. The Scout (Momentum & Velocity Engine)
Maintain and optimize the Dual Relative Strength (ARS + SRS) engine, 1-99 RS Ratings, Supertrend (10,3), and Volatility Contraction (VCP) squeeze detection across the ~500 NSE stock universe. Ensure sorting, sector grouping, and 4-quadrant regime filtering (Quad 1 Leaders, Quad 2 Turnarounds, Quad 3 Dips, Quad 4 Laggards) execute client-side with zero latency.

### R2. The Truth Inspector (Safety & Trap Elimination)
Incorporate institutional delivery volume and forensic safety verification into the data pipeline and UI:
- Parse official NSE Security-wise delivery data in `scripts/update_data.js` and compute Delivery Surge Ratios (`Delivery Volume / 20D Avg Delivery`).
- Assign an Institutional Accumulation Grade (`Grade A+ Heavy Accumulation`, `Grade A Solid Buying`, `Grade B Neutral`, `Grade C Churn`) and display it in the screener table and modal.
- Implement forensic safety checks flagging high promoter pledge (>20%), high debt load, and auditor change warnings.

### R3. The Story Analyst (AI Quantitative Trade Thesis)
Enrich stock detail modals with an automated 3-bullet AI Quantitative Thesis for top breakout setups:
- **Growth Catalyst**: Key business catalyst (profit growth, capex, or order book wins).
- **Risk Factor**: Primary operational or sector risk.
- **Technical Trigger**: Clean entry trigger, trailing stop-loss level, and 1:2 / 1:3 profit target guidelines.

### R4. The Risk Copilot (Volatility Sizer & Jishu Execution)
Equip swing traders with automated risk management:
- Connect the stock modal's Position Sizer to compute exact share quantities based on the user's capital (e.g. ₹5,00,000) and max risk % (e.g. 1%).
- Enforce the 3-step trailing stop-loss ladder (Target 1: move SL to breakeven cost; Target 2: lock in Target 1 profit; Target 3: open trailing trend).
- Synchronize position management and risk tracking with `jishu_desk.html` and `data/jishu_portfolio.json`.

### R5. Pro Trader Workflow (TradingView Watchlist Export & Keyboard Navigation)
- Add a 1-click **"Copy TradingView Watchlist"** action to the Export menu that formats filtered tickers as `NSE:TICKER,NSE:TICKER2,...` directly to the clipboard.
- Implement keyboard shortcuts: `J` / `↓` and `K` / `↑` to cycle rows in the screener table, `Space` to toggle watchlist, `Enter` to open modal, and `T` to open the stock on TradingView.

---

## Acceptance Criteria

### Functional & Pipeline Verification
- [ ] `scripts/update_data.js` runs cleanly and enriches `data/screener.json` with delivery surge ratio, accumulation grade, and safety flags.
- [ ] `index.html` table displays the institutional accumulation grade badge and safety warning icons when active.
- [ ] Clicking "Copy TradingView Watchlist" in the Export menu copies a properly formatted comma-separated ticker string to the clipboard with toast feedback.
- [ ] Keyboard navigation (`J`/`K`/`↓`/`Space`/`Enter`) functions across the screener table rows without scrolling glitches.
- [ ] Stock modal displays the complete 3-bullet AI Quantitative Thesis card and working position size calculator.
- [ ] Stop-loss presets (Supertrend, -10% hard, -5% tight) update the calculated quantity and risk amounts accurately.

### Automated Test Verification
- [ ] `python -m unittest test_browser -v` passes with 0 failures (checks all HTML references, duplicate IDs, and SRI).
- [ ] `python test/jishu_test.py` passes with 0 errors (validates portfolio logic, target math, and stop-loss trailing rules).
