// ── landing.js — ES module extracted from index.html lines 14872–15479 ──
import { state, saveState, ensureStateFields, getBonusAmt, getBenefitsAmt } from '../lib/state.js';
import { fmt, esc, CURRENT_YEAR, FUNCTIONS, COUNTRIES } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx, getProratedComp, getProratedCapEx, getProratedBase, getProratedBonus, getProratedBenefits } from '../lib/proration.js';

/* ── globals accessed via window (not yet modularised) ── */
const getChartColors          = (...a) => window.getChartColors(...a);
const hexToRgba               = (...a) => window.hexToRgba(...a);
const projectForecast         = (...a) => window.projectForecast(...a);
const getVendorOaoTotal       = (...a) => window.getVendorOaoTotal(...a);
const getContractorCapExTotal = (...a) => window.getContractorCapExTotal(...a);
const getContractorCapExByMonth = (...a) => window.getContractorCapExByMonth(...a);
const getDepreciationTotal    = (...a) => window.getDepreciationTotal(...a);
const getVendorOaoByMonth     = (...a) => window.getVendorOaoByMonth(...a);
const getDepreciationByMonth  = (...a) => window.getDepreciationByMonth(...a);
const getRevenueTotal         = (...a) => window.getRevenueTotal(...a);
const getRevenueByMonth       = (...a) => window.getRevenueByMonth(...a);
const getRevenueMrr           = (...a) => window.getRevenueMrr(...a);
const getClientRevenue        = (...a) => window.getClientRevenue(...a);
const initScenarioPane        = (...a) => window.initScenarioPane(...a);
const initDataPanel           = (...a) => window.initDataPanel(...a);
const initVendorModule        = (...a) => window.initVendorModule(...a);
const initDepModule           = (...a) => window.initDepModule(...a);
const initRevenueModule       = (...a) => window.initRevenueModule(...a);
const initAssetTab            = (...a) => window.initAssetTab(...a);
const initDropdowns           = (...a) => window.initDropdowns(...a);
const initBizLines            = (...a) => window.initBizLines(...a);
const initSessionModal        = (...a) => window.initSessionModal(...a);
const connectWebSocket        = (...a) => window.connectWebSocket(...a);
const loadUserColorScheme     = (...a) => window.loadUserColorScheme(...a);
const updateSessionUI         = (...a) => window.updateSessionUI(...a);
const updateWsDisplay         = (...a) => window.updateWsDisplay(...a);
const loadState               = (...a) => window.loadState(...a);
/* renderAll is defined locally in this module (see below) */
const renderExecView          = (...a) => window.renderExecView(...a);
const renderDashboard         = (...a) => window.renderDashboard(...a);
const renderEmployees         = (...a) => window.renderEmployees(...a);
const renderProjects          = (...a) => window.renderProjects(...a);
const renderMarkets           = (...a) => window.renderMarkets(...a);
const renderBizLines          = (...a) => window.renderBizLines(...a);
const renderBonusMatrix       = (...a) => window.renderBonusMatrix(...a);
const renderBenefitsMatrix    = (...a) => window.renderBenefitsMatrix(...a);
const renderMonthly           = (...a) => window.renderMonthly(...a);
const renderForecast          = (...a) => window.renderForecast(...a);
const renderWorkspaceList     = (...a) => window.renderWorkspaceList(...a);
const getEmpProject           = (...a) => window.getEmpProject(...a);
const getEmpMarkets           = (...a) => window.getEmpMarkets(...a);

/* ── scenario module functions (referenced in renderAll / initApp) ── */
const renderBudgetScenarioChart = (...a) => { if(window.renderBudgetScenarioChart) window.renderBudgetScenarioChart(...a); };
const renderFcScenarioChart     = (...a) => { if(window.renderFcScenarioChart) window.renderFcScenarioChart(...a); };
const renderScenarioPnlSummary  = (...a) => { if(window.renderScenarioPnlSummary) window.renderScenarioPnlSummary(...a); };

/* ── CDN globals ── */
const Chart = window.Chart;

// ── Collapsible spend analysis sections (global) ──
function toggleAnalysisSection(bodyId,headerEl){
  const body=document.getElementById(bodyId);
  if(!body)return;
  const arrow=headerEl.querySelector('.analysis-arrow');
  if(body.style.display==='none'){
    body.style.display='';
    if(arrow)arrow.style.transform='rotate(90deg)';
  } else {
    body.style.display='none';
    if(arrow)arrow.style.transform='rotate(0deg)';
  }
}

// Band filter toggles for dep/rev analysis sections
function toggleDepBand(btn){toggleBandFilter(btn,'depBandGroup')}
function toggleRevBand(btn){toggleBandFilter(btn,'revBandGroup')}
function toggleBandFilter(btn,groupId){
  const group=document.getElementById(groupId);if(!group)return;
  if(btn.dataset.band==='all'){group.querySelectorAll('.scen-pill').forEach(p=>p.classList.remove('active'));btn.classList.add('active');}
  else{group.querySelector('[data-band="all"]').classList.remove('active');btn.classList.toggle('active');}
}

// ── LANDING PAGE ──
let pnlFilterProduct='',pnlFilterCategory='';

function hideAllModules(){
  // Hide every module container
  ['landingPage','appShell','vendorModule','depreciationModule','revenueModule','ltfModule'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  // Hide exec header bar
  const chb=document.getElementById('compHeaderBar');if(chb)chb.style.display='none';
  // Deactivate all tab-content inside appShell to prevent bleed
  document.querySelectorAll('#appShell .tab-content').forEach(t=>t.classList.remove('active'));
}
function showLanding(){
  hideAllModules();
  document.getElementById('landingPage').style.display='';
  // Show chevron nav, hide summary content
  const chevNav=document.getElementById('chevronNav');
  const sumContent=document.getElementById('landingSummaryContent');
  if(chevNav)chevNav.style.display='';
  if(sumContent)sumContent.style.display='none';
  renderPnlWalk();renderLandingCharts();renderLandingRevenue();
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
  if(window._updateBottomToolbar)window._updateBottomToolbar();
}
function showApp(){
  hideAllModules();
  document.getElementById('appShell').style.display='';
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
  if(window._updateBottomToolbar)window._updateBottomToolbar();
}
let vendorModuleInited=false;
function showVendor(){
  hideAllModules();
  document.getElementById('vendorModule').style.display='';
  if(!vendorModuleInited){try{initVendorModule();vendorModuleInited=true}catch(e){console.error('Vendor init error:',e)}}
  else{window.renderVendorGridPublic()}
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
  if(window._updateBottomToolbar)window._updateBottomToolbar();
}
function showDepreciation(){
  hideAllModules();
  document.getElementById('depreciationModule').style.display='';
  initDepModule();
  initAssetTab();
  setTimeout(initDepScratch,50);
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
  if(window._updateBottomToolbar)window._updateBottomToolbar();
}
function showRevenue(){
  hideAllModules();
  document.getElementById('revenueModule').style.display='';
  initRevenueModule();
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
}

let ltfModuleInited=false;
function showLtf(){
  hideAllModules();
  document.getElementById('ltfModule').style.display='';
  if(!ltfModuleInited){initLtfModule();ltfModuleInited=true}
  if(window.renderForecastFactorPills)window.renderForecastFactorPills();
  renderLtfChart();
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
}

document.getElementById('modCompPlan').addEventListener('click',showApp);
document.getElementById('modVendor').addEventListener('click',showVendor);
document.getElementById('modDepreciation').addEventListener('click',showDepreciation);
document.getElementById('modLtf').addEventListener('click',showLtf);
document.getElementById('modRevenue').addEventListener('click',showRevenue);
// Back buttons removed — global toolbar handles navigation

// Revenue pane toggle
document.getElementById('toggleRevenuePane').addEventListener('click',function(){
  const content=document.getElementById('landingRevenueContent');
  const isHidden=content.style.display==='none';
  content.style.display=isHidden?'':'none';
  this.textContent=isHidden?'Hide':'Show';
  state.showRevenuePane=isHidden;saveState();
});

// Revenue module toggle (overview only)
const landingToggleRevenue=document.getElementById('landingToggleRevenue');
function setRevenueMode(on){
  localStorage.setItem('compPlanRevenue',on?'1':'0');
  landingToggleRevenue.checked=on;
  document.getElementById('modRevenue').style.display=on?'':'none';
  document.getElementById('landingRevenuePane').style.display=on?'':'none';
}
landingToggleRevenue.addEventListener('change',function(){
  setRevenueMode(this.checked);
  // Hide/show the Revenue/P&L toggle in PnL table when revenue is toggled
  const pnlModeToggle=document.getElementById('landingPnlModeToggle');
  if(pnlModeToggle){
    const revBtn=pnlModeToggle.querySelector('[data-pnlmode="revenue"]');
    if(revBtn)revBtn.style.display=this.checked?'':'none';
    // Force cost mode when revenue is turned off
    if(!this.checked&&(state.landingPnlMode||'cost')==='revenue'){
      state.landingPnlMode='cost';saveState();
      pnlModeToggle.querySelectorAll('.btn').forEach(b=>b.classList.remove('active'));
      pnlModeToggle.querySelector('[data-pnlmode="cost"]').classList.add('active');
    }
  }
  renderPnlWalk();renderLandingCharts();
});
if(localStorage.getItem('compPlanRevenue')==='1'){setRevenueMode(true)}
else{
  // Hide Revenue/P&L toggle button on initial load if revenue is off
  const revBtn=document.querySelector('#landingPnlModeToggle [data-pnlmode="revenue"]');
  if(revBtn)revBtn.style.display='none';
}

// P&L mode toggle (cost vs revenue/profitability)
document.getElementById('landingPnlModeToggle').querySelectorAll('[data-pnlmode]').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.querySelectorAll('#landingPnlModeToggle .btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
    state.landingPnlMode=this.dataset.pnlmode;
    saveState();renderPnlWalk();renderLandingCharts();
  });
});


// P&L filter dropdowns
let pnlFilterFunction='',pnlFilterCountry='',pnlFilterMarket='';
document.getElementById('pnlFilterProduct').addEventListener('change',function(){pnlFilterProduct=this.value;renderPnlWalk();renderLandingCharts()});
document.getElementById('pnlFilterCategory').addEventListener('change',function(){pnlFilterCategory=this.value;renderPnlWalk();renderLandingCharts()});
document.getElementById('pnlFilterFunction').addEventListener('change',function(){pnlFilterFunction=this.value;renderPnlWalk();renderLandingCharts()});
document.getElementById('pnlFilterCountry').addEventListener('change',function(){pnlFilterCountry=this.value;renderPnlWalk();renderLandingCharts()});
document.getElementById('pnlFilterMarket').addEventListener('change',function(){pnlFilterMarket=this.value;renderPnlWalk();renderLandingCharts()});

function getPnlSplitKey(emp,split){
  if(split==='total')return 'Total';
  if(split==='function')return emp.function;
  if(split==='country')return emp.country;
  if(split==='month'||split==='quarter')return null; // handled separately
  if(split==='market'){const m=getEmpMarkets(emp);return m.length?m[0].code:'No Market'}
  if(split==='product'){const p=getEmpProject(emp);return p?p.product||'Unassigned':'Unassigned'}
  if(split==='category'){const p=getEmpProject(emp);return p?p.category||'Uncategorized':'Uncategorized'}
  return 'Total';
}

