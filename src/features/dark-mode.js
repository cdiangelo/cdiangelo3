// ── DARK MODE, ACCENT THEMES, OPS VIEW ── ES Module
// Dark = default (:root). Light = [data-theme="light"].
// Accent = data-accent attribute (iron-dusk | celadon | tide | obsidian-violet).
// All controls live in the settings slide panel.

export function initDarkMode(){
  const toggleDark=document.getElementById('globalToggleDark');
  const toggleOps=document.getElementById('globalToggleOps');

  // ── Dark/Light Mode ──
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
    reRenderCharts();
    document.dispatchEvent(new CustomEvent('webplan:theme-change'));
  }

  if(toggleDark){
    toggleDark.addEventListener('change',()=>applyTheme(toggleDark.checked?'dark':'light'));
  }

  // ── Accent Theme ──
  function applyAccent(accent){
    document.documentElement.setAttribute('data-accent',accent);
    localStorage.setItem('webplan-theme-accent',accent);
    updateAccentDots(accent);
    reRenderCharts();
    document.dispatchEvent(new CustomEvent('webplan:theme-change'));
  }

  function updateAccentDots(active){
    document.querySelectorAll('.accent-dot').forEach(dot=>{
      const isActive=dot.dataset.accent===active;
      dot.style.boxShadow=isActive?'0 0 0 2px var(--panel),0 0 0 4px var(--accent)':'none';
    });
  }

  document.querySelectorAll('.accent-dot').forEach(dot=>{
    dot.addEventListener('click',()=>applyAccent(dot.dataset.accent));
  });

  // ── Ops View ──
  if(toggleOps){
    toggleOps.addEventListener('change',()=>{
      document.body.classList.toggle('ops-mode',toggleOps.checked);
      localStorage.setItem('compPlanOps',toggleOps.checked?'1':'0');
      try{window.renderMonthly()}catch(e){}
      if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
      if(window.syncFormCompVisibility)try{window.syncFormCompVisibility()}catch(e){}
    });
  }

  // ── Restore Preferences ──
  const savedTheme=localStorage.getItem('webplan-theme');
  if(savedTheme==='light'){applyTheme('light')}
  else if(savedTheme==='dark'){applyTheme('dark')}
  else{
    applyTheme('light'); // default to light mode
  }
  // Legacy compat
  if(!savedTheme&&localStorage.getItem('compPlanDark')==='0')applyTheme('light');

  // Restore accent
  const savedAccent=localStorage.getItem('webplan-theme-accent')||'arctic-steel';
  applyAccent(savedAccent);

  // Restore ops
  if(localStorage.getItem('compPlanOps')==='1'&&toggleOps){
    toggleOps.checked=true;document.body.classList.add('ops-mode');
    if(window.syncFormCompVisibility)try{window.syncFormCompVisibility()}catch(e){}
  }

  // Check admin ops restrictions for current user
  checkOpsRestriction();

  // ── Admin Ops Mode Control ──
  initAdminOpsControl();

  // ── Chart color scheme compat ──
  window.chartColorScheme='default';
  if(window.setChartColorScheme)window.setChartColorScheme('default');
  window.colorSchemeCallbacks=[];
  window.loadUserColorScheme=function(){};

  // ── Global back button ──
  const globalBackBtn=document.getElementById('globalBackBtn');
  window._updateGlobalToolbar=function(){
    const lp=document.getElementById('landingPage');
    const onLanding=lp&&lp.style.display!=='none';
    if(globalBackBtn)globalBackBtn.style.display=onLanding?'none':'';
  };
  if(globalBackBtn)globalBackBtn.addEventListener('click',()=>{if(window.showLanding)window.showLanding()});
  window._updateGlobalToolbar();
}

function reRenderCharts(){
  try{window.renderForecast()}catch(e){}
  try{window.renderExecView()}catch(e){}
  try{window.renderDashboard()}catch(e){}
  try{window.renderLandingCharts()}catch(e){}
  try{window.renderBudgetScenarioChart()}catch(e){}
  try{window.renderFcScenarioChart()}catch(e){}
  if(window.renderEmployees)try{window.renderEmployees()}catch(e){}
  if(window.renderLandingRevenue)try{window.renderLandingRevenue()}catch(e){}
  if(window.renderLtfChart)try{window.renderLtfChart()}catch(e){}
  if(window.colorSchemeCallbacks)window.colorSchemeCallbacks.forEach(fn=>{try{fn()}catch(e){}});
}

// ── Admin Ops Mode Control ──
const OPS_ADMIN_KEY='webplan-ops-admin';

function getOpsRules(){
  try{return JSON.parse(localStorage.getItem(OPS_ADMIN_KEY))||[]}catch(e){return[]}
}

function saveOpsRules(rules){
  localStorage.setItem(OPS_ADMIN_KEY,JSON.stringify(rules));
}

function checkOpsRestriction(){
  const rules=getOpsRules();
  try{
    const raw=localStorage.getItem('compPlanUser');
    if(!raw)return;
    const user=JSON.parse(raw);
    const email=(user.email||'').toLowerCase();
    const rule=rules.find(r=>r.email.toLowerCase()===email);
    if(rule&&rule.mode==='restricted'){
      // Force ops mode on, disable toggle
      document.body.classList.add('ops-mode');
      const toggleOps=document.getElementById('globalToggleOps');
      if(toggleOps){
        toggleOps.checked=true;
        toggleOps.disabled=true;
        const label=toggleOps.closest('.header-toggle');
        if(label)label.title='Ops View is enforced by admin';
      }
    }
  }catch(e){}
}

function initAdminOpsControl(){
  const listEl=document.getElementById('adminOpsUserList');
  if(!listEl)return;

  function getKnownUsers(){
    try{return JSON.parse(localStorage.getItem('webplan-known-users')||'[]')}catch(e){return[]}
  }

  function render(){
    const known=getKnownUsers();
    const rules=getOpsRules();
    listEl.innerHTML='';
    if(!known.length){
      listEl.innerHTML='<p style="font-size:.75rem;color:var(--tertiary)">No users have logged in yet.</p>';
      return;
    }
    known.forEach(u=>{
      const email=u.email.toLowerCase();
      const rule=rules.find(r=>r.email.toLowerCase()===email);
      const isRestricted=rule&&rule.mode==='restricted';
      const row=document.createElement('label');
      row.style.cssText='display:flex;gap:10px;align-items:center;padding:6px 0;cursor:pointer;font-size:.78rem';
      row.innerHTML=`
        <input type="checkbox" ${isRestricted?'checked':''} style="accent-color:var(--accent);cursor:pointer">
        <span style="flex:1;color:var(--text)">${u.name||u.email} <span style="color:var(--tertiary);font-size:.7rem">${u.email}</span></span>`;
      const cb=row.querySelector('input');
      cb.addEventListener('change',()=>{
        const r=getOpsRules();
        const idx=r.findIndex(x=>x.email.toLowerCase()===email);
        if(cb.checked){
          if(idx>=0)r[idx].mode='restricted';
          else r.push({email:u.email,mode:'restricted'});
        } else {
          if(idx>=0)r.splice(idx,1);
        }
        saveOpsRules(r);
        checkOpsRestriction();
      });
      listEl.appendChild(row);
    });
  }

  render();
  // Re-render when settings panel opens (in case new users logged in)
  const panel=document.getElementById('settingsSlidePanel');
  if(panel){
    const observer=new MutationObserver(()=>{if(panel.classList.contains('open'))render()});
    observer.observe(panel,{attributes:true,attributeFilter:['class']});
  }
}

initDarkMode();
