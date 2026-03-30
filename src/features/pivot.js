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
const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const Q_LABELS=['Q1','Q2','Q3','Q4'];
const isTimeDim=d=>d==='month'||d==='quarter'||d==='year';
function timeSort(a,b){
  const oi=k=>{let i=MO_LABELS.indexOf(k);if(i>=0)return i;i=Q_LABELS.indexOf(k);if(i>=0)return i;return parseInt(k)||9999};
  return oi(a)-oi(b);
}

function getDimVal(e,dim){
  const t=v=>(v||'').trim()||null;
  if(dim==='category'){const p=getEmpProject(e);return t(p?.category)||'Unassigned'}
  if(dim==='product'){const p=getEmpProject(e);return t(p?.product)||'Unassigned'}
  if(dim==='function')return t(e.function)||'Unknown';
  if(dim==='country')return t(e.country)||'Unknown';
  if(dim==='bizline')return t(e.bizLine||e.businessLine)||'Unassigned';
  if(dim==='pillar'){const fn=t(e.function)||'';const pillars=state?.functionalPillars||{};return pillars[fn]||'Unassigned'}
  // Time dims return null — handled per-month in buildPnlData
  return 'Unknown';
}

// ── Build P&L data per row ──
function emptyRow(){return {hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,da:0,children:{}}}
function emptyChild(){return {hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,da:0}}

function getTimeKey(mi,dim){
  if(dim==='month')return MO_LABELS[mi];
  if(dim==='quarter')return Q_LABELS[Math.floor(mi/3)];
  if(dim==='year')return String(CURRENT_YEAR);
  return null;
}