function populatePnlFilters(){
  const prodSel=document.getElementById('pnlFilterProduct');
  const catSel=document.getElementById('pnlFilterCategory');
  const funcSel=document.getElementById('pnlFilterFunction');
  const countrySel=document.getElementById('pnlFilterCountry');
  const mktSel=document.getElementById('pnlFilterMarket');
  if(!prodSel||!catSel||!state||!state.projects)return;
  const products=[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort();
  const categories=[...new Set(state.projects.map(p=>p.category).filter(Boolean))].sort();
  prodSel.innerHTML='<option value="">All Products</option>'+products.map(p=>`<option value="${p}"${p===pnlFilterProduct?' selected':''}>${p}</option>`).join('');
  catSel.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option value="${c}"${c===pnlFilterCategory?' selected':''}>${c}</option>`).join('');
  if(funcSel&&state.employees){
    const funcs=[...new Set(state.employees.map(e=>e.function).filter(Boolean))].sort();
    funcSel.innerHTML='<option value="">All Functions</option>'+funcs.map(f=>`<option value="${f}"${f===pnlFilterFunction?' selected':''}>${f}</option>`).join('');
  }
  if(countrySel&&state.employees){
    const countries=[...new Set(state.employees.map(e=>e.country).filter(Boolean))].sort();
    countrySel.innerHTML='<option value="">All Countries</option>'+countries.map(c=>`<option value="${c}"${c===pnlFilterCountry?' selected':''}>${c}</option>`).join('');
  }
  if(mktSel&&state.markets){
    mktSel.innerHTML='<option value="">All Markets</option>'+state.markets.map(m=>`<option value="${m.code}"${m.code===pnlFilterMarket?' selected':''}>${m.code} — ${m.name}</option>`).join('');
  }
}
function getPnlFilteredEmps(){
  let emps=state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR);
  if(pnlFilterProduct){emps=emps.filter(e=>{const p=getEmpProject(e);return p&&p.product===pnlFilterProduct})}
  if(pnlFilterCategory){emps=emps.filter(e=>{const p=getEmpProject(e);return p&&p.category===pnlFilterCategory})}
  if(pnlFilterFunction){emps=emps.filter(e=>e.function===pnlFilterFunction)}
  if(pnlFilterCountry){emps=emps.filter(e=>e.country===pnlFilterCountry)}
  if(pnlFilterMarket){emps=emps.filter(e=>{const ms=getEmpMarkets(e);return ms.some(m=>m.code===pnlFilterMarket)})}
  return emps;
}
let pnlExpandedCats=new Set();

/** Compute OAO total filtered by active PnL filters (market, product, category). */
function getFilteredOaoTotal(){
  const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const hasFilter=pnlFilterMarket||pnlFilterProduct||pnlFilterCategory;
  if(!hasFilter)return getVendorOaoTotal();

  function matchRow(r){
    if(pnlFilterMarket&&r.market!==pnlFilterMarket)return false;
    if(pnlFilterProduct||pnlFilterCategory){
      const proj=state.projects.find(p=>p.id===r.project);
      if(pnlFilterProduct&&(!proj||proj.product!==pnlFilterProduct))return false;
      if(pnlFilterCategory&&(!proj||proj.category!==pnlFilterCategory))return false;
    }
    return true;
  }
  const sum=rows=>rows.filter(matchRow).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  const vTotal=sum(state.vendorRows||[]);
  const tTotal=sum(state.teRows||[]);
  const cOpex=(state.contractorRows||[]).filter(matchRow).reduce((s,r)=>{
    const capPct=parseFloat(r.capPct)||0;
    return s+moKeys.reduce((ms,m)=>{const raw=parseFloat(r[m])||0;return ms+(raw-Math.round(raw*capPct/100))},0);
  },0);
  return vTotal+tTotal+cOpex;
}

let pnlSortCol=null, pnlSortAsc=true;
function renderPnlWalk(){
  populatePnlFilters();
  const emps=getPnlFilteredEmps();
  const tbl=document.getElementById('pnlWalkTable');
  const row1Sel=document.getElementById('fysRow1');
  const row2Sel=document.getElementById('fysRow2');
  const colToggle=document.querySelector('#fysColToggle .btn.active');
  const row1Dim=row1Sel?row1Sel.value:'category';
  const row2Dim=row2Sel?row2Sel.value:'';
  const colMode=colToggle?colToggle.dataset.fyscol:'collapsed';
  const chartViewBtn=document.querySelector('#landingChartViewToggle .btn.active');
  const isTotInvView=chartViewBtn&&chartViewBtn.dataset.lcview==='total';

  // Dimension getter
  function getDim(e,dim){
    const p=getEmpProject(e);
    if(dim==='category')return p?p.category||'Uncategorized':'Uncategorized';
    if(dim==='product')return p?p.product||'Unassigned':'Unassigned';
    if(dim==='function')return e.function||'Unknown';
    if(dim==='country')return e.country||'Unknown';
    if(dim==='bizline')return e.bizLine||e.businessLine||'Unassigned';
    if(dim==='market'){const m=getEmpMarkets(e);return m&&m[0]?m[0].code:'Unknown'}
    return 'Unknown';
  }

  // Group employees by Row1 → Row2
  const groups={};
  emps.forEach(e=>{
    const k1=getDim(e,row1Dim);
    if(!groups[k1])groups[k1]={emps:[],children:{}};
    groups[k1].emps.push(e);
    if(row2Dim){
      const k2=getDim(e,row2Dim);
      if(!groups[k1].children[k2])groups[k1].children[k2]=[];
      groups[k1].children[k2].push(e);
    }
  });
  let groupKeys=Object.keys(groups).sort();

  // Compute P&L — split existing vs hires
  function isHire(e){
    if(!e.hireDate)return false;
    const hd=new Date(e.hireDate);
    return hd.getFullYear()>=CURRENT_YEAR;
  }
  function computePnl(empList){
    let cb=0,cbCapex=0,hires=0,hiresCapex=0,hc=0,hiresHc=0;
    empList.forEach(e=>{
      let comp=0,capx=0;
      for(let mi=0;mi<12;mi++){comp+=getMonthlyComp(e,mi);capx+=getMonthlyCapEx(e,mi)}
      if(isHire(e)){hires+=comp;hiresCapex+=capx;hiresHc++}
      else{cb+=comp;cbCapex+=capx}
      hc++;
    });
    return {hc,cb,cbCapex,hires,hiresCapex,hiresHc};
  }

  // OAO breakdown: vendor spend, T&E, other
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  let oaoVendor=0,oaoTE=0,oaoOther=0;
  (state.vendorRows||[]).forEach(r=>{let fy=0;for(let m=0;m<12;m++)fy+=(r[months[m]]||0);oaoVendor+=fy});
  (state.teRows||[]).forEach(r=>{let fy=0;for(let m=0;m<12;m++)fy+=(r[months[m]]||0);oaoTE+=fy});
  // "Other" = contractor spend + any misc
  (state.contractorRows||[]).forEach(r=>{let fy=0;for(let m=0;m<12;m++)fy+=(r[months[m]]||0);oaoOther+=fy});
  const oaoTotal=oaoVendor+oaoTE+oaoOther;
  const ctrCapexTotal=window.getContractorCapExTotal?window.getContractorCapExTotal():0;
  const daTotal=getDepreciationTotal();
  const revenueEnabled=localStorage.getItem('compPlanRevenue')!=='0';
  const isRevMode=revenueEnabled&&(state.landingPnlMode||'cost')==='revenue';
  const revenueTotal=isRevMode?getRevenueTotal():0;

  function enrich(d,totalHc){
    const share=totalHc>0?d.hc/totalHc:0;
    d.oao=Math.round(oaoVendor*share);
    d.te=Math.round(oaoTE*share);
    d.other=Math.round(oaoOther*share);
    d.cbOpex=d.cb-d.cbCapex;
    d.hiresOpex=d.hires-d.hiresCapex;
    d.ebitda=d.cbOpex+d.hiresOpex+d.oao+d.te+d.other;
    d.da=Math.round(daTotal*share);
    d.opex=d.ebitda+d.da;
    d.ctrCapex=Math.round(ctrCapexTotal*share);
    d.capex=d.cbCapex+d.hiresCapex+d.ctrCapex;
    d.totinv=d.opex+d.capex;
    return d;
  }

  // Build group data
  const totalHc=emps.length;
  const gData={};const gChildData={};
  const totals={hc:0,cb:0,cbCapex:0,hires:0,hiresCapex:0,hiresHc:0,oao:0,te:0,other:0,ebitda:0,da:0,opex:0,capex:0,totinv:0,cbOpex:0,hiresOpex:0};
  groupKeys.forEach(k=>{
    gData[k]=enrich(computePnl(groups[k].emps),totalHc);
    Object.keys(gData[k]).forEach(f=>{if(typeof totals[f]==='number')totals[f]+=gData[k][f]});
    gChildData[k]={};
    if(row2Dim){
      Object.keys(groups[k].children).sort().forEach(k2=>{
        gChildData[k][k2]=enrich(computePnl(groups[k].children[k2]),totalHc);
      });
    }
  });
  // Fix totals for distributed amounts
  totals.oao=oaoVendor;totals.te=oaoTE;totals.other=oaoOther;
  totals.cbOpex=totals.cb-totals.cbCapex;totals.hiresOpex=totals.hires-totals.hiresCapex;
  totals.ebitda=totals.cbOpex+totals.hiresOpex+oaoVendor+oaoTE+oaoOther;
  totals.da=daTotal;totals.opex=totals.ebitda+totals.da;
  totals.ctrCapex=ctrCapexTotal;totals.capex=totals.cbCapex+totals.hiresCapex+ctrCapexTotal;
  totals.totinv=totals.opex+totals.capex;

  // Column definitions
  let cols;
  if(colMode==='expanded'&&isTotInvView){
    // Detail + Total Inv: skip D&A and OPEX
    cols=[
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'cb',label:'C&B'},
      {key:'hires',label:'HIRES'},
      {key:'oao',label:'OAO'},
      {key:'te',label:'T&E'},
      {key:'other',label:'OTHER'},
      {key:'ebitda',label:'EBITDA',cls:'subtotal'},
      {key:'cbCapex',label:'C&B CAP'},
      {key:'hiresCapex',label:'HIRES CAP'},
      {key:'ctrCapex',label:'CTR CAP'},
      {key:'capex',label:'CAPEX',cls:'sub2'},
      {key:'totinv',label:'TOT INV',cls:'total'},
    ];
  } else if(colMode==='expanded'){
    // Detail + P&L/Cost: full columns
    cols=[
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'cb',label:'C&B'},
      {key:'hires',label:'HIRES'},
      {key:'oao',label:'OAO'},
      {key:'te',label:'T&E'},
      {key:'other',label:'OTHER'},
      {key:'ebitda',label:'EBITDA',cls:'subtotal'},
      {key:'da',label:'D&A'},
      {key:'opex',label:'OPEX',cls:'subtotal'},
      {key:'cbCapex',label:'C&B CAP'},
      {key:'hiresCapex',label:'HIRES CAP'},
      {key:'ctrCapex',label:'CTR CAP'},
      {key:'capex',label:'CAPEX',cls:'sub2'},
      {key:'totinv',label:'TOT INV',cls:'total'},
    ];
  } else if(isTotInvView){
    // Summary + Total Inv
    cols=[
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'ebitda',label:'EBITDA',cls:'subtotal'},
      {key:'totinv',label:'TOT INV',cls:'total'},
    ];
  } else {
    // Summary + P&L/Cost
    cols=[
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'ebitda',label:'EBITDA',cls:'subtotal'},
      {key:'opex',label:'OPEX',cls:'subtotal'},
      {key:'totinv',label:'TOT INV',cls:'total'},
    ];
  }

  // Format — drop $M suffix since header says "(in $M)"
  function fv(v,isHC){
    if(isHC)return v||'—';
    if(!v)return '—';
    // Always show in $M since header says "(in $M)"
    const abs=Math.abs(v);const sign=v<0?'-':'';
    return sign+'$'+(abs/1e6).toFixed(2);
  }
  function fmtCell(c,v){
    let style='padding:5px 6px;font-size:.78rem';
    if(c.cls==='subtotal')style+=';font-weight:700;color:var(--accent);border-left:1px solid var(--border-light)';
    else if(c.cls==='total')style+=';font-weight:700;border-left:1px solid var(--border-light)';
    else if(c.cls==='sub2')style+=';font-weight:700;color:var(--accent);border-right:1px solid var(--border-light)';
    if(c.narrow)style+=';width:36px';
    return `<td class="num" style="${style}">${c.isHC?fv(v,true):fv(v)}</td>`;
  }

  // Row1 label
  const row1Label=row1Sel?row1Sel.options[row1Sel.selectedIndex].text:'CATEGORY';

  // Apply sort if active
  if(pnlSortCol){
    const dir=pnlSortAsc?1:-1;
    if(pnlSortCol==='_name'){
      groupKeys.sort((a,b)=>a.localeCompare(b)*dir);
    } else {
      groupKeys.sort((a,b)=>((gData[a][pnlSortCol]||0)-(gData[b][pnlSortCol]||0))*dir);
    }
  }

  let h=`<thead><tr><th data-sort-col="_name" style="position:sticky;left:0;z-index:2;background:var(--panel-inset);white-space:nowrap;min-width:140px;cursor:pointer;user-select:none">${esc(row1Label.toUpperCase())}${pnlSortCol==='_name'?(pnlSortAsc?' ▲':' ▼'):''}</th>`;
  cols.forEach(c=>{
    let w=c.narrow?'width:36px;':'min-width:55px;';
    let extra='';
    if(c.cls==='subtotal'){w='min-width:65px;';extra='font-weight:700;color:var(--accent);border-left:1px solid var(--border-light);'}
    else if(c.cls==='total'){w='min-width:65px;';extra='font-weight:700;border-left:1px solid var(--border-light);'}
    else if(c.cls==='sub2'){w='min-width:65px;';extra='font-weight:700;color:var(--accent);border-right:1px solid var(--border-light);'}
    const arrow=pnlSortCol===c.key?(pnlSortAsc?' ▲':' ▼'):'';
    h+=`<th data-sort-col="${c.key}" style="text-align:right;${w}${extra}white-space:nowrap;padding:5px 6px;font-size:.68rem;cursor:pointer;user-select:none">${c.label}${arrow}</th>`;
  });
  h+='</tr></thead><tbody>';

  groupKeys.forEach(k=>{
    const d=gData[k];
    const childKeys=row2Dim?Object.keys(groups[k].children).sort():[];
    const hasChildren=childKeys.length>1||(childKeys.length===1&&childKeys[0]!==k);
    const expanded=pnlExpandedCats.has(k);
    const arrow=hasChildren?(expanded?'▼':'▶'):'';
    h+=`<tr class="pnl-cat-row" data-cat="${esc(k)}"><td style="font-weight:600;white-space:nowrap;position:sticky;left:0;background:var(--panel);z-index:1;cursor:${hasChildren?'pointer':'default'}"><span style="font-size:.6rem;margin-right:4px;display:inline-block;width:10px;color:var(--text-dim)">${arrow}</span>${esc(k)}</td>`;
    cols.forEach(c=>h+=fmtCell(c,d[c.key]));
    h+='</tr>';
    if(hasChildren&&expanded){
      childKeys.forEach(k2=>{
        const cd=gChildData[k][k2];
        h+=`<tr style="background:var(--panel-inset)"><td style="padding-left:24px;white-space:nowrap;position:sticky;left:0;background:var(--panel-inset);z-index:1;font-size:.76rem;color:var(--text-dim)">${esc(k2)}</td>`;
        cols.forEach(c=>{
          let cs='font-size:.76rem;color:var(--text-dim)';
          if(c.cls==='subtotal')cs+=';font-weight:600;color:var(--accent);border-left:1px solid var(--border-light)';
          else if(c.cls==='total')cs+=';font-weight:600;border-left:1px solid var(--border-light)';
          else if(c.cls==='sub2')cs+=';font-weight:600;color:var(--accent);border-right:1px solid var(--border-light)';
          h+=`<td class="num" style="${cs}">${c.isHC?fv(cd[c.key],true):fv(cd[c.key])}</td>`;
        });
        h+='</tr>';
      });
    }
  });

  h+=`<tr class="total"><td style="position:sticky;left:0;background:var(--panel);z-index:1"><span style="display:inline-block;width:10px;margin-right:4px"></span>Total</td>`;
  cols.forEach(c=>h+=`<td class="num">${c.isHC?fv(totals[c.key],true):fv(totals[c.key])}</td>`);
  h+='</tr></tbody>';
  tbl.innerHTML=h;tbl.classList.remove('compact');

  // Bind row expand/collapse clicks
  tbl.querySelectorAll('.pnl-cat-row').forEach(tr=>{
    tr.addEventListener('click',()=>{
      const cat=tr.dataset.cat;
      if(pnlExpandedCats.has(cat))pnlExpandedCats.delete(cat);else pnlExpandedCats.add(cat);
      renderPnlWalk();
    });
  });
  // Bind sort clicks on headers
  tbl.querySelectorAll('th[data-sort-col]').forEach(th=>{
    th.addEventListener('click',(e)=>{
      e.stopPropagation();
      const col=th.dataset.sortCol;
      if(pnlSortCol===col){pnlSortAsc=!pnlSortAsc}else{pnlSortCol=col;pnlSortAsc=col==='_name'}
      renderPnlWalk();
    });
  });
}

// Full Year Summary row/column change handlers
const _fysRow1=document.getElementById('fysRow1');
const _fysRow2=document.getElementById('fysRow2');
if(_fysRow1)_fysRow1.addEventListener('change',()=>{pnlExpandedCats.clear();renderPnlWalk()});
if(_fysRow2)_fysRow2.addEventListener('change',()=>{pnlExpandedCats.clear();renderPnlWalk()});
document.querySelectorAll('#fysColToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#fysColToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');renderPnlWalk();
}));

let landingBudgetChartInst=null,landingForecastChartInst=null,landingRevenueChartInst=null,landingRevFcChartInst=null,landingChartView='pnl';

document.querySelectorAll('#landingChartViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#landingChartViewToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');landingChartView=b.dataset.lcview;renderLandingCharts();renderPnlWalk();
}));

function renderLandingCharts(){
  if(typeof Chart==='undefined'||!state||!state.employees)return;
  const emps=getPnlFilteredEmps();
  if(!emps.length){
    // Destroy existing charts so stale template data doesn't linger
    if(landingBudgetChartInst){landingBudgetChartInst.destroy();landingBudgetChartInst=null}
    if(landingForecastChartInst){landingForecastChartInst.destroy();landingForecastChartInst=null}
    return;
  }
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const useSplit=false;
  const isPnl=landingChartView==='pnl';
  const fmtTick=v=>{const a=Math.abs(v);return(v<0?'-':'')+'$'+(a/1e6).toFixed(2)+'M'};

  // ── Monthly Budget Chart ──
  if(landingBudgetChartInst)landingBudgetChartInst.destroy();
  let budgetDS=[];
  if(useSplit){
    const groups={};
    emps.forEach(e=>{const key=getPnlSplitKey(e,split);if(!groups[key])groups[key]=[];groups[key].push(e)});
    Object.keys(groups).sort().forEach((g,gi)=>{
      if(isPnl){
        const opex=MO_SHORT.map((_,mi)=>{const c=groups[g].reduce((s,e)=>s+getMonthlyComp(e,mi),0);const cx=groups[g].reduce((s,e)=>s+getMonthlyCapEx(e,mi),0);return c-cx});
        const capex=MO_SHORT.map((_,mi)=>-groups[g].reduce((s,e)=>s+getMonthlyCapEx(e,mi),0));
        budgetDS.push({label:g.length>18?g.slice(0,16)+'…':g,data:opex,backgroundColor:getChartColors()[gi%getChartColors().length],stack:'pos'});
        if(capex.some(v=>v<0))budgetDS.push({label:g+' (CapEx)',data:capex,backgroundColor:hexToRgba(getChartColors()[gi%getChartColors().length],0.35),stack:'neg'});
      } else {
        const data=MO_SHORT.map((_,mi)=>groups[g].reduce((s,e)=>s+getMonthlyComp(e,mi),0));
        budgetDS.push({label:g.length>18?g.slice(0,16)+'…':g,data,backgroundColor:getChartColors()[gi%getChartColors().length]});
      }
    });
  } else {
    const lcc=getChartColors();
    if(isPnl){
      const cbOpex=MO_SHORT.map((_,mi)=>{const c=emps.reduce((s,e)=>s+getMonthlyComp(e,mi),0);const cx=emps.reduce((s,e)=>s+getMonthlyCapEx(e,mi),0);return c-cx});
      const oaoMo=MO_SHORT.map((_,mi)=>getVendorOaoByMonth(mi));
      const daMo=MO_SHORT.map((_,mi)=>getDepreciationByMonth(mi));
      const capex=MO_SHORT.map((_,mi)=>-(emps.reduce((s,e)=>s+getMonthlyCapEx(e,mi),0)+getContractorCapExByMonth(mi)));
      budgetDS.push({label:'C&B',data:cbOpex,backgroundColor:lcc[0],stack:'pos'});
      budgetDS.push({label:'OAO',data:oaoMo,backgroundColor:lcc[1],stack:'pos'});
      budgetDS.push({label:'D&A',data:daMo,backgroundColor:lcc[2],stack:'pos'});
      budgetDS.push({label:'CapEx',data:capex,backgroundColor:hexToRgba(lcc[0],0.35),stack:'neg'});
    } else {
      const cbGross=MO_SHORT.map((_,mi)=>emps.reduce((s,e)=>s+getMonthlyComp(e,mi),0));
      const oaoMo=MO_SHORT.map((_,mi)=>getVendorOaoByMonth(mi));
      budgetDS.push({label:'C&B',data:cbGross,backgroundColor:lcc[0],stack:'pos'});
      budgetDS.push({label:'OAO',data:oaoMo,backgroundColor:lcc[1],stack:'pos'});
    }
  }
  // Data labels — always show total on top of each bar
  window.stackedBarDatalabels(budgetDS,tickColor,8,'landing');
  budgetDS.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}});
  landingBudgetChartInst=new Chart(document.getElementById('landingBudgetChart'),{
    type:'bar',data:{labels:MO_SHORT,datasets:budgetDS},
    plugins:[barTotalPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:11},padding:14,filter:item=>!item.text.includes('CapEx')}},datalabels:{display:false},barTotal:{color:tickColor,fontSize:10}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:11,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:10,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}}
  });

  // ── Long-Term Forecast Chart ──
  // Compute accounts matching the LTF module breakdown
  const _oaoTotal=getVendorOaoTotal();
  const _cCapEx=getContractorCapExTotal();
  const _oaoGrowth=state.oaoGrowthPct||[5,5,5,5,5];
  const _oaoYears=[_oaoTotal];
  for(let oi=0;oi<5;oi++)_oaoYears.push(Math.round(_oaoYears[oi]*(1+(_oaoGrowth[oi]||0)/100)));
  const _assetLife=state.daAssetLifeYrs||5;
  const _daBase=getDepreciationTotal();

  if(landingForecastChartInst)landingForecastChartInst.destroy();
  let fcDS=[];
  const yearLabels=getDisplayFcLabels();
  try{
  const _cbRows=projectForecast(emps);
  const _cbOpex=_cbRows.map(r=>r.opex);
  const _cbCapex=_cbRows.map(r=>r.capex);
  const _cbGross=_cbRows.map(r=>r.total);

  // D&A schedule
  const _totalCapexByYear=_cbCapex.map(cb=>cb+_cCapEx);
  const _daYears=[_daBase];
  for(let yr=1;yr<=5;yr++){
    let yearDa=0;
    for(let v=0;v<yr;v++){
      const yis=yr-v;
      if(yis<=_assetLife)yearDa+=Math.round(_totalCapexByYear[v]/_assetLife);
    }
    yearDa+=Math.max(0,Math.round(_daBase*(1-yr/_assetLife)));
    _daYears.push(yearDa);
  }

  const lfc=getChartColors();
  if(isPnl){
    fcDS=[
      {label:'C&B',data:_cbOpex.slice(),backgroundColor:lfc[0],stack:'pos'},
      {label:'OAO',data:_oaoYears.slice(),backgroundColor:lfc[1],stack:'pos'},
      {label:'D&A',data:_daYears.slice(),backgroundColor:lfc[2],stack:'pos'},
      {label:'CapEx',data:_cbCapex.map(v=>-(v+_cCapEx)),backgroundColor:hexToRgba(lfc[0],0.35),stack:'neg'}
    ];
  } else {
    fcDS=[
      {label:'C&B',data:_cbGross.slice(),backgroundColor:lfc[0],stack:'pos'},
      {label:'OAO',data:_oaoYears.slice(),backgroundColor:lfc[1],stack:'pos'}
    ];
  }
  }catch(e){console.warn('Landing forecast chart error:',e)}
  window.stackedBarDatalabels(fcDS,tickColor,8,'landing');
  fcDS.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}});
  landingForecastChartInst=new Chart(document.getElementById('landingForecastChart'),{
    type:'bar',data:{labels:yearLabels,datasets:fcDS},
    plugins:[window.yoyArrowsPlugin,barTotalPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:11},padding:14,filter:item=>!item.text.includes('CapEx')}},datalabels:{display:false},barTotal:{color:tickColor,fontSize:11},yoyArrows:{}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:11,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:10,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}}
  });
}


// ── LANDING REVENUE PANE ──
function renderLandingRevenue(){
  // Update KPIs on landing
  const mrr=getRevenueMrr();
  const totalRev=getRevenueTotal();
  const clients=state.revenueClients||[];
  const el=id=>document.getElementById(id);
  if(el('landingRevMrr'))el('landingRevMrr').textContent=fmt(mrr);
  if(el('landingRevArr'))el('landingRevArr').textContent=fmt(mrr*12);
  if(el('landingRevTotal'))el('landingRevTotal').textContent=fmt(totalRev);
  // NRR
  let nrrNum=0,nrrDen=0;
  clients.forEach(c=>{const r=getClientRevenue(c.id);nrrNum+=(parseFloat(c.nrrPct)||100)*r;nrrDen+=r});
  if(el('landingRevNrr'))el('landingRevNrr').textContent=nrrDen>0?(nrrNum/nrrDen).toFixed(1)+'%':'—';
  // Renewal
  let renNum=0,renDen=0;
  clients.forEach(c=>{const r=getClientRevenue(c.id);renNum+=(parseFloat(c.renewalRate)||90)*r;renDen+=r});
  if(el('landingRevRenewal'))el('landingRevRenewal').textContent=renDen>0?(renNum/renDen).toFixed(1)+'%':'—';
  // Credit memo
  let cm=0;
  clients.forEach(c=>{cm+=getClientRevenue(c.id)*(parseFloat(c.creditMemoRiskPct)||2)/100});
  if(el('landingRevCreditMemo'))el('landingRevCreditMemo').textContent=fmt(cm);
  // Toggle visibility
  const content=el('landingRevenueContent');
  const btn=el('toggleRevenuePane');
  if(content&&state.showRevenuePane===false){content.style.display='none';if(btn)btn.textContent='Show'}
  // Revenue chart
  renderLandingRevenueChart();
  renderLandingRevForecastChart();
}

function renderLandingRevenueChart(){
  if(typeof Chart==='undefined')return;
  const canvas=document.getElementById('landingRevenueChart');
  if(!canvas)return;
  if(landingRevenueChartInst)landingRevenueChartInst.destroy();
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data=MO.map((_,mi)=>getRevenueByMonth(mi));
  const lcc=getChartColors();
  landingRevenueChartInst=new Chart(canvas,{
    type:'bar',data:{labels:MO,datasets:[{label:'Revenue',data:data,backgroundColor:lcc[2]||'#27ae60'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)}}}}
  });
}

function renderLandingRevForecastChart(){
  if(typeof Chart==='undefined')return;
  const canvas=document.getElementById('landingRevForecastChart');
  if(!canvas)return;
  if(landingRevFcChartInst)landingRevFcChartInst.destroy();
  const baseRev=getRevenueTotal();
  const blended=(state.revenueForecast||[]).find(f=>f.clientId==='_all')||{growthPct:10,churnPct:5,priceIncPct:3,newClientsPerYr:0,avgNewRev:0};
  const years=[];let prev=baseRev;
  for(let y=0;y<5;y++){
    const yr=new Date().getFullYear()+y;
    if(y===0){years.push({yr,total:baseRev});continue}
    const g=Math.round(prev*(blended.growthPct||0)/100);
    const c=-Math.round(prev*(blended.churnPct||0)/100);
    const p=Math.round(prev*(blended.priceIncPct||0)/100);
    const n=(blended.newClientsPerYr||0)*(blended.avgNewRev||0);
    const t=prev+g+c+p+n;
    years.push({yr,total:t});prev=t;
  }
  const lcc=getChartColors();
  landingRevFcChartInst=new Chart(canvas,{
    type:'bar',data:{labels:years.map(y=>y.yr),datasets:[{label:'Revenue Forecast',data:years.map(y=>y.total),backgroundColor:lcc[2]||'#27ae60'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)}}}}
  });
}

// ── LONG-TERM FORECAST MODULE ──
let ltfChartInst=null;
let ltfFteChartInst=null;
let ltfView='pnl';
let ltfSplit='total';

// Bar total label plugin — draws total above each stacked bar
const barTotalPlugin={
  id:'barTotal',
  afterDraw(chart){
    const opts=chart.options.plugins.barTotal;
    if(!opts)return;
    const ctx=chart.ctx;
    const datasets=chart.data.datasets;
    const nLabels=chart.data.labels.length;
    const yScale=chart.scales.y;
    const color=opts.color||'#333';
    const fontSize=opts.fontSize||11;
    ctx.save();
    ctx.font=`bold ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillStyle=color;
    for(let i=0;i<nLabels;i++){
      let sum=0;
      datasets.forEach((ds,di)=>{
        if(chart.getDatasetMeta(di).hidden)return;
        const v=ds.data[i];
        if(typeof v==='number'&&v>0&&ds.stack!=='neg')sum+=v;
      });
      if(!sum)continue;
      // Get x position from first visible dataset
      let x=null;
      for(let di=0;di<datasets.length;di++){
        const meta=chart.getDatasetMeta(di);
        if(!meta.hidden&&meta.data[i]){x=meta.data[i].x;break}
      }
      if(x==null)continue;
      const y=yScale.getPixelForValue(sum);
      const label='$'+(sum/1e6).toFixed(2)+'M';
      ctx.fillText(label,x,y-4);
    }
    ctx.restore();
  }
};

