// ── scenario.js — ES module extracted from index.html lines 9166–11345 ──
import { state, saveState } from '../lib/state.js';
import { fmt, esc, uid, CURRENT_YEAR, FUNCTIONS, COUNTRIES, SENIORITY, COUNTRY_BU, FORECAST_YEARS, VENDOR_TYPES, EXPENSE_TYPES } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx, getTotalComp, getBonusPct, getBonusAmt, getBenefitsPct, getBenefitsAmt } from '../lib/proration.js';

/* ── globals accessed via window (not yet modularised) ── */
const benchmark       = (...a) => window.benchmark(...a);
const projectForecast = (...a) => window.projectForecast(...a);
const getChartColors  = (...a) => window.getChartColors(...a);
const hexToRgba       = (...a) => window.hexToRgba(...a);
const getDisplayYears = (...a) => window.getDisplayYears(...a);
const getDisplayFcLabels = (...a) => window.getDisplayFcLabels(...a);
const displayYear     = (...a) => window.displayYear(...a);
const xlsxDownload    = (...a) => window.xlsxDownload(...a);
const renderAll       = (...a) => window.renderAll(...a);
const renderExecView  = (...a) => window.renderExecView(...a);
function refreshVendorPivot(){ if(window.refreshVendorPivot) window.refreshVendorPivot(); }
function refreshTePivot(){ if(window.refreshTePivot) window.refreshTePivot(); }
function refreshContractorPivot(){ if(window.refreshContractorPivot) window.refreshContractorPivot(); }

/* ── CDN globals (loaded externally, accessed via window) ── */
const XLSX = window.XLSX;
const Chart = window.Chart;


// ── SCENARIO ANALYSIS ──
let budgetScenario=null,forecastScenario=null;
let budgetChatHistory=[],fcChatHistory=[];
let scenBudgetSplit='none',scenBudgetView='total',scenFcSplit='total',scenFiltersLinked=false;
let scenBudgetChartInst=null,scenFcChartInst=null;
let budgetUndoStack=[],fcUndoStack=[];
let scenSelectedMonth=null;
let scenSelectedMonths=new Set();
let scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
let scenActionHistory=[]; // {id, cmd, scopedCmd, msg, delta, isRefinement, parentId}
let scenSelectedActionId=null;
let fcActionHistory=[];
let fcSelectedActionId=null;
let fcFilterState={product:new Set(),function:new Set(),country:new Set(),category:new Set(),account:new Set()};
let fcSelectedYear=null;
let fcVendorAdjMode='dollars';

function initBudgetScenario(){
  budgetScenario={
    emps:JSON.parse(JSON.stringify(state.employees)),
    vendorRows:JSON.parse(JSON.stringify(state.vendorRows||[])),
    teRows:JSON.parse(JSON.stringify(state.teRows||[]))
  };
}
function initForecastScenario(){
  // Use budget scenario employees as baseline when budget has been modified
  const baseEmps=budgetScenarioDirty&&budgetScenario?budgetScenario.emps:state.employees;
  const baseVendor=budgetScenarioDirty&&budgetScenario?budgetScenario.vendorRows:(state.vendorRows||[]);
  const baseTe=budgetScenarioDirty&&budgetScenario?budgetScenario.teRows:(state.teRows||[]);
  forecastScenario={
    emps:JSON.parse(JSON.stringify(baseEmps)),
    assumptions:JSON.parse(JSON.stringify(state.forecastAssumptions)),
    vendorRows:JSON.parse(JSON.stringify(baseVendor)),
    teRows:JSON.parse(JSON.stringify(baseTe))
  };
}

function computeBudgetPnl(emps,vRows,tRows){
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  let totalComp=0,totalCapex=0,totalOao=0;
  const monthly=MO.map((_,mi)=>{
    let comp=0,capex=0;
    emps.forEach(e=>{comp+=getMonthlyComp(e,mi);capex+=getMonthlyCapEx(e,mi)});
    const oao=(vRows||[]).reduce((s,r)=>s+(parseFloat(r[MO[mi]])||0),0)+(tRows||[]).reduce((s,r)=>s+(parseFloat(r[MO[mi]])||0),0);
    totalComp+=comp;totalCapex+=capex;totalOao+=oao;
    return {comp,opex:comp-capex,capex,oao,total:comp+oao};
  });
  const hc=emps.filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR).length;
  return {monthly,annual:{hc,comp:totalComp,opex:totalComp-totalCapex,capex:totalCapex,oao:totalOao,total:totalComp+totalOao}};
}

function computeForecastPnl(emps,assumptions){
  const origAssumptions=state.forecastAssumptions;
  state.forecastAssumptions=assumptions;
  const rows=projectForecast(emps);
  state.forecastAssumptions=origAssumptions;
  return rows;
}

function fmtDelta(label,before,after){
  const diff=after-before;const pct=before?Math.round(diff/before*100):0;
  const cls=diff<0?'down':diff>0?'up':'neutral';
  const sign=diff>0?'+':'';
  return `<div><span class="${cls}">${label}: ${typeof before==='number'&&before>999?fmt(before):before} → ${typeof after==='number'&&after>999?fmt(after):after} (${sign}${pct}%)</span></div>`;
}

function computeBudgetDelta(){
  const base=computeBudgetPnl(JSON.parse(JSON.stringify(state.employees)),state.vendorRows,state.teRows);
  const scen=computeBudgetPnl(budgetScenario.emps,budgetScenario.vendorRows,budgetScenario.teRows);
  let html='';
  html+=fmtDelta('HC',base.annual.hc,scen.annual.hc);
  html+=fmtDelta('Total Comp',base.annual.comp,scen.annual.comp);
  html+=fmtDelta('OpEx',base.annual.opex,scen.annual.opex);
  html+=fmtDelta('Vendor/T&E',base.annual.oao,scen.annual.oao);
  html+=fmtDelta('Total Spend',base.annual.total,scen.annual.total);
  // Group breakdown (collapsible)
  const groups={};
  FUNCTIONS.forEach(f=>{
    const bEmps=state.employees.filter(e=>e.function===f);const sEmps=budgetScenario.emps.filter(e=>e.function===f);
    if(bEmps.length||sEmps.length){
      const bComp=bEmps.reduce((s,e)=>s+getTotalComp(e),0);const sComp=sEmps.reduce((s,e)=>s+getTotalComp(e),0);
      if(bComp!==sComp||bEmps.length!==sEmps.length)groups[f]={bHc:bEmps.length,sHc:sEmps.length,bComp,sComp};
    }
  });
  if(Object.keys(groups).length){
    html+=`<details style="margin-top:4px;font-size:.72rem"><summary style="cursor:pointer;color:var(--text-dim)">Breakdown by function</summary>`;
    for(const [f,g] of Object.entries(groups)){
      const hcD=g.sHc-g.bHc;const compD=g.sComp-g.bComp;
      html+=`<div style="padding:1px 0;color:var(--text)">${f}: HC ${g.bHc}→${g.sHc}${hcD?` (${hcD>0?'+':''}${hcD})`:''}, Comp ${fmt(g.bComp)}→${fmt(g.sComp)}${compD?` (${compD>0?'+':''}${fmt(compD)})`:''}</div>`;
    }
    html+='</details>';
  }
  return html;
}

function fcVtAnnualTotal(vRows,tRows){
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  return (vRows||[]).concat(tRows||[]).reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
}
function fcVtProjected(vRows,tRows,assumptions,yearIdx){
  const base=fcVtAnnualTotal(vRows,tRows);
  const g=(assumptions.vendorGrowth||0)/100;
  return Math.round(base*Math.pow(1+g,yearIdx));
}
function computeFcDelta(){
  const baseRows=projectForecast(state.employees);
  const scenRows=computeForecastPnl(forecastScenario.emps,forecastScenario.assumptions);
  const lastBase=baseRows[baseRows.length-1]||{hc:0,total:0,opex:0};
  const lastScen=scenRows[scenRows.length-1]||{hc:0,total:0,opex:0};
  const lastYrIdx=FORECAST_YEARS.length;
  const baseVT=fcVtProjected(state.vendorRows,state.teRows,state.forecastAssumptions,lastYrIdx);
  const scenVT=fcVtProjected(forecastScenario.vendorRows,forecastScenario.teRows,forecastScenario.assumptions,lastYrIdx);
  let html='<div style="font-size:.72rem;color:var(--text-dim);margin-bottom:2px">By '+getDisplayYears()[4]+':</div>';
  html+=fmtDelta('HC',lastBase.hc,lastScen.hc);
  html+=fmtDelta('OpEx',lastBase.opex,lastScen.opex);
  html+=fmtDelta('Vendor/T&E',baseVT,scenVT);
  html+=fmtDelta('Total Inv',lastBase.total+baseVT,lastScen.total+scenVT);
  return html;
}

// ── Group resolver ──
function resolveGroup(text,emps){
  const raw=text.trim().toLowerCase();
  if(!raw)return null;
  if(raw==='all'||raw==='everyone')return e=>true;
  // Exclusion: "all except interns", "everyone except india"
  const exm=raw.match(/^(.+?)\s+(?:except|excluding|but not)\s+(.+)$/);
  if(exm){
    const mainFilter=resolveGroup(exm[1],emps);
    const exFilter=resolveGroup(exm[2],emps);
    if(mainFilter&&exFilter)return e=>mainFilter(e)&&!exFilter(e);
  }
  // Compound: try to extract multiple dimensions from the text
  // e.g. "senior software engineers in us"
  const countryAliases={'us':'United States','uk':'United Kingdom','ca':'Canada','de':'Germany','in':'India','au':'Australia','sg':'Singapore','nl':'Netherlands','br':'Brazil','pl':'Poland'};
  const funcAliases={'swe':'Software Engineering','software eng':'Software Engineering','data eng':'Data Engineering','devops':'DevOps/SRE','pm':'Product Management','qa':'QA Engineering','data sci':'Data Science','security':'Security Engineering','cloud':'Cloud Architecture','tpm':'Technical Program Management','it':'IT Operations'};
  let filters=[];let remaining=raw;
  // Extract "in [country]" pattern
  const inMatch=remaining.match(/\s+in\s+(.+)$/i);
  if(inMatch){
    const cText=inMatch[1].trim();
    const c=matchCountry(cText,countryAliases);
    if(c){filters.push(e=>e.country===c);remaining=remaining.replace(/\s+in\s+.+$/i,'').trim()}
  }
  // Try each token/phrase against known dimensions
  const parts=remaining.split(/\s+/);
  let used=new Set();
  // Try seniority
  for(let i=0;i<parts.length;i++){
    const chunk=parts.slice(i).join(' ');
    const sen=SENIORITY.find(s=>s.toLowerCase()===chunk||s.toLowerCase()===parts[i]||s.toLowerCase().startsWith(parts[i]));
    if(sen){filters.push(e=>e.seniority===sen);used.add(i);break}
  }
  // Try function (multi-word aware)
  for(let len=parts.length;len>0;len--){
    for(let i=0;i<=parts.length-len;i++){
      if(used.has(i))continue;
      const phrase=parts.slice(i,i+len).join(' ');
      let func=FUNCTIONS.find(f=>f.toLowerCase()===phrase||f.toLowerCase().includes(phrase));
      if(!func){for(const [alias,full] of Object.entries(funcAliases)){if(phrase.includes(alias)){func=full;break}}}
      if(func){filters.push(e=>e.function===func);for(let j=i;j<i+len;j++)used.add(j);break}
    }
    if(filters.some(f=>f._isFunc))break;
  }
  // Try country (if not already matched via "in")
  if(!filters.some(f=>f._isCountry)){
    for(let i=0;i<parts.length;i++){
      if(used.has(i))continue;
      const c=matchCountry(parts[i],countryAliases);
      if(c){const cf=e=>e.country===c;cf._isCountry=true;filters.push(cf);used.add(i);break}
    }
  }
  // Try business line
  for(let i=0;i<parts.length;i++){
    if(used.has(i))continue;
    const bl=state.bizLines.find(b=>b.name.toLowerCase().includes(parts[i])||b.code===parts[i]);
    if(bl){filters.push(e=>e.businessLine===bl.code);used.add(i);break}
  }
  if(filters.length>0)return e=>filters.every(f=>f(e));
  // Single-pass fallback for simple terms
  const c=matchCountry(raw,countryAliases);if(c)return e=>e.country===c;
  const sen=SENIORITY.find(s=>s.toLowerCase()===raw||s.toLowerCase().startsWith(raw));if(sen)return e=>e.seniority===sen;
  const func=FUNCTIONS.find(f=>f.toLowerCase()===raw||f.toLowerCase().includes(raw));if(func)return e=>e.function===func;
  for(const [alias,full] of Object.entries(funcAliases)){if(raw.includes(alias))return e=>e.function===full}
  const bl=state.bizLines.find(b=>b.name.toLowerCase().includes(raw)||b.code===raw);if(bl)return e=>e.businessLine===bl.code;
  return null;
}
function matchCountry(t,aliases){
  t=t.trim().toLowerCase();
  if(aliases[t])return aliases[t];
  return COUNTRIES.find(c=>c.toLowerCase()===t||c.toLowerCase().startsWith(t))||null;
}
function suggestGroups(text){
  const t=text.trim().toLowerCase();
  const all=[...COUNTRIES,...SENIORITY,...FUNCTIONS,...state.bizLines.map(b=>b.name)];
  const scored=all.map(g=>{const gl=g.toLowerCase();const dist=gl.includes(t)?0:t.includes(gl.slice(0,3))?1:levenshtein(t,gl);return {name:g,dist}});
  scored.sort((a,b)=>a.dist-b.dist);
  return scored.slice(0,3).filter(s=>s.dist<6).map(s=>s.name);
}
function levenshtein(a,b){
  const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>i);
  for(let j=1;j<=n;j++){let prev=d[0];d[0]=j;for(let i=1;i<=m;i++){const tmp=d[i];d[i]=Math.min(d[i-1]+1,d[i]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp}}
  return d[m];
}
function resolveVendorFilter(text,vRows,tRows){
  const t=text.trim().toLowerCase();
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  // Try vendorName
  let vf=vRows.filter(r=>(r.vendorName||'').toLowerCase().includes(t));
  if(vf.length)return {vFilter:r=>(r.vendorName||'').toLowerCase().includes(t),tFilter:()=>false,desc:`vendor "${text.trim()}"`,vCount:vf.length,tCount:0};
  // Try parentCo
  vf=vRows.filter(r=>(r.parentCo||'').toLowerCase().includes(t));
  if(vf.length)return {vFilter:r=>(r.parentCo||'').toLowerCase().includes(t),tFilter:()=>false,desc:`parent co "${text.trim()}"`,vCount:vf.length,tCount:0};
  // Try vendorType
  const vt=VENDOR_TYPES.find(v=>v.toLowerCase().includes(t));
  if(vt){const f=r=>(r.vendorType||'')===vt;const vc=vRows.filter(f).length;return {vFilter:f,tFilter:()=>false,desc:`type "${vt}"`,vCount:vc,tCount:0}}
  // Try acctDesc
  vf=vRows.filter(r=>(r.acctDesc||'').toLowerCase().includes(t));
  if(vf.length)return {vFilter:r=>(r.acctDesc||'').toLowerCase().includes(t),tFilter:()=>false,desc:`account "${text.trim()}"`,vCount:vf.length,tCount:0};
  // Try project
  const proj=state.projects.find(p=>p.code.toLowerCase().includes(t)||p.description.toLowerCase().includes(t)||(p.product||'').toLowerCase().includes(t));
  if(proj){const f=r=>r.project===proj.id;const vc=vRows.filter(f).length;const tc=tRows.filter(f).length;return {vFilter:f,tFilter:f,desc:`project "${proj.code}"`,vCount:vc,tCount:tc}}
  // Try expenseType (T&E)
  const et=['Airline','Hotel','Other Travel','Food/Events','Large Event','Other'].find(e=>e.toLowerCase().includes(t));
  if(et){const f=r=>(r.expenseType||'')===et;const tc=tRows.filter(f).length;return {vFilter:()=>false,tFilter:f,desc:`T&E type "${et}"`,vCount:0,tCount:tc}}
  // Try bizLine
  const bl=state.bizLines.find(b=>b.name.toLowerCase().includes(t)||b.code===t);
  if(bl){const f=r=>r.bizLine===bl.code;const vc=vRows.filter(f).length;const tc=tRows.filter(f).length;return {vFilter:f,tFilter:f,desc:`biz line "${bl.name}"`,vCount:vc,tCount:tc}}
  // Try market
  const mk=(state.markets||[]).find(m=>m.name.toLowerCase().includes(t)||m.code.toLowerCase().includes(t));
  if(mk){const f=r=>r.market===mk.code;const vc=vRows.filter(f).length;const tc=tRows.filter(f).length;return {vFilter:f,tFilter:f,desc:`market "${mk.name}"`,vCount:vc,tCount:tc}}
  return null;
}

// ── Command Synonym Normalizer ──
function normalizeCommand(text){
  const synonyms=[
    [/\b(?:layoff|lay off|let go|downsize|rif)\b/gi,'reduce'],
    [/\b(?:slash|trim)\b/gi,'cut'],
    [/\b(?:bump)\b/gi,'increase'],
    [/\b(?:bring on|onboard)\b/gi,'add'],
    [/\b(?:pause|stop)\s+(?:hiring|hires)\b/gi,'freeze hiring'],
    [/\b(?:cap rate|capitalization rate)\b/gi,'cap%'],
    [/\b(?:cost of living|cola|inflation)\b/gi,'market rate growth'],
    [/\bheadcount\b/gi,'headcount'],
    [/\bhc\b/gi,'headcount']
  ];
  let t=text;
  synonyms.forEach(([re,rep])=>t=t.replace(re,rep));
  return t;
}

