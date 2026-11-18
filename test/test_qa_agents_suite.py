"""
Adaptive Alpha — Omniscient QA & Bug Hunter Multi-Agent Test Suite
=============================================================================
Integrates Agent 7 (Tab Inspector), Agent 8 (Filter Sentinel),
Agent 9 (FII/DII Verifier), and Agent 10 (Omniscient Chief Inspector) into
the Python unittest test pyramid and e2e_runner.py.
=============================================================================
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.omniscient_qa_agent import run_omniscient_qa_audit


class TestOmniscientQASquad(unittest.TestCase):
    """Executes the complete multi-agent QA squad under unittest harness."""

    @classmethod
    def setUpClass(cls):
        cls.report = run_omniscient_qa_audit(root_dir=ROOT_DIR, headless=True)

    def test_01_overall_audit_clean_pass(self):
        """[Agent 10] Chief Inspector: Overall audit clean pass with zero errors."""
        self.assertTrue(self.report["passed"], f"QA Squad detected errors: {self.report.get('errors')}")
        self.assertEqual(len(self.report["errors"]), 0, f"Unresolved errors: {self.report.get('errors')}")
        self.assertGreaterEqual(self.report["passed_checks"], 90, "Expected at least 90 passed checks")

    def test_02_tab_inspector_sub_agent(self):
        """[Agent 7] Tab & Navigation Inspector: All tabs, containers, and Jishu desk."""
        a7 = self.report["sub_agents"].get("agent_7", {})
        self.assertTrue(a7.get("passed", False), f"Agent 7 errors: {a7.get('errors')}")
        self.assertGreaterEqual(len(a7.get("checks", [])), 15, "Expected at least 15 tab checks")

    def test_03_filter_sentinel_sub_agent(self):
        """[Agent 8] Filter & Preset Sentinel: 6 presets, 8 themes, 23 chips, 12 sorts, search."""
        a8 = self.report["sub_agents"].get("agent_8", {})
        self.assertTrue(a8.get("passed", False), f"Agent 8 errors: {a8.get('errors')}")
        self.assertGreaterEqual(len(a8.get("checks", [])), 45, "Expected at least 45 filter checks")

    def test_04_fii_dii_verifier_sub_agent(self):
        """[Agent 9] Institutional & FII/DII Data Verifier: JSON feeds, macro sentinel, UI."""
        a9 = self.report["sub_agents"].get("agent_9", {})
        self.assertTrue(a9.get("passed", False), f"Agent 9 errors: {a9.get('errors')}")
        self.assertGreaterEqual(len(a9.get("checks", [])), 8, "Expected at least 8 FII/DII checks")

    def test_05_modals_position_calculator_and_canvas(self):
        """[Chief] Interactive Diagnostics: Stock modal cards, ATR Kelly calculator, canvas."""
        self.assertGreaterEqual(len(self.report["modal_checks"]), 5, "Expected at least 5 modal checks")
        all_passed = all(m.get("success", False) for m in self.report["modal_checks"])
        self.assertTrue(all_passed, "Expected all modal checks to pass")


if __name__ == "__main__":
    unittest.main()