// Y/Y growth bubbles plugin — shows total or per-account growth pills between bars
const ltfYoyPlugin={
  id:'ltfYoy',
  afterDraw(chart){
    if(!chart.options.plugins.ltfYoy)return;
    const opts=chart.options.plugins.ltfYoy;
    const acctData=opts.accountData; // [{label, data:[], color}]
    if(!acctData||!acctData.length)return;
    const ctx=chart.ctx;const area=chart.chartArea;
    const nLabels=chart.data.labels.length;if(nLabels<2)return;
    const isDark=document.documentElement.classList.contains('dark');
    const showByAccount=!!opts.byAccount;
    // Find first visible dataset for bar x-positions
    let visIdx=0;
    for(let di=0;di<chart.data.datasets.length;di++){if(!chart.getDatasetMeta(di).hidden){visIdx=di;break}}
    const meta0=chart.getDatasetMeta(visIdx);
    const yScale=chart.scales.y;
    const chartW=area.right-area.left;
    const fontSize=Math.max(9,Math.min(12,chartW/(nLabels*7)));
    ctx.save();
    for(let i=0;i<nLabels-1;i++){
      if(!meta0.data[i]||!meta0.data[i+1])continue;
      const barL=meta0.data[i],barR=meta0.data[i+1];
      const halfW=barL.width?barL.width/2:12;
      const x1=barL.x+halfW+2,x2=barR.x-halfW-2;
      const midX=(x1+x2)/2;
      // Compute total for arrow line positioning
      let sumPrev=0,sumCur=0;
      acctData.forEach(a=>{sumPrev+=a.data[i]||0;sumCur+=a.data[i+1]||0});
      const y1=yScale.getPixelForValue(sumPrev),y2=yScale.getPixelForValue(sumCur);
      // Draw dashed arrow line
      const arrowColor=isDark?'rgba(255,255,255,.35)':'rgba(0,0,0,.25)';
      ctx.beginPath();ctx.strokeStyle=arrowColor;ctx.lineWidth=1;ctx.setLineDash([3,2]);
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
      const angle=Math.atan2(y2-y1,x2-x1);
      ctx.beginPath();ctx.moveTo(x2,y2);
      ctx.lineTo(x2-5*Math.cos(angle-0.4),y2-5*Math.sin(angle-0.4));
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-5*Math.cos(angle+0.4),y2-5*Math.sin(angle+0.4));
      ctx.strokeStyle=arrowColor;ctx.lineWidth=1.2;ctx.stroke();
      // Build pills array: either per-account or single total
      const midY=(y1+y2)/2;
      const pillH=fontSize+4;
      ctx.font=`600 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      let pills=[];
      if(showByAccount){
        acctData.forEach(acct=>{
          const prev=acct.data[i]||0,cur=acct.data[i+1]||0;
          if(!prev)return;
          const pct=((cur-prev)/Math.abs(prev))*100;
          pills.push({label:acct.label+' '+(pct>=0?'+':'')+pct.toFixed(1)+'%',color:acct.color||'#888'});
        });
      } else {
        if(!sumPrev)continue;
        const pct=((sumCur-sumPrev)/Math.abs(sumPrev))*100;
        const bgColor=pct>=0?(isDark?'rgba(60,120,60,.6)':'rgba(58,125,68,.12)'):(isDark?'rgba(140,50,50,.6)':'rgba(184,48,48,.12)');
        const labelColor=pct>=0?(isDark?'#7adf7a':'#2a6a2a'):(isDark?'#ff8a8a':'#a03030');
        pills.push({label:(pct>=0?'+':'')+pct.toFixed(1)+'%',bgColor,labelColor});
      }
      const totalH=pills.length*pillH+((pills.length-1)*2);
      let pillY=midY-totalH/2;
      pills.forEach(pill=>{
        const tw=ctx.measureText(pill.label).width;
        const pad=3;
        if(pill.bgColor){
          // Total mode — green/red style matching overview
          ctx.fillStyle=pill.bgColor;
          const rx=midX-tw/2-pad,ry=pillY-1,rw=tw+pad*2,rh=pillH;
          ctx.beginPath();
          ctx.roundRect?ctx.roundRect(rx,ry,rw,rh,3):ctx.rect(rx,ry,rw,rh);
          ctx.fill();
          ctx.fillStyle=pill.labelColor;
        } else {
          // Account mode — account-colored style
          const baseColor=pill.color||'#888';
          const bgAlpha=isDark?0.45:0.15;
          const textAlpha=isDark?0.9:0.85;
          ctx.fillStyle=hexToRgba(baseColor,bgAlpha);
          const rx=midX-tw/2-pad,ry=pillY-1,rw=tw+pad*2,rh=pillH;
          ctx.beginPath();
          ctx.roundRect?ctx.roundRect(rx,ry,rw,rh,3):ctx.rect(rx,ry,rw,rh);
          ctx.fill();
          ctx.fillStyle=hexToRgba(baseColor,textAlpha);
        }
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(pill.label,midX,pillY+pillH/2-1);
        pillY+=pillH+2;
      });
    }
    ctx.restore();
  }
};

function initLtfModule(){
  // Render factor pills (shared with C&B forecast)
  if(window.renderForecastFactorPills)window.renderForecastFactorPills();
  // View toggle
  document.querySelectorAll('#ltfViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#ltfViewToggle .btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');ltfView=b.dataset.ltfview;renderLtfChart();
  }));
  // Split toggle
  document.querySelectorAll('#ltfSplitToggle .btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#ltfSplitToggle .btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');ltfSplit=b.dataset.split;renderLtfChart();
  }));
  // Methodology toggle
  const methToggle=document.getElementById('ltfMethodToggle');
  const methPanel=document.getElementById('ltfMethodPanel');
  if(methToggle)methToggle.addEventListener('click',()=>{
    const show=methPanel.style.display==='none';
    methPanel.style.display=show?'':'none';
    methToggle.innerHTML=(show?'&#9660;':'&#9654;')+' '+(show?'Hide':'Show')+' Forecast Methodology &amp; Sensitivity';
    if(show)renderLtfMethodology();
  });
  // Table toggle
  const tblToggle=document.getElementById('ltfTableToggle');
  const tblWrap=document.getElementById('ltfTableWrap');
  if(tblToggle)tblToggle.addEventListener('click',()=>{
    const show=tblWrap.style.display==='none';
    tblWrap.style.display=show?'':'none';
    tblToggle.innerHTML=(show?'&#9660;':'&#9654;')+' '+(show?'Hide':'Show')+' Details';
  });

  // Custom Adjustments
  if(!state.ltfCustomAdj)state.ltfCustomAdj=[];
  function renderLtfAdj(){
    const list=document.getElementById('ltfAdjList');
    if(!list)return;
    const years=window.getDisplayFcLabels?window.getDisplayFcLabels():['Y1','Y2','Y3','Y4','Y5','Y6'];
    if(!state.ltfCustomAdj.length){
      list.innerHTML='<div style="font-size:.72rem;color:var(--text-dim)">No custom adjustments. Click + Add to create one.</div>';
      return;
    }
    list.innerHTML=state.ltfCustomAdj.map((adj,i)=>{
      const total=adj.amounts.reduce((s,v)=>s+(v||0),0);
      const totalM=(total/1e6).toFixed(2);
      const yrVals=years.map((yr,yi)=>{const v=adj.amounts[yi]||0;return (v/1e6).toFixed(1)}).join(', ');
      let h=`<div class="ltf-adj-row" data-ai="${i}" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--panel-inset);border:1px solid var(--border-light);border-radius:6px;cursor:pointer">`;
      h+=`<span style="font-size:.76rem;font-weight:600;color:var(--text);min-width:100px">${adj.label||'Adj '+(i+1)}</span>`;
      h+=`<span style="font-size:.72rem;color:var(--text-dim);font-family:var(--font-mono);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">$${totalM}M [${yrVals}]</span>`;
      h+=`<button class="btn btn-sm ltf-adj-del" data-ai="${i}" style="padding:1px 6px;font-size:.66rem;color:var(--danger);flex-shrink:0">×</button>`;
      h+=`</div>`;
      return h;
    }).join('');
    // Bind expand to edit
    list.querySelectorAll('.ltf-adj-row').forEach(row=>{
      row.addEventListener('click',(e)=>{
        if(e.target.closest('.ltf-adj-del'))return;
        const ai=+row.dataset.ai;
        const adj=state.ltfCustomAdj[ai];
        // Toggle inline edit
        const existing=row.querySelector('.ltf-adj-edit');
        if(existing){existing.remove();return}
        const edit=document.createElement('div');
        edit.className='ltf-adj-edit';
        edit.style.cssText='display:flex;flex-wrap:wrap;gap:4px;padding:6px 0 0;width:100%';
        edit.innerHTML=`<input class="ltf-adj-label" data-ai="${ai}" value="${adj.label||''}" placeholder="Name" style="flex:1;min-width:100px;padding:2px 6px;font-size:.74rem;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">`;
        years.forEach((yr,yi)=>{
          const dispVal=(adj.amounts[yi]||0)/1e6;
          edit.innerHTML+=`<input class="ltf-adj-amt" data-ai="${ai}" data-yi="${yi}" type="number" step="any" value="${dispVal||''}" placeholder="${yr}" title="${yr}" style="width:52px;padding:2px 4px;font-size:.72rem;text-align:right;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">`;
        });
        row.style.flexWrap='wrap';
        row.appendChild(edit);
        edit.querySelectorAll('.ltf-adj-label').forEach(inp=>{
          inp.addEventListener('change',()=>{state.ltfCustomAdj[+inp.dataset.ai].label=inp.value;saveState();renderLtfAdj();renderLtfChart()});
          inp.addEventListener('click',e=>e.stopPropagation());
        });
        edit.querySelectorAll('.ltf-adj-amt').forEach(inp=>{
          inp.addEventListener('change',()=>{state.ltfCustomAdj[+inp.dataset.ai].amounts[+inp.dataset.yi]=Math.round((parseFloat(inp.value)||0)*1e6);saveState();renderLtfAdj();renderLtfChart()});
          inp.addEventListener('click',e=>e.stopPropagation());
        });
      });
    });
    list.querySelectorAll('.ltf-adj-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        state.ltfCustomAdj.splice(+btn.dataset.ai,1);
        saveState();renderLtfAdj();renderLtfChart();
      });
    });
  }
  document.getElementById('ltfAddAdj').addEventListener('click',()=>{
    state.ltfCustomAdj.push({label:'',amounts:[0,0,0,0,0,0]});
    saveState();renderLtfAdj();
  });
  renderLtfAdj();
}

