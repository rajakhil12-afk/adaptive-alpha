# Multi-Sector ARS & SRS Screener Project

This project contains code and resources to run relative strength screeners on **Nifty 50** and **Nifty 100** stocks, fully customized to avoid TradingView's standard account limits.

## Project Structure
- **`ind_nifty50list.csv` / `ind_nifty100list.csv`**: The official constituents lists.
- **`nifty50_screener_part1.txt` & `nifty50_screener_part2.txt`**: Pine Scripts for screening the Nifty 50 in TradingView (2 parts of 25 stocks).
- **`nifty100_screener_part1.txt` to `part4.txt`**: Pine Scripts for screening the Nifty 100 in TradingView (4 parts of 25/24 stocks).
- **`generate_pine_screener.js` / `.py`**: Code generator scripts. If index constituents change, run these scripts to automatically regenerate the TradingView code.
- **`nifty_screener_v8.js` / `nifty_screener.py`**: Standalone command-line screener scripts that retrieve real-time data from Yahoo Finance and export a CSV dashboard of all passing stocks.

---

## How to Set Up this Project in your Workspace
1. In your editor/IDE, set **`C:\Users\compas laptop\.gemini\antigravity\scratch\nifty_screener_project`** as your active workspace directory.
2. All project code, scripts, and logs are self-contained here for future reference.

---

## How to Run the Scripts

### 1. Generating TradingView Scripts
If Nifty constituents change or you want to update the settings:
```bash
node generate_pine_screener.js
```

### 2. Running the Standalone Live Screener
To perform a live market scan and save the results:
```bash
node nifty_screener_v8.js
```
This will fetch live Yahoo Finance prices, run the ARS/SRS math, display the passing stocks in your console, and save a detailed report (e.g. `screener_results_nifty_100.csv`) in this folder.
