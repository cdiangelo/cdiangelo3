// ── MONTHLY SPREAD ──
import { state } from '../lib/state.js';
import { fmt, esc } from '../lib/constants.js';
import {
  getMonthlyBase, getMonthlyBonus, getMonthlyBenefits, getMonthlyComp,
  getMonthlyCapEx, getEmpProject, getEmpMarkets
} from '../lib/proration.js';

let monthlyMode='summary';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthlyColToggles(){
  const cols=[];
  document.querySelectorAll('.monthly-col:checked').forEach(cb=>cols.push(cb.value));
  return cols;
}
function getEmpColValue(e,col){
  if(col==='country')return e.country||'—';
  if(col==='seniority')return e.seniority||'—';
  if(col==='function')return e.function||'—';
  if(col==='market'){const mkts=getEmpMarkets(e);return mkts.map(m=>m.code).join(', ')||'—';}
  if(col==='bizline')return window.getBizLineName(e.businessLine);
  if(col==='busunit')return e.businessUnit||'—';
  const proj=getEmpProject(e);
  if(col==='project')return proj?proj.code:'—';
  if(col==='product')return proj?proj.product:'—';
  if(col==='category')return proj?proj.category:'—';
  return '—';
}
const COL_LABELS={country:'Country',seniority:'Seniority',function:'Function',market:'Market',bizline:'Biz Line',busunit:'Bus Unit',project:'Project',product:'Product',category:'Category'};

