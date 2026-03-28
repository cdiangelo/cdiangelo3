// ── chevron-nav.js — Chevron navigation + bottom toolbar ──

(function(){
  const chevronNav = document.getElementById('chevronNav');
  if (!chevronNav) return;

  // ── Chevron expand/collapse ──
  document.querySelectorAll('.chevron-item').forEach(item => {
    const shape = item.querySelector('.chevron-shape');
    if (!shape) return;

    shape.addEventListener('click', () => {
      const target = item.dataset.target;

      // Executive Summary — navigate directly
      if (target === 'exec') {
        navigateToModule('exec');
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
      const parentTarget = sub.closest('.chevron-item').dataset.target; // 'budget' or 'forecast'

      // Store context so modules know if we're in budget vs forecast mode
      window.planContext = parentTarget;

      if (module === 'comp') {
        navigateToModule('comp');
      } else if (module === 'vendor') {
        navigateToModule('vendor');
      } else if (module === 'depreciation') {
        navigateToModule('depreciation');
      }
    });
  });

  function navigateToModule(module) {
    if (module === 'exec') {
      // Show exec view (inside appShell)
      if (window.showApp) window.showApp();
      // Ensure exec tab is active
      const execBtn = document.querySelector('#mainNav button[data-tab="exec"]');
      if (execBtn) execBtn.click();
    } else if (module === 'comp') {
      // Show comp planning (employees tab inside appShell)
      if (window.showApp) window.showApp();
      const empBtn = document.querySelector('#mainNav button[data-tab="employees"]');
      if (empBtn) empBtn.click();
    } else if (module === 'vendor') {
      if (window.showVendor) window.showVendor();
    } else if (module === 'depreciation') {
      if (window.showDepreciation) window.showDepreciation();
    }
  }

  // ── Bottom toolbar ──
  const bottomToolbar = document.getElementById('bottomToolbar');

  // Show/hide bottom toolbar when plan is open
  window._updateBottomToolbar = function() {
    if (!bottomToolbar) return;
    const planHeader = document.getElementById('planHeaderBar');
    const isInPlan = planHeader && planHeader.style.display !== 'none';
    bottomToolbar.style.display = isInPlan ? 'flex' : 'none';

    // Sync plan name/version
    const nameEl = document.getElementById('planHdrName');
    const badgeEl = document.getElementById('planHdrBadge');
    if (nameEl) {
      document.getElementById('btbPlanName').textContent = 'Name: ' + (nameEl.textContent || '');
    }
    if (badgeEl) {
      document.getElementById('btbPlanVersion').textContent = 'Version: ' + (badgeEl.textContent || '');
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
      // Toggle dark mode panel or open settings — for now toggle global toolbar visibility
      const toolbar = document.getElementById('globalToolbar');
      if (toolbar) {
        const isHidden = toolbar.style.display === 'none';
        toolbar.style.display = isHidden ? 'flex' : 'none';
        document.getElementById('globalToolbarSpacer').style.display = isHidden ? '' : 'none';
      }
    });
  }
})();