function renderLtfMethodology(){
  const panel=document.getElementById('ltfMethodPanel');
  if(!panel||panel.style.display==='none')return;
  const fa=state.forecastAssumptions;
  const tog=fa.toggles||{};
  const emps=getPnlFilteredEmps();
  const forwardEmps=emps.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>2026);
  const fHC=forwardEmps.length;
  const fBase=forwardEmps.reduce((a,e)=>a+(e.salary||0),0);
  const fBonus=forwardEmps.reduce((a,e)=>a+getBonusAmt(e),0);
  const fBen=forwardEmps.reduce((a,e)=>a+getBenefitsAmt(e),0);
  const fTotal=emps.reduce((a,e)=>a+getProratedComp(e),0);
  const fCapEx=emps.reduce((a,e)=>a+getProratedCapEx(e),0);
  const avgSal=fHC?fBase/fHC:100000;
  const bonusRate=fHC&&fBase?fBonus/fBase:0.1;
  const benRate=fHC&&fBase?fBen/fBase:0.2;
  const capRate=fTotal?fCapEx/fTotal:0;
  const _fmt=v=>'$'+Math.round(v).toLocaleString();
  const pct=v=>(v*100).toFixed(1)+'%';
  const attrMode=(fa.modes&&fa.modes.attrition)||'pct';
  const hiresMode=(fa.modes&&fa.modes.hires)||'pct';

  // OAO / D&A context
  const oaoBase=getVendorOaoTotal();
  const oaoGrowth=state.oaoGrowthPct||[5,5,5,5,5];
  const daBase=getDepreciationTotal();
  const assetLife=state.daAssetLifeYrs||5;

  // Baseline
  document.getElementById('ltfMethodBaseline').innerHTML=`
    <h5>Baseline (Derived from Current Roster + OAO + D&A)</h5>
    <div class="method-baseline">
      <div class="mb-item"><div class="mb-label">Forward HC</div><div class="mb-val">${fHC}</div></div>
      <div class="mb-item"><div class="mb-label">Avg Salary</div><div class="mb-val">${_fmt(avgSal)}</div></div>
      <div class="mb-item"><div class="mb-label">Bonus Rate</div><div class="mb-val">${pct(bonusRate)}</div></div>
      <div class="mb-item"><div class="mb-label">Benefits Rate</div><div class="mb-val">${pct(benRate)}</div></div>
      <div class="mb-item"><div class="mb-label">Cap Rate</div><div class="mb-val">${pct(capRate)}</div></div>
      <div class="mb-item"><div class="mb-label">C&B Total</div><div class="mb-val">${_fmt(fTotal)}</div></div>
      <div class="mb-item"><div class="mb-label">OAO Base</div><div class="mb-val">${_fmt(oaoBase)}</div></div>
      <div class="mb-item"><div class="mb-label">D&A Base</div><div class="mb-val">${_fmt(daBase)}</div></div>
      <div class="mb-item"><div class="mb-label">Asset Life</div><div class="mb-val">${assetLife} yrs</div></div>
    </div>`;

  // Steps — show actual input values
  const a0=fa.attrition[0]||0,h0=fa.hires[0]||0,m0=fa.merit[0]||0,mk0=fa.market[0]||0,ai0=fa.ai[0]||1,c0=fa.capitalization[0]||0;
  const steps=[
    {num:1,title:'Attrition Loss',key:'attrition',
      formula:attrMode==='pct'?`attrLoss = ${fHC} × ${a0}% = ${Math.round(fHC*a0/100)}`:`attrLoss = ${a0} employees`,
      note:`Input: ${a0}${attrMode==='pct'?'%':' heads'} per year — removes employees from HC pool`},
    {num:2,title:'New Hires (with AI Gearing)',key:'hires',
      formula:hiresMode==='pct'?`rawHires = ${fHC} × ${h0}% = ${Math.round(fHC*h0/100)}, netHires = ${Math.round(fHC*h0/100)} × ${ai0} = ${Math.round(Math.round(fHC*h0/100)*ai0)}`:`rawHires = ${h0}, netHires = ${h0} × ${ai0} = ${Math.round(h0*ai0)}`,
      note:`AI gearing: ${ai0}× — ${ai0<1?Math.round((1-ai0)*100)+'% fewer hires needed':'no reduction'}`},
    {num:3,title:'Headcount Update',always:true,
      formula:`HC = max(0, startHC − attrLoss + netHires)`,
      note:'Net headcount after attrition and hiring each year'},
    {num:4,title:'Merit + Market Growth',key:'merit',
      formula:`salaryGrowth ×= (1 + ${m0}% + ${mk0}%) = ×${(1+m0/100+mk0/100).toFixed(3)} per year`,
      note:`Merit: ${m0}%, Market: ${mk0}% — compounds Y/Y on avg salary of ${_fmt(avgSal)}`},
    {num:5,title:'Compensation Calculation',always:true,
      formula:`base = HC × ${_fmt(avgSal)} × growthMult\ntotal = base × (1 + ${pct(bonusRate)} + ${pct(benRate)}) = base × ${(1+bonusRate+benRate).toFixed(3)}`,
      note:'Bonus and benefits rates derived from current roster blend'},
    {num:6,title:'CapEx / OpEx Split',key:'capitalization',
      formula:tog.capitalization?`capex = total × ${c0}%, opex = total − capex`:`capex = total × ${pct(capRate)} (roster rate)`,
      note:tog.capitalization?`Using assumption: ${c0}% cap rate`:'Using current roster cap rate: '+pct(capRate)},
    {num:7,title:'OAO Growth',always:true,
      formula:`OAO[yr] = OAO[yr-1] × (1 + ${oaoGrowth[0]}%) — base: ${_fmt(oaoBase)}`,
      note:`Y/Y growth rates: ${oaoGrowth.map(g=>g+'%').join(', ')}`},
    {num:8,title:'D&A from CapEx Schedule',always:true,
      formula:`D&A = Σ(rollingCapEx / ${assetLife}) + baseRemaining — base: ${_fmt(daBase)}`,
      note:`${assetLife}-year straight-line depreciation on cumulative CapEx`}
  ];
  let stepsHtml='<h5>Calculation Steps (per year)</h5>';
  steps.forEach(s=>{
    const active=s.always||!s.key||tog[s.key]!==false;
    stepsHtml+=`<div class="method-step${active?'':' ms-disabled'}">
      <div class="ms-num">${s.num}</div>
      <div class="ms-body">
        <div class="ms-title">${s.title}${!active?' (OFF)':''}</div>
        <div class="ms-formula">${s.formula.replace(/\n/g,'<br>')}</div>
        <div class="ms-note">${s.note}</div>
      </div>
    </div>`;
  });
  document.getElementById('ltfMethodSteps').innerHTML=stepsHtml;

  // Year-by-year walk
  const FORECAST_YEARS=window.getDisplayYears?window.getDisplayYears():[2027,2028,2029,2030,2031];
  const allEmpsCount=Math.max(state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>2026).length,1);
  let hc=fHC,salaryGrowth=1;
  const cbCapex=[];
  const cCapEx=getContractorCapExTotal();
  let walkRows=[];
  const oaoYears=[oaoBase];
  for(let i=0;i<5;i++)oaoYears.push(Math.round(oaoYears[i]*(1+(oaoGrowth[i]||0)/100)));
  const daYears=[daBase];

  FORECAST_YEARS.forEach((y,i)=>{
    const attrVal=tog.attrition?fa.attrition[i]:0;
    const attrLoss=attrMode==='pct'?Math.round(hc*attrVal/100):Math.round(attrVal*(fHC/allEmpsCount));
    const hiresVal=tog.hires?fa.hires[i]:0;
    const rawHires=hiresMode==='pct'?Math.round(hc*hiresVal/100):Math.round(hiresVal*(fHC/allEmpsCount));
    const meritRate=tog.merit?fa.merit[i]/100:0;
    const marketRate=tog.market?fa.market[i]/100:0;
    const aiGear=tog.ai?fa.ai[i]:1;
    const capRateY=tog.capitalization?fa.capitalization[i]/100:capRate;
    const netHires=Math.round(rawHires*aiGear);
    const prevHC=hc;
    hc=Math.max(0,hc-attrLoss+netHires);
    salaryGrowth*=(1+meritRate+marketRate);
    const base=Math.round(hc*avgSal*salaryGrowth);
    const total=Math.round(base*(1+bonusRate+benRate));
    const capex=Math.round(total*capRateY);
    const opex=total-capex;
    cbCapex.push(capex);
    // D&A calc
    const totalCapexByYear=cbCapex.map(cb=>cb+cCapEx);
    let yearDa=0;
    for(let v=0;v<=i;v++){if(i+1-v<=assetLife)yearDa+=Math.round(totalCapexByYear[v]/assetLife)}
    yearDa+=Math.max(0,Math.round(daBase*(1-(i+1)/assetLife)));
    daYears.push(yearDa);
    const oao=oaoYears[i+1];
    const totalPnl=opex+oao+yearDa;
    walkRows.push({year:y,prevHC,attrLoss,netHires,hc,meritRate,marketRate,salaryGrowth,
      base,total,capex,opex,oao,da:yearDa,totalPnl,attrVal,hiresVal,aiGear,rawHires,capRateY});
  });

  const dy=window.displayYear||(y=>y);
  const fM=v=>{const a=Math.abs(v);return a>=1e5?(v<0?'-':'')+'$'+(v/1e6).toFixed(2)+'M':_fmt(v)};
  let walkHtml=`<h5 style="margin-bottom:8px">Year-by-Year Walk (Full P&L)</h5>
    <div style="overflow-x:auto"><table class="method-walk-table">
    <thead><tr>
      <th>Year</th><th>Start HC</th>
      <th>Attr %</th><th>Attr Loss</th><th>Raw Hires</th><th>AI Gear</th><th>Net Hires</th>
      <th>End HC</th><th>∆ HC</th>
      <th>Merit%</th><th>Mkt%</th><th>Growth×</th>
      <th>Avg Sal</th><th>C&B Total</th><th>Cap%</th><th>CapEx</th><th>C&B OpEx</th>
      <th>OAO</th><th>D&A</th><th style="font-weight:800">Total OpEx</th>
    </tr></thead><tbody>`;
  walkRows.forEach(r=>{
    const deltaHC=r.hc-r.prevHC;
    const deltaStyle=deltaHC>0?'color:var(--success)':deltaHC<0?'color:var(--danger)':'';
    const effSal=Math.round(avgSal*r.salaryGrowth);
    walkHtml+=`<tr>
      <td class="mw-highlight">${dy(r.year)}</td>
      <td>${r.prevHC}</td>
      <td class="mw-dim">${r.attrVal}%</td>
      <td class="mw-dim">−${r.attrLoss}</td>
      <td>${r.rawHires}</td>
      <td class="mw-dim">${r.aiGear.toFixed(2)}×</td>
      <td>+${r.netHires}</td>
      <td class="mw-highlight">${r.hc}</td>
      <td style="${deltaStyle};font-weight:600">${deltaHC>0?'+':''}${deltaHC}</td>
      <td>${(r.meritRate*100).toFixed(1)}%</td>
      <td>${(r.marketRate*100).toFixed(1)}%</td>
      <td class="mw-dim">${r.salaryGrowth.toFixed(3)}×</td>
      <td class="mw-dim">${fM(effSal)}</td>
      <td>${fM(r.total)}</td>
      <td class="mw-dim">${(r.capRateY*100).toFixed(0)}%</td>
      <td class="mw-dim">${fM(r.capex)}</td>
      <td>${fM(r.opex)}</td>
      <td>${fM(r.oao)}</td>
      <td>${fM(r.da)}</td>
      <td class="mw-highlight" style="font-weight:700">${fM(r.totalPnl)}</td>
    </tr>`;
  });
  walkHtml+='</tbody></table></div>';
  document.getElementById('ltfMethodWalk').innerHTML=walkHtml;
}