// ── Budget Command Parser ──
function parseBudgetCommand(text){
  text=normalizeCommand(text);
  const emps=budgetScenario.emps;
  let m;
  // Reset
  if(/^reset$/i.test(text.trim())){initBudgetScenario();return {msg:'Scenario reset to baseline.',ok:true}}
  function groupErr(g){const s=suggestGroups(g);return `Could not identify group "${g}".`+(s.length?` Did you mean: ${s.join(', ')}?`:' Try a country, seniority, or function name.')}
  // Reduce headcount by X%
  m=text.match(/(?:reduce|cut|decrease)\s+(.+?)\s+headcount\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseFloat(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    const matching=emps.filter(filter);const toRemove=Math.round(matching.length*pct/100);
    // If a month is selected in the refinement panel, set term date instead of removing
    if(scenSelectedMonth!==null&&scenSelectedMonth!==undefined){
      const mo=String(scenSelectedMonth+1).padStart(2,'0');
      const lastDay=new Date(CURRENT_YEAR,scenSelectedMonth+1,0).getDate();
      const termDate=`${CURRENT_YEAR}-${mo}-${String(lastDay).padStart(2,'0')}`;
      const shuffled=[...matching].sort(()=>Math.random()-0.5).slice(0,toRemove);
      shuffled.forEach(e=>{e.termDate=termDate});
      return {msg:`Set termination date ${termDate} for ${toRemove} of ${matching.length} matching employees (${pct}% of ${m[1]}).`,ok:true};
    }
    for(let i=0;i<toRemove;i++){const idx=emps.findIndex(filter);if(idx>=0)emps.splice(idx,1)}
    return {msg:`Removed ${toRemove} of ${matching.length} matching employees (${pct}% of ${m[1]}).`,ok:true};
  }
  // Increase/cut salary by X%
  m=text.match(/(?:increase|raise|boost)\s+(.+?)\s+salary\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseFloat(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.salary=Math.round(e.salary*(1+pct/100));count++}});
    return {msg:`Increased salary by ${pct}% for ${count} employees.`,ok:true};
  }
  m=text.match(/(?:cut|reduce|decrease)\s+(.+?)\s+salary\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseFloat(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.salary=Math.round(e.salary*(1-pct/100));count++}});
    return {msg:`Reduced salary by ${pct}% for ${count} employees.`,ok:true};
  }
  // Convert/shift X% of [group] to [function] (functional structure change)
  m=text.match(/(?:convert|shift|transition)\s+(\d+\.?\d*)%\s+(?:of\s+)?(.+?)\s+to\s+(software engineering|data engineering|devops(?:\/sre)?|product management|qa engineering|data science|it operations|security engineering|cloud architecture|technical program management)/i);
  if(m){
    const pct=parseFloat(m[1]);const filter=resolveGroup(m[2],emps);
    if(!filter)return {msg:groupErr(m[2]),ok:false};
    const targetFunc=FUNCTIONS.find(f=>f.toLowerCase().startsWith(m[3].trim().toLowerCase()))||m[3].trim();
    const matched=emps.filter(e=>filter(e));const count=Math.round(matched.length*pct/100);
    if(!count)return {msg:`No employees matched or 0% selected.`,ok:false};
    // Shuffle to randomize who gets converted
    const shuffled=[...matched].sort(()=>Math.random()-0.5).slice(0,count);
    shuffled.forEach(e=>{e.function=targetFunc;e.salary=benchmark(e.seniority,targetFunc,e.country)});
    return {msg:`Converted ${count} employees to ${targetFunc}, salaries recalculated via benchmark.`,ok:true};
  }
  // Promote/demote [group] to [seniority]
  m=text.match(/(?:promote|demote)\s+(.+?)\s+to\s+(.+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    const newSen=SENIORITY.find(s=>s.toLowerCase()===m[2].trim().toLowerCase()||s.toLowerCase().startsWith(m[2].trim().toLowerCase()));
    if(!newSen)return {msg:`Unknown seniority "${m[2]}". Options: ${SENIORITY.join(', ')}`,ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.seniority=newSen;e.salary=benchmark(newSen,e.function,e.country);count++}});
    return {msg:`Changed ${count} employees to ${newSen}, salaries recalculated.`,ok:true};
  }
  // Set [group] salary to $X
  m=text.match(/set\s+(.+?)\s+salary\s+to\s+\$?([\d,]+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    const amount=parseInt(m[2].replace(/,/g,''));
    let count=0;emps.forEach(e=>{if(filter(e)){e.salary=amount;count++}});
    return {msg:`Set salary to ${fmt(amount)} for ${count} employees.`,ok:true};
  }
  // Set [group] bonus to X%
  m=text.match(/set\s+(.+?)\s+bonus\s+to\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseFloat(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.bonusOverride=pct;count++}});
    return {msg:`Set bonus to ${pct}% for ${count} employees.`,ok:true};
  }
  // Set [group] benefits to X%
  m=text.match(/set\s+(.+?)\s+benefits\s+to\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseFloat(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.benefitsOverride=pct;count++}});
    return {msg:`Set benefits to ${pct}% for ${count} employees.`,ok:true};
  }
  // Move [group] to project [code]
  m=text.match(/move\s+(.+?)\s+to\s+project\s+(.+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    const proj=state.projects.find(p=>p.code.toLowerCase()===m[2].trim().toLowerCase()||p.description.toLowerCase().includes(m[2].trim().toLowerCase()));
    if(!proj)return {msg:`Unknown project "${m[2]}". Check project codes.`,ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.allocations=[{projId:proj.id,pct:100}];count++}});
    return {msg:`Moved ${count} employees to project ${proj.code} (100% allocation).`,ok:true};
  }
  // Cut [expense type] T&E by X%
  m=text.match(/cut\s+(airline|hotel|travel|food|event|other)\s+t&?e\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const typeMap={'airline':'Airline','hotel':'Hotel','travel':'Other Travel','food':'Food/Events','event':'Large Event','other':'Other'};
    const et=typeMap[m[1].toLowerCase()]||m[1];const pct=parseFloat(m[2]);const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    let count=0;budgetScenario.teRows.forEach(r=>{if((r.expenseType||'')===et){MO.forEach(mo=>{r[mo]=Math.round((parseFloat(r[mo])||0)*(1-pct/100))});count++}});
    return {msg:`Reduced ${et} T&E by ${pct}% across ${count} rows.`,ok:true};
  }
  // Set hiring ramp
  m=text.match(/set\s+hiring\s+ramp\s+to\s+(\d+)\s+per\s+(quarter|month)/i);
  if(m){
    const num=parseInt(m[1]);const period=m[2].toLowerCase();
    const perMonth=period==='quarter'?num/3:num;const total=Math.round(perMonth*12);
    // Distribute new hires across remaining months
    const startMonth=new Date().getMonth();
    for(let mo=startMonth;mo<12;mo++){
      const hiresThisMonth=Math.round(perMonth);
      for(let i=0;i<hiresThisMonth;i++){
        const template=emps[0]||{seniority:'Mid',function:'Software Engineering',country:'United States'};
        const hireDate=`${CURRENT_YEAR}-${String(mo+1).padStart(2,'0')}-01`;
        const _gp=state.projects.find(p=>p.code==='GEN-000');
        emps.push({id:uid(),name:`New Hire ${mo+1}-${i+1}`,country:template.country,seniority:template.seniority,function:template.function,salary:benchmark(template.seniority,template.function,template.country),capPct:template.capPct||0,notes:'Hiring ramp',hireDate,termDate:'',businessLine:template.businessLine||'',businessUnit:template.businessUnit||'',allocations:_gp?[{projId:_gp.id,pct:100,primary:true}]:[]});
      }
    }
    return {msg:`Set hiring ramp: ${num} per ${period} (${total} annualized). Added hires for remaining months.`,ok:true};
  }
  // Swap X% country1 for Y% country2 [and Z% country3]
  m=text.match(/swap\s+(\d+)%\s+(.+?)\s+for\s+(\d+)%\s+(.+?)(?:\s+and\s+(\d+)%\s+(.+))?$/i);
  if(m){
    const srcFilter=resolveGroup(m[2],emps);const pctRemove=parseInt(m[1]);
    if(!srcFilter)return {msg:`Could not identify source group "${m[2]}".`,ok:false};
    const srcEmps=emps.filter(srcFilter);const toRemove=Math.round(srcEmps.length*pctRemove/100);
    // Build replacement targets
    const targets=[{pct:parseInt(m[3]),group:m[4]}];
    if(m[5]&&m[6])targets.push({pct:parseInt(m[5]),group:m[6]});
    // Remove source employees
    const removed=[];
    for(let i=0;i<toRemove;i++){const idx=emps.findIndex(srcFilter);if(idx>=0)removed.push(...emps.splice(idx,1))}
    // Add replacements
    let added=0;
    targets.forEach(tgt=>{
      const country=COUNTRIES.find(c=>c.toLowerCase().includes(tgt.group.trim().toLowerCase()))||tgt.group.trim();
      const numAdd=Math.round(srcEmps.length*tgt.pct/100);
      for(let i=0;i<numAdd;i++){
        const template=removed[i%removed.length]||srcEmps[0];
        emps.push({...JSON.parse(JSON.stringify(template)),id:uid(),name:`New ${country} ${i+1}`,country,salary:benchmark(template.seniority,template.function,country),businessUnit:COUNTRY_BU[country]||''});
        added++;
      }
    });
    return {msg:`Removed ${removed.length} from ${m[2]}, added ${added} replacements.`,ok:true};
  }
  // Shift hire dates
  m=text.match(/shift\s+(?:all\s+)?hire\s+dates?\s+to\s+(\S+)/i);
  if(m){
    const dateStr=m[1];let newDate;
    if(/^\d{1,2}\/\d{1,2}$/.test(dateStr)){newDate=CURRENT_YEAR+'-'+dateStr.split('/').map(p=>p.padStart(2,'0')).join('-')}
    else{newDate=dateStr}
    let count=0;emps.forEach(e=>{if(e.hireDate){e.hireDate=newDate;count++}else{e.hireDate=newDate;count++}});
    return {msg:`Shifted hire dates to ${newDate} for ${count} employees.`,ok:true};
  }
  // Remove all [group]
  m=text.match(/remove\s+all\s+(.+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);
    if(!filter)return {msg:`Could not identify group "${m[1]}".`,ok:false};
    const before=emps.length;budgetScenario.emps=emps.filter(e=>!filter(e));
    return {msg:`Removed ${before-budgetScenario.emps.length} employees.`,ok:true};
  }
  // Add X [seniority] [function] in [country]
  m=text.match(/add\s+(\d+)\s+(.+?)\s+((?:software|data|devops|product|qa|cloud|security|technical|it)\S*(?:\s+\S+)?)\s+in\s+(.+)/i);
  if(m){
    const num=parseInt(m[1]);const sen=SENIORITY.find(s=>s.toLowerCase().startsWith(m[2].trim().toLowerCase()))||m[2].trim();
    const func=FUNCTIONS.find(f=>f.toLowerCase().includes(m[3].trim().toLowerCase()))||m[3].trim();
    const country=COUNTRIES.find(c=>c.toLowerCase().includes(m[4].trim().toLowerCase()))||m[4].trim();
    for(let i=0;i<num;i++){
      const _gp2=state.projects.find(p=>p.code==='GEN-000');
      emps.push({id:uid(),name:`New ${sen} ${i+1}`,country,seniority:sen,function:func,salary:benchmark(sen,func,country),capPct:0,notes:'Scenario',hireDate:'',termDate:'',businessLine:state.bizLines[0]?.code||'',businessUnit:COUNTRY_BU[country]||'',allocations:_gp2?[{projId:_gp2.id,pct:100,primary:true}]:[]});
    }
    return {msg:`Added ${num} ${sen} ${func} in ${country} at ${fmt(benchmark(sen,func,country))} each.`,ok:true};
  }
  // Cut vendor/T&E spend (smart targeting)
  m=text.match(/cut\s+(?:all\s+)?vendor\s+spend\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const pct=parseFloat(m[1]);const activeMo=getScenActiveMonths();
    const hasAcct=scenFilterState.account.size>0;
    budgetScenario.vendorRows.forEach(r=>{if(!hasAcct||matchesScenAcctFilter(r)){activeMo.forEach(mo=>{r[mo]=Math.round((parseFloat(r[mo])||0)*(1-pct/100))})}});
    const moNote=scenSelectedMonths.size?` (${activeMo.length} months)`:'';
    const acctNote=hasAcct?` [${[...scenFilterState.account].join(', ')}]`:'';
    return {msg:`Reduced all vendor spend by ${pct}%${moNote}${acctNote}.`,ok:true};
  }
  m=text.match(/cut\s+(.+?)\s+(?:spend|vendor|t&?e)\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const target=m[1].trim();const pct=parseFloat(m[2]);const activeMo=getScenActiveMonths();
    const hasAcct=scenFilterState.account.size>0;
    const vf=resolveVendorFilter(target,budgetScenario.vendorRows,budgetScenario.teRows);
    if(!vf)return {msg:`Could not match "${target}" to any vendor, parent co, type, account, project, or T&E category.`,ok:false};
    let vCount=0,tCount=0;
    budgetScenario.vendorRows.forEach(r=>{if(vf.vFilter(r)&&(!hasAcct||matchesScenAcctFilter(r))){activeMo.forEach(mo=>{r[mo]=Math.round((parseFloat(r[mo])||0)*(1-pct/100))});vCount++}});
    budgetScenario.teRows.forEach(r=>{if(vf.tFilter(r)&&(!hasAcct||scenFilterState.account.has(r.acctDesc))){activeMo.forEach(mo=>{r[mo]=Math.round((parseFloat(r[mo])||0)*(1-pct/100))});tCount++}});
    const moNote=scenSelectedMonths.size?` (${activeMo.length} months)`:'';
    const acctNote=hasAcct?` [${[...scenFilterState.account].join(', ')}]`:'';
    return {msg:`Reduced ${vf.desc} spend by ${pct}% (${vCount} vendor + ${tCount} T&E rows)${moNote}${acctNote}.`,ok:true};
  }
  // Set cap% (with optional group)
  m=text.match(/set\s+(.+?)\s+cap\s*%?\s+to\s+(\d+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const pct=parseInt(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=pct;count++}});
    return {msg:`Set capitalization to ${pct}% for ${count} employees.`,ok:true};
  }
  m=text.match(/set\s+cap\s*%?\s+to\s+(\d+)/i);
  if(m){
    const pct=parseInt(m[1]);let count=0;emps.forEach(e=>{e.capPct=pct;count++});
    return {msg:`Set capitalization to ${pct}% for ${count} employees.`,ok:true};
  }
  // Increase/decrease cap%
  m=text.match(/(?:increase|raise)\s+(.+?)\s+cap\s*%?\s+by\s+(\d+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const delta=parseInt(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=Math.min(100,(parseFloat(e.capPct)||0)+delta);count++}});
    return {msg:`Increased cap% by ${delta}pp for ${count} employees.`,ok:true};
  }
  m=text.match(/(?:reduce|decrease|cut)\s+(.+?)\s+cap\s*%?\s+by\s+(\d+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const delta=parseInt(m[2]);
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=Math.max(0,(parseFloat(e.capPct)||0)-delta);count++}});
    return {msg:`Decreased cap% by ${delta}pp for ${count} employees.`,ok:true};
  }
  // Increase/decrease capitalization by x% (relative/multiplicative)
  m=text.match(/(?:increase|raise)\s+(?:(.+?)\s+)?capitalization\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=m[1]?resolveGroup(m[1],emps):null;const pct=parseFloat(m[2]);
    if(m[1]&&!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(!filter||filter(e)){const cur=parseFloat(e.capPct)||0;e.capPct=Math.min(100,cur*(1+pct/100));count++}});
    return {msg:`Increased capitalization by ${pct}% for ${count} employees.`,ok:true};
  }
  m=text.match(/(?:reduce|decrease|cut)\s+(?:(.+?)\s+)?capitalization\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=m[1]?resolveGroup(m[1],emps):null;const pct=parseFloat(m[2]);
    if(m[1]&&!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(!filter||filter(e)){const cur=parseFloat(e.capPct)||0;e.capPct=Math.max(0,cur*(1-pct/100));count++}});
    return {msg:`Decreased capitalization by ${pct}% for ${count} employees.`,ok:true};
  }
  // Terminate group on date
  m=text.match(/terminate\s+(.+?)\s+on\s+(\S+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const date=m[2];
    if(!filter)return {msg:groupErr(m[1]),ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.termDate=date;count++}});
    return {msg:`Set termination date to ${date} for ${count} employees.`,ok:true};
  }
  return {msg:`I didn't understand that. Try commands like:\n• "reduce [group] headcount by X%"\n• "promote [group] to [seniority]"\n• "convert X% of [group] to [function]"\n• "set [group] salary to $X"\n• "set [group] bonus to X%"\n• "cut [vendor/type/account] spend by X%"\n• "cut [airline/hotel] T&E by X%"\n• "swap X% [country] for Y% [country]"\n• "move [group] to project [code]"\n• "add X [seniority] [function] in [country]"`,ok:false};
}

