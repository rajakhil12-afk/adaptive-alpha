# Adaptive Alpha — Institutional Momentum & Rotation Screener (v10.0)

**Adaptive Alpha** is a premium, client-ready technical momentum screener, dual relative-strength engine, and sector rotation dashboard for the **NSE India** stock universe (**Nifty 500**, Nifty 50, Nifty 100, Nifty Midcap 100, Nifty Smallcap 100, ~500 stocks). Designed with a high-end TradingView-inspired dark slate aesthetic, the platform helps analysts and traders identify market leaders, explosive volume breakouts, and industry rotation trends in real time.

> **Live Site:** https://rajakhil12-afk.github.io/adaptive-alpha

---

## 🚀 Key Features (v10.0)

* **Dual RS 4-Quadrant Engine (ARS + SRS):** Classifies stocks into 4 actionable quadrants:
  * 🌟 **QUAD 1 (Power Leader):** `ARS > 0` & `SRS > 0` (Heavy institutional momentum)
  * 🔄 **QUAD 2 (Early Turnaround):** `ARS <= 0` & `SRS > 0` (Catches bottoming crossovers weeks before ARS turns positive!)
  * ⏸️ **QUAD 3 (Leader Dip Buy):** `ARS > 0` & `SRS <= 0` (Cooling leader / low-risk re-entry zone near 50MA)
  * 💤 **QUAD 4 (Laggard):** `ARS <= 0` & `SRS <= 0` (Underperforming stocks)
* **🎯 1-Click Strategy Presets:** Instant filter bar buttons for *Dual Alpha Leaders, Early Turnarounds, Leader Dip Buy, Volume Surge,* and *VCP Consolidations*.
* **🧮 Smart Position Size & Risk Calculator:** Integrated inside stock detail modals; automatically calculates exact share quantities, total investment, % of portfolio capital, and 1:2 / 1:3 R:R targets based on Supertrend stop-loss (with `localStorage` memory).
* **🗺️ Interactive Sector Rotation Treemap View:** Responsive CSS grid displaying Sector ARS (long-term trend), Sector SRS (short-term acceleration), stock counts, and leading stock per industry.
* **🖼️ 1-Click Social Share Card Generator:** Renders a high-resolution PNG image card of today's breakouts and market summary via HTML Canvas, complete with 1-click *Download PNG* and *Copy Image to Clipboard* for Twitter, WhatsApp, or Telegram.
* **📡 Volume Radar (Surge 2x+ & VCP Dry-up < 0.7x):** Detects institutional accumulation surges (>2.0x avg vol) and volume contraction setups (<0.7x avg vol).
* **📈 Inline ARS Sparklines & Breathing Pulse Glow:** Mini trendlines inside table rows and ambient gold/emerald breathing pulse animation on fresh breakouts.
* **📱 Mobile App Experience:** Touch-optimized bottom navigation bar on smartphone screens (< 768px).
* **TradingView Aesthetics:** Premium Slate Dark Theme (`#0B0E14` / `#131722`) with desaturated pastel indicators.
* **Adaptive Relative Strength (ARS):** Long-term outperformance vs NIFTY 50 anchored from January 2021.
* **Shorter-term Relative Strength (SRS):** Rolling 63-day (1 quarter) momentum.
* **RS Rating (1–99):** Composite percentile rank across ARS (40%), SRS (30%), Volume Ratio (15%), and ARS-positive duration (15%).
* **Dual Supertrend (14/3 & 10/3):** Two-stage trend confirmation with fresh signal glow badges (⚡).
* **FII/DII Flow Ticker & Telegram Alerts:** Daily net buying/selling by foreign & domestic institutional investors + automated 7:00 PM IST Telegram breakout reports.

---

## 📊 Technical Indicators & Math

### 1. Adaptive Relative Strength (ARS)
Measures cumulative outperformance vs NIFTY 50 since January 1, 2021.

$$ARS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{2021\text{-}01\text{-}01}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{2021\text{-}01\text{-}01}} - 1$$

### 2. Shorter-term Relative Strength (SRS)
Rolling 63-trading-day (1 business quarter) relative performance.

$$SRS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{63\text{ days ago}}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{63\text{ days ago}}} - 1$$

### 3. Dual RS 4-Quadrant Classification
combining ARS & SRS yields 4 distinct market regimes:

| Quadrant | Condition | Signal & Action |
| :--- | :--- | :--- |
| 🌟 **Quad 1** | `ARS > 0` & `SRS > 0` | **Power Leader** (High conviction breakouts) |
| 🔄 **Quad 2** | `ARS <= 0` & `SRS > 0` | **Early Turnaround** (Catches bottoming stocks early) |
| ⏸️ **Quad 3** | `ARS > 0` & `SRS <= 0` | **Leader Dip** (Low risk re-entry near 50MA) |
| 💤 **Quad 4** | `ARS <= 0` & `SRS <= 0` | **Laggard** (Avoid / underperforming) |

---

## ⚙️ Hybrid Data Architecture

### Layer 1 — Static EOD Pipeline (GitHub Actions)
Runs automatically every weekday at **7:40 PM IST** (14:10 UTC):

1. Downloads official **NSE UDiFF Bhavcopy** (with fallback to legacy archive URL).
2. Fetches 6-year historical series from **Yahoo Finance** with retry logic.
3. Calculates ARS, SRS, RS Rating, Supertrend, MA Status, ARS Slope for all ~200+ stocks.
4. Formats timestamps explicitly in **IST (`Asia/Kolkata`)** timezone.
5. Sends automated **Telegram Breakout & Sector Reports** (including fresh crossovers and calendar week breakouts).
6. Writes `data/screener.json` and commits it — triggering an instant GitHub Pages redeploy.

### Layer 2 — On-Demand Live Scan
Clicking **"↻ Live Data"** in the dashboard pulls real-time price series from Yahoo Finance and recalculates all indicators client-side in the browser.

---

## 🛠️ Automation Details

| Workflow | Schedule | Purpose |
|---|---|---|
| `screener_update.yml` | Mon–Fri at 7:40 PM IST (14:10 UTC) | Downloads NSE data, calculates indicators, sends Telegram report, updates `screener.json` |
| `keepalive.yml` | 1st of every month | Re-enables any paused workflows; commits heartbeat file |

Both workflows use **Node.js 24** on `ubuntu-latest` with **GitHub Actions v5** (`actions/checkout@v5`, `actions/setup-node@v5`).

The screener pipeline includes built-in resilience:
* **3 retry attempts** per Yahoo Finance fetch with exponential backoff
* **5 retry attempts** for the NIFTY 50 benchmark fetch
* **Graceful Bhavcopy fallback** — continues with Yahoo-only data if NSE is unavailable
* **Workflow-level retry** — the entire script is retried up to 3 times with 60-second intervals
* **Global error handlers** — `unhandledRejection` and `uncaughtException` prevent silent crashes

---

## 🚀 Installation & Local Setup

The pipeline is built with **zero external runtime dependencies** (using native Node.js standard libraries: `https`, `fs`, `path`, and `child_process`).

### Prerequisites
- **Node.js**: `v20.0.0` or later (`>=24.0.0` recommended)
- **Git**

### Running Locally
```bash
# Clone the repository
git clone https://github.com/rajakhil12-afk/adaptive-alpha.git
cd adaptive-alpha

# Run the screener data generation pipeline
node scripts/update_data.js

# (Optional) Scrape missing TradingView logo identifiers
node scripts/scrape_logo_ids.js

# (Optional) Test Telegram notification script locally
node scripts/send_telegram_notification.js
```

---

## 🔐 Environment Variables & GitHub Secrets

For automated daily Telegram breakout notifications, configure the following secrets in your GitHub repository (**Settings > Secrets and variables > Actions**):

| Secret / Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Optional (CI alerts) | Telegram Bot API token obtained from [@BotFather](https://t.me/BotFather) | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `TELEGRAM_CHAT_ID` | Optional (CI alerts) | Telegram channel ID, group ID, or user ID (use [@userinfobot](https://t.me/userinfobot)) | `-1001234567890` or `987654321` |
| `TELEGRAM_REQUIRED` | Optional | Set to `true` if you want the pipeline to fail when credentials are missing | `false` |

A sample template is provided in [`.env.example`](.env.example).

---

## 🤝 Acknowledgements

Special thanks to the Pine Script developer community on TradingView, particularly **Bhat Trader**, whose conceptual scripting and custom indicators for measuring relative strength against benchmark indexes laid the mathematical foundation for this application's momentum matrix logic.