function buildLtfSplitGroups(emps){
  let splitGroups=null;
  let splitGroupKeys={};
  if(ltfSplit==='project'){
    splitGroups={};
    const allocTracker={};
    emps.forEach(e=>{allocTracker[e.id]=0});
    state.projects.forEach(p=>{
      const allocated=[];
      emps.forEach(e=>{
        if(!e.allocations)return;
        const alloc=e.allocations.find(a=>a.projId===p.id);
        if(!alloc)return;
        const pct=alloc.pct/100;
        allocTracker[e.id]=(allocTracker[e.id]||0)+pct;
        allocated.push({...e,salary:Math.round((e.salary||0)*pct),capPct:e.capPct,_allocPct:pct});
      });
      if(allocated.length){splitGroups[p.code]=allocated;splitGroupKeys[p.code]=p.id}
    });
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const genCode=genProj?'GEN-000':'Unassigned';
    emps.forEach(e=>{
      const used=allocTracker[e.id]||0;
      if(used<0.999){
        const rem=1-used;
        if(!splitGroups[genCode])splitGroups[genCode]=[];
        splitGroups[genCode].push({...e,salary:Math.round((e.salary||0)*rem),capPct:e.capPct,_allocPct:rem});
        if(!splitGroupKeys[genCode])splitGroupKeys[genCode]=genProj?genProj.id:null;
      }
    });
  } else if(ltfSplit==='function'){
    splitGroups={};
    const used=new Set();
    FUNCTIONS.forEach(f=>{const fe=emps.filter(e=>{if(e.function===f){used.add(e.id);return true}return false});if(fe.length){splitGroups[f]=fe;splitGroupKeys[f]=f}});
    const other=emps.filter(e=>!used.has(e.id));
    if(other.length){splitGroups['Other']=other;splitGroupKeys['Other']='Other'}
  } else if(ltfSplit==='country'){
    splitGroups={};
    const used=new Set();
    COUNTRIES.forEach(c=>{const ce=emps.filter(e=>{if(e.country===c){used.add(e.id);return true}return false});if(ce.length){splitGroups[c]=ce;splitGroupKeys[c]=c}});
    const other=emps.filter(e=>!used.has(e.id));
    if(other.length){splitGroups['Other']=other;splitGroupKeys['Other']='Other'}
  }
  return {splitGroups,splitGroupKeys};
}

