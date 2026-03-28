// ── LONG TERM FORECAST ── ES Module
// Extracted from index.html lines 6824–7539

import { state, saveState, getBonusAmt, getBenefitsAmt } from '../lib/state.js';
import {
  FUNCTIONS, COUNTRIES, FORECAST_YEARS, CURRENT_YEAR,
  DISPLAY_BASE_YEAR,
  getDisplayYears, getDisplayFcLabels, displayYear, fmt
} from '../lib/constants.js';
import {
  getProratedBase, getProratedBonus, getProratedBenefits, getProratedCapEx, getProratedComp
} from '../lib/proration.js';

let forecastChart=null;
let forecastSplit='total';
let forecastView='total';
document.querySelectorAll('#forecastSplitToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#forecastSplitToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');forecastSplit=b.dataset.split;renderForecastProjection();
}));
document.querySelectorAll('#forecastViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#forecastViewToggle .btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');forecastView=b.dataset.fview;renderForecastProjection();
}));
function getExpandGroups(expandBy){
  if(expandBy==='project'){
    const groups=state.projects.map(p=>({key:p.id,label:p.code}));
    return groups;
  } else if(expandBy==='function'){
    return FUNCTIONS.filter(f=>state.employees.some(e=>e.function===f)).map(f=>({key:f,label:f.length>20?f.slice(0,18)+'\u2026':f}));
  } else if(expandBy==='country'){
    return COUNTRIES.filter(c=>state.employees.some(e=>e.country===c)).map(c=>({key:c,label:c}));
  }
  return [];
}
function getOverrideVal(key,groupKey,idx){
  const ov=state.forecastAssumptions.overrides;
  if(ov[key]&&ov[key][groupKey])return ov[key][groupKey][idx];
  return state.forecastAssumptions[key][idx];
}
function setOverrideVal(key,groupKey,idx,val){
  const ov=state.forecastAssumptions.overrides;
  if(!ov[key])ov[key]={};
  if(!ov[key][groupKey])ov[key][groupKey]=[...state.forecastAssumptions[key]];
  ov[key][groupKey][idx]=val;
  saveState();renderForecastProjection();
}
function onExpandChange(key,val){
  state.forecastAssumptions.expandBy[key]=val;
  saveState();renderForecastInputs();renderForecastProjection();
}
function onModeChange(key,val){
  if(!state.forecastAssumptions.modes)state.forecastAssumptions.modes={};
  state.forecastAssumptions.modes[key]=val;
  saveState();renderForecastInputs();renderForecastProjection();
}
function getForecastMode(key){
  return state.forecastAssumptions.modes&&state.forecastAssumptions.modes[key]?state.forecastAssumptions.modes[key]:(key==='attrition'?'pct':'num');
}
function getEffectiveHC(key,val,baseHC){
  const mode=getForecastMode(key);
  if(key==='attrition'){
    return mode==='pct'?Math.round(baseHC*val/100):val;
  }
  if(key==='hires'){
    return mode==='pct'?Math.round(baseHC*val/100):val;
  }
  return val;
}
function renderForecastInputs(){
  const fa=state.forecastAssumptions;
  if(!fa.expandBy)fa.expandBy={attrition:'total',hires:'total',merit:'total',market:'total',ai:'total',capitalization:'total'};
  if(!fa.overrides)fa.overrides={};
  if(!fa.modes)fa.modes={};
  // Compute current HC for effective # display
  const activeEmps=state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR);
  const baseHC=activeEmps.length;
  ['attrition','hires','merit','market','ai','capitalization'].forEach(key=>{
    const container=document.getElementById(key+'Inputs');
    const mode=(key==='attrition'||key==='hires')?getForecastMode(key):null;
    let suffix;
    if(key==='attrition')suffix=mode==='pct'?'%':'';
    else if(key==='hires')suffix=mode==='pct'?'%':'';
    else if(key==='ai')suffix='x';
    else suffix='%';
    const step=key==='ai'?'0.01':'1';
    const expandBy=fa.expandBy[key]||'total';
    // Set expand dropdown
    const expandIdMap={attrition:'Attrition',hires:'Hires',merit:'Merit',market:'Market',ai:'AI',capitalization:'Capitalization'};
    const expandEl=document.getElementById('expand'+expandIdMap[key]);
    if(expandEl)expandEl.value=expandBy;
    // Set mode dropdown
    const modeEl=document.getElementById(key+'Mode');
    if(modeEl)modeEl.value=mode||'num';

    const effectiveNote=(k,val)=>{
      if((k==='attrition'||k==='hires')&&getForecastMode(k)==='pct'){
        const eff=Math.round(baseHC*val/100);
        return `<span style="display:block;font-size:.72rem;color:var(--text-dim);text-align:right;margin-top:1px">${eff} people</span>`;
      }
      if((k==='attrition'||k==='hires')&&getForecastMode(k)==='num'){
        const pctEff=baseHC?((val/baseHC)*100).toFixed(1):'0';
        return `<span style="display:block;font-size:.72rem;color:var(--text-dim);text-align:right;margin-top:1px">${pctEff}%</span>`;
      }
      return '';
    };

    const dYears=getDisplayYears();
    if(expandBy==='total'){
      container.innerHTML='<div class="forecast-grid">'+FORECAST_YEARS.map((y,i)=>`
        <div class="forecast-input-group">
          <label>${dYears[i]}</label>
          <input type="number" step="${step}" value="${fa[key][i]}" data-key="${key}" data-idx="${i}" class="forecast-param">${suffix}${effectiveNote(key,fa[key][i])}
        </div>
      `).join('')+'</div>';
    } else {
      const groups=getExpandGroups(expandBy);
      let html='<div class="forecast-grid" style="margin-bottom:8px"><div class="forecast-input-group" style="grid-column:1/-1"><span class="group-label" style="font-size:.78rem;color:var(--text-dim);font-style:italic">Default (all groups)</span></div></div>';
      html+='<div class="forecast-grid" style="margin-bottom:12px">'+FORECAST_YEARS.map((y,i)=>`
        <div class="forecast-input-group">
          <label>${dYears[i]}</label>
          <input type="number" step="${step}" value="${fa[key][i]}" data-key="${key}" data-idx="${i}" class="forecast-param">${suffix}${effectiveNote(key,fa[key][i])}
        </div>
      `).join('')+'</div>';
      groups.forEach(g=>{
        html+=`<div class="forecast-group-row"><div class="group-label">${g.label}</div><div class="forecast-grid">`;
        html+=FORECAST_YEARS.map((y,i)=>{
          const val=getOverrideVal(key,g.key,i);
          return `<div class="forecast-input-group">
            <label>${dYears[i]}</label>
            <input type="number" step="${step}" value="${val}" data-key="${key}" data-group="${g.key}" data-idx="${i}" class="forecast-override">${suffix}${effectiveNote(key,val)}
          </div>`;
        }).join('');
        html+='</div></div>';
      });
      container.innerHTML=html;
    }
  });
  document.querySelectorAll('.forecast-param').forEach(inp=>inp.addEventListener('change',()=>{
    state.forecastAssumptions[inp.dataset.key][parseInt(inp.dataset.idx)]=parseFloat(inp.value)||0;
    saveState();renderForecastProjection();
  }));
  document.querySelectorAll('.forecast-override').forEach(inp=>inp.addEventListener('change',()=>{
    setOverrideVal(inp.dataset.key,inp.dataset.group,parseInt(inp.dataset.idx),parseFloat(inp.value)||0);
  }));
  // OAO growth inputs in modal
  const oaoContainer=document.getElementById('oaoGrowthInputs');
  if(oaoContainer){
    const dYears=getDisplayYears();
    oaoContainer.innerHTML='<div class="forecast-grid">'+FORECAST_YEARS.map((y,i)=>`
      <div class="forecast-input-group">
        <label>${dYears[i]}</label>
        <input type="number" step="1" value="${state.oaoGrowthPct[i]}" data-idx="${i}" class="oao-growth-param">%
      </div>
    `).join('')+'</div>';
    oaoContainer.querySelectorAll('.oao-growth-param').forEach(inp=>inp.addEventListener('change',()=>{
      state.oaoGrowthPct[parseInt(inp.dataset.idx)]=parseFloat(inp.value)||0;
      saveState();renderForecastFactorPills();if(window.renderLtfChart)window.renderLtfChart();
    }));
  }
  // D&A asset life input in modal
  const daLifeInp=document.getElementById('daLifeInput');
  if(daLifeInp){
    daLifeInp.value=state.daAssetLifeYrs||5;
    daLifeInp.addEventListener('change',()=>{
      state.daAssetLifeYrs=Math.max(1,parseInt(daLifeInp.value)||5);
      saveState();renderForecastFactorPills();if(window.renderLtfChart)window.renderLtfChart();
    });
  }
  ['Attrition','Hires','Merit','Market','AI','Capitalization'].forEach(label=>{
    const key=label.toLowerCase();
    const tog=document.getElementById('tog'+label);
    tog.checked=fa.toggles[key]!==false;
    tog.addEventListener('change',()=>{
      state.forecastAssumptions.toggles[key]=tog.checked;
      saveState();renderForecastProjection();
    });
  });
}
function getAssumptionVal(key,groupKey,idx){
  const fa=state.forecastAssumptions;
  if(groupKey&&fa.overrides&&fa.overrides[key]&&fa.overrides[key][groupKey]){
    return fa.overrides[key][groupKey][idx];
  }
  return fa[key][idx];
}
export function projectForecast(emps,groupKey){
  const fa=state.forecastAssumptions;
  const tog=fa.toggles;
  const attrMode=getForecastMode('attrition');
  const hiresMode=getForecastMode('hires');
  // Exclude employees already terminated before current year
  const activeEmps=emps.filter(e=>{
    if(!e.termDate)return true;
    return new Date(e.termDate).getFullYear()>=CURRENT_YEAR;
  });
  // Identify GEN-000 (unallocated) employees — they should not drive HC dynamics
  const genProj=state.projects.find(p=>p.code==='GEN-000');
  const genId=genProj?genProj.id:null;
  const isGenGroup=groupKey&&genId&&groupKey===genId;
  function isFullyUnallocated(e){
    if(!genId)return false;
    // Employees with empty allocations or only GEN-000 allocations are unallocated
    if(!e.allocations||!e.allocations.length)return true;
    return e.allocations.every(a=>a.projId===genId);
  }
  // In total view (no groupKey), separate unallocated employees so they don't inflate
  // attrition or consume hires — their costs still grow with merit/market but HC is stable.
  // For GEN-000 split group, same treatment: costs project forward, no attrition/hires.
  const excludeUnalloc=!groupKey||isGenGroup;
  let dynamicActive=excludeUnalloc?activeEmps.filter(e=>!isFullyUnallocated(e)):activeEmps;
  let staticActive=excludeUnalloc?activeEmps.filter(e=>isFullyUnallocated(e)):[];
  // If ALL employees are unallocated, treat them all as dynamic so the forecast isn't frozen
  if(excludeUnalloc&&dynamicActive.length===0&&staticActive.length>0){
    dynamicActive=staticActive;staticActive=[];
  }
  // Current year uses prorated values (all employees)
  const currentHC=activeEmps.length;
  const currentBase=activeEmps.reduce((a,e)=>a+getProratedBase(e),0);
  const currentBonus=activeEmps.reduce((a,e)=>a+getProratedBonus(e),0);
  const currentBenefits=activeEmps.reduce((a,e)=>a+getProratedBenefits(e),0);
  const currentTotal=currentBase+currentBonus+currentBenefits;
  const currentCapEx=activeEmps.reduce((a,e)=>a+getProratedCapEx(e),0);
  // For projecting forward, use full annual rates of active employees (those not terminated in current year)
  let forwardEmps=dynamicActive.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR);
  let staticForward=staticActive.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR);
  // If ALL forward pools are empty but we have current HC, fall back to using all active
  // employees as forward basis — prevents forecast cliff from current year to $0
  if(forwardEmps.length===0&&staticForward.length===0&&activeEmps.length>0){
    forwardEmps=dynamicActive.length?dynamicActive:activeEmps;
    staticForward=dynamicActive.length?staticActive:[];
  }
  const forwardHC=forwardEmps.length;
  const staticHC=staticForward.length;
  const forwardBase=forwardEmps.reduce((a,e)=>a+e.salary,0);
  const forwardBonus=forwardEmps.reduce((a,e)=>a+getBonusAmt(e),0);
  const staticBase=staticForward.reduce((a,e)=>a+e.salary,0);
  const staticBonusRate=staticHC&&staticBase?staticForward.reduce((a,e)=>a+getBonusAmt(e),0)/staticBase:0;
  const staticBenRate=staticHC&&staticBase?staticForward.reduce((a,e)=>a+getBenefitsAmt(e),0)/staticBase:0;
  const staticCapRate=staticHC?staticForward.reduce((a,e)=>a+getProratedCapEx(e),0)/Math.max(staticForward.reduce((a,e)=>a+getProratedComp(e),0),1):0;
  const avgSalary=forwardHC?forwardBase/forwardHC:100000;
  const avgBonusRate=forwardHC&&forwardBase?forwardBonus/forwardBase:0.1;
  const avgBenRate=forwardHC&&forwardBase?forwardEmps.reduce((a,e)=>a+getBenefitsAmt(e),0)/forwardBase:0.2;
  // Current year cap rate from actual employee data
  const currentCapRate=currentTotal?currentCapEx/currentTotal:0;
  const rows=[{year:'Current',hc:currentHC,total:currentTotal,capex:currentCapEx,opex:currentTotal-currentCapEx}];
  const allEmpsCount=Math.max(state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR).length,1);
  const groupRatio=groupKey?forwardHC/allEmpsCount:1;
  let hc=forwardHC;let salaryGrowth=1;
  FORECAST_YEARS.forEach((y,i)=>{
    const meritRate=tog.merit?getAssumptionVal('merit',groupKey,i)/100:0;
    const marketRate=tog.market?getAssumptionVal('market',groupKey,i)/100:0;
    const capRate=tog.capitalization?getAssumptionVal('capitalization',groupKey,i)/100:currentCapRate;
    const attrVal=tog.attrition?getAssumptionVal('attrition',groupKey,i):0;
    const attrLoss=attrMode==='pct'?Math.round(hc*attrVal/100):Math.round(attrVal*groupRatio);
    const hiresVal=tog.hires?getAssumptionVal('hires',groupKey,i):0;
    const rawHires=hiresMode==='pct'?Math.round(hc*hiresVal/100):Math.round(hiresVal*groupRatio);
    const aiGear=tog.ai?getAssumptionVal('ai',groupKey,i):1;
    hc=Math.max(0,hc-attrLoss+Math.round(rawHires*aiGear));
    salaryGrowth*=(1+meritRate+marketRate);
    const dynBase=Math.round(hc*avgSalary*salaryGrowth);
    const dynTotal=Math.round(dynBase*(1+avgBonusRate+avgBenRate));
    // Static (unallocated) employees: costs grow with merit/market but HC is frozen
    const stBase=Math.round(staticHC*((staticHC?staticBase/staticHC:0))*salaryGrowth);
    const stTotal=Math.round(stBase*(1+staticBonusRate+staticBenRate));
    const totalHC=hc+staticHC;
    const total=dynTotal+stTotal;
    const stCapex=Math.round(stTotal*(tog.capitalization?capRate:staticCapRate));
    const capex=Math.round(dynTotal*capRate)+stCapex;
    rows.push({year:y,hc:totalHC,total,capex,opex:total-capex});
  });
  return rows;
}
function renderForecastMethodology(){
  const panel=document.getElementById('forecastMethodPanel');
  if(!panel||panel.style.display==='none')return;
  const fa=state.forecastAssumptions;
  const tog=fa.toggles;
  const emps=state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR);
  const forwardEmps=emps.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR);
  const fHC=forwardEmps.length;
  const fBase=forwardEmps.reduce((a,e)=>a+e.salary,0);
  const fBonus=forwardEmps.reduce((a,e)=>a+getBonusAmt(e),0);
  const fBen=forwardEmps.reduce((a,e)=>a+getBenefitsAmt(e),0);
  const fTotal=emps.reduce((a,e)=>a+getProratedBase(e)+getProratedBonus(e)+getProratedBenefits(e),0);
  const fCapEx=emps.reduce((a,e)=>a+getProratedCapEx(e),0);
  const avgSal=fHC?fBase/fHC:100000;
  const bonusRate=fHC&&fBase?fBonus/fBase:0.1;
  const benRate=fHC&&fBase?fBen/fBase:0.2;
  const capRate=fTotal?fCapEx/fTotal:0;
  const _fmt=v=>'$'+Math.round(v).toLocaleString();
  const pct=v=>(v*100).toFixed(1)+'%';
  const attrMode=getForecastMode('attrition');
  const hiresMode=getForecastMode('hires');

  // Baseline section
  document.getElementById('methodBaselineSection').innerHTML=`
    <h5>Baseline (Derived from Current Roster)</h5>
    <div class="method-baseline">
      <div class="mb-item"><div class="mb-label">Forward HC</div><div class="mb-val">${fHC}</div></div>
      <div class="mb-item"><div class="mb-label">Avg Salary</div><div class="mb-val">${_fmt(avgSal)}</div></div>
      <div class="mb-item"><div class="mb-label">Bonus Rate</div><div class="mb-val">${pct(bonusRate)}</div></div>
      <div class="mb-item"><div class="mb-label">Benefits Rate</div><div class="mb-val">${pct(benRate)}</div></div>
      <div class="mb-item"><div class="mb-label">Current Cap Rate</div><div class="mb-val">${pct(capRate)}</div></div>
      <div class="mb-item"><div class="mb-label">Current Total</div><div class="mb-val">${_fmt(fTotal)}</div></div>
    </div>`;

  // Steps section
  const steps=[
    {key:'attrition',num:1,title:'Attrition Loss',
      formula:attrMode==='pct'?'attrLoss = HC \u00d7 attrition%':'attrLoss = attrition # \u00d7 groupRatio',
      note:'Removes employees from HC pool each year based on turnover rate'},
    {key:'hires',num:2,title:'New Hires (with AI Gearing)',
      formula:hiresMode==='pct'?'netHires = round(HC \u00d7 hires% \u00d7 aiGear)':'netHires = round(hires# \u00d7 groupRatio \u00d7 aiGear)',
      note:'AI gearing reduces required hires (e.g. 0.8 = 20% fewer needed)'},
    {key:null,num:3,title:'Headcount Update',
      formula:'HC = max(0, HC \u2212 attrLoss + netHires)',
      note:'Net headcount after attrition and hiring',always:true},
    {key:'merit',num:4,title:'Merit + Market Growth',
      formula:'salaryGrowth \u00d7= (1 + merit% + market%)',
      note:'Compounds year-over-year on top of average salary'},
    {key:null,num:5,title:'Compensation Calculation',
      formula:'base = HC \u00d7 avgSalary \u00d7 salaryGrowth\ntotal = base \u00d7 (1 + bonusRate + benRate)',
      note:'Applies blended bonus & benefits rates from current roster',always:true},
    {key:'capitalization',num:6,title:'CapEx / OpEx Split',
      formula:'capex = total \u00d7 capRate\nopex = total \u2212 capex',
      note:tog.capitalization?'Using assumption cap rate':'Using current roster cap rate ('+pct(capRate)+')'}
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
  document.getElementById('methodStepsSection').innerHTML=stepsHtml;

  // Year-by-year walk table with intermediate values
  let hc=fHC,salaryGrowth=1;
  const allEmpsCount=Math.max(state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR).length,1);
  let walkRows=[];
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
    walkRows.push({year:y,prevHC,attrLoss,rawHires,aiGear,netHires,hc,
      meritRate,marketRate,salaryGrowth,base,total,capex,opex:total-capex,
      attrVal,hiresVal,capRateY});
  });

  let walkHtml=`<h5 style="margin-bottom:8px">Year-by-Year Walk</h5>
    <div style="overflow-x:auto"><table class="method-walk-table">
    <thead><tr>
      <th>Year</th><th>Start HC</th>
      <th>Attrition</th><th>Hires (raw)</th><th>AI Gear</th><th>Net Hires</th>
      <th>End HC</th><th>Merit%</th><th>Market%</th><th>Growth Mult</th>
      <th>Base</th><th>Total</th><th>CapEx</th><th>OpEx</th>
    </tr></thead><tbody>`;
  walkRows.forEach(r=>{
    walkHtml+=`<tr>
      <td class="mw-highlight">${displayYear(r.year)}</td>
      <td>${r.prevHC}</td>
      <td class="mw-dim">\u2212${r.attrLoss}${attrMode==='pct'?' ('+r.attrVal+'%)':''}</td>
      <td>${r.rawHires}${hiresMode==='pct'?' ('+r.hiresVal+'%)':''}</td>
      <td class="mw-dim">\u00d7${r.aiGear.toFixed(2)}</td>
      <td>+${r.netHires}</td>
      <td class="mw-highlight">${r.hc}</td>
      <td>${(r.meritRate*100).toFixed(1)}%</td>
      <td>${(r.marketRate*100).toFixed(1)}%</td>
      <td class="mw-dim">${r.salaryGrowth.toFixed(3)}x</td>
      <td>${_fmt(r.base)}</td>
      <td class="mw-highlight">${_fmt(r.total)}</td>
      <td class="mw-dim">${_fmt(r.capex)}</td>
      <td>${_fmt(r.opex)}</td>
    </tr>`;
  });
  walkHtml+='</tbody></table></div>';
  document.getElementById('methodYearWalk').innerHTML=walkHtml;
}
function renderForecastProjection(){
  const fa=state.forecastAssumptions;
  const tog=fa.toggles;

  // Build total forecast
  const totalRows=projectForecast(state.employees);

  // Determine split groups — each entry has {emps, groupKey} for override lookups
  let splitGroups=null;
  let splitGroupKeys={};
  let groupForecasts=null;
  if(forecastSplit==='project'){
    splitGroups={};
    const allocTracker={};
    state.employees.forEach(e=>{allocTracker[e.id]=0});
    state.projects.forEach(p=>{
      const allocated=[];
      state.employees.forEach(e=>{
        if(!e.allocations)return;
        const alloc=e.allocations.find(a=>a.projId===p.id);
        if(!alloc)return;
        const pct=alloc.pct/100;
        allocTracker[e.id]=(allocTracker[e.id]||0)+pct;
        allocated.push({...e,salary:Math.round((e.salary||0)*pct),capPct:e.capPct,_allocPct:pct});
      });
      if(allocated.length){splitGroups[p.code]=allocated;splitGroupKeys[p.code]=p.id}
    });
    // Capture unassigned and partially-allocated remainder — merge into GEN-000
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const genCode=genProj?'GEN-000':'Unassigned';
    state.employees.forEach(e=>{
      const used=allocTracker[e.id]||0;
      if(used<0.999){
        const rem=1-used;
        if(!splitGroups[genCode])splitGroups[genCode]=[];
        splitGroups[genCode].push({...e,salary:Math.round((e.salary||0)*rem),capPct:e.capPct,_allocPct:rem});
        if(!splitGroupKeys[genCode])splitGroupKeys[genCode]=genProj?genProj.id:null;
      }
    });
  } else if(forecastSplit==='function'){
    splitGroups={};
    const used=new Set();
    FUNCTIONS.forEach(f=>{const fe=state.employees.filter(e=>{if(e.function===f){used.add(e.id);return true}return false});if(fe.length){splitGroups[f]=fe;splitGroupKeys[f]=f}});
    const other=state.employees.filter(e=>!used.has(e.id));
    if(other.length){splitGroups['Other']=other;splitGroupKeys['Other']='Other'}
  } else if(forecastSplit==='country'){
    splitGroups={};
    const used=new Set();
    COUNTRIES.forEach(c=>{const ce=state.employees.filter(e=>{if(e.country===c){used.add(e.id);return true}return false});if(ce.length){splitGroups[c]=ce;splitGroupKeys[c]=c}});
    const other=state.employees.filter(e=>!used.has(e.id));
    if(other.length){splitGroups['Other']=other;splitGroupKeys['Other']='Other'}
  }

  // Table
  const tbl=document.getElementById('forecastTable');
  if(!splitGroups||forecastSplit==='comp'){
    // Total view with base/bonus/benefits breakdown
    const rows=[];
    const activeEmps=state.employees.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR);
    // Separate GEN-000 (unallocated) employees — they don't drive HC dynamics
    const _genP=state.projects.find(p=>p.code==='GEN-000');
    const _genId=_genP?_genP.id:null;
    const _isUnalloc=e=>{
      if(!_genId)return false;
      if(!e.allocations||!e.allocations.length)return true;
      return e.allocations.every(a=>a.projId===_genId);
    };
    let dynActive=activeEmps.filter(e=>!_isUnalloc(e));
    let stActive=activeEmps.filter(e=>_isUnalloc(e));
    // If ALL employees are unallocated, treat them all as dynamic so forecast isn't frozen
    if(dynActive.length===0&&stActive.length>0){dynActive=stActive;stActive=[];}
    const currentHC=activeEmps.length;
    const currentBase=activeEmps.reduce((a,e)=>a+getProratedBase(e),0);
    const currentBonus=activeEmps.reduce((a,e)=>a+getProratedBonus(e),0);
    const currentBenefits=activeEmps.reduce((a,e)=>a+getProratedBenefits(e),0);
    const currentCapEx=activeEmps.reduce((a,e)=>a+getProratedCapEx(e),0);
    let dynForward=dynActive.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR);
    let stForward=stActive.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>CURRENT_YEAR);
    // If ALL forward pools are empty but we have current HC, fall back to using all active
    if(dynForward.length===0&&stForward.length===0&&activeEmps.length>0){
      dynForward=dynActive.length?dynActive:activeEmps;
      stForward=dynActive.length?stActive:[];
    }
    const forwardHC=dynForward.length;
    const stHC=stForward.length;
    const forwardBase=dynForward.reduce((a,e)=>a+e.salary,0);
    const stBaseTotal=stForward.reduce((a,e)=>a+e.salary,0);
    const stAvgSal=stHC?stBaseTotal/stHC:0;
    const stBonusRate=stHC&&stBaseTotal?stForward.reduce((a,e)=>a+getBonusAmt(e),0)/stBaseTotal:0;
    const stBenRate=stHC&&stBaseTotal?stForward.reduce((a,e)=>a+getBenefitsAmt(e),0)/stBaseTotal:0;
    const stCompTotal=stForward.reduce((a,e)=>a+getProratedComp(e),0);
    const stCapRate=stCompTotal?stForward.reduce((a,e)=>a+getProratedCapEx(e),0)/stCompTotal:0;
    const avgSalary=forwardHC?forwardBase/forwardHC:100000;
    const avgBonusRate=forwardHC&&forwardBase?dynForward.reduce((a,e)=>a+getBonusAmt(e),0)/forwardBase:0.1;
    const avgBenRate=forwardHC&&forwardBase?dynForward.reduce((a,e)=>a+getBenefitsAmt(e),0)/forwardBase:0.2;
    const currentTotal=currentBase+currentBonus+currentBenefits;
    const currentCapRate=currentTotal?currentCapEx/currentTotal:0;
    rows.push({year:'Current',hc:currentHC,base:currentBase,bonus:currentBonus,benefits:currentBenefits,total:currentTotal,capex:currentCapEx,opex:currentTotal-currentCapEx});
    const attrMode2=getForecastMode('attrition');
    const hiresMode2=getForecastMode('hires');
    let hc=forwardHC;let sg=1;
    FORECAST_YEARS.forEach((y,i)=>{
      const attrVal=tog.attrition?fa.attrition[i]:0;
      const attrLoss2=attrMode2==='pct'?Math.round(hc*attrVal/100):Math.round(attrVal);
      const hiresVal=tog.hires?fa.hires[i]:0;
      const newHires=hiresMode2==='pct'?Math.round(hc*hiresVal/100):hiresVal;
      const aiGear=tog.ai?fa.ai[i]:1;
      hc=Math.max(0,hc-attrLoss2+Math.round(newHires*aiGear));
      sg*=(1+(tog.merit?fa.merit[i]/100:0)+(tog.market?fa.market[i]/100:0));
      const dynBase=Math.round(hc*avgSalary*sg);
      const dynBonus=Math.round(dynBase*avgBonusRate);
      const dynBenefits=Math.round(dynBase*avgBenRate);
      // Static (unallocated) employees: costs grow with salary growth, HC frozen
      const sBase=Math.round(stHC*stAvgSal*sg);
      const sBonus=Math.round(sBase*stBonusRate);
      const sBenefits=Math.round(sBase*stBenRate);
      const base=dynBase+sBase;
      const bonus=dynBonus+sBonus;
      const benefits=dynBenefits+sBenefits;
      const total=base+bonus+benefits;
      const capRate=tog.capitalization?fa.capitalization[i]/100:currentCapRate;
      const stCR=tog.capitalization?capRate:stCapRate;
      const capex=Math.round((dynBase+dynBonus+dynBenefits)*capRate)+Math.round((sBase+sBonus+sBenefits)*stCR);
      rows.push({year:y,hc:hc+stHC,base,bonus,benefits,total,capex,opex:total-capex});
    });
    let html;
    if(forecastSplit==='total'){
      html='<thead><tr><th>Year</th><th>Headcount</th><th>Total Comp</th><th>CapEx</th><th>OpEx (P&L)</th></tr></thead><tbody>';
      rows.forEach(r=>html+=`<tr><td style="font-weight:600;color:var(--accent)">${displayYear(r.year)}</td><td>${r.hc}</td><td style="font-weight:600;color:var(--accent)">${fmt(r.total)}</td><td>${fmt(r.capex)}</td><td style="color:var(--success)">${fmt(r.opex)}</td></tr>`);
    } else {
      html='<thead><tr><th>Year</th><th>Headcount</th><th>Base Cost</th><th>Bonus Cost</th><th>Benefits Cost</th><th>Total Comp</th><th>CapEx</th><th>OpEx (P&L)</th></tr></thead><tbody>';
      rows.forEach(r=>html+=`<tr><td style="font-weight:600;color:var(--accent)">${displayYear(r.year)}</td><td>${r.hc}</td><td>${fmt(r.base)}</td><td>${fmt(r.bonus)}</td><td>${fmt(r.benefits)}</td><td style="font-weight:600;color:var(--accent)">${fmt(r.total)}</td><td>${fmt(r.capex)}</td><td style="color:var(--success)">${fmt(r.opex)}</td></tr>`);
    }
    html+='</tbody>';
    tbl.innerHTML=html;

    // Chart - stacked base/bonus/benefits with capex view support
    if(typeof Chart!=='undefined'){
      const isDark=document.documentElement.classList.contains('dark');
      const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
      const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
      if(forecastChart)forecastChart.destroy();
      let fDatasets;
      const fcc=window.getChartColors();
      if(forecastSplit==='total'){
        // Total view — single bar, no base/bonus/benefits breakout
        if(forecastView==='opex'){
          fDatasets=[
            {label:'OpEx',data:rows.map(r=>r.opex),backgroundColor:fcc[0],stack:'pos'},
            {label:'CapEx',data:rows.map(r=>-r.capex),backgroundColor:window.hexToRgba(fcc[0],0.35),stack:'neg'}
          ];
        } else {
          fDatasets=[
            {label:'Total Comp',data:rows.map(r=>r.total),backgroundColor:fcc[0]}
          ];
        }
      } else if(forecastView==='opex'){
        fDatasets=[
          {label:'Base (OpEx)',data:rows.map(r=>Math.round(r.base*(1-r.capex/Math.max(r.total,1)))),backgroundColor:fcc[0],stack:'pos'},
          {label:'Bonus (OpEx)',data:rows.map(r=>Math.round(r.bonus*(1-r.capex/Math.max(r.total,1)))),backgroundColor:fcc[1],stack:'pos'},
          {label:'Benefits (OpEx)',data:rows.map(r=>Math.round(r.benefits*(1-r.capex/Math.max(r.total,1)))),backgroundColor:fcc[2],stack:'pos'},
          {label:'Base (CapEx)',data:rows.map(r=>-Math.round(r.base*r.capex/Math.max(r.total,1))),backgroundColor:window.hexToRgba(fcc[0],0.35),stack:'neg'},
          {label:'Bonus (CapEx)',data:rows.map(r=>-Math.round(r.bonus*r.capex/Math.max(r.total,1))),backgroundColor:window.hexToRgba(fcc[1],0.35),stack:'neg'},
          {label:'Benefits (CapEx)',data:rows.map(r=>-Math.round(r.benefits*r.capex/Math.max(r.total,1))),backgroundColor:window.hexToRgba(fcc[2],0.35),stack:'neg'},
        ];
      } else {
        fDatasets=[
          {label:'Base',data:rows.map(r=>r.base),backgroundColor:fcc[0]},
          {label:'Bonus',data:rows.map(r=>r.bonus),backgroundColor:fcc[1]},
          {label:'Benefits',data:rows.map(r=>r.benefits),backgroundColor:fcc[2]}
        ];
      }
      window.stackedBarDatalabels(fDatasets,tickColor,null,'forecast');
      forecastChart=new Chart(document.getElementById('forecastChart'),{
        type:'bar',
        data:{labels:rows.map(r=>displayYear(r.year)),datasets:fDatasets},
        plugins:[window.yoyArrowsPlugin],
        options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:'bottom',labels:{color:tickColor,padding:14}},datalabels:{},yoyArrows:{}},scales:{
          x:{stacked:true,ticks:{color:tickColor},grid:{color:gridColor}},
          y:{stacked:true,ticks:{color:tickColor,callback:v=>(v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(2)+'M'},grid:{color:gridColor}}
        }}
      });
    }
  } else {
    // Split view
    const groupNames=Object.keys(splitGroups);
    groupForecasts={};
    groupNames.forEach(g=>groupForecasts[g]=projectForecast(splitGroups[g],splitGroupKeys[g]));
    const yearLabels=getDisplayFcLabels();

    // Normalize group values so they sum exactly to the independent total
    yearLabels.forEach((_,yi)=>{
      const tr=totalRows[yi];
      let sumTotal=0,sumCapex=0;
      groupNames.forEach(g=>{const r=groupForecasts[g][yi];if(r){sumTotal+=r.total;sumCapex+=r.capex}});
      if(sumTotal){
        const ratioT=tr.total/sumTotal;
        const ratioC=sumCapex?tr.capex/sumCapex:0;
        groupNames.forEach(g=>{const r=groupForecasts[g][yi];if(r){r.total=Math.round(r.total*ratioT);r.capex=Math.round(r.capex*ratioC);r.opex=r.total-r.capex}});
      }
    });

    // Table
    const showOpex=forecastView==='opex';
    let html='<thead><tr><th>Year</th>';
    groupNames.forEach(g=>html+=`<th class="split-th">${g}</th>`);
    html+=`<th class="split-th col-divider">Total</th>${showOpex?'<th style="text-align:right">CapEx</th><th style="text-align:right">OpEx</th>':''}</tr></thead><tbody>`;
    yearLabels.forEach((y,yi)=>{
      html+=`<tr><td style="font-weight:600;color:var(--accent)">${y}</td>`;
      groupNames.forEach(g=>{const r=groupForecasts[g][yi];const v=r?(showOpex?r.opex:r.total):0;html+=`<td>${fmt(v)}</td>`});
      // Use independently-computed total to ensure consistency across split modes
      const tr=totalRows[yi];
      html+=`<td style="font-weight:600;color:var(--accent)" class="col-divider">${fmt(showOpex?tr.opex:tr.total)}</td>`;
      if(showOpex)html+=`<td>${fmt(tr.capex)}</td><td style="color:var(--success)">${fmt(tr.opex)}</td>`;
      html+='</tr>';
    });
    html+='</tbody>';
    tbl.innerHTML=html;

    // Chart - stacked by group
    if(typeof Chart!=='undefined'){
      const isDark=document.documentElement.classList.contains('dark');
      const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
      const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
      if(forecastChart)forecastChart.destroy();

      // Compute OAO and D&A yearly projections
      const _oaoBase=window.getVendorOaoTotal?window.getVendorOaoTotal():0;
      const _oaoGr=state.oaoGrowthPct||[5,5,5,5,5];
      const _oaoYrs=[_oaoBase];for(let oi=0;oi<5;oi++)_oaoYrs.push(Math.round(_oaoYrs[oi]*(1+(_oaoGr[oi]||0)/100)));
      const _cCapEx=window.getContractorCapExTotal?window.getContractorCapExTotal():0;
      const _assetLife=state.daAssetLifeYrs||5;
      const _daBase=window.getDepreciationTotal?window.getDepreciationTotal():0;
      const cbCapex=totalRows.map(r=>r.capex);
      const _tcby=cbCapex.map(cb=>cb+_cCapEx);
      const _daYrs=[_daBase];
      for(let yr=1;yr<=5;yr++){let yd=0;for(let v=0;v<yr;v++){if(yr-v<=_assetLife)yd+=Math.round(_tcby[v]/_assetLife)}yd+=Math.max(0,Math.round(_daBase*(1-yr/_assetLife)));_daYrs.push(yd)}

      // Distribute OAO/D&A into groups by HC share (except for account/seniority splits)
      const distributeOAO=forecastSplit!=='account';
      const datasets=groupNames.map((g,i)=>{
        const data=yearLabels.map((_,yi)=>{
          const r=groupForecasts[g][yi];
          let val=r?(showOpex?r.opex:r.total):0;
          if(distributeOAO&&r){
            const tr=totalRows[yi];
            const share=tr&&tr.hc>0?r.hc/tr.hc:0;
            val+=Math.round((_oaoYrs[yi]||0)*share);
          }
          return val;
        });
        return {
          label:g.length>20?g.slice(0,18)+'\u2026':g,
          data,
          backgroundColor:window.getChartColors()[i%window.getChartColors().length],
          stack:'pos'
        };
      });
      if(showOpex){
        groupNames.forEach((g,i)=>{
          const capData=yearLabels.map((_,yi)=>{const r=groupForecasts[g][yi];return r?-r.capex:0});
          if(capData.some(v=>v<0))datasets.push({label:(g.length>18?g.slice(0,16)+'\u2026':g)+' (CapEx)',data:capData,backgroundColor:window.hexToRgba(window.getChartColors()[i%window.getChartColors().length],0.35),stack:'neg'});
        });
      }
      // Datalabels: account split shows per-series Y/Y %, others show total
      if(forecastSplit==='account'){
        datasets.forEach(ds=>{
          ds.datalabels={display:true,anchor:'end',align:'end',color:tickColor,font:{size:9,weight:'400'},
            formatter:(val,ctx)=>{
              if(!val||ctx.dataIndex===0)return '';
              const prev=ds.data[ctx.dataIndex-1];
              if(!prev)return '';
              const pct=((val-prev)/Math.abs(prev))*100;
              const pctStr=(pct>=0?'+':'')+((Math.abs(pct)>=5)?Math.round(pct):pct.toFixed(1))+'%';
              return ds.label+' '+pctStr;
            }};
        });
      } else {
        window.stackedBarDatalabels(datasets,tickColor,null,'forecast');
      }
      forecastChart=new Chart(document.getElementById('forecastChart'),{
        type:'bar',
        data:{labels:yearLabels,datasets},
        plugins:[window.yoyArrowsPlugin],
        options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:'bottom',labels:{color:tickColor,padding:14}},datalabels:{},yoyArrows:{}},scales:{
          x:{stacked:true,ticks:{color:tickColor},grid:{color:gridColor}},
          y:{stacked:true,ticks:{color:tickColor,callback:v=>(v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(2)+'M'},grid:{color:gridColor}}
        }}
      });
    }
  }
  // ── Forecast FTE sparkline ──
  if(typeof Chart!=='undefined'){
    const isDark2=document.documentElement.classList.contains('dark');
    const tickColor2=isDark2?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
    const gridColor2=isDark2?'rgba(255,255,255,.08)':'#ddd';
    if(window._forecastFteChart)window._forecastFteChart.destroy();
    const fteLabels=totalRows.map(r=>displayYear(r.year));
    let fcFteDatasets=[];
    if(splitGroups){
      const gNames=Object.keys(splitGroups);
      gNames.forEach((g,i)=>{
        const gf=groupForecasts[g];
        fcFteDatasets.push({label:g.length>20?g.slice(0,18)+'\u2026':g,data:fteLabels.map((_,yi)=>gf[yi]?gf[yi].hc:0),borderColor:window.getChartColors()[i%window.getChartColors().length],backgroundColor:window.hexToRgba(window.getChartColors()[i%window.getChartColors().length],0.25),fill:true,tension:0.4,pointRadius:0,borderWidth:1.5});
      });
    } else {
      fcFteDatasets=[{label:'Projected FTEs',data:totalRows.map(r=>r.hc),borderColor:window.getChartColors()[0],backgroundColor:window.hexToRgba(window.getChartColors()[0],0.15),fill:true,tension:0.4,pointRadius:3,borderWidth:2}];
    }
    // Add total data label on topmost forecast FTE dataset
    fcFteDatasets.forEach((ds,i)=>{
      if(i===fcFteDatasets.length-1){
        ds.datalabels={display:true,anchor:'end',align:'end',color:window.getCrispDatalabelColor('forecastFte')||tickColor2,font:{size:window.chartColorScheme==='crisp'?13:11,weight:'bold'},
          formatter:(_,ctx)=>{
            let sum=0;fcFteDatasets.forEach(d=>{const v=d.data[ctx.dataIndex];if(typeof v==='number')sum+=v});
            return sum||'';
          }};
      } else {
        ds.datalabels={display:false};
      }
    });
    // Y/Y % growth plugin for FTE chart (matches LTF sparkline style)
    const fteVals=totalRows.map(r=>r.hc);
    const fteYoyPlugin={
      id:'fteYoy',
      afterDraw(chart){
        const meta=chart.getDatasetMeta(chart.data.datasets.length-1);
        if(!meta||!meta.data||meta.data.length<2)return;
        const ctx=chart.ctx;
        ctx.save();
        const fontSize=11;
        ctx.font=`500 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
        const lineColor=chart.data.datasets[chart.data.datasets.length-1].borderColor||window.getChartColors()[0];
        ctx.textAlign='center';ctx.textBaseline='bottom';
        for(let i=0;i<fteVals.length-1;i++){
          const prev=fteVals[i],cur=fteVals[i+1];
          if(!prev)continue;
          const pct=((cur-prev)/Math.abs(prev))*100;
          const pctStr=(pct>=0?'+':'')+((Math.abs(pct)>=5)?Math.round(pct):pct.toFixed(1))+'%';
          const p1=meta.data[i],p2=meta.data[i+1];
          if(!p1||!p2)continue;
          const midX=(p1.x+p2.x)/2;
          const topY=Math.min(p1.y,p2.y)-8;
          // Background pill
          const tw=ctx.measureText(pctStr).width;
          const pad=2;
          const isLight=document.documentElement.getAttribute('data-theme')==='light';
          ctx.fillStyle=pct>=0?(isLight?'rgba(5,150,105,.1)':'rgba(16,185,129,.2)'):(isLight?'rgba(220,38,38,.1)':'rgba(239,68,68,.2)');
          const rx=midX-tw/2-pad,ry=topY-fontSize/2-pad-2,rw=tw+pad*2,rh=fontSize+pad*2;
          if(ctx.roundRect)ctx.roundRect(rx,ry,rw,rh,3);else{ctx.beginPath();ctx.rect(rx,ry,rw,rh)}
          ctx.fill();
          ctx.fillStyle=pct>=0?(isLight?'#059669':'#10b981'):(isLight?'#dc2626':'#ef4444');
          ctx.fillText(pctStr,midX,topY);
        }
        ctx.restore();
      }
    };
    window._forecastFteChart=new Chart(document.getElementById('forecastFteChart'),{
      type:'line',
      data:{labels:fteLabels,datasets:fcFteDatasets},
      plugins:[fteYoyPlugin],
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},
        plugins:{legend:{display:fcFteDatasets.length>1,position:'bottom',labels:{color:tickColor2,boxWidth:14,font:{size:13},padding:14}},datalabels:{display:false},yoyArrows:false,tooltip:window.FTE_TOOLTIP},
        scales:{
          x:{ticks:{color:tickColor2,font:{size:12,weight:'600'}},grid:{display:false},stacked:true},
          y:{beginAtZero:true,stacked:true,ticks:{color:tickColor2,font:{size:12}},grid:{color:gridColor2},title:{display:true,text:'Projected FTEs',color:tickColor2,font:{size:12}}}
        }
      }
    });
  }
  renderForecastMethodology();
}
export function renderForecast(){renderForecastInputs();renderForecastProjection();renderForecastFactorPills()}

function renderForecastFactorPills(){
  const fa=state.forecastAssumptions;
  const tog=fa.toggles||{};
  const factors=[
    {key:'attrition',label:'Attrition',val:fa.attrition[0],suffix:'%'},
    {key:'hires',label:'Hires',val:fa.hires[0],suffix:fa.modes&&fa.modes.hires==='pct'?'%':'/yr'},
    {key:'merit',label:'Merit',val:fa.merit[0],suffix:'%'},
    {key:'market',label:'Market',val:fa.market[0],suffix:'%'},
    {key:'ai',label:'AI Prod',val:fa.ai[0],suffix:'x'},
    {key:'capitalization',label:'Cap Rate',val:fa.capitalization[0],suffix:'%'},
    {key:'oaoGrowth',label:'OAO Growth',val:state.oaoGrowthPct[0],suffix:'%'},
    {key:'daLife',label:'Asset Life',val:state.daAssetLifeYrs||5,suffix:'yr'}
  ];
  // Render pills into both the forecast tab and the LTF module
  ['forecastFactorPills','ltfFactorPills'].forEach(elId=>{
    const el=document.getElementById(elId);
    if(!el)return;
    el.innerHTML=factors.map(f=>{
      const off=tog[f.key]===false;
      return `<span class="factor-pill${off?' disabled':''}" data-factor="${f.key}">${f.label}: ${f.val}${f.suffix}</span>`;
    }).join('')+' <button class="btn btn-sm ltf-customize-btn" style="font-size:.72rem;padding:2px 10px">Customize</button>';
    el.querySelectorAll('.factor-pill').forEach(p=>p.addEventListener('click',()=>openForecastAssumptionsModal(p.dataset.factor)));
    el.querySelector('.ltf-customize-btn').addEventListener('click',openForecastAssumptionsModal);
  });
}

export function openForecastAssumptionsModal(scrollToKey){
  // Ensure modal inputs are populated (may not have run if opened from LTF module)
  renderForecastInputs();
  document.getElementById('forecastAssumptionsModal').classList.add('show');
  if(scrollToKey){
    setTimeout(()=>{
      const section=document.getElementById('fcSection-'+scrollToKey);
      if(section){
        section.scrollIntoView({behavior:'smooth',block:'center'});
        section.style.outline='2px solid var(--accent)';
        section.style.outlineOffset='2px';
        setTimeout(()=>{section.style.outline='';section.style.outlineOffset=''},1500);
      }
    },100);
  }
}
export function closeForecastAssumptionsModal(){
  document.getElementById('forecastAssumptionsModal').classList.remove('show');
  window.logAudit('Update Forecast','Forecast assumptions updated');
  renderForecastFactorPills();
  if(window.renderLtfChart)window.renderLtfChart();
}

// Forecast table toggle
document.getElementById('forecastTableToggle').addEventListener('click',function(){
  const wrap=document.getElementById('forecastTableWrap');
  const vis=wrap.style.display!=='none';
  wrap.style.display=vis?'none':'';
  this.innerHTML=vis?'&#9654; Show Details':'&#9660; Hide Details';
});

document.getElementById('forecastMethodToggle').addEventListener('click',function(){
  const panel=document.getElementById('forecastMethodPanel');
  const vis=panel.style.display!=='none';
  panel.style.display=vis?'none':'';
  this.innerHTML=vis?'&#9654; Forecast Methodology':'&#9660; Forecast Methodology';
  if(!vis)renderForecastMethodology();
});

// Forecast modal close handlers
document.getElementById('closeForecastModal').addEventListener('click',closeForecastAssumptionsModal);
document.getElementById('closeForecastModalBtn').addEventListener('click',closeForecastAssumptionsModal);
document.getElementById('forecastAssumptionsModal').addEventListener('click',function(e){if(e.target===this)closeForecastAssumptionsModal()});

// Expose functions needed by inline onclick handlers
window.onExpandChange = onExpandChange;
window.onModeChange = onModeChange;
window.openForecastAssumptionsModal = openForecastAssumptionsModal;
window.closeForecastAssumptionsModal = closeForecastAssumptionsModal;
window.renderForecast = renderForecast;
window.renderForecastFactorPills = renderForecastFactorPills;
window.projectForecast = projectForecast;
window.renderForecastProjection = renderForecastProjection;
