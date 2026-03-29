// ── Date proration helpers ──
import { state, getBonusAmt, getBenefitsAmt, getTotalComp } from './state.js';

import { CURRENT_YEAR } from './constants.js';
export { CURRENT_YEAR };
export function daysInMonth(year,month){return new Date(year,month+1,0).getDate()}
export function getMonthFactor(emp,monthIdx,year){
  if(!year)year=CURRENT_YEAR;
  const mStart=new Date(year,monthIdx,1);
  const mDays=daysInMonth(year,monthIdx);
  const mEnd=new Date(year,monthIdx,mDays);
  let startDay=1,endDay=mDays;
  if(emp.hireDate){
    const hd=new Date(emp.hireDate);
    if(hd.getFullYear()>year||(hd.getFullYear()===year&&hd.getMonth()>monthIdx))return 0;
    if(hd.getFullYear()===year&&hd.getMonth()===monthIdx)startDay=hd.getDate();
  }
  if(emp.termDate){
    const td=new Date(emp.termDate);
    if(td.getFullYear()<year||(td.getFullYear()===year&&td.getMonth()<monthIdx))return 0;
    if(td.getFullYear()===year&&td.getMonth()===monthIdx)endDay=td.getDate();
  }
  if(startDay>endDay)return 0;
  return (endDay-startDay+1)/mDays;
}
export function getAnnualFactor(emp,year){
  if(!year)year=CURRENT_YEAR;
  if(!emp.hireDate&&!emp.termDate)return 1;
  let total=0;
  for(let m=0;m<12;m++)total+=getMonthFactor(emp,m,year);
  return total/12;
}
export function getProratedBase(emp,year){if(!emp)return 0;return Math.round((emp.salary||0)*getAnnualFactor(emp,year))}
export function getProratedBonus(emp,year){if(!emp)return 0;return Math.round(getBonusAmt(emp)*getAnnualFactor(emp,year))}
export function getProratedBenefits(emp,year){if(!emp)return 0;return Math.round(getBenefitsAmt(emp)*getAnnualFactor(emp,year))}
export function getProratedComp(emp,year){if(!emp)return 0;return getProratedBase(emp,year)+getProratedBonus(emp,year)+getProratedBenefits(emp,year)}
export function getMonthlyBase(emp,monthIdx,year){if(!emp)return 0;return Math.round((emp.salary||0)/12*getMonthFactor(emp,monthIdx,year))}
export function getMonthlyBonus(emp,monthIdx,year){if(!emp)return 0;return Math.round(getBonusAmt(emp)/12*getMonthFactor(emp,monthIdx,year))}
export function getMonthlyBenefits(emp,monthIdx,year){if(!emp)return 0;return Math.round(getBenefitsAmt(emp)/12*getMonthFactor(emp,monthIdx,year))}
export function getMonthlyComp(emp,monthIdx,year){if(!emp)return 0;return getMonthlyBase(emp,monthIdx,year)+getMonthlyBonus(emp,monthIdx,year)+getMonthlyBenefits(emp,monthIdx,year)}
// CapEx / OpEx helpers
export function getCapPct(emp){if(!emp)return 0;return parseFloat(emp.capPct)||0}
export function getCapEx(emp){if(!emp)return 0;return Math.round(getTotalComp(emp)*getCapPct(emp)/100)}
export function getOpEx(emp){if(!emp)return 0;return getTotalComp(emp)-getCapEx(emp)}
export function getProratedCapEx(emp,year){return Math.round(getProratedComp(emp,year)*getCapPct(emp)/100)}
export function getProratedOpEx(emp,year){return getProratedComp(emp,year)-getProratedCapEx(emp,year)}
export function getMonthlyCapEx(emp,monthIdx,year){return Math.round(getMonthlyComp(emp,monthIdx,year)*getCapPct(emp)/100)}
export function getMonthlyOpEx(emp,monthIdx,year){return getMonthlyComp(emp,monthIdx,year)-getMonthlyCapEx(emp,monthIdx,year)}

// Allocation helpers
export function getEmpAllocTotal(empId){
  const emp=state.employees.find(e=>e.id===empId);
  if(!emp||!emp.allocations||!emp.allocations.length)return 0;
  return emp.allocations.reduce((s,a)=>s+a.pct,0);
}
export function getAllocFlag(empId){
  const emp=state.employees.find(e=>e.id===empId);
  if(!emp||!emp.allocations||!emp.allocations.length)return null;
  const total=emp.allocations.reduce((s,a)=>s+a.pct,0);
  if(Math.abs(total-100)<0.01)return{ok:true,total};
  return{ok:false,total,overridden:!!state.allocOverrides[empId]};
}
export function getProjectByCode(code){return state.projects.find(p=>p.code===code)}
export function getProjectById(id){return state.projects.find(p=>p.id===id)}
export function getEmpProject(emp){
  if(!emp.allocations||!emp.allocations.length)return null;
  const primary=emp.allocations.find(a=>a.primary)||emp.allocations[0];
  return primary?getProjectById(primary.projId):null;
}
export function getEmpMarkets(emp){
  if(!emp.allocations||!emp.allocations.length)return [{code:'GL0000',pct:100}];
  const markets=[];
  emp.allocations.forEach(a=>{
    const p=getProjectById(a.projId);
    if(!p)return;
    const mkt=p.marketCode||'GL0000';
    const existing=markets.find(m=>m.code===mkt);
    if(existing)existing.pct+=a.pct;
    else markets.push({code:mkt,pct:a.pct});
  });
  return markets.length?markets:[{code:'GL0000',pct:100}];
}
export function getEmpPrimaryMarket(emp){
  const markets=getEmpMarkets(emp);
  if(markets.length===1)return markets[0].code;
  const primary=emp.allocations?emp.allocations.find(a=>a.primary):null;
  if(primary){const p=getProjectById(primary.projId);if(p&&p.marketCode)return p.marketCode}
  return markets[0].code;
}

// Expose on window for cross-module references
window.getEmpProject = getEmpProject;
window.getProjectById = getProjectById;
window.getProjectByCode = getProjectByCode;
window.getEmpMarkets = getEmpMarkets;
window.getEmpPrimaryMarket = getEmpPrimaryMarket;
window.getEmpAllocTotal = getEmpAllocTotal;
window.getAllocFlag = getAllocFlag;