function renderLtfChart(){
  if(typeof Chart==='undefined')return;
  const canvas=document.getElementById('ltfChart');
  if(!canvas)return;
  const emps=getPnlFilteredEmps();
  const yearLabels=window.getDisplayFcLabels();
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  const fmtTick=v=>{const a=Math.abs(v);return(v<0?'-':'')+'$'+(a/1e6).toFixed(2)+'M'};
  const isPnl=ltfView==='pnl';
  const lcc=getChartColors();

  // Compute total C&B via projectForecast (always needed for OAO/D&A context)
  const cbRows=projectForecast(emps);
  const cbOpex=cbRows.map(r=>r.opex);
  const cbCapex=cbRows.map(r=>r.capex);
  const cbGross=cbRows.map(r=>r.total);

  // Compute OAO (Y/Y growth)
  const oaoBase=getVendorOaoTotal();
  const oaoGrowth=state.oaoGrowthPct||[5,5,5,5,5];
  const oaoYears=[oaoBase];
  for(let i=0;i<5;i++)oaoYears.push(Math.round(oaoYears[i]*(1+(oaoGrowth[i]||0)/100)));

  // Contractor CapEx (carry flat)
  const cCapEx=getContractorCapExTotal();

  // Compute D&A from CapEx depreciation schedule
  const assetLife=state.daAssetLifeYrs||5;
  const daBase=getDepreciationTotal();
  const daYears=[daBase];
  const totalCapexByYear=cbCapex.map(cb=>cb+cCapEx);
  for(let yr=1;yr<=5;yr++){
    let yearDa=0;
    for(let v=0;v<yr;v++){
      const yearsInService=yr-v;
      if(yearsInService<=assetLife){
        yearDa+=Math.round(totalCapexByYear[v]/assetLife);
      }
    }
    const baseRemaining=Math.max(0,Math.round(daBase*(1-yr/assetLife)));
    yearDa+=baseRemaining;
    daYears.push(yearDa);
  }

  if(ltfChartInst)ltfChartInst.destroy();
  if(ltfFteChartInst)ltfFteChartInst.destroy();

  // Build split groups if needed
  const {splitGroups,splitGroupKeys}=buildLtfSplitGroups(emps);
  let groupForecasts=null;

  // Account data for Y/Y bubbles (always computed for total % growth)
  const acctColors={cb:lcc[0],oao:lcc[1],da:lcc[2]};
  const acctData=isPnl?[
    {label:'C&B',data:cbOpex,color:acctColors.cb},
    {label:'OAO',data:oaoYears,color:acctColors.oao},
    {label:'D&A',data:daYears,color:acctColors.da}
  ]:[
    {label:'C&B',data:cbGross,color:acctColors.cb},
    {label:'OAO',data:oaoYears,color:acctColors.oao}
  ];

  let datasets=[];
  const byAccount=ltfSplit==='account';

  if(splitGroups && ltfSplit!=='comp' && !byAccount){
    // ── Split by project/function/country ──
    const groupNames=Object.keys(splitGroups);
    groupForecasts={};
    groupNames.forEach(g=>groupForecasts[g]=projectForecast(splitGroups[g],splitGroupKeys[g]));

    // Normalize group values to match totals
    yearLabels.forEach((_,yi)=>{
      const tr=cbRows[yi];
      let sumTotal=0,sumCapex=0;
      groupNames.forEach(g=>{const r=groupForecasts[g][yi];if(r){sumTotal+=r.total;sumCapex+=r.capex}});
      if(sumTotal){
        const ratioT=tr.total/sumTotal;
        const ratioC=sumCapex?tr.capex/sumCapex:0;
        groupNames.forEach(g=>{const r=groupForecasts[g][yi];if(r){r.total=Math.round(r.total*ratioT);r.capex=Math.round(r.capex*ratioC);r.opex=r.total-r.capex}});
      }
    });

    // Stacked chart by group (C&B portion only — OAO/D&A stay as separate stacks)
    groupNames.forEach((g,i)=>{
      const gf=groupForecasts[g];
      const data=yearLabels.map((_,yi)=>{const r=gf[yi];return r?(isPnl?r.opex:r.total):0});
      datasets.push({label:g.length>20?g.slice(0,18)+'\u2026':g,data,backgroundColor:lcc[i%lcc.length],stack:'pos'});
    });
    // Add OAO and D&A on top
    datasets.push({label:'OAO',data:oaoYears.slice(),backgroundColor:hexToRgba(lcc[1],0.6),stack:'pos'});
    if(isPnl){
      datasets.push({label:'D&A',data:daYears.slice(),backgroundColor:hexToRgba(lcc[2],0.6),stack:'pos'});
      datasets.push({label:'CapEx',data:cbCapex.map((v)=>-(v+cCapEx)),backgroundColor:hexToRgba(lcc[0],0.35),stack:'neg'});
    }
  } else if(ltfSplit==='comp'){
    // ── Split by Base / Bonus / Benefits ──
    if(isPnl){
      datasets=[
        {label:'Base (OpEx)',data:cbRows.map(r=>Math.round(r.base*(1-r.capex/Math.max(r.total,1)))),backgroundColor:lcc[0],stack:'pos'},
        {label:'Bonus (OpEx)',data:cbRows.map(r=>Math.round(r.bonus*(1-r.capex/Math.max(r.total,1)))),backgroundColor:lcc[1],stack:'pos'},
        {label:'Benefits (OpEx)',data:cbRows.map(r=>Math.round(r.benefits*(1-r.capex/Math.max(r.total,1)))),backgroundColor:lcc[2],stack:'pos'},
        {label:'OAO',data:oaoYears.slice(),backgroundColor:hexToRgba(lcc[3]||lcc[1],0.6),stack:'pos'},
        {label:'D&A',data:daYears.slice(),backgroundColor:hexToRgba(lcc[4]||lcc[2],0.6),stack:'pos'},
        {label:'CapEx',data:cbCapex.map((v)=>-(v+cCapEx)),backgroundColor:hexToRgba(lcc[0],0.35),stack:'neg'}
      ];
    } else {
      datasets=[
        {label:'Base',data:cbRows.map(r=>r.base),backgroundColor:lcc[0],stack:'pos'},
        {label:'Bonus',data:cbRows.map(r=>r.bonus),backgroundColor:lcc[1],stack:'pos'},
        {label:'Benefits',data:cbRows.map(r=>r.benefits),backgroundColor:lcc[2],stack:'pos'},
        {label:'OAO',data:oaoYears.slice(),backgroundColor:hexToRgba(lcc[3]||lcc[1],0.6),stack:'pos'}
      ];
    }
  } else {
    // ── Total view (default) ──
    if(isPnl){
      datasets=[
        {label:'C&B',data:cbOpex.slice(),backgroundColor:lcc[0],stack:'pos'},
        {label:'OAO',data:oaoYears.slice(),backgroundColor:lcc[1],stack:'pos'},
        {label:'D&A',data:daYears.slice(),backgroundColor:lcc[2],stack:'pos'},
        {label:'CapEx',data:cbCapex.map((v)=>-(v+cCapEx)),backgroundColor:hexToRgba(lcc[0],0.35),stack:'neg'}
      ];
    } else {
      datasets=[
        {label:'C&B',data:cbGross.slice(),backgroundColor:lcc[0],stack:'pos'},
        {label:'OAO',data:oaoYears.slice(),backgroundColor:lcc[1],stack:'pos'}
      ];
    }
  }

  // Add custom adjustments as separate datasets
  if(state.ltfCustomAdj&&state.ltfCustomAdj.length){
    state.ltfCustomAdj.forEach((adj,ai)=>{
      const adjData=yearLabels.map((_,yi)=>adj.amounts[yi]||0);
      if(adjData.some(v=>v!==0)){
        const adjColor=lcc[(3+ai)%lcc.length];
        datasets.push({label:adj.label||'Adj '+(ai+1),data:adjData,backgroundColor:hexToRgba(adjColor,0.5),stack:'pos'});
        // Include in acctData for Y/Y total calculation
        acctData.push({label:adj.label||'Adj',data:adjData,color:adjColor});
      }
    });
  }

  window.stackedBarDatalabels(datasets,tickColor,8,'ltf');
  if(isPnl)datasets.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}});

  ltfChartInst=new Chart(canvas,{
    type:'bar',data:{labels:yearLabels,datasets},
    plugins:[ltfYoyPlugin,barTotalPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:12},padding:14,filter:item=>!item.text.includes('CapEx')}},datalabels:{display:false},barTotal:{color:tickColor,fontSize:11},ltfYoy:{accountData:acctData,byAccount}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:11,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:10,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}
    }
  });

  // ── FTE Chart ──
  const fteCanvas=document.getElementById('ltfFteChart');
  if(fteCanvas){
    let fteDatasets=[];
    if(splitGroups && ltfSplit!=='comp'){
      const gNames=Object.keys(splitGroups);
      gNames.forEach((g,i)=>{
        const gf=groupForecasts[g];
        fteDatasets.push({label:g.length>20?g.slice(0,18)+'\u2026':g,data:yearLabels.map((_,yi)=>gf[yi]?gf[yi].hc:0),borderColor:lcc[i%lcc.length],backgroundColor:hexToRgba(lcc[i%lcc.length],0.25),fill:true,tension:0.4,pointRadius:0,borderWidth:1.5});
      });
    } else {
      fteDatasets=[{label:'Projected FTEs',data:cbRows.map(r=>r.hc),borderColor:lcc[0],backgroundColor:hexToRgba(lcc[0],0.15),fill:true,tension:0.4,pointRadius:3,borderWidth:2}];
    }
    // Total FTE datalabel on topmost dataset
    fteDatasets.forEach((ds,i)=>{
      if(i===fteDatasets.length-1){
        ds.datalabels={display:true,anchor:'end',align:'end',color:tickColor,font:{size:11,weight:'bold'},
          formatter:(_,ctx)=>{let sum=0;fteDatasets.forEach(d=>{const v=d.data[ctx.dataIndex];if(typeof v==='number')sum+=v});return sum||''}};
      } else {
        ds.datalabels={display:false};
      }
    });
    ltfFteChartInst=new Chart(fteCanvas,{
      type:'line',data:{labels:yearLabels,datasets:fteDatasets},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
        plugins:{legend:{display:fteDatasets.length>1,position:'bottom',labels:{color:tickColor,boxWidth:14,font:{size:12},padding:14}},datalabels:{},tooltip:window.FTE_TOOLTIP||{}},
        scales:{
          x:{ticks:{color:tickColor,font:{size:11}},grid:{display:false},stacked:true},
          y:{beginAtZero:true,stacked:true,ticks:{color:tickColor,font:{size:11}},grid:{color:gridColor},title:{display:true,text:'Projected FTEs',color:tickColor,font:{size:11}}}
        }
      }
    });
  }

  // ── Detail table ──
  const tbl=document.getElementById('ltfTable');
  if(tbl){
    if(splitGroups && ltfSplit!=='comp'){
      const groupNames=Object.keys(splitGroups);
      const showOpex=isPnl;
      let html='<thead><tr><th>Year</th><th>HC</th>';
      groupNames.forEach(g=>html+=`<th class="split-th">${g.length>15?g.slice(0,13)+'\u2026':g}</th>`);
      html+=`<th class="split-th col-divider">C&B</th><th>OAO</th>${showOpex?'<th>D&A</th><th>CapEx</th><th>OpEx</th>':'<th>Tot Inv</th>'}</tr></thead><tbody>`;
      yearLabels.forEach((yr,i)=>{
        const hc=cbRows[i]?cbRows[i].hc:0;
        html+=`<tr><td style="font-weight:600;color:var(--accent)">${yr}</td><td>${hc}</td>`;
        groupNames.forEach(g=>{const r=groupForecasts[g][i];const v=r?(showOpex?r.opex:r.total):0;html+=`<td>${fmt(v)}</td>`});
        if(showOpex){
          const opex=cbOpex[i]+oaoYears[i]+daYears[i];
          html+=`<td class="col-divider">${fmt(cbOpex[i])}</td><td>${fmt(oaoYears[i])}</td><td>${fmt(daYears[i])}</td><td>${fmt(cbCapex[i]+cCapEx)}</td><td style="font-weight:600;color:var(--success)">${fmt(opex)}</td>`;
        } else {
          const totInv=cbGross[i]+oaoYears[i];
          html+=`<td class="col-divider">${fmt(cbGross[i])}</td><td>${fmt(oaoYears[i])}</td><td style="font-weight:600;color:var(--accent)">${fmt(totInv)}</td>`;
        }
        html+='</tr>';
      });
      html+='</tbody>';
      tbl.innerHTML=html;
    } else if(ltfSplit==='comp'){
      let html=isPnl?'<thead><tr><th>Year</th><th>HC</th><th>Base</th><th>Bonus</th><th>Benefits</th><th>C&B</th><th>OAO</th><th>D&A</th><th>CapEx</th><th>OpEx</th></tr></thead><tbody>'
        :'<thead><tr><th>Year</th><th>HC</th><th>Base</th><th>Bonus</th><th>Benefits</th><th>C&B</th><th>OAO</th><th>Tot Inv</th></tr></thead><tbody>';
      yearLabels.forEach((yr,i)=>{
        const hc=cbRows[i]?cbRows[i].hc:0;
        const r=cbRows[i]||{base:0,bonus:0,benefits:0};
        if(isPnl){
          const opex=cbOpex[i]+oaoYears[i]+daYears[i];
          html+=`<tr><td style="font-weight:600;color:var(--accent)">${yr}</td><td>${hc}</td><td>${fmt(r.base)}</td><td>${fmt(r.bonus)}</td><td>${fmt(r.benefits)}</td><td>${fmt(cbOpex[i])}</td><td>${fmt(oaoYears[i])}</td><td>${fmt(daYears[i])}</td><td>${fmt(cbCapex[i]+cCapEx)}</td><td style="font-weight:600;color:var(--success)">${fmt(opex)}</td></tr>`;
        } else {
          const totInv=cbGross[i]+oaoYears[i];
          html+=`<tr><td style="font-weight:600;color:var(--accent)">${yr}</td><td>${hc}</td><td>${fmt(r.base)}</td><td>${fmt(r.bonus)}</td><td>${fmt(r.benefits)}</td><td>${fmt(cbGross[i])}</td><td>${fmt(oaoYears[i])}</td><td style="font-weight:600;color:var(--accent)">${fmt(totInv)}</td></tr>`;
        }
      });
      html+='</tbody>';
      tbl.innerHTML=html;
    } else {
      const hdr=isPnl?'<thead><tr><th>Year</th><th>HC</th><th>C&B</th><th>OAO</th><th>D&A</th><th>CapEx</th><th>OpEx</th></tr></thead>':'<thead><tr><th>Year</th><th>HC</th><th>C&B</th><th>OAO</th><th>Tot Inv</th></tr></thead>';
      let body='<tbody>';
      yearLabels.forEach((yr,i)=>{
        const hc=cbRows[i]?cbRows[i].hc:0;
        if(isPnl){
          const opex=cbOpex[i]+oaoYears[i]+daYears[i];
          body+=`<tr><td style="font-weight:600;color:var(--accent)">${yr}</td><td>${hc}</td><td>${fmt(cbOpex[i])}</td><td>${fmt(oaoYears[i])}</td><td>${fmt(daYears[i])}</td><td>${fmt(cbCapex[i]+cCapEx)}</td><td style="font-weight:600;color:var(--success)">${fmt(opex)}</td></tr>`;
        } else {
          const totInv=cbGross[i]+oaoYears[i];
          body+=`<tr><td style="font-weight:600;color:var(--accent)">${yr}</td><td>${hc}</td><td>${fmt(cbGross[i])}</td><td>${fmt(oaoYears[i])}</td><td style="font-weight:600;color:var(--accent)">${fmt(totInv)}</td></tr>`;
        }
      });
      body+='</tbody>';
      tbl.innerHTML=hdr+body;
    }
  }
}
window.renderLtfChart=renderLtfChart;

