// ── DARK MODE & OPS VIEW ── ES Module
// Extracted from index.html lines 7927–8010

export function initDarkMode(){
  const toggleDark=document.getElementById('toggleDark');
  const landingToggleDark=document.getElementById('landingToggleDark');
  const toggleOps=document.getElementById('toggleOps');
  const vendorToggleDark=document.getElementById('vendorToggleDark');
  const depToggleDark=document.getElementById('depToggleDark');
  const revToggleDark=document.getElementById('revToggleDark');
  function setDarkMode(on){
    document.documentElement.classList.toggle('dark',on);
    localStorage.setItem('compPlanDark',on?'1':'0');
    toggleDark.checked=on;
    landingToggleDark.checked=on;
    vendorToggleDark.checked=on;
    if(depToggleDark)depToggleDark.checked=on;
    if(revToggleDark)revToggleDark.checked=on;
    window.renderForecast();window.renderExecView();window.renderDashboard();window.renderLandingCharts();window.renderBudgetScenarioChart();window.renderFcScenarioChart();
    colorSchemeCallbacks.forEach(fn=>fn());
  }
  toggleDark.addEventListener('change',()=>setDarkMode(toggleDark.checked));
  landingToggleDark.addEventListener('change',()=>setDarkMode(landingToggleDark.checked));
  vendorToggleDark.addEventListener('change',()=>setDarkMode(vendorToggleDark.checked));
  if(depToggleDark)depToggleDark.addEventListener('change',()=>setDarkMode(depToggleDark.checked));
  if(revToggleDark)revToggleDark.addEventListener('change',()=>setDarkMode(revToggleDark.checked));
  toggleOps.addEventListener('change',()=>{
    document.body.classList.toggle('ops-mode',toggleOps.checked);
    localStorage.setItem('compPlanOps',toggleOps.checked?'1':'0');
    window.renderMonthly();
  });
  // Restore preferences
  if(localStorage.getItem('compPlanDark')==='1'){toggleDark.checked=true;landingToggleDark.checked=true;vendorToggleDark.checked=true;if(depToggleDark)depToggleDark.checked=true;if(revToggleDark)revToggleDark.checked=true;document.documentElement.classList.add('dark')}
  if(localStorage.getItem('compPlanOps')==='1'){toggleOps.checked=true;document.body.classList.add('ops-mode')}
  // Color scheme slider (synced across app + landing)
  const colorSchemeSlider=document.getElementById('colorSchemeSlider');
  const colorSchemeLabel=document.getElementById('colorSchemeLabel');
  const landingColorSchemeSlider=document.getElementById('landingColorSchemeSlider');
  const landingColorSchemeLabel=document.getElementById('landingColorSchemeLabel');
  const COLOR_SCHEME_NAMES=['Crisp','Muted','Neon'];
  const COLOR_SCHEME_KEYS=['crisp','muted','neon'];
  function applyColorSchemeClass(){
    document.body.classList.remove('cs-muted','cs-neon','cs-crisp');
    document.body.classList.add('cs-'+window.chartColorScheme);
  }
  const vendorColorSchemeSlider=document.getElementById('vendorColorSchemeSlider');
  const vendorColorSchemeLabel=document.getElementById('vendorColorSchemeLabel');
  function syncColorSchemeSliders(idx){
    colorSchemeSlider.value=idx;colorSchemeLabel.textContent=COLOR_SCHEME_NAMES[idx];
    landingColorSchemeSlider.value=idx;landingColorSchemeLabel.textContent=COLOR_SCHEME_NAMES[idx];
    vendorColorSchemeSlider.value=idx;vendorColorSchemeLabel.textContent=COLOR_SCHEME_NAMES[idx];
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
      const idx=COLOR_SCHEME_KEYS.indexOf(saved);
      syncColorSchemeSliders(idx);
      applyColorSchemeClass();
    }
  }
  window.loadUserColorScheme=loadUserColorScheme;
  function onColorSchemeChange(v){
    window.chartColorScheme=COLOR_SCHEME_KEYS[v];
    syncColorSchemeSliders(v);
    localStorage.setItem(getColorSchemeKey(),window.chartColorScheme);
    applyColorSchemeClass();
    window.renderAll();window.renderLandingCharts();
    colorSchemeCallbacks.forEach(fn=>fn());
  }
  colorSchemeSlider.addEventListener('input',()=>onColorSchemeChange(parseInt(colorSchemeSlider.value)));
  landingColorSchemeSlider.addEventListener('input',()=>onColorSchemeChange(parseInt(landingColorSchemeSlider.value)));
  vendorColorSchemeSlider.addEventListener('input',()=>onColorSchemeChange(parseInt(vendorColorSchemeSlider.value)));
  // Load color scheme: try user-specific first, then global fallback
  const savedScheme=localStorage.getItem('compPlanColorScheme');
  if(savedScheme&&COLOR_SCHEME_KEYS.includes(savedScheme)){
    window.chartColorScheme=savedScheme;
    const idx=COLOR_SCHEME_KEYS.indexOf(savedScheme);
    syncColorSchemeSliders(idx);
  }
  applyColorSchemeClass();
}
