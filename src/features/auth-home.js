// ═══ AUTH & HOME — Tier 1 email entry + Tier 2 file manager ═══
import { state, saveState, loadState, ensureStateFields } from '../lib/state.js';

const USER_KEY='compPlanUser';

function getUser(){
  const raw=localStorage.getItem(USER_KEY);
  return raw?JSON.parse(raw):null;
}
function setUser(u){localStorage.setItem(USER_KEY,JSON.stringify(u))}
function clearUser(){localStorage.removeItem(USER_KEY)}

// API-backed plan file operations
async function fetchPlans(accountId){
  try{const r=await fetch('/api/plan-files?accountId='+accountId);if(r.ok)return await r.json();return[]}catch(e){console.warn('Failed to fetch plans:',e);return[]}
}
async function createPlanApi(data){
  try{const r=await fetch('/api/plan-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(r.ok)return await r.json();return null}catch(e){console.warn('Failed to create plan:',e);return null}
}
async function loadPlanState(planId){
  try{const r=await fetch('/api/plan-files/'+planId);if(r.ok)return await r.json();return null}catch(e){console.warn('Failed to load plan:',e);return null}
}
async function deletePlanApi(planId){
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
    continueBtn.textContent='...';continueBtn.disabled=true;
    // Try server login first, fall back to local
    const serverAccount=await loginApi(email);
    const user=serverAccount?{...serverAccount,name:emailToName(email)}:{email,initials:emailToInitials(email),name:emailToName(email),createdAt:Date.now()};
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
  document.getElementById('homeUserLabel').innerHTML=`<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:.62rem;font-weight:700;margin-right:4px">${user.initials}</span>${user.name}`;

  // Hide old UI elements
  document.getElementById('globalToolbar').style.display='none';
  document.getElementById('globalToolbarSpacer').style.display='none';
  const tmpl=document.getElementById('templateBanner');if(tmpl)tmpl.style.display='none';

  renderPlanList();

  // Create plan
  document.getElementById('homeCreatePlan').addEventListener('click',async()=>{
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
      renderPlanList();
    } else {alert('Failed to create plan')}
  });

  // Sign out
  document.getElementById('homeSignOut').addEventListener('click',()=>{
    clearUser();
    document.getElementById('homePage').style.display='none';
    document.getElementById('authPage').style.display='';
    document.getElementById('authEmail').value='';
    document.querySelector('.auth-card').classList.remove('typing');
  });
}

let _cachedPlans=[];
async function renderPlanList(){
  const user=getUser();
  const list=document.getElementById('homePlanList');

  // Show loading state
  list.innerHTML='<div class="home-plan-empty" style="color:var(--tertiary)">Loading plans...</div>';

  // Fetch from server if user has server id, otherwise empty
  let plans=[];
  if(user&&user.id){
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
      return `<div class="home-plan-card" data-plan-id="${p.id}" data-plan-idx="${p._idx}">
        <div style="flex:1;min-width:0">
          <div class="plan-name" style="display:flex;align-items:center;gap:6px">${p.name}${(p.accessCount||1)>1?shareTag:''}</div>
          <div class="plan-meta">
            <span class="plan-badge ${type}">${type}</span>
            <span>${p.year}</span>
            <span>${timeStr}</span>
          </div>
        </div>
        <button class="plan-menu-btn" data-plan-idx="${p._idx}" title="Share" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--tertiary);padding:4px 8px;border-radius:4px">⋯</button>
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
        if(e.target.classList.contains('plan-menu-btn'))return;
        const idx=+card.dataset.planIdx;
        openPlan(_cachedPlans[idx]);
      });
    });

    list.querySelectorAll('.plan-menu-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const idx=+btn.dataset.planIdx;
        const plan=_cachedPlans[idx];
        if(plan)openShareModal(plan);
      });
    });
  }

  const fill=document.getElementById('homeStorageFill');
  const label=document.getElementById('homeStorageLabel');
  if(fill)fill.style.width=Math.min(100,plans.length*20)+'%';
  if(label)label.textContent=plans.length+' plan'+(plans.length!==1?'s':'');
}

let _planSaveTimer=null;
async function openPlan(plan){
  if(!plan)return;
  const user=getUser();

  // Store active plan reference
  window._activePlan=plan;

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
  window.saveState=function(){
    if(origSaveState)origSaveState();
    // Debounced server save
    if(_planSaveTimer)clearTimeout(_planSaveTimer);
    _planSaveTimer=setTimeout(async()=>{
      try{
        await fetch('/api/plan-files/'+plan.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stateData:JSON.stringify(state)})});
        const savedEl=document.getElementById('planHdrSaved');
        if(savedEl){savedEl.textContent='Saved';savedEl.style.color='var(--success)'}
      }catch(e){console.warn('Autosave failed:',e)}
    },1000);
    // Update save indicator
    const savedEl=document.getElementById('planHdrSaved');
    if(savedEl){savedEl.textContent='Saving...';savedEl.style.color='var(--text-dim)'}
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

  // Show global toolbar below plan header
  document.getElementById('globalToolbar').style.display='flex';
  document.getElementById('globalToolbar').style.top='34px';
  document.getElementById('globalToolbarSpacer').style.display='';
  document.getElementById('globalToolbarSpacer').style.height='70px';

  // Update bottom toolbar
  if(window._updateBottomToolbar)window._updateBottomToolbar();

  // Show side panels and landing page
  setSidePanelVisibility(true);
  if(window.showLanding)window.showLanding();
  if(window.initDropdowns)try{window.initDropdowns()}catch(e){}
  if(window.renderAll)try{window.renderAll()}catch(e){}
  if(window.renderPnlWalk)try{window.renderPnlWalk()}catch(e){}
  if(window.renderLandingCharts)try{window.renderLandingCharts()}catch(e){}

  // Back to home
  document.getElementById('planBackHome').onclick=()=>{
    try{if(window.saveState)window.saveState()}catch(e){}
    try{disconnectPlanWebSocket()}catch(e){}
    document.getElementById('planHeaderBar').style.display='none';
    try{document.getElementById('globalToolbar').style.display='none'}catch(e){}
    try{document.getElementById('globalToolbarSpacer').style.display='none'}catch(e){}
    const btb=document.getElementById('bottomToolbar');if(btb)btb.style.display='none';
    ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    // Close any open side panels
    try{if(window.closeAllSidePanels)window.closeAllSidePanels()}catch(e){}
    setSidePanelVisibility(false);
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
          // Apply remote state
          const parsed=JSON.parse(msg.stateData);
          Object.keys(parsed).forEach(k=>{state[k]=parsed[k]});
          window.state=state;
          ensureStateFields();
          if(window.renderAll)try{window.renderAll()}catch(e){}
        }
        if(msg.type==='presence'){
          // Update presence dots in plan header with tab labels
          const dots=document.getElementById('planHdrUsers');
          if(dots&&msg.users){
            dots.innerHTML=msg.users.map(u=>{
              const tabLabel=u.tab?`<span style="font-size:.55rem;color:var(--toolbar-text-dim);margin-left:2px">${u.tab}</span>`:'';
              return `<div class="user-dot" style="background:${u.color||'#3a7d44'}" title="${u.initials}${u.tab?' — '+u.tab:''}">${u.initials}</div>${tabLabel}`;
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
  try{
    const r=await fetch('/api/plan-files/'+planId+'/access');
    if(r.ok){
      const users=await r.json();
      if(!users.length){
        listEl.innerHTML='<div style="font-size:.78rem;color:var(--tertiary)">Only you have access.</div>';
        return;
      }
      listEl.innerHTML=users.map(u=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">
          <div style="width:24px;height:24px;border-radius:50%;background:${u.color||'var(--accent)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;flex-shrink:0">${u.initials||'?'}</div>
          <div style="flex:1">
            <div style="font-size:.82rem;font-weight:500;color:var(--text)">${u.email}</div>
            <div style="font-size:.68rem;color:var(--tertiary)">${u.role||'editor'}</div>
          </div>
        </div>`).join('');
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
    document.getElementById('homePage').style.display='';
    if(typeof renderPlanList==='function')try{renderPlanList()}catch(e){}
  });
}

// Expose for other modules
window.getActiveUser=getUser;
window.emailToInitials=emailToInitials;
window.setSidePanelVisibility=setSidePanelVisibility;
