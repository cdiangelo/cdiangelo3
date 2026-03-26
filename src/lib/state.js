// ── STATE ──
import {
  SENIORITY, FUNCTIONS, FORECAST_YEARS, DEFAULT_BONUS, DEFAULT_BENEFITS,
  BENEFITS_COUNTRY_MULT, COUNTRY_BU, DEFAULT_MARKETS, DEFAULT_BIZ_LINES,
  DEFAULT_ACCOUNTS, COUNTRIES, benchmark, uid
} from './constants.js';

export let state;

export function replaceState(newState){
  state=newState;
}

export function loadState(){
  const raw=localStorage.getItem('compPlanState_v2');
  if(raw){state=JSON.parse(raw);ensureStateFields();return}
  const bonusMatrix={};
  SENIORITY.forEach(s=>{bonusMatrix[s]={};FUNCTIONS.forEach(f=>{bonusMatrix[s][f]=DEFAULT_BONUS[s]})});
  const benefitsMatrix={};
  SENIORITY.forEach(s=>{benefitsMatrix[s]={};FUNCTIONS.forEach(f=>{benefitsMatrix[s][f]=DEFAULT_BENEFITS[s]})});
  const benefitsCountryMult={...BENEFITS_COUNTRY_MULT};
  const samples=[
    {name:'Alice Chen',country:'United States',seniority:'Senior',function:'Software Engineering',marketCode:'US0001',businessLine:'100000'},
    {name:'Bob Kumar',country:'India',seniority:'Mid-Level',function:'Data Engineering',marketCode:'IN0005',businessLine:'400000'},
    {name:'Sarah Mills',country:'United Kingdom',seniority:'Director',function:'Product Management',marketCode:'UK0002',businessLine:'200000'},
    {name:'James Park',country:'Canada',seniority:'Staff',function:'DevOps/SRE',marketCode:'CA0003',businessLine:'500000'},
    {name:'Maria Rodriguez',country:'Germany',seniority:'Senior',function:'Data Science',marketCode:'DE0004',businessLine:'400000'}
  ];
  const employees=samples.map(e=>({id:uid(),name:e.name,country:e.country,seniority:e.seniority,function:e.function,salary:benchmark(e.seniority,e.function,e.country),notes:'',hireDate:'',termDate:'',marketCode:e.marketCode,businessLine:e.businessLine,businessUnit:COUNTRY_BU[e.country]||'',allocations:[]}));
  const projects=[
    {id:uid(),category:'Enterprise Software',product:'Analytics Suite',code:'PRJ-001',description:'Core analytics platform',marketCode:'US0001'},
    {id:uid(),category:'Enterprise Software',product:'Data Platform',code:'PRJ-002',description:'Data ingestion and processing',marketCode:'GL0000'},
    {id:uid(),category:'Consumer Products',product:'Mobile App',code:'PRJ-003',description:'Consumer mobile application',marketCode:'UK0002'}
  ];
  const forecastAssumptions={
    attrition:FORECAST_YEARS.map(()=>12),
    hires:FORECAST_YEARS.map(()=>5),
    merit:FORECAST_YEARS.map(()=>3),
    market:FORECAST_YEARS.map(()=>2),
    ai:FORECAST_YEARS.map((_,i)=>Math.max(0.7,1-i*0.05)),
    capitalization:FORECAST_YEARS.map(()=>0),
    toggles:{attrition:true,hires:true,merit:true,market:true,ai:true,capitalization:true}
  };
  const allocOverrides={};
  const markets=DEFAULT_MARKETS.map(m=>({...m}));
  const bizLines=DEFAULT_BIZ_LINES.map(b=>({...b}));
  state={employees,bonusMatrix,benefitsMatrix,benefitsCountryMult,projects,forecastAssumptions,allocOverrides,markets,bizLines};
  ensureStateFields();
  saveState();
}

