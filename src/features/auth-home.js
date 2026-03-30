// ═══ AUTH & HOME — Tier 1 email entry + Tier 2 file manager ═══
import { state, saveState, loadState, ensureStateFields } from '../lib/state.js';

const USER_KEY='compPlanUser';

function formatTimeAgo(date){
  const now=Date.now(),diff=now-date.getTime();
  const mins=Math.floor(diff/60000),hrs=Math.floor(diff/3600000),days=Math.floor(diff/86400000);
  if(mins<1)return 'just now';
  if(mins<60)return mins+'m ago';
  if(hrs<24)return hrs+'h ago';
  if(days<7)return days+'d ago';
  return date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
}

function getUser(){
  const raw=localStorage.getItem(USER_KEY);
  return raw?JSON.parse(raw):null;
}
function setUser(u){localStorage.setItem(USER_KEY,JSON.stringify(u))}
function clearUser(){localStorage.removeItem(USER_KEY)}

// API-backed plan file operations
let _planCache=null;let _planCacheTime=0;
async function fetchPlans(accountId){
  // Return cached data if less than 30s old
  if(_planCache&&Date.now()-_planCacheTime<30000)return _planCache;
  try{
    const r=await fetch('/api/plan-files?accountId='+accountId);
    if(r.ok){_planCache=await r.json();_planCacheTime=Date.now();return _planCache}
    return[];
  }catch(e){console.warn('Failed to fetch plans:',e);return _planCache||[]}
}
function invalidatePlanCache(){_planCache=null;_planCacheTime=0}
async function createPlanApi(data){
  invalidatePlanCache();
  try{const r=await fetch('/api/plan-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(r.ok)return await r.json();return null}catch(e){console.warn('Failed to create plan:',e);return null}
}
async function loadPlanState(planId){
  try{const r=await fetch('/api/plan-files/'+planId);if(r.ok)return await r.json();return null}catch(e){console.warn('Failed to load plan:',e);return null}
}
async function deletePlanApi(planId){
  invalidatePlanCache();
  try{await fetch('/api/plan-files/'+planId,{method:'DELETE'})}catch(e){console.warn('Failed to delete plan:',e)}
}
async function loginApi(email){
  try{const r=await fetch('/api/accounts/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});if(r.ok)return await r.json();return null}catch(e){console.warn('Login API failed, using local fallback');return null}
}

function emailToInitials(email){
  const prefix=email.split('@')[0]||'';
  const parts=prefix.split('.');
  if(parts.length>=2)return parts.map(p=>p.charAt(0).toUpperCase()).join('.');
  if(prefix.length>=2)return prefix.slice(0,2).toUpperCase();
  return prefix.toUpperCase();
}

function emailToName(email){
  const prefix=email.split('@')[0]||'';
  return prefix.split('.').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ');
}

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}

// ── TIER 1: Auth Page ──
function initAuthPage(){
  const authPage=document.getElementById('authPage');
  const emailInput=document.getElementById('authEmail');
  const continueBtn=document.getElementById('authContinue');
  const errorEl=document.getElementById('authError');
  const card=document.querySelector('.auth-card');

  // Typing glow effect
  emailInput.addEventListener('input',()=>{
    card.classList.toggle('typing',emailInput.value.length>0);
  });

  async function doLogin(){
    const email=emailInput.value.trim().toLowerCase();
    if(!email||!email.includes('@')){
      errorEl.textContent='Please enter a valid email address';
      return;
    }
    const adminPassInput=document.getElementById('authAdminPass');
    const adminPass=adminPassInput?adminPassInput.value.trim():'';
    const isAdmin=adminPass==='abc123';
    continueBtn.textContent='...';continueBtn.disabled=true;
    // Try server login first, fall back to local
    const serverAccount=await loginApi(email);
    const user=serverAccount?{...serverAccount,name:emailToName(email)}:{email,initials:emailToInitials(email),name:emailToName(email),createdAt:Date.now()};
    user.isAdmin=isAdmin;
    setUser(user);
    // Track this user in known users list for admin panel
    trackKnownUser(user);
    continueBtn.textContent='Continue';continueBtn.disabled=false;
    authPage.style.display='none';
    showHomePage();
  }

  // Always attach handlers (even if already logged in — needed after sign out)
  continueBtn.addEventListener('click',doLogin);
  emailInput.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});

  // Check if already logged in
  const existing=getUser();
  if(existing){
    authPage.style.display='none';
    showHomePage();
  }
}

// ── TIER 2: Home Page ──
function showHomePage(){
  const user=getUser();
  if(!user)return;

  document.getElementById('homePage').style.display='';
  document.getElementById('homeUserLabel').innerHTML=`<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:.62rem;font-weight:700;margin-right:4px">${user.initials}</span>${user.name}${user.isAdmin?'<span style="font-size:.6rem;padding:1px 6px;border-radius:10px;background:var(--accent-soft);color:var(--accent);margin-left:6px;font-weight:600">Admin</span>':''}`;

  // Hide old UI elements
  document.getElementById('globalToolbar').style.display='none';
  document.getElementById('globalToolbarSpacer').style.display='none';
  const tmpl=document.getElementById('templateBanner');if(tmpl)tmpl.style.display='none';

  // Show/hide create section based on admin status
  const createSection=document.querySelector('.home-create-section');
  if(createSection)createSection.style.display=user.isAdmin?'':'none';

  renderPlanList();

  // Create plan (use onclick to prevent duplicate handlers)
  document.getElementById('homeCreatePlan').onclick=async()=>{
    const name=document.getElementById('homePlanName').value.trim();
    const year=document.getElementById('homePlanYear').value;
    const type=document.getElementById('homePlanType').value;
    if(!name){alert('Enter a plan name');return}
    const btn=document.getElementById('homeCreatePlan');
    btn.textContent='Creating...';btn.disabled=true;
    const result=await createPlanApi({name,year,scenarioType:type,accountId:user.id});
    btn.textContent='Create';btn.disabled=false;
    if(result){
      document.getElementById('homePlanName').value='';
      logActivity('Created plan',name+' ('+year+' '+type+')');
      renderPlanList();
    } else {alert('Failed to create plan')}
  };

  // Sign out
  document.getElementById('homeSignOut').onclick=()=>{
    clearUser();
    document.getElementById('homePage').style.display='none';
    document.getElementById('authPage').style.display='';
    document.getElementById('authEmail').value='';
    document.querySelector('.auth-card').classList.remove('typing');
  };
}

let _cachedPlans=[];
async function renderPlanList(){
  const user=getUser();
  const list=document.getElementById('homePlanList');

  // Show cached data immediately if available, fetch in background
  let plans=_planCache||[];
  if(user&&user.id){
    if(!plans.length){
      list.innerHTML='<div class="home-plan-empty" style="color:var(--tertiary)">Loading plans...</div>';
    }
    plans=await fetchPlans(user.id);
  }
  _cachedPlans=plans;

  if(!plans.length){
    list.innerHTML='<div class="home-plan-empty">No plans yet. Create one above.</div>';
  } else {
    // Split into shared (accessCount > 1) and private (accessCount == 1, owner only)
    const shared=[];
    const priv=[];
    plans.forEach((p,i)=>{
      p._idx=i; // preserve index for lookup
      if((p.accessCount||1)>1){shared.push(p)}else{priv.push(p)}
    });

    function renderCard(p){
      const date=new Date(p.updatedAt||p.createdAt);
      const timeStr=date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
      const type=p.scenarioType||p.type||'budget';
      const isOwner=p.role==='owner'||!p.role;
      const shareLabel=isOwner?'by me':'with me';
      const shareArrow=isOwner?'↗':'↙';
      const shareTag=`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.68rem;color:var(--tertiary);margin-left:auto;white-space:nowrap">${shareArrow} ${shareLabel}</span>`;
      const timeAgo=formatTimeAgo(date);
      return `<div class="home-plan-card" data-plan-id="${p.id}" data-plan-idx="${p._idx}">
        <div style="flex:1;min-width:0">
          <div class="plan-name" style="display:flex;align-items:baseline;gap:6px">
            ${p.name}
            <span class="plan-badge ${type}" style="flex-shrink:0">${type}</span>
            <span style="font-size:.68rem;color:var(--tertiary)">${p.year}</span>
          </div>
          <div class="plan-meta">
            <span title="${date.toLocaleString()}">${timeAgo}</span>
          </div>
        </div>
        ${(p.accessCount||1)>1?`<span style="display:flex;align-items:center;font-size:.66rem;color:var(--tertiary);white-space:nowrap;margin-right:2px">${shareArrow} ${shareLabel}</span>`:''}
        <div style="position:relative">
          <button class="plan-menu-btn" data-plan-idx="${p._idx}" title="Options" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--tertiary);padding:4px 8px;border-radius:4px">⋯</button>
        </div>
      </div>`;
    }

    let html='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    // Shared column
    html+='<div>';
    html+='<div style="font-size:.78rem;font-weight:600;color:var(--text-dim);padding:8px 12px;background:var(--panel-inset);border-radius:8px;margin-bottom:8px">Shared Versions</div>';
    if(shared.length){html+=shared.map(renderCard).join('')}
    else{html+='<div style="font-size:.78rem;color:var(--tertiary);padding:12px;text-align:center">No shared plans</div>'}
    html+='</div>';
    // Private column
    html+='<div>';
    html+='<div style="font-size:.78rem;font-weight:600;color:var(--text-dim);padding:8px 12px;background:var(--panel-inset);border-radius:8px;margin-bottom:8px">Private Versions</div>';
    if(priv.length){html+=priv.map(renderCard).join('')}
    else{html+='<div style="font-size:.78rem;color:var(--tertiary);padding:12px;text-align:center">No private plans</div>'}
    html+='</div>';
    html+='</div>';
    list.innerHTML=html;

    list.querySelectorAll('.home-plan-card').forEach(card=>{
      card.addEventListener('click',(e)=>{
        if(e.target.closest('.plan-menu-btn'))return;
        const idx=+card.dataset.planIdx;
        const plan=_cachedPlans[idx];
        if(!plan){console.error('Plan not found at index',idx,_cachedPlans);return}
        openPlan(plan).catch(err=>console.error('openPlan failed:',err));
      });
    });

    list.querySelectorAll('.plan-menu-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const idx=+btn.dataset.planIdx;
        const plan=_cachedPlans[idx];
        if(!plan)return;
        // Remove any existing dropdown
        document.querySelectorAll('.plan-ctx-menu').forEach(m=>m.remove());
        const menu=document.createElement('div');
        menu.className='plan-ctx-menu';
        const rect=btn.getBoundingClientRect();
        menu.style.cssText=`position:fixed;left:${rect.right-120}px;top:${rect.bottom+4}px;z-index:9999;background:var(--panel);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:120px;overflow:hidden`;
        menu.innerHTML=`
          <div class="plan-ctx-item" data-action="share" style="padding:8px 14px;font-size:.8rem;cursor:pointer;color:var(--text);transition:background .1s">Share</div>
          <div class="plan-ctx-item" data-action="delete" style="padding:8px 14px;font-size:.8rem;cursor:pointer;color:var(--danger);transition:background .1s">Delete</div>`;
        document.body.appendChild(menu);
        menu.querySelector('[data-action="share"]').addEventListener('click',(ev)=>{ev.stopPropagation();menu.remove();openShareModal(plan)});
        menu.querySelector('[data-action="delete"]').addEventListener('click',async(ev)=>{
          ev.stopPropagation();menu.remove();
          if(!confirm('Delete "'+plan.name+'"? This cannot be undone.'))return;
          // Remove card from DOM immediately
          const card=btn.closest('.home-plan-card');
          if(card)card.style.display='none';
          // Fire API in background, refresh list after
          fetch('/api/plan-files/'+plan.id,{method:'DELETE'}).then(r=>{
            invalidatePlanCache();_cachedPlans=null;renderPlanList();
          }).catch(()=>{
            if(card)card.style.display='';
          });
        });
        menu.querySelectorAll('.plan-ctx-item').forEach(item=>{
          item.addEventListener('mouseenter',()=>item.style.background='var(--bg-elevated)');
          item.addEventListener('mouseleave',()=>item.style.background='');
        });
        const dismiss=()=>{menu.remove();document.removeEventListener('click',dismiss)};
        setTimeout(()=>document.addEventListener('click',dismiss),0);
      });
    });
  }

  const fill=document.getElementById('homeStorageFill');
  const label=document.getElementById('homeStorageLabel');
  if(fill)fill.style.width=Math.min(100,plans.length*20)+'%';
  if(label)label.textContent=plans.length+' plan'+(plans.length!==1?'s':'');

  // Render recent activity from audit logs across plans
  renderHomeActivity(plans);
}

