// ── DARK MODE & OPS VIEW ── ES Module
// Dark = default (:root). Light = [data-theme="light"].
// Single toggle, no crisp/muted/neon.

export function initDarkMode(){
  const toggleDark=document.getElementById('globalToggleDark');
  const toggleOps=document.getElementById('globalToggleOps');

  function applyTheme(theme){
    if(theme==='light'){
      document.documentElement.setAttribute('data-theme','light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('webplan-theme',theme);
    if(toggleDark)toggleDark.checked=(theme==='dark');
    // Re-render charts with new colors
    try{window.renderForecast()}catch(e){}
    try{window.renderExecView()}catch(e){}
    try{window.renderDashboard()}catch(e){}
    try{window.renderLandingCharts()}catch(e){}
    try{window.renderBudgetScenarioChart()}catch(e){}
    try{window.renderFcScenarioChart()}catch(e){}
    if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
    if(window.renderLandingRevenue)try{window.renderLandingRevenue()}catch(e){}
    if(window.renderLtfChart)try{window.renderLtfChart()}catch(e){}
    if(window.colorSchemeCallbacks)window.colorSchemeCallbacks.forEach(fn=>fn());
  }

  // Toggle handler
  if(toggleDark){
    toggleDark.addEventListener('change',()=>{
      applyTheme(toggleDark.checked?'dark':'light');
    });
  }

  // Ops view toggle
  if(toggleOps){
    toggleOps.addEventListener('change',()=>{
      document.body.classList.toggle('ops-mode',toggleOps.checked);
      localStorage.setItem('compPlanOps',toggleOps.checked?'1':'0');
      window.renderMonthly();
      if(window.renderEmployees)window.renderEmployees();
      if(window.syncFormCompVisibility)window.syncFormCompVisibility();
    });
  }

  // Restore preferences
  const saved=localStorage.getItem('webplan-theme');
  if(saved==='light'){
    applyTheme('light');
  } else if(saved==='dark'){
    applyTheme('dark');
  } else {
    // Fallback: check prefers-color-scheme, default to dark
    const preferLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(preferLight?'light':'dark');
  }

  // Legacy compat: also check old key
  if(!saved&&localStorage.getItem('compPlanDark')==='0'){
    applyTheme('light');
  }

  if(localStorage.getItem('compPlanOps')==='1'&&toggleOps){
    toggleOps.checked=true;document.body.classList.add('ops-mode');
    if(window.syncFormCompVisibility)window.syncFormCompVisibility();
  }

  // Chart color scheme — single unified palette, no toggle needed
  window.chartColorScheme='default';
  if(window.setChartColorScheme)window.setChartColorScheme('default');
  window.colorSchemeCallbacks=[];
  window.loadUserColorScheme=function(){};

  // Global back button
  const globalBackBtn=document.getElementById('globalBackBtn');
  window._updateGlobalToolbar=function(){
    const lp=document.getElementById('landingPage');
    const onLanding=lp&&lp.style.display!=='none';
    if(globalBackBtn)globalBackBtn.style.display=onLanding?'none':'';
  };
  if(globalBackBtn)globalBackBtn.addEventListener('click',()=>{if(window.showLanding)window.showLanding()});
  window._updateGlobalToolbar();
}
initDarkMode();
