// ── EMPLOYEE PIVOT ──
import { state } from '../lib/state.js';
import { fmt, esc, SENIORITY, FUNCTIONS, COUNTRIES } from '../lib/constants.js';
import {
  getMonthlyComp, getMonthlyCapEx, getEmpProject,
  CURRENT_YEAR
} from '../lib/proration.js';

let empPivotChartInst=null;
function getEmpDimKey(emp,dim){
  if(dim==='function')return emp.function||'Unknown';
  if(dim==='seniority')return emp.seniority||'Unknown';
  if(dim==='country')return emp.country||'Unknown';
  if(dim==='category'){const p=getEmpProject(emp);return p?p.category||'Uncategorized':'Uncategorized'}
  if(dim==='product'){const p=getEmpProject(emp);return p?p.product||'Unassigned':'Unassigned'}
  if(dim==='bizline'){const bl=state.bizLines.find(b=>b.code===emp.businessLine);return bl?bl.code+' '+bl.name:'Unassigned'}
  return 'Total';
}
function getEmpMetric(emp,metric){
  let comp=0,capex=0;
  for(let mi=0;mi<12;mi++){comp+=getMonthlyComp(emp,mi);capex+=getMonthlyCapEx(emp,mi)}
  if(metric==='hc')return 1;
  if(metric==='comp')return comp;
  if(metric==='opex')return comp-capex;
  if(metric==='capex')return capex;
  return 1;
}
function renderEmpPivot(){
  const rowDim=document.getElementById('empPivotRowDim').value;
  const colDim=document.getElementById('empPivotColDim').value;
  const metric=document.getElementById('empPivotMetric').value;
  const emps=(state.employees||[]).filter(e=>!e.termDate||new Date(e.termDate).getFullYear()>=CURRENT_YEAR);
  const isCurrency=metric!=='hc';

  // Build pivot
  const rowSet=new Set(),colSet=new Set();
  emps.forEach(e=>{rowSet.add(getEmpDimKey(e,rowDim));colSet.add(getEmpDimKey(e,colDim))});
  const rowVals=[...rowSet].sort();
  const colVals=[...colSet].sort();
  const pivot={};
  rowVals.forEach(rv=>{pivot[rv]={};colVals.forEach(cv=>{pivot[rv][cv]=0})});
  emps.forEach(e=>{
    const rv=getEmpDimKey(e,rowDim);
    const cv=getEmpDimKey(e,colDim);
    pivot[rv][cv]+=getEmpMetric(e,metric);
  });
  // Row totals for sorting
  const rowTotals={};rowVals.forEach(rv=>{rowTotals[rv]=colVals.reduce((s,cv)=>s+pivot[rv][cv],0)});
  const sortedRows=[...rowVals].sort((a,b)=>rowTotals[b]-rowTotals[a]);

  // Column totals
  const colTotals={};colVals.forEach(cv=>{colTotals[cv]=sortedRows.reduce((s,rv)=>s+pivot[rv][cv],0)});
  const grandTotal=Object.values(colTotals).reduce((s,v)=>s+v,0);

  // Stacked bar chart
  const showBreakout=metric!=='comp';
  if(typeof Chart!=='undefined'){
    const canvas=document.getElementById('empPivotChart');
    if(empPivotChartInst)empPivotChartInst.destroy();
    const pivotColors=window.getChartColors();
    const chartLabels=colVals.map(v=>v.length>14?v.slice(0,12)+'…':v).concat(['Total']);
    const datasets=showBreakout?[...sortedRows].reverse().map((rv,i)=>{
      const ri=sortedRows.length-1-i;
      return {label:rv.length>20?rv.slice(0,18)+'…':rv,
        data:colVals.map(cv=>pivot[rv][cv]).concat([rowTotals[rv]]),
        backgroundColor:pivotColors[ri%pivotColors.length],
        stack:'s0'};
    }):[{label:'Total Comp',
      data:colVals.map(cv=>colTotals[cv]).concat([grandTotal]),
      backgroundColor:pivotColors[0],
      stack:'s0'}];
    const _epDk=document.documentElement.classList.contains('dark');
    const _epTc=_epDk?(window.chartColorScheme==='crisp'?'#c0c0c0':'#ffffff'):(window.chartColorScheme==='crisp'?'#333333':'#5a5a5a');
    const _epGc=_epDk?'rgba(255,255,255,.08)':'#ddd';
    empPivotChartInst=new Chart(canvas,{
      type:'bar',data:{labels:chartLabels,datasets},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},datalabels:{display:false}},
        scales:{x:{stacked:true,ticks:{display:false},grid:{color:_epGc}},y:{stacked:true,ticks:{font:{size:10},color:_epTc,callback:function(v){return isCurrency?(v>=1e6?'$'+(v/1e6).toFixed(1)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'K':'$'+v.toLocaleString()):v}},grid:{color:_epGc}}}
      }
    });
  }

  // Matrix table
  const tbl=document.getElementById('empPivotTable');
  const nDataCols=colVals.length+1;
  const datColW=Math.floor(100/(nDataCols+1))+'%';
  const truncCol=v=>v.length>14?v.slice(0,12)+'…':v;
  let h='<thead><tr><th style="position:sticky;left:0;z-index:2;background:var(--panel-inset);font-size:.72rem;width:auto"></th>';
  colVals.forEach(cv=>h+=`<th style="text-align:center;font-size:.72rem;white-space:nowrap;width:${datColW}" title="${cv}">${truncCol(cv)}</th>`);
  h+=`<th style="text-align:center;font-size:.72rem;font-weight:700;width:${datColW}">Total</th></tr></thead><tbody>`;
  sortedRows.forEach((rv,ri)=>{
    const pivotColors=window.getChartColors();
    const dotColor=pivotColors[ri%pivotColors.length];
    h+=`<tr><td style="font-weight:600;font-size:.74rem;white-space:nowrap;position:sticky;left:0;background:var(--panel);z-index:1"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${dotColor};margin-right:4px"></span>${rv}</td>`;
    colVals.forEach(cv=>{const v=pivot[rv][cv];h+=`<td class="num" style="font-size:.74rem;text-align:center;${v===0||!showBreakout?'color:var(--text-dim)':''}">${!showBreakout?'—':v===0?'—':isCurrency?fmt(v):v}</td>`});
    h+=`<td class="num" style="font-size:.74rem;font-weight:700;text-align:center">${!showBreakout?'—':isCurrency?fmt(rowTotals[rv]):rowTotals[rv]}</td></tr>`;
  });
  h+=`<tr style="font-weight:700;border-top:2px solid var(--accent)"><td style="position:sticky;left:0;background:var(--panel);z-index:1;font-size:.74rem">Total</td>`;
  colVals.forEach(cv=>h+=`<td class="num" style="font-size:.74rem;text-align:center">${isCurrency?fmt(colTotals[cv]):colTotals[cv]}</td>`);
  h+=`<td class="num" style="font-size:.74rem;font-weight:800;text-align:center">${isCurrency?fmt(grandTotal):grandTotal}</td></tr></tbody>`;
  tbl.innerHTML=h;
  tbl.style.tableLayout='fixed';

  // Align table data columns under chart bars
  requestAnimationFrame(()=>{
    const ctrlCol=document.getElementById('empPivotControlsCol');
    const tblWrap=document.getElementById('empPivotTableWrap');
    if(tblWrap)tblWrap.style.marginLeft='0';
    if(ctrlCol&&empPivotChartInst&&empPivotChartInst.chartArea){
      const ctrlW=ctrlCol.offsetWidth;
      const chartLeft=empPivotChartInst.chartArea.left;
      const firstColW=ctrlW+chartLeft;
      const firstTh=tbl.querySelector('thead th');
      if(firstTh)firstTh.style.width=firstColW+'px';
      tbl.querySelectorAll('tbody td:first-child, tfoot td:first-child').forEach(td=>td.style.width=firstColW+'px');
    }
  });
}
document.getElementById('empPivotRowDim').addEventListener('change',renderEmpPivot);
document.getElementById('empPivotColDim').addEventListener('change',renderEmpPivot);
document.getElementById('empPivotMetric').addEventListener('change',renderEmpPivot);

// Hook into renderEmployees to also update the pivot
// This import is done dynamically to avoid circular dependency
function initPivotHook(){
  const _origRenderEmployees=window.renderEmployees;
  if(_origRenderEmployees){
    window.renderEmployees=function(){_origRenderEmployees();renderEmpPivot()};
  }
}

export { renderEmpPivot, initPivotHook };

window.renderEmpPivot = renderEmpPivot;
window.initPivotHook = initPivotHook;
initPivotHook();
