/* ═══════════════════════════════════════════════════════════════
   ADAPTIVE ALPHA — PHASE 6 UI HELPERS
   Load AFTER js/app.js (see the last <script> tags in index.html).
   Self-contained: each block is wrapped so one failure cannot break
   the others or the main app.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); };
  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }
  function guard(label, fn) {
    try { fn(); } catch (e) { try { console.warn('[ui.js] ' + label + ':', e); } catch (_) {} }
  }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }
  function raf(fn) { (window.requestAnimationFrame || setTimeout)(fn, 16); }

  /* ── 1. EXPORT MENU ─────────────────────────────────────────── */
  guard('export menu', function () {
    var menu = $('#export-menu'), btn = $('#export-trigger'), pop = $('#export-pop');
    if (!menu || !btn || !pop) return;

    function setOpen(open) {
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    }
    window.toggleExportMenu = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      setOpen(pop.hidden);
      if (!pop.hidden) { var first = $('button', pop); if (first) first.focus(); }
    };
    document.addEventListener('click', function (e) {
      if (pop.hidden) return;
      if (!menu.contains(e.target)) setOpen(false);
      else if (e.target.closest && e.target.closest('.export-pop button')) setTimeout(function () { setOpen(false); }, 0);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { setOpen(false); btn.focus(); }
    });
  });

  /* ── 2. FILTERS: collapsible panel + active-filter pills ───── */
  guard('filters', function () {
    var panel = $('#filter-panel'), toggle = $('#filters-toggle');
    var active = $('#active-filters'), count = $('#filters-count');
    if (!panel || !toggle || !active || !count) return;

    function setOpen(open, remember) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (remember !== false) store('aa_filters_open', open ? '1' : '0');
    }
    window.toggleFilterPanel = function () { setOpen(panel.hidden); };
    setOpen(store('aa_filters_open') === '1', false);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden && panel.contains(document.activeElement)) { setOpen(false); toggle.focus(); }
    });

    function labelOf(chip) {
      var c = chip.cloneNode(true);
      $$('.info-icon', c).forEach(function (n) { n.parentNode.removeChild(n); });
      c.removeAttribute('id');
      $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
      return { html: c.innerHTML.trim(), text: c.textContent.replace(/\s+/g, ' ').trim() };
    }

    function render() {
      var on = $$('.chip.on', panel);
      count.textContent = String(on.length);
      count.setAttribute('data-zero', on.length ? 'false' : 'true');
      active.innerHTML = '';

      if (!on.length) {
        var none = document.createElement('span');
        none.className = 'af-empty';
        none.textContent = 'No filters \u2014 showing all stocks';
        active.appendChild(none);
        return;
      }
      on.forEach(function (chip) {
        var l = labelOf(chip), b = document.createElement('button');
        b.type = 'button';
        b.className = 'af-pill';
        b.title = 'Remove filter';
        b.setAttribute('aria-label', 'Remove filter: ' + l.text);
        b.innerHTML = l.html + '<span class="af-x" aria-hidden="true">' + ic('x') + '</span>';
        b.addEventListener('click', function () { chip.click(); });   // reuses the chip's own onclick
        active.appendChild(b);
      });
      if (on.length > 1) {
        var clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'af-clear';
        clear.textContent = 'Clear all';
        clear.addEventListener('click', function () {
          $$('.chip.on', panel).forEach(function (chip) { chip.click(); });
        });
        active.appendChild(clear);
      }
    }

    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      raf(function () { pending = false; render(); });
    }
    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(panel, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    render();
  });

  /* ── 3. ICON REPAINT for buttons whose text app.js rewrites ──── */
  guard('icon repaint', function () {
    var LEAD = { '\uD83C\uDF19': 'moon', '\u2600': 'sun', '\uD83C\uDFA8': 'palette', '\uD83D\uDCE5': 'download', '\uD83D\uDCCB': 'clipboard-copy' };
    var RX = /^\s*(\uD83C\uDF19|\u2600|\uD83C\uDFA8|\uD83D\uDCE5|\uD83D\uDCCB)\uFE0F?\s*/;

    function leadingEmoji(el) {
      var node = el.firstChild;
      if (!node || node.nodeType !== 3) return;
      var m = RX.exec(node.nodeValue);
      if (!m) return;
      var rest = node.nodeValue.slice(m[0].length);
      var tmp = document.createElement('span');
      tmp.innerHTML = ic(LEAD[m[1]]);
      el.insertBefore(tmp.firstChild, node);
      node.nodeValue = rest ? ' ' + rest : '';
    }

    // theme toggle: draw sun/moon from the actual theme, whatever app.js writes into the button
    var themeBtn = $('#theme-toggle');
    function paintTheme() {
      if (!themeBtn) return;
      var light = document.body.classList.contains('light-theme') || document.documentElement.classList.contains('light-theme');
      var want = light ? 'sun' : 'moon', cur = $('use', themeBtn);
      if (cur && cur.getAttribute('href') === '#i-' + want && !themeBtn.textContent.trim()) return;
      themeBtn.innerHTML = ic(want);
    }
    if (themeBtn) {
      paintTheme();
      if (window.MutationObserver) {
        new MutationObserver(paintTheme).observe(themeBtn, { childList: true, characterData: true, subtree: true });
        new MutationObserver(paintTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(paintTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
    }

    // export-menu items: app.js may reset their label (e.g. after "Copied!") with the old emoji
    ['#share-card-btn', '#export-btn', '#share-btn', '#tv-watchlist-btn'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      leadingEmoji(el);
      if (window.MutationObserver) {
        new MutationObserver(function () { leadingEmoji(el); }).observe(el, { childList: true, characterData: true, subtree: true });
      }
    });
  });

  /* ── 4. SKELETON SAFETY NET ─────────────────────────────────── */
  // The skeleton rows are plain HTML inside #tbl-body and vanish when renderTable()
  // replaces its content. If nothing has rendered after 25s, say so instead of shimmering forever.
  guard('skeleton timeout', function () {
    setTimeout(function () {
      var body = $('#tbl-body');
      if (!body || !$('.skel-row', body)) return;
      if ($('.tbl-row:not(.skel-row)', body)) {          // real rows exist: just drop leftover placeholders
        $$('.skel-row', body).forEach(function (n) { n.parentNode.removeChild(n); });
        return;
      }
      body.innerHTML = '<div class="empty">Market data is taking longer than expected. ' +
        '<button type="button" onclick="location.reload()">Retry</button></div>';
    }, 25000);
  });

  /* ── 5. PRO TRADER KEYBOARD NAVIGATION ────────────────────────── */
  guard('keyboard navigation', function () {
    document.addEventListener('keydown', function (e) {
      // 1. Check document.activeElement: ignore keystrokes if inside INPUT, TEXTAREA, SELECT, or isContentEditable
      var activeEl = document.activeElement;
      var tag = (activeEl && activeEl.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (activeEl && activeEl.isContentEditable)) {
        return;
      }

      var key = e.key;
      var modal = $('#stock-modal');
      var isModalOpen = modal && modal.classList.contains('open');

      // 2. If modal #stock-modal is open: Escape closes modal, T/t opens TradingView for current modal stock
      if (isModalOpen) {
        if (key === 'Escape' || key === 'Esc') {
          if (typeof closeModal === 'function') closeModal();
        } else if (key === 't' || key === 'T') {
          var targetSym = (typeof selectedSym !== 'undefined' && selectedSym) || (modal.querySelector('#m-sym') ? modal.querySelector('#m-sym').textContent.trim() : null);
          if (targetSym && typeof openTV === 'function') openTV(targetSym);
        }
        return;
      }

      // 3. Row cycling across table rows (#tbl-body .tbl-row:not(.skel-row))
      var rows = $$('#tbl-body .tbl-row:not(.skel-row)');
      if (!rows.length) return;

      var curIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].classList.contains('selected') || (typeof selectedSym !== 'undefined' && selectedSym && rows[i].getAttribute('data-sym') === selectedSym)) {
          curIdx = i;
          break;
        }
      }

      function highlightAndSelectRow(idx) {
        if (idx < 0) idx = 0;
        if (idx >= rows.length) idx = rows.length - 1;
        for (var j = 0; j < rows.length; j++) {
          var isCurrent = (j === idx);
          rows[j].classList.toggle('selected', isCurrent);
          if (isCurrent) {
            rows[j].style.borderLeftColor = 'var(--up)';
          } else {
            rows[j].style.borderLeftColor = '';
          }
        }
        var sym = rows[idx].getAttribute('data-sym');
        if (sym) {
          if (typeof selectedSym !== 'undefined') {
            selectedSym = sym;
          }
          window.selectedSym = sym;
          if (typeof rows[idx].scrollIntoView === 'function') {
            rows[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }

      // J or ArrowDown: advance to next row
      if (key === 'j' || key === 'J' || key === 'ArrowDown') {
        e.preventDefault();
        var nextIdx = curIdx === -1 ? 0 : Math.min(rows.length - 1, curIdx + 1);
        highlightAndSelectRow(nextIdx);
      }
      // K or ArrowUp: decrement to previous row
      else if (key === 'k' || key === 'K' || key === 'ArrowUp') {
        e.preventDefault();
        var prevIdx = curIdx === -1 ? 0 : Math.max(0, curIdx - 1);
        highlightAndSelectRow(prevIdx);
      }
      // Space: toggle watchlist star via togglePin(selectedSym) and update star element inline
      else if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        var symToToggle = (typeof selectedSym !== 'undefined' && selectedSym) || (curIdx >= 0 && rows[curIdx] && rows[curIdx].getAttribute('data-sym')) || rows[0].getAttribute('data-sym');
        if (symToToggle && typeof togglePin === 'function') {
          var wasOpen = isModalOpen;
          togglePin(symToToggle);
          if (!wasOpen && typeof closeModal === 'function') {
            closeModal();
          }
          var updatedRows = $$('#tbl-body .tbl-row:not(.skel-row)');
          var targetRow = (curIdx >= 0 && updatedRows[curIdx]) ? updatedRows[curIdx] : $('#tbl-body .tbl-row[data-sym="' + symToToggle + '"]');
          if (targetRow) {
            targetRow.classList.add('selected');
            targetRow.style.borderLeftColor = 'var(--up)';
            var star = targetRow.querySelector('.pin-star');
            if (star) {
              var isPinned = (typeof pinnedStocks !== 'undefined' && Array.isArray(pinnedStocks)) ? (pinnedStocks.indexOf(symToToggle) !== -1) : false;
              star.textContent = isPinned ? '★' : '☆';
              star.classList.toggle('pinned', isPinned);
              star.setAttribute('title', isPinned ? 'Remove from Watchlist' : 'Add to Watchlist');
            }
          }
        }
      }
      // Enter: open stock detail modal for currently selected row
      else if (key === 'Enter') {
        var symToOpen = (typeof selectedSym !== 'undefined' && selectedSym) || (curIdx >= 0 && rows[curIdx] && rows[curIdx].getAttribute('data-sym')) || rows[0].getAttribute('data-sym');
        if (symToOpen && typeof openStockModal === 'function') {
          openStockModal(symToOpen);
        }
      }
      // T or t: open stock chart on TradingView in a new tab
      else if (key === 't' || key === 'T') {
        var symForTV = (typeof selectedSym !== 'undefined' && selectedSym) || (curIdx >= 0 && rows[curIdx] && rows[curIdx].getAttribute('data-sym')) || rows[0].getAttribute('data-sym');
        if (symForTV && typeof openTV === 'function') {
          openTV(symForTV);
        }
      }
    });
  });
})();