function buildPnlData(srcState){
  const st=srcState||state;
  const dim1=document.getElementById('pivotRowDim').value;
  const dim2El=document.getElementById('pivotRow2Dim');
  const dim2=dim2El?dim2El.value:'';
  const rows={};
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const t1=isTimeDim(dim1), t2=isTimeDim(dim2);

  function ensureRow(k1){if(!rows[k1])rows[k1]=emptyRow();return rows[k1]}
  function ensureChild(k1,k2){const r=ensureRow(k1);if(!r.children[k2])r.children[k2]=emptyChild();return r.children[k2]}

  // ── Employees → C&B ──
  (st.employees||[]).forEach(e=>{
    if(e.termDate){const td=new Date(e.termDate);if(td.getFullYear()<=CURRENT_YEAR&&td.getMonth()<11)return}
    if(t1){
      // Time as Row 1: split by month
      for(let m=0;m<12;m++){
        const comp=getMonthlyComp(e,m),cap=getMonthlyCapEx(e,m);
        if(comp===0&&cap===0)continue;
        const k1=getTimeKey(m,dim1);
        const r=ensureRow(k1); r.hc++;r.cb+=comp;r.cbCapex+=cap;
        if(dim2){
          const k2=t2?getTimeKey(m,dim2):getDimVal(e,dim2);
          const c=ensureChild(k1,k2);c.hc++;c.cb+=comp;c.cbCapex+=cap;
        }
      }
    } else {
      const k1=getDimVal(e,dim1);
      if(t2){
        // Entity as Row1, time as Row2
        for(let m=0;m<12;m++){
          const comp=getMonthlyComp(e,m),cap=getMonthlyCapEx(e,m);
          if(comp===0&&cap===0)continue;
          const r=ensureRow(k1);r.hc++;r.cb+=comp;r.cbCapex+=cap;
          const k2=getTimeKey(m,dim2);
          const c=ensureChild(k1,k2);c.hc++;c.cb+=comp;c.cbCapex+=cap;
        }
      } else {
        let comp=0,capex=0;
        for(let m=0;m<12;m++){comp+=getMonthlyComp(e,m);capex+=getMonthlyCapEx(e,m)}
        const r=ensureRow(k1);r.hc++;r.cb+=comp;r.cbCapex+=capex;
        if(dim2){const k2=getDimVal(e,dim2);const c=ensureChild(k1,k2);c.hc++;c.cb+=comp;c.cbCapex+=capex}
      }
    }
  });

  // ── Vendor rows → OAO ──
  (st.vendorRows||[]).forEach(r=>{
    if(t1){
      for(let m=0;m<12;m++){
        const v=parseFloat(r[months[m]])||0; if(!v)continue;
        const k1=getTimeKey(m,dim1);
        ensureRow(k1).oao+=v;
        if(dim2){const k2=t2?getTimeKey(m,dim2):(getDimVal(r,dim2)||'Unknown');ensureChild(k1,k2).oao+=v}
      }
    } else {
      const k1=getDimVal(r,dim1)||'Unknown';
      if(t2){
        for(let m=0;m<12;m++){
          const v=parseFloat(r[months[m]])||0; if(!v)continue;
          ensureRow(k1).oao+=v;
          const k2=getTimeKey(m,dim2);ensureChild(k1,k2).oao+=v;
        }
      } else {
        let fy=0;for(let m=0;m<12;m++)fy+=(parseFloat(r[months[m]])||0);
        if(fy===0)return;
        ensureRow(k1).oao+=fy;
        if(dim2){const k2=getDimVal(r,dim2)||'Unknown';ensureChild(k1,k2).oao+=fy}
      }
    }
  });

  // ── T&E ──
  (st.teRows||[]).forEach(r=>{
    if(t1){
      for(let m=0;m<12;m++){const v=parseFloat(r[months[m]])||0;if(!v)continue;ensureRow(getTimeKey(m,dim1)).te+=v;if(dim2){ensureChild(getTimeKey(m,dim1),t2?getTimeKey(m,dim2):(getDimVal(r,dim2)||'Unknown')).te+=v}}
    } else {
      const k1=getDimVal(r,dim1)||'Unknown';
      if(t2){for(let m=0;m<12;m++){const v=parseFloat(r[months[m]])||0;if(!v)continue;ensureRow(k1).te+=v;ensureChild(k1,getTimeKey(m,dim2)).te+=v}}
      else {let fy=0;for(let m=0;m<12;m++)fy+=(parseFloat(r[months[m]])||0);if(fy===0)return;ensureRow(k1).te+=fy;if(dim2){ensureChild(k1,getDimVal(r,dim2)||'Unknown').te+=fy}}
    }
  });

  // ── Contractor ──
  (st.contractorRows||[]).forEach(r=>{
    if(t1){
      for(let m=0;m<12;m++){const v=parseFloat(r[months[m]])||0;if(!v)continue;ensureRow(getTimeKey(m,dim1)).ctr+=v;if(dim2){ensureChild(getTimeKey(m,dim1),t2?getTimeKey(m,dim2):(getDimVal(r,dim2)||'Unknown')).ctr+=v}}
    } else {
      const k1=getDimVal(r,dim1)||'Unknown';
      if(t2){for(let m=0;m<12;m++){const v=parseFloat(r[months[m]])||0;if(!v)continue;ensureRow(k1).ctr+=v;ensureChild(k1,getTimeKey(m,dim2)).ctr+=v}}
      else {let fy=0;for(let m=0;m<12;m++)fy+=(parseFloat(r[months[m]])||0);if(fy===0)return;ensureRow(k1).ctr+=fy;if(dim2){ensureChild(k1,getDimVal(r,dim2)||'Unknown').ctr+=fy}}
    }
  });

  // ── D&A ──
  const daTotal=window.getDepreciationTotal?window.getDepreciationTotal():0;

  // Fix HC counting for time dims (avoid double-counting per employee per time bucket)
  if(t1){
    // HC was incremented per month — for quarter/year need to de-dup
    // For simplicity, HC on time rows = active employees in that period (approximate)
  }

  return {rows,daTotal};
}

