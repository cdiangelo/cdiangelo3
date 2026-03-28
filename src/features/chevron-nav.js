// ── chevron-nav.js — Chevron navigation + bottom toolbar ──

(function(){
  const chevronNav = document.getElementById('chevronNav');
  if (!chevronNav) return;

  // ── Chevron expand/collapse with vertical reflow ──
  document.querySelectorAll('.chevron-item').forEach(item => {
    const shape = item.querySelector('.chevron-shape');
    if (!shape) return;

    shape.addEventListener('click', () => {
      const target = item.dataset.target;

      // Executive Summary — navigate directly
      if (target === 'exec') {
        navigateToExecSummary();
        return;
      }

      // Budget / Forecast — toggle submenu
      if (item.classList.contains('has-submenu')) {
        const wasExpanded = item.classList.contains('expanded');
        // Collapse all first
        document.querySelectorAll('.chevron-item.expanded').forEach(c => c.classList.remove('expanded'));
        if (!wasExpanded) {
          item.classList.add('expanded');
        }
      }
    });
  });

  // ── Sub-item clicks ──
  document.querySelectorAll('.chevron-sub-item').forEach(sub => {
    sub.addEventListener('click', () => {
      const module = sub.dataset.module;
      const parentTarget = sub.closest('.chevron-item').dataset.target;
      window.planContext = parentTarget;

      // Forecast sub-items all go to LTF module
      if (parentTarget === 'forecast') {
        navigateToModule('ltf');
        return;
      }

      if (module === 'comp') {
        navigateToModule('comp');
      } else if (module === 'vendor') {
        navigateToModule('vendor');
      } else if (module === 'depreciation') {
        navigateToModule('depreciation');
      }
    });
  });

  function navigateToExecSummary() {
    // Show landing summary content (P&L overview) + exec view inside appShell
    const chevNav = document.getElementById('chevronNav');
    const sumContent = document.getElementById('landingSummaryContent');
    if (chevNav) chevNav.style.display = 'none';
    if (sumContent) sumContent.style.display = '';

    // Also show appShell with exec tab
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = '';
    if (window.renderAll) window.renderAll();

    // Activate exec tab
    const execBtn = document.querySelector('#mainNav button[data-tab="exec"]');
    if (execBtn) execBtn.click();

    if (window._updateGlobalToolbar) window._updateGlobalToolbar();
  }

  function navigateToModule(module) {
    if (module === 'comp') {
      if (window.showApp) window.showApp();
      const empBtn = document.querySelector('#mainNav button[data-tab="employees"]');
      if (empBtn) empBtn.click();
    } else if (module === 'vendor') {
      if (window.showVendor) window.showVendor();
    } else if (module === 'depreciation') {
      if (window.showDepreciation) window.showDepreciation();
    } else if (module === 'ltf') {
      if (window.showLtf) window.showLtf();
    }
  }

  // ── Bottom toolbar ──
  const bottomToolbar = document.getElementById('bottomToolbar');

  window._updateBottomToolbar = function() {
    if (!bottomToolbar) return;
    const planHeader = document.getElementById('planHeaderBar');
    const isInPlan = planHeader && planHeader.style.display !== 'none';
    bottomToolbar.style.display = isInPlan ? 'flex' : 'none';

    const nameEl = document.getElementById('planHdrName');
    const badgeEl = document.getElementById('planHdrBadge');
    if (nameEl) {
      document.getElementById('btbPlanName').textContent = nameEl.textContent || '';
    }
    if (badgeEl) {
      document.getElementById('btbPlanVersion').textContent = badgeEl.textContent || '';
    }
    // Populate email from stored user
    const emailEl = document.getElementById('btbEmail');
    if (emailEl) {
      try {
        const raw = localStorage.getItem('compPlanUser');
        if (raw) {
          const u = JSON.parse(raw);
          emailEl.textContent = u.email || '';
        }
      } catch(e) {}
    }
  };

  // Wire toolbar buttons to existing slide panels
  const btbGuide = document.getElementById('btbGuide');
  const btbSettings = document.getElementById('btbSettings');
  const btbScenario = document.getElementById('btbScenario');
  const btbData = document.getElementById('btbData');

  if (btbGuide) {
    btbGuide.addEventListener('click', () => {
      const btn = document.getElementById('guideToggleBtn');
      if (btn) btn.click();
    });
  }
  if (btbScenario) {
    btbScenario.addEventListener('click', () => {
      const btn = document.getElementById('scenarioToggleBtn');
      if (btn) btn.click();
    });
  }
  if (btbData) {
    btbData.addEventListener('click', () => {
      const btn = document.getElementById('dataToggleBtn');
      if (btn) btn.click();
    });
  }
  if (btbSettings) {
    btbSettings.addEventListener('click', () => {
      const toolbar = document.getElementById('globalToolbar');
      if (toolbar) {
        const isHidden = toolbar.style.display === 'none';
        toolbar.style.display = isHidden ? 'flex' : 'none';
        document.getElementById('globalToolbarSpacer').style.display = isHidden ? '' : 'none';
      }
    });
  }
})();