export function ensureStateFields(){
  // Sync module-level state with window.state (external code may reassign window.state directly)
  if(window.state && window.state !== state) state = window.state;
  if(!state.employees)state.employees=[];
  if(!state.bonusMatrix){state.bonusMatrix={};SENIORITY.forEach(s=>{state.bonusMatrix[s]={};FUNCTIONS.forEach(f=>{state.bonusMatrix[s][f]=DEFAULT_BONUS[s]})})}
  if(!state.projects)state.projects=[];
  state.projects.forEach(p=>{if(!p.description)p.description='';if(!p.marketCode)p.marketCode='';if(!p.bizLineCode)p.bizLineCode=''});
  if(!state.markets)state.markets=DEFAULT_MARKETS.map(m=>({...m}));
  if(!state.bizLines)state.bizLines=DEFAULT_BIZ_LINES.map(b=>({...b}));
  // Migrate 3-digit biz line codes to 6-digit
  state.bizLines.forEach(b=>{if(b.code&&b.code.length<6&&/^\d+$/.test(b.code))b.code=b.code.padEnd(6,'0')});
  state.employees.forEach(e=>{if(e.businessLine&&e.businessLine.length<6&&/^\d+$/.test(e.businessLine))e.businessLine=e.businessLine.padEnd(6,'0')});
  // Ensure a default "General" project exists for unallocated employees
  if(!state.projects.some(p=>p.code==='GEN-000')){
    state.projects.unshift({id:uid(),name:'General / Unallocated',code:'GEN-000',description:'Default coding string for employees without a project allocation',category:'',marketCode:'GL0000',capPct:0});
  }
  // Migrate old string businessLine values to numeric codes
  const bizNameToCode={};
  state.bizLines.forEach(b=>{bizNameToCode[b.name.toLowerCase()]=b.code});
  state.employees.forEach(e=>{
    if(e.businessLine&&!state.bizLines.some(b=>b.code===e.businessLine)){
      const mapped=bizNameToCode[e.businessLine.toLowerCase()];
      if(mapped)e.businessLine=mapped;
    }
    // Default business unit from country
    if(!e.businessUnit)e.businessUnit=COUNTRY_BU[e.country]||'';
    // Default business line: first available code
    if(!e.businessLine&&state.bizLines.length)e.businessLine=state.bizLines[0].code;
    // Default seniority/function if somehow missing
    if(!e.seniority||!SENIORITY.includes(e.seniority))e.seniority=e.seniority||'Mid-Level';
    if(!e.function||!FUNCTIONS.includes(e.function))e.function=e.function||'Software Engineering';
    if(!e.country||!COUNTRIES.includes(e.country))e.country=e.country||'United States';
    // Auto-derive salary from benchmarks when not provided
    if(!e.salary||e.salary<=0){
      e.salary=benchmark(e.seniority,e.function,e.country);
    }
    // Ensure capPct is a valid number
    if(e.capPct===undefined||e.capPct===null||e.capPct==='')e.capPct=0;
    e.capPct=parseFloat(e.capPct)||0;
  });
  if(!state.benefitsMatrix){
    state.benefitsMatrix={};
    SENIORITY.forEach(s=>{state.benefitsMatrix[s]={};FUNCTIONS.forEach(f=>{state.benefitsMatrix[s][f]=DEFAULT_BENEFITS[s]})});
  }
  if(!state.benefitsCountryMult)state.benefitsCountryMult={...BENEFITS_COUNTRY_MULT};
  if(!state.forecastAssumptions){
    state.forecastAssumptions={
      attrition:FORECAST_YEARS.map(()=>12),hires:FORECAST_YEARS.map(()=>5),
      merit:FORECAST_YEARS.map(()=>3),market:FORECAST_YEARS.map(()=>2),
      ai:FORECAST_YEARS.map((_,i)=>Math.max(0.7,1-i*0.05)),
      toggles:{attrition:true,hires:true,merit:true,market:true,ai:true}
    };
  }
  if(!state.forecastAssumptions.expandBy)state.forecastAssumptions.expandBy={attrition:'total',hires:'total',merit:'total',market:'total',ai:'total'};
  if(!state.forecastAssumptions.capitalization)state.forecastAssumptions.capitalization=FORECAST_YEARS.map(()=>0);
  // Ensure all forecast arrays match FORECAST_YEARS length (pad or trim as needed)
  const fcLen=FORECAST_YEARS.length;
  const fcDefaults={attrition:12,hires:5,merit:3,market:2,capitalization:0};
  ['attrition','hires','merit','market','capitalization'].forEach(k=>{
    const arr=state.forecastAssumptions[k];
    if(!arr||!Array.isArray(arr)){state.forecastAssumptions[k]=FORECAST_YEARS.map(()=>fcDefaults[k]);return}
    while(arr.length<fcLen)arr.push(fcDefaults[k]);
    if(arr.length>fcLen)arr.length=fcLen;
  });
  if(state.forecastAssumptions.ai){
    const ai=state.forecastAssumptions.ai;
    while(ai.length<fcLen)ai.push(Math.max(0.7,1-ai.length*0.05));
    if(ai.length>fcLen)ai.length=fcLen;
  } else {
    state.forecastAssumptions.ai=FORECAST_YEARS.map((_,i)=>Math.max(0.7,1-i*0.05));
  }
  if(!state.forecastAssumptions.expandBy.capitalization)state.forecastAssumptions.expandBy.capitalization='total';
  if(state.forecastAssumptions.toggles.capitalization===undefined)state.forecastAssumptions.toggles.capitalization=true;
  if(!state.forecastAssumptions.overrides)state.forecastAssumptions.overrides={};
  if(!state.allocOverrides)state.allocOverrides={};
  if(!state.customRates)state.customRates=[];
  if(!state.accounts)state.accounts=DEFAULT_ACCOUNTS.map(a=>({...a}));
  state.accounts.forEach(a=>{if(!a.group)a.group=a.category==='T&E'?'te':'vendor';});
  if(!state.contractorRows)state.contractorRows=[];
  // Depreciation module state
  if(!state.depreciationCategories)state.depreciationCategories=[];
  if(!state.depreciationRows)state.depreciationRows=[];
  if(!state.assetRows)state.assetRows=[];
  // Tech Revenue module state
  if(!state.revenueRows)state.revenueRows=[];
  if(!state.revenueClients)state.revenueClients=[];
  if(!state.revenueClientMapping)state.revenueClientMapping=[];
  if(!state.contractualRevenue)state.contractualRevenue=[];
  if(state.showRevenuePane===undefined)state.showRevenuePane=true;
  if(!state.revenueForecast)state.revenueForecast=[];
  if(state.landingPnlMode===undefined)state.landingPnlMode='cost';
  // Audit log
  if(!state.auditLog)state.auditLog=[];
  // Guide tracking
  if(!state.guideChecked)state.guideChecked={};
  // Long-term forecast: OAO Y/Y growth and D&A asset lifecycle
  if(!state.oaoGrowthPct)state.oaoGrowthPct=[5,5,5,5,5];
  if(!state.daAssetLifeYrs)state.daAssetLifeYrs=5;
  if(!state.vendorRows||!state.vendorRows.length){
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const defProjId=genProj?genProj.id:'';
    state.vendorRows=[{parentCo:'',vendorName:'OAO - Vendor Spend',vendorType:'Other',businessUnit:'',bizLine:'',market:'',project:defProjId,acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0}];
  }
  if(!state.teRows||!state.teRows.length){
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const defProjId=genProj?genProj.id:'';
    state.teRows=[{expenseType:'T&E',description:'OAO - T&E Spend',businessUnit:'',bizLine:'',market:'',project:defProjId,acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0}];
  }
  // Migrate old allocations array to per-employee allocations
  if(state.allocations){
    state.allocations.forEach(a=>{
      const emp=state.employees.find(e=>e.id===a.empId);
      if(emp){
        if(!emp.allocations)emp.allocations=[];
        emp.allocations.push({projId:a.projId,pct:a.pct});
      }
    });
    delete state.allocations;
  }
  state.employees.forEach(e=>{
    if(!e.hireDate)e.hireDate='';
    if(!e.termDate)e.termDate='';
    if(!e.marketCode)e.marketCode='';
    if(!e.businessLine)e.businessLine='';
    if(!e.empType)e.empType='existing';
    if(!e.allocations)e.allocations=[];
    // Migrate standalone projectId into allocations
    if(e.projectId){
      const already=e.allocations.some(a=>a.projId===e.projectId);
      if(!already){e.allocations.unshift({projId:e.projectId,pct:100,primary:true})}
      delete e.projectId;
    }
    // Ensure exactly one primary if allocations exist
    if(e.allocations.length&&!e.allocations.some(a=>a.primary)){e.allocations[0].primary=true}
    // Assign default coding string (GEN-000) if no allocations at all
    if(!e.allocations.length){
      const genProj=state.projects.find(p=>p.code==='GEN-000');
      if(genProj)e.allocations=[{projId:genProj.id,pct:100,primary:true}];
    }
    // Validate allocation projIds — remove any referencing deleted projects
    e.allocations=e.allocations.filter(a=>state.projects.some(p=>p.id===a.projId));
    if(e.allocations.length&&!e.allocations.some(a=>a.primary))e.allocations[0].primary=true;
    // Re-assign default if all allocations were pruned
    if(!e.allocations.length){
      const genProj=state.projects.find(p=>p.code==='GEN-000');
      if(genProj)e.allocations=[{projId:genProj.id,pct:100,primary:true}];
    }
  });
  // Keep window.state in sync
  window.state = state;
}