function renderHomeActivity(plans){
  const list=document.getElementById('homeActivityList');
  if(!list)return;
  // Collect recent plan opens/edits from localStorage
  const activities=[];
  try{
    const log=JSON.parse(localStorage.getItem('webplan-activity-log')||'[]');
    activities.push(...log.slice(-30));
  }catch(e){}
  if(!activities.length){list.innerHTML='<div style="font-size:.76rem;color:var(--tertiary);text-align:center;padding:8px">No recent activity</div>';return}
  activities.reverse();
  list.innerHTML=activities.map(a=>{
    const t=new Date(a.time);
    const ago=formatTimeAgo(t);
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.74rem">
      <span style="color:var(--text-dim);min-width:55px;font-size:.68rem">${ago}</span>
      <span style="color:var(--text)">${a.action}</span>
      <span style="color:var(--tertiary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.detail||''}</span>
    </div>`;
  }).join('');
}

// Track activity
function logActivity(action,detail){
  try{
    const log=JSON.parse(localStorage.getItem('webplan-activity-log')||'[]');
    log.push({action,detail,time:Date.now()});
    if(log.length>50)log.splice(0,log.length-50);
    localStorage.setItem('webplan-activity-log',JSON.stringify(log));
  }catch(e){}
}
window.logActivity=logActivity;

let _planSaveTimer=null;
async function openPlan(plan){
  if(!plan){console.error('openPlan called with null plan');return}
  const user=getUser();
  if(!user){console.error('openPlan: no user');return}
  console.log('Opening plan:',plan.name,plan.id);
  logActivity('Opened plan',plan.name);

  // Store active plan reference
  window._activePlan=plan;

  // Set current year from plan
  const planYear=parseInt(plan.year)||2026;
  if(window.setCurrentYear)window.setCurrentYear(planYear);

  // Ensure state is initialized before loading plan data
  try{loadState()}catch(e){console.warn('loadState init:',e)}
  ensureStateFields();
  window.state=state;

  // Load state from server
  const serverPlan=await loadPlanState(plan.id);
  if(serverPlan&&serverPlan.state_data){
    try{
      const parsed=JSON.parse(serverPlan.state_data);
      Object.keys(parsed).forEach(k=>{state[k]=parsed[k]});
    }catch(e){console.warn('Failed to parse plan state:',e)}
  }
  ensureStateFields();
  window.state=state;

  // Set up debounced autosave to server
  const origSaveState=window.saveState;
  let _lastSaveTime=null;
  let _saveRetryCount=0;
  const MAX_RETRIES=3;

  function updateSavedIndicator(){
    const savedEl=document.getElementById('planHdrSaved');
    if(!savedEl||!_lastSaveTime)return;
    const ago=Date.now()-_lastSaveTime;
    if(ago<60000)savedEl.textContent='Saved just now';
    else if(ago<3600000)savedEl.textContent='Saved '+Math.floor(ago/60000)+'m ago';
    else savedEl.textContent='Saved '+Math.floor(ago/3600000)+'h ago';
    savedEl.style.color='#4a9e8e';
    savedEl.style.cursor='default';
    savedEl.onclick=null;
  }
  // Update "Saved Xm ago" every 30s
  setInterval(updateSavedIndicator,30000);

  async function doServerSave(retryNum){
    const savedEl=document.getElementById('planHdrSaved');
    try{
      const s=window.state||state;
      const r=await fetch('/api/plan-files/'+plan.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stateData:JSON.stringify(s)})});
      if(!r.ok)throw new Error('Status '+r.status);
      _lastSaveTime=Date.now();
      _saveRetryCount=0;
      updateSavedIndicator();
    }catch(e){
      console.warn('Autosave failed (attempt '+(retryNum+1)+'):',e);
      if(retryNum<MAX_RETRIES-1){
        // Auto-retry with exponential backoff
        const delay=(retryNum+1)*2000;
        if(savedEl){savedEl.textContent='Retrying...';savedEl.style.color='var(--warning, #d97706)'}
        setTimeout(()=>doServerSave(retryNum+1),delay);
      } else {
        // All retries failed — show error with manual retry
        if(savedEl){
          savedEl.textContent='Save failed — click to retry';
          savedEl.style.color='var(--danger)';
          savedEl.style.cursor='pointer';
          savedEl.onclick=()=>{
            savedEl.textContent='Saving...';savedEl.style.color='#4a9e8e';
            savedEl.onclick=null;savedEl.style.cursor='default';
            doServerSave(0);
          };
        }
      }
    }
  }

  window.saveState=function(){
    if(origSaveState)origSaveState();
    // Broadcast to other users via WebSocket
    if(window._broadcastPlanState)try{window._broadcastPlanState()}catch(e){}
    if(_planSaveTimer)clearTimeout(_planSaveTimer);
    _planSaveTimer=setTimeout(()=>doServerSave(0),500);
    const savedEl=document.getElementById('planHdrSaved');
    if(savedEl){savedEl.textContent='Saving...';savedEl.style.color='#4a9e8e';savedEl.style.cursor='default';savedEl.onclick=null}
  };

  // Connect WebSocket for real-time collaboration
  connectPlanWebSocket(plan,user);

  // Hide home, show app
  document.getElementById('homePage').style.display='none';

  // Show plan header bar
  const hdr=document.getElementById('planHeaderBar');
  hdr.style.display='flex';
  document.getElementById('planHdrName').textContent=plan.name;
  const type=plan.scenarioType||plan.type||'budget';
  document.getElementById('planHdrBadge').textContent=plan.year+' '+type.toUpperCase();
  document.getElementById('planHdrBadge').className='plan-hdr-badge '+type;

  // User dot
  document.getElementById('planHdrUsers').innerHTML=`<div class="user-dot" style="background:${user.color||'#3a7d44'}" title="${user.name}">${user.initials}</div>`;

  // Global toolbar hidden — controls moved to settings panel and bottom toolbar

  // Update bottom toolbar — set directly AND via helper
  const _btbName=document.getElementById('btbPlanName');
  const _btbVer=document.getElementById('btbPlanVersion');
  const _btbEmail=document.getElementById('btbEmail');
  const _btb=document.getElementById('bottomToolbar');
  if(_btbName)_btbName.textContent=plan.name||'';
  if(_btbVer)_btbVer.textContent=(plan.year||'')+' '+(plan.scenarioType||'budget').toUpperCase();
  if(_btbEmail)_btbEmail.textContent=user.email||'';
  if(_btb)_btb.style.display='flex';
  if(window._updateBottomToolbar)window._updateBottomToolbar();

  // Show side panels, calendar, and LANDING PAGE (chevron nav)
  setSidePanelVisibility(true);

  // EXPLICITLY hide all modules and show only chevron nav
  ['appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  const _chb2=document.getElementById('compHeaderBar');if(_chb2)_chb2.style.display='none';

  // Show landing page with chevron nav visible
  const lp=document.getElementById('landingPage');if(lp)lp.style.display='';
  const chevNav=document.getElementById('chevronNav');if(chevNav)chevNav.style.display='';
  const sumContent=document.getElementById('landingSummaryContent');if(sumContent)sumContent.style.display='none';
  const oldHdr=document.getElementById('landingHeaderOld');if(oldHdr)oldHdr.style.display='none';

  // Apply admin controls from plan state
  if(window.checkOpsRestriction)try{window.checkOpsRestriction()}catch(e){}
  if(window.checkModuleAccess)try{window.checkModuleAccess()}catch(e){}

  // Show plan header bar + bottom toolbar
  if(window._showCalendar)try{window._showCalendar()}catch(e){}
  if(window._updateBottomToolbar)window._updateBottomToolbar();
  // Force bottom toolbar visible
  const btb=document.getElementById('bottomToolbar');if(btb)btb.style.display='flex';

  // Render landing content
  if(window.initDropdowns)try{window.initDropdowns()}catch(e){}
  if(window.renderPnlWalk)try{window.renderPnlWalk()}catch(e){}
  if(window.renderLandingCharts)try{window.renderLandingCharts()}catch(e){}
  // Init Other tabs after state is loaded
  if(window.initOtherTab)try{window.initOtherTab()}catch(e){}

  // appShell now properly wraps <main> so display:none works correctly

  // Back to home
  document.getElementById('planBackHome').onclick=()=>{
    try{if(window.saveState)window.saveState()}catch(e){}
    try{disconnectPlanWebSocket()}catch(e){}
    document.getElementById('planHeaderBar').style.display='none';
    const _chb=document.getElementById('compHeaderBar');if(_chb)_chb.style.display='none';
    try{document.getElementById('globalToolbar').style.display='none'}catch(e){}
    try{document.getElementById('globalToolbarSpacer').style.display='none'}catch(e){}
    const btb=document.getElementById('bottomToolbar');if(btb)btb.style.display='none';
    ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    // Close any open side panels
    try{if(window.closeAllSidePanels)window.closeAllSidePanels()}catch(e){}
    setSidePanelVisibility(false);
    if(window._hideCalendar)window._hideCalendar();
    document.getElementById('homePage').style.display='';
    try{renderPlanList()}catch(e){console.error('renderPlanList error:',e)}
  };
}

// ── WebSocket for plan collaboration ──
let _planWs=null;
function connectPlanWebSocket(plan,user){
  disconnectPlanWebSocket();
  const proto=location.protocol==='https:'?'wss:':'ws:';
  const url=proto+'//'+location.host+'/ws';
  try{
    _planWs=new WebSocket(url);
    _planWs.onopen=()=>{
      _planWs.send(JSON.stringify({type:'auth',planFileId:plan.id,accountId:user.id,initials:user.initials,color:user.color||'#3a7d44'}));
    };
    _planWs.onmessage=(ev)=>{
      try{
        const msg=JSON.parse(ev.data);
        if(msg.type==='state_sync'&&String(msg.fromAccountId)!==String(user.id)){
          // Apply remote state changes
          const parsed=JSON.parse(msg.stateData);
          Object.keys(parsed).forEach(k=>{state[k]=parsed[k]});
          window.state=state;
          ensureStateFields();
          // Re-render all visible views
          try{if(window.renderPnlWalk)window.renderPnlWalk()}catch(e){}
          try{if(window.renderLandingCharts)window.renderLandingCharts()}catch(e){}
          try{if(window.renderExecView)window.renderExecView()}catch(e){}
          try{if(window.renderEmployees)window.renderEmployees()}catch(e){}
          try{if(window.renderLtfChart)window.renderLtfChart()}catch(e){}
          try{if(window.renderPivot)window.renderPivot()}catch(e){}
          try{if(window.initOtherTab)window.initOtherTab()}catch(e){}
        }
        if(msg.type==='presence'){
          const dots=document.getElementById('planHdrUsers');
          if(dots&&msg.users){
            dots.innerHTML=msg.users.map(u=>{
              const tab=u.tab||'';
              const c=u.color||'#3a7d44';
              const tabBadge=tab?`<span style="font-size:.58rem;font-weight:600;color:#fff;background:${c}40;padding:2px 8px;border-radius:10px;margin-left:2px;letter-spacing:.03em;white-space:nowrap">${tab}</span>`:'';
              return `<span style="display:inline-flex;align-items:center;gap:0;margin-right:4px"><div class="user-dot" style="background:${c}" title="${u.initials}${tab?' — '+tab:''}">${u.initials}</div>${tabBadge}</span>`;
            }).join('');
          }
        }
        if(msg.type==='cursor'&&msg.fromAccountId!==user.id){
          // Show other user's cell selection
          showRemoteCursor(msg);
        }
      }catch(e){}
    };
    _planWs.onclose=()=>{_planWs=null};
    // Broadcast state changes
    const origSave=window.saveState;
    const wrappedSave=window.saveState;
    window._broadcastPlanState=function(){
      if(_planWs&&_planWs.readyState===1){
        _planWs.send(JSON.stringify({type:'state_update',stateData:JSON.stringify(state),timestamp:Date.now()}));
      }
    };
    // Hook into state.js broadcastStateChange so ALL modules' saveState calls broadcast
    window.broadcastStateChange=window._broadcastPlanState;
    // Also hook debouncedServerSave if not already set for plan files
    if(!window._planDebouncedSave){
      window._planDebouncedSave=true;
      const existingDSS=window.debouncedServerSave;
      window.debouncedServerSave=function(){
        // Plan file HTTP save is handled by openPlan's saveState wrapper
        // Just make sure it doesn't error if called from state.js
        if(existingDSS)try{existingDSS()}catch(e){}
      };
    }
  }catch(e){console.warn('WebSocket connection failed:',e)}
}
// ── Remote cursor indicators on cells ──
function showRemoteCursor(msg){
  // Remove previous cursor from this user
  document.querySelectorAll(`.remote-cursor[data-uid="${msg.fromAccountId}"]`).forEach(el=>el.remove());
  if(!msg.cellId)return;
  const cell=document.querySelector(`[data-cell-id="${msg.cellId}"]`)||document.getElementById(msg.cellId);
  if(!cell)return;
  // Add a small initials badge on the cell
  const badge=document.createElement('span');
  badge.className='remote-cursor';
  badge.dataset.uid=msg.fromAccountId;
  badge.style.cssText=`position:absolute;top:-8px;right:-4px;background:${msg.color||'var(--accent)'};color:#fff;font-size:.5rem;font-weight:700;padding:1px 3px;border-radius:3px;z-index:5;pointer-events:none;line-height:1`;
  badge.textContent=msg.initials||'?';
  cell.style.position='relative';
  cell.appendChild(badge);
  // Auto-remove after 5s
  setTimeout(()=>badge.remove(),5000);
}

// ── Broadcast current tab to presence ──
window._broadcastTab=function(tabName){
  if(_planWs&&_planWs.readyState===1){
    _planWs.send(JSON.stringify({type:'tab',tab:tabName}));
  }
};

// ── Broadcast cell focus for collaboration ──
window._broadcastCellFocus=function(cellId){
  const user=getUser();
  if(_planWs&&_planWs.readyState===1&&user){
    _planWs.send(JSON.stringify({type:'cursor',cellId:cellId,initials:user.initials,color:user.color||'#3a7d44'}));
  }
};

function disconnectPlanWebSocket(){
  if(_planWs){try{_planWs.close()}catch(e){}_planWs=null}
}

// ── Toolbar buttons ──
function wireToolbarButtons(){
  const notesBtn=document.getElementById('toolbarNotesBtn');
  if(notesBtn)notesBtn.addEventListener('click',()=>{
    const btn=document.getElementById('stickyNoteBtn');
    if(btn)btn.click();
  });
}

// ── Hide side panels until in a plan ──
function setSidePanelVisibility(visible){
  ['guideToggleBtn','dataToggleBtn','scenarioToggleBtn'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display=visible?'':'none';
  });
}

// ── Share Modal ──
function openShareModal(plan){
  let modal=document.getElementById('shareModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='shareModal';
    modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal" style="max-width:440px">
      <h3 id="shareModalTitle">Share Plan</h3>
      <div id="shareModalBody"></div>
      <div class="modal-actions"><button class="btn" onclick="document.getElementById('shareModal').classList.remove('show')">Close</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',(e)=>{if(e.target===modal)modal.classList.remove('show')});
  }
  document.getElementById('shareModalTitle').textContent='Share "'+plan.name+'"';
  const body=document.getElementById('shareModalBody');
  body.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <input type="email" id="shareEmailInput" placeholder="Enter email to share with..." style="flex:1">
      <button class="btn btn-primary" id="shareAddBtn" style="white-space:nowrap">Share</button>
    </div>
    <div id="shareStatus" style="font-size:.78rem;margin-bottom:12px;min-height:20px"></div>
    <h4 style="font-size:.78rem;color:var(--tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Shared With</h4>
    <div id="shareUserList" style="display:flex;flex-direction:column;gap:4px">
      <div style="font-size:.78rem;color:var(--tertiary)">Loading...</div>
    </div>`;

  const emailInput=document.getElementById('shareEmailInput');
  const addBtn=document.getElementById('shareAddBtn');
  const statusEl=document.getElementById('shareStatus');

  async function doShare(){
    const email=emailInput.value.trim().toLowerCase();
    if(!email||!email.includes('@')){statusEl.textContent='Please enter a valid email';statusEl.style.color='var(--danger)';return}
    addBtn.disabled=true;addBtn.textContent='...';
    try{
      const r=await fetch('/api/plan-files/'+plan.id+'/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      if(r.ok){
        statusEl.textContent='Shared with '+email;statusEl.style.color='var(--success)';
        emailInput.value='';
        loadSharedUsers(plan.id);
      } else {
        const data=await r.json().catch(()=>({}));
        statusEl.textContent=data.error||'Failed to share';statusEl.style.color='var(--danger)';
      }
    }catch(e){statusEl.textContent='Network error';statusEl.style.color='var(--danger)'}
    addBtn.disabled=false;addBtn.textContent='Share';
  }

  addBtn.addEventListener('click',doShare);
  emailInput.addEventListener('keydown',(e)=>{if(e.key==='Enter')doShare()});

  loadSharedUsers(plan.id);
  modal.classList.add('show');
}

async function loadSharedUsers(planId){
  const listEl=document.getElementById('shareUserList');
  if(!listEl)return;
  const currentUser=getUser();
  const isAdmin=currentUser&&currentUser.isAdmin;
  const MODS=[{key:'comp',label:'C&B'},{key:'vendor',label:'Vendor'},{key:'te',label:'T&E'},{key:'contractors',label:'CTR'},{key:'other',label:'Other'},{key:'depreciation',label:'D&A'},{key:'revenue',label:'Rev'},{key:'forecast',label:'LTF'}];
  try{
    const r=await fetch('/api/plan-files/'+planId+'/access');
    if(r.ok){
      const users=await r.json();
      if(!users.length){
        listEl.innerHTML='<div style="font-size:.78rem;color:var(--tertiary)">Only you have access.</div>';
        return;
      }
      const rules=window.state&&window.state.moduleAccess?window.state.moduleAccess:{};
      listEl.innerHTML=users.map(u=>{
        const email=u.email.toLowerCase();
        const ur=rules[email]||{};
        let h=`<div style="padding:8px 0;border-bottom:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:24px;height:24px;border-radius:50%;background:${u.color||'var(--accent)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;flex-shrink:0">${u.initials||'?'}</div>
            <div style="flex:1">
              <div style="font-size:.82rem;font-weight:500;color:var(--text)">${u.email}</div>
              <div style="font-size:.68rem;color:var(--tertiary)">${u.role||'editor'}</div>
            </div>
            ${u.role!=='owner'&&isAdmin?`<button class="share-remove-btn" data-account-id="${u.id}" data-email="${email}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.9rem;padding:2px 6px;opacity:.5" title="Remove access">×</button>`:''}
          </div>`;
        if(isAdmin&&u.role!=='owner'){
          h+=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;padding-left:32px">${MODS.map(m=>{
            const allowed=ur[m.key]!==false;
            return `<label style="display:flex;align-items:center;gap:2px;font-size:.6rem;cursor:pointer;color:var(--text-dim)"><input type="checkbox" class="share-mod-cb" data-email="${email}" data-mod="${m.key}" ${allowed?'checked':''} style="accent-color:var(--accent);width:12px;height:12px">${m.label}</label>`;
          }).join('')}</div>`;
        }
        h+=`</div>`;
        return h;
      }).join('');
      // Wire remove buttons
      listEl.querySelectorAll('.share-remove-btn').forEach(btn=>{
        btn.addEventListener('click',async()=>{
          const accountId=btn.dataset.accountId;
          const email=btn.dataset.email;
          if(!confirm('Remove access for '+email+'?'))return;
          try{
            await fetch('/api/plan-files/'+planId+'/access/'+accountId,{method:'DELETE'});
            loadSharedUsers(planId);
          }catch(e){alert('Failed to remove access')}
        });
        btn.addEventListener('mouseenter',()=>btn.style.opacity='1');
        btn.addEventListener('mouseleave',()=>btn.style.opacity='.5');
      });
      // Wire module access checkboxes in share modal
      if(isAdmin){
        listEl.querySelectorAll('.share-mod-cb').forEach(cb=>{
          cb.addEventListener('change',()=>{
            if(!window.state)return;
            if(!window.state.moduleAccess)window.state.moduleAccess={};
            const em=cb.dataset.email;
            if(!window.state.moduleAccess[em])window.state.moduleAccess[em]={};
            window.state.moduleAccess[em][cb.dataset.mod]=cb.checked;
            if(window.saveState)window.saveState();
          });
        });
      }
    } else {
      listEl.innerHTML='<div style="font-size:.78rem;color:var(--tertiary)">Could not load shared users.</div>';
    }
  }catch(e){
    listEl.innerHTML='<div style="font-size:.78rem;color:var(--tertiary)">Could not load shared users.</div>';
  }
}

