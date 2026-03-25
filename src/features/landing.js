// ── landing.js — ES module extracted from index.html lines 14872–15479 ──
import { state, saveState, ensureStateFields } from '../lib/state.js';
import { fmt, esc, CURRENT_YEAR, FUNCTIONS, COUNTRIES } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx } from '../lib/proration.js';

/* ── globals accessed via window (not yet modularised) ── */
const getChartColors          = (...a) => window.getChartColors(...a);
const hexToRgba               = (...a) => window.hexToRgba(...a);
const projectForecast         = (...a) => window.projectForecast(...a);
const getVendorOaoTotal       = (...a) => window.getVendorOaoTotal(...a);
const getContractorCapExTotal = (...a) => window.getContractorCapExTotal(...a);
const getContractorCapExByMonth = (...a) => window.getContractorCapExByMonth(...a);
const getDepreciationTotal    = (...a) => window.getDepreciationTotal(...a);
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
  document.getElementById('landingPage').style.display='none';
  document.getElementById('appShell').style.display='none';
  document.getElementById('vendorModule').style.display='none';
  document.getElementById('depreciationModule').style.display='none';
  document.getElementById('revenueModule').style.display='none';
  document.getElementById('ltfModule').style.display='none';
}
function showLanding(){
  hideAllModules();
  document.getElementById('landingPage').style.display='';
  renderPnlWalk();renderLandingCharts();renderLandingRevenue();
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
}
function showApp(){
  hideAllModules();
  document.getElementById('appShell').style.display='';
  renderAll();
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
}
let vendorModuleInited=false;
function showVendor(){
  hideAllModules();
  document.getElementById('vendorModule').style.display='';
  if(!vendorModuleInited){try{initVendorModule();vendorModuleInited=true}catch(e){console.error('Vendor init error:',e)}}
  else{window.renderVendorGridPublic()}
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
}
function showDepreciation(){
  hideAllModules();
  document.getElementById('depreciationModule').style.display='';
  initDepModule();
  initAssetTab();
  setTimeout(initDepScratch,50);
  if(window._updateGlobalToolbar)window._updateGlobalToolbar();
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
function renderPnlWalk(){
  populatePnlFilters();
  const emps=getPnlFilteredEmps();
  const tbl=document.getElementById('pnlWalkTable');

  // Build matrix: rows = product categories, with product drill-down
  // Group employees by category → product
  const catGroups={};
  emps.forEach(e=>{
    const p=getEmpProject(e);
    const cat=p?p.category||'Uncategorized':'Uncategorized';
    const prod=p?p.product||'Unassigned':'Unassigned';
    if(!catGroups[cat])catGroups[cat]={emps:[],products:{}};
    catGroups[cat].emps.push(e);
    if(!catGroups[cat].products[prod])catGroups[cat].products[prod]=[];
    catGroups[cat].products[prod].push(e);
  });
  const catKeys=Object.keys(catGroups).sort();

  // Compute P&L data for a group of employees
  function computePnl(empList){
    let comp=0,capex=0;
    empList.forEach(e=>{for(let mi=0;mi<12;mi++){comp+=getMonthlyComp(e,mi);capex+=getMonthlyCapEx(e,mi)}});
    return {hc:empList.length,cbOpex:comp-capex,capex};
  }

  // Compute per-category and per-product P&L data
  const catData={};
  const prodData={};
  const totals={hc:0,cbOpex:0,oao:0,adjEbitda:0,da:0,totalOpex:0,capex:0,totInv:0};
  catKeys.forEach(cat=>{
    catData[cat]=computePnl(catGroups[cat].emps);
    totals.hc+=catData[cat].hc;totals.cbOpex+=catData[cat].cbOpex;totals.capex+=catData[cat].capex;
    prodData[cat]={};
    Object.keys(catGroups[cat].products).sort().forEach(prod=>{
      prodData[cat][prod]=computePnl(catGroups[cat].products[prod]);
    });
  });

  // Distribute vendor/T&E/contractor OAO across categories/products proportionally by HC
  // Note: contractor CapEx is NOT included in the comp plan P&L — only in landing page summaries
  const oaoTotal=getVendorOaoTotal();
  const daTotal=getDepreciationTotal();
  const revenueTotal=getRevenueTotal();
  const revenueEnabled=localStorage.getItem('compPlanRevenue')!=='0';
  const isRevMode=revenueEnabled&&(state.landingPnlMode||'cost')==='revenue';
  function enrichWithOao(d,totalHc){
    const share=totalHc>0?d.hc/totalHc:0;
    d.oao=Math.round(oaoTotal*share);
    d.adjEbitda=d.cbOpex+d.oao;
    d.da=Math.round(daTotal*share);
    d.totalOpex=d.adjEbitda+d.da;
    d.totInv=d.totalOpex+d.capex;
    if(isRevMode){
      d.revenue=Math.round(revenueTotal*share);
      // In revenue mode: revenue positive, costs negative = profitability
      d.cbOpex=-Math.abs(d.cbOpex);
      d.oao=-Math.abs(d.oao);
      d.adjEbitda=d.revenue+d.cbOpex+d.oao;
      d.da=-Math.abs(d.da);
      d.totalOpex=d.adjEbitda+d.da;
      d.capex=-Math.abs(d.capex);
      d.totInv=d.totalOpex+d.capex;
    }
  }
  catKeys.forEach(cat=>{
    enrichWithOao(catData[cat],totals.hc);
    Object.keys(prodData[cat]).forEach(prod=>enrichWithOao(prodData[cat][prod],totals.hc));
  });
  if(isRevMode){
    totals.revenue=revenueTotal;
    totals.cbOpex=-Math.abs(totals.cbOpex);
    totals.oao=-Math.abs(oaoTotal);
    totals.adjEbitda=revenueTotal+totals.cbOpex+totals.oao;
    totals.da=-Math.abs(daTotal);
    totals.totalOpex=totals.adjEbitda+totals.da;
    totals.capex=-Math.abs(totals.capex);
    totals.totInv=totals.totalOpex+totals.capex;
  } else {
    totals.oao=oaoTotal;totals.adjEbitda=totals.cbOpex+oaoTotal;totals.da=daTotal;
    totals.totalOpex=totals.adjEbitda+totals.da;totals.totInv=totals.totalOpex+totals.capex;
  }

  // Columns = P&L line items
  const cols=[];
  if(isRevMode)cols.push({key:'revenue',label:'Revenue',isCurrency:true,cls:'revenue'});
  cols.push(
    {key:'hc',label:'HC',isCurrency:false},
    {key:'cbOpex',label:'C&B',isCurrency:true},
    {key:'oao',label:'OAO',isCurrency:true},
    {key:'adjEbitda',label:isRevMode?'Gross Margin':'Adj EBITDA',isCurrency:true,cls:'subtotal'},
    {key:'da',label:'D&A',isCurrency:true},
    {key:'totalOpex',label:isRevMode?'EBITDA':'OpEx',isCurrency:true,cls:'subtotal'},
    {key:'capex',label:'CapEx',isCurrency:true},
    {key:'totInv',label:isRevMode?'Net Income':'Tot Inv',isCurrency:true,cls:'total'}
  );

  function fmtCell(c,v){
    const style=c.cls==='subtotal'?'font-weight:700;color:var(--accent)':c.cls==='total'?'font-weight:700':'';
    return `<td class="num" style="${style}">${c.isCurrency?fmt(v):v}</td>`;
  }

  let h='<thead><tr><th style="position:sticky;left:0;z-index:2;background:var(--panel-inset);white-space:nowrap">Product Category</th>';
  cols.forEach(c=>{const wrap=c.label.length>12?'white-space:normal;max-width:70px':'white-space:nowrap';h+=`<th style="text-align:right;${wrap}">${c.label}</th>`});
  h+='</tr></thead><tbody>';

  catKeys.forEach(cat=>{
    const d=catData[cat];
    const prodKeys=Object.keys(catGroups[cat].products).sort();
    const hasProducts=prodKeys.length>1||(prodKeys.length===1&&prodKeys[0]!==cat);
    const expanded=pnlExpandedCats.has(cat);
    const arrow=hasProducts?(expanded?'▼':'▶'):'';
    const arrowStyle=hasProducts?'cursor:pointer;user-select:none':'';
    h+=`<tr class="pnl-cat-row" data-cat="${esc(cat)}"><td style="font-weight:600;white-space:nowrap;position:sticky;left:0;background:var(--panel);z-index:1;${arrowStyle}"><span class="pnl-cat-arrow" style="font-size:.65rem;margin-right:4px;display:inline-block;width:10px;color:var(--text-dim)">${arrow}</span>${esc(cat)}</td>`;
    cols.forEach(c=>h+=fmtCell(c,d[c.key]));
    h+='</tr>';
    // Product sub-rows (shown when expanded)
    if(hasProducts&&expanded){
      prodKeys.forEach(prod=>{
        const pd=prodData[cat][prod];
        h+=`<tr class="pnl-prod-row" style="background:var(--panel-inset)"><td style="padding-left:28px;white-space:nowrap;position:sticky;left:0;background:var(--panel-inset);z-index:1;font-size:.78rem;color:var(--text-dim)">${esc(prod)}</td>`;
        cols.forEach(c=>h+=`<td class="num" style="font-size:.78rem;color:var(--text-dim);${c.cls==='subtotal'?'font-weight:600;color:var(--accent)':c.cls==='total'?'font-weight:600':''}">${c.isCurrency?fmt(pd[c.key]):pd[c.key]}</td>`);
        h+='</tr>';
      });
    }
  });

  // Total row
  h+=`<tr class="total"><td style="position:sticky;left:0;background:var(--panel);z-index:1"><span style="display:inline-block;width:10px;margin-right:4px"></span>Total</td>`;
  cols.forEach(c=>h+=`<td class="num">${c.isCurrency?fmt(totals[c.key]):totals[c.key]}</td>`);
  h+='</tr></tbody>';
  tbl.innerHTML=h;
  tbl.classList.remove('compact');

  // Bind expand/collapse clicks on category rows
  tbl.querySelectorAll('.pnl-cat-row').forEach(tr=>{
    tr.addEventListener('click',()=>{
      const cat=tr.dataset.cat;
      const prodKeys=Object.keys(catGroups[cat]?.products||{});
      const hasProducts=prodKeys.length>1||(prodKeys.length===1&&prodKeys[0]!==cat);
      if(!hasProducts)return;
      if(pnlExpandedCats.has(cat))pnlExpandedCats.delete(cat);else pnlExpandedCats.add(cat);
      renderPnlWalk();
    });
  });
}

let landingBudgetChartInst=null,landingForecastChartInst=null,landingChartView='pnl';

document.querySelectorAll('#landingChartViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#landingChartViewToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');landingChartView=b.dataset.lcview;renderLandingCharts();
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
  const fmtTick=v=>{const a=Math.abs(v);return(v<0?'-':'')+'$'+(a>=1e6?(a/1e6).toFixed(1)+'M':(a/1000).toFixed(0)+'K')};

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
      const opex=MO_SHORT.map((_,mi)=>{const c=emps.reduce((s,e)=>s+getMonthlyComp(e,mi),0);const cx=emps.reduce((s,e)=>s+getMonthlyCapEx(e,mi),0);return c-cx});
      const capex=MO_SHORT.map((_,mi)=>-(emps.reduce((s,e)=>s+getMonthlyCapEx(e,mi),0)+getContractorCapExByMonth(mi)));
      budgetDS.push({label:'OpEx',data:opex,backgroundColor:lcc[4],stack:'pos'});
      budgetDS.push({label:'CapEx',data:capex,backgroundColor:lcc[0],stack:'neg'});
    } else {
      const data=MO_SHORT.map((_,mi)=>emps.reduce((s,e)=>s+getMonthlyComp(e,mi),0));
      budgetDS.push({label:'Total Comp',data,backgroundColor:lcc[0]});
    }
  }
  // Data labels for top of each stacked bar
  const budgetDL=useSplit||isPnl?{}:{display:true,anchor:'end',align:'end',color:window.getCrispDatalabelColor('landing')||tickColor,font:{size:window.chartColorScheme==='crisp'?10:8,weight:'bold'},formatter:v=>v>=1000?'$'+(v/1000).toFixed(0)+'K':v>0?'$'+Math.round(v):''};
  if(useSplit||isPnl){window.stackedBarDatalabels(budgetDS,tickColor,8,'landing');budgetDS.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}})}
  landingBudgetChartInst=new Chart(document.getElementById('landingBudgetChart'),{
    type:'bar',data:{labels:MO_SHORT,datasets:budgetDS},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},plugins:{legend:{display:isPnl||useSplit,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:11},filter:item=>!item.text.includes('(CapEx)')}},datalabels:useSplit||isPnl?{}:budgetDL},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:9,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:9,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}}
  });

  // ── Long-Term Forecast Chart ──
  // Include vendor/T&E/contractor costs so LTF matches the PnL table's Tot Inv
  const _oaoTotal=getVendorOaoTotal();
  const _cCapEx=getContractorCapExTotal();
  function _enrichFcRows(rows){
    rows.forEach((r,i)=>{
      // Current year: add actual OAO + contractor CapEx; future years: carry OAO flat
      r.total+=_oaoTotal+_cCapEx;
      r.capex+=_cCapEx;
      r.opex+=_oaoTotal;
    });
    return rows;
  }
  if(landingForecastChartInst)landingForecastChartInst.destroy();
  let fcDS=[];
  const yearLabels=getDisplayFcLabels();
  try{
  if(useSplit){
    const groups={};
    emps.forEach(e=>{const key=getPnlSplitKey(e,split);if(key!=null){if(!groups[key])groups[key]=[];groups[key].push(e)}});
    const gNames=Object.keys(groups).sort();
    const _splitOaoShare=gNames.length>0?1/gNames.length:1;
    gNames.forEach((g,gi)=>{
      try{
      const rows=projectForecast(groups[g],g);
      // Distribute OAO proportionally across split groups
      rows.forEach(r=>{
        r.total+=Math.round((_oaoTotal+_cCapEx)*_splitOaoShare);
        r.capex+=Math.round(_cCapEx*_splitOaoShare);
        r.opex+=Math.round(_oaoTotal*_splitOaoShare);
      });
      if(isPnl){
        fcDS.push({label:g.length>18?g.slice(0,16)+'…':g,data:rows.map(r=>r.opex),backgroundColor:getChartColors()[gi%getChartColors().length],stack:'pos'});
        if(rows.some(r=>r.capex>0))fcDS.push({label:g+' (CapEx)',data:rows.map(r=>-r.capex),backgroundColor:hexToRgba(getChartColors()[gi%getChartColors().length],0.35),stack:'neg'});
      } else {
        fcDS.push({label:g.length>18?g.slice(0,16)+'…':g,data:rows.map(r=>r.total),backgroundColor:getChartColors()[gi%getChartColors().length]});
      }
      }catch(e){console.warn('Forecast group error for '+g+':',e)}
    });
  } else {
    const rows=_enrichFcRows(projectForecast(emps));
    const lfc=getChartColors();
    if(isPnl){
      fcDS.push({label:'OpEx',data:rows.map(r=>r.opex),backgroundColor:lfc[4],stack:'pos'});
      fcDS.push({label:'CapEx',data:rows.map(r=>-r.capex),backgroundColor:lfc[0],stack:'neg'});
    } else {
      fcDS.push({label:'Total Investment',data:rows.map(r=>r.total),backgroundColor:lfc[0]});
    }
  }
  }catch(e){console.warn('Landing forecast chart error:',e)}
  if(useSplit||isPnl){window.stackedBarDatalabels(fcDS,tickColor,8,'landing');fcDS.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}})}
  else{const _ldlC=window.getCrispDatalabelColor('landing')||tickColor;fcDS.forEach(ds=>{ds.datalabels={display:true,anchor:'end',align:'end',color:_ldlC,font:{size:window.chartColorScheme==='crisp'?10:8,weight:'bold'},formatter:v=>{const a=Math.abs(v);return a>=1e6?'$'+(v/1e6).toFixed(1)+'M':a>=1000?(v<0?'-':'')+'$'+(a/1000).toFixed(0)+'K':''}}})};
  landingForecastChartInst=new Chart(document.getElementById('landingForecastChart'),{
    type:'bar',data:{labels:yearLabels,datasets:fcDS},
    plugins:[window.yoyArrowsPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:11},filter:item=>!item.text.includes('(CapEx)')}},datalabels:{},yoyArrows:{}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:9,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:9,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}}
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