export function saveState(){
  if(window.state && window.state !== state) state = window.state;
  if(window.persistenceMode==='template'){localStorage.setItem('compPlanState_v2',JSON.stringify(state))}
  else{window.debouncedServerSave();window.broadcastStateChange()}
}

/** Log an audit entry. action = short verb, detail = concise description.
 *  Keeps last 200 entries max. */
export function logAudit(action,detail){
  if(window.state && window.state !== state) state = window.state;
  if(!state.auditLog)state.auditLog=[];
  const ctx=window.sessionContext||{};
  state.auditLog.push({
    ts:new Date().toISOString(),
    user:ctx.userName||'Local User',
    action,
    detail
  });
  // Cap at 200 entries
  if(state.auditLog.length>200)state.auditLog=state.auditLog.slice(-200);
  window.state=state;
}

export function getBonusPct(emp){if(!emp||!emp.seniority)return 10;return state.bonusMatrix[emp.seniority]?.[emp.function]??DEFAULT_BONUS[emp.seniority]??10}
export function getBonusAmt(emp){if(!emp)return 0;return Math.round((emp.salary||0)*getBonusPct(emp)/100)}
export function getBenefitsPct(emp){
  if(!emp||!emp.seniority)return 20;
  const base=state.benefitsMatrix[emp.seniority]?.[emp.function]??DEFAULT_BENEFITS[emp.seniority]??20;
  const countryMult=state.benefitsCountryMult[emp.country]??BENEFITS_COUNTRY_MULT[emp.country]??1;
  return Math.round(base*countryMult*10)/10;
}
export function getBenefitsAmt(emp){if(!emp)return 0;return Math.round((emp.salary||0)*getBenefitsPct(emp)/100)}
export function getTotalComp(emp){if(!emp)return 0;return (emp.salary||0)+getBonusAmt(emp)+getBenefitsAmt(emp)}

// Expose state and functions on window for existing inline onclick handlers
window.state = state;
window.loadState = loadState;
window.ensureStateFields = ensureStateFields;
window.saveState = saveState;
window.logAudit = logAudit;
window.getBonusPct = getBonusPct;
window.getBonusAmt = getBonusAmt;
window.getBenefitsPct = getBenefitsPct;
window.getBenefitsAmt = getBenefitsAmt;
window.getTotalComp = getTotalComp;

// Re-export state reference updater — after loadState() runs, window.state must be refreshed
export function getState() { return state; }
export function setState(newState) { state = newState; window.state = state; }
