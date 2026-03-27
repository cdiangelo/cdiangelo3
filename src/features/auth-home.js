// ═══ AUTH & HOME — Tier 1 email entry + Tier 2 file manager ═══
import { state, saveState, loadState, ensureStateFields } from '../lib/state.js';

const PLANS_KEY='compPlanFiles';
const USER_KEY='compPlanUser';

function getUser(){
  const raw=localStorage.getItem(USER_KEY);
  return raw?JSON.parse(raw):null;
}
function setUser(u){localStorage.setItem(USER_KEY,JSON.stringify(u))}
function clearUser(){localStorage.removeItem(USER_KEY)}

function getPlans(){try{return JSON.parse(localStorage.getItem(PLANS_KEY)||'[]')}catch(e){return[]}}
function setPlans(arr){localStorage.setItem(PLANS_KEY,JSON.stringify(arr))}

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

  function doLogin(){
    const email=emailInput.value.trim().toLowerCase();
    if(!email||!email.includes('@')){
      errorEl.textContent='Please enter a valid email address';
      return;
    }
    const user={email,initials:emailToInitials(email),name:emailToName(email),createdAt:Date.now()};
    setUser(user);
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
  document.getElementById('homeCreatePlan').addEventListener('click',()=>{
    const name=document.getElementById('homePlanName').value.trim();
    const year=document.getElementById('homePlanYear').value;
    const type=document.getElementById('homePlanType').value;
    if(!name){alert('Enter a plan name');return}
    const plans=getPlans();
    const plan={id:uid(),name,year,type,creator:user.initials,creatorEmail:user.email,createdAt:Date.now(),updatedAt:Date.now()};
    plans.push(plan);
    setPlans(plans);
    document.getElementById('homePlanName').value='';
    renderPlanList();
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

function renderPlanList(){
  const plans=getPlans();
  const list=document.getElementById('homePlanList');
  const user=getUser();

  if(!plans.length){
    list.innerHTML='<div class="home-plan-empty">No plans yet. Create one above.</div>';
  } else {
    list.innerHTML=plans.map((p,i)=>{
      const date=new Date(p.updatedAt||p.createdAt);
      const timeStr=date.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
      return `<div class="home-plan-card" data-plan-idx="${i}">
        <div class="plan-initials" style="background:${['#8b5e5e','#6b8da3','#3a7d44','#7a6b8d','#a38b5e'][i%5]}">${p.creator||'?'}</div>
        <div style="flex:1">
          <div class="plan-name">${p.name}</div>
          <div class="plan-meta">
            <span class="plan-badge ${p.type}">${p.type}</span>
            <span>${p.year}</span>
            <span>Updated ${timeStr}</span>
          </div>
        </div>
        <span class="plan-delete" data-plan-del="${i}" title="Delete plan">&times;</span>
      </div>`;
    }).join('');

    // Click to open plan
    list.querySelectorAll('.home-plan-card').forEach(card=>{
      card.addEventListener('click',(e)=>{
        if(e.target.classList.contains('plan-delete'))return;
        const idx=+card.dataset.planIdx;
        openPlan(idx);
      });
    });

    // Delete
    list.querySelectorAll('.plan-delete').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const idx=+btn.dataset.planDel;
        if(!confirm('Delete "'+plans[idx].name+'"?'))return;
        plans.splice(idx,1);
        setPlans(plans);
        // Also remove saved state for this plan
        localStorage.removeItem('compPlanState_'+plans[idx]?.id);
        renderPlanList();
      });
    });
  }

  // Storage info
  const fill=document.getElementById('homeStorageFill');
  const label=document.getElementById('homeStorageLabel');
  if(fill)fill.style.width=Math.min(100,plans.length*20)+'%';
  if(label)label.textContent=plans.length+' plan'+(plans.length!==1?'s':'')+' (max 5)';
}

function openPlan(idx){
  const plans=getPlans();
  const plan=plans[idx];
  if(!plan)return;
  const user=getUser();

  // Store active plan reference
  window._activePlan=plan;
  window._activePlanIdx=idx;

  // Load plan state (or create fresh)
  const stateKey='compPlanState_'+plan.id;
  const raw=localStorage.getItem(stateKey);
  if(raw){
    try{
      const parsed=JSON.parse(raw);
      // Replace current state
      Object.keys(parsed).forEach(k=>{state[k]=parsed[k]});
    }catch(e){console.warn('Failed to load plan state:',e)}
  }
  ensureStateFields();
  window.state=state;

  // Set up autosave to this plan's key
  const origSaveState=window.saveState;
  window.saveState=function(){
    if(origSaveState)origSaveState();
    localStorage.setItem(stateKey,JSON.stringify(state));
    // Update timestamp
    plan.updatedAt=Date.now();
    plans[idx]=plan;
    setPlans(plans);
  };

  // Hide home, show app
  document.getElementById('homePage').style.display='none';

  // Show plan header bar
  const hdr=document.getElementById('planHeaderBar');
  hdr.style.display='flex';
  document.getElementById('planHdrName').textContent=plan.name;
  document.getElementById('planHdrBadge').textContent=plan.year+' '+plan.type.toUpperCase();
  document.getElementById('planHdrBadge').className='plan-hdr-badge '+plan.type;

  // User dot
  document.getElementById('planHdrUsers').innerHTML=`<div class="user-dot" style="background:${['#8b5e5e','#6b8da3','#3a7d44','#7a6b8d','#a38b5e'][idx%5]}" title="${user.name}">${user.initials}</div>`;

  // Show global toolbar below plan header
  document.getElementById('globalToolbar').style.display='flex';
  document.getElementById('globalToolbar').style.top='34px';
  document.getElementById('globalToolbarSpacer').style.display='';
  document.getElementById('globalToolbarSpacer').style.height='70px';

  // Show landing page
  if(window.showLanding)window.showLanding();
  if(window.renderAll)try{window.renderAll()}catch(e){}
  if(window.renderPnlWalk)try{window.renderPnlWalk()}catch(e){}
  if(window.renderLandingCharts)try{window.renderLandingCharts()}catch(e){}

  // Back to home
  document.getElementById('planBackHome').addEventListener('click',()=>{
    // Save current state
    if(window.saveState)window.saveState();
    // Hide app elements
    document.getElementById('planHeaderBar').style.display='none';
    document.getElementById('globalToolbar').style.display='none';
    document.getElementById('globalToolbarSpacer').style.display='none';
    // Hide all modules
    ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    // Show home
    document.getElementById('homePage').style.display='';
    renderPlanList();
  });
}

// ── Init ──
initAuthPage();

// Expose for other modules
window.getActiveUser=getUser;
window.emailToInitials=emailToInitials;
