// ── DARK MODE & OPS VIEW ── ES Module
// Uses global toolbar controls (#globalToggleDark, #globalToggleOps, #globalColorSchemeSlider)

export function initDarkMode(){
  const toggleDark=document.getElementById('globalToggleDark');
  const toggleOps=document.getElementById('globalToggleOps');
  function setDarkMode(on){
    document.documentElement.classList.toggle('dark',on);
    localStorage.setItem('compPlanDark',on?'1':'0');
    toggleDark.checked=on;
    window.renderForecast();window.renderExecView();window.renderDashboard();window.renderLandingCharts();window.renderBudgetScenarioChart();window.renderFcScenarioChart();
    if(window.renderEmployees)window.renderEmployees();
    if(window.renderLandingRevenue)window.renderLandingRevenue();
    if(window.renderLtfChart)window.renderLtfChart();
    colorSchemeCallbacks.forEach(fn=>fn());
  }
  toggleDark.addEventListener('change',()=>setDarkMode(toggleDark.checked));
  toggleOps.addEventListener('change',()=>{
    document.body.classList.toggle('ops-mode',toggleOps.checked);
    localStorage.setItem('compPlanOps',toggleOps.checked?'1':'0');
    window.renderMonthly();
    if(window.renderEmployees)window.renderEmployees();
    if(window.syncFormCompVisibility)window.syncFormCompVisibility();
  });
  // Restore preferences
  if(localStorage.getItem('compPlanDark')==='1'){toggleDark.checked=true;document.documentElement.classList.add('dark')}
  if(localStorage.getItem('compPlanOps')==='1'){toggleOps.checked=true;document.body.classList.add('ops-mode');if(window.syncFormCompVisibility)window.syncFormCompVisibility()}
  // Color scheme slider (single global instance)
  const colorSchemeSlider=document.getElementById('globalColorSchemeSlider');
  const colorSchemeLabel=document.getElementById('globalColorSchemeLabel');
  const COLOR_SCHEME_NAMES=['Crisp','Muted','Neon'];
  const COLOR_SCHEME_KEYS=['crisp','muted','neon'];
  function applyColorSchemeClass(){
    document.body.classList.remove('cs-muted','cs-neon','cs-crisp');
    document.body.classList.add('cs-'+window.chartColorScheme);
  }
  function syncColorSchemeSliders(idx){
    colorSchemeSlider.value=idx;colorSchemeLabel.textContent=COLOR_SCHEME_NAMES[idx];
  }
  const colorSchemeCallbacks=[];
  window.colorSchemeCallbacks=colorSchemeCallbacks;
  function getColorSchemeKey(){
    const uid=window.sessionContext&&window.sessionContext.userId;
    return uid?'compPlanColorScheme_'+uid:'compPlanColorScheme';
  }
  function loadUserColorScheme(){
    const key=getColorSchemeKey();
    const saved=localStorage.getItem(key);
    if(saved&&COLOR_SCHEME_KEYS.includes(saved)){
      window.chartColorScheme=saved;
      if(window.setChartColorScheme)window.setChartColorScheme(saved);
      const idx=COLOR_SCHEME_KEYS.indexOf(saved);
      syncColorSchemeSliders(idx);
      applyColorSchemeClass();
    }
  }
  window.loadUserColorScheme=loadUserColorScheme;
  function onColorSchemeChange(v){
    window.chartColorScheme=COLOR_SCHEME_KEYS[v];
    if(window.setChartColorScheme)window.setChartColorScheme(COLOR_SCHEME_KEYS[v]);
    syncColorSchemeSliders(v);
    localStorage.setItem(getColorSchemeKey(),window.chartColorScheme);
    applyColorSchemeClass();
    window.renderAll();window.renderLandingCharts();if(window.renderLtfChart)window.renderLtfChart();
    colorSchemeCallbacks.forEach(fn=>fn());
  }
  colorSchemeSlider.addEventListener('input',()=>onColorSchemeChange(parseInt(colorSchemeSlider.value)));
  // Load color scheme: try user-specific first, then global fallback
  const savedScheme=localStorage.getItem('compPlanColorScheme');
  if(savedScheme&&COLOR_SCHEME_KEYS.includes(savedScheme)){
    window.chartColorScheme=savedScheme;
    if(window.setChartColorScheme)window.setChartColorScheme(savedScheme);
    const idx=COLOR_SCHEME_KEYS.indexOf(savedScheme);
    syncColorSchemeSliders(idx);
  }
  applyColorSchemeClass();

  // Global back button — show/hide based on current view and wire navigation
  const globalBackBtn=document.getElementById('globalBackBtn');
  window._updateGlobalToolbar=function(){
    const lp=document.getElementById('landingPage');
    const onLanding=lp&&lp.style.display!=='none';
    globalBackBtn.style.display=onLanding?'none':'';
  };
  globalBackBtn.addEventListener('click',()=>{if(window.showLanding)window.showLanding()});
  // Set initial state
  window._updateGlobalToolbar();
}
initDarkMode();