function renderMonthly(){
  // In ops mode, force summary and clear individual filter
  const isOps=document.body.classList.contains('ops-mode');
  if(isOps&&monthlyMode==='detail'){
    monthlyMode='summary';
    document.querySelectorAll('#monthlyToggle .btn').forEach(x=>{x.classList.toggle('active',x.dataset.mode==='summary')});
  }
  if(isOps)document.getElementById('monthlyFilter').value='';
  // In ops mode, enforce single-selection on split toggles
  if(isOps){
    const checked=[...document.querySelectorAll('.monthly-col:checked')];
    if(checked.length>1){checked.slice(1).forEach(cb=>cb.checked=false)}
  }
  document.getElementById('monthlyColLabel').textContent=isOps?'Split By:':'Columns:';

  const filterVal=document.getElementById('monthlyFilter').value;
  let emps=state.employees;
  if(filterVal&&!isOps)emps=emps.filter(e=>e.id===filterVal);
  const sel=document.getElementById('monthlyFilter');
  const cv=sel.value;
  sel.innerHTML='<option value="">All Employees</option>'+state.employees.map(e=>`<option value="${e.id}"${e.id===cv?' selected':''}>${e.name}</option>`).join('');

  const tbl=document.getElementById('monthlyTable');
  const cols=getMonthlyColToggles();

  if(monthlyMode==='summary'){
    // Build summary rows — optionally grouped by toggled columns
    if(cols.length===0){
      // Simple summary: one row per month
      let annBase=0,annBonus=0,annBen=0,annCapEx=0;
      let html='<thead><tr><th style="text-align:center;min-width:50px">Month</th><th>Base</th><th>Bonus</th><th>Benefits</th><th>Total</th><th>CapEx</th><th>OpEx (P&L)</th></tr></thead><tbody>';
      MONTHS.forEach((m,mi)=>{
        const mBase=emps.reduce((a,e)=>a+getMonthlyBase(e,mi),0);
        const mBonus=emps.reduce((a,e)=>a+getMonthlyBonus(e,mi),0);
        const mBen=emps.reduce((a,e)=>a+getMonthlyBenefits(e,mi),0);
        const mCapEx=emps.reduce((a,e)=>a+getMonthlyCapEx(e,mi),0);
        const mTotal=mBase+mBonus+mBen;
        annBase+=mBase;annBonus+=mBonus;annBen+=mBen;annCapEx+=mCapEx;
        html+=`<tr><td style="text-align:center">${m}</td><td>${fmt(mBase)}</td><td>${fmt(mBonus)}</td><td>${fmt(mBen)}</td><td style="font-weight:600;color:var(--accent)">${fmt(mTotal)}</td><td>${fmt(mCapEx)}</td><td style="color:var(--success)">${fmt(mTotal-mCapEx)}</td></tr>`;
      });
      html+=`</tbody><tfoot><tr><td>Annual Total</td><td>${fmt(annBase)}</td><td>${fmt(annBonus)}</td><td>${fmt(annBen)}</td><td style="color:var(--accent)">${fmt(annBase+annBonus+annBen)}</td><td>${fmt(annCapEx)}</td><td style="color:var(--success)">${fmt(annBase+annBonus+annBen-annCapEx)}</td></tr></tfoot>`;
      tbl.innerHTML=html;
    } else {
      // Grouped summary: rows per month per unique combination of toggled fields
      const groupKey=e=>cols.map(c=>getEmpColValue(e,c)).join('||');
      const groupMap={};
      emps.forEach(e=>{const k=groupKey(e);if(!groupMap[k])groupMap[k]={emps:[],labels:cols.map(c=>getEmpColValue(e,c))};groupMap[k].emps.push(e)});
      const groups=Object.values(groupMap).sort((a,b)=>a.labels.join('').localeCompare(b.labels.join('')));

      let html='<thead><tr>';
      cols.forEach(c=>html+=`<th>${COL_LABELS[c]}</th>`);
      html+='<th style="text-align:center;min-width:50px">Month</th><th>Base</th><th>Bonus</th><th>Benefits</th><th>Total</th><th>CapEx</th><th>OpEx (P&L)</th></tr></thead><tbody>';
      const annTotals={base:0,bonus:0,ben:0,capex:0};
      groups.forEach(g=>{
        let gBase=0,gBonus=0,gBen=0,gCapEx=0;
        MONTHS.forEach((m,mi)=>{
          const mBase=g.emps.reduce((a,e)=>a+getMonthlyBase(e,mi),0);
          const mBonus=g.emps.reduce((a,e)=>a+getMonthlyBonus(e,mi),0);
          const mBen=g.emps.reduce((a,e)=>a+getMonthlyBenefits(e,mi),0);
          const mCapEx=g.emps.reduce((a,e)=>a+getMonthlyCapEx(e,mi),0);
          const mTotal=mBase+mBonus+mBen;
          annTotals.base+=mBase;annTotals.bonus+=mBonus;annTotals.ben+=mBen;annTotals.capex+=mCapEx;
          gBase+=mBase;gBonus+=mBonus;gBen+=mBen;gCapEx+=mCapEx;
          html+='<tr>';
          if(mi===0){cols.forEach((c,ci)=>html+=`<td rowspan="13" style="font-weight:600;vertical-align:top;border-right:1px solid var(--border-light);padding:6px 10px">${g.labels[ci]}</td>`)}
          html+=`<td style="text-align:center;min-width:50px">${m}</td><td>${fmt(mBase)}</td><td>${fmt(mBonus)}</td><td>${fmt(mBen)}</td><td style="font-weight:600;color:var(--accent)">${fmt(mTotal)}</td><td>${fmt(mCapEx)}</td><td style="color:var(--success)">${fmt(mTotal-mCapEx)}</td></tr>`;
        });
        // Subtotal row for this group
        const gTotal=gBase+gBonus+gBen;
        html+=`<tr style="background:var(--panel);font-weight:600;border-top:2px solid var(--border)"><td style="text-align:center;min-width:50px">Subtotal</td><td>${fmt(gBase)}</td><td>${fmt(gBonus)}</td><td>${fmt(gBen)}</td><td style="color:var(--accent)">${fmt(gTotal)}</td><td>${fmt(gCapEx)}</td><td style="color:var(--success)">${fmt(gTotal-gCapEx)}</td></tr>`;
      });
      html+=`</tbody><tfoot><tr>`;
      cols.forEach(()=>html+='<td></td>');
      html+=`<td>Annual Total</td><td>${fmt(annTotals.base)}</td><td>${fmt(annTotals.bonus)}</td><td>${fmt(annTotals.ben)}</td><td style="color:var(--accent)">${fmt(annTotals.base+annTotals.bonus+annTotals.ben)}</td><td>${fmt(annTotals.capex)}</td><td style="color:var(--success)">${fmt(annTotals.base+annTotals.bonus+annTotals.ben-annTotals.capex)}</td></tr></tfoot>`;
      tbl.innerHTML=html;
    }
  } else {
    // Detail mode — individual employees with optional roster columns
    let html='<thead><tr><th>Month</th>';
    emps.forEach(e=>{
      let label=e.name;
      if(cols.length)label+=`<br><span style="font-size:.7rem;color:var(--text-dim);font-weight:400">${cols.map(c=>getEmpColValue(e,c)).join(' / ')}</span>`;
      html+=`<th>${label}</th>`;
    });
    html+='<th>Total</th></tr></thead><tbody>';
    let annuals=emps.map(()=>0);let grandTotal=0;
    MONTHS.forEach((m,mi)=>{
      html+=`<tr><td>${m}</td>`;
      let rowTotal=0;
      emps.forEach((e,i)=>{const v=getMonthlyComp(e,mi);annuals[i]+=v;rowTotal+=v;html+=`<td class="comp-sensitive">${fmt(v)}</td>`});
      grandTotal+=rowTotal;
      html+=`<td style="font-weight:600;color:var(--accent)">${fmt(rowTotal)}</td></tr>`;
    });
    html+='</tbody><tfoot><tr><td>Annual Total</td>';
    emps.forEach((e,i)=>html+=`<td class="comp-sensitive">${fmt(annuals[i])}</td>`);
    html+=`<td style="color:var(--accent)">${fmt(grandTotal)}</td></tr></tfoot>`;
    tbl.innerHTML=html;
  }
}
document.querySelectorAll('#monthlyToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#monthlyToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');monthlyMode=b.dataset.mode;renderMonthly();
}));
document.getElementById('monthlyFilter').addEventListener('change',renderMonthly);
document.querySelectorAll('.monthly-col').forEach(cb=>cb.addEventListener('change',function(){
  const isOps=document.body.classList.contains('ops-mode');
  if(isOps&&this.checked){
    document.querySelectorAll('.monthly-col').forEach(other=>{if(other!==this)other.checked=false});
  }
  renderMonthly();
}));

export { renderMonthly };

window.renderMonthly = renderMonthly;
