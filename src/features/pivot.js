// ── P&L Pivot Table ──
// Full P&L walk: HC, C&B, OAO, EBITDA, D&A, OpEx, CapEx, Tot Inv
import { state } from '../lib/state.js';
import { fmt, CURRENT_YEAR } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx } from '../lib/proration.js';

const getChartColors=()=>window.getChartColors();
const hexToRgba=(...a)=>window.hexToRgba(...a);
const getEmpProject=(...a)=>window.getEmpProject?window.getEmpProject(...a):null;

let pivotChart=null;
let currentView='collapsed'; // collapsed | expanded | totinv

// ── Dimension helpers ──
function getDimVal(e,dim){
  if(dim==='category'){const p=getEmpProject(e);return p?p.category||'Unassigned':'Unassigned'}
  if(dim==='product'){const p=getEmpProject(e);return p?p.product||'Unassigned':'Unassigned'}
  if(dim==='function')return e.function||'Unknown';
  if(dim==='country')return e.country||'Unknown';
  if(dim==='bizline')return e.bizLine||e.businessLine||'Unassigned';
  return 'Unknown';
}

// ── Build P&L data per row ──
function buildPnlData(){
  const dim1=document.getElementById('pivotRowDim').value;
  const dim2El=document.getElementById('pivotRow2Dim');
  const dim2=dim2El?dim2El.value:'';
  const rows={};
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  // ── Employees → C&B ──
  (state.employees||[]).forEach(e=>{
    if(e.termDate){const td=new Date(e.termDate);if(td.getFullYear()<=CURRENT_YEAR&&td.getMonth()<11)return}
    const k1=getDimVal(e,dim1);
    let comp=0,capex=0;
    for(let m=0;m<12;m++){comp+=getMonthlyComp(e,m);capex+=getMonthlyCapEx(e,m)}
    if(!rows[k1])rows[k1]={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0,children:{}};
    rows[k1].hc++;
    rows[k1].cb+=comp;
    rows[k1].cbCapex+=capex;
    // Sub-row
    if(dim2){
      const k2=getDimVal(e,dim2);
      if(!rows[k1].children[k2])rows[k1].children[k2]={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0};
      rows[k1].children[k2].hc++;
      rows[k1].children[k2].cb+=comp;
      rows[k1].children[k2].cbCapex+=capex;
    }
  });

  // ── Vendor rows → OAO (split by type) ──
  (state.vendorRows||[]).forEach(r=>{
    let fy=0;for(let m=0;m<12;m++)fy+=(r[months[m]]||0);
    if(fy===0)return;
    // Map vendor to a row dimension
    const k1=getDimVal(r,dim1)||'Unknown';
    if(!rows[k1])rows[k1]={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0,children:{}};
    rows[k1].oao+=fy;
    if(dim2){
      const k2=getDimVal(r,dim2)||'Unknown';
      if(!rows[k1].children[k2])rows[k1].children[k2]={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0};
      rows[k1].children[k2].oao+=fy;
    }
  });

  // ── D&A ──
  const daTotal=window.getDepreciationTotal?window.getDepreciationTotal():0;

  return {rows,daTotal};
}

function calcDerived(r,daShare){
  const ebitda=r.cb+r.oao;
  const capex=r.cbCapex;
  const opex=ebitda-capex;
  const da=daShare||0;
  const totinv=ebitda; // before capex split
  return {...r,ebitda,capex,opex,da,totinv};
}

// ── Format value ──
function fv(v,isHC){
  if(isHC)return v||'—';
  if(!v)return '—';
  // Already showing "in $M" in header, so show number without M suffix
  const abs=Math.abs(v);
  const sign=v<0?'-':'';
  if(abs>=1e6)return sign+'$'+(abs/1e6).toFixed(2);
  if(abs>=1e3)return sign+'$'+(abs/1e3).toFixed(0)+'K';
  return sign+'$'+Math.round(abs);
}