// ── Forecast Command Parser ──
function parseForecastCommand(text){
  text=normalizeCommand(text);
  const emps=forecastScenario.emps;
  const fa=forecastScenario.assumptions;
  let m;
  if(/^reset$/i.test(text.trim())){initForecastScenario();return {msg:'Forecast scenario reset to baseline.',ok:true}}
  // Set [metric] to X% in YYYY (single-year override)
  m=text.match(/set\s+(merit|attrition|hires?|cap\s*%?|capitalization)\s+to\s+(\d+\.?\d*)%?\s+in\s+(\d{4})/i);
  if(m){
    const metric=m[1].toLowerCase().replace(/\s+/g,'');const v=parseFloat(m[2]);const yr=parseInt(m[3]);
    const dYears=getDisplayYears();
    let yi=dYears.indexOf(yr);
    if(yi<0)yi=FORECAST_YEARS.indexOf(yr);
    if(yi<0)return {msg:`Year ${yr} not in forecast range (${dYears[0]}-${dYears[4]}).`,ok:false};
    if(metric.includes('merit')){fa.merit[yi]=v;fa.toggles.merit=true;return {msg:`Set merit to ${v}% in ${yr}.`,ok:true}}
    if(metric.includes('attrition')){fa.attrition[yi]=v;fa.toggles.attrition=true;return {msg:`Set attrition to ${v}% in ${yr}.`,ok:true}}
    if(metric.includes('hire')){fa.hires[yi]=v;fa.toggles.hires=true;return {msg:`Set hires to ${v} in ${yr}.`,ok:true}}
    if(metric.includes('cap')){fa.capitalization[yi]=v;fa.toggles.capitalization=true;return {msg:`Set capitalization to ${v}% in ${yr}.`,ok:true}}
  }
  // Reduce headcount by X% in specific year (not thru)
  m=text.match(/(?:reduce|cut|decrease)\s+(.+?)\s+(?:headcount)\s+by\s+(\d+\.?\d*)%\s+in\s+(\d{4})/i);
  if(m){
    const pct=parseFloat(m[2]);const yr=parseInt(m[3]);
    const yi=FORECAST_YEARS.indexOf(yr);
    if(yi<0)return {msg:`Year ${yr} not in forecast range.`,ok:false};
    fa.attrition[yi]=Math.min(100,fa.attrition[yi]+pct);fa.toggles.attrition=true;
    return {msg:`Increased attrition by ${pct}% in ${yr} only.`,ok:true};
  }
  // Reduce headcount by X% thru year
  m=text.match(/(?:reduce|cut|decrease)\s+(.+?)\s+(?:headcount)\s+by\s+(\d+\.?\d*)%(?:\s+thru\s+(\d{4}))?/i);
  if(m){
    const pct=parseFloat(m[2]);const thruYear=m[3]?parseInt(m[3]):getDisplayYears()[4];
    // Increase attrition to achieve this reduction
    FORECAST_YEARS.forEach((y,i)=>{if(y<=thruYear)fa.attrition[i]=Math.min(100,fa.attrition[i]+pct)});
    fa.toggles.attrition=true;
    // Also reduce starting headcount if group specified
    if(m[1].toLowerCase()!=='all'&&m[1].toLowerCase()!=='overall'){
      const filter=resolveGroup(m[1],emps);
      if(filter){
        const matching=emps.filter(filter);const toRemove=Math.round(matching.length*pct/100);
        for(let i=0;i<toRemove;i++){const idx=emps.findIndex(filter);if(idx>=0)emps.splice(idx,1)}
      }
    }
    return {msg:`Increased attrition by ${pct}% thru ${thruYear} to model headcount reduction.`,ok:true};
  }
  // Set merit to X%
  m=text.match(/set\s+merit\s+to\s+(\d+\.?\d*)%/i);
  if(m){const v=parseFloat(m[1]);fa.merit=fa.merit.map(()=>v);fa.toggles.merit=true;return {msg:`Set merit to ${v}% for all years.`,ok:true}}
  // Increase merit by X%
  m=text.match(/(?:increase|raise)\s+merit\s+by\s+(\d+\.?\d*)%/i);
  if(m){const add=parseFloat(m[1]);fa.merit=fa.merit.map(v=>v+add);fa.toggles.merit=true;return {msg:`Increased merit by ${add}% across all forecast years.`,ok:true}}
  // Set attrition to X%
  m=text.match(/set\s+attrition\s+to\s+(\d+)%?/i);
  if(m){const v=parseInt(m[1]);fa.attrition=fa.attrition.map(()=>v);fa.toggles.attrition=true;return {msg:`Set attrition to ${v}% for all years.`,ok:true}}
  // Set hires to X per month
  m=text.match(/set\s+hires?\s+to\s+(\d+)\s+per\s+month/i);
  if(m){const v=parseInt(m[1])*12;fa.hires=fa.hires.map(()=>v);fa.toggles.hires=true;return {msg:`Set hires to ${m[1]} per month (${v}/year) for all years.`,ok:true}}
  // Set hires to X per quarter
  m=text.match(/set\s+hires?\s+to\s+(\d+)\s+per\s+quarter/i);
  if(m){const v=parseInt(m[1])*4;fa.hires=fa.hires.map(()=>v);fa.toggles.hires=true;return {msg:`Set hires to ${m[1]} per quarter (${v}/year) for all years.`,ok:true}}
  // Set hires to X
  m=text.match(/set\s+hires?\s+to\s+(\d+)/i);
  if(m){const v=parseInt(m[1]);fa.hires=fa.hires.map(()=>v);fa.toggles.hires=true;return {msg:`Set annual hires to ${v} for all years.`,ok:true}}
  // Freeze hiring
  if(/freeze\s+hir/i.test(text)){fa.hires=fa.hires.map(()=>0);fa.toggles.hires=true;return {msg:'Hiring frozen — 0 new hires across all forecast years.',ok:true}}
  // Convert/shift X% of [group] to [function]
  m=text.match(/(?:convert|shift|transition)\s+(\d+\.?\d*)%\s+(?:of\s+)?(.+?)\s+to\s+(software engineering|data engineering|devops(?:\/sre)?|product management|qa engineering|data science|it operations|security engineering|cloud architecture|technical program management)/i);
  if(m){
    const pct=parseFloat(m[1]);const filter=resolveGroup(m[2],emps);
    if(!filter)return {msg:`Could not identify group "${m[2]}".`,ok:false};
    const targetFunc=FUNCTIONS.find(f=>f.toLowerCase().startsWith(m[3].trim().toLowerCase()))||m[3].trim();
    const matched=emps.filter(e=>filter(e));const count=Math.round(matched.length*pct/100);
    if(!count)return {msg:`No employees matched or 0% selected.`,ok:false};
    const shuffled=[...matched].sort(()=>Math.random()-0.5).slice(0,count);
    shuffled.forEach(e=>{e.function=targetFunc;e.salary=benchmark(e.seniority,targetFunc,e.country)});
    return {msg:`Converted ${count} employees to ${targetFunc} in forecast baseline, salaries recalculated.`,ok:true};
  }
  // Swap countries (same as budget but on forecast emps)
  m=text.match(/swap\s+(\d+)%\s+(.+?)\s+for\s+(\d+)%\s+(.+?)(?:\s+and\s+(\d+)%\s+(.+))?$/i);
  if(m){
    const srcFilter=resolveGroup(m[2],emps);const pctRemove=parseInt(m[1]);
    if(!srcFilter)return {msg:`Could not identify source group "${m[2]}".`,ok:false};
    const srcEmps=emps.filter(srcFilter);const toRemove=Math.round(srcEmps.length*pctRemove/100);
    const targets=[{pct:parseInt(m[3]),group:m[4]}];
    if(m[5]&&m[6])targets.push({pct:parseInt(m[5]),group:m[6]});
    const removed=[];
    for(let i=0;i<toRemove;i++){const idx=emps.findIndex(srcFilter);if(idx>=0)removed.push(...emps.splice(idx,1))}
    let added=0;
    targets.forEach(tgt=>{
      const country=COUNTRIES.find(c=>c.toLowerCase().includes(tgt.group.trim().toLowerCase()))||tgt.group.trim();
      const numAdd=Math.round(srcEmps.length*tgt.pct/100);
      for(let i=0;i<numAdd;i++){
        const template=removed[i%removed.length]||srcEmps[0];
        emps.push({...JSON.parse(JSON.stringify(template)),id:uid(),name:`New ${country} ${i+1}`,country,salary:benchmark(template.seniority,template.function,country),businessUnit:COUNTRY_BU[country]||''});
        added++;
      }
    });
    return {msg:`Removed ${removed.length} from ${m[2]}, added ${added} replacements in forecast base.`,ok:true};
  }
  // Set cap% (with optional group)
  m=text.match(/set\s+(.+?)\s+cap\s*%?\s+to\s+(\d+)/i);
  if(m&&m[1].toLowerCase()!=='all'){
    const filter=resolveGroup(m[1],emps);const pct=parseInt(m[2]);
    if(filter){let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=pct;count++}});return {msg:`Set capitalization to ${pct}% for ${count} forecast employees.`,ok:true}}
  }
  m=text.match(/(?:set)\s+cap\s*%?\s+to\s+(\d+)/i);
  if(m){const v=parseInt(m[1]);fa.capitalization=fa.capitalization.map(()=>v);fa.toggles.capitalization=true;return {msg:`Set capitalization to ${v}% across all forecast years.`,ok:true}}
  // Increase/decrease cap%
  m=text.match(/(?:increase|raise)\s+(.+?)\s+cap\s*%?\s+by\s+(\d+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const delta=parseInt(m[2]);
    if(!filter)return {msg:`Could not identify group "${m[1]}".`,ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=Math.min(100,(parseFloat(e.capPct)||0)+delta);count++}});
    return {msg:`Increased cap% by ${delta}pp for ${count} forecast employees.`,ok:true};
  }
  m=text.match(/(?:reduce|decrease|cut)\s+(.+?)\s+cap\s*%?\s+by\s+(\d+)/i);
  if(m){
    const filter=resolveGroup(m[1],emps);const delta=parseInt(m[2]);
    if(!filter)return {msg:`Could not identify group "${m[1]}".`,ok:false};
    let count=0;emps.forEach(e=>{if(filter(e)){e.capPct=Math.max(0,(parseFloat(e.capPct)||0)-delta);count++}});
    return {msg:`Decreased cap% by ${delta}pp for ${count} forecast employees.`,ok:true};
  }
  // Increase/decrease capitalization by x% (relative/multiplicative)
  m=text.match(/(?:increase|raise)\s+(?:(.+?)\s+)?capitalization\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=m[1]?resolveGroup(m[1],emps):null;const pct=parseFloat(m[2]);
    if(m[1]&&!filter)return {msg:`Could not identify group "${m[1]}".`,ok:false};
    let count=0;emps.forEach(e=>{if(!filter||filter(e)){const cur=parseFloat(e.capPct)||0;e.capPct=Math.min(100,cur*(1+pct/100));count++}});
    return {msg:`Increased capitalization by ${pct}% for ${count} forecast employees.`,ok:true};
  }
  m=text.match(/(?:reduce|decrease|cut)\s+(?:(.+?)\s+)?capitalization\s+by\s+(\d+\.?\d*)%/i);
  if(m){
    const filter=m[1]?resolveGroup(m[1],emps):null;const pct=parseFloat(m[2]);
    if(m[1]&&!filter)return {msg:`Could not identify group "${m[1]}".`,ok:false};
    let count=0;emps.forEach(e=>{if(!filter||filter(e)){const cur=parseFloat(e.capPct)||0;e.capPct=Math.max(0,cur*(1-pct/100));count++}});
    return {msg:`Decreased capitalization by ${pct}% for ${count} forecast employees.`,ok:true};
  }
  // Vendor spend forecast commands
  m=text.match(/(?:grow|increase)\s+vendor\s+spend\s+by\s+(\d+\.?\d*)%\s+annually/i);
  if(m){const pct=parseFloat(m[1]);if(!fa.vendorGrowth)fa.vendorGrowth=0;fa.vendorGrowth=pct;return {msg:`Set annual vendor spend growth to +${pct}%.`,ok:true}}
  m=text.match(/(?:cut|reduce|decrease)\s+vendor\s+spend\s+by\s+(\d+\.?\d*)%\s+annually/i);
  if(m){const pct=parseFloat(m[1]);if(!fa.vendorGrowth)fa.vendorGrowth=0;fa.vendorGrowth=-pct;return {msg:`Set annual vendor spend change to -${pct}%.`,ok:true}}
  if(/freeze\s+vendor/i.test(text)){fa.vendorGrowth=0;return {msg:'Vendor spend frozen at current levels for all forecast years.',ok:true}}
  // Set AI productivity
  m=text.match(/set\s+ai\s+(?:productivity|gear|factor)\s+to\s+(\d+\.?\d*)/i);
  if(m){let v=parseFloat(m[1]);if(v>1){return {msg:`AI productivity factor must be between 0 and 1 (e.g. 0.7 = 30% fewer hires needed). Values above 1 are not valid since AI reduces headcount needs.`,ok:false}}v=Math.max(0,v);fa.ai=fa.ai.map(()=>v);fa.toggles.ai=true;return {msg:`Set AI productivity factor to ${v}x for all years (${Math.round((1-v)*100)}% hiring reduction).`,ok:true}}
  // What is current metric
  m=text.match(/what\s+is\s+(?:the\s+)?(?:current|baseline)\s+(.+)/i);
  if(m){
    const metric=m[1].trim().toLowerCase();
    const baseRows=projectForecast(state.employees);
    const cur=baseRows[0]||{};
    if(metric.includes('hc')||metric.includes('headcount'))return {msg:`Baseline headcount: ${cur.hc}`,ok:true};
    if(metric.includes('comp')||metric.includes('total'))return {msg:`Baseline total compensation: ${fmt(cur.total)}`,ok:true};
    if(metric.includes('opex'))return {msg:`Baseline OpEx: ${fmt(cur.opex)}`,ok:true};
    if(metric.includes('capex'))return {msg:`Baseline CapEx: ${fmt(cur.capex)}`,ok:true};
    return {msg:`Baseline HC: ${cur.hc}, Total: ${fmt(cur.total)}, OpEx: ${fmt(cur.opex)}, CapEx: ${fmt(cur.capex)}`,ok:true};
  }
  return {msg:`I didn't understand that. Try commands like:\n• "reduce [group] headcount by X% thru [year]"\n• "freeze hiring"\n• "set attrition to X%"\n• "set merit to X%" / "increase merit by X%"\n• "set hires to X per quarter"\n• "set ai productivity to Xx"\n• "what is current headcount"`,ok:false};
}

// ── Chart Renderers ──
function renderBudgetScenarioChart(){
  if(typeof Chart==='undefined')return;
  if(!budgetScenario)initBudgetScenario();
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#ffffff'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const emps=budgetScenario.emps;
  const datasets=[];
  const bsc=getChartColors();
  if(scenBudgetSplit==='none'){
    const opexData=MO_SHORT.map((_,mi)=>{let v=0;emps.forEach(e=>{v+=getMonthlyComp(e,mi)-getMonthlyCapEx(e,mi)});return v});
    const capexData=MO_SHORT.map((_,mi)=>{let v=0;emps.forEach(e=>{v+=getMonthlyCapEx(e,mi)});return v});
    const oaoData=MO_SHORT.map((_,mi)=>{
      const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      return (budgetScenario.vendorRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0)+(budgetScenario.teRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
    });
    if(scenBudgetView==='pnl'){
      datasets.push({label:'C&B OpEx',data:opexData,backgroundColor:bsc[1],stack:'pos'});
      datasets.push({label:'Vendor/T&E',data:oaoData,backgroundColor:bsc[2],stack:'pos'});
      datasets.push({label:'CapEx',data:capexData.map(v=>-v),backgroundColor:hexToRgba(bsc[0],0.5),stack:'neg'});
    } else {
      datasets.push({label:'C&B OpEx',data:opexData,backgroundColor:bsc[1]});
      datasets.push({label:'CapEx',data:capexData,backgroundColor:bsc[0]});
      datasets.push({label:'Vendor/T&E',data:oaoData,backgroundColor:bsc[2]});
    }
  } else {
    const groups={};
    emps.forEach(e=>{
      const key=scenBudgetSplit==='function'?e.function:e.country;
      if(!groups[key])groups[key]=[];groups[key].push(e);
    });
    Object.keys(groups).sort().forEach((g,gi)=>{
      const data=MO_SHORT.map((_,mi)=>groups[g].reduce((s,e)=>s+getMonthlyComp(e,mi),0));
      datasets.push({label:g,data,backgroundColor:bsc[gi%bsc.length]});
    });
  }
  const canvas=document.getElementById('scenBudgetChart');
  if(scenBudgetChartInst){scenBudgetChartInst.destroy()}
  const accentCol=isDark?'#4a9d54':'#3a7d44';
  const plusPlugin={
    id:'scenPlusMarkers',
    afterDraw(chart){
      const meta=chart.getDatasetMeta(0);
      if(!meta||!meta.data.length)return;
      const ctx=chart.ctx;const top=chart.chartArea.top;
      const hm=chart._scenHoveredMonth;
      meta.data.forEach((bar,i)=>{
        const x=bar.x;
        if(hm===i){
          ctx.save();
          ctx.beginPath();ctx.arc(x,top+12,11,0,Math.PI*2);
          ctx.fillStyle=accentCol;ctx.fill();
          ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText('+',x,top+12);
          ctx.restore();
        }
      });
    }
  };
  scenBudgetChartInst=new Chart(canvas,{
    type:'bar',data:{labels:MO_SHORT,datasets},
    plugins:[plusPlugin],
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:tickColor,boxWidth:12,font:{size:12}}},datalabels:{display:false}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:11}},grid:{color:gridColor}},y:{stacked:true,beginAtZero:true,ticks:{color:tickColor,font:{size:11},callback:v=>'$'+(v/1000).toFixed(0)+'K'},grid:{color:gridColor}}}
    }
  });
  // Canvas event listeners for + markers
  canvas.onmousemove=function(evt){
    const chart=scenBudgetChartInst;if(!chart)return;
    const rect=canvas.getBoundingClientRect();
    const x=evt.clientX-rect.left;const y=evt.clientY-rect.top;
    const area=chart.chartArea;
    if(y<area.top||y>area.top+30||x<area.left||x>area.right){
      if(chart._scenHoveredMonth!=null){chart._scenHoveredMonth=null;chart.draw();canvas.style.cursor=''}
      return;
    }
    const meta=chart.getDatasetMeta(0);
    let closest=null,closestDist=Infinity;
    meta.data.forEach((bar,i)=>{
      const d=Math.abs(bar.x-x);
      if(d<closestDist){closestDist=d;closest=i}
    });
    if(closest!=null&&closestDist<25){
      if(chart._scenHoveredMonth!==closest){chart._scenHoveredMonth=closest;chart.draw()}
      canvas.style.cursor='pointer';
    } else {
      if(chart._scenHoveredMonth!=null){chart._scenHoveredMonth=null;chart.draw()}
      canvas.style.cursor='';
    }
  };
  canvas.onmouseleave=function(){
    const chart=scenBudgetChartInst;if(!chart)return;
    if(chart._scenHoveredMonth!=null){chart._scenHoveredMonth=null;chart.draw()}
    canvas.style.cursor='';
  };
  canvas.onclick=function(evt){
    const chart=scenBudgetChartInst;if(!chart||chart._scenHoveredMonth==null)return;
    openActionPane(chart._scenHoveredMonth);
  };
}