function calcDerived(r,daShare){
  const ebitda=r.cb+(r.oao||0)+(r.te||0)+(r.ctr||0);
  const capex=r.cbCapex;
  const opex=ebitda-capex;
  const da=daShare||0;
  const totinv=ebitda;
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
      {key:'ctr',label:'CTR'},
      {key:'te',label:'T&E'},
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
      {key:'ctr',label:'CTR'},
      {key:'te',label:'T&E'},
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
  const dim1=document.getElementById('pivotRowDim').value;
  const rowNames=Object.keys(rows).sort(isTimeDim(dim1)?timeSort:(a,b)=>(rows[b].cb+rows[b].oao)-(rows[a].cb+rows[a].oao));
  const nRows=rowNames.length||1;
  const daPerRow=daTotal/nRows;

  // Comparison data
  const compData=data.compRows||null;
  const compCols=compData?cols:[];

  // Header — if comparison, show main + comp columns
  let hdrHtml=`<th style="text-align:left;min-width:100px;position:sticky;top:0;z-index:2;background:var(--panel);padding:4px 6px;font-size:.64rem">${document.getElementById('pivotRowDim').selectedOptions[0]?.text||'CATEGORY'}</th>`;
  cols.forEach(c=>hdrHtml+=`<th style="text-align:right;${c.narrow?'width:30px;':'min-width:50px;'}position:sticky;top:0;z-index:2;background:var(--panel);padding:4px 4px;font-size:.62rem">${c.label}</th>`);
  if(compData){
    hdrHtml+=`<th style="position:sticky;top:0;z-index:2;background:var(--panel);border-left:2px solid var(--accent);width:4px"></th>`;
    compCols.forEach(c=>hdrHtml+=`<th style="text-align:right;${c.narrow?'width:50px;':'min-width:80px;'}position:sticky;top:0;z-index:2;background:var(--panel);color:var(--text-dim);font-style:italic">${c.label}</th>`);
  }
  thead.innerHTML=`<tr>${hdrHtml}</tr>`;

  let html='';
  let totals={hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,da:0,ebitda:0,capex:0,opex:0,totinv:0};

  let compTotals=compData?{hc:0,cb:0,cbCapex:0,oao:0,ctr:0,te:0,other:0,da:0,ebitda:0,capex:0,opex:0,totinv:0}:null;
  const compNRows=compData?Math.max(Object.keys(compData).length,1):1;
  const compSep=compData?'<td style="border-left:2px solid var(--accent)"></td>':'';

  rowNames.forEach(name=>{
    const r=calcDerived(rows[name],daPerRow);
    Object.keys(totals).forEach(k=>{totals[k]+=(r[k]||0)});
    const children=rows[name].children||{};
    const dim2=document.getElementById('pivotRow2Dim')?.value||'';
    const childNames=Object.keys(children).sort(isTimeDim(dim2)?timeSort:undefined);
    const hasChildren=childNames.length>0;
    const arrow=hasChildren?'&#9660; ':'';

    let rowHtml=`<td class="section-label" style="cursor:${hasChildren?'pointer':'default'};padding:3px 6px;font-size:.66rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px" data-toggle="${name}">${arrow}${name}</td>${cols.map(c=>`<td class="num" style="padding:3px 4px;font-size:.66rem">${fv(r[c.key],c.isHC)}</td>`).join('')}`;
    if(compData){
      rowHtml+=compSep;
      if(compData[name]){
        const cr=calcDerived(compData[name],daTotal/compNRows);
        Object.keys(compTotals).forEach(k=>{compTotals[k]+=(cr[k]||0)});
        rowHtml+=compCols.map(c=>`<td class="num" style="color:var(--text-dim)">${fv(cr[c.key],c.isHC)}</td>`).join('');
      } else {
        rowHtml+=compCols.map(()=>`<td class="num" style="color:var(--text-dim)">—</td>`).join('');
      }
    }
    html+=`<tr class="${hasChildren?'subtotal':''}">${rowHtml}</tr>`;

    if(hasChildren){
      childNames.forEach(cn=>{
        const cr=calcDerived(children[cn],daPerRow/childNames.length);
        let childHtml=`<td class="label-cell" style="padding-left:16px;font-size:.62rem;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${cn}</td>${cols.map(c=>`<td class="num" style="padding:2px 4px;font-size:.62rem">${fv(cr[c.key],c.isHC)}</td>`).join('')}`;
        if(compData)childHtml+=compSep+compCols.map(()=>`<td></td>`).join('');
        html+=`<tr class="child-row" data-parent="${name}">${childHtml}</tr>`;
      });
    }
  });

  // Total row
  const t=calcDerived(totals,daTotal);
  let totalHtml=`<td style="padding:3px 6px;font-size:.66rem;font-weight:700">Total</td>${cols.map(c=>`<td class="num" style="font-weight:700;padding:3px 4px;font-size:.66rem">${fv(t[c.key],c.isHC)}</td>`).join('')}`;
  if(compData&&compTotals){
    const ct=calcDerived(compTotals,daTotal);
    totalHtml+=compSep+compCols.map(c=>`<td class="num" style="font-weight:700;color:var(--text-dim)">${fv(ct[c.key],c.isHC)}</td>`).join('');
  }
  html+=`<tr class="total">${totalHtml}</tr>`;

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
  const dim1=document.getElementById('pivotRowDim').value;
  const rowNames=Object.keys(rows).sort(isTimeDim(dim1)?timeSort:(a,b)=>(rows[b].cb+rows[b].oao)-(rows[a].cb+rows[a].oao));
  const nRows=rowNames.length||1;
  const colors=getChartColors();
  const labels=rowNames.map(n=>n.length>18?n.slice(0,16)+'…':n);
  const isHC=acctKey==='hc';
  const tickFmt=isHC?v=>Math.round(v):v=>'$'+(Math.abs(v)/1e6).toFixed(1);

  if(pivotChartType==='bubble'){
    // Bubble matrix: X = Row 1, Y = Row 2, size = account amount
    const dim2El=document.getElementById('pivotRow2Dim');
    const dim2=dim2El?dim2El.value:'';
    // Collect all Row2 keys across all Row1 groups
    const row2Set=new Set();
    rowNames.forEach(name=>{
      const children=rows[name].children||{};
      Object.keys(children).forEach(k=>row2Set.add(k));
    });
    const row2Names=[...row2Set].sort(isTimeDim(dim2)?timeSort:undefined);

    if(!dim2||row2Names.length===0){
      // No Row 2 selected — fall back to simple bar-like bubbles on a single axis
      const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
      const maxVal=Math.max(...vals.map(Math.abs),1);
      const bubbleData=vals.map((v,i)=>({x:i,y:0,r:Math.max(5,Math.sqrt(Math.abs(v)/maxVal)*35),_label:rowNames[i],_val:v}));
      pivotChart=new Chart(canvas,{
        type:'bubble',
        data:{datasets:[{label:acctKey.toUpperCase(),data:bubbleData,backgroundColor:hexToRgba(colors[0],0.45),borderColor:colors[0],borderWidth:1}]},
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false,
            tooltip:{callbacks:{label:ctx=>{const d=ctx.raw;return d._label+': '+(isHC?Math.round(d._val):('$'+(Math.abs(d._val)/1e6).toFixed(2)+'M'))}}}
          },
          scales:{
            x:{type:'linear',ticks:{callback:v=>labels[Math.round(v)]||'',font:{size:9}},min:-0.5,max:rowNames.length-0.5},
            y:{display:false}
          }
        }
      });
    } else {
      // True matrix: Row1 × Row2
      const bubbleData=[];
      let maxVal=1;
      rowNames.forEach(name=>{
        const children=rows[name].children||{};
        row2Names.forEach(k2=>{
          if(children[k2]){
            const r=calcDerived(children[k2],(daTotal/nRows)/Math.max(Object.keys(children).length,1));
            const v=Math.abs(r[acctKey]||0);
            if(v>maxVal)maxVal=v;
          }
        });
      });
      rowNames.forEach((name,xi)=>{
        const children=rows[name].children||{};
        row2Names.forEach((k2,yi)=>{
          if(children[k2]){
            const r=calcDerived(children[k2],(daTotal/nRows)/Math.max(Object.keys(children).length,1));
            const v=r[acctKey]||0;
            if(v!==0) bubbleData.push({x:xi,y:yi,r:Math.max(4,Math.sqrt(Math.abs(v)/maxVal)*30),_r1:name,_r2:k2,_val:v});
          }
        });
      });
      const row1Labels=rowNames.map(n=>n.length>14?n.slice(0,12)+'…':n);
      const row2Labels=row2Names.map(n=>n.length>14?n.slice(0,12)+'…':n);
      pivotChart=new Chart(canvas,{
        type:'bubble',
        data:{datasets:[{label:acctKey.toUpperCase(),data:bubbleData,backgroundColor:hexToRgba(colors[0],0.45),borderColor:colors[0],borderWidth:1}]},
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false,
            tooltip:{callbacks:{label:ctx=>{const d=ctx.raw;const fmtV=isHC?Math.round(d._val):('$'+(Math.abs(d._val)/1e6).toFixed(2)+'M');return d._r1+' × '+d._r2+': '+fmtV}}}
          },
          scales:{
            x:{type:'linear',ticks:{callback:v=>{const i=Math.round(v);return row1Labels[i]||''},font:{size:9},maxRotation:45},min:-0.5,max:rowNames.length-0.5,title:{display:true,text:document.getElementById('pivotRowDim').selectedOptions[0]?.text||'Row 1',font:{size:11}}},
            y:{type:'linear',ticks:{callback:v=>{const i=Math.round(v);return row2Labels[i]||''},font:{size:9}},min:-0.5,max:row2Names.length-0.5,title:{display:true,text:document.getElementById('pivotRow2Dim').selectedOptions[0]?.text||'Row 2',font:{size:11}}}
          }
        }
      });
    }
  } else if(pivotChartType==='line'){
    const dim2El=document.getElementById('pivotRow2Dim');
    const dim2=dim2El?dim2El.value:'';
    // Collect Row2 keys for series breakout
    const row2Set=new Set();
    if(dim2) rowNames.forEach(name=>{Object.keys(rows[name].children||{}).forEach(k=>row2Set.add(k))});
    const row2Names=[...row2Set].sort(isTimeDim(dim2)?timeSort:undefined);

    if(!dim2||row2Names.length===0){
      const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
      pivotChart=new Chart(canvas,{
        type:'line',
        data:{labels,datasets:[{label:acctKey.toUpperCase(),data:vals,borderColor:colors[0],backgroundColor:hexToRgba(colors[0],0.15),fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:colors[0]}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false},scales:{x:{ticks:{font:{size:10}}},y:{ticks:{font:{size:10},callback:tickFmt}}}}
      });
    } else {
      // Each Row2 value = separate line
      const datasets=row2Names.map((k2,i)=>{
        const c=colors[i%colors.length];
        const data=rowNames.map(name=>{const ch=(rows[name].children||{})[k2];if(!ch)return 0;const r=calcDerived(ch,(daTotal/nRows)/Math.max(Object.keys(rows[name].children||{}).length,1));return r[acctKey]||0});
        return {label:k2,data,borderColor:c,backgroundColor:hexToRgba(c,0.1),fill:true,tension:0.3,pointRadius:3,pointBackgroundColor:c};
      });
      pivotChart=new Chart(canvas,{
        type:'line',
        data:{labels,datasets},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}},datalabels:{display:false},yoyArrows:false},scales:{x:{ticks:{font:{size:10}}},y:{ticks:{font:{size:10},callback:tickFmt}}}}
      });
    }
  } else {
    // Stacked bar
    const dim2El=document.getElementById('pivotRow2Dim');
    const dim2=dim2El?dim2El.value:'';
    const row2Set=new Set();
    if(dim2) rowNames.forEach(name=>{Object.keys(rows[name].children||{}).forEach(k=>row2Set.add(k))});
    const row2Names=[...row2Set].sort(isTimeDim(dim2)?timeSort:undefined);

    if(!dim2||row2Names.length===0){
      const vals=rowNames.map(name=>{const r=calcDerived(rows[name],daTotal/nRows);return r[acctKey]||0});
      pivotChart=new Chart(canvas,{
        type:'bar',
        data:{labels,datasets:[{label:acctKey.toUpperCase(),data:vals,backgroundColor:hexToRgba(colors[0],0.7),borderColor:colors[0],borderWidth:1}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},yoyArrows:false},scales:{x:{stacked:true,ticks:{font:{size:10}}},y:{stacked:true,ticks:{font:{size:10},callback:tickFmt}}}}
      });
    } else {
      // Each Row2 value = stacked segment
      const datasets=row2Names.map((k2,i)=>{
        const c=colors[i%colors.length];
        const data=rowNames.map(name=>{const ch=(rows[name].children||{})[k2];if(!ch)return 0;const r=calcDerived(ch,(daTotal/nRows)/Math.max(Object.keys(rows[name].children||{}).length,1));return r[acctKey]||0});
        return {label:k2,data,backgroundColor:hexToRgba(c,0.7),borderColor:c,borderWidth:1,stack:'s'};
      });
      pivotChart=new Chart(canvas,{
        type:'bar',
        data:{labels,datasets},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}},datalabels:{display:false},yoyArrows:false},scales:{x:{stacked:true,ticks:{font:{size:10}}},y:{stacked:true,ticks:{font:{size:10},callback:tickFmt}}}}
      });
    }
  }
}