// ── Track known users for admin panel ──
const KNOWN_USERS_KEY='webplan-known-users';
function trackKnownUser(user){
  if(!user||!user.email)return;
  try{
    const known=JSON.parse(localStorage.getItem(KNOWN_USERS_KEY)||'[]');
    const email=user.email.toLowerCase();
    const existing=known.find(u=>u.email.toLowerCase()===email);
    if(existing){
      existing.name=user.name||existing.name;
      existing.lastSeen=Date.now();
    } else {
      known.push({email:user.email,name:user.name||'',initials:user.initials||'',lastSeen:Date.now()});
    }
    localStorage.setItem(KNOWN_USERS_KEY,JSON.stringify(known));
  }catch(e){}
}
window.trackKnownUser=trackKnownUser;

// ── Init ──
initAuthPage();
setSidePanelVisibility(false); // Hidden until plan opened
wireToolbarButtons();

// ── Global Home button handler (failsafe — always wired) ──
const _homeBtn=document.getElementById('planBackHome');
if(_homeBtn){
  _homeBtn.addEventListener('click',()=>{
    try{if(window.saveState)window.saveState()}catch(e){}
    document.getElementById('planHeaderBar').style.display='none';
    const _chb=document.getElementById('compHeaderBar');if(_chb)_chb.style.display='none';
    try{document.getElementById('globalToolbar').style.display='none'}catch(e){}
    try{document.getElementById('globalToolbarSpacer').style.display='none'}catch(e){}
    const btb=document.getElementById('bottomToolbar');if(btb)btb.style.display='none';
    // Close settings panel
    const sp=document.getElementById('settingsSlidePanel');if(sp){sp.classList.remove('open');sp.style.transform='translateX(100%)'}
    ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    try{if(window.closeAllSidePanels)window.closeAllSidePanels()}catch(e){}
    document.body.classList.remove('scenario-open','data-open','guide-open');
    if(window._hideCalendar)window._hideCalendar();
    document.getElementById('homePage').style.display='';
    if(typeof renderPlanList==='function')try{renderPlanList()}catch(e){}
  });
}

// Expose for other modules
window.getActiveUser=getUser;
window.emailToInitials=emailToInitials;
window.setSidePanelVisibility=setSidePanelVisibility;