function renderFcScenarioChart(){
  if(typeof Chart==='undefined')return;
  if(!forecastScenario)initForecastScenario();
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#ffffff'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  const rows=computeForecastPnl(forecastScenario.emps,forecastScenario.assumptions);
  const labels=rows.map(r=>displayYear(r.year));
  const datasets=[];
  const fsc=getChartColors();
  // Compute vendor/T&E annual total and projections
  const MO_KEYS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const fcVtBase=((forecastScenario.vendorRows||[]).concat(forecastScenario.teRows||[])).reduce((s,r)=>s+MO_KEYS.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  const vtGrowth=(forecastScenario.assumptions.vendorGrowth||0)/100;
  const fcVtData=[fcVtBase];
  FORECAST_YEARS.forEach((_,i)=>fcVtData.push(Math.round(fcVtBase*Math.pow(1+vtGrowth,i+1))));
  if(scenFcSplit==='total'){
    datasets.push({label:'C&B OpEx',data:rows.map(r=>r.opex),backgroundColor:fsc[1],stack:'pos'});
    datasets.push({label:'Vendor/T&E',data:fcVtData,backgroundColor:fsc[2],stack:'pos'});
    datasets.push({label:'CapEx',data:rows.map(r=>-r.capex),backgroundColor:hexToRgba(fsc[0],0.5),stack:'neg'});
  } else {
    const groups={};
    forecastScenario.emps.forEach(e=>{
      const key=scenFcSplit==='function'?e.function:e.country;
      if(!groups[key])groups[key]=[];groups[key].push(e);
    });
    const origAssumptions=state.forecastAssumptions;
    state.forecastAssumptions=forecastScenario.assumptions;
    Object.keys(groups).sort().forEach((g,gi)=>{
      const gRows=projectForecast(groups[g]);
      datasets.push({label:g,data:gRows.map(r=>r.total),backgroundColor:fsc[gi%fsc.length]});
    });
    state.forecastAssumptions=origAssumptions;
  }
  const canvas=document.getElementById('scenFcChart');
  if(scenFcChartInst){scenFcChartInst.destroy()}
  const fcAccentCol=isDark?'#8e6bc0':'#7b1fa2';
  const fcPlusPlugin={
    id:'fcPlusMarkers',
    afterDraw(chart){
      const meta=chart.getDatasetMeta(0);
      if(!meta||!meta.data.length)return;
      const ctx=chart.ctx;const top=chart.chartArea.top;
      const hm=chart._fcHoveredIdx;
      meta.data.forEach((bar,i)=>{
        if(hm===i){
          ctx.save();
          ctx.beginPath();ctx.arc(bar.x,top+12,11,0,Math.PI*2);
          ctx.fillStyle=fcAccentCol;ctx.fill();
          ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText('+',bar.x,top+12);
          ctx.restore();
        }
      });
    }
  };
  scenFcChartInst=new Chart(canvas,{
    type:'bar',data:{labels,datasets},
    plugins:[fcPlusPlugin,window.yoyArrowsPlugin],
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:tickColor,boxWidth:12,font:{size:12}}},datalabels:{display:false},yoyArrows:{}},
      scales:{x:{stacked:true,ticks:{color:tickColor,font:{size:11}},grid:{color:gridColor}},y:{stacked:true,beginAtZero:true,ticks:{color:tickColor,font:{size:11},callback:v=>'$'+(v/1000000).toFixed(1)+'M'},grid:{color:gridColor}}}
    }
  });
  // Canvas event listeners for + markers on forecast chart
  canvas.onmousemove=function(evt){
    const chart=scenFcChartInst;if(!chart)return;
    const rect=canvas.getBoundingClientRect();
    const x=evt.clientX-rect.left;const y=evt.clientY-rect.top;
    const area=chart.chartArea;
    if(y<area.top||y>area.top+30||x<area.left||x>area.right){
      if(chart._fcHoveredIdx!=null){chart._fcHoveredIdx=null;chart.draw();canvas.style.cursor=''}
      return;
    }
    const meta=chart.getDatasetMeta(0);
    let closest=null,closestDist=Infinity;
    meta.data.forEach((bar,i)=>{
      const d=Math.abs(bar.x-x);
      if(d<closestDist){closestDist=d;closest=i}
    });
    if(closest!=null&&closestDist<30){
      if(chart._fcHoveredIdx!==closest){chart._fcHoveredIdx=closest;chart.draw()}
      canvas.style.cursor='pointer';
    } else {
      if(chart._fcHoveredIdx!=null){chart._fcHoveredIdx=null;chart.draw()}
      canvas.style.cursor='';
    }
  };
  canvas.onmouseleave=function(){
    const chart=scenFcChartInst;if(!chart)return;
    if(chart._fcHoveredIdx!=null){chart._fcHoveredIdx=null;chart.draw()}
    canvas.style.cursor='';
  };
  canvas.onclick=function(){
    const chart=scenFcChartInst;if(!chart||chart._fcHoveredIdx==null)return;
    openFcYearPane(chart._fcHoveredIdx);
  };
}

function openFcYearPane(barIdx){
  // barIdx 0 = 'Current', 1+ = FORECAST_YEARS
  const yearLabels=getDisplayFcLabels();
  const label=yearLabels[barIdx];
  fcSelectedYear=barIdx===0?null:FORECAST_YEARS[barIdx-1];
  fcFilterState={product:new Set(),function:new Set(),country:new Set(),category:new Set()};
  const badge=document.getElementById('fcYearBadge');
  badge.textContent=label;badge.style.display='inline-block';
  const pane=document.getElementById('fcActionPane');
  pane.style.display='block';
  document.getElementById('fcDetailOut').classList.add('active');
  populateFcPills();
}

// ── Chat UI ──
function addChatMsg(containerId,text,type){
  const container=document.getElementById(containerId);
  // Remove hint if present
  const hint=container.querySelector('.hint');if(hint)hint.remove();
  const div=document.createElement('div');
  div.className='chat-msg '+type;
  div.innerHTML=text.replace(/\n/g,'<br>');
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
}

let budgetScenarioDirty=false,fcScenarioDirty=false;

function buildScopedCommand(text){
  // If filters are active, scope the command to selected function/country
  const fs=scenFilterState;
  const hasFn=fs.function.size>0;
  const hasCo=fs.country.size>0;
  const hasProd=fs.product.size>0;
  if(!hasFn&&!hasCo&&!hasProd)return text;
  // For commands that already target "all", replace with scoped group
  let scopeParts=[];
  if(hasFn&&fs.function.size===1)scopeParts.push([...fs.function][0]);
  if(hasCo&&fs.country.size===1)scopeParts.push('in '+[...fs.country][0]);
  if(!scopeParts.length)return text;
  const scope=scopeParts.join(' ');
  // Replace "all" with the scope
  return text.replace(/\ball\b/i,scope);
}

function handleBudgetChat(text,isRefinement,parentId){
  if(!text.trim())return;
  const scopedText=buildScopedCommand(text);
  // Save undo snapshot before command (skip for reset)
  if(!/^reset$/i.test(text.trim())){
    budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
    document.getElementById('scenBudgetUndo').style.display='inline-block';
  }
  const result=parseBudgetCommand(scopedText);
  const statusEl=document.getElementById('budgetScenStatus');
  if(result.ok){
    renderBudgetScenarioChart();
    const delta=computeBudgetDelta();
    if(!/^reset$/i.test(text.trim())){
      budgetScenarioDirty=true;
      const entry={id:Date.now(),cmd:text,scopedCmd:scopedText,msg:result.msg,delta,isRefinement:!!isRefinement,parentId:parentId||null};
      scenActionHistory.push(entry);
    } else {
      budgetScenarioDirty=false;budgetUndoStack=[];
      document.getElementById('scenBudgetUndo').style.display='none';
      scenActionHistory=[];scenSelectedActionId=null;
    }
    document.getElementById('scenBudgetApply').style.display=budgetScenarioDirty?'inline-block':'none';
    renderScenActionHistory();
  } else {
    budgetUndoStack.pop();
    if(!budgetUndoStack.length)document.getElementById('scenBudgetUndo').style.display='none';
    statusEl.innerHTML=`<span style="color:var(--danger)">&#10007;</span> ${result.msg}`;
  }
  // Re-sync forecast baseline from budget scenario employees
  if(result.ok){
    initForecastScenario();renderFcScenarioChart();
    // Refresh employee list in action pane if open
    if(document.getElementById('budgetActionPane').style.display!=='none')filterScenEmpList();
  }
  renderScenarioPnlSummary();
  updateDetailOutBtn();
}