// Per-account Y/Y bubbles plugin — shows C&B / OAO / D&A growth in differently shaded pills
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
    // Find first visible dataset for bar x-positions
    let visIdx=0;
    for(let di=0;di<chart.data.datasets.length;di++){if(!chart.getDatasetMeta(di).hidden){visIdx=di;break}}
    const meta0=chart.getDatasetMeta(visIdx);
    const yScale=chart.scales.y;
    const chartW=area.right-area.left;
    const fontSize=Math.max(7,Math.min(10,chartW/(nLabels*8)));
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
      // Draw per-account bubbles stacked vertically
      const midY=(y1+y2)/2;
      const pillH=fontSize+4;
      const totalH=acctData.length*pillH+((acctData.length-1)*2);
      let pillY=midY-totalH/2;
      ctx.font=`600 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      acctData.forEach(acct=>{
        const prev=acct.data[i]||0,cur=acct.data[i+1]||0;
        if(!prev){pillY+=pillH+2;return}
        const pct=((cur-prev)/Math.abs(prev))*100;
        const pctStr=acct.label+' '+(pct>=0?'+':'')+pct.toFixed(1)+'%';
        const tw=ctx.measureText(pctStr).width;
        const pad=3;
        // Use account color with transparency for background
        const baseColor=acct.color||'#888';
        const bgAlpha=isDark?0.45:0.15;
        const textAlpha=isDark?0.9:0.85;
        ctx.fillStyle=hexToRgba(baseColor,bgAlpha);
        const rx=midX-tw/2-pad,ry=pillY-1,rw=tw+pad*2,rh=pillH;
        ctx.beginPath();
        ctx.roundRect?ctx.roundRect(rx,ry,rw,rh,3):ctx.rect(rx,ry,rw,rh);
        ctx.fill();
        ctx.fillStyle=hexToRgba(baseColor,textAlpha);
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(pctStr,midX,pillY+pillH/2-1);
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
  // Table toggle
  const tblToggle=document.getElementById('ltfTableToggle');
  const tblWrap=document.getElementById('ltfTableWrap');
  if(tblToggle)tblToggle.addEventListener('click',()=>{
    const show=tblWrap.style.display==='none';
    tblWrap.style.display=show?'':'none';
    tblToggle.innerHTML=(show?'&#9660;':'&#9654;')+' '+(show?'Hide':'Show')+' Details';
  });
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
  const fmtTick=v=>{const a=Math.abs(v);return(v<0?'-':'')+'$'+(a>=1e6?(a/1e6).toFixed(1)+'M':(a/1000).toFixed(0)+'K')};
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

  // Account data for per-account Y/Y bubbles
  const acctColors={cb:lcc[0],oao:lcc[1],da:lcc[2]};

  let datasets=[];
  let acctData=[];

  if(splitGroups && ltfSplit!=='comp'){
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
      acctData=[
        {label:'C&B',data:cbOpex,color:acctColors.cb},
        {label:'OAO',data:oaoYears,color:acctColors.oao},
        {label:'D&A',data:daYears,color:acctColors.da}
      ];
    } else {
      datasets=[
        {label:'C&B',data:cbGross.slice(),backgroundColor:lcc[0],stack:'s0'},
        {label:'OAO',data:oaoYears.slice(),backgroundColor:lcc[1],stack:'s0'}
      ];
      acctData=[
        {label:'C&B',data:cbGross,color:acctColors.cb},
        {label:'OAO',data:oaoYears,color:acctColors.oao}
      ];
    }
  }

  window.stackedBarDatalabels(datasets,tickColor,8,'ltf');
  if(isPnl)datasets.filter(d=>d.stack==='neg').forEach(d=>{d.datalabels={display:false}});

  ltfChartInst=new Chart(canvas,{
    type:'bar',data:{labels:yearLabels,datasets},
    plugins:[ltfYoyPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:12,font:{size:11},filter:item=>!item.text.includes('CapEx')}},datalabels:{},ltfYoy:{accountData:acctData}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:10,weight:'bold'}},grid:{display:false}},y:{stacked:true,ticks:{color:tickColor,font:{size:9,weight:'bold'},callback:fmtTick},grid:{color:gridColor}}}
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
        plugins:{legend:{display:fteDatasets.length>1,labels:{color:tickColor,boxWidth:14,font:{size:11}}},datalabels:{},tooltip:window.FTE_TOOLTIP||{}},
        scales:{
          x:{ticks:{color:tickColor,font:{size:10}},grid:{display:false},stacked:true},
          y:{beginAtZero:true,stacked:true,ticks:{color:tickColor,font:{size:10}},grid:{color:gridColor},title:{display:true,text:'Projected FTEs',color:tickColor,font:{size:10}}}
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
function deepClone(obj){
  if(obj===null||typeof obj!=='object')return obj;
  if(typeof obj==='function')return obj;
  if(Array.isArray(obj))return obj.map(deepClone);
  var out={};for(var k in obj){if(obj.hasOwnProperty(k))out[k]=typeof obj[k]==='function'?obj[k]:deepClone(obj[k])}
  return out;
}
function cloneChartCfg(inst,canvasId){
  var cfg=inst.config;
  return{type:cfg.type,data:deepClone(cfg.data),plugins:(cfg.plugins||[]).slice(),options:deepClone(cfg.options)};
}
function renderExpandedCharts(){
  if(typeof Chart==='undefined')return;
  var pane=document.getElementById('chartExpandPane');
  if(!pane||!pane.classList.contains('open'))return;
  if(expandBudgetInst)expandBudgetInst.destroy();
  if(landingBudgetChartInst)expandBudgetInst=new Chart(document.getElementById('expandBudgetChart'),cloneChartCfg(landingBudgetChartInst));
  if(expandForecastInst)expandForecastInst.destroy();
  if(landingForecastChartInst)expandForecastInst=new Chart(document.getElementById('expandForecastChart'),cloneChartCfg(landingForecastChartInst));
  if(expandRevenueInst)expandRevenueInst.destroy();
  if(landingRevenueChartInst)expandRevenueInst=new Chart(document.getElementById('expandRevenueChart'),cloneChartCfg(landingRevenueChartInst));
  if(expandRevFcInst)expandRevFcInst.destroy();
  if(landingRevFcChartInst)expandRevFcInst=new Chart(document.getElementById('expandRevFcChart'),cloneChartCfg(landingRevFcChartInst));
}
function openChartExpandPane(targetId){
  const pane=document.getElementById('chartExpandPane');
  pane.classList.add('open');
  renderExpandedCharts();
  setTimeout(function(){
    const el=document.getElementById(targetId);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },350);
}
function closeChartExpandPane(){
  const pane=document.getElementById('chartExpandPane');
  pane.classList.remove('open');
  if(expandBudgetInst){expandBudgetInst.destroy();expandBudgetInst=null}
  if(expandForecastInst){expandForecastInst.destroy();expandForecastInst=null}
  if(expandRevenueInst){expandRevenueInst.destroy();expandRevenueInst=null}
  if(expandRevFcInst){expandRevFcInst.destroy();expandRevFcInst=null}
}
document.getElementById('chartExpandClose').addEventListener('click',closeChartExpandPane);
document.querySelectorAll('.chart-expand-btn').forEach(function(btn){
  btn.addEventListener('click',function(){openChartExpandPane(this.dataset.expandTarget)});
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
window.showLanding = showLanding;
window.showApp = showApp;
window.showVendor = showVendor;
window.showDepreciation = showDepreciation;
window.showRevenue = showRevenue;
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
