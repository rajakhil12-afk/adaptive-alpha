# Adaptive Alpha — Institutional Momentum & Rotation Screener

**Adaptive Alpha** is a premium, client-ready technical momentum screener and sector rotation dashboard for the **NSE India (Nifty 200)** stock universe. Designed with a high-end TradingView-inspired dark slate aesthetic, the platform helps analysts and traders identify market leaders, explosive volume breakouts, and industry rotation trends.

---

## 🚀 Key Features

* **TradingView Aesthetics:** A premium Slate Dark Theme (`#0B0E14` / `#131722`) optimized for clarity, using desaturated pastel indicators (Emerald Green, Soft Coral, and Amber Gold).
* **Relative Strength Matrix:** Includes **Adaptive Relative Strength (ARS)** to calculate long-term outperformance against the NIFTY 50 since 2021, and **Shorter-term Relative Strength (SRS)** tracking 63-day momentum.
* **Sector Rotation View:** Categorizes 17 core industries into RRG-style quadrants: **LEADING**, **WEAKENING**, **IMPROVING**, and **LAGGING**.
* **Pill-Badge Filters & Smart Grouping:** Dynamic toggle filters for ARS, SRS, Volume Surges, and 52-Week High Proximity with a one-click industry grouping layout.
* **Direct Chart Linkage:** Click any stock row to instantly open its live daily chart on TradingView.
* **CSS Skeleton Loaders:** Shimmer animations for seamless visual states during data updates.

---

## 📊 Technical Indicators & Math Details

### 1. Adaptive Relative Strength (ARS)
Adaptive Relative Strength measures a stock's cumulative outperformance or underperformance relative to the NIFTY 50 index since a historical anchor date (January 1, 2021). The adaptive window filters out index-wide market cycles, highlighting assets showing sustained structural accumulation.
* **Formula:**
  \[ARS = \frac{\frac{\text{Stock Price}_{\text{Today}}}{\text{Stock Price}_{\text{Base Date}}}}{\frac{\text{NIFTY Index}_{\text{Today}}}{\text{NIFTY Index}_{\text{Base Date}}}} - 1\]
* **Significance:**
  * **ARS > 0% (Green):** Outperforming Nifty since 2021.
  * **ARS < 0% (Red):** Underperforming Nifty since 2021.
  * **ARS Trending Up:** Stock is actively gaining momentum compared to the index.

### 2. Shorter-term Relative Strength (SRS)
Shorter-term Relative Strength tracks near-term momentum cycles over a rolling 63-trading-day window (equivalent to 1 business quarter). It identifies leading stocks during brief market corrections or sectors capturing early rotation interest.
* **Formula:**
  \[SRS = \frac{\frac{\text{Stock Price}_{\text{Today}}}{\text{Stock Price}_{63\text{ Days Ago}}}}{\frac{\text{NIFTY Index}_{\text{Today}}}{\text{NIFTY Index}_{63\text{ Days Ago}}}} - 1\]
* **Significance:** Detects quick rotation phases before they reflect in the long-term ARS.

### 3. Volume Ratio & 52W Proximity
* **Volume Ratio:** `Current Volume / 20-Day Average Volume`. Signals institutional presence when volume is > 1.50x.
* **52-Week Proximity:** `(Current Price - 52-Week High) / 52-Week High`. Tracks breakout readiness.

---

## ⚙️ Hybrid Data Architecture

To ensure speed and reliability, the application uses a dual-data engine:

1. **Static EOD Pipeline (GitHub Actions):** 
   * A scheduled cron job runs Node.js calculations Monday through Friday at **4:30 PM IST** (after market close).
   * It downloads the official NSE UDiFF Bhavcopy, merges benchmark history, calculates metrics, and updates `data/screener.json`.
   * Pushing the updated JSON file redeploys the site instantly.
2. **On-Demand Live Scan:** 
   * Clicking **"↻ Live Data"** in the browser pulls real-time intraday price series from Yahoo Finance (via CORS proxies) and recalculates all indicators client-side.

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── screener_update.yml  # Daily GitHub Actions workflow scheduler
├── data/
│   └── screener.json           # Output static calculated stock database
├── scripts/
│   └── update_data.js          # Core Node.js momentum calculator script
├── index.html                  # Root UI Dashboard
├── user_guide.html             # Print-optimized User Guide
└── README.md                   # Repository documentation (this file)
```

---

## 💻 Local Development

### Prerequisites
* **Node.js** (v18 or higher)

### Setup & Run
1. Clone the repository and navigate to the folder:
   ```bash
   git clone https://github.com/<your-username>/adaptive-alpha.git
   cd adaptive-alpha
   ```
2. Manually generate the static stock database:
   ```bash
   node scripts/update_data.js
   ```
3. Open `index.html` in your web browser to view the dashboard.

---

## 🌐 Deploying to GitHub Pages

1. Go to your repository **Settings** -> **Pages**.
2. Under **Build and deployment**, set the source to **Deploy from a branch**.
3. Select the **`main`** branch and the **`/ (root)`** folder.
4. Click **Save**.

---

## 🤝 Acknowledgements

Special thanks to the original Pine Script developer community on TradingView, particularly **Bhat Trader**, whose conceptual scripting and custom indicators for measuring relative strength against benchmark indexes laid the mathematical foundation for this application's momentum matrix logic.
