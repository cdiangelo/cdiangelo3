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

  // Check if already logged in
  const existing=getUser();
  if(existing){
    authPage.style.display='none';
    showHomePage();
    return;
  }

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
    continueBtn.textContent='Continue';continueBtn.disabled=false;
    authPage.style.display='none';
    showHomePage();
  }

  continueBtn.addEventListener('click',doLogin);
  emailInput.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
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

  // Fetch from server if user has server id, otherwise empty
  let plans=[];
  if(user&&user.id){
    plans=await fetchPlans(user.id);
  }
  _cachedPlans=plans;

  if(!plans.length){
    list.innerHTML='<div class="home-plan-empty">No plans yet. Create one above.</div>';
  } else {
    list.innerHTML=plans.map((p,i)=>{
      const date=new Date(p.updatedAt||p.createdAt);
      const timeStr=date.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
      const type=p.scenarioType||p.type||'budget';
      return `<div class="home-plan-card" data-plan-id="${p.id}" data-plan-idx="${i}">
        <div class="plan-initials" style="background:${['#8b5e5e','#6b8da3','#3a7d44','#7a6b8d','#a38b5e'][i%5]}">${p.creatorInitials||p.creator||'?'}</div>
        <div style="flex:1">
          <div class="plan-name">${p.name}</div>
          <div class="plan-meta">
            <span class="plan-badge ${type}">${type}</span>
            <span>${p.year}</span>
            <span>Updated ${timeStr}</span>
          </div>
        </div>
        <span class="plan-delete" data-plan-id="${p.id}" title="Delete plan">&times;</span>
      </div>`;
    }).join('');

    list.querySelectorAll('.home-plan-card').forEach(card=>{
      card.addEventListener('click',(e)=>{
        if(e.target.classList.contains('plan-delete'))return;
        const idx=+card.dataset.planIdx;
        openPlan(_cachedPlans[idx]);
      });
    });

    list.querySelectorAll('.plan-delete').forEach(btn=>{
      btn.addEventListener('click',async(e)=>{
        e.stopPropagation();
        const planId=btn.dataset.planId;
        const plan=_cachedPlans.find(p=>String(p.id)===planId);
        if(!plan||!confirm('Delete "'+plan.name+'"?'))return;
        await deletePlanApi(planId);
        renderPlanList();
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
    if(window.saveState)window.saveState();
    disconnectPlanWebSocket();
    document.getElementById('planHeaderBar').style.display='none';
    document.getElementById('globalToolbar').style.display='none';
    document.getElementById('globalToolbarSpacer').style.display='none';
    ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    setSidePanelVisibility(false);
    if(window._updateBottomToolbar)window._updateBottomToolbar();
    document.getElementById('homePage').style.display='';
    renderPlanList();
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
        if(msg.type==='state_sync'&&msg.fromAccountId!==user.id){
          // Apply remote state
          const parsed=JSON.parse(msg.stateData);
          Object.keys(parsed).forEach(k=>{state[k]=parsed[k]});
          window.state=state;
          ensureStateFields();
          if(window.renderAll)try{window.renderAll()}catch(e){}
        }
        if(msg.type==='presence'){
          // Update presence dots in plan header
          const dots=document.getElementById('planHdrUsers');
          if(dots&&msg.users){
            dots.innerHTML=msg.users.map(u=>`<div class="user-dot" style="background:${u.color||'#3a7d44'}" title="${u.initials}">${u.initials}</div>`).join('');
          }
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
    // Hook into saveState to also broadcast
    const prevSave=window.saveState;
    window.saveState=function(){
      if(prevSave)prevSave();
      if(window._broadcastPlanState)window._broadcastPlanState();
    };
  }catch(e){console.warn('WebSocket connection failed:',e)}
}
function disconnectPlanWebSocket(){
  if(_planWs){try{_planWs.close()}catch(e){}_planWs=null}
}

// ── Toolbar buttons: Notes, Whiteboard, Teams ──
function wireToolbarButtons(){
  // Notes — toggle existing sticky note panel
  const notesBtn=document.getElementById('toolbarNotesBtn');
  if(notesBtn)notesBtn.addEventListener('click',()=>{
    const btn=document.getElementById('stickyNoteBtn');
    if(btn)btn.click();
  });
  // Whiteboard — toggle popout pane
  const wbBtn=document.getElementById('toolbarWhiteboardBtn');
  if(wbBtn)wbBtn.addEventListener('click',()=>{
    const popout=document.getElementById('whiteboardPopout');
    if(!popout)return;
    const show=popout.style.display==='none';
    popout.style.display=show?'':'none';
    if(show)initWhiteboardPopout();
  });
  // Teams — toggle existing teams panel
  const teamsBtn=document.getElementById('toolbarTeamsBtn');
  if(teamsBtn)teamsBtn.addEventListener('click',()=>{
    const btn=document.getElementById('teamsBtn');
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

// ── Whiteboard Popout ──
let _wbPopoutInited=false;
function initWhiteboardPopout(){
  if(_wbPopoutInited)return;
  _wbPopoutInited=true;
  const canvas=document.getElementById('wbPopoutCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let drawing=false,lastX=0,lastY=0,size=3,color='#1a1a1a',history=[];
  const shape=document.getElementById('wbPopoutShape');

  function resize(){canvas.width=canvas.clientWidth;canvas.height=canvas.clientHeight;redraw()}
  function redraw(){history.forEach(s=>{ctx.beginPath();ctx.strokeStyle=s.c;ctx.lineWidth=s.w;ctx.lineCap='round';s.pts.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.stroke()})}
  new ResizeObserver(resize).observe(canvas);
  setTimeout(resize,100);

  function pos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  canvas.addEventListener('mousedown',e=>{drawing=true;const p=pos(e);lastX=p.x;lastY=p.y;
    if((shape.value||'')==='eraser'){ctx.clearRect(p.x-size*2,p.y-size*2,size*4,size*4);return}
    history.push({c:color,w:size,pts:[p]})});
  canvas.addEventListener('mousemove',e=>{if(!drawing)return;const p=pos(e);
    if((shape.value||'')==='eraser'){ctx.clearRect(p.x-size*2,p.y-size*2,size*4,size*4);return}
    const cur=history[history.length-1];if(cur)cur.pts.push(p);
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y});
  canvas.addEventListener('mouseup',()=>{drawing=false});
  canvas.addEventListener('mouseleave',()=>{drawing=false});

  document.getElementById('wbPopoutSize').addEventListener('input',function(){size=+this.value});
  document.getElementById('wbPopoutUndo').addEventListener('click',()=>{history.pop();ctx.clearRect(0,0,canvas.width,canvas.height);redraw()});
  document.getElementById('wbPopoutClear').addEventListener('click',()=>{history=[];ctx.clearRect(0,0,canvas.width,canvas.height)});
  document.getElementById('wbPopoutClose').addEventListener('click',()=>{document.getElementById('whiteboardPopout').style.display='none'});

  // Colors
  const isDark=document.documentElement.classList.contains('dark');
  const colors=isDark?['#ffffff','#c4a0a0','#a0b8c8','#5ab866','#b0a0c0','#ff6b6b','#ffa94d','#74c0fc']:['#1a1a1a','#8b5e5e','#6b8da3','#3a7d44','#7a6b8d','#dc2626','#ea580c','#2563eb'];
  const colEl=document.getElementById('wbPopoutColors');
  colors.forEach(c=>{
    const dot=document.createElement('span');
    dot.style.cssText=`width:12px;height:12px;border-radius:50%;background:${c};cursor:pointer;border:1px solid var(--border)`;
    dot.addEventListener('click',()=>{color=c});
    colEl.appendChild(dot);
  });

  // Draggable header
  const hdr=document.getElementById('wbPopoutHeader');
  const popout=document.getElementById('whiteboardPopout');
  let dragging=false,dx=0,dy=0;
  hdr.addEventListener('mousedown',e=>{dragging=true;dx=e.clientX-popout.offsetLeft;dy=e.clientY-popout.offsetTop;e.preventDefault()});
  document.addEventListener('mousemove',e=>{if(!dragging)return;popout.style.left=(e.clientX-dx)+'px';popout.style.top=(e.clientY-dy)+'px';popout.style.right='auto';popout.style.bottom='auto'});
  document.addEventListener('mouseup',()=>{dragging=false});
}

// ── Init ──
initAuthPage();
setSidePanelVisibility(false); // Hidden until plan opened
wireToolbarButtons();

// Expose for other modules
window.getActiveUser=getUser;
window.emailToInitials=emailToInitials;
window.setSidePanelVisibility=setSidePanelVisibility;