function renderScenActionHistory(){
  const el=document.getElementById('budgetScenStatus');
  if(!scenActionHistory.length){el.innerHTML='';return}
  el.innerHTML=scenActionHistory.map(e=>{
    const selCls=scenSelectedActionId===e.id?' selected':'';
    const label=e.isRefinement?'<span class="entry-label entry-refinement">Refinement Adj</span>':'';
    return `<div class="scen-history-entry${selCls}" onclick="selectScenAction(${e.id})">
      <div class="sel-dot"></div>
      <div class="entry-content">
        <div class="entry-msg">${label}<span style="color:var(--success)">&#10003;</span> ${e.msg}</div>
        <div class="chat-delta">${e.delta}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}

function selectScenAction(id){
  scenSelectedActionId=(scenSelectedActionId===id)?null:id;
  renderScenActionHistory();
  updateDetailOutBtn();
}

function updateDetailOutBtn(){
  // Detail Out is always enabled now
  const btn=document.getElementById('scenDetailOut');
  btn.disabled=false;btn.style.opacity='1';
  // Apply Refinement only enabled when an action is selected
  const refBtn=document.getElementById('scenApplyRefinement');
  const hasSelection=scenSelectedActionId!=null;
  refBtn.style.display=scenActionHistory.length?'inline-block':'none';
  refBtn.disabled=!hasSelection;
  refBtn.style.opacity=hasSelection?'1':'.5';
}

// ── Action Pane Functions ──
function populateActionPanePills(){
  const products=[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort();
  renderScenFilterPills('scenFilterProduct',products,'product');
  renderScenFilterPills('scenFilterFunction',FUNCTIONS,'function');
  renderScenFilterPills('scenFilterCountry',COUNTRIES,'country');
  // Populate account pills from vendor + T&E rows
  const accts=[...new Set([...(state.vendorRows||[]).map(r=>r.acctDesc),...(state.teRows||[]).map(r=>r.acctDesc)].filter(Boolean))].sort();
  renderScenFilterPills('scenFilterAccount',accts,'account');
  renderMonthRangeBar();
  filterScenEmpList();
  // Populate seniority dropdown for hire section
  const senSel=document.getElementById('scenHireSeniority');
  if(senSel&&!senSel.options.length){
    SENIORITY.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;senSel.appendChild(o)});
    senSel.value='Mid-Level';
  }
  updateHirePreview();
}

function getHireCompSalary(sen,func,country,rateType){
  const bm=benchmark(sen,func,country);
  if(rateType==='top')return Math.round(bm*1.25);
  if(rateType==='custom'){
    const cr=state.customRates.find(r=>r.country===country&&r.seniority===sen&&r.function===func);
    if(cr)return cr.rate;
  }
  return bm;
}
function refreshHireCompOptions(){
  const sel=document.getElementById('scenHireCompRate');
  if(!sel)return;
  const sen=document.getElementById('scenHireSeniority').value||'Mid-Level';
  const fs=scenFilterState;
  const func=fs.function.size===1?[...fs.function][0]:'Software Engineering';
  const country=fs.country.size===1?[...fs.country][0]:'United States';
  const hasCustom=state.customRates.some(r=>r.country===country&&r.seniority===sen&&r.function===func);
  let customOpt=sel.querySelector('option[value="custom"]');
  if(hasCustom&&!customOpt){
    customOpt=document.createElement('option');customOpt.value='custom';customOpt.textContent='Custom';sel.appendChild(customOpt);
  } else if(!hasCustom&&customOpt){
    if(sel.value==='custom')sel.value='market';
    customOpt.remove();
  }
}
function updateHirePreview(){
  const el=document.getElementById('scenHirePreview');
  if(!el)return;
  refreshHireCompOptions();
  const count=parseInt(document.getElementById('scenHireCount').value)||1;
  const sen=document.getElementById('scenHireSeniority').value||'Mid-Level';
  const rateType=document.getElementById('scenHireCompRate').value||'market';
  const fs=scenFilterState;
  const func=fs.function.size===1?[...fs.function][0]:'Software Engineering';
  const country=fs.country.size===1?[...fs.country][0]:'United States';
  const salary=getHireCompSalary(sen,func,country,rateType);
  const rateLabel=rateType==='top'?' (Top of Mkt)':rateType==='custom'?' (Custom)':'';
  const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const moLabel=scenSelectedMonth!==null?MO_SHORT[scenSelectedMonth]:'now';
  el.textContent=`${count}× ${sen} ${func} in ${country} @ ${fmt(salary)}${rateLabel} starting ${moLabel}`;
}

function scenAddHires(){
  if(!budgetScenario)return;
  const count=parseInt(document.getElementById('scenHireCount').value)||1;
  const sen=document.getElementById('scenHireSeniority').value||'Mid-Level';
  const fs=scenFilterState;
  const func=fs.function.size===1?[...fs.function][0]:'Software Engineering';
  const country=fs.country.size===1?[...fs.country][0]:'United States';
  const rateType=document.getElementById('scenHireCompRate').value||'market';
  const hireType=document.getElementById('scenHireType').value||'new_hire';
  const salary=getHireCompSalary(sen,func,country,rateType);
  // Determine hire date from selected month
  let hireDate='';
  if(scenSelectedMonth!==null){
    const mo=String(scenSelectedMonth+1).padStart(2,'0');
    hireDate=`${CURRENT_YEAR}-${mo}-01`;
  }
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  const emps=budgetScenario.emps;
  const _gp=state.projects.find(p=>p.code==='GEN-000');
  const hireTag=hireType==='transfer_in'?'Transfer In':'New Hire';
  for(let i=0;i<count;i++){
    emps.push({id:uid(),name:`New ${sen} ${i+1}`,country,seniority:sen,function:func,salary,capPct:0,notes:'Scenario hire',scenTag:hireTag,hireDate,termDate:'',businessLine:state.bizLines[0]?.code||'',businessUnit:COUNTRY_BU[country]||'',allocations:_gp?[{projId:_gp.id,pct:100,primary:true}]:[]});
  }
  budgetScenarioDirty=true;
  const rateLabel=rateType==='top'?' (Top of Mkt)':rateType==='custom'?' (Custom)':'';
  const typeLabel=hireTag==='Transfer In'?' [Transfer In]':' [New Hire]';
  const entry={id:Date.now(),cmd:`add ${count} ${sen} ${func} in ${country}`,scopedCmd:`add ${count} ${sen} ${func} in ${country}`,msg:`Added ${count} ${sen} ${func} in ${country} at ${fmt(salary)}${rateLabel} each${typeLabel}.`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();filterScenEmpList();renderScenarioPnlSummary();updateDetailOutBtn();
  initForecastScenario();renderFcScenarioChart();
}

function openActionPane(monthIdx){
  const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  scenSelectedMonth=monthIdx;
  scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
  const badge=document.getElementById('scenMonthBadge');
  badge.textContent=MO_SHORT[monthIdx];badge.style.display='inline-block';
  document.getElementById('scenMonthSelect').value=String(monthIdx);
  document.getElementById('scenEmpSearch').value='';
  document.getElementById('budgetActionPane').style.display='block';
  document.getElementById('scenDetailOut').classList.add('active');
  populateActionPanePills();
}

function toggleDetailOut(){
  const pane=document.getElementById('budgetActionPane');
  const btn=document.getElementById('scenDetailOut');
  if(pane.style.display!=='none'){
    closeActionPane();
    return;
  }
  // Open detail pane for browsing/filtering (no refinement context)
  scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
  scenSelectedMonth=null;scenSelectedMonths.clear();
  document.getElementById('scenMonthBadge').style.display='none';
  document.getElementById('scenMonthSelect').value='';
  document.getElementById('scenEmpSearch').value='';
  // Remove any existing refinement prompt
  const prompt=pane.querySelector('.scen-detail-prompt');
  if(prompt)prompt.remove();
  delete pane.dataset.refineCmd;
  delete pane.dataset.refineActionId;
  pane.style.display='block';
  btn.classList.add('active');
  populateActionPanePills();
}

function applyRefinementMode(){
  if(scenSelectedActionId==null)return;
  const pane=document.getElementById('budgetActionPane');
  const action=scenActionHistory.find(a=>a.id===scenSelectedActionId);
  if(!action)return;
  scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
  scenSelectedMonth=null;scenSelectedMonths.clear();
  document.getElementById('scenMonthBadge').style.display='none';
  document.getElementById('scenMonthSelect').value='';
  document.getElementById('scenEmpSearch').value='';
  // Remove any existing prompt
  const oldPrompt=pane.querySelector('.scen-detail-prompt');
  if(oldPrompt)oldPrompt.remove();
  // Show refinement prompt
  const promptDiv=document.createElement('div');
  promptDiv.className='scen-detail-prompt';
  promptDiv.style.cssText='padding:6px 10px;margin-bottom:8px;background:rgba(142,107,192,.1);border:1px solid rgba(142,107,192,.3);border-radius:6px;font-size:.75rem;color:var(--text)';
  promptDiv.innerHTML=`<strong style="color:#8e6bc0">Refining:</strong> "${action.msg}" — Select product, function, and/or country filters below, then click a preset action to apply a scoped refinement.`;
  pane.insertBefore(promptDiv,pane.firstChild);
  // Store the command being refined
  pane.dataset.refineCmd=action.cmd;
  pane.dataset.refineActionId=action.id;
  pane.style.display='block';
  document.getElementById('scenDetailOut').classList.add('active');
  populateActionPanePills();
}

function onScenMonthChange(val){
  scenSelectedMonth=val===''?null:parseInt(val);
  const badge=document.getElementById('scenMonthBadge');
  if(val===''){badge.style.display='none'}
  else{const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];badge.textContent=MO_SHORT[parseInt(val)];badge.style.display='inline-block'}
  updateHirePreview();
}

function clearScenFilters(){
  scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
  scenSelectedMonth=null;
  scenSelectedMonths.clear();
  document.getElementById('scenMonthSelect').value='';
  document.getElementById('scenMonthBadge').style.display='none';
  document.getElementById('scenEmpSearch').value='';
  renderMonthRangeBar();
  populateActionPanePills();
}

function closeActionPane(){
  const pane=document.getElementById('budgetActionPane');
  pane.style.display='none';
  const prompt=pane.querySelector('.scen-detail-prompt');
  if(prompt)prompt.remove();
  delete pane.dataset.refineCmd;
  delete pane.dataset.refineActionId;
  document.getElementById('scenMonthBadge').style.display='none';
  document.getElementById('scenDetailOut').classList.remove('active');
  scenSelectedMonth=null;
  scenSelectedMonths.clear();
  scenFilterState={product:new Set(),function:new Set(),country:new Set(),account:new Set()};
}

function renderScenFilterPills(containerId,items,filterKey){
  const el=document.getElementById(containerId);
  el.innerHTML=items.map(item=>{
    const active=scenFilterState[filterKey].has(item)?'active':'';
    const esc=item.replace(/'/g,"\\'");
    return `<button class="scen-pill ${active}" onclick="toggleScenFilter('${filterKey}','${esc}')">${item}</button>`;
  }).join('');
}

function toggleScenFilter(key,value){
  if(scenFilterState[key].has(value))scenFilterState[key].delete(value);
  else scenFilterState[key].add(value);
  // Re-render just this pill group
  const idMap={product:'scenFilterProduct',function:'scenFilterFunction',country:'scenFilterCountry',account:'scenFilterAccount'};
  const items=key==='product'?[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort():key==='function'?FUNCTIONS:key==='account'?[...new Set([...(state.vendorRows||[]).map(r=>r.acctDesc),...(state.teRows||[]).map(r=>r.acctDesc)].filter(Boolean))].sort():COUNTRIES;
  renderScenFilterPills(idMap[key],items,key);
  filterScenEmpList();
  updateHirePreview();
}

function renderMonthRangeBar(){
  const bar=document.getElementById('scenMonthRangeBar');
  if(!bar)return;
  bar.querySelectorAll('.month-cell').forEach(cell=>{
    const mo=parseInt(cell.dataset.mo);
    cell.classList.toggle('active',scenSelectedMonths.has(mo));
  });
  const label=document.getElementById('scenMonthRangeLabel');
  if(label){
    if(!scenSelectedMonths.size){label.textContent='All months (click or drag to select range)'}
    else{const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const sorted=[...scenSelectedMonths].sort((a,b)=>a-b);label.textContent=sorted.map(m=>MO_SHORT[m]).join(', ')}
  }
}
function initMonthRangeBar(){
  const bar=document.getElementById('scenMonthRangeBar');
  if(!bar||bar._inited)return;bar._inited=true;
  let dragging=false,startMo=null;
  function getMo(e){const cell=e.target.closest('.month-cell');return cell?parseInt(cell.dataset.mo):null}
  function selectRange(from,to){
    const lo=Math.min(from,to),hi=Math.max(from,to);
    scenSelectedMonths.clear();
    for(let i=lo;i<=hi;i++)scenSelectedMonths.add(i);
    renderMonthRangeBar();
  }
  bar.addEventListener('mousedown',e=>{
    const mo=getMo(e);if(mo===null)return;
    dragging=true;startMo=mo;
    // If clicking a single already-selected month and it's the only one, deselect
    if(scenSelectedMonths.size===1&&scenSelectedMonths.has(mo)){scenSelectedMonths.clear();renderMonthRangeBar();dragging=false;return}
    selectRange(mo,mo);
    e.preventDefault();
  });
  bar.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const mo=getMo(e);if(mo===null)return;
    selectRange(startMo,mo);
  });
  document.addEventListener('mouseup',()=>{if(dragging){dragging=false}});
  // Touch support
  bar.addEventListener('touchstart',e=>{
    const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
    if(!el||!el.classList.contains('month-cell'))return;
    const mo=parseInt(el.dataset.mo);dragging=true;startMo=mo;
    if(scenSelectedMonths.size===1&&scenSelectedMonths.has(mo)){scenSelectedMonths.clear();renderMonthRangeBar();dragging=false;return}
    selectRange(mo,mo);e.preventDefault();
  },{passive:false});
  bar.addEventListener('touchmove',e=>{
    if(!dragging)return;
    const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
    if(!el||!el.classList.contains('month-cell'))return;
    selectRange(startMo,parseInt(el.dataset.mo));e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',()=>{if(dragging){dragging=false}});
}

// ── Exec View Month Range Bar ──
function renderExecMonthRangeBar(){
  const bar=document.getElementById('execMonthRangeBar');
  if(!bar)return;
  bar.querySelectorAll('.month-cell').forEach(cell=>{
    const mo=parseInt(cell.dataset.mo);
    cell.classList.toggle('active',window.execSelectedMonths.has(mo));
  });
  const label=document.getElementById('execMonthRangeLabel');
  if(label){
    if(!window.execSelectedMonths.size){label.textContent='All months (click or drag to select range)'}
    else{const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const sorted=[...window.execSelectedMonths].sort((a,b)=>a-b);label.textContent=sorted.map(m=>MO_SHORT[m]).join(', ')}
  }
}
function initExecMonthRangeBar(){
  const bar=document.getElementById('execMonthRangeBar');
  if(!bar||bar._inited)return;bar._inited=true;
  let dragging=false,startMo=null;
  function getMo(e){const cell=e.target.closest('.month-cell');return cell?parseInt(cell.dataset.mo):null}
  function selectRange(from,to){
    const lo=Math.min(from,to),hi=Math.max(from,to);
    window.execSelectedMonths.clear();
    for(let i=lo;i<=hi;i++)window.execSelectedMonths.add(i);
    renderExecMonthRangeBar();
  }
  function onFinish(){if(dragging){dragging=false;renderExecView()}}
  bar.addEventListener('mousedown',e=>{
    const mo=getMo(e);if(mo===null)return;
    dragging=true;startMo=mo;
    if(window.execSelectedMonths.size===1&&window.execSelectedMonths.has(mo)){window.execSelectedMonths.clear();renderExecMonthRangeBar();dragging=false;renderExecView();return}
    selectRange(mo,mo);
    e.preventDefault();
  });
  bar.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const mo=getMo(e);if(mo===null)return;
    selectRange(startMo,mo);
  });
  document.addEventListener('mouseup',()=>{onFinish()});
  bar.addEventListener('touchstart',e=>{
    const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
    if(!el||!el.classList.contains('month-cell'))return;
    const mo=parseInt(el.dataset.mo);dragging=true;startMo=mo;
    if(window.execSelectedMonths.size===1&&window.execSelectedMonths.has(mo)){window.execSelectedMonths.clear();renderExecMonthRangeBar();dragging=false;renderExecView();return}
    selectRange(mo,mo);e.preventDefault();
  },{passive:false});
  bar.addEventListener('touchmove',e=>{
    if(!dragging)return;
    const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
    if(!el||!el.classList.contains('month-cell'))return;
    selectRange(startMo,parseInt(el.dataset.mo));e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',()=>{onFinish()});
}

// ── Generic Month Range Bar factory for Vendor/T&E tabs ──
function createSpendMonthRangeBar(barId, labelId, selectedSet, onChangeCallback){
  function render(){
    const bar=document.getElementById(barId);
    if(!bar)return;
    bar.querySelectorAll('.month-cell').forEach(cell=>{
      const mo=parseInt(cell.dataset.mo);
      cell.classList.toggle('active',selectedSet.has(mo));
    });
    const label=document.getElementById(labelId);
    if(label){
      if(!selectedSet.size){label.textContent='All months (click or drag to select range)'}
      else{const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const sorted=[...selectedSet].sort((a,b)=>a-b);label.textContent=sorted.map(m=>MO_SHORT[m]).join(', ')}
    }
  }
  function init(){
    const bar=document.getElementById(barId);
    if(!bar||bar._inited)return;bar._inited=true;
    let dragging=false,startMo=null;
    function getMo(e){const cell=e.target.closest('.month-cell');return cell?parseInt(cell.dataset.mo):null}
    function selectRange(from,to){
      const lo=Math.min(from,to),hi=Math.max(from,to);
      selectedSet.clear();
      for(let i=lo;i<=hi;i++)selectedSet.add(i);
      render();
    }
    function onFinish(){if(dragging){dragging=false;onChangeCallback()}}
    bar.addEventListener('mousedown',e=>{
      const mo=getMo(e);if(mo===null)return;
      dragging=true;startMo=mo;
      if(selectedSet.size===1&&selectedSet.has(mo)){selectedSet.clear();render();dragging=false;onChangeCallback();return}
      selectRange(mo,mo);e.preventDefault();
    });
    bar.addEventListener('mousemove',e=>{if(!dragging)return;const mo=getMo(e);if(mo===null)return;selectRange(startMo,mo)});
    document.addEventListener('mouseup',()=>{onFinish()});
    bar.addEventListener('touchstart',e=>{
      const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
      if(!el||!el.classList.contains('month-cell'))return;
      const mo=parseInt(el.dataset.mo);dragging=true;startMo=mo;
      if(selectedSet.size===1&&selectedSet.has(mo)){selectedSet.clear();render();dragging=false;onChangeCallback();return}
      selectRange(mo,mo);e.preventDefault();
    },{passive:false});
    bar.addEventListener('touchmove',e=>{
      if(!dragging)return;
      const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);
      if(!el||!el.classList.contains('month-cell'))return;
      selectRange(startMo,parseInt(el.dataset.mo));e.preventDefault();
    },{passive:false});
    document.addEventListener('touchend',()=>{onFinish()});
  }
  return {init,render};
}

function getEmpProducts(emp){
  if(!emp.allocations||!emp.allocations.length)return [];
  return emp.allocations.map(a=>{const p=state.projects.find(pr=>pr.id===a.projId);return p?p.product:null}).filter(Boolean);
}
function getEmpCategories(emp){
  if(!emp.allocations||!emp.allocations.length)return [];
  return emp.allocations.map(a=>{const p=state.projects.find(pr=>pr.id===a.projId);return p?p.category:null}).filter(Boolean);
}

function filterScenEmpList(){
  if(!budgetScenario)return;
  const search=(document.getElementById('scenEmpSearch').value||'').toLowerCase();
  const fs=scenFilterState;
  let emps=budgetScenario.emps;
  if(fs.product.size>0)emps=emps.filter(e=>getEmpProducts(e).some(p=>fs.product.has(p)));
  if(fs.function.size>0)emps=emps.filter(e=>fs.function.has(e.function));
  if(fs.country.size>0)emps=emps.filter(e=>fs.country.has(e.country));
  if(search)emps=emps.filter(e=>(e.name||'').toLowerCase().includes(search)||(e.function||'').toLowerCase().includes(search)||(e.country||'').toLowerCase().includes(search));
  const el=document.getElementById('scenEmpList');
  // Build filter tags showing active filters
  let tagsHtml='';
  const activeTags=[];
  if(fs.function.size>0)[...fs.function].forEach(f=>activeTags.push({label:f,key:'function',value:f}));
  if(fs.country.size>0)[...fs.country].forEach(c=>activeTags.push({label:c,key:'country',value:c}));
  if(fs.product.size>0)[...fs.product].forEach(p=>activeTags.push({label:p,key:'product',value:p}));
  if(scenSelectedMonth!==null){const MO_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];activeTags.push({label:MO_SHORT[scenSelectedMonth],key:'month',value:scenSelectedMonth})}
  if(activeTags.length){
    tagsHtml='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">'+activeTags.map(t=>{
      const esc=String(t.value).replace(/'/g,"\\'");
      return `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 7px;font-size:.66rem;border-radius:8px;background:rgba(142,107,192,.15);color:#8e6bc0;border:1px solid rgba(142,107,192,.3)">${t.label}<button onclick="removeScenFilterTag('${t.key}','${esc}')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:#8e6bc0;padding:0 1px;line-height:1">&times;</button></span>`;
    }).join('')+'</div>';
  }
  const show=emps.slice(0,50);
  if(!show.length){el.innerHTML=tagsHtml+'<div class="emp-count">No matching employees</div>';return}
  let html=tagsHtml+show.map(e=>{
    const esc=e.name.replace(/'/g,"\\'");
    const tagBadge=e.scenTag?`<span style="display:inline-block;padding:1px 6px;font-size:.6rem;border-radius:8px;font-weight:600;margin-left:4px;${e.scenTag==='Transfer In'?'background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.3)':'background:rgba(58,125,68,.15);color:#3a7d44;border:1px solid rgba(58,125,68,.3)'}">${e.scenTag}</span>`:'';
    return `<div class="emp-row"><span class="emp-name">${e.name}${tagBadge}</span><span class="emp-meta">${e.function} · ${e.country} · ${fmt(e.salary)} · cap ${e.capPct||0}%</span><span class="emp-actions"><button class="emp-act act-up" title="Increase cap% by 10pp" onclick="scenEmpCapAdj('${esc}',10)">&#9650;</button><button class="emp-act act-down" title="Decrease cap% by 10pp" onclick="scenEmpCapAdj('${esc}',-10)">&#9660;</button><button class="emp-act act-arrow" title="Transfer out" onclick="scenEmpTransfer('${esc}')">&#8594;</button><button class="emp-act act-x" title="Terminate" onclick="scenEmpTerminate('${esc}')">&#10005;</button></span></div>`;
  }).join('');
  if(emps.length>50)html+=`<div class="emp-count">+${emps.length-50} more</div>`;
  else html+=`<div class="emp-count">${emps.length} employee${emps.length===1?'':'s'}</div>`;
  el.innerHTML=html;
}

