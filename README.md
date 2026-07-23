# Adaptive Alpha — Institutional Momentum & Rotation Screener (v9.1)

**Adaptive Alpha** is a premium, client-ready technical momentum screener and sector rotation dashboard for the **NSE India** stock universe (Nifty 50 + Nifty Midcap 100 + Nifty Smallcap 100 + curated extras, ~200+ stocks). Designed with a high-end TradingView-inspired dark slate aesthetic, the platform helps analysts and traders identify market leaders, explosive volume breakouts, and industry rotation trends in real time.

> **Live Site:** https://rajakhil12-afk.github.io/adaptive-alpha

---

## 🚀 Key Features

* **TradingView Aesthetics:** Premium Slate Dark Theme (`#0B0E14` / `#131722`) with desaturated pastel indicators (Emerald Green, Soft Coral, Amber Gold).
* **Adaptive Relative Strength (ARS):** Long-term outperformance vs NIFTY 50 anchored from January 2021.
* **Shorter-term Relative Strength (SRS):** Rolling 63-day (1 quarter) momentum.
* **RS Rating (1–99):** Composite rank combining ARS, SRS, Volume, and Duration — similar to IBD's RS Rating.
* **ARS Slope:** 5-day momentum change in ARS, detecting stocks in the process of turning.
* **Dual Supertrend (14/3 & 10/3):** Two-stage trend confirmation with fresh signal glow badges (⚡).
* **MA Status:** Real-time 50MA / 200MA cross-check shown as `MA+` / `MA-`.
* **Sector Rotation View:** 17 core industries categorized into RRG-style quadrants: **LEADING**, **WEAKENING**, **IMPROVING**, **LAGGING**.
* **FII/DII Flow Ticker:** Live daily net buying/selling by foreign and domestic institutional investors.
* **Pill-Badge Filters & Smart Grouping:** One-click filters for ARS+, SRS+, Volume Surge, 52W-High Proximity, Supertrend Buy, Breakout, and MA+.
* **Direct Chart Linkage:** Click any stock row to open its live chart on TradingView.
* **Interactive Tour Guide:** Auto-launches for first-time visitors to walk through the interface.

---

## 📊 Technical Indicators & Math

### 1. Adaptive Relative Strength (ARS)
Measures cumulative outperformance vs NIFTY 50 since January 1, 2021.

$$ARS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{2021\text{-}01\text{-}01}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{2021\text{-}01\text{-}01}} - 1$$

* **ARS > 0% (Green):** Outperforming Nifty since 2021.
* **ARS < 0% (Red):** Underperforming Nifty since 2021.
* **ARS Slope > 0:** Actively gaining momentum vs the index.

### 2. Shorter-term Relative Strength (SRS)
Rolling 63-trading-day (1 business quarter) relative performance.

$$SRS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{63\text{ days ago}}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{63\text{ days ago}}} - 1$$

Detects early rotation before it shows in long-term ARS.

### 3. RS Rating (1–99)
Composite percentile rank across ARS (40%), SRS (30%), Volume Ratio (15%), and ARS-positive duration (15%). A rating of **99** means the stock is in the top 1% of all screened stocks.

### 4. Volume Ratio & 52W Proximity
* **Volume Ratio:** `Current Volume / 20-Day Avg Volume`. Values > 1.5× signal institutional activity.
* **52W Proximity:** `(Current Price − 52W High) / 52W High`. Near 0% = breakout zone.

### 5. Dual Supertrend (14/3 & 10/3)
ATR-based trailing stop system using Wilder's Smoothed Moving Average. Calculations match TradingView's Supertrend exactly.
* **14/3 (Standard):** Smoother trend for swing traders.
* **10/3 (Fast):** More sensitive for short-term reversals.
* Fresh **⚡ Buy/Sell Signal** detected when trend flips on the latest candle.

---

## ⚙️ Hybrid Data Architecture

The app uses a two-layer data engine:

### Layer 1 — Static EOD Pipeline (GitHub Actions)
Runs automatically every weekday at **4:30 PM IST** (11:30 UTC):