// ── Columns config ──
function getCols(){
  if(currentView==='expanded'){
    return [
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'cb',label:'C&B'},
      {key:'oao',label:'OAO'},
      {key:'ebitda',label:'ADJ EBITDA'},
      {key:'da',label:'D&A'},
      {key:'opex',label:'OPEX'},
      {key:'capex',label:'CAPEX'},
      {key:'totinv',label:'TOT INV'},
    ];
  }
  if(currentView==='totinv'){
    return [
      {key:'hc',label:'HC',narrow:true,isHC:true},
      {key:'cb',label:'C&B'},
      {key:'oao',label:'OAO'},
      {key:'totinv',label:'TOT INV'},
    ];
  }
  // collapsed = cost view
  return [
    {key:'hc',label:'HC',narrow:true,isHC:true},
    {key:'cb',label:'C&B'},
    {key:'oao',label:'OAO'},
    {key:'ebitda',label:'ADJ EBITDA'},
  ];
}

// ── Render table ──
function renderPivotTable(data){
  const thead=document.getElementById('pivotThead');
  const tbody=document.getElementById('pivotTbody');
  if(!thead||!tbody)return;

  const {rows,daTotal}=data;
  const cols=getCols();
  const rowNames=Object.keys(rows).sort((a,b)=>(rows[b].cb+rows[b].oao)-(rows[a].cb+rows[a].oao));
  const nRows=rowNames.length||1;
  const daPerRow=daTotal/nRows;

  // Header
  thead.innerHTML=`<tr><th style="text-align:left;min-width:180px;position:sticky;top:0;z-index:2;background:var(--panel)">${document.getElementById('pivotRowDim').selectedOptions[0]?.text||'CATEGORY'}</th>${cols.map(c=>`<th style="text-align:right;${c.narrow?'width:50px;':'min-width:80px;'}position:sticky;top:0;z-index:2;background:var(--panel)">${c.label}</th>`).join('')}</tr>`;

  let html='';
  let totals={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0,ebitda:0,capex:0,opex:0,totinv:0};

  rowNames.forEach(name=>{
    const r=calcDerived(rows[name],daPerRow);
    Object.keys(totals).forEach(k=>{totals[k]+=(r[k]||0)});
    const children=rows[name].children||{};
    const hasChildren=Object.keys(children).length>0;
    const arrow=hasChildren?'&#9660; ':'';

    html+=`<tr class="${hasChildren?'subtotal':''}"><td class="section-label" style="cursor:${hasChildren?'pointer':'default'}" data-toggle="${name}">${arrow}${name}</td>${cols.map(c=>`<td class="num">${fv(r[c.key],c.isHC)}</td>`).join('')}</tr>`;

    if(hasChildren){
      const childNames=Object.keys(children).sort();
      childNames.forEach(cn=>{
        const cr=calcDerived(children[cn],daPerRow/childNames.length);
        html+=`<tr class="child-row" data-parent="${name}"><td class="label-cell" style="padding-left:24px">${cn}</td>${cols.map(c=>`<td class="num">${fv(cr[c.key],c.isHC)}</td>`).join('')}</tr>`;
      });
    }
  });

  // Total row
  const t=calcDerived(totals,daTotal);
  html+=`<tr class="total"><td>Total</td>${cols.map(c=>`<td class="num" style="font-weight:700">${fv(t[c.key],c.isHC)}</td>`).join('')}</tr>`;

  tbody.innerHTML=html;

  // Toggle children on click
  tbody.querySelectorAll('[data-toggle]').forEach(td=>{
    td.addEventListener('click',()=>{
      const name=td.dataset.toggle;
      const childRows=tbody.querySelectorAll(`[data-parent="${name}"]`);
      const visible=childRows[0]&&childRows[0].style.display!=='none';
      childRows.forEach(r=>r.style.display=visible?'none':'');
      td.innerHTML=(visible?'&#9654; ':'&#9660; ')+name;
    });
  });
}