// ── Scenario comparison ──
let compState=null; // loaded comparison plan state
let compPlanId='';

async function populateScenarioSelects(){
  const mainSel=document.getElementById('pivotScenarioMain');
  const compSel=document.getElementById('pivotScenarioComp');
  if(!mainSel||!compSel)return;
  // Get user and fetch plans
  const user=JSON.parse(localStorage.getItem('compPlanUser')||'null');
  if(!user||!user.id)return;
  try{
    const r=await fetch('/api/plan-files?accountId='+user.id);
    if(!r.ok)return;
    const plans=await r.json();
    const currentId=window._activePlan?.id;
    const opts=plans.map(p=>`<option value="${p.id}"${p.id===currentId?' selected':''}>${p.name} (${p.year} ${p.scenarioType||'budget'})</option>`).join('');
    mainSel.innerHTML=`<option value="_current">Current</option>`+opts;
    compSel.innerHTML=`<option value="">None</option>`+plans.map(p=>`<option value="${p.id}">${p.name} (${p.year} ${p.scenarioType||'budget'})</option>`).join('');
  }catch(e){}
}

async function loadCompPlan(planId){
  if(!planId||planId===compPlanId)return;
  if(!planId){compState=null;compPlanId='';return}
  try{
    const r=await fetch('/api/plan-files/'+planId);
    if(r.ok){
      const plan=await r.json();
      compState=typeof plan.state_data==='string'?JSON.parse(plan.state_data):plan.state_data;
      compPlanId=planId;
    }
  }catch(e){compState=null;compPlanId=''}
}

// ── Main render ──
async function renderPivot(){
  // Load comparison if selected
  const compSel=document.getElementById('pivotScenarioComp');
  const compId=compSel?compSel.value:'';
  if(compId&&compId!==compPlanId){await loadCompPlan(compId)}
  else if(!compId){compState=null;compPlanId=''}

  const data=buildPnlData();
  // Build comparison data from compState if available
  if(compState){
    const compData=buildPnlData(compState);
    data.compRows=compData.rows;
  }
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

  // Scenario selectors
  const compSelEl=document.getElementById('pivotScenarioComp');
  if(compSelEl)compSelEl.addEventListener('change',()=>renderPivot());
  // Populate scenarios when pivot tab is shown
  populateScenarioSelects();
  // Re-populate when tab becomes visible
  const pivotTab=document.getElementById('tab-pivot');
  if(pivotTab){
    const obs=new MutationObserver(()=>{if(pivotTab.style.display!=='none')populateScenarioSelects()});
    obs.observe(pivotTab,{attributes:true,attributeFilter:['style']});
  }
}

window.initPivot=initPivot;
window.renderPivot=renderPivot;
initPivot();