function removeScenFilterTag(key,value){
  if(key==='month'){scenSelectedMonth=null;document.getElementById('scenMonthSelect').value='';document.getElementById('scenMonthBadge').style.display='none'}
  else if(scenFilterState[key]){scenFilterState[key].delete(value);const idMap={product:'scenFilterProduct',function:'scenFilterFunction',country:'scenFilterCountry'};const items=key==='product'?[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort():key==='function'?FUNCTIONS:COUNTRIES;renderScenFilterPills(idMap[key],items,key)}
  filterScenEmpList();
}

function scenEmpTerminate(name){
  if(!budgetScenario)return;
  const emp=budgetScenario.emps.find(e=>e.name===name);
  if(!emp)return;
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  // Use selected refinement month if set, otherwise use today's date
  if(scenSelectedMonth!==null&&scenSelectedMonth!==undefined){
    const mo=String(scenSelectedMonth+1).padStart(2,'0');
    const lastDay=new Date(CURRENT_YEAR,scenSelectedMonth+1,0).getDate();
    emp.termDate=`${CURRENT_YEAR}-${mo}-${String(lastDay).padStart(2,'0')}`;
  } else {
    emp.termDate=new Date().toISOString().slice(0,10);
  }
  budgetScenarioDirty=true;
  const entry={id:Date.now(),cmd:`terminate ${name}`,scopedCmd:`terminate ${name}`,msg:`Terminated ${name} effective ${emp.termDate}.`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();filterScenEmpList();renderScenarioPnlSummary();updateDetailOutBtn();
  initForecastScenario();renderFcScenarioChart();
}
function scenEmpTransfer(name){
  if(!budgetScenario)return;
  const emp=budgetScenario.emps.find(e=>e.name===name);
  if(!emp)return;
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  budgetScenario.emps=budgetScenario.emps.filter(e=>e.name!==name);
  budgetScenarioDirty=true;
  const entry={id:Date.now(),cmd:`remove ${name}`,scopedCmd:`remove ${name}`,msg:`Removed ${name} from budget.`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();filterScenEmpList();renderScenarioPnlSummary();updateDetailOutBtn();
  initForecastScenario();renderFcScenarioChart();
}
function scenEmpCapAdj(name,delta){
  if(!budgetScenario)return;
  const emp=budgetScenario.emps.find(e=>e.name===name);
  if(!emp)return;
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  const old=parseFloat(emp.capPct)||0;
  emp.capPct=Math.max(0,Math.min(100,old+delta));
  budgetScenarioDirty=true;
  const dir=delta>0?'Increased':'Decreased';
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} "${name}" cap% by ${Math.abs(delta)}`,scopedCmd:`${dir.toLowerCase()} "${name}" cap% by ${Math.abs(delta)}`,msg:`${dir} ${name} cap% from ${old}% to ${emp.capPct}%.`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();filterScenEmpList();renderScenarioPnlSummary();updateDetailOutBtn();
  initForecastScenario();renderFcScenarioChart();
}

function renderVendorDetailList(){
  const el=document.getElementById('vendorDetailList');
  if(!el||!budgetScenario)return;
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  // Aggregate vendor rows by vendorName (or parentCo+vendorName)
  const rows=budgetScenario.vendorRows||[];
  const agg={};
  rows.forEach((r,idx)=>{
    const key=r.vendorName||r.parentCo||`Vendor ${idx+1}`;
    if(!agg[key])agg[key]={name:key,total:0,indices:[]};
    agg[key].total+=MO.reduce((s,mo)=>s+(parseFloat(r[mo])||0),0);
    agg[key].indices.push(idx);
  });
  const sorted=Object.values(agg).sort((a,b)=>b.total-a.total);
  if(!sorted.length){el.innerHTML='<div style="padding:6px;font-size:.72rem;color:var(--text-dim)">No vendor spend data</div>';return}
  const isPct=vendorAdjMode==='pct';
  const kBtnStyle='padding:3px 12px;font-size:.74rem;font-weight:700;border-radius:4px;';
  const kActiveStyle=kBtnStyle+'background:var(--accent);color:#fff;border:2px solid var(--accent);';
  const kInactiveStyle=kBtnStyle+'background:none;color:var(--text-dim);border:2px solid var(--border);';
  el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;margin-bottom:4px"><span style="font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--text-dim)">Vendor Spend Detail</span><div style="display:flex;gap:3px"><button style="'+(!isPct?kActiveStyle:kInactiveStyle)+'" onclick="vendorAdjMode=\'dollars\';renderVendorDetailList()">$K</button><button style="'+(isPct?kActiveStyle:kInactiveStyle)+'" onclick="vendorAdjMode=\'pct\';renderVendorDetailList()">%</button></div></div>'+sorted.map(v=>{
    const amtK=v.total>=1000000?`$${(v.total/1000000).toFixed(1)}m`:`$${(v.total/1000).toFixed(0)}k`;
    const esc=v.name.replace(/'/g,"\\'");
    if(isPct){
      return `<div class="vendor-row"><span class="vendor-name" title="${v.name}">${v.name}</span><span class="vendor-amt">${amtK}</span><span class="vendor-adj"><button class="adj-minus" onclick="adjVendorSpendPct('${esc}',-10)" title="-10%">-10%</button><button class="adj-minus" onclick="adjVendorSpendPct('${esc}',-50)" title="-50%">-50%</button><button class="adj-minus" onclick="adjVendorSpendPct('${esc}',-100)" title="-100%">-100%</button><button onclick="adjVendorSpendPct('${esc}',10)" title="+10%">+10%</button><button onclick="adjVendorSpendPct('${esc}',50)" title="+50%">+50%</button><button onclick="adjVendorSpendPct('${esc}',100)" title="+100%">+100%</button></span></div>`;
    }
    return `<div class="vendor-row"><span class="vendor-name" title="${v.name}">${v.name}</span><span class="vendor-amt">${amtK}</span><span class="vendor-adj"><button class="adj-minus" onclick="adjVendorSpend('${esc}',-10000)" title="-$10K">-$10K</button><button class="adj-minus" onclick="adjVendorSpend('${esc}',-50000)" title="-$50K">-$50K</button><button class="adj-minus" onclick="adjVendorSpend('${esc}',-100000)" title="-$100K">-$100K</button><button onclick="adjVendorSpend('${esc}',10000)" title="+$10K">+$10K</button><button onclick="adjVendorSpend('${esc}',50000)" title="+$50K">+$50K</button><button onclick="adjVendorSpend('${esc}',100000)" title="+$100K">+$100K</button></span></div>`;
  }).join('');
}

let vendorAdjMode='dollars';
function getScenActiveMonths(){
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  if(scenSelectedMonths.size)return MO.filter((_,i)=>scenSelectedMonths.has(i));
  return MO;
}
function matchesScenAcctFilter(r){
  if(!scenFilterState.account.size)return true;
  return scenFilterState.account.has(r.acctDesc);
}
function adjVendorSpendPct(vendorName,pct){
  if(!budgetScenario)return;
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  const activeMo=getScenActiveMonths();
  const factor=pct/100;
  let count=0;
  budgetScenario.vendorRows.forEach(r=>{
    if((r.vendorName||r.parentCo)===vendorName&&matchesScenAcctFilter(r)){activeMo.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1+factor))});count++}
  });
  budgetScenarioDirty=true;
  const dir=pct>0?'Increased':'Decreased';
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} ${vendorName} spend by ${Math.abs(pct)}%`,scopedCmd:`${dir.toLowerCase()} ${vendorName} spend by ${Math.abs(pct)}%`,msg:`${dir} ${vendorName} spend by ${Math.abs(pct)}% (${count} rows).`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();renderScenarioPnlSummary();updateDetailOutBtn();
  renderVendorDetailList();
  initForecastScenario();renderFcScenarioChart();
}
function adjVendorSpend(vendorName,delta){
  if(!budgetScenario)return;
  budgetUndoStack.push(JSON.parse(JSON.stringify(budgetScenario)));
  document.getElementById('scenBudgetUndo').style.display='inline-block';
  const activeMo=getScenActiveMonths();
  const rows=budgetScenario.vendorRows||[];
  const matching=rows.filter(r=>(r.vendorName||r.parentCo)===vendorName&&matchesScenAcctFilter(r));
  if(!matching.length)return;
  // Distribute delta evenly across active months on the first matching row
  const perMonth=Math.round(delta/activeMo.length);
  activeMo.forEach(mo=>{matching[0][mo]=(parseFloat(matching[0][mo])||0)+perMonth});
  budgetScenarioDirty=true;
  const dir=delta>0?'Increased':'Decreased';
  const amt=Math.abs(delta)>=1000000?`$${(Math.abs(delta)/1000000).toFixed(1)}m`:`$${(Math.abs(delta)/1000).toFixed(0)}k`;
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} ${vendorName} spend by ${amt}`,scopedCmd:`${dir.toLowerCase()} ${vendorName} spend by ${amt}`,msg:`${dir} ${vendorName} spend by ${amt}.`,delta:computeBudgetDelta(),isRefinement:false,parentId:null};
  scenActionHistory.push(entry);
  document.getElementById('scenBudgetApply').style.display='inline-block';
  renderScenActionHistory();renderBudgetScenarioChart();renderScenarioPnlSummary();updateDetailOutBtn();
  renderVendorDetailList();
  initForecastScenario();renderFcScenarioChart();
}

function matchesFcAcctFilter(r){
  if(!fcFilterState.account||!fcFilterState.account.size)return true;
  return fcFilterState.account.has(r.acctDesc);
}
function adjFcVendorSpendPct(vendorName,pct){
  if(!forecastScenario)return;
  fcUndoStack.push(JSON.parse(JSON.stringify(forecastScenario)));
  document.getElementById('scenFcUndo').style.display='inline-block';
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const factor=pct/100;
  let count=0;
  forecastScenario.vendorRows.forEach(r=>{
    if((r.vendorName||r.parentCo)===vendorName&&matchesFcAcctFilter(r)){MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1+factor))});count++}
  });
  forecastScenario.teRows.forEach(r=>{
    if((r.vendorName||r.parentCo||r.expenseType||r.description)===vendorName&&matchesFcAcctFilter(r)){MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1+factor))});count++}
  });
  fcScenarioDirty=true;
  const dir=pct>0?'Increased':'Decreased';
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} ${vendorName} fc spend by ${Math.abs(pct)}%`,scopedCmd:`${dir.toLowerCase()} ${vendorName} fc spend by ${Math.abs(pct)}%`,msg:`${dir} ${vendorName} forecast spend by ${Math.abs(pct)}% (${count} rows).`,delta:computeFcDelta(),isRefinement:false,parentId:null};
  fcActionHistory.push(entry);
  document.getElementById('scenFcApply').style.display='inline-block';
  renderFcActionHistory();renderFcScenarioChart();renderScenarioPnlSummary();updateFcDetailOutBtn();
  renderFcVendorDetailList();
}
function adjFcVendorSpend(vendorName,delta){
  if(!forecastScenario)return;
  fcUndoStack.push(JSON.parse(JSON.stringify(forecastScenario)));
  document.getElementById('scenFcUndo').style.display='inline-block';
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const rows=(forecastScenario.vendorRows||[]).concat(forecastScenario.teRows||[]);
  const matching=rows.filter(r=>((r.vendorName||r.parentCo||r.expenseType||r.description)===vendorName)&&matchesFcAcctFilter(r));
  if(!matching.length)return;
  const perMonth=Math.round(delta/12);
  MO.forEach(mo=>{matching[0][mo]=(parseFloat(matching[0][mo])||0)+perMonth});
  fcScenarioDirty=true;
  const dir=delta>0?'Increased':'Decreased';
  const amt=Math.abs(delta)>=1000000?`$${(Math.abs(delta)/1000000).toFixed(1)}m`:`$${(Math.abs(delta)/1000).toFixed(0)}k`;
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} ${vendorName} fc spend by ${amt}`,scopedCmd:`${dir.toLowerCase()} ${vendorName} fc spend by ${amt}`,msg:`${dir} ${vendorName} forecast spend by ${amt}.`,delta:computeFcDelta(),isRefinement:false,parentId:null};
  fcActionHistory.push(entry);
  document.getElementById('scenFcApply').style.display='inline-block';
  renderFcActionHistory();renderFcScenarioChart();renderScenarioPnlSummary();updateFcDetailOutBtn();
  renderFcVendorDetailList();
}
function renderFcVendorDetailList(){
  const el=document.getElementById('fcVendorDetailList');
  if(!el||!forecastScenario)return;
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const allRows=(forecastScenario.vendorRows||[]).concat(forecastScenario.teRows||[]);
  const agg={};
  allRows.forEach((r,idx)=>{
    const key=r.vendorName||r.parentCo||r.expenseType||r.description||`Row ${idx+1}`;
    if(!agg[key])agg[key]={name:key,total:0,indices:[]};
    agg[key].total+=MO.reduce((s,mo)=>s+(parseFloat(r[mo])||0),0);
    agg[key].indices.push(idx);
  });
  const sorted=Object.values(agg).sort((a,b)=>b.total-a.total);
  if(!sorted.length){el.innerHTML='<div style="padding:6px;font-size:.72rem;color:var(--text-dim)">No vendor/T&E spend data</div>';return}
  const isPct=fcVendorAdjMode==='pct';
  const kBtnStyle='padding:3px 12px;font-size:.74rem;font-weight:700;border-radius:4px;cursor:pointer;';
  const kActiveStyle=kBtnStyle+'background:var(--accent);color:#fff;border:2px solid var(--accent);';
  const kInactiveStyle=kBtnStyle+'background:none;color:var(--text-dim);border:2px solid var(--border);';
  el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;margin-bottom:4px"><span style="font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--text-dim)">Forecast Vendor/T&E Detail</span><div style="display:flex;gap:3px"><button style="'+(!isPct?kActiveStyle:kInactiveStyle)+'" onclick="fcVendorAdjMode=\'dollars\';renderFcVendorDetailList()">$K</button><button style="'+(isPct?kActiveStyle:kInactiveStyle)+'" onclick="fcVendorAdjMode=\'pct\';renderFcVendorDetailList()">%</button></div></div>'+sorted.map(v=>{
    const amtK=v.total>=1000000?`$${(v.total/1000000).toFixed(1)}m`:`$${(v.total/1000).toFixed(0)}k`;
    const esc=v.name.replace(/'/g,"\\'");
    if(isPct){
      return `<div class="vendor-row"><span class="vendor-name" title="${v.name}">${v.name}</span><span class="vendor-amt">${amtK}</span><span class="vendor-adj"><button class="adj-minus" onclick="adjFcVendorSpendPct('${esc}',-10)" title="-10%">-10%</button><button class="adj-minus" onclick="adjFcVendorSpendPct('${esc}',-50)" title="-50%">-50%</button><button class="adj-minus" onclick="adjFcVendorSpendPct('${esc}',-100)" title="-100%">-100%</button><button onclick="adjFcVendorSpendPct('${esc}',10)" title="+10%">+10%</button><button onclick="adjFcVendorSpendPct('${esc}',50)" title="+50%">+50%</button><button onclick="adjFcVendorSpendPct('${esc}',100)" title="+100%">+100%</button></span></div>`;
    }
    return `<div class="vendor-row"><span class="vendor-name" title="${v.name}">${v.name}</span><span class="vendor-amt">${amtK}</span><span class="vendor-adj"><button class="adj-minus" onclick="adjFcVendorSpend('${esc}',-10000)" title="-$10K">-$10K</button><button class="adj-minus" onclick="adjFcVendorSpend('${esc}',-50000)" title="-$50K">-$50K</button><button class="adj-minus" onclick="adjFcVendorSpend('${esc}',-100000)" title="-$100K">-$100K</button><button onclick="adjFcVendorSpend('${esc}',10000)" title="+$10K">+$10K</button><button onclick="adjFcVendorSpend('${esc}',50000)" title="+$50K">+$50K</button><button onclick="adjFcVendorSpend('${esc}',100000)" title="+$100K">+$100K</button></span></div>`;
  }).join('');
}

function buildFcScopedCommand(text){
  const fs=fcFilterState;
  const hasFn=fs.function.size>0;
  const hasCo=fs.country.size>0;
  if(hasFn||hasCo){
    let scopeParts=[];
    if(hasFn&&fs.function.size===1)scopeParts.push([...fs.function][0]);
    if(hasCo&&fs.country.size===1)scopeParts.push('in '+[...fs.country][0]);
    if(scopeParts.length)text=text.replace(/\ball\b/i,scopeParts.join(' '));
  }
  // Append year scope if a specific year is selected and command doesn't already have a year
  if(fcSelectedYear&&!/\b\d{4}\b/.test(text)){
    text=text.replace(/$/,' in '+fcSelectedYear);
  }
  return text;
}

function handleFcChat(text,isRefinement,parentId){
  if(!text.trim())return;
  const scopedText=buildFcScopedCommand(text);
  if(!/^reset$/i.test(text.trim())){
    fcUndoStack.push(JSON.parse(JSON.stringify(forecastScenario)));
    document.getElementById('scenFcUndo').style.display='inline-block';
  }
  const result=parseForecastCommand(scopedText);
  const statusEl=document.getElementById('fcScenStatus');
  if(result.ok){
    renderFcScenarioChart();
    const delta=computeFcDelta();
    if(!/^reset$/i.test(text.trim())){
      fcScenarioDirty=true;
      const entry={id:Date.now(),cmd:text,scopedCmd:scopedText,msg:result.msg,delta,isRefinement:!!isRefinement,parentId:parentId||null};
      fcActionHistory.push(entry);
    } else {
      fcScenarioDirty=false;fcUndoStack=[];
      document.getElementById('scenFcUndo').style.display='none';
      fcActionHistory=[];fcSelectedActionId=null;
    }
    document.getElementById('scenFcApply').style.display=fcScenarioDirty?'inline-block':'none';
    renderFcActionHistory();
  } else {
    fcUndoStack.pop();
    if(!fcUndoStack.length)document.getElementById('scenFcUndo').style.display='none';
    statusEl.innerHTML=`<span style="color:var(--danger)">&#10007;</span> ${result.msg}`;
  }
  renderScenarioPnlSummary();
  updateFcDetailOutBtn();
  if(document.getElementById('fcActionPane').style.display!=='none')filterFcEmpList();
}

