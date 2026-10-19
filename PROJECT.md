# Project: Adaptive Alpha 4-Pillar Architecture & Pro Trader Workflow

## Architecture
The system consists of an ingestion and enrichment data pipeline, a fast client-side analytical screener dashboard, a paper trading execution desk (Jishu Desk), and an automated verification test suite.

```
                    ┌─────────────────────────────────────────┐
                    │ External Sources: NSE Bhavcopy,         │
                    │ Yahoo Finance, Forensics DB             │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                             [scripts/update_data.js]
                             - Ingests official delivery volume
                             - Computes Delivery Surge Ratio (20D avg)
                             - Assigns 4-tier Institutional Accumulation Grade
                             - Enriches forensic safety flags (pledge, debt, auditor)
                             - Runs Jishu Engine (scripts/jishu_engine.js)
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
              [data/screener.json]             [data/jishu_portfolio.json]
              [data/screener.js]               [data/jishu_portfolio.js]
                        │                                 │
                        ├────────────────┬────────────────┤
                        ▼                ▼                ▼
                 [index.html]       [js/modal.js]   [jishu_desk.html]
                 - 4-Quadrant       - 3-bullet AI   - Paper Trading
                   regime chips       Trade Thesis    execution desk
                 - Accumulation     - Position      - 3-Sleeve
                   Grade badges       Sizer           allocations
                 - Forensic safety  - 3-step SL     - Trailing SL
                   warning tags       ladder          ledger
                 - TV Watchlist     - Jishu sync
                   export
                 - Keyboard nav
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: 4-Quadrant Regime UI & State | Add Quad 3 (Dips) and Quad 4 (Laggards) chips, update filters object and passes() logic in js/app.js & index.html | M2 | ORIGINAL_REQUEST §R1 |
| 2 | R1: Zero-Latency Client Sorting & Grouping | Ensure sorting and sector grouping in js/table.js execute smoothly with all 4 quadrants | M2 | ORIGINAL_REQUEST §R1 |
| 3 | R2: Official NSE Delivery Volume Ingestion | Ingest official security-wise delivery data in scripts/update_data.js, compute Delivery Surge Ratio (Deliv Vol / 20D Avg Deliv) | M1 | ORIGINAL_REQUEST §R2 |
| 4 | R2: Institutional Accumulation Grades | Classify stocks into Grade A+ Heavy Accumulation, Grade A Solid Buying, Grade B Neutral, Grade C Churn in scripts and UI | M1 | ORIGINAL_REQUEST §R2 |
| 5 | R2: Forensic Safety Elimination Checks | Integrate promoter pledge (>20%), high debt load, and auditor change checks into data pipeline and table/modal badges | M1 | ORIGINAL_REQUEST §R2 |
| 6 | R3: Automated 3-Bullet AI Trade Thesis | Render explicit Growth Catalyst, Risk Factor, and Technical Trigger with 1:1, 1:2, 1:3 guidelines in modal.js | M3 | ORIGINAL_REQUEST §R3 |
| 7 | R4: Volatility Position Sizer & Presets | Position sizing for capital/risk % in modal, with Supertrend, -10% hard, -5% tight presets | M4 | ORIGINAL_REQUEST §R4 |
| 8 | R4: 3-Step Trailing Stop Ladder & Jishu Sync | Enforce Target 1 (breakeven), Target 2 (lock T1 profit), Target 3 (open trailing trend) and synchronize with Jishu portfolio | M4 | ORIGINAL_REQUEST §R4 |
| 9 | R5: 1-Click TradingView Watchlist Export | Export menu action copying `NSE:TICKER,NSE:TICKER2,...` with toast feedback | M5 | ORIGINAL_REQUEST §R5 |
| 10 | R5: Pro Trader Keyboard Navigation | `J`/`↓`, `K`/`↑` row cycling, `Space` toggle watchlist, `Enter` open modal, `T` open TradingView without scroll glitches | M5 | ORIGINAL_REQUEST §R5 |
| 11 | Acceptance: Browser Smoke & SRI Suite | `python -m unittest test_browser -v` passes with 0 failures | M-E2E | ORIGINAL_REQUEST Acceptance |
| 12 | Acceptance: Jishu Engine Validation Suite | `python test/jishu_test.py` passes with 0 errors | M-E2E | ORIGINAL_REQUEST Acceptance |
| 13 | Acceptance: Pipeline Enrichment Clean Run | `scripts/update_data.js` runs cleanly and updates `data/screener.json` | M1 | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | The Truth Inspector & Data Pipeline (R2) | `scripts/update_data.js`, `config/forensics.js`, `data/screener.json`, Delivery surge ratio, Accumulation Grades A+/A/B/C, Forensic flags | none | DONE |
| M2 | The Scout & Regime Filtering (R1) | `index.html`, `js/app.js`, `js/table.js`, 4-quadrant chips (Quad 1-4), client-side sorting & grouping | none | DONE |
| M3 | The Story Analyst AI Thesis (R3) | `js/modal.js`, `index.html`, 3-bullet AI Quantitative Thesis (Catalyst, Risk, Trigger 1:1/1:2/1:3) | M1, M2 | DONE |
| M4 | The Risk Copilot & Jishu Synchronization (R4) | `js/modal.js`, `scripts/jishu_engine.js`, `jishu_desk.html`, `data/jishu_portfolio.json`, 3-step trailing SL ladder, position sizer & sync | M1, M3 | DONE |
| M5 | Pro Trader Workflow (R5) | `index.html`, `js/ui.js`, `js/shareCard.js`, TradingView watchlist copy (`NSE:TICKER,...`), toast notification, keyboard navigation | M2 | DONE |
| M-E2E | E2E Testing Track | Design & execute comprehensive opaque-box test runner covering Tiers 1-4 and test suites | none | DONE |
| M-FINAL | Final Verification & Hardening | 100% E2E test pass + Phase 2 adversarial coverage hardening | M1-M5, M-E2E | DONE |

## Interface Contracts
### Data Pipeline (`scripts/update_data.js`) ↔ Screener (`data/screener.json` / `js/table.js` / `js/modal.js`)
- `stock.institutional`:
  - `ad_grade`: `"A+" | "A" | "B" | "C" | "D" | "E"`
  - `ad_grade_label`: `"Grade A+ Heavy Accumulation" | "Grade A Solid Buying" | "Grade B Neutral" | "Grade C Churn"`
  - `deliv_ratio`: `number` (float, e.g. `1.85`, ratio of today's delivery vs 20D average delivery)
  - `deliv_estimated`: `boolean` (`false` when real official delivery data is present)
- `stock.safety` (and `stock.forensics` alias):
  - `is_safe`: `boolean`
  - `flags`: `string[]` (e.g. `["HIGH_PROMOTER_PLEDGE", "HIGH_DEBT_LOAD", "AUDITOR_WARNING"]`)
  - `promoter_pledge_pct`: `number` (percentage e.g. `24.5`)
  - `high_debt`: `boolean`
  - `auditor_warning`: `boolean`
  - `warnings`: `string[]`

### Screener Modal (`js/modal.js`) ↔ Jishu Paper Trading Desk (`data/jishu_portfolio.json` / `jishu_desk.html`)
- Position Sizer calculations:
  - Inputs: `capital` (default 500000), `risk_pct` (default 1.0%), `sl_price`
  - Outputs: `qty`, `invested_value`, `risk_amount`, `target_1` (1:1), `target_2` (1:2), `target_3` (1:3)
- Stop-loss Presets:
  - `st`: Supertrend value if buy trend and below price, else price * 0.93
  - `fixed10`: price * 0.90
  - `fixed5`: price * 0.95
- Trailing Stop Ladder:
  - Step 1: price >= Target 1 -> SL moves to cost price (breakeven)
  - Step 2: price >= Target 2 -> SL moves to Target 1 price (lock in +10% profit) and trails 10% below peak
  - Step 3: price >= Target 3 -> open trailing trend expansion

### Export Menu ↔ Clipboard / UI
- Format: `NSE:TICKER,NSE:TICKER2,...`
- Toast feedback: `✓ Copied X tickers in TradingView format`

## Code Layout
- `scripts/`: Data pipeline and execution engine
  - `scripts/update_data.js`: Main data ingestion & enrichment script
  - `scripts/jishu_engine.js`: Jishu execution & trailing stop loss manager
  - `scripts/smart_money_detective.js`: Institutional scoring
- `config/`: Universe & static configuration
  - `config/universe.js`: NSE stock universe definitions
  - `config/forensics.js`: Forensic safety database (promoter pledge, debt, auditor alerts)
- `js/`: Client-side UI & screener logic
  - `js/app.js`: Main state, filtering, chips, regime categorization
  - `js/table.js`: Table rendering, badges, sorting, sector grouping
  - `js/modal.js`: Stock detail modal, 3-bullet AI thesis, position sizer
  - `js/ui.js`: Keyboard navigation, export popup menu, UI event handlers
  - `js/shareCard.js`: Export actions including TradingView watchlist copy
- `css/`: Stylesheets
  - `css/styles.css`: Badges, tags, modal cards, keyboard selection styles
  - `css/phase6.css`: Icons & export popups
- `test/`: Verification test suites
  - `test_browser.py`: HTML smoke tests, IDs, SRI, asset paths
  - `test/jishu_test.py`: Jishu portfolio math, trailing triggers, screener sanity
  - `test/e2e_runner.py`: Unified end-to-end test runner
