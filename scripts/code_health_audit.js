const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const nodeBin = process.execPath;

const report = {
  timestamp: new Date().toISOString(),
  passed: true,
  checks: [],
  errors: [],
  warnings: []
};

function logCheck(name, success, details = '') {
  report.checks.push({ name, success, details });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ` — ${details}` : ''}`);
  if (!success) {
    report.passed = false;
    report.errors.push(`${name}: ${details}`);
  }
}

// ── CHECK 1: Full Recursive JavaScript Syntax Check ──
console.log('\n--- 1. JAVASCRIPT SYNTAX & COMPILATION ---');
function checkJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        checkJsFiles(fullPath);
      }
    } else if (entry.name.endsWith('.js')) {
      const relPath = path.relative(rootDir, fullPath);
      try {
        const code = fs.readFileSync(fullPath, 'utf8');
        new vm.Script(code, { filename: fullPath });
        logCheck(`Syntax: ${relPath}`, true);
      } catch (err) {
        logCheck(`Syntax: ${relPath}`, false, err.message);
      }
    }
  }
}
checkJsFiles(rootDir);

// ── CHECK 2: JSON Files Integrity & Schema Validation ──
console.log('\n--- 2. JSON DATA INTEGRITY & SANITY ---');
const jsonFiles = [
  'package.json',
  'data/screener.json',
  'data/jishu_portfolio.json',
  'data/breakout_history.json',
  'data/logo_ids.json'
];

jsonFiles.forEach(rel => {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) {
    logCheck(`JSON Exists: ${rel}`, false, 'File not found');
    return;
  }
  try {
    const content = fs.readFileSync(full, 'utf8');
    const parsed = JSON.parse(content);
    logCheck(`JSON Parse: ${rel}`, true, `Valid (${Object.keys(parsed).length} keys)`);

    if (rel === 'data/screener.json') {
      if (!Array.isArray(parsed.stocks)) {
        logCheck('screener.json schema', false, 'Missing stocks array');
      } else {
        const nanStocks = parsed.stocks.filter(s => isNaN(s.price) || isNaN(s.ars));
        if (nanStocks.length > 0) {
          logCheck('screener.json numerical sanity', false, `Found ${nanStocks.length} stocks with NaN price/ARS`);
        } else {
          logCheck('screener.json numerical sanity', true, `All ${parsed.stocks.length} stocks have valid numbers`);
        }
      }
    }

    if (rel === 'data/jishu_portfolio.json') {
      if (!parsed.account || typeof parsed.account.total_equity !== 'number') {
        logCheck('jishu_portfolio.json schema', false, 'Missing or invalid account equity structure');
      } else {
        logCheck('jishu_portfolio.json schema', true, `Equity: ₹${parsed.account.total_equity.toLocaleString('en-IN')}`);
      }
    }
  } catch (err) {
    logCheck(`JSON Parse: ${rel}`, false, err.message);
  }
});

// ── CHECK 3: Unit Test Suite Execution ──
console.log('\n--- 3. TEST SUITE EXECUTION ---');
try {
  execSync(`"${nodeBin}" --test test/indicators.test.js`, { cwd: rootDir, stdio: 'pipe' });
  logCheck('Node Unit Tests (indicators.test.js)', true, 'All mathematical indicator tests passed');
} catch (err) {
  logCheck('Node Unit Tests (indicators.test.js)', false, err.stderr ? err.stderr.toString() : err.message);
}

// ── CHECK 4: HTML Assets & Script Reference Verification ──
console.log('\n--- 4. HTML SCRIPT & ASSET DEPENDENCIES ---');
const htmlFiles = ['index.html', 'landing.html', 'jishu_desk.html', 'preset_playbook.html', 'user_guide.html'];

htmlFiles.forEach(htmlFile => {
  const fullHtml = path.join(rootDir, htmlFile);
  if (!fs.existsSync(fullHtml)) {
    logCheck(`HTML Exists: ${htmlFile}`, false, 'File missing');
    return;
  }
  const htmlContent = fs.readFileSync(fullHtml, 'utf8');

  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const src = match[1];
    if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
      const scriptPath = path.join(rootDir, src.split('?')[0]);
      if (!fs.existsSync(scriptPath)) {
        logCheck(`${htmlFile} -> script: ${src}`, false, 'Script file does not exist locally');
      } else {
        logCheck(`${htmlFile} -> script: ${src}`, true);
      }
    }
  }

  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const href = match[1];
    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//') && href.endsWith('.css')) {
      const cssPath = path.join(rootDir, href.split('?')[0]);
      if (!fs.existsSync(cssPath)) {
        logCheck(`${htmlFile} -> stylesheet: ${href}`, false, 'CSS file missing');
      } else {
        logCheck(`${htmlFile} -> stylesheet: ${href}`, true);
      }
    }
  }
});

// ── CHECK 5: Indicator Mathematical Edge Cases ──
console.log('\n--- 5. MATHEMATICAL ENGINE EDGE CASE STRESS TEST ---');
try {
  const { calcSupertrend, calcARS, calcMansfieldRS, calcVCP, calcPocketPivot, calcIchimoku } = require('../js/indicators');

  const emptyRes = calcSupertrend([], 10, 3);
  logCheck('Supertrend empty candle array safety', emptyRes && emptyRes.val === 0);

  const singleCandle = [{ t: 1600000000, o: 100, h: 105, l: 95, c: 102, v: 1000 }];
  const singleRes = calcSupertrend(singleCandle, 10, 3);
  logCheck('Supertrend single candle fallback safety', singleRes && singleRes.trend === 'sell');

  const flatCandles = Array.from({ length: 60 }, (_, i) => ({ t: 1600000000 + i * 86400, o: 100, h: 100, l: 100, c: 100, v: 0 }));
  const vcpFlat = calcVCP(flatCandles);
  logCheck('VCP flat price & 0 volume safety', vcpFlat && typeof vcpFlat.is_vcp === 'boolean');

  const ppFlat = calcPocketPivot(flatCandles);
  logCheck('Pocket pivot zero volume safety', ppFlat === false);

  const ichiFlat = calcIchimoku(flatCandles);
  logCheck('Ichimoku flat price safety', ichiFlat && !isNaN(ichiFlat.tenkan));
} catch (mathErr) {
  logCheck('Mathematical edge cases', false, mathErr.message);
}

// ── AUDIT SUMMARY ──
console.log('\n========================================');
if (report.passed) {
  console.log('🎉 AUDIT COMPLETE: 0 ERRORS FOUND. REPOSITORY HEALTHY.');
  console.log(`Checked ${report.checks.length} items successfully.`);
} else {
  console.error(`💥 AUDIT FAILED: ${report.errors.length} ERRORS DETECTED!`);
  report.errors.forEach(e => console.error(`  - ${e}`));
}
console.log('========================================\n');

if (!report.passed) {
  process.exit(1);
}
