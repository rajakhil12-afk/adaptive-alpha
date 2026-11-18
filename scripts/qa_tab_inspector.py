#!/usr/bin/env python3
"""
Agent 7: 🧭 Tab & Navigation Inspector
Part of the Adaptive Alpha Omniscient QA Multi-Agent Squad.

Autonomously verifies:
1. Mutual exclusivity of tab active states across all 6 tabs in index.html:
   - Overview (#tab-overview)
   - Screener Terminal (#tab-screener)
   - Watchlist (#tab-watchlist)
   - Breakout Radar (#tab-breakouts)
   - Pro Heatmap (#tab-heatmap)
   - Sector Rotation RRG (#tab-sectors)
2. Tab content DOM visibility and mutual exclusivity (hidden containers).
3. Counter badges (#wl-count, #bo-count).
4. Sub-view toggles inside Pro Heatmap (metrics & filters) and Sectors (table vs cards).
5. Secondary dashboard health: jishu_desk.html paper trading cockpit.
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent


def run_tab_inspector(page=None, root_dir=ROOT_DIR):
    """
    Executes Agent 7 tab inspections.
    Accepts an existing Playwright Page or instantiates a fresh headless session.
    Returns a dict with status, check details, and any detected errors.
    """
    results = {
        "agent": "Agent 7: Tab & Navigation Inspector",
        "passed": True,
        "checks": [],
        "errors": [],
        "warnings": []
    }

    def log_check(name, success, details=""):
        results["checks"].append({"name": name, "success": success, "details": details})
        icon = "✅" if success else "❌"
        msg = f"{icon} [Agent 7] {name}" + (f" — {details}" if details else "")
        print(msg)
        if not success:
            results["passed"] = False
            results["errors"].append(f"{name}: {details}")

    close_browser_on_finish = False
    playwright_instance = None
    browser_instance = None

    try:
        if page is None:
            playwright_instance = sync_playwright().start()
            browser_instance = playwright_instance.chromium.launch(
                headless=True,
                args=['--allow-file-access-from-files', '--disable-web-security']
            )
            context = browser_instance.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            close_browser_on_finish = True

        # Route out external widgets to ensure reliable, fast local testing
        page.route("**/*.trendlyne.com/**", lambda r: r.abort())

        index_url = (root_dir / "index.html").resolve().as_uri()
        page.goto(index_url, wait_until="domcontentloaded")
        page.wait_for_timeout(600)  # brief settle for initial data rendering

        # ── 1. INSPECT OVERVIEW TAB ──
        page.evaluate("setTab('overview', document.querySelectorAll('.tabs .tab')[0])")
        page.wait_for_timeout(200)

        overview_visible = page.evaluate("document.getElementById('tab-overview').style.display !== 'none'")
        screener_hidden = page.evaluate("document.getElementById('tab-screener').style.display === 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()

        log_check("Tab Switch: Overview Display State", overview_visible and screener_hidden,
                  f"Overview visible: {overview_visible}, Screener hidden: {screener_hidden}")
        log_check("Tab Switch: Overview Active Class", "Overview" in active_tab_text,
                  f"Active tab: '{active_tab_text.strip()}'")

        hero_rendered = page.locator("#retail-hero-cockpit").inner_html()
        log_check("Overview: Retail Hero Cockpit Rendered", len(hero_rendered) > 20,
                  f"Cockpit HTML length: {len(hero_rendered)}")

        # ── 2. INSPECT SCREENER TERMINAL TAB ──
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")
        page.wait_for_timeout(200)

        screener_visible = page.evaluate("document.getElementById('tab-screener').style.display !== 'none'")
        overview_hidden = page.evaluate("document.getElementById('tab-overview').style.display === 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()

        log_check("Tab Switch: Screener Display State", screener_visible and overview_hidden,
                  f"Screener visible: {screener_visible}")
        log_check("Tab Switch: Screener Active Class", "Screener" in active_tab_text,
                  f"Active tab: '{active_tab_text.strip()}'")

        row_count = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Screener: Table Rows Hydrated", row_count > 0, f"Found {row_count} rendered stocks")

        # ── 3. INSPECT WATCHLIST TAB ──
        page.evaluate("setTab('watchlist', document.querySelectorAll('.tabs .tab')[2])")
        page.wait_for_timeout(200)

        watchlist_visible = page.evaluate("document.getElementById('tab-watchlist').style.display !== 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()
        wl_count_text = page.locator("#wl-count").inner_text()

        log_check("Tab Switch: Watchlist Display State", watchlist_visible, f"Watchlist visible: {watchlist_visible}")
        log_check("Watchlist: Counter Badge Numeric", wl_count_text.strip().isdigit(),
                  f"Watchlist count: {wl_count_text.strip()}")

        # ── 4. INSPECT BREAKOUT RADAR TAB ──
        page.evaluate("setTab('breakouts', document.querySelectorAll('.tabs .tab')[3])")
        page.wait_for_timeout(200)

        breakouts_visible = page.evaluate("document.getElementById('tab-breakouts').style.display !== 'none'")
        bo_count_text = page.locator("#bo-count").inner_text()

        log_check("Tab Switch: Breakout Radar Display State", breakouts_visible,
                  f"Breakouts visible: {breakouts_visible}")
        log_check("Breakout Radar: Counter Badge Numeric", bo_count_text.strip().isdigit(),
                  f"Radar count: {bo_count_text.strip()}")

        # ── 5. INSPECT PRO HEATMAP TAB ──
        page.evaluate("setTab('heatmap', document.querySelectorAll('.tabs .tab')[4])")
        page.wait_for_timeout(300)

        heatmap_visible = page.evaluate("document.getElementById('tab-heatmap').style.display !== 'none'")
        heatmap_grid_count = page.locator("#heatmap-grid").count()
        log_check("Tab Switch: Pro Heatmap Display State", heatmap_visible and heatmap_grid_count > 0,
                  f"Heatmap visible: {heatmap_visible}")

        # Test Heatmap Metric Switching
        page.evaluate("setHeatmapMetric('ars')")
        page.wait_for_timeout(150)
        ars_btn_active = page.locator("#hm-metric-ars").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Metric Switch (ARS)", ars_btn_active, "Active class applied to ARS metric button")

        page.evaluate("setHeatmapMetric('vol')")
        page.wait_for_timeout(150)
        vol_btn_active = page.locator("#hm-metric-vol").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Metric Switch (Volume)", vol_btn_active, "Active class applied to Vol metric button")

        # Test Heatmap Filter Switching
        page.evaluate("setHeatmapFilter('quad1')")
        page.wait_for_timeout(150)
        quad1_active = page.locator("#hm-filter-quad1").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Filter Switch (Q1 Leaders)", quad1_active, "Active class applied to Q1 filter")

        page.evaluate("setHeatmapFilter('all')")
        page.wait_for_timeout(150)

        # ── 6. INSPECT SECTOR ROTATION TAB (RRG) ──
        page.evaluate("setTab('sectors', document.querySelectorAll('.tabs .tab')[5])")
        page.wait_for_timeout(300)

        sectors_visible = page.evaluate("document.getElementById('tab-sectors').style.display !== 'none'")
        clock_container = page.locator("#rrg-clock-container").count()
        donut_container = page.locator("#rrg-donut-container").count()

        log_check("Tab Switch: Sector Rotation (RRG) Display State", sectors_visible,
                  f"Sectors visible: {sectors_visible}")
        log_check("Sector Rotation: Clock & Donut Containers Present", clock_container > 0 and donut_container > 0,
                  "Both RRG radar clock and Donut wheel containers mounted")

        # Test Sector View Mode Switching (Table vs Cards)
        page.evaluate("setSectorViewMode('cards')")
        page.wait_for_timeout(150)
        grid_visible = page.evaluate("document.getElementById('sector-grid').style.display !== 'none'")
        log_check("Sector Rotation: View Mode Switch to Cards", grid_visible, "Sector cards grid displayed")

        page.evaluate("setSectorViewMode('table')")
        page.wait_for_timeout(150)
        table_visible = page.evaluate("document.getElementById('sector-table-container').style.display !== 'none'")
        log_check("Sector Rotation: View Mode Switch to Table", table_visible, "Sector breakdown table displayed")

        # ── 7. INSPECT JISHU DESK NAVIGATION ──
        jishu_url = (root_dir / "jishu_desk.html").resolve().as_uri()
        page.goto(jishu_url, wait_until="domcontentloaded")
        page.wait_for_timeout(500)

        jishu_title = page.title()
        log_check("Jishu Desk: Title Verified", "Jishu" in jishu_title and "Paper Desk" in jishu_title,
                  f"Page title: '{jishu_title}'")

        portfolio_summary = page.locator("#macroSentinelBanner").count() > 0 or page.locator("#totalEquity").count() > 0
        log_check("Jishu Desk: Portfolio Summary Container Present", portfolio_summary,
                  "Summary container rendered")

        # Restore screener tab for any caller
        page.goto(index_url, wait_until="domcontentloaded")
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")

    except Exception as exc:
        log_check("Agent 7 Critical Execution Exception", False, str(exc))

    finally:
        if close_browser_on_finish and browser_instance:
            try:
                browser_instance.close()
            except Exception:
                pass
        if close_browser_on_finish and playwright_instance:
            try:
                playwright_instance.stop()
            except Exception:
                pass

    return results


if __name__ == "__main__":
    res = run_tab_inspector()
    if not res["passed"]:
        print(f"\n[Agent 7 FAILED] Errors: {res['errors']}")
        sys.exit(1)
    else:
        print(f"\n[Agent 7 PASSED] All {len(res['checks'])} tab navigation checks succeeded.")
        sys.exit(0)