function renderFcActionHistory(){
  const el=document.getElementById('fcScenStatus');
  if(!fcActionHistory.length){el.innerHTML='';return}
  el.innerHTML=fcActionHistory.map(e=>{
    const selCls=fcSelectedActionId===e.id?' selected':'';
    const label=e.isRefinement?'<span class="entry-label entry-refinement">Refinement Adj</span>':'';
    return `<div class="scen-history-entry${selCls}" onclick="selectFcAction(${e.id})">
      <div class="sel-dot"></div>
      <div class="entry-content">
        <div class="entry-msg">${label}<span style="color:var(--success)">&#10003;</span> ${e.msg}</div>
        <div class="chat-delta">${e.delta}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}

function selectFcAction(id){
  fcSelectedActionId=(fcSelectedActionId===id)?null:id;
  renderFcActionHistory();
  updateFcDetailOutBtn();
}

function updateFcDetailOutBtn(){
  const btn=document.getElementById('fcDetailOut');
  const hasSelection=fcSelectedActionId!=null;
  btn.disabled=!hasSelection;
  btn.style.opacity=hasSelection?'1':'.5';
}

function toggleFcDetailOut(){
  if(fcSelectedActionId==null)return;
  const pane=document.getElementById('fcActionPane');
  const btn=document.getElementById('fcDetailOut');
  if(pane.style.display!=='none'){closeFcActionPane();return}
  const action=fcActionHistory.find(a=>a.id===fcSelectedActionId);
  if(!action)return;
  fcFilterState={product:new Set(),function:new Set(),country:new Set(),category:new Set()};
  fcSelectedYear=null;
  document.getElementById('fcYearBadge').style.display='none';
  pane.style.display='block';
  btn.classList.add('active');
  const prompt=pane.querySelector('.scen-detail-prompt');
  if(prompt)prompt.remove();
  const promptDiv=document.createElement('div');
  promptDiv.className='scen-detail-prompt';
  promptDiv.style.cssText='padding:6px 10px;margin-bottom:8px;background:rgba(142,107,192,.1);border:1px solid rgba(142,107,192,.3);border-radius:6px;font-size:.75rem;color:var(--text)';
  promptDiv.innerHTML=`<strong style="color:#8e6bc0">Refining:</strong> "${action.msg}" — Select filters below, then click a preset action.`;
  pane.insertBefore(promptDiv,pane.firstChild);
  pane.dataset.refineCmd=action.cmd;
  pane.dataset.refineActionId=action.id;
  populateFcPills();
}

function closeFcActionPane(){
  const pane=document.getElementById('fcActionPane');
  pane.style.display='none';
  const prompt=pane.querySelector('.scen-detail-prompt');
  if(prompt)prompt.remove();
  delete pane.dataset.refineCmd;
  delete pane.dataset.refineActionId;
  document.getElementById('fcDetailOut').classList.remove('active');
  fcFilterState={product:new Set(),function:new Set(),country:new Set(),category:new Set(),account:new Set()};
  fcSelectedYear=null;
  document.getElementById('fcYearBadge').style.display='none';
}

function clearFcFilters(){
  fcFilterState={product:new Set(),function:new Set(),country:new Set(),category:new Set(),account:new Set()};
  document.getElementById('fcEmpSearch').value='';
  populateFcPills();
}

function populateFcPills(){
  const products=[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort();
  const categories=[...new Set(state.projects.map(p=>p.category).filter(Boolean))].sort();
  const accounts=[...new Set([...(forecastScenario?forecastScenario.vendorRows||[]:[]).map(r=>r.acctDesc),...(forecastScenario?forecastScenario.teRows||[]:[]).map(r=>r.acctDesc)].filter(Boolean))].sort();
  renderFcFilterPills('fcFilterProduct',products,'product');
  renderFcFilterPills('fcFilterCategory',categories,'category');
  renderFcFilterPills('fcFilterFunction',FUNCTIONS,'function');
  renderFcFilterPills('fcFilterCountry',COUNTRIES,'country');
  renderFcFilterPills('fcFilterAccount',accounts,'account');
  filterFcEmpList();
}

function renderFcFilterPills(containerId,items,filterKey){
  const el=document.getElementById(containerId);
  el.innerHTML=items.map(item=>{
    const active=fcFilterState[filterKey].has(item)?'active':'';
    const esc=item.replace(/'/g,"\\'");
    return `<button class="scen-pill ${active}" onclick="toggleFcFilter('${filterKey}','${esc}')">${item}</button>`;
  }).join('');
}

function toggleFcFilter(key,value){
  if(fcFilterState[key].has(value))fcFilterState[key].delete(value);
  else fcFilterState[key].add(value);
  const idMap={product:'fcFilterProduct',function:'fcFilterFunction',country:'fcFilterCountry',category:'fcFilterCategory',account:'fcFilterAccount'};
  const items=key==='product'?[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort():key==='category'?[...new Set(state.projects.map(p=>p.category).filter(Boolean))].sort():key==='function'?FUNCTIONS:key==='account'?[...new Set([...(forecastScenario?forecastScenario.vendorRows||[]:[]).map(r=>r.acctDesc),...(forecastScenario?forecastScenario.teRows||[]:[]).map(r=>r.acctDesc)].filter(Boolean))].sort():COUNTRIES;
  renderFcFilterPills(idMap[key],items,key);
  filterFcEmpList();
}

function filterFcEmpList(){
  if(!forecastScenario)return;
  const search=(document.getElementById('fcEmpSearch').value||'').toLowerCase();
  const fs=fcFilterState;
  let emps=forecastScenario.emps;
  if(fs.product.size>0)emps=emps.filter(e=>getEmpProducts(e).some(p=>fs.product.has(p)));
  if(fs.category&&fs.category.size>0)emps=emps.filter(e=>getEmpCategories(e).some(c=>fs.category.has(c)));
  if(fs.function.size>0)emps=emps.filter(e=>fs.function.has(e.function));
  if(fs.country.size>0)emps=emps.filter(e=>fs.country.has(e.country));
  if(search)emps=emps.filter(e=>(e.name||'').toLowerCase().includes(search)||(e.function||'').toLowerCase().includes(search));
  const el=document.getElementById('fcEmpList');
  const show=emps.slice(0,50);
  if(!show.length){el.innerHTML='<div class="emp-count">No matching employees</div>';return}
  let html=show.map(e=>{
    const esc=e.name.replace(/'/g,"\\'");
    return `<div class="emp-row"><span class="emp-name">${e.name}</span><span class="emp-meta">${e.function} · ${e.country} · ${fmt(e.salary)} · cap ${e.capPct||0}%</span><span class="emp-actions"><button class="emp-act act-up" title="Increase cap% by 10pp" onclick="fcEmpCapAdj('${esc}',10)">&#9650;</button><button class="emp-act act-down" title="Decrease cap% by 10pp" onclick="fcEmpCapAdj('${esc}',-10)">&#9660;</button><button class="emp-act act-arrow" title="Remove from forecast" onclick="fcEmpRemove('${esc}')">&#8594;</button><button class="emp-act act-x" title="Terminate" onclick="fcEmpTerminate('${esc}')">&#10005;</button></span></div>`;
  }).join('');
  if(emps.length>50)html+=`<div class="emp-count">+${emps.length-50} more</div>`;
  else html+=`<div class="emp-count">${emps.length} employee${emps.length===1?'':'s'}</div>`;
  el.innerHTML=html;
}

function fcEmpTerminate(name){
  fcEmpRemove(name);
}
function fcEmpRemove(name){
  if(!forecastScenario)return;
  const emp=forecastScenario.emps.find(e=>e.name===name);
  if(!emp)return;
  fcUndoStack.push(JSON.parse(JSON.stringify(forecastScenario)));
  document.getElementById('scenFcUndo').style.display='inline-block';
  forecastScenario.emps=forecastScenario.emps.filter(e=>e.name!==name);
  fcScenarioDirty=true;
  const entry={id:Date.now(),cmd:`remove ${name}`,scopedCmd:`remove ${name}`,msg:`Removed ${name} from forecast.`,delta:computeFcDelta(),isRefinement:false,parentId:null};
  fcActionHistory.push(entry);
  document.getElementById('scenFcApply').style.display='inline-block';
  renderFcActionHistory();renderFcScenarioChart();filterFcEmpList();renderFcPnlSummary();updateFcDetailOutBtn();
}
function fcEmpCapAdj(name,delta){
  if(!forecastScenario)return;
  const emp=forecastScenario.emps.find(e=>e.name===name);
  if(!emp)return;
  fcUndoStack.push(JSON.parse(JSON.stringify(forecastScenario)));
  document.getElementById('scenFcUndo').style.display='inline-block';
  const old=parseFloat(emp.capPct)||0;
  emp.capPct=Math.max(0,Math.min(100,old+delta));
  fcScenarioDirty=true;
  const dir=delta>0?'Increased':'Decreased';
  const entry={id:Date.now(),cmd:`${dir.toLowerCase()} "${name}" cap% by ${Math.abs(delta)}`,scopedCmd:`${dir.toLowerCase()} "${name}" cap% by ${Math.abs(delta)}`,msg:`${dir} ${name} cap% from ${old}% to ${emp.capPct}%.`,delta:computeFcDelta(),isRefinement:false,parentId:null};
  fcActionHistory.push(entry);
  document.getElementById('scenFcApply').style.display='inline-block';
  renderFcActionHistory();renderFcScenarioChart();filterFcEmpList();renderFcPnlSummary();updateFcDetailOutBtn();
}

function applyBudgetScenario(){
  if(!confirm('Apply budget scenario changes to your actual data? This will overwrite current employees, vendor rows, and T&E rows.'))return;
  state.employees=JSON.parse(JSON.stringify(budgetScenario.emps));
  state.vendorRows=JSON.parse(JSON.stringify(budgetScenario.vendorRows));
  state.teRows=JSON.parse(JSON.stringify(budgetScenario.teRows));
  saveState();
  budgetScenarioDirty=false;
  document.getElementById('scenBudgetApply').style.display='none';
  document.getElementById('budgetScenStatus').innerHTML='<span style="color:var(--success)">&#10003;</span> Scenario applied to your budget.';
  // Re-render everything with new data
  renderAll();
  try{refreshVendorPivot();refreshTePivot();refreshContractorPivot()}catch(e){}
  initBudgetScenario(); // re-clone from new baseline
  renderBudgetScenarioChart();renderScenarioPnlSummary();
}

function applyFcScenario(){
  if(!confirm('Apply forecast scenario changes to your actual data? This will overwrite current employees, vendor/T&E rows, and forecast assumptions.'))return;
  state.employees=JSON.parse(JSON.stringify(forecastScenario.emps));
  state.forecastAssumptions=JSON.parse(JSON.stringify(forecastScenario.assumptions));
  if(forecastScenario.vendorRows)state.vendorRows=JSON.parse(JSON.stringify(forecastScenario.vendorRows));
  if(forecastScenario.teRows)state.teRows=JSON.parse(JSON.stringify(forecastScenario.teRows));
  saveState();
  fcScenarioDirty=false;
  document.getElementById('scenFcApply').style.display='none';
  document.getElementById('fcScenStatus').innerHTML='<span style="color:var(--success)">&#10003;</span> Scenario applied to forecast.';
  renderAll();
  initForecastScenario();
  renderFcScenarioChart();renderScenarioPnlSummary();
}

