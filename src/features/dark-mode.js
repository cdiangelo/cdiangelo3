// ── DARK MODE, ACCENT THEMES, OPS VIEW ── ES Module
// Dark = default (:root). Light = [data-theme="light"].
// Accent = data-accent attribute (obsidian-ember | forest-ledger | dusk-slate).
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
    const preferLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(preferLight?'light':'dark');
  }
  // Legacy compat
  if(!savedTheme&&localStorage.getItem('compPlanDark')==='0')applyTheme('light');

  // Restore accent
  const savedAccent=localStorage.getItem('webplan-theme-accent')||'dusk-slate';
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
  const addBtn=document.getElementById('adminOpsAddUser');
  if(!listEl||!addBtn)return;

  function render(){
    const rules=getOpsRules();
    listEl.innerHTML='';
    rules.forEach((rule,i)=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;gap:6px;align-items:center';
      row.innerHTML=`
        <input type="email" value="${rule.email||''}" placeholder="user@email.com" style="flex:1;padding:5px 8px;font-size:.78rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text)">
        <select style="padding:5px 6px;font-size:.75rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);width:auto">
          <option value="free"${rule.mode==='free'?' selected':''}>Can Toggle</option>
          <option value="restricted"${rule.mode==='restricted'?' selected':''}>Restricted</option>
        </select>
        <button class="btn btn-sm" style="padding:3px 8px;font-size:.7rem;color:var(--danger)" title="Remove">×</button>`;
      const emailInput=row.querySelector('input');
      const modeSelect=row.querySelector('select');
      const removeBtn=row.querySelector('button');
      emailInput.addEventListener('change',()=>{rules[i].email=emailInput.value;saveOpsRules(rules)});
      modeSelect.addEventListener('change',()=>{rules[i].mode=modeSelect.value;saveOpsRules(rules);checkOpsRestriction()});
      removeBtn.addEventListener('click',()=>{rules.splice(i,1);saveOpsRules(rules);render()});
      listEl.appendChild(row);
    });
    if(!rules.length){
      listEl.innerHTML='<p style="font-size:.75rem;color:var(--tertiary)">No rules configured. All users can toggle Ops View freely.</p>';
    }
  }

  addBtn.addEventListener('click',()=>{
    const rules=getOpsRules();
    rules.push({email:'',mode:'free'});
    saveOpsRules(rules);
    render();
  });

  render();
}

initDarkMode();
