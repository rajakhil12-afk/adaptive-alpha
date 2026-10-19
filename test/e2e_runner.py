#!/usr/bin/env python3
"""
=============================================================================
ADAPTIVE ALPHA 4-PILLAR ARCHITECTURE — UNIFIED E2E TEST RUNNER
=============================================================================
Executes the complete test pyramid across all tiers and acceptance suites:
1. Acceptance Suites:
   - test_browser.py: Static HTML smoke tests, SRI, duplicate IDs, asset paths
   - test/jishu_test.py: Jishu Desk engine math, invariants, screener sanity
2. Tier 1: Feature Coverage (R1-R5 features in isolation)
3. Tier 2: Boundary & Corner Cases (empty, extreme, zero/negative, edge bounds)
4. Tier 3: Cross-Feature Interactions (multi-pillar synergy & override rules)
5. Tier 4: Real-World Application Scenarios (end-to-end trading workflows)

Outputs unified test metrics and exits with code 0 on complete pass.
=============================================================================
"""

import sys
import os
import time
import unittest
import importlib
from pathlib import Path

# Fix stdout encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
TEST_DIR = ROOT_DIR / 'test'
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(TEST_DIR) not in sys.path:
    sys.path.insert(0, str(TEST_DIR))

# ANSI Color Codes for terminal formatting
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


class CustomTestResult(unittest.TestResult):
    """Custom TestResult collecting detailed execution statistics."""
    def __init__(self):
        super().__init__()
        self.success_count = 0

    def addSuccess(self, test):
        super().addSuccess(test)
        self.success_count += 1


class JishuAcceptanceTestCase(unittest.TestCase):
    """Adapts test/jishu_test.py functions into the unittest harness for unified reporting."""
    def setUp(self):
        # Ensure working directory is ROOT_DIR
        os.chdir(str(ROOT_DIR))
        try:
            import jishu_test
            self.jishu = jishu_test
        except ImportError:
            from test import jishu_test
            self.jishu = jishu_test

    def test_jishu_engine_logic(self):
        """Acceptance: Jishu Engine targets & trailing stop math."""
        self.jishu.test_jishu_logic()

    def test_jishu_position_sizer_engine(self):
        """Acceptance: Real Node.js position sizer verification (or skip)."""
        self.jishu.test_position_sizer_real_engine()

    def test_jishu_portfolio_invariants(self):
        """Acceptance: Stored jishu_portfolio.json arithmetic consistency."""
        self.jishu.test_portfolio_data_invariants()

    def test_screener_json_data_sanity(self):
        """Acceptance: screener.json sanity & symbol integrity."""
        self.jishu.test_screener_data_sanity()


def run_test_suite_module(name, suite_or_module):
    """Runs a single test suite and returns execution metrics."""
    loader = unittest.defaultTestLoader
    if isinstance(suite_or_module, unittest.TestSuite):
        suite = suite_or_module
    elif isinstance(suite_or_module, type) and issubclass(suite_or_module, unittest.TestCase):
        suite = loader.loadTestsFromTestCase(suite_or_module)
    else:
        suite = loader.loadTestsFromModule(suite_or_module)

    result = CustomTestResult()
    start_time = time.perf_counter()
    suite.run(result)
    elapsed = time.perf_counter() - start_time

    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped)
    passed = result.success_count

    status = "PASS" if (failures == 0 and errors == 0) else "FAIL"
    return {
        'name': name,
        'status': status,
        'total': total,
        'passed': passed,
        'failures': failures,
        'errors': errors,
        'skipped': skipped,
        'elapsed': elapsed,
        'failure_details': result.failures + result.errors
    }