1. Downloads official **NSE UDiFF Bhavcopy** (with fallback to legacy archive URL). If NSE is unavailable, the pipeline gracefully continues with Yahoo Finance data only.
2. Fetches 6-year historical series from **Yahoo Finance** for each stock and the NIFTY 50 index, with **automatic retry logic** (3 attempts per stock with exponential backoff, 5 attempts for the benchmark).
3. Calculates ARS, SRS, RS Rating, Supertrend, MA Status, ARS Slope for all ~200+ stocks.
4. Fetches latest **FII/DII flow** data.
5. Writes `data/screener.json` and commits it — triggering an instant GitHub Pages redeploy.
6. **Global error handlers** (`unhandledRejection`, `uncaughtException`) ensure no silent crashes — every failure is logged with detailed diagnostics.

A **monthly keep-alive workflow** (`keepalive.yml`) runs on the 1st of every month to re-enable any workflows that GitHub may have paused due to inactivity.

### Layer 2 — On-Demand Live Scan
Clicking **"↻ Live Data"** in the dashboard pulls real-time price series from Yahoo Finance and recalculates all indicators client-side in the browser.

---

## 📁 Repository Structure

```text
├── .github/
│   ├── last_updated.txt            # Heartbeat timestamp (updated every run)
│   └── workflows/
│       ├── screener_update.yml     # Daily EOD data update (Mon–Fri 4:30 PM IST)
│       └── keepalive.yml           # Monthly keep-alive to prevent schedule pausing
├── data/
│   ├── screener.json               # Pre-calculated stock database (auto-generated)
│   └── logo_ids.json               # TradingView logo ID cache
├── scripts/
│   ├── update_data.js              # Core Node.js pipeline (NSE + Yahoo + calculations)
│   └── scrape_logo_ids.js          # One-time script to cache TradingView logo IDs
├── index.html                      # Root UI Dashboard (single-file app)
├── user_guide.html                 # Print-optimized User Guide
├── package.json                    # Node.js project manifest
└── README.md                       # This file
```

---

## 💻 Local Development

### Prerequisites
* **Node.js** v24 or higher
* `unzip` utility (pre-installed on macOS/Linux; on Windows, PowerShell is used automatically)

### Setup & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/rajakhil12-afk/adaptive-alpha.git
   cd adaptive-alpha
   ```

2. Generate the static stock database:
   ```bash
   node scripts/update_data.js
   ```
   This downloads the latest NSE Bhavcopy, fetches Yahoo Finance history, and writes `data/screener.json`. Takes ~5–10 minutes depending on network speed.

3. Open `index.html` in your browser to view the dashboard.

---

## 🌐 Deploying to GitHub Pages

1. Go to **Settings → Pages** in your repository.
2. Under **Build and deployment**, set source to **Deploy from a branch**.
3. Select the **`main`** branch and **`/ (root)`** folder.
4. Click **Save**.

The site will live-update automatically every weekday after market close via the GitHub Actions workflow — no manual intervention needed.

### Re-enabling the Workflow (if paused)
GitHub auto-disables scheduled workflows on repos with no commits for 60+ days. To re-enable:
* Go to **Actions → Daily Screener Update → Enable workflow**, OR
* The `keepalive.yml` workflow handles this automatically on the 1st of every month.

---

## 🛠️ Automation Details

| Workflow | Schedule | Purpose |
|---|---|---|
| `screener_update.yml` | Mon–Fri at 4:30 PM IST | Downloads NSE data, calculates indicators, updates `screener.json` |
| `keepalive.yml` | 1st of every month | Re-enables any paused workflows; commits heartbeat file |

Both workflows use **Node.js 24** on `ubuntu-latest` with **GitHub Actions v5** (`actions/checkout@v5`, `actions/setup-node@v5`).

The screener pipeline includes built-in resilience:
* **3 retry attempts** per Yahoo Finance fetch with exponential backoff
* **5 retry attempts** for the NIFTY 50 benchmark fetch
* **Graceful Bhavcopy fallback** — continues with Yahoo-only data if NSE is unavailable
* **Workflow-level retry** — the entire script is retried up to 3 times with 60-second intervals
* **Global error handlers** — `unhandledRejection` and `uncaughtException` prevent silent crashes

---

## 🤝 Acknowledgements

Special thanks to the Pine Script developer community on TradingView, particularly **Bhat Trader**, whose conceptual scripting and custom indicators for measuring relative strength against benchmark indexes laid the mathematical foundation for this application's momentum matrix logic.
