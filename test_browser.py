"""Static smoke test for the Adaptive Alpha front-end (stdlib only, no browser needed).

Run:  python -m unittest test_browser -v

Checks, for every top-level *.html file:
  1. every local <script src>/<link href>/<a href> target exists on disk
  2. no duplicate element ids
  3. every document.getElementById('x') in inline <script> blocks has a matching id
  4. every external script has an integrity= attribute (supply-chain safety)
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = sorted(ROOT.glob("*.html"))
DATA_URI = re.compile(r"data:[^\"')]+")


def read(p):
    return DATA_URI.sub("DATAURI", p.read_text(encoding="utf-8"))


class StaticSmokeTest(unittest.TestCase):
    def test_pages_found(self):
        self.assertTrue(PAGES, "no *.html files found next to test_browser.py")

    def test_local_references_exist(self):
        for page in PAGES:
            html = read(page)
            for ref in re.findall(r'(?:src|href)=["\']([^"\'#?]+)', html):
                if re.match(r"(https?:|//|mailto:|tel:|javascript:|DATAURI)", ref):
                    continue
                with self.subTest(page=page.name, ref=ref):
                    self.assertTrue((ROOT / ref).exists(), f"{page.name} references missing file {ref}")

    def test_no_duplicate_ids(self):
        for page in PAGES:
            ids = re.findall(r'\bid=["\']([^"\']+)["\']', read(page))
            dupes = {i for i in ids if ids.count(i) > 1}
            with self.subTest(page=page.name):
                self.assertFalse(dupes, f"duplicate ids in {page.name}: {dupes}")

    def test_get_element_by_id_targets_exist(self):
        for page in PAGES:
            html = read(page)
            ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))
            refs = set(re.findall(r'getElementById\(\s*["\']([^"\']+)["\']\s*\)', html))
            with self.subTest(page=page.name):
                self.assertFalse(refs - ids, f"{page.name}: missing ids {sorted(refs - ids)}")

    def test_external_scripts_have_sri(self):
        # Third-party widgets that cannot be pinned are allow-listed explicitly.
        allow = ("cdn-static.trendlyne.com",)
        for page in PAGES:
            for tag in re.findall(r"<script[^>]*\bsrc=[\"']https?://[^>]*>", read(page)):
                if any(a in tag for a in allow):
                    continue
                with self.subTest(page=page.name, tag=tag[:80]):
                    self.assertIn("integrity=", tag)


if __name__ == "__main__":
    unittest.main()
