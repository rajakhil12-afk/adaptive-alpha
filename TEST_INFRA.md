# Adaptive Alpha 4-Pillar Architecture — Testing Infrastructure (`TEST_INFRA.md`)

## 1. Overview & Architecture
The Adaptive Alpha verification framework implements a comprehensive, opaque-box, requirement-driven test pyramid for the 4-Pillar Quantitative Architecture (The Scout, The Truth Inspector, The Story Analyst, The Risk Copilot) and the Pro Trader Workflow.

The test infrastructure is designed for zero flaky dependencies, running natively in pure Python 3.11 with standard library modules (`unittest`, `json`, `math`, `pathlib`).

```
                  ┌──────────────────────────────────────────────┐
                  │ Tier 4: Real-World Application Scenarios (4) │
                  │ - E2E Screening to Watchlist Export Workflow │
                  │ - Institutional Trap Elimination Pipeline    │
                  │ - Jishu Multi-Day Trade Lifecycle Ledger     │
                  │ - Keyboard Navigation & Chart Fast-Switch    │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │  Tier 3: Cross-Feature Interactions (12)     │
                  │  - Pillar Confluence & Safety Override Rules │
                  │  - Sizer + Presets + Trailing Stop Ladder    │
                  │  - Multi-Filter Screener to TV CSV Export    │
                  │  - 3-Sleeve Exposure & Exit Confluence       │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │    Tier 2: Boundary & Corner Cases (25)      │
                  │    - Zero/Negative Capital, Risk % Fallbacks │
                  │    - Zero Stop Distance & Extreme Capital    │
                  │    - Division by Zero in Delivery Surges     │
                  │    - Strict Pledge Thresholds (20.0% vs .01%)│
                  │    - Single-Stock (N=1) Percentile Ranking   │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │       Tier 1: Feature Coverage (55)          │
                  │       - F1: Dual RS & 1-99 RS Ratings        │
                  │       - F2: Supertrend (10,3) & VCP Squeeze  │
                  │       - F3: 4-Quadrant Regimes & Sectors     │
                  │       - F4: Delivery Volume & Surge Ratios   │
                  │       - F5: Institutional Grades A+/A/B/C/E  │
                  │       - F6: Forensic Safety Checks           │
                  │       - F7: 3-Bullet AI Quantitative Thesis  │
                  │       - F8: Position Sizer Math & Presets    │
                  │       - F9: 3-Step Trailing Stop Ladder      │
                  │       - F10: Jishu Portfolio Financial Math  │
                  │       - F11: TradingView Watchlist & Keys    │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │           Acceptance Test Suites (9)         │
                  │           - test_browser.py (5 tests)        │
                  │           - test/jishu_test.py (4 tests)     │
                  └──────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Breakdown

| Path | Suite Name | Tests | Target Scope |
|------|------------|-------|--------------|
| `test/e2e_runner.py` | Unified E2E Test Runner | Aggregator | Coordinates in-process execution across all suites, produces colored summary tables, and exits 0 on pass. |
| `test_browser.py` | Browser Smoke & SRI Suite | 5 | Validates all HTML pages, duplicate IDs, local script/asset paths, and external CDN SRI integrity. |
| `test/jishu_test.py` | Jishu Engine Acceptance | 4 | Validates stored portfolio invariants, target math, screener sanity, and position sizer Node integration. |
| `test/test_tier1_features.py` | Tier 1: Feature Coverage | 55 | Validates all 11 core functional requirements in isolation (>=5 tests per feature). |
| `test/test_tier2_boundaries.py` | Tier 2: Boundary & Corner Cases | 25 | Validates zero/negative inputs, division by zero, floating boundaries, extreme capital, and single-stock universes. |
| `test/test_tier3_interactions.py` | Tier 3: Cross-Feature Interactions | 12 | Validates interactions between momentum, forensic safety overrides, trailing stops, and multi-filter export pipelines. |
| `test/test_tier4_scenarios.py` | Tier 4: Real-World Scenarios | 4 | Executes complete multi-day end-to-end trading workflows, trap avoidance, and keyboard navigation sessions. |
| **Total Test Count** | | **105** | **100% Comprehensive Coverage across 4 Tiers & Acceptance Suites** |

---

## 3. Requirements Traceability Matrix

| Requirement | Description | Direct Test Coverage |
|-------------|-------------|----------------------|
| **R1. The Scout** | Dual RS (ARS + SRS), RS Ratings (1-99), Supertrend (10,3), VCP squeeze, 4-Quadrant filtering, client sorting & sector grouping. | `TestF1DualRSAndRatings` (5), `TestF2SupertrendAndVCP` (5), `TestF3RegimeAndSorting` (5), `test_regime_boundary_*` (2), `test_s1_*` (1) |
| **R2. The Truth Inspector** | NSE delivery volume & surge ratios (`Deliv Vol / 20D Avg`), Institutional Accumulation Grades (A+, A, B, C, D, E), Forensic safety checks (pledge > 20%, high debt, auditor change). | `TestF4DeliveryVolumeSurge` (5), `TestF5InstitutionalAccumulationGrades` (5), `TestF6ForensicSafetyChecks` (5), `TestTier2BoundaryAndCornerCases` (B4, B5), `test_i1_*`, `test_i2_*`, `test_s2_*` |
| **R3. The Story Analyst** | Automated 3-bullet AI Quantitative Thesis (Growth Catalyst, Risk Factor, Technical Trigger with 1:1, 1:2, 1:3 profit target guidelines). | `TestF7AIQuantitativeThesis` (5), `test_i8_*`, `test_s1_*`, `test_s2_*` |
| **R4. The Risk Copilot** | Volatility Position Sizer (capital, risk %, SL price), presets (Supertrend, -10% hard, -5% tight), 20% single-stock allocation cap, 3-step trailing SL ladder, Jishu portfolio invariants. | `TestF8VolatilityPositionSizer` (5), `TestF9TrailingStopLadder` (5), `TestF10JishuPortfolioSync` (5), `TestTier2BoundaryAndCornerCases` (B1, B2, B3, B9, B10), `test_i4_*`, `test_i5_*`, `test_s3_*`, `JishuAcceptanceTestCase` (4) |
| **R5. Pro Trader Workflow** | 1-Click TradingView Watchlist export (`NSE:TICKER,NSE:TICKER2,...`) with toast feedback, and Pro Trader keyboard shortcuts (`J`/`↓`, `K`/`↑`, `Space`, `Enter`, `T`). | `TestF11TradingViewExportAndNavigation` (5), `test_empty_watchlist_export`, `test_i6_*`, `test_s1_*`, `test_s4_*` |

---

## 4. Execution Guide

### Primary Execution Command:
To run the full verification test suite across all 105 test cases:
```powershell
python test/e2e_runner.py
```

### Running Individual Tiers:
```powershell
# Run Acceptance Suites
python -m unittest test_browser -v
python test/jishu_test.py

