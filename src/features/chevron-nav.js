// ── chevron-nav.js — Chevron navigation + bottom toolbar ──

(function(){
  const chevronNav = document.getElementById('chevronNav');
  if (!chevronNav) return;

  // ── Chevron expand/collapse with vertical reflow ──
  document.querySelectorAll('.chevron-item').forEach(item => {
    const shape = item.querySelector('.chevron-shape');
    if (!shape) return;

    shape.addEventListener('click', () => {
      // All chevrons toggle submenu
      if (item.classList.contains('has-submenu')) {
        const wasExpanded = item.classList.contains('expanded');
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

      // Executive Summary sub-items
      if (parentTarget === 'exec') {
        if (module === 'exec-overview') navigateToExecSummary('overview');
        else if (module === 'exec-comp') navigateToExecSummary('comp');
        else if (module === 'exec-pivot') navigateToExecSummary('pivot');
        return;
      }

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

  // Show/hide the ← Plan back button
  function showBackToPlan(){
    const btn=document.getElementById('planBackToNav');
    if(btn)btn.style.display='';
  }

  // Wire ← Plan button
  const backToNavBtn=document.getElementById('planBackToNav');
  if(backToNavBtn){
    backToNavBtn.addEventListener('click',()=>{
      resetSubNavLabels();
      const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='none';
      if(window.showLanding)window.showLanding();
      if(window._showCalendar)window._showCalendar();
      backToNavBtn.style.display='none';
    });
  }

  function hideCalendar(){
    if(window._hideCalendar)window._hideCalendar();
  }

  function resetSubNavLabels(){
    if(overviewBtn){overviewBtn.textContent='Overview';overviewBtn.onclick=()=>showOverviewTab()}
    if(compBtn){compBtn.textContent='Exec Comp';compBtn.onclick=()=>showExecCompTab()}
    if(pivotBtn){pivotBtn.style.display='';pivotBtn.onclick=()=>showPivotTab()}
  }

  function navigateToExecSummary(tab) {
    // Hide ALL modules first to prevent spillover
    if (window.hideAllModules) window.hideAllModules();
    else {
      ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.style.display='none';
      });
    }
    showBackToPlan();
    hideCalendar();

    // Reset sub-nav labels to exec summary mode
    resetSubNavLabels();

    // Show header bar
    const headerBar = document.getElementById('compHeaderBar');
    if (headerBar) headerBar.style.display = '';

    // Show landing page (for chevron nav area) but hide chevron nav itself
    const landingPage = document.getElementById('landingPage');
    if (landingPage) landingPage.style.display = '';
    const chevNav = document.getElementById('chevronNav');
    if (chevNav) chevNav.style.display = 'none';

    // Render data
    if (window.renderAll) try{window.renderAll()}catch(e){}
    if (window.renderPnlWalk) try { window.renderPnlWalk() } catch(e) {}
    if (window.renderLandingCharts) try { window.renderLandingCharts() } catch(e) {}

    // Route to correct sub-tab
    if (tab === 'comp') showExecCompTab();
    else if (tab === 'pivot') showPivotTab();
    else showOverviewTab();

    if (window._updateGlobalToolbar) window._updateGlobalToolbar();
  }

  function navigateToModule(module) {
    showBackToPlan();
    hideCalendar();
    // Hide header bar when navigating to non-exec modules
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='none';
    if (module === 'comp') {
      if (window.showApp) window.showApp();
      // Show comp header bar with Exec Comp + Employees tabs
      if(hb)hb.style.display='';
      const title=document.querySelector('#compHeaderBar .module-title');
      if(title)title.textContent='Compensation & Benefits';
      if (sumContent) sumContent.style.display = 'none';
      // Update sub-nav to show Exec Comp + Employees
      if(overviewBtn)overviewBtn.textContent='Exec Comp';
      if(compBtn)compBtn.textContent='Employees';
      if(pivotBtn)pivotBtn.style.display='none';
      // Default to exec comp view
      clearExecSubNav();
      if(overviewBtn)overviewBtn.classList.add('active');
      const execTab=document.getElementById('tab-exec');
      if(execTab)execTab.classList.add('active');
      if(window.renderExecView)try{window.renderExecView()}catch(e){}
      // Wire temp click handlers for comp mode
      if(overviewBtn)overviewBtn.onclick=()=>{
        clearExecSubNav();
        overviewBtn.classList.add('active');
        const et=document.getElementById('tab-exec');if(et)et.classList.add('active');
        if(window.renderExecView)try{window.renderExecView()}catch(e){}
      };
      if(compBtn)compBtn.onclick=()=>{
        clearExecSubNav();
        compBtn.classList.add('active');
        const et=document.getElementById('tab-employees');if(et)et.classList.add('active');
        if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
      };
      const prefix = window.planContext === 'forecast' ? 'FCAST' : 'BUD';
      if (window._broadcastTab) window._broadcastTab(prefix + ' - C&B');
    } else if (module === 'vendor') {
      if (window.showVendor) window.showVendor();
      const prefix = window.planContext === 'forecast' ? 'FCAST' : 'BUD';
      if (window._broadcastTab) window._broadcastTab(prefix + ' - OAO');
    } else if (module === 'depreciation') {
      if (window.showDepreciation) window.showDepreciation();
      const prefix = window.planContext === 'forecast' ? 'FCAST' : 'BUD';
      if (window._broadcastTab) window._broadcastTab(prefix + ' - D&A');
    } else if (module === 'ltf') {
      if (window.showLtf) window.showLtf();
      if (window._broadcastTab) window._broadcastTab('FCAST');
    }
  }

  // ── Exec Summary sub-nav: Overview / Exec Comp / Pivot ──
  const overviewBtn = document.getElementById('execSubOverview');
  const compBtn = document.getElementById('execSubComp');
  const pivotBtn = document.getElementById('execSubPivot');
  const sumContent = document.getElementById('landingSummaryContent');

  function clearExecSubNav() {
    if (overviewBtn) overviewBtn.classList.remove('active');
    if (compBtn) compBtn.classList.remove('active');
    if (pivotBtn) pivotBtn.classList.remove('active');
    if (sumContent) sumContent.style.display = 'none';
    // Hide landing page when not on Overview
    const landingPage = document.getElementById('landingPage');
    if (landingPage) landingPage.style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  }

  function showOverviewTab() {
    clearExecSubNav();
    if (overviewBtn) overviewBtn.classList.add('active');
    // Show header bar
    const headerBar = document.getElementById('compHeaderBar');
    if (headerBar) headerBar.style.display = '';
    // landingSummaryContent is inside #landingPage — need to show parent too
    const landingPage = document.getElementById('landingPage');
    const chevNav = document.getElementById('chevronNav');
    if (landingPage) landingPage.style.display = '';
    if (chevNav) chevNav.style.display = 'none';
    if (sumContent) sumContent.style.display = '';
    // Hide appShell content (exec/pivot tabs) but keep appShell for potential renders
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = 'none';
    // Hide the old landing header
    const oldHdr = document.getElementById('landingHeaderOld');
    if (oldHdr) oldHdr.style.display = 'none';
    const title = document.querySelector('#compHeaderBar .module-title');
    if (title) title.textContent = 'Executive Summary';
    if (window._broadcastTab) window._broadcastTab('EXEC');
  }

  function showExecCompTab() {
    clearExecSubNav();
    if (compBtn) compBtn.classList.add('active');
    // Show header bar and appShell
    const headerBar = document.getElementById('compHeaderBar');
    if (headerBar) headerBar.style.display = '';
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = '';
    const execTab = document.getElementById('tab-exec');
    if (execTab) execTab.classList.add('active');
    if (window.renderExecView) window.renderExecView();
    const title = document.querySelector('#compHeaderBar .module-title');
    if (title) title.textContent = 'Executive Summary';
    if (window._broadcastTab) window._broadcastTab('EXEC');
  }

  function showPivotTab() {
    clearExecSubNav();
    if (pivotBtn) pivotBtn.classList.add('active');
    // Show header bar and appShell
    const headerBar = document.getElementById('compHeaderBar');
    if (headerBar) headerBar.style.display = '';
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = '';
    const pivotTab = document.getElementById('tab-pivot');
    if (pivotTab) pivotTab.classList.add('active');
    if (window.renderPivot) window.renderPivot();
    if (window._broadcastTab) window._broadcastTab('EXEC');
    const title = document.querySelector('#compHeaderBar .module-title');
    if (title) title.textContent = 'Executive Summary';
  }

  if (overviewBtn) overviewBtn.addEventListener('click', showOverviewTab);
  if (compBtn) compBtn.addEventListener('click', showExecCompTab);
  if (pivotBtn) pivotBtn.addEventListener('click', showPivotTab);

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
