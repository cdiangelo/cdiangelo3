// ── chevron-nav.js — Chevron navigation + bottom toolbar ──

// Reusable: applies plan-type chevron visibility AFTER checkModuleAccess resets.
// AOP → Budget+Forecast+Exec; RF → N+M label + hide Forecast; LTP → hide Budget.
window.applyPlanChevronContext = function(plan){
  const budgetChev=document.getElementById('chevBudget');
  const forecastChev=document.getElementById('chevForecast');
  const budgetLabel=document.querySelector('#chevBudget .chevron-label');
  const chevNav=document.getElementById('chevronNav');
  if(budgetLabel)budgetLabel.textContent='Budget';
  if(!plan||!plan.name)return;
  const isRF=plan.name.includes('RF —');
  const isLTP=plan.name.includes('Long-Term Plan');

  // Remove any previously injected RF month chevrons
  chevNav?.querySelectorAll('.rf-month-chev').forEach(el=>el.remove());

  if(isRF){
    // RF: scrollable month list on left, sub-items flyout on right
    if(budgetChev)budgetChev.style.display='none';
    if(forecastChev)forecastChev.style.display='none';
    const MO=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mi=MO.findIndex(m=>plan.name.includes(m));
    const currentMonth=mi>=0?mi:0;
    const budgetMenu=document.getElementById('chevBudgetMenu');
    const subItemsHtml=budgetMenu?budgetMenu.innerHTML:'';

    // Outer wrapper: position:relative so the flyout can anchor to its right edge
    const rfOuter=document.createElement('div');
    rfOuter.className='rf-month-chev';
    rfOuter.style.cssText='position:relative';

    // Scrollable month list
    const rfScroll=document.createElement('div');
    rfScroll.className='rf-scroll';
    rfScroll.style.cssText='max-height:calc(100vh - 300px);overflow-y:auto;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth';

    // Flyout panel — sits to the right of the scroll area, position:absolute
    const flyout=document.createElement('div');
    flyout.className='rf-flyout';
    flyout.style.cssText='display:none;position:absolute;left:calc(100% + 16px);top:0;width:240px;flex-direction:column;gap:6px;z-index:100';
    flyout.innerHTML=subItemsHtml;

    // Wire flyout sub-item clicks
    flyout.querySelectorAll('.chevron-sub-item').forEach(sub=>{
      sub.addEventListener('click',()=>{
        window.planContext='budget';
        if(window.navigateToModule)window.navigateToModule(sub.dataset.module);
      });
    });

    let activeRfRow=null;

    for(let m=0;m<12;m++){
      const actuals=m+1;const forecast=12-actuals;
      const label=actuals+'+'+(forecast);
      const isActive=m===currentMonth;
      const isPast=m<currentMonth;
      const row=document.createElement('div');
      row.className='chevron-item rf-month-row';
      row.dataset.rfMonth=m;
      row.innerHTML=`<div class="chevron-shape" style="${isActive?'border-left-color:var(--accent);background:var(--accent-soft);':''}${isPast?'opacity:.5;':''}"><span class="chevron-label">${label}<span style="font-size:.7rem;font-weight:400;color:var(--text-dim);margin-left:6px">${MO_SHORT[m]}</span></span><span class="chevron-hover-arrow">&#9655;</span></div>`;

      row.querySelector('.chevron-shape').addEventListener('click',()=>{
        if(m!==currentMonth&&window._loadRFMonth){window._loadRFMonth(m);return}
        const wasOpen=activeRfRow===row;
        // Deselect previous
        if(activeRfRow){activeRfRow.querySelector('.chevron-hover-arrow').innerHTML='&#9655;';activeRfRow.classList.remove('expanded')}
        if(wasOpen){flyout.style.display='none';activeRfRow=null;return}
        // Select this one — position flyout aligned to this row
        row.querySelector('.chevron-hover-arrow').innerHTML='&#9661;';
        row.classList.add('expanded');
        activeRfRow=row;
        const rowRect=row.getBoundingClientRect();
        const outerRect=rfOuter.getBoundingClientRect();
        flyout.style.top=(rowRect.top-outerRect.top)+'px';
        flyout.style.display='flex';
      });
      rfScroll.appendChild(row);
    }

    rfOuter.appendChild(rfScroll);
    rfOuter.appendChild(flyout);
    chevNav.appendChild(rfOuter);

    // Auto-select current month
    const activeEl=rfScroll.querySelector(`[data-rf-month="${currentMonth}"]`);
    if(activeEl){
      activeEl.querySelector('.chevron-hover-arrow').innerHTML='&#9661;';
      activeEl.classList.add('expanded');
      activeRfRow=activeEl;
      flyout.style.display='flex';
      setTimeout(()=>{
        const rowRect=activeEl.getBoundingClientRect();
        const outerRect=rfOuter.getBoundingClientRect();
        flyout.style.top=(rowRect.top-outerRect.top)+'px';
        activeEl.scrollIntoView({block:'center',behavior:'smooth'});
      },100);
    }
  } else if(isLTP){
    if(budgetChev)budgetChev.style.display='none';
  } else {
    // AOP: hide Forecast, show Budget only
    if(forecastChev)forecastChev.style.display='none';
  }
  // Hide LTF sections in exec summary for AOP and RF
  const hideLtf=!isLTP;
  const ltfViewBtn=document.querySelector('[data-view="forecast"]');
  if(ltfViewBtn)ltfViewBtn.style.display=hideLtf?'none':'';
  const execFcPane=document.getElementById('execFcPane');
  if(execFcPane)execFcPane.style.display=hideLtf?'none':'';
};

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

  // Use event delegation on chevronNav for all chevron interactions
  chevronNav.addEventListener('click', (e) => {
    // Sub-item click (highest priority — check first)
    const sub = e.target.closest('.chevron-sub-item');
    if (sub) {
      e.stopPropagation();
      const module = sub.dataset.module;
      const parentTarget = sub.closest('.chevron-item')?.dataset.target;
      window.planContext = parentTarget;

      // Collapse all chevrons
      document.querySelectorAll('.chevron-item.expanded').forEach(c => c.classList.remove('expanded'));

      if (parentTarget === 'exec') {
        if (module === 'exec-overview') navigateToExecSummary('overview');
        else if (module === 'exec-comp') navigateToExecSummary('comp');
        else if (module === 'exec-pivot') navigateToExecSummary('pivot');
        return;
      }

      navigateToModule(module);
      return;
    }

    // Chevron shape click (expand/collapse submenu)
    const shape = e.target.closest('.chevron-shape');
    if (shape) {
      const item = shape.closest('.chevron-item');
      if (!item) return;
      const target = item.dataset.target;
      if (target === 'forecast') { navigateToModule('ltf'); return; }
      if (item.classList.contains('has-submenu')) {
        const wasExpanded = item.classList.contains('expanded');
        document.querySelectorAll('.chevron-item.expanded').forEach(c => c.classList.remove('expanded'));
        if (!wasExpanded) item.classList.add('expanded');
      }
    }
  });

  // ═══ BACK BUTTON ═══

  const backToNavBtn=document.getElementById('planBackToNav');
  if(backToNavBtn){
    backToNavBtn.addEventListener('click',()=>{
      resetSubNavLabels();
      hideAppShell();
      // Hide ALL other modules too
      ['vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.style.display='none';
      });
      if(window.showLanding)window.showLanding();
      if(window._showCalendar)window._showCalendar();
      if(window.checkModuleAccess)window.checkModuleAccess();
      // Re-apply plan-type chevron overrides (checkModuleAccess just reset them)
      if(window.applyPlanChevronContext)window.applyPlanChevronContext(window._activePlan);
      backToNavBtn.style.display='none';
      window.scrollTo(0,0);
    });
  }

  // ═══ SUB-NAV LABELS ═══

  const overviewBtn = document.getElementById('execSubOverview');
  const compBtn = document.getElementById('execSubComp');
  const pivotBtn = document.getElementById('execSubPivot');
  const sumContent = document.getElementById('landingSummaryContent');

  function resetSubNavLabels(){
    if(overviewBtn){overviewBtn.textContent='Overview';overviewBtn.style.display='';overviewBtn.onclick=()=>showOverviewTab()}
    if(compBtn){compBtn.textContent='Exec Comp';compBtn.style.display='';compBtn.onclick=()=>showExecCompTab()}
    if(pivotBtn){pivotBtn.textContent='Pivot';pivotBtn.style.display='';pivotBtn.onclick=()=>showPivotTab()}
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
    window.scrollTo(0,0);

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
    try{
    const modKeyMap={comp:'comp',vendor:'vendor',contractors:'contractors',te:'te',revenue:'revenue',depreciation:'depreciation',ltf:'forecast'};
    const modKey=modKeyMap[module];
    if(modKey&&window.isModuleAllowed&&!window.isModuleAllowed(modKey)){
      alert('You do not have access to this module.');
      return;
    }

    // Hide EVERYTHING — landing page, all modules, all headers
    if(window.hideAllModules)window.hideAllModules();
    const lp=document.getElementById('landingPage');if(lp)lp.style.display='none';
    hideAppShell();
    showBackToPlan();
    hideCalendar();
    window.scrollTo(0,0);

    if(module==='comp'){
      // C&B: show appShell with exec comp view
      if(window.showApp)window.showApp();
      // Show header bar with C&B tabs
      const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
      const title=document.querySelector('#compHeaderBar .module-title');
      if(title)title.textContent='Compensation & Benefits';
      if(sumContent)sumContent.style.display='none';
      // Sub-nav: Exec Comp + Employees (C&B Other moved to Budget > Other)
      if(overviewBtn)overviewBtn.textContent='Exec Comp';
      if(compBtn)compBtn.textContent='Employees';
      if(pivotBtn){pivotBtn.style.display='none'}
      // Default to exec comp
      document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
      const execTab=document.getElementById('tab-exec');if(execTab)execTab.classList.add('active');
      if(overviewBtn){overviewBtn.classList.add('active');if(compBtn)compBtn.classList.remove('active');if(pivotBtn)pivotBtn.classList.remove('active')}
      if(window.renderExecView)try{window.renderExecView()}catch(e){}
      function clearCbTabs(){[overviewBtn,compBtn,pivotBtn].forEach(b=>{if(b)b.classList.remove('active')});document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'))}
      // Wire tab handlers
      if(overviewBtn)overviewBtn.onclick=()=>{
        clearCbTabs();
        const et=document.getElementById('tab-exec');if(et)et.classList.add('active');
        overviewBtn.classList.add('active');
        if(window.renderExecView)try{window.renderExecView()}catch(e){}
      };
      if(compBtn)compBtn.onclick=()=>{
        clearCbTabs();
        const et=document.getElementById('tab-employees');if(et)et.classList.add('active');
        compBtn.classList.add('active');
        if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
      };
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - C&B');

    } else if(module==='vendor'){
      if(window.showVendor)window.showVendor();
      // Default to vendor spend tab
      const vBtn=document.querySelector('#vendorNav [data-vtab="vendor-grid"]');
      if(vBtn)vBtn.click();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - OAO');

    } else if(module==='contractors'){
      if(window.showVendor)window.showVendor();
      // Switch to contractors tab
      const cBtn=document.querySelector('#vendorNav [data-vtab="vendor-contractors"]');
      if(cBtn)cBtn.click();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - CTR');

    } else if(module==='te'){
      if(window.showVendor)window.showVendor();
      // Switch to T&E tab
      const tBtn=document.querySelector('#vendorNav [data-vtab="vendor-te"]');
      if(tBtn)tBtn.click();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - T&E');

    } else if(module==='revenue'){
      if(window.showVendor)window.showVendor();
      const rBtn=document.querySelector('#vendorNav [data-vtab="vendor-revenue"]');
      if(rBtn)rBtn.click();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - Revenue');

    } else if(module==='depreciation'){
      if(window.showDepreciation)window.showDepreciation();
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - D&A');

    } else if(module==='ltf'){
      if(window.showLtf)window.showLtf();
      if(window._broadcastTab)window._broadcastTab('FCAST');

    } else if(module==='other'){
      // Unified Other tab: shows both C&B and OAO other rows
      if(window.showApp)window.showApp();
      const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
      const title=document.querySelector('#compHeaderBar .module-title');
      if(title)title.textContent='Other';
      if(sumContent)sumContent.style.display='none';
      // Hide all sub-nav buttons (only title shown)
      if(overviewBtn)overviewBtn.style.display='none';
      if(compBtn)compBtn.style.display='none';
      if(pivotBtn)pivotBtn.style.display='none';
      // Show the unified other tab
      document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
      const ot=document.getElementById('tab-cb-other');if(ot)ot.classList.add('active');
      if(window.initOtherTab)try{window.initOtherTab()}catch(e){}
      const prefix=window.planContext==='forecast'?'FCAST':'BUD';
      if(window._broadcastTab)window._broadcastTab(prefix+' - Other');

    } else if(module==='actuals'){
      // Actuals module — non-editable realized data with variance
      if(window.showApp)window.showApp();
      const hb=document.getElementById('compHeaderBar');if(hb)hb.style.display='';
      const title=document.querySelector('#compHeaderBar .module-title');
      if(title)title.textContent='Actuals';
      if(sumContent)sumContent.style.display='none';
      if(overviewBtn)overviewBtn.style.display='none';
      if(compBtn)compBtn.style.display='none';
      if(pivotBtn)pivotBtn.style.display='none';
      document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
      const at=document.getElementById('tab-actuals');if(at)at.classList.add('active');
      if(window.renderActuals)try{window.renderActuals()}catch(e){console.warn('renderActuals:',e)}
      if(window._broadcastTab)window._broadcastTab('ACTUALS');
    }
    }catch(err){console.error('navigateToModule error:',module,err)}
  }
  // Expose for use by other navigation flows
  window.navigateToModule = navigateToModule;

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
    // Read from _activePlan directly
    const plan=window._activePlan;
    const nameEl=document.getElementById('btbPlanName');
    const verEl=document.getElementById('btbPlanVersion');
    const emailEl=document.getElementById('btbEmail');
    if(nameEl)nameEl.textContent=plan?plan.name:'';
    if(verEl)verEl.style.display='none';
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
  const btbDims=document.getElementById('btbDims');
  if(btbDims)btbDims.addEventListener('click',()=>{const btn=document.getElementById('dimsToggleBtn');if(btn)btn.click()});
  if(btbSettings)btbSettings.addEventListener('click',()=>{
    const panel=document.getElementById('settingsSlidePanel');
    if(panel){
      const isOpen=panel.classList.contains('open');
      if(window.closeAllSidePanels)window.closeAllSidePanels();
      if(!isOpen){panel.classList.add('open');panel.style.transform='translateX(0)'}
    }
  });
})();