def main():
    print(f"\n{BOLD}{CYAN}{'═' * 78}{RESET}")
    print(f"{BOLD}{CYAN}   ADAPTIVE ALPHA 4-PILLAR ARCHITECTURE — UNIFIED E2E TEST RUNNER{RESET}")
    print(f"{BOLD}{CYAN}{'═' * 78}{RESET}\n")

    suites_to_run = []

    # 1. Acceptance Suites
    try:
        import test_browser
        suites_to_run.append(("Acceptance: Browser & SRI Smoke Tests", test_browser))
    except Exception as e:
        print(f"{RED}[ERROR] Failed to load test_browser: {e}{RESET}")

    suites_to_run.append(("Acceptance: Jishu Engine Validation", JishuAcceptanceTestCase))

    # 2. Tier 1 to Tier 4 Suites
    tier_modules = [
        ("Tier 1: Feature Coverage (R1-R5)", ["test_tier1_features", "test.test_tier1_features"]),
        ("Tier 2: Boundary & Corner Cases", ["test_tier2_boundaries", "test.test_tier2_boundaries"]),
        ("Tier 3: Cross-Feature Interactions", ["test_tier3_interactions", "test.test_tier3_interactions"]),
        ("Tier 4: Real-World Application Scenarios", ["test_tier4_scenarios", "test.test_tier4_scenarios"])
    ]

    for title, mod_names in tier_modules:
        mod = None
        last_err = None
        for name in mod_names:
            try:
                mod = importlib.import_module(name)
                break
            except Exception as e:
                last_err = e
        if mod is not None:
            suites_to_run.append((title, mod))
        else:
            print(f"{RED}[ERROR] Failed to load {title}: {last_err}{RESET}")

    # Execute all suites and aggregate metrics
    results = []
    grand_total = 0
    grand_passed = 0
    grand_failed = 0
    grand_skipped = 0
    total_start = time.perf_counter()

    for title, mod in suites_to_run:
        sys.stdout.write(f"  • Running {title:48} ... ")
        sys.stdout.flush()
        res = run_test_suite_module(title, mod)
        results.append(res)
        grand_total += res['total']
        grand_passed += res['passed']
        grand_failed += (res['failures'] + res['errors'])
        grand_skipped += res['skipped']

        if res['status'] == 'PASS':
            print(f"{GREEN}[PASS]{RESET} ({res['total']} tests in {res['elapsed']:.2f}s)")
        else:
            print(f"{RED}[FAIL]{RESET} ({res['failures']} fail, {res['errors']} err)")

    total_elapsed = time.perf_counter() - total_start

    # Print Summary Table
    print(f"\n{BOLD}{'─' * 78}{RESET}")
    print(f"{BOLD}{'TEST SUITE EXECUTION SUMMARY':^78}{RESET}")
    print(f"{BOLD}{'─' * 78}{RESET}")
    print(f"{'Suite / Tier':<44} | {'Status':<6} | {'Count':<5} | {'Pass':<5} | {'Fail':<4} | {'Time'}")
    print(f"{'─' * 44}-+-{'─' * 6}-+-{'─' * 5}-+-{'─' * 5}-+-{'─' * 4}-+-{'─' * 6}")

    for r in results:
        status_color = GREEN if r['status'] == 'PASS' else RED
        status_str = f"{status_color}{r['status']}{RESET}"
        print(f"{r['name']:<44} | {status_str:<15} | {r['total']:<5} | {r['passed']:<5} | {r['failures'] + r['errors']:<4} | {r['elapsed']:.2f}s")

    print(f"{BOLD}{'─' * 78}{RESET}")
    overall_status = f"{GREEN}ALL SUITES PASSED{RESET}" if grand_failed == 0 else f"{RED}SUITES FAILED{RESET}"
    print(f"Total Tests : {BOLD}{grand_total}{RESET}")
    print(f"Passed      : {GREEN}{grand_passed}{RESET}")
    print(f"Failed      : {RED if grand_failed > 0 else GREEN}{grand_failed}{RESET}")
    print(f"Skipped     : {YELLOW}{grand_skipped}{RESET}")
    print(f"Duration    : {total_elapsed:.2f}s")
    print(f"Final Status: {BOLD}{overall_status}{RESET}")
    print(f"{BOLD}{'═' * 78}{RESET}\n")

    # If any failures occurred, print details
    if grand_failed > 0:
        print(f"\n{RED}{BOLD}=== FAILURE DETAILS ==={RESET}")
        for r in results:
            if r['failure_details']:
                print(f"\n{YELLOW}Suite: {r['name']}{RESET}")
                for test, trace in r['failure_details']:
                    print(f"  {RED}FAILED:{RESET} {test}")
                    print(f"  {trace}\n")
        sys.exit(1)

    sys.exit(0)


if __name__ == '__main__':
    main()