// ── CHART EXPAND PANE ──
let expandBudgetInst=null,expandForecastInst=null,expandRevenueInst=null,expandRevFcInst=null;
function cloneChart(srcInst,targetCanvasId,extraPlugins,expandFonts){
  if(!srcInst)return null;
  const src=srcInst.config;
  const newData={labels:src.data.labels.slice(),datasets:src.data.datasets.map(ds=>{
    const copy={...ds,data:ds.data.slice()};
    if(ds.datalabels)copy.datalabels={...ds.datalabels};
    return copy;
  })};
  const newOpts=JSON.parse(JSON.stringify(src.options,(k,v)=>typeof v==='function'?'__fn__':v));
  function restoreFns(target,source){
    if(!source||!target||typeof source!=='object')return;
    for(const k in source){
      if(typeof source[k]==='function'){target[k]=source[k]}
      else if(typeof source[k]==='object'&&source[k]!==null&&target[k])restoreFns(target[k],source[k]);
    }
  }
  restoreFns(newOpts,src.options);
  // Bump font sizes for expanded view
  if(expandFonts){
    if(newOpts.scales){
      ['x','y'].forEach(ax=>{if(newOpts.scales[ax]&&newOpts.scales[ax].ticks&&newOpts.scales[ax].ticks.font)newOpts.scales[ax].ticks.font.size=14});
      if(newOpts.scales.y&&newOpts.scales.y.title&&newOpts.scales.y.title.font)newOpts.scales.y.title.font.size=14;
    }
    if(newOpts.plugins){
      if(newOpts.plugins.legend&&newOpts.plugins.legend.labels&&newOpts.plugins.legend.labels.font)newOpts.plugins.legend.labels.font.size=14;
      if(newOpts.plugins.barTotal)newOpts.plugins.barTotal.fontSize=14;
    }
    if(newOpts.layout)newOpts.layout.padding={top:28};
  }
  const plugins=(src._config&&src._config.plugins?src._config.plugins:[]).concat(extraPlugins||[]);
  return new Chart(document.getElementById(targetCanvasId),{type:src.type,data:newData,plugins,options:newOpts});
}
function renderExpandedCharts(){
  if(typeof Chart==='undefined')return;
  var pane=document.getElementById('chartExpandPane');
  if(!pane||!pane.classList.contains('open'))return;
  syncExpandFilters();
  // Budget chart
  if(expandBudgetInst){expandBudgetInst.destroy();expandBudgetInst=null}
  expandBudgetInst=cloneChart(landingBudgetChartInst,'expandBudgetChart',[barTotalPlugin],true);
  // LTF chart
  if(expandForecastInst){expandForecastInst.destroy();expandForecastInst=null}
  expandForecastInst=cloneChart(landingForecastChartInst,'expandForecastChart',[barTotalPlugin,window.yoyArrowsPlugin],true);
  // Revenue charts — hide when revenue module is toggled off
  const revVisible=localStorage.getItem('compPlanRevenue')==='1';
  const expandRevEl=document.getElementById('expandRevenue');
  const expandRevFcEl=document.getElementById('expandRevForecast');
  if(expandRevEl)expandRevEl.style.display=revVisible?'':'none';
  if(expandRevFcEl)expandRevFcEl.style.display=revVisible?'':'none';
  if(expandRevenueInst){expandRevenueInst.destroy();expandRevenueInst=null}
  expandRevenueInst=revVisible?cloneChart(landingRevenueChartInst,'expandRevenueChart',null,true):null;
  if(expandRevFcInst){expandRevFcInst.destroy();expandRevFcInst=null}
  expandRevFcInst=revVisible?cloneChart(landingRevFcChartInst,'expandRevFcChart',null,true):null;
}
function syncExpandFilters(){
  // Copy main filter options into expand toolbar dropdowns, preserving expand's current selection
  const pairs=[['pnlFilterProduct','expandFilterProduct'],['pnlFilterCategory','expandFilterCategory'],['pnlFilterFunction','expandFilterFunction'],['pnlFilterCountry','expandFilterCountry']];
  pairs.forEach(([src,dst])=>{
    const srcEl=document.getElementById(src),dstEl=document.getElementById(dst);
    if(!srcEl||!dstEl)return;
    const keepVal=dstEl.value;
    dstEl.innerHTML=srcEl.innerHTML;
    // Keep expand's current selection if it still exists in options; otherwise use main's value
    dstEl.value=keepVal;
    if(!dstEl.value&&keepVal)dstEl.value=srcEl.value;
  });
  // Sync view toggle
  const mainActive=document.querySelector('#landingChartViewToggle .btn.active');
  if(mainActive){
    document.querySelectorAll('#expandViewToggle .btn').forEach(b=>{
      b.classList.toggle('active',b.dataset.xview===mainActive.dataset.lcview);
    });
  }
}
function openChartExpandPane(targetId){
  const pane=document.getElementById('chartExpandPane');
  pane.classList.add('open');
  document.body.style.overflow='hidden';
  syncExpandFilters();
  renderExpandedCharts();
  setTimeout(function(){
    const el=document.getElementById(targetId);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },350);
}
function closeChartExpandPane(){
  const pane=document.getElementById('chartExpandPane');
  pane.classList.remove('open');
  document.body.style.overflow='';
  if(expandBudgetInst){expandBudgetInst.destroy();expandBudgetInst=null}
  if(expandForecastInst){expandForecastInst.destroy();expandForecastInst=null}
  if(expandRevenueInst){expandRevenueInst.destroy();expandRevenueInst=null}
  if(expandRevFcInst){expandRevFcInst.destroy();expandRevFcInst=null}
}
document.getElementById('chartExpandClose').addEventListener('click',closeChartExpandPane);
document.querySelectorAll('.chart-expand-btn').forEach(function(btn){
  btn.addEventListener('click',function(){openChartExpandPane(this.dataset.expandTarget)});
});
// Expand toolbar: unified handler — sync to main, re-render source charts, then re-clone expanded
let _expandRenderTimer=null;
function expandFilterChanged(){
  if(_expandRenderTimer)clearTimeout(_expandRenderTimer);
  _expandRenderTimer=setTimeout(()=>{
    // Sync expand filters → main filter variables AND DOM elements
    const s=id=>document.getElementById(id);
    pnlFilterProduct=s('expandFilterProduct').value;
    pnlFilterCategory=s('expandFilterCategory').value;
    pnlFilterFunction=s('expandFilterFunction').value;
    pnlFilterCountry=s('expandFilterCountry').value;
    s('pnlFilterProduct').value=pnlFilterProduct;
    s('pnlFilterCategory').value=pnlFilterCategory;
    s('pnlFilterFunction').value=pnlFilterFunction;
    s('pnlFilterCountry').value=pnlFilterCountry;
    // Sync view toggle
    const activeView=document.querySelector('#expandViewToggle .btn.active');
    if(activeView){
      landingChartView=activeView.dataset.xview;
      document.querySelectorAll('#landingChartViewToggle .btn').forEach(x=>x.classList.toggle('active',x.dataset.lcview===landingChartView));
    }
    // Re-render source charts (the wrapped version auto-calls renderExpandedCharts)
    renderPnlWalk();renderLandingCharts();
  },80);
}
document.querySelectorAll('#expandViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#expandViewToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  expandFilterChanged();
}));
['expandFilterProduct','expandFilterCategory','expandFilterFunction','expandFilterCountry'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('change',expandFilterChanged);
});
// Keep expanded charts in sync when landing charts re-render
const _origRenderLandingCharts=renderLandingCharts;
renderLandingCharts=function(){_origRenderLandingCharts();try{renderExpandedCharts()}catch(e){console.warn('Expand chart sync error:',e)}};
const _origRenderLandingRevChart=renderLandingRevenueChart;
renderLandingRevenueChart=function(){_origRenderLandingRevChart();try{renderExpandedCharts()}catch(e){console.warn('Expand chart sync error:',e)}};
const _origRenderLandingRevFc=renderLandingRevForecastChart;
renderLandingRevForecastChart=function(){_origRenderLandingRevFc();try{renderExpandedCharts()}catch(e){console.warn('Expand chart sync error:',e)}};

