// ── chevron-nav.js — Chevron navigation + bottom toolbar ──

(function(){
  const chevronNav = document.getElementById('chevronNav');
  if (!chevronNav) return;

  // ═══ CORE HELPERS ═══

  // Nuclear hide — ensures appShell and header bar are hidden
  function hideAppShell(){
    const as=document.getElementById('appShell');if(as)as.style.display='none';
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='none';
    // Also deactivate all tab-content inside appShell
    document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
  }

  // Show appShell with a specific tab active
  function showAppShellTab(tabId){
    const as=document.getElementById('appShell');if(as)as.style.display='';
    document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
    const tab=document.getElementById(tabId);if(tab)tab.classList.add('active');
  }

  function showBackToPlan(){
    const btn=document.getElementById('planBackToNav');if(btn)btn.style.display='';
  }

  function hideCalendar(){if(window._hideCalendar)window._hideCalendar()}

  // ═══ CHEVRON CLICK HANDLERS ═══

  document.querySelectorAll('.chevron-item').forEach(item => {
    const shape = item.querySelector('.chevron-shape');
    if (!shape) return;
    shape.addEventListener('click', () => {
      const target = item.dataset.target;
      // Forecast — direct navigation, no submenu
      if (target === 'forecast') {
        navigateToModule('ltf');
        return;
      }
      // Others — toggle submenu
      if (item.classList.contains('has-submenu')) {
        const wasExpanded = item.classList.contains('expanded');
        document.querySelectorAll('.chevron-item.expanded').forEach(c => c.classList.remove('expanded'));
        if (!wasExpanded) item.classList.add('expanded');
      }
    });
  });

  // ═══ SUB-ITEM CLICKS ═══

  document.querySelectorAll('.chevron-sub-item').forEach(sub => {
    sub.addEventListener('click', () => {
      const module = sub.dataset.module;
      const parentTarget = sub.closest('.chevron-item').dataset.target;
      window.planContext = parentTarget;

      if (parentTarget === 'exec') {
        if (module === 'exec-overview') navigateToExecSummary('overview');
        else if (module === 'exec-comp') navigateToExecSummary('comp');
        else if (module === 'exec-pivot') navigateToExecSummary('pivot');
        return;
      }

      if (module === 'comp') navigateToModule('comp');
      else if (module === 'vendor') navigateToModule('vendor');
      else if (module === 'depreciation') navigateToModule('depreciation');
    });
  });

  // ═══ BACK BUTTON ═══

  const backToNavBtn=document.getElementById('planBackToNav');
  if(backToNavBtn){
    backToNavBtn.addEventListener('click',()=>{
      resetSubNavLabels();
      hideAppShell();
      if(window.showLanding)window.showLanding();
      if(window._showCalendar)window._showCalendar();
      backToNavBtn.style.display='none';
    });
  }

  // ═══ SUB-NAV LABELS ═══

  const overviewBtn = document.getElementById('execSubOverview');
  const compBtn = document.getElementById('execSubComp');
  const pivotBtn = document.getElementById('execSubPivot');
  const sumContent = document.getElementById('landingSummaryContent');

  function resetSubNavLabels(){
    if(overviewBtn){overviewBtn.textContent='Overview';overviewBtn.onclick=()=>showOverviewTab()}
    if(compBtn){compBtn.textContent='Exec Comp';compBtn.onclick=()=>showExecCompTab()}
    if(pivotBtn){pivotBtn.style.display='';pivotBtn.onclick=()=>showPivotTab()}
  }

  function clearExecSubNav(){
    if(overviewBtn)overviewBtn.classList.remove('active');
    if(compBtn)compBtn.classList.remove('active');
    if(pivotBtn)pivotBtn.classList.remove('active');
    if(sumContent)sumContent.style.display='none';
    const lp=document.getElementById('landingPage');if(lp)lp.style.display='none';
    // ALWAYS hide appShell when clearing — it gets re-shown only by explicit tab functions
    hideAppShell();
  }

  // ═══ EXECUTIVE SUMMARY NAVIGATION ═══

  function navigateToExecSummary(tab){
    // Step 1: Hide EVERYTHING
    if(window.hideAllModules)window.hideAllModules();
    hideAppShell();

    // Step 2: Setup
    showBackToPlan();
    hideCalendar();
    resetSubNavLabels();

    // Step 3: Show header bar
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';

    // Step 4: Render data for overview
    if(window.renderPnlWalk)try{window.renderPnlWalk()}catch(e){}
    if(window.renderLandingCharts)try{window.renderLandingCharts()}catch(e){}

    // Step 5: Route to tab
    if(tab==='comp')showExecCompTab();
    else if(tab==='pivot')showPivotTab();
    else showOverviewTab();
  }

  // ═══ MODULE NAVIGATION ═══

  function navigateToModule(module){
    // Step 1: Hide everything including appShell
    hideAppShell();
    showBackToPlan();
    hideCalendar();

    if(module==='comp'){
      // C&B: show appShell with exec comp view
      if(window.showApp)window.showApp();
      // Show header bar with C&B tabs
      const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
      const title=document.querySelector('#compHeaderBar .module-title');
      if(title)title.textContent='Compensation & Benefits';
      if(sumContent)sumContent.style.display='none';
      // Sub-nav: Exec Comp + Employees
      if(overviewBtn)overviewBtn.textContent='Exec Comp';
      if(compBtn)compBtn.textContent='Employees';
      if(pivotBtn)pivotBtn.style.display='none';
      // Default to exec comp
      document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
      const execTab=document.getElementById('tab-exec');if(execTab)execTab.classList.add('active');
      if(overviewBtn){overviewBtn.classList.add('active');if(compBtn)compBtn.classList.remove('active')}
      if(window.renderExecView)try{window.renderExecView()}catch(e){}
      // Wire tab handlers
      if(overviewBtn)overviewBtn.onclick=()=>{
        document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
        const et=document.getElementById('tab-exec');if(et)et.classList.add('active');
        if(overviewBtn)overviewBtn.classList.add('active');
        if(compBtn)compBtn.classList.remove('active');
        if(window.renderExecView)try{window.renderExecView()}catch(e){}
      };
      if(compBtn)compBtn.onclick=()=>{
        document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
        const et=document.getElementById('tab-employees');if(et)et.classList.add('active');
        if(compBtn)compBtn.classList.add('active');
        if(overviewBtn)overviewBtn.classList.remove('active');
        if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
      };
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - C&B');

    } else if(module==='vendor'){
      if(window.showVendor)window.showVendor();
      // showVendor calls hideAllModules which hides appShell — safe
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - OAO');

    } else if(module==='depreciation'){
      if(window.showDepreciation)window.showDepreciation();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - D&A');

    } else if(module==='ltf'){
      if(window.showLtf)window.showLtf();
      if(window._broadcastTab)window._broadcastTab('FCAST');
    }
  }

  // ═══ EXEC SUMMARY SUB-TABS ═══

  function showOverviewTab(){
    clearExecSubNav(); // hides appShell
    if(overviewBtn)overviewBtn.classList.add('active');
    // Show header bar
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
    // Show landingPage with summary content
    const lp=document.getElementById('landingPage');if(lp)lp.style.display='';
    const cn=document.getElementById('chevronNav');if(cn)cn.style.display='none';
    if(sumContent)sumContent.style.display='';
    const oldHdr=document.getElementById('landingHeaderOld');if(oldHdr)oldHdr.style.display='none';
    const title=document.querySelector('#compHeaderBar .module-title');
    if(title)title.textContent='Executive Summary';
    if(window._broadcastTab)window._broadcastTab('EXEC');
  }

  function showExecCompTab(){
    clearExecSubNav(); // hides appShell first
    if(compBtn)compBtn.classList.add('active');
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
    showAppShellTab('tab-exec');
    if(window.renderExecView)try{window.renderExecView()}catch(e){}
    const title=document.querySelector('#compHeaderBar .module-title');
    if(title)title.textContent='Executive Summary';
    if(window._broadcastTab)window._broadcastTab('EXEC');
  }

  function showPivotTab(){
    clearExecSubNav(); // hides appShell first
    if(pivotBtn)pivotBtn.classList.add('active');
    const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
    showAppShellTab('tab-pivot');
    if(window.renderPivot)try{window.renderPivot()}catch(e){}
    const title=document.querySelector('#compHeaderBar .module-title');
    if(title)title.textContent='Executive Summary';
    if(window._broadcastTab)window._broadcastTab('EXEC');
  }

  if(overviewBtn)overviewBtn.addEventListener('click',showOverviewTab);
  if(compBtn)compBtn.addEventListener('click',showExecCompTab);
  if(pivotBtn)pivotBtn.addEventListener('click',showPivotTab);

  // ═══ BOTTOM TOOLBAR ═══

  const bottomToolbar = document.getElementById('bottomToolbar');
  window._updateBottomToolbar = function(){
    if(!bottomToolbar)return;
    const planHeader=document.getElementById('planHeaderBar');
    const isInPlan=planHeader&&planHeader.style.display!=='none';
    bottomToolbar.style.display=isInPlan?'flex':'none';
    const nameEl=document.getElementById('planHdrName');
    const badgeEl=document.getElementById('planHdrBadge');
    if(nameEl)document.getElementById('btbPlanName').textContent=nameEl.textContent||'';
    if(badgeEl)document.getElementById('btbPlanVersion').textContent=badgeEl.textContent||'';
    const emailEl=document.getElementById('btbEmail');
    if(emailEl){try{const raw=localStorage.getItem('compPlanUser');if(raw){const u=JSON.parse(raw);emailEl.textContent=u.email||''}}catch(e){}}
  };

  // Wire toolbar buttons
  const btbGuide=document.getElementById('btbGuide');
  const btbScenario=document.getElementById('btbScenario');
  const btbData=document.getElementById('btbData');
  const btbSettings=document.getElementById('btbSettings');
  if(btbGuide)btbGuide.addEventListener('click',()=>{const btn=document.getElementById('guideToggleBtn');if(btn)btn.click()});
  if(btbScenario)btbScenario.addEventListener('click',()=>{const btn=document.getElementById('scenarioToggleBtn');if(btn)btn.click()});
  if(btbData)btbData.addEventListener('click',()=>{const btn=document.getElementById('dataToggleBtn');if(btn)btn.click()});
  if(btbSettings)btbSettings.addEventListener('click',()=>{
    const panel=document.getElementById('settingsSlidePanel');
    if(panel){const isOpen=panel.classList.contains('open');
      if(isOpen){panel.classList.remove('open');panel.style.transform='translateX(100%)'}
      else{panel.classList.add('open');panel.style.transform='translateX(0)'}
    }
  });
})();