// ── Render chart ──
let pivotChartType='bar'; // bar | line | bubble
function renderPivotChart(data){
  if(typeof Chart==='undefined')return;
  const canvas=document.getElementById('pivotChart');
  if(!canvas)return;
  if(pivotChart)pivotChart.destroy();

  const {rows,daTotal}=data;
  const acctSel=document.getElementById('pivotChartAccount');
  const acctKey=acctSel?acctSel.value:'totinv';
  const rowNames=Object.keys(rows).sort((a,b)=>(rows[b].cb+rows[b].oao)-(rows[a].cb+rows[a].oao));
  const nRows=rowNames.length||1;
  const colors=getChartColors();
  const labels=rowNames.map(n=>n.length>18?n.slice(0,16)+'…':n);
  const isHC=acctKey==='hc';
  const tickFmt=isHC?v=>Math.round(v):v=>'$'+(Math.abs(v)/1e6).toFixed(1);

  if(pivotChartType==='bubble'){
    // Bubble matrix: x=row index, y=account value, r=scaled size
    const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
    const maxVal=Math.max(...vals.map(Math.abs),1);
    const bubbleData=vals.map((v,i)=>({x:i,y:v,r:Math.max(4,Math.sqrt(Math.abs(v)/maxVal)*40)}));
    pivotChart=new Chart(canvas,{
      type:'bubble',
      data:{datasets:[{label:acctKey.toUpperCase(),data:bubbleData,backgroundColor:hexToRgba(colors[0],0.5),borderColor:colors[0],borderWidth:1}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false,
          tooltip:{callbacks:{label:ctx=>{const d=ctx.raw;return labels[d.x]+': '+(isHC?Math.round(d.y):('$'+(Math.abs(d.y)/1e6).toFixed(2)+'M'))}}}
        },
        scales:{
          x:{type:'linear',ticks:{callback:v=>labels[Math.round(v)]||'',font:{size:10}},min:-0.5,max:rowNames.length-0.5},
          y:{ticks:{font:{size:10},callback:tickFmt}}
        }
      }
    });
  } else if(pivotChartType==='line'){
    // Single line showing the selected account across rows
    const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
    pivotChart=new Chart(canvas,{
      type:'line',
      data:{labels,datasets:[{label:acctKey.toUpperCase(),data:vals,borderColor:colors[0],backgroundColor:hexToRgba(colors[0],0.15),fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:colors[0]}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false},
        scales:{x:{ticks:{font:{size:10}}},y:{ticks:{font:{size:10},callback:tickFmt}}}
      }
    });
  } else {
    // Stacked bar — show selected account only
    const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
    pivotChart=new Chart(canvas,{
      type:'bar',
      data:{labels,datasets:[{label:acctKey.toUpperCase(),data:vals,backgroundColor:hexToRgba(colors[0],0.7),borderColor:colors[0],borderWidth:1}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false},
        scales:{x:{ticks:{font:{size:10}}},y:{ticks:{font:{size:10},callback:tickFmt}}}
      }
    });
  }
}

// ── Main render ──
function renderPivot(){
  const data=buildPnlData();
  renderPivotChart(data);
  renderPivotTable(data);
  // Update header label
  const lbl=document.getElementById('pivotRowLabel');
  if(lbl){const sel=document.getElementById('pivotRowDim');lbl.textContent=sel.selectedOptions[0]?.text||''}
}

// ── Init ──
function initPivot(){
  const rowSel=document.getElementById('pivotRowDim');
  if(!rowSel)return;

  // View toggle
  document.querySelectorAll('#pivotViewToggle .btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#pivotViewToggle .btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentView=btn.dataset.pview;
      renderPivot();
    });
  });

  rowSel.addEventListener('change',renderPivot);
  const row2=document.getElementById('pivotRow2Dim');
  if(row2)row2.addEventListener('change',renderPivot);
  const refreshBtn=document.getElementById('pivotRefresh');
  if(refreshBtn)refreshBtn.addEventListener('click',renderPivot);

  // Chart type toggle
  document.querySelectorAll('#pivotChartType .btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#pivotChartType .btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      pivotChartType=btn.dataset.pchart;
      renderPivot();
    });
  });
  // Account filter for chart
  const acctSel=document.getElementById('pivotChartAccount');
  if(acctSel)acctSel.addEventListener('change',renderPivot);
}

window.initPivot=initPivot;
window.renderPivot=renderPivot;
initPivot();