function fmtC(v){if(Math.abs(v)>=1e6)return (v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(1)+'M';if(Math.abs(v)>=1e3)return (v<0?'-':'')+'$'+(Math.abs(v)/1e3).toFixed(0)+'K';return fmt(v)}
function pnlRow(label,base,scen,isCost){
  const d=scen-base;const cls=isCost?(d<0?'var(--success)':d>0?'var(--danger)':'var(--text-dim)'):(d<0?'var(--success)':'var(--text-dim)');
  return `<tr><td>${label}</td><td style="text-align:right">${typeof base==='number'&&Math.abs(base)>999?fmtC(base):base}</td><td style="text-align:right">${typeof scen==='number'&&Math.abs(scen)>999?fmtC(scen):scen}</td><td style="text-align:right;color:${cls}">${typeof d==='number'&&Math.abs(d)>999?fmtC(d):d}</td></tr>`;
}
function renderScenarioPnlSummary(){
  const bEl=document.getElementById('scenBudgetPnl');
  const fEl=document.getElementById('scenFcPnl');
  if(!bEl&&!fEl)return;
  const basePnl=computeBudgetPnl(JSON.parse(JSON.stringify(state.employees)),state.vendorRows,state.teRows);
  const scenPnl=computeBudgetPnl(budgetScenario.emps,budgetScenario.vendorRows,budgetScenario.teRows);
  const baseFc=projectForecast(state.employees);
  const scenFc=computeForecastPnl(forecastScenario.emps,forecastScenario.assumptions);
  const lastYr=FORECAST_YEARS.length;
  const bLast=baseFc[lastYr]||baseFc[baseFc.length-1]||{};
  const sLast=scenFc[lastYr]||scenFc[scenFc.length-1]||{};
  const tblStyle='width:100%;margin-top:4px;font-size:.72rem';
  const thRow='<tr><th style="text-align:left;font-size:.68rem">Metric</th><th style="text-align:right;font-size:.68rem">Base</th><th style="text-align:right;font-size:.68rem">Scen</th><th style="text-align:right;font-size:.68rem">Delta</th></tr>';
  const bTotInv=basePnl.annual.opex+basePnl.annual.capex+basePnl.annual.oao;
  const sTotInv=scenPnl.annual.opex+scenPnl.annual.capex+scenPnl.annual.oao;
  if(bEl)bEl.innerHTML=`<div style="background:var(--panel);padding:8px;border-radius:6px;border:1px solid var(--border)">
    <strong style="color:var(--accent);font-size:.76rem">Budget: Scenario vs Baseline</strong>
    <table style="${tblStyle}">${thRow}
    ${pnlRow('HC',basePnl.annual.hc,scenPnl.annual.hc,false)}
    ${pnlRow('C&B OpEx',basePnl.annual.opex,scenPnl.annual.opex,true)}
    ${pnlRow('Vendor/T&E',basePnl.annual.oao,scenPnl.annual.oao,true)}
    ${pnlRow('CapEx',basePnl.annual.capex,scenPnl.annual.capex,true)}
    <tr style="font-weight:700">${pnlRow('Total Investment',bTotInv,sTotInv,true).replace(/<\/?tr>/g,'')}</tr>
    </table></div>`;
  const fcLastIdx=FORECAST_YEARS.length;
  const bVT=fcVtProjected(state.vendorRows,state.teRows,state.forecastAssumptions,fcLastIdx);
  const sVT=fcVtProjected(forecastScenario.vendorRows,forecastScenario.teRows,forecastScenario.assumptions,fcLastIdx);
  if(fEl)fEl.innerHTML=`<div style="background:var(--panel);padding:8px;border-radius:6px;border:1px solid var(--border)">
    <strong style="color:var(--accent);font-size:.76rem">Forecast vs Baseline (${getDisplayYears()[4]})</strong>
    <table style="${tblStyle}">${thRow}
    ${pnlRow('HC',bLast.hc||0,sLast.hc||0,false)}
    ${pnlRow('C&B OpEx',bLast.opex||0,sLast.opex||0,true)}
    ${pnlRow('Vendor/T&E',bVT,sVT,true)}
    ${pnlRow('CapEx',bLast.capex||0,sLast.capex||0,true)}
    ${pnlRow('Total Inv',(bLast.total||0)+bVT,(sLast.total||0)+sVT,true)}
    </table></div>`;
}

// ── Wire up scenario events ──
function initScenarioPane(){
  // Toggle slide panel
  const panel=document.getElementById('scenarioSlidePanel');
  const toggleBtn=document.getElementById('scenarioToggleBtn');
  const arrowSpan=toggleBtn.querySelector('.arrow');
  toggleBtn.addEventListener('click',()=>{
    // Close data panel if open (mutual exclusivity)
    const dataPanel=document.getElementById('dataSlidePanel');
    const dataBtn=document.getElementById('dataToggleBtn');
    if(dataPanel.classList.contains('open')){dataPanel.classList.remove('open');document.body.classList.remove('data-open');dataBtn.querySelector('.arrow').innerHTML='&#9654;'}
    const isOpen=panel.classList.toggle('open');
    document.body.classList.toggle('scenario-open',isOpen);
    arrowSpan.innerHTML=isOpen?'&#9664;':'&#9654;';
    if(isOpen){
      if(!budgetScenario)initBudgetScenario();if(!forecastScenario)initForecastScenario();
      renderBudgetScenarioChart();renderFcScenarioChart();renderScenarioPnlSummary();renderSavedScenarios();
    }
  });
  // Chat input handlers (forecast only — budget chat input removed)
  // Forecast chat input removed — using preset buttons + action history
  // Apply buttons
  document.getElementById('scenBudgetApply').addEventListener('click',applyBudgetScenario);
  document.getElementById('scenFcApply').addEventListener('click',applyFcScenario);
  // Undo buttons
  document.getElementById('scenBudgetUndo').addEventListener('click',()=>{
    if(!budgetUndoStack.length)return;
    budgetScenario=budgetUndoStack.pop();
    scenActionHistory.pop();
    if(scenSelectedActionId!=null&&!scenActionHistory.find(a=>a.id===scenSelectedActionId))scenSelectedActionId=null;
    if(!budgetUndoStack.length){document.getElementById('scenBudgetUndo').style.display='none';budgetScenarioDirty=false;document.getElementById('scenBudgetApply').style.display='none'}
    renderScenActionHistory();updateDetailOutBtn();
    renderBudgetScenarioChart();renderScenarioPnlSummary();
  });
  document.getElementById('scenFcUndo').addEventListener('click',()=>{
    if(!fcUndoStack.length)return;
    forecastScenario=fcUndoStack.pop();
    fcActionHistory.pop();
    if(fcSelectedActionId!=null&&!fcActionHistory.find(a=>a.id===fcSelectedActionId))fcSelectedActionId=null;
    if(!fcUndoStack.length){document.getElementById('scenFcUndo').style.display='none';fcScenarioDirty=false;document.getElementById('scenFcApply').style.display='none'}
    renderFcActionHistory();updateFcDetailOutBtn();
    renderFcScenarioChart();renderScenarioPnlSummary();
  });
  // Reset buttons
  document.getElementById('scenBudgetReset').addEventListener('click',()=>{
    initBudgetScenario();budgetChatHistory=[];budgetScenarioDirty=false;budgetUndoStack=[];
    scenActionHistory=[];scenSelectedActionId=null;
    document.getElementById('scenBudgetApply').style.display='none';
    document.getElementById('scenBudgetUndo').style.display='none';
    document.getElementById('budgetScenStatus').innerHTML='';
    closeActionPane();updateDetailOutBtn();
    renderBudgetScenarioChart();renderScenarioPnlSummary();
  });
  document.getElementById('scenFcReset').addEventListener('click',()=>{
    initForecastScenario();fcChatHistory=[];fcScenarioDirty=false;fcUndoStack=[];
    fcActionHistory=[];fcSelectedActionId=null;
    document.getElementById('scenFcApply').style.display='none';
    document.getElementById('scenFcUndo').style.display='none';
    document.getElementById('fcScenStatus').innerHTML='';
    closeFcActionPane();updateFcDetailOutBtn();
    renderFcScenarioChart();renderScenarioPnlSummary();
  });
  // Example command buttons (only buttons with data-cmd, not category tabs)
  document.querySelectorAll('#budgetChatExamples button[data-cmd]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const pane=document.getElementById('budgetActionPane');
      const isRefining=pane.style.display!=='none'&&pane.dataset.refineActionId;
      if(isRefining){
        const parentId=parseInt(pane.dataset.refineActionId);
        handleBudgetChat(btn.dataset.cmd,true,parentId);
        closeActionPane();
      } else {
        handleBudgetChat(btn.dataset.cmd);
      }
    });
  });
  document.querySelectorAll('#fcChatExamples button[data-cmd]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const pane=document.getElementById('fcActionPane');
      const isRefining=pane.style.display!=='none'&&pane.dataset.refineActionId;
      if(isRefining){
        const parentId=parseInt(pane.dataset.refineActionId);
        handleFcChat(btn.dataset.cmd,true,parentId);
        closeFcActionPane();
      } else {
        handleFcChat(btn.dataset.cmd);
      }
    });
  });
  // Category tab switching for both chatbots
  ['budgetChatExamples','fcChatExamples'].forEach(id=>{
    const container=document.getElementById(id);
    container.querySelectorAll('.cmd-cat').forEach(tab=>{
      tab.addEventListener('click',()=>{
        container.querySelectorAll('.cmd-cat').forEach(t=>t.classList.remove('active'));
        container.querySelectorAll('.cmd-group').forEach(g=>g.classList.remove('active'));
        tab.classList.add('active');
        container.querySelector('.cmd-group[data-cat="'+tab.dataset.cat+'"]').classList.add('active');
        // Render vendor detail list when vendor tab is selected; hide employee sections
        if(id==='budgetChatExamples'){
          const isVendor=tab.dataset.cat==='vendor';
          const empSearch=document.getElementById('scenEmpSearch');
          const empList=document.getElementById('scenEmpList');
          const hireSection=document.getElementById('scenHireSection');
          if(empSearch)empSearch.parentElement.style.display=isVendor?'none':'';
          if(hireSection)hireSection.style.display=isVendor?'none':'';
          if(isVendor)renderVendorDetailList();
        }
        if(id==='fcChatExamples'){
          const isVendor=tab.dataset.cat==='vendor';
          const fcEmpSection=document.getElementById('fcEmpSection');
          if(fcEmpSection)fcEmpSection.style.display=isVendor?'none':'';
          if(isVendor)renderFcVendorDetailList();
        }
      });
    });
  });
  // Budget view toggle (Total Inv vs P&L)
  document.querySelectorAll('#scenBudgetViewToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#scenBudgetViewToggle button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');scenBudgetView=btn.dataset.sbview;
      renderBudgetScenarioChart();
    });
  });
  // Filter toggles
  document.querySelectorAll('#scenBudgetSplitToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#scenBudgetSplitToggle button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');scenBudgetSplit=btn.dataset.sbsplit;
      if(scenFiltersLinked){scenFcSplit=scenBudgetSplit==='none'?'total':scenBudgetSplit;document.querySelectorAll('#scenFcSplitToggle button').forEach(b=>{b.classList.toggle('active',b.dataset.sfsplit===scenFcSplit)});renderFcScenarioChart()}
      renderBudgetScenarioChart();
    });
  });
  document.querySelectorAll('#scenFcSplitToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#scenFcSplitToggle button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');scenFcSplit=btn.dataset.sfsplit;
      if(scenFiltersLinked){scenBudgetSplit=scenFcSplit==='total'?'none':scenFcSplit;document.querySelectorAll('#scenBudgetSplitToggle button').forEach(b=>{b.classList.toggle('active',b.dataset.sbsplit===scenBudgetSplit)});renderBudgetScenarioChart()}
      renderFcScenarioChart();
    });
  });
  document.getElementById('scenLinkFilters').addEventListener('change',function(){scenFiltersLinked=this.checked});
  // Initialize scenario data (charts render when panel opens)
  initBudgetScenario();initForecastScenario();
  initMonthRangeBar();
  initExecMonthRangeBar();
  // Saved scenarios
  document.getElementById('scenSaveBudgetBtn').addEventListener('click',()=>saveScenario('budget'));
  document.getElementById('scenSaveFcBtn').addEventListener('click',()=>saveScenario('forecast'));
  document.getElementById('scenExportBtn').addEventListener('click',exportScenarioToExcel);
}

// ── SAVED SCENARIOS & COMPARISON ──
const SAVED_SCEN_KEY='compPlanSavedScenarios';
function getSavedScenarios(){try{return JSON.parse(localStorage.getItem(SAVED_SCEN_KEY)||'[]')}catch(e){return[]}}
function setSavedScenarios(arr){localStorage.setItem(SAVED_SCEN_KEY,JSON.stringify(arr))}

function saveScenario(type){
  const name=document.getElementById('scenSaveName').value.trim();
  const statusTarget=type==='budget'?'budgetScenStatus':'fcScenStatus';
  if(!name){if(type==='budget'){document.getElementById(statusTarget).innerHTML='<span style="color:var(--danger)">Enter a name to save this scenario.</span>'}else{addChatMsg(statusTarget,'Enter a name to save this scenario.','error')}return}
  const saved=getSavedScenarios();
  if(saved.length>=5){if(type==='budget'){document.getElementById(statusTarget).innerHTML='<span style="color:var(--danger)">Max 5 saved scenarios. Delete one first.</span>'}else{addChatMsg(statusTarget,'Max 5 saved scenarios. Delete one first.','error')}return}
  const entry={name,type,timestamp:Date.now()};
  if(type==='budget'){
    const pnl=computeBudgetPnl(budgetScenario.emps,budgetScenario.vendorRows,budgetScenario.teRows);
    entry.data=JSON.parse(JSON.stringify(budgetScenario));
    entry.pnl={hc:pnl.annual.hc,opex:pnl.annual.opex,capex:pnl.annual.capex,oao:pnl.annual.oao,total:pnl.annual.total};
  } else {
    const pnlRows=computeForecastPnl(forecastScenario.emps,forecastScenario.assumptions);
    entry.data=JSON.parse(JSON.stringify(forecastScenario));
    const lastRow=pnlRows[pnlRows.length-1]||{};
    entry.pnl={hc:lastRow.hc||0,total:lastRow.total||0,opex:lastRow.opex||0};
  }
  saved.push(entry);setSavedScenarios(saved);
  document.getElementById('scenSaveName').value='';
  if(type==='budget'){document.getElementById('budgetScenStatus').innerHTML=`<span style="color:var(--success)">&#10003;</span> Scenario "${name}" saved.`}else{document.getElementById('fcScenStatus').innerHTML=`<span style="color:var(--success)">&#10003;</span> Scenario "${name}" saved.`}
  renderSavedScenarios();
}

function renderSavedScenarios(){
  const saved=getSavedScenarios();
  const list=document.getElementById('savedScenariosList');
  if(!saved.length){list.innerHTML='<div style="color:var(--text-dim);font-size:.75rem">No saved scenarios</div>';document.getElementById('scenCompareTable').innerHTML='';return}
  let html=saved.map((s,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.78rem">
    <span style="flex:1;color:var(--text)">${s.name} <span style="color:var(--text-dim)">(${s.type})</span></span>
    <button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem" onclick="loadSavedScenario(${i})">Load</button>
    <button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem;color:var(--danger)" onclick="deleteSavedScenario(${i})">×</button>
  </div>`).join('');
  list.innerHTML=html;
  renderComparisonTable(saved);
}

function loadSavedScenario(idx){
  const saved=getSavedScenarios();const s=saved[idx];if(!s)return;
  if(s.type==='budget'){
    budgetScenario=JSON.parse(JSON.stringify(s.data));budgetScenarioDirty=true;
    document.getElementById('scenBudgetApply').style.display='inline-block';
    document.getElementById('budgetScenStatus').innerHTML=`<span style="color:var(--success)">&#10003;</span> Loaded scenario "${s.name}".`;
    renderBudgetScenarioChart();
  } else {
    forecastScenario=JSON.parse(JSON.stringify(s.data));fcScenarioDirty=true;
    document.getElementById('scenFcApply').style.display='inline-block';
    document.getElementById('fcScenStatus').innerHTML=`<span style="color:var(--success)">&#10003;</span> Loaded scenario "${s.name}".`;
    renderFcScenarioChart();
  }
  renderScenarioPnlSummary();
}

function deleteSavedScenario(idx){
  const saved=getSavedScenarios();saved.splice(idx,1);setSavedScenarios(saved);renderSavedScenarios();
}

function renderComparisonTable(saved){
  const ct=document.getElementById('scenCompareTable');
  if(!saved||!saved.length){ct.innerHTML='';return}
  // Baseline P&L
  const baseBudget=computeBudgetPnl(state.employees,state.vendorRows||[],state.teRows||[]);
  const basePnl={hc:baseBudget.annual.hc,opex:baseBudget.annual.opex,capex:baseBudget.annual.capex,oao:baseBudget.annual.oao,total:baseBudget.annual.total};
  const metrics=[{key:'hc',label:'Headcount',isCurrency:false},{key:'opex',label:'OpEx',isCurrency:true},{key:'total',label:'Total Spend',isCurrency:true}];
  let html='<table style="width:100%;font-size:.72rem;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:3px 4px;border-bottom:1px solid var(--border);color:var(--text-dim)">Metric</th>';
  html+='<th style="text-align:right;padding:3px 4px;border-bottom:1px solid var(--border);color:var(--text-dim)">Baseline</th>';
  saved.forEach(s=>{html+=`<th style="text-align:right;padding:3px 4px;border-bottom:1px solid var(--border);color:var(--accent)">${s.name}</th>`});
  html+='</tr></thead><tbody>';
  metrics.forEach(met=>{
    html+=`<tr><td style="padding:3px 4px;color:var(--text)">${met.label}</td>`;
    const bv=basePnl[met.key]||0;
    html+=`<td style="text-align:right;padding:3px 4px;color:var(--text)">${met.isCurrency?fmt(bv):bv}</td>`;
    saved.forEach(s=>{
      const sv=s.pnl[met.key]||0;const delta=sv-bv;
      const color=delta<0?'var(--success)':delta>0?'var(--danger)':'var(--text-dim)';
      html+=`<td style="text-align:right;padding:3px 4px;color:${color}">${met.isCurrency?fmt(sv):sv}${delta!==0?' <span style="font-size:.65rem">'+(delta>0?'+':'')+((met.isCurrency?fmt(delta):delta))+'</span>':''}</td>`;
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  ct.innerHTML=html;
}

// ── SCENARIO EXCEL EXPORT ──
function exportScenarioToExcel(){
  if(typeof XLSX==='undefined')return alert('XLSX library not loaded');
  const wb=XLSX.utils.book_new();
  // Sheet 1: Summary
  const basePnl=computeBudgetPnl(state.employees,state.vendorRows||[],state.teRows||[]);
  const scenPnl=computeBudgetPnl(budgetScenario.emps,budgetScenario.vendorRows,budgetScenario.teRows);
  const summaryData=[
    ['Metric','Baseline','Scenario','Delta'],
    ['Headcount',basePnl.annual.hc,scenPnl.annual.hc,scenPnl.annual.hc-basePnl.annual.hc],
    ['Total Comp',basePnl.annual.comp,scenPnl.annual.comp,scenPnl.annual.comp-basePnl.annual.comp],
    ['OpEx',basePnl.annual.opex,scenPnl.annual.opex,scenPnl.annual.opex-basePnl.annual.opex],
    ['CapEx',basePnl.annual.capex,scenPnl.annual.capex,scenPnl.annual.capex-basePnl.annual.capex],
    ['Vendor/T&E',basePnl.annual.oao,scenPnl.annual.oao,scenPnl.annual.oao-basePnl.annual.oao],
    ['Total Spend',basePnl.annual.total,scenPnl.annual.total,scenPnl.annual.total-basePnl.annual.total]
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summaryData),'Summary');
  // Sheet 2: Monthly Detail
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData=[['Month','Comp OpEx','CapEx','Vendor/T&E','Total']];
  scenPnl.monthly.forEach((m,i)=>monthlyData.push([MO[i],m.opex,m.capex,m.oao,m.total]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(monthlyData),'Monthly Detail');
  // Sheet 3: Scenario Employees
  const empData=[['Name','Country','Seniority','Function','Salary','Cap%','Hire Date','Term Date']];
  budgetScenario.emps.forEach(e=>empData.push([e.name,e.country,e.seniority,e.function,e.salary,e.capPct||0,e.hireDate||'',e.termDate||'']));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(empData),'Employees');
  // Sheet 4: Saved Scenarios Comparison
  const saved=getSavedScenarios();
  if(saved.length){
    const cmpData=[['Metric','Baseline',...saved.map(s=>s.name)]];
    ['hc','opex','total'].forEach(k=>{
      const label=k==='hc'?'Headcount':k==='opex'?'OpEx':'Total';
      const bv=basePnl.annual[k]||basePnl.annual.total;
      cmpData.push([label,bv,...saved.map(s=>s.pnl[k]||0)]);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(cmpData),'Comparison');
  }
  xlsxDownload(wb,'scenario_analysis.xlsx');
}


/* ── window assignments for inline onclick handlers ── */
window.toggleScenFilter = toggleScenFilter;
window.selectScenAction = selectScenAction;
window.scenEmpCapAdj = scenEmpCapAdj;
window.scenEmpTransfer = scenEmpTransfer;
window.scenEmpTerminate = scenEmpTerminate;
window.removeScenFilterTag = removeScenFilterTag;
window.toggleFcFilter = toggleFcFilter;
window.selectFcAction = selectFcAction;
window.fcEmpCapAdj = fcEmpCapAdj;
window.fcEmpRemove = fcEmpRemove;
window.fcEmpTerminate = fcEmpTerminate;
window.adjVendorSpend = adjVendorSpend;
window.adjVendorSpendPct = adjVendorSpendPct;
window.adjFcVendorSpend = adjFcVendorSpend;
window.adjFcVendorSpendPct = adjFcVendorSpendPct;
window.onScenMonthChange = onScenMonthChange;
window.toggleDetailOut = toggleDetailOut;
window.applyRefinementMode = applyRefinementMode;
window.clearScenFilters = clearScenFilters;
window.closeActionPane = closeActionPane;
window.closeFcActionPane = closeFcActionPane;
window.clearFcFilters = clearFcFilters;
window.toggleFcDetailOut = toggleFcDetailOut;
window.scenAddHires = scenAddHires;
window.loadSavedScenario = loadSavedScenario;
window.deleteSavedScenario = deleteSavedScenario;
window.renderVendorDetailList = renderVendorDetailList;
window.renderFcVendorDetailList = renderFcVendorDetailList;

/* ── named exports ── */
export {
  budgetScenario, forecastScenario,
  initBudgetScenario, initForecastScenario,
  computeBudgetPnl, computeForecastPnl,
  renderBudgetScenarioChart, renderFcScenarioChart,
  handleBudgetChat, handleFcChat,
  initScenarioPane,
  exportScenarioToExcel,
  renderScenarioPnlSummary,
  createSpendMonthRangeBar,
  renderExecMonthRangeBar, initExecMonthRangeBar,
  applyBudgetScenario, applyFcScenario,
  renderSavedScenarios,
  vendorAdjMode, fcVendorAdjMode
};