# Run Tier 1 Feature Coverage Suite (55 tests)
python -m unittest test/test_tier1_features.py -v

# Run Tier 2 Boundary & Corner Cases Suite (25 tests)
python -m unittest test/test_tier2_boundaries.py -v

# Run Tier 3 Cross-Feature Interactions Suite (12 tests)
python -m unittest test/test_tier3_interactions.py -v

# Run Tier 4 Real-World Application Scenarios (4 tests)
python -m unittest test/test_tier4_scenarios.py -v
```

---

## 5. Expected Output Derivation & Verification Integrity
1. **Mathematical Invariants**: Position sizing formulas and allocation caps derive strictly from `PROJECT.md:83-85` and `js/modal.js:301-338`.
2. **Trailing Stop Ratchet Rules**: Step 1 (1:1 breakeven), Step 2 (1:2 lock Target 1), and dynamic trailing ratchet derive from `scripts/jishu_engine.js:140-174`.
3. **Institutional Grading Thresholds**: Accumulation/Distribution formulas derive from `js/indicators.js:486-510` and `scripts/smart_money_detective.js:33-44`.
4. **Forensic Safety Thresholds**: Strict `> 20.0%` promoter pledge boundary derives from `ORIGINAL_REQUEST.md:19` and `PROJECT.md:77`.
5. **Real Market Data Grounding**: Tests load and assert structural invariants against official project datasets `data/screener.json` and `data/jishu_portfolio.json`.