// ── INIT ──
function renderAll(){
  const fns=[renderExecView,renderDashboard,renderEmployees,renderProjects,renderMarkets,renderBizLines,renderBonusMatrix,renderBenefitsMatrix,renderMonthly,renderForecast,renderWorkspaceList,renderPnlWalk,renderLandingCharts,renderLandingRevenue,
    function(){if(window.budgetScenario&&!window.budgetScenarioDirty){if(window.initBudgetScenario)window.initBudgetScenario();if(window.initForecastScenario)window.initForecastScenario();}},
    renderBudgetScenarioChart,renderFcScenarioChart,renderScenarioPnlSummary];
  fns.forEach(fn=>{try{fn()}catch(e){console.error('Render error in '+fn.name+':',e)}});
}

// Run each init step independently so one failure doesn't kill the rest
function safeRun(label,fn){try{fn()}catch(e){console.error('Init error in '+label+':',e)}}

function runInitSequence(){
  safeRun('updateSessionUI',()=>updateSessionUI());
  safeRun('initDropdowns',()=>initDropdowns());
  safeRun('initBizLines',()=>initBizLines());
  safeRun('renderAll',()=>renderAll());
  safeRun('initScenarioPane',()=>{initScenarioPane();initDataPanel();window._scenInited=true});
  safeRun('initSessionModal',()=>initSessionModal());
  safeRun('renderPnlWalk',()=>renderPnlWalk());
  safeRun('renderLandingCharts',()=>renderLandingCharts());
  safeRun('renderLandingRevenue',()=>renderLandingRevenue());
}

// Check for session auto-reconnect
(async function initApp(){
  const savedSession=localStorage.getItem('compPlanSession');
  if(savedSession){
    try{
      window.sessionContext=JSON.parse(savedSession);
      const resp=await fetch(`/api/sessions/${window.sessionContext.code}`);
      if(resp.ok){
        window.persistenceMode='session';
        const vResp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${window.sessionContext.versionId}`);
        if(vResp.ok){
          const v=await vResp.json();
          { const _d=JSON.parse(v.state_data);Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,_d); }ensureStateFields();
          safeRun('loadUserColorScheme',()=>loadUserColorScheme());
          runInitSequence();
          safeRun('connectWebSocket',()=>connectWebSocket());
          return;
        }
      }
    }catch(e){console.warn('Session reconnect failed, falling back to template mode:',e)}
    window.sessionContext=null;localStorage.removeItem('compPlanSession');
  }
  // Template mode
  safeRun('loadState',()=>loadState());
  window.currentWorkspaceName=localStorage.getItem('compPlanActiveWS')||'Default';
  safeRun('updateWsDisplay',()=>updateWsDisplay());
  runInitSequence();
})();

/* ── window assignments for inline onclick / HTML-referenced functions ── */
window.toggleAnalysisSection = toggleAnalysisSection;
window.toggleDepBand = toggleDepBand;
window.toggleRevBand = toggleRevBand;
window.hideAllModules = hideAllModules;
window.showLanding = showLanding;
window.showApp = showApp;
window.showVendor = showVendor;
window.showDepreciation = showDepreciation;
window.showRevenue = showRevenue;
window.showLtf = showLtf;
window.openChartExpandPane = openChartExpandPane;
window.closeChartExpandPane = closeChartExpandPane;
window.renderPnlWalk = renderPnlWalk;
window.renderLandingCharts = renderLandingCharts;
window.renderLandingRevenue = renderLandingRevenue;
window.renderAll = renderAll;

/* ── named exports ── */
export {
  toggleAnalysisSection, hideAllModules,
  showLanding, showApp, showVendor, showDepreciation, showRevenue,
  renderPnlWalk, renderLandingCharts, renderLandingRevenue,
  openChartExpandPane, closeChartExpandPane
};
