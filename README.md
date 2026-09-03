# ⚡ Adaptive Alpha — Institutional Momentum & Sector Rotation Terminal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Unit%20Tests-100%25%20Passing-brightgreen.svg)](test/indicators.test.js)
[![Daily Refresh](https://img.shields.io/badge/Daily%20Refresh-7%3A40%20PM%20IST-orange.svg)](.github/workflows/screener_update.yml)
[![GitHub stars](https://img.shields.io/github/stars/rajakhil12-afk/adaptive-alpha?style=social)](https://github.com/rajakhil12-afk/adaptive-alpha)

**Adaptive Alpha** is an open-source, zero-build quantitative momentum screener, dual relative-strength engine, and sector rotation dashboard for the **NSE India** stock universe (**Nifty 500**, Nifty 50, Nifty Next 50, Nifty Midcap 100, Nifty Smallcap 100, ~500 equities). 

Designed with a high-end dark slate institutional aesthetic, the platform equips traders, quants, and analysts to identify leading momentum stocks, volume accumulation footprints, and industry rotation trends for **$0**.

---

### 🌐 Live Platform
* 🚀 **[Adaptive Alpha Platform (Home)](https://rajakhil12-afk.github.io/adaptive-alpha/landing.html)** — Official homepage, regime matrix & feature overview.
* 📊 **[Live Screener Terminal](https://rajakhil12-afk.github.io/adaptive-alpha/)** — Interactive quantitative scanner, heatmap & RRG clock.
* 📖 **[Strategy Presets Playbook](https://rajakhil12-afk.github.io/adaptive-alpha/preset_playbook.html)** — Trade setup rules & risk-reward guidelines.
* 📚 **[User Guide & Methodology](https://rajakhil12-afk.github.io/adaptive-alpha/user_guide.html)** — Mathematical indicator formulas & documentation.

---

## 🚀 Key Features

* **Dual RS 4-Quadrant Engine (ARS + SRS):** Classifies stocks into 4 actionable regimes:
  * 🌟 **QUAD 1 (Power Leader):** `ARS > 0` & `SRS > 0` (Heavy institutional momentum)
  * 🔄 **QUAD 2 (Early Turnaround):** `ARS <= 0` & `SRS > 0` (Catches bottoming crossovers weeks before ARS turns positive!)
  * ⏸️ **QUAD 3 (Leader Dip Buy):** `ARS > 0` & `SRS <= 0` (Cooling leader / low-risk re-entry zone near 50MA)
  * 💤 **QUAD 4 (Laggard):** `ARS <= 0` & `SRS <= 0` (Underperforming stocks)
* **🎯 1-Click Strategy Presets:** Instant filter buttons for *Power Leaders (Q1 + ST), Early Pocket Pivots, VCP Squeeze, Institutional Volume Surges (2×), Stage-2 Near 52W High,* and *Q2 Turnarounds*.
* **🏛️ Relative Rotation Graph (RRG) Radar Clock:** Clockwise sector rotation visualizer tracking leading, improving, weakening, and lagging industries against the Nifty benchmark.
* **🧘 Quantitative VCP Squeeze & Pocket Pivot Detectors:** Algorithmic detection of ATR volatility contraction ($\text{ATR}_5/\text{ATR}_{20} \le 0.70$) and institutional volume accumulation footprints.
* **🗺️ Multi-Metric Heatmap View:** Matrix colored dynamically by 52-Week High Proximity, ARS Alpha %, or Volume Spurts.
* **🧮 Smart Position Size & Risk Calculator:** Integrated inside stock detail modals; automatically computes exact share quantities, total investment, % of portfolio capital, and 1:2 / 1:3 R:R targets based on Supertrend trailing stop-loss (with `localStorage` persistence).
* **🎨 1-Click Social Share Card Generator:** Renders high-res PNG image cards of daily breakout leaders via HTML5 Canvas with instant *Download PNG* and *Copy Image* shortcuts for Twitter/X, WhatsApp, and Telegram.
* **🎯 30-Day Breakout Track Record Ribbon:** Live topbar banner tracking rolling win rate %, average peak run-up %, and top performers.
* **📱 Mobile App Experience:** Touch-optimized bottom navigation bar on smartphone screens.

---

## 📊 Quantitative Math & Indicators

### 1. Adaptive Relative Strength (ARS)
Measures cumulative outperformance vs. NIFTY 50 since January 1, 2021:

$$ARS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{2021\text{-}01\text{-}01}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{2021\text{-}01\text{-}01}} - 1$$

### 2. Shorter-term Relative Strength (SRS)
Rolling 63-trading-day (1 business quarter) relative performance:

$$SRS = \frac{\text{Stock Price}_{\text{Today}} / \text{Stock Price}_{63\text{ days ago}}}{\text{NIFTY}_{\text{Today}} / \text{NIFTY}_{63\text{ days ago}}} - 1$$

### 3. Dual RS 4-Quadrant Matrix

| Quadrant | Condition | Signal & Action |
| :--- | :--- | :--- |
| 🌟 **Quad 1** | `ARS > 0` & `SRS > 0` | **Power Leader** (High conviction trend breakouts) |
| 🔄 **Quad 2** | `ARS <= 0` & `SRS > 0` | **Early Turnaround** (Catches bottoming reversals early) |
| ⏸️ **Quad 3** | `ARS > 0` & `SRS <= 0` | **Leader Dip** (Low-risk re-entry near moving average support) |
| 💤 **Quad 4** | `ARS <= 0` & `SRS <= 0` | **Laggard** (Avoid / capital preservation zone) |

---

## ⚙️ Architecture: Zero-Build & Automated CI/CD

```text
adaptive-alpha/
├── .github/workflows/
│   └── screener_update.yml   # Automated 7:40 PM IST (14:10 UTC) cron pipeline
├── config/universe.js        # ~500 NSE constituent dataset
├── css/styles.css            # Dark/light theme tokens, tooltips, performance ribbon
├── data/screener.json        # EOD calculated database & market pulse
├── js/                       # Zero-build modular ES scripts
│   ├── app.js                # State orchestrator & preset filter engine
│   ├── indicators.js         # Pure mathematical indicator module
│   ├── modal.js              # Scorecard & position size calculator
│   ├── shareCard.js          # Canvas PNG social card generator
│   ├── table.js              # Table rendering, sorting, dynamic sparklines
│   ├── tooltips.js           # Instant floating micro-tooltips engine
│   ├── treemap.js            # Sector rotation RRG clock & heatmaps
│   └── universe.js           # Universal stock constituent lists
├── scripts/update_data.js    # Node.js backend calculation engine
├── test/indicators.test.js   # Automated unit tests (node --test)
├── index.html                # Main Screener Terminal (~370 lines)
├── landing.html              # Marketing & Regime Map Landing Page
└── package.json              # Scripts: start, test, update, notify
```

---

## 🧪 Automated Unit Testing

Run the native Node.js test suite anytime with zero npm dependencies:

```bash
npm test
# or: node --test test/indicators.test.js
```

```text
✔ Supertrend calculation — uptrend detection and buy signal
✔ Supertrend calculation — insufficient candles fallback
✔ Pocket Pivot Detector — identifies institutional volume accumulation
✔ VCP Squeeze Detector — validates volatility and volume compression
✔ Mansfield Relative Strength — computes benchmark outperformance
✔ RS Rating Multi-Factor Ranker — ranks composite stocks between 1 and 99
ℹ tests 6 | pass 6 | fail 0 | duration_ms 667ms
```

---

## 🛠️ Local Development & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rajakhil12-afk/adaptive-alpha.git
   cd adaptive-alpha
   ```

2. **Open directly in browser:**
   Open `index.html` or `landing.html` in any web browser — no build or bundling required!

3. **Run daily update locally:**
   ```bash
   npm start
   # or: node scripts/update_data.js
   ```

---

## 🌟 Support & Community

If you find **Adaptive Alpha** useful for your trading, quantitative research, or open-source projects, please consider giving it a **⭐ Star on GitHub**!

* Created with ❤️ by the **Adaptive Alpha Team**
* Contributions, issue reports, and pull requests are welcome.
* Released under the [MIT License](LICENSE).
