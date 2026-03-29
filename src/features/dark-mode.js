// ── DARK MODE, ACCENT THEMES, OPS VIEW ── ES Module
// Dark = default (:root). Light = [data-theme="light"].
// Accent = data-accent attribute (iron-dusk | celadon | tide | obsidian-violet).
// All controls live in the settings slide panel.

export function initDarkMode(){
  const toggleOps=document.getElementById('globalToggleOps');

  // ── Force light mode always ──
  document.documentElement.setAttribute('data-theme','light');
  document.documentElement.classList.remove('dark');
  document.documentElement.setAttribute('data-accent','traverse-cloud');

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

  // Restore ops
  if(localStorage.getItem('compPlanOps')==='1'&&toggleOps){
    toggleOps.checked=true;document.body.classList.add('ops-mode');
    if(window.syncFormCompVisibility)try{window.syncFormCompVisibility()}catch(e){}
  }

  // Check admin ops restrictions for current user
  checkOpsRestriction();

  // ── Admin controls — show if user is admin ──
  function showAdminIfAllowed(){
    const user=JSON.parse(localStorage.getItem('compPlanUser')||'null');
    const wrap=document.getElementById('adminControlsWrap');
    if(wrap&&user&&user.isAdmin){
      wrap.style.display='';
      initAdminOpsControl();
      initModuleAccessControl();
    }
  }
  showAdminIfAllowed();
  // Re-check when settings panel opens
  const settingsPanel=document.getElementById('settingsSlidePanel');
  if(settingsPanel){
    const obs=new MutationObserver(()=>{if(settingsPanel.classList.contains('open'))showAdminIfAllowed()});
    obs.observe(settingsPanel,{attributes:true,attributeFilter:['class']});
  }

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
// Store rules in plan state (shared across users) with localStorage fallback
function getOpsRules(){
  try{if(window.state&&window.state.opsRules)return window.state.opsRules;return JSON.parse(localStorage.getItem('webplan-ops-admin'))||[]}catch(e){return[]}
}
function saveOpsRules(rules){
  if(window.state){window.state.opsRules=rules;if(window.saveState)window.saveState()}
  localStorage.setItem('webplan-ops-admin',JSON.stringify(rules));
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

  async function render(){
    // Merge local known users with shared users from active plan
    const known=getKnownUsers();
    let sharedUsers=[];
    const plan=window._activePlan;
    if(plan&&plan.id){
      try{
        const r=await fetch('/api/plan-files/'+plan.id+'/access');
        if(r.ok) sharedUsers=await r.json();
      }catch(e){}
    }
    // Build merged list keyed by email
    const merged=new Map();
    known.forEach(u=>{
      if(u.email) merged.set(u.email.toLowerCase(),{email:u.email,name:u.name||'',initials:u.initials||'',source:'local'});
    });
    sharedUsers.forEach(u=>{
      if(!u.email)return;
      const key=u.email.toLowerCase();
      if(merged.has(key)){
        const existing=merged.get(key);
        if(!existing.name&&u.email) existing.name=u.email;
      } else {
        merged.set(key,{email:u.email,name:u.email,initials:u.initials||'',source:'shared'});
      }
    });
    const allUsers=[...merged.values()];
    const rules=getOpsRules();
    listEl.innerHTML='';
    if(!allUsers.length){
      listEl.innerHTML='<p style="font-size:.75rem;color:var(--tertiary)">No users yet. Share a plan or have users log in.</p>';
      return;
    }
    allUsers.forEach(u=>{
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
  // Re-render when settings panel opens (in case new users logged in or plan shared)
  const panel=document.getElementById('settingsSlidePanel');
  if(panel){
    const observer=new MutationObserver(()=>{if(panel.classList.contains('open'))render()});
    observer.observe(panel,{attributes:true,attributeFilter:['class']});
  }
}

// ── Module Access Control ──
const MODULES=[
  {key:'comp',label:'C&B / Exec Comp'},
  {key:'vendor',label:'Vendor Spend'},
  {key:'te',label:'T&E'},
  {key:'contractors',label:'Contractors'},
  {key:'other',label:'Other (C&B/OAO)'},
  {key:'depreciation',label:'Depreciation / Assets'},
  {key:'revenue',label:'Revenue'},
  {key:'forecast',label:'Long-Term Forecast'}
];

function getModuleAccess(){
  try{if(window.state&&window.state.moduleAccess)return window.state.moduleAccess;return JSON.parse(localStorage.getItem('webplan-module-access')||'{}')}catch(e){return{}}
}
function saveModuleAccess(rules){
  if(window.state){window.state.moduleAccess=rules;if(window.saveState)window.saveState()}
  localStorage.setItem('webplan-module-access',JSON.stringify(rules));
}

function checkModuleAccess(){
  const user=JSON.parse(localStorage.getItem('compPlanUser')||'null');
  if(!user||!user.email)return;
  const rules=getModuleAccess();
  const userRules=rules[user.email.toLowerCase()];
  if(!userRules)return;

  // Hide chevron sub-items for restricted modules
  MODULES.forEach(m=>{
    if(userRules[m.key]===false){
      // Hide chevron sub-items
      document.querySelectorAll(`[data-module="${m.key}"]`).forEach(el=>el.style.display='none');
    }
  });

  // If ALL budget sub-modules restricted, hide entire Budget chevron
  const budgetMods=['comp','vendor','contractors','te','depreciation'];
  if(budgetMods.every(k=>userRules[k]===false)){
    const chevBudget=document.getElementById('chevBudget');
    if(chevBudget)chevBudget.style.display='none';
  }

  // If forecast restricted, hide entire Forecast chevron
  if(userRules.forecast===false){
    const chevFc=document.getElementById('chevForecast');
    if(chevFc)chevFc.style.display='none';
  }

  // Hide depreciation chevron sub-item
  if(userRules.depreciation===false)document.querySelectorAll('[data-module="depreciation"]').forEach(el=>el.style.display='none');

  // Hide revenue pane toggle if restricted
  if(userRules.revenue===false){
    document.querySelectorAll('#revenueModule,.revenue-toggle,[data-pnlmode="revenue"]').forEach(el=>el.style.display='none');
  }

  // Also hide vtab buttons in vendor module
  if(userRules.vendor===false)document.querySelectorAll('[data-vtab="vendor-grid"]').forEach(el=>el.style.display='none');
  if(userRules.te===false)document.querySelectorAll('[data-vtab="vendor-te"]').forEach(el=>el.style.display='none');
  if(userRules.contractors===false)document.querySelectorAll('[data-vtab="vendor-contractors"]').forEach(el=>el.style.display='none');
  if(userRules.other===false)document.querySelectorAll('[data-vtab="vendor-other"]').forEach(el=>el.style.display='none');
}

// Global check used by navigation to block restricted modules
function isModuleAllowed(moduleKey){
  const user=JSON.parse(localStorage.getItem('compPlanUser')||'null');
  if(!user||!user.email)return true;
  const rules=getModuleAccess();
  const userRules=rules[user.email.toLowerCase()];
  if(!userRules)return true;
  return userRules[moduleKey]!==false;
}
window.isModuleAllowed=isModuleAllowed;
window.checkModuleAccess=checkModuleAccess;
window.checkOpsRestriction=checkOpsRestriction;

function initModuleAccessControl(){
  const listEl=document.getElementById('adminModuleAccessList');
  if(!listEl)return;

  function getKnownUsers(){
    try{return JSON.parse(localStorage.getItem('webplan-known-users')||'[]')}catch(e){return[]}
  }

  async function render(){
    const known=getKnownUsers();
    // Also get shared users
    let sharedUsers=[];
    const plan=window._activePlan;
    if(plan&&plan.id){try{const r=await fetch('/api/plan-files/'+plan.id+'/access');if(r.ok)sharedUsers=await r.json()}catch(e){}}
    const merged=new Map();
    known.forEach(u=>{if(u.email)merged.set(u.email.toLowerCase(),{email:u.email,name:u.name||''})});
    sharedUsers.forEach(u=>{if(u.email&&!merged.has(u.email.toLowerCase()))merged.set(u.email.toLowerCase(),{email:u.email,name:u.email})});
    const allUsers=[...merged.values()];
    const rules=getModuleAccess();
    listEl.innerHTML='';
    if(!allUsers.length){listEl.innerHTML='<p style="font-size:.75rem;color:var(--tertiary)">No users yet.</p>';return}
    allUsers.forEach(u=>{
      const email=u.email.toLowerCase();
      const userRules=rules[email]||{};
      const row=document.createElement('div');
      row.style.cssText='padding:8px;background:var(--bg-elevated);border-radius:6px;border:1px solid var(--border-light)';
      row.innerHTML=`<div style="font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:4px">${u.name||u.email}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${MODULES.map(m=>{
          const allowed=userRules[m.key]!==false;
          return `<label style="display:flex;align-items:center;gap:3px;font-size:.7rem;cursor:pointer;color:var(--text-dim)"><input type="checkbox" ${allowed?'checked':''} data-email="${email}" data-mod="${m.key}" style="accent-color:var(--accent)">${m.label}</label>`;
        }).join('')}</div>`;
      row.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
        cb.addEventListener('change',()=>{
          const r=getModuleAccess();
          if(!r[cb.dataset.email])r[cb.dataset.email]={};
          r[cb.dataset.email][cb.dataset.mod]=cb.checked;
          saveModuleAccess(r);
          checkModuleAccess();
        });
      });
      listEl.appendChild(row);
    });

    // Add Apply button
    const existingApply=listEl.parentElement.querySelector('.admin-apply-btn');
    if(existingApply)existingApply.remove();
    const applyBtn=document.createElement('button');
    applyBtn.className='btn btn-primary btn-sm admin-apply-btn';
    applyBtn.style.cssText='margin-top:12px;padding:6px 20px;font-size:.78rem;font-weight:600';
    applyBtn.textContent='Apply Access Controls';
    applyBtn.addEventListener('click',async()=>{
      // Gather all checkbox states
      const r={};
      listEl.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
        if(!r[cb.dataset.email])r[cb.dataset.email]={};
        r[cb.dataset.email][cb.dataset.mod]=cb.checked;
      });
      saveModuleAccess(r);
      // Force immediate server save (no debounce)
      const plan=window._activePlan;
      if(plan&&plan.id&&window.state){
        try{
          await fetch('/api/plan-files/'+plan.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stateData:JSON.stringify(window.state)})});
          applyBtn.textContent='Applied ✓';
          applyBtn.style.background='var(--success)';
          setTimeout(()=>{applyBtn.textContent='Apply Access Controls';applyBtn.style.background=''},2000);
        }catch(e){applyBtn.textContent='Save failed';setTimeout(()=>{applyBtn.textContent='Apply Access Controls'},2000)}
      }
      checkModuleAccess();
    });
    listEl.parentElement.appendChild(applyBtn);
  }

  render();
  const panel=document.getElementById('settingsSlidePanel');
  if(panel){
    const observer=new MutationObserver(()=>{if(panel.classList.contains('open'))render()});
    observer.observe(panel,{attributes:true,attributeFilter:['class']});
  }
}

initDarkMode();
initModuleAccessControl();
