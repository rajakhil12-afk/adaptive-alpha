# 🚀 Release v2.1.0 — Telegram Breakout Alerts & Performance Tracker

### 📢 Overview
This release introduces real-time automated daily breakout notifications sent directly to Telegram post-scan, alongside automatic 30-day breakout performance tracking to measure signal win rates and max run-ups.

---

### ✨ Key Features & Enhancements

#### 1. 🤖 Smart Telegram Breakout Alerts (`scripts/send_telegram_notification.js`)
* **Real-time Notifications:** Runs automatically via GitHub Actions immediately after the daily EOD market scan finishes (4:30 PM IST).
* **Smart Auto-Switching View:**
  * **Detailed Cards (≤ 10 Breakouts):** Displays Price, RS Rating, Volume Surge Multiplier (`x Vol`), and Breakout Pattern type (`ARS Crossover` / `52W High Prox`).
  * **Compact View (> 10 Breakouts):** Keeps Telegram feeds clean during high-volatility market rally days.
* **Institutional Flow Summary:** Includes daily FII & DII net flows (₹ Cr) at the top of every alert.
* **Categorized Breakouts:** Groups breakouts clearly into **🚀 Large Cap**, **🔥 Mid Cap**, and **⚡ Small Cap**.

#### 2. 📊 30-Day Breakout Performance Tracker (`scripts/update_data.js` & `data/breakout_history.json`)
* **Autopilot Historical Logging:** Logs all breakout triggers into a persistent database file (`data/breakout_history.json`).
* **Continuous Run-up Tracking:** Daily market scans update current price, total return `%`, and peak gain `%` reached since trigger date.
* **Telegram Performance Digest:** Adds a 30-day performance snapshot to Telegram alerts showing **Total Tracked Picks**, **Win Rate %**, **Average Return %**, and **Top Active Outperformers**.

---

### ⚙️ GitHub Secrets Setup
To enable Telegram notifications, ensure the following repository secrets are configured under **Settings > Secrets and variables > Actions**:
* `TELEGRAM_BOT_TOKEN`: Bot API Token from `@BotFather`
* `TELEGRAM_CHAT_ID`: Personal User ID from `@userinfobot`
