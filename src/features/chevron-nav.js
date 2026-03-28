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
    const chevNav = document.getElementById('chevronNav');
    if (chevNav) chevNav.style.display = 'none';

    // Show appShell
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = '';
    if (window.renderAll) window.renderAll();
    if (window.renderPnlWalk) try { window.renderPnlWalk() } catch(e) {}
    if (window.renderLandingCharts) try { window.renderLandingCharts() } catch(e) {}

    // Default to Overview tab
    showOverviewTab();
    if (window._updateGlobalToolbar) window._updateGlobalToolbar();
  }

  function navigateToModule(module) {
    if (module === 'comp') {
      if (window.showApp) window.showApp();
      // Hide overview content, show employees tab
      if (sumContent) sumContent.style.display = 'none';
      const empBtn = document.querySelector('#mainNav button[data-tab="employees"]');
      if (empBtn) empBtn.click();
      // Update header
      const title = document.querySelector('#compHeaderBar .module-title');
      if (title) title.textContent = 'Compensation & Benefits';
      // Deactivate exec sub-nav
      if (overviewBtn) overviewBtn.classList.remove('active');
      if (compBtn) compBtn.classList.remove('active');
    } else if (module === 'vendor') {
      if (window.showVendor) window.showVendor();
    } else if (module === 'depreciation') {
      if (window.showDepreciation) window.showDepreciation();
    } else if (module === 'ltf') {
      if (window.showLtf) window.showLtf();
    }
  }

  // ── Exec Summary sub-nav: Overview vs Exec Comp ──
  const overviewBtn = document.getElementById('execSubOverview');
  const compBtn = document.getElementById('execSubComp');
  const sumContent = document.getElementById('landingSummaryContent');

  function showOverviewTab() {
    if (overviewBtn) overviewBtn.classList.add('active');
    if (compBtn) compBtn.classList.remove('active');
    // Show P&L summary, hide exec tab content
    if (sumContent) sumContent.style.display = '';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Update header title
    const title = document.querySelector('#compHeaderBar .module-title');
    if (title) title.textContent = 'Executive Summary';
  }

  function showExecCompTab() {
    if (compBtn) compBtn.classList.add('active');
    if (overviewBtn) overviewBtn.classList.remove('active');
    // Hide P&L summary, show exec tab
    if (sumContent) sumContent.style.display = 'none';
    const execTab = document.getElementById('tab-exec');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    if (execTab) execTab.classList.add('active');
    if (window.renderExecView) window.renderExecView();
    // Update header title
    const title = document.querySelector('#compHeaderBar .module-title');
    if (title) title.textContent = 'Executive Summary';
  }

  if (overviewBtn) overviewBtn.addEventListener('click', showOverviewTab);
  if (compBtn) compBtn.addEventListener('click', showExecCompTab);

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
      const panel = document.getElementById('settingsSlidePanel');
      if (panel) {
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
          panel.classList.remove('open');
          panel.style.transform = 'translateX(100%)';
        } else {
          panel.classList.add('open');
          panel.style.transform = 'translateX(0)';
        }
      }
    });
  }
})();
