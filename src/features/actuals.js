// ── Actuals Module — non-editable realized data + variance analysis ──
import { state, saveState } from '../lib/state.js';
import { generateActuals } from '../lib/seed-data.js';
import { fmt } from '../lib/constants.js';

const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ACCOUNTS=['C&B','OAO','Contractors','T&E'];

function fmtK(v){
  if(!v)return '$0K';
  return '$'+(v/1000).toLocaleString('en-US',{maximumFractionDigits:1})+'K';
}

function getPlanByMonth(){
  // Compute plan totals per account per month from current state
  const plan={};
  ACCOUNTS.forEach(a=>plan[a]=MO.map(()=>0));
  // C&B from employees
  (state.employees||[]).forEach(e=>{
    const startMo=e.startMonth||0;
    const base=e.baseSalary||0;
    const monthly=Math.round(base/12);
    const bonus=Math.round(base*(e.bonusPct||0)/100/12);
    const benefits=Math.round(base*(e.benefitsPct||0)/100/12);
    const comp=monthly+bonus+benefits;
    MO.forEach((_,mi)=>{if(mi>=startMo)plan['C&B'][mi]+=comp});
  });
  // C&B Other
  (state.cbOtherRows||[]).forEach(r=>{MO.forEach((m,mi)=>{plan['C&B'][mi]+=(parseFloat(r[m])||0)})});
  // OAO from vendors + oao other
  (state.vendorRows||[]).forEach(r=>{MO.forEach((m,mi)=>{plan['OAO'][mi]+=(parseFloat(r[m])||0)})});
  (state.oaoOtherRows||[]).forEach(r=>{MO.forEach((m,mi)=>{plan['OAO'][mi]+=(parseFloat(r[m])||0)})});
  // Contractors
  (state.contractorRows||[]).forEach(r=>{MO.forEach((m,mi)=>{plan['Contractors'][mi]+=(parseFloat(r[m])||0)})});
  // T&E
  (state.teRows||[]).forEach(r=>{MO.forEach((m,mi)=>{plan['T&E'][mi]+=(parseFloat(r[m])||0)})});

  // HC by month
  plan._hc=MO.map((_,mi)=>(state.employees||[]).filter(e=>(e.startMonth||0)<=mi).length);
  return plan;
}

function renderActuals(){
  if(!state.actuals)state.actuals=generateActuals(state);
  const actuals=state.actuals;
  const plan=getPlanByMonth();
  const tbody=document.getElementById('actualsTbody');
  const varTbody=document.getElementById('varianceTbody');
  if(!tbody)return;

  // Map actuals months into account arrays
  const act={};
  ACCOUNTS.forEach(a=>act[a]=MO.map(()=>0));
  act._hc=MO.map(()=>0);
  (actuals.months||[]).forEach((m,mi)=>{
    act['C&B'][mi]=m.cb||0;
    act['OAO'][mi]=m.oao||0;
    act['Contractors'][mi]=m.ctr||0;
    act['T&E'][mi]=m.te||0;
    act._hc[mi]=m.hc||0;
  });

  // Render actuals table
  let h='';
  // HC row
  h+=`<tr style="background:var(--panel-inset)"><td style="font-weight:600">Headcount</td>`;
  h+=`<td style="text-align:center;font-weight:600">${act._hc[0]||'—'}</td>`;
  MO.forEach((_,mi)=>h+=`<td style="text-align:right">${act._hc[mi]}</td>`);
  h+=`<td style="text-align:right;font-weight:600">${Math.round(act._hc.reduce((s,v)=>s+v,0)/12)}</td></tr>`;
  // Account rows
  ACCOUNTS.forEach(acct=>{
    const fy=act[acct].reduce((s,v)=>s+v,0);
    h+=`<tr><td style="font-weight:600">${acct}</td><td></td>`;
    act[acct].forEach(v=>h+=`<td style="text-align:right">${fmtK(v)}</td>`);
    h+=`<td style="text-align:right;font-weight:700">${fmtK(fy)}</td></tr>`;
  });
  // Total row
  const totalAct=MO.map((_,mi)=>ACCOUNTS.reduce((s,a)=>s+act[a][mi],0));
  const totalFy=totalAct.reduce((s,v)=>s+v,0);
  h+=`<tr style="font-weight:700;border-top:2px solid var(--border)"><td>Total</td><td></td>`;
  totalAct.forEach(v=>h+=`<td style="text-align:right">${fmtK(v)}</td>`);
  h+=`<td style="text-align:right">${fmtK(totalFy)}</td></tr>`;
  tbody.innerHTML=h;

  // Render variance table
  if(!varTbody)return;
  let vh='';
  ACCOUNTS.forEach(acct=>{
    const varArr=MO.map((_,mi)=>act[acct][mi]-plan[acct][mi]);
    const varFy=varArr.reduce((s,v)=>s+v,0);
    const planFy=plan[acct].reduce((s,v)=>s+v,0);
    const pctVar=planFy?Math.round((varFy/planFy)*100):0;
    vh+=`<tr><td style="font-weight:600">${acct}</td>`;
    varArr.forEach(v=>{
      const color=v>0?'var(--danger)':v<0?'var(--success)':'var(--text-dim)';
      vh+=`<td style="text-align:right;color:${color}">${v>0?'+':''}${fmtK(v)}</td>`;
    });
    const fyColor=varFy>0?'var(--danger)':varFy<0?'var(--success)':'var(--text-dim)';
    vh+=`<td style="text-align:right;font-weight:700;color:${fyColor}">${varFy>0?'+':''}${fmtK(varFy)}</td>`;
    vh+=`<td style="text-align:right;font-weight:700;color:${fyColor}">${pctVar>0?'+':''}${pctVar}%</td></tr>`;
  });
  // Total variance row
  const totalPlan=MO.map((_,mi)=>ACCOUNTS.reduce((s,a)=>s+plan[a][mi],0));
  const totalVar=MO.map((_,mi)=>totalAct[mi]-totalPlan[mi]);
  const totalVarFy=totalVar.reduce((s,v)=>s+v,0);
  const totalPlanFy=totalPlan.reduce((s,v)=>s+v,0);
  const totalPctVar=totalPlanFy?Math.round((totalVarFy/totalPlanFy)*100):0;
  vh+=`<tr style="font-weight:700;border-top:2px solid var(--border)"><td>Total</td>`;
  totalVar.forEach(v=>{
    const c=v>0?'var(--danger)':v<0?'var(--success)':'var(--text-dim)';
    vh+=`<td style="text-align:right;color:${c}">${v>0?'+':''}${fmtK(v)}</td>`;
  });
  const tc=totalVarFy>0?'var(--danger)':totalVarFy<0?'var(--success)':'var(--text-dim)';
  vh+=`<td style="text-align:right;color:${tc}">${totalVarFy>0?'+':''}${fmtK(totalVarFy)}</td>`;
  vh+=`<td style="text-align:right;color:${tc}">${totalPctVar>0?'+':''}${totalPctVar}%</td></tr>`;
  varTbody.innerHTML=vh;
}

// Randomize button
const randBtn=document.getElementById('actualsRandomize');
if(randBtn){
  randBtn.addEventListener('click',()=>{
    state.actuals=generateActuals(state);
    saveState();
    renderActuals();
  });
}

window.renderActuals=renderActuals;

export { renderActuals };
