// ── EXEC VIEW ── ES Module
// Extracted from index.html lines 8559–9165

import { state } from '../lib/state.js';
import {
  FUNCTIONS, COUNTRIES, FORECAST_YEARS, DISPLAY_BASE_YEAR, CURRENT_YEAR,
  getDisplayYears, getDisplayFcLabels, displayYear, fmt
} from '../lib/constants.js';
import {
  getProratedComp, getProratedCapEx,
  getMonthlyComp, getMonthlyCapEx, getMonthFactor
} from '../lib/proration.js';
import { projectForecast } from './forecast.js';

function fmtM(n){const a=Math.abs(n);if(a>=1e5)return(n<0?'-':'')+'$'+(n/1e6).toFixed(2)+'M';return fmt(n)}
let execSplit='none',execView='total',execPeriod='full',execFcSplit='total',execFcView='total',execTrendYear='current';
let execMonthlyChart=null,execForecastChart=null,execFcSparkChart=null;
let execFcCollapsed=true;
let execFilterProduct='',execFilterCategory='';
let execSelectedMonths=new Set(); // month range filter for exec view (empty = all months)

function populateExecFilters(){
  const prodSel=document.getElementById('execFilterProduct');
  const catSel=document.getElementById('execFilterCategory');
  if(!prodSel||!catSel||!state||!state.projects)return;
  const products=[...new Set(state.projects.map(p=>p.product).filter(Boolean))].sort();
  const categories=[...new Set(state.projects.map(p=>p.category).filter(Boolean))].sort();
  prodSel.innerHTML='<option value="">All Products</option>'+products.map(p=>`<option value="${p}"${p===execFilterProduct?' selected':''}>${p}</option>`).join('');
  catSel.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option value="${c}"${c===execFilterCategory?' selected':''}>${c}</option>`).join('');
}
document.getElementById('execFilterProduct').addEventListener('change',function(){execFilterProduct=this.value;renderExecView()});
document.getElementById('execFilterCategory').addEventListener('change',function(){execFilterCategory=this.value;renderExecView()});

document.querySelectorAll('#execSplitToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#execSplitToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');execSplit=b.dataset.esplit;renderExecView();
}));
document.querySelectorAll('#execViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#execViewToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');execView=b.dataset.eview;renderExecView();
}));
document.querySelectorAll('#execPeriodToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#execPeriodToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');execPeriod=b.dataset.eperiod;renderExecView();
}));
// Year toggle for trend view
function buildExecTrendYearToggle(){
  const wrap=document.getElementById('execTrendYearToggle');
  if(!wrap)return;
  const dYears=getDisplayYears();
  wrap.innerHTML='<button class="btn'+(execTrendYear==='current'?' active':'')+'" data-etrendyr="current">'+DISPLAY_BASE_YEAR+'</button>'+
    FORECAST_YEARS.map((y,i)=>'<button class="btn'+(execTrendYear===String(y)?' active':'')+'" data-etrendyr="'+y+'">'+dYears[i]+'</button>').join('');
  wrap.querySelectorAll('.btn').forEach(b=>b.addEventListener('click',()=>{
    wrap.querySelectorAll('.btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    execTrendYear=b.dataset.etrendyr;
    const yrLabel=execTrendYear==='current'?String(DISPLAY_BASE_YEAR):displayYear(execTrendYear);
    document.getElementById('execTrendYearLabel').textContent=' \u2014 '+yrLabel;
    renderExecView();
  }));
}
buildExecTrendYearToggle();
document.querySelectorAll('#execFcSplitToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#execFcSplitToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');execFcSplit=b.dataset.efsplit;renderExecView();
}));
document.querySelectorAll('#execFcViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#execFcViewToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');execFcView=b.dataset.efview;syncExecFcViewState();renderExecView();
}));
function syncExecFcViewState(){
  const label=execFcView==='opex'?' \u2014 C&B OpEx':' \u2014 Total Investment';
  document.getElementById('execFcViewLabel').textContent=label;
  // Sync mini toggle active state
  document.querySelectorAll('#execFcMiniToggle .btn').forEach(x=>{x.classList.toggle('active',x.dataset.efviewMini===execFcView)});
  // Sync full toggle active state
  document.querySelectorAll('#execFcViewToggle .btn').forEach(x=>{x.classList.toggle('active',x.dataset.efview===execFcView)});
}
// Mini toggle in collapsed header
document.querySelectorAll('#execFcMiniToggle .btn').forEach(b=>b.addEventListener('click',(e)=>{
  e.stopPropagation();
  execFcView=b.dataset.efviewMini;
  syncExecFcViewState();
  if(execFcCollapsed)renderExecFcSparkline();
  else renderExecView();
}));
// Collapse/expand long term forecast
document.getElementById('execFcHeader').addEventListener('click',()=>{
  execFcCollapsed=!execFcCollapsed;
  document.getElementById('execFcBody').style.display=execFcCollapsed?'none':'';
  document.getElementById('execFcSparkWrap').style.display=execFcCollapsed?'':'none';
  document.getElementById('execFcArrow').textContent=execFcCollapsed?'\u25b6':'\u25bc';
  document.getElementById('execFcMiniToggle').style.display=execFcCollapsed?'inline-flex':'none';
  if(execFcCollapsed)renderExecFcSparkline();
  else renderExecView();
});
function renderExecFcSparkline(){
  if(typeof Chart==='undefined')return;
  const emps=getExecFilteredEmps();
  const rows=projectForecast(emps);
  const showOpex=execFcView==='opex';
  // Include OAO and D&A to show full account totals
  const _oaoBase=window.getVendorOaoTotal?window.getVendorOaoTotal():0;
  const _oaoGr=state.oaoGrowthPct||[5,5,5,5,5];
  const _oaoYrs=[_oaoBase];for(let oi=0;oi<5;oi++)_oaoYrs.push(Math.round(_oaoYrs[oi]*(1+(_oaoGr[oi]||0)/100)));
  const _cCapEx=window.getContractorCapExTotal?window.getContractorCapExTotal():0;
  const _assetLife=state.daAssetLifeYrs||5;
  const _daBase=window.getDepreciationTotal?window.getDepreciationTotal():0;
  const cbCapex=rows.map(r=>r.capex);
  const _tcby=cbCapex.map(cb=>cb+_cCapEx);
  const _daYrs=[_daBase];
  for(let yr=1;yr<=5;yr++){let yd=0;for(let v=0;v<yr;v++){if(yr-v<=_assetLife)yd+=Math.round(_tcby[v]/_assetLife)}yd+=Math.max(0,Math.round(_daBase*(1-yr/_assetLife)));_daYrs.push(yd)}
  const vals=rows.map((r,i)=>{
    if(showOpex)return r.opex+(_oaoYrs[i]||0)+(_daYrs[i]||0);
    return r.total+(_oaoYrs[i]||0);
  });
  const labels=getDisplayFcLabels();
  if(execFcSparkChart)execFcSparkChart.destroy();
  const colors=window.getChartColors();
  const isDarkSpark=document.documentElement.classList.contains('dark');
  const sparkTickColor=isDarkSpark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'var(--text-dim)');
  const isNeonSpark=window.chartColorScheme==='neon';
  const sparkCanvas=document.getElementById('execFcSparkline');
  let sparkFillBg;
  if(isNeonSpark&&sparkCanvas){
    const sparkCtx=sparkCanvas.getContext('2d');
    const grad=sparkCtx.createLinearGradient(0,0,0,sparkCanvas.clientHeight||80);
    grad.addColorStop(0,window.hexToRgba(colors[0],isDarkSpark?0.38:0.28));
    grad.addColorStop(1,window.hexToRgba(colors[0],0));
    sparkFillBg=grad;
  } else {
    sparkFillBg=window.hexToRgba(colors[0],0.25);
  }
  // Y/Y % growth drawn as pill badges between data points
  const sparkYoyPlugin={
    id:'sparkYoy',
    afterDraw(chart){
      const meta=chart.getDatasetMeta(0);
      if(!meta||!meta.data||meta.data.length<2)return;
      const ctx=chart.ctx;
      ctx.save();
      const fontSize=12;
      ctx.font=`600 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      const lineColor=chart.data.datasets[0].borderColor||colors[0];
      ctx.fillStyle=lineColor;
      ctx.textAlign='center';ctx.textBaseline='bottom';
      for(let i=0;i<vals.length-1;i++){
        const prev=vals[i],cur=vals[i+1];
        if(!prev)continue;
        const pct=((cur-prev)/Math.abs(prev))*100;
        const pctStr=(pct>=0?'+':'')+pct.toFixed(1)+'%';
        const p1=meta.data[i],p2=meta.data[i+1];
        if(!p1||!p2)continue;
        const midX=(p1.x+p2.x)/2;
        const topY=Math.min(p1.y,p2.y)-8;
        ctx.fillText(pctStr,midX,topY);
      }
      ctx.restore();
    }
  };
  execFcSparkChart=new Chart(sparkCanvas,{
    type:'line',
    data:{labels,datasets:[{
      data:vals,fill:true,
      backgroundColor:sparkFillBg,
      borderColor:colors[0],borderWidth:2,
      pointRadius:3,pointBackgroundColor:colors[0],
      tension:0.3,
      datalabels:{display:false}
    }]},
    plugins:[sparkYoyPlugin],
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},
      plugins:{legend:{display:false},datalabels:{display:false},
        tooltip:{callbacks:{label:ctx=>fmt(ctx.raw)}}},
      scales:{
        x:{ticks:{font:{size:12,weight:'600'},color:sparkTickColor},grid:{display:false}},
        y:{display:false}
      }
    }
  });
}
document.getElementById('execTableToggle').addEventListener('click',function(){
  const wrap=document.getElementById('execTableWrap');
  const vis=wrap.style.display!=='none';
  wrap.style.display=vis?'none':'';
  this.innerHTML=vis?'&#9654; Show Details':'&#9660; Hide Details';
});

function getEmpSplitKey(emp,splitBy){
  if(splitBy==='function')return emp.function;
  if(splitBy==='seniority')return emp.seniority;
  if(splitBy==='country')return emp.country;
  if(splitBy==='category'){const p=window.getEmpProject(emp);return p?p.category||'Uncategorized':'Uncategorized'}
  if(splitBy==='product'){const p=window.getEmpProject(emp);return p?p.product||'Unassigned':'Unassigned'}
  if(splitBy==='project'){const p=window.getEmpProject(emp);return p?p.code+' '+p.product:'Unassigned'}
  if(splitBy==='bizline'){
    const bl=state.bizLines.find(b=>b.code===emp.businessLine);
    return bl?bl.code+' '+bl.name:'Unassigned';
  }
  return 'Total';
}

function toggleExecPane(el){el.closest('.exec-pane').classList.toggle('collapsed')}

function renderSparkline(canvasId,data,color){
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const w=canvas.clientWidth||canvas.parentElement.clientWidth-40||120;
  const h=28;
  canvas.width=w*dpr;canvas.height=h*dpr;
  canvas.style.height=h+'px';
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  if(!data||!data.length)return;
  const min=Math.min(...data);const max=Math.max(...data);
  const range=max-min||1;
  const pad=4;const dotR=2.5;
  const xStep=(w-pad*2)/(data.length-1);
  const pts=data.map((v,i)=>({x:pad+i*xStep,y:h-pad-(v-min)/range*(h-pad*2)}));
  // Hex/rgba to rgba helper
  function hexA(c,a){
    if(c.startsWith('rgba'))return c.replace(/,[\d.]+\)$/,','+a+')');
    if(c.startsWith('rgb')){const m=c.match(/(\d+),\s*(\d+),\s*(\d+)/);return m?`rgba(${m[1]},${m[2]},${m[3]},${a})`:c}
    const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return `rgba(${r},${g},${b},${a})`
  }
  const isDarkSp=document.documentElement.classList.contains('dark');
  const isNeon=window.chartColorScheme==='neon';
  // Area fill — use vertical gradient for neon mode
  ctx.beginPath();ctx.moveTo(pts[0].x,h);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,h);ctx.closePath();
  if(isNeon){
    const grad=ctx.createLinearGradient(0,Math.min(...pts.map(p=>p.y)),0,h);
    grad.addColorStop(0,hexA(color,isDarkSp?0.38:0.28));
    grad.addColorStop(1,hexA(color,0));
    ctx.fillStyle=grad;
  } else {
    ctx.fillStyle=hexA(color,isDarkSp?0.12:0.08);
  }
  ctx.fill();
  // Line
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.strokeStyle=hexA(color,isNeon?0.9:(isDarkSp?0.7:0.45));ctx.lineWidth=isNeon?2:1.5;ctx.lineJoin='round';ctx.stroke();
  // Neon glow
  if(isNeon){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=6;ctx.stroke();ctx.restore()}
  // Dots
  pts.forEach(p=>{
    ctx.beginPath();ctx.arc(p.x,p.y,dotR,0,Math.PI*2);
    ctx.fillStyle=hexA(color,isNeon?1:(isDarkSp?0.8:0.55));ctx.fill();
  });
}

function getExecFilteredEmps(){
  let emps=window.getFilteredEmployees();
  if(execFilterProduct){emps=emps.filter(e=>{const p=window.getEmpProject(e);return p&&p.product===execFilterProduct})}
  if(execFilterCategory){emps=emps.filter(e=>{const p=window.getEmpProject(e);return p&&p.category===execFilterCategory})}
  return emps;
}
function renderExecView(){
  window.initExecMonthRangeBar();
  window.renderExecMonthRangeBar();
  populateExecFilters();
  const emps=getExecFilteredEmps();
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  // Sync trend year header label
  const trendYrLabel=execTrendYear==='current'?String(DISPLAY_BASE_YEAR):displayYear(execTrendYear);
  const trendYrEl=document.getElementById('execTrendYearLabel');
  if(trendYrEl)trendYrEl.textContent=' \u2014 '+trendYrLabel;
  const MONTH_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ── Period range ──
  const curMonth=window.currentMonth; // global as-of month override
  const isQuarterly=execPeriod==='quarterly';
  // Always show all 12 months (like dashboard) — period only affects cumulative transforms & stat cards
  // When exec month range is set, filter to those months only
  const allMonths=[0,1,2,3,4,5,6,7,8,9,10,11];
  const periodMonths=execSelectedMonths.size>0?allMonths.filter(m=>execSelectedMonths.has(m)):allMonths;
  const periodLabels=isQuarterly?['Q1','Q2','Q3','Q4']:periodMonths.map(i=>MONTH_SHORT[i]);
  // For stat cards: compute the scoped month range
  let statStart=0,statEnd=11;
  if(execPeriod==='mtd'){statStart=curMonth;statEnd=curMonth}
  else if(execPeriod==='qtd'){statStart=Math.floor(curMonth/3)*3;statEnd=curMonth}
  else if(execPeriod==='ytd'){statStart=0;statEnd=curMonth}
  let statMonths=[];for(let i=statStart;i<=statEnd;i++)statMonths.push(i);
  // If exec month range bar has a selection, intersect with period months
  if(execSelectedMonths.size>0){
    statMonths=statMonths.filter(m=>execSelectedMonths.has(m));
  }

  // ── Stat cards (scoped to period) ──
  let periodComp=0,periodCapEx=0;
  emps.forEach(e=>{statMonths.forEach(mi=>{periodComp+=getMonthlyComp(e,mi);periodCapEx+=getMonthlyCapEx(e,mi)})});
  const periodOpEx=periodComp-periodCapEx;
  let periodLabel=execPeriod==='full'||isQuarterly?'Full Year':execPeriod.toUpperCase();
  if(execSelectedMonths.size>0&&execSelectedMonths.size<12){
    const sorted=[...execSelectedMonths].sort((a,b)=>a-b);
    periodLabel=MONTH_SHORT[sorted[0]]+(sorted.length>1?' \u2013 '+MONTH_SHORT[sorted[sorted.length-1]]:'');
  }
  const svColor=window.getStatValueColor();
  document.getElementById('execStatCards').innerHTML=
    `<div class="stat-card"><div class="label">${execSelectedMonths.size>0&&execSelectedMonths.size<12?periodLabel+' ':''}Headcount</div><div class="value" style="color:${svColor}">${execSelectedMonths.size>0?Math.round(statMonths.reduce((s,mi)=>s+emps.filter(e=>getMonthFactor(e,mi)>0).length,0)/statMonths.length):emps.length}</div><canvas class="sparkline" id="sparkHC"></canvas></div>`+
    `<div class="stat-card"><div class="label">${periodLabel} Comp</div><div class="value" style="color:${svColor}">${fmtM(periodComp)}</div><canvas class="sparkline" id="sparkComp"></canvas></div>`+
    `<div class="stat-card"><div class="label">${periodLabel} CapEx</div><div class="value" style="color:${svColor}">${fmtM(periodCapEx)}</div><canvas class="sparkline" id="sparkCapEx"></canvas></div>`+
    `<div class="stat-card"><div class="label">${periodLabel} OpEx</div><div class="value" style="color:var(--success)">${fmtM(periodOpEx)}</div><canvas class="sparkline" id="sparkOpEx"></canvas></div>`;

  // Sparkline data — scoped to exec month range if selected
  const SPARK_MONTHS=execSelectedMonths.size>0?[...execSelectedMonths].sort((a,b)=>a-b):[0,1,2,3,4,5,6,7,8,9,10,11];
  const sparkHCData=SPARK_MONTHS.map(mi=>emps.filter(e=>getMonthFactor(e,mi)>0).length);
  const sparkCompData=SPARK_MONTHS.map(mi=>emps.reduce((a,e)=>a+getMonthlyComp(e,mi),0));
  const sparkCapExData=SPARK_MONTHS.map(mi=>emps.reduce((a,e)=>a+getMonthlyCapEx(e,mi),0));
  const sparkOpExData=SPARK_MONTHS.map(mi=>emps.reduce((a,e)=>a+getMonthlyComp(e,mi)-getMonthlyCapEx(e,mi),0));
  requestAnimationFrame(()=>{
    renderSparkline('sparkHC',sparkHCData,window.getSparkColor('primary'));
    renderSparkline('sparkComp',sparkCompData,window.getSparkColor('primary'));
    renderSparkline('sparkCapEx',sparkCapExData,window.getSparkColor('danger'));
    renderSparkline('sparkOpEx',sparkOpExData,window.getSparkColor('primary'));
  });

  // ── Pane 1: Monthly chart split by selected dimension ──
  const splitGroups={};
  emps.forEach(e=>{
    const key=getEmpSplitKey(e,execSplit);
    if(!splitGroups[key])splitGroups[key]=[];
    splitGroups[key].push(e);
  });
  const groupNames=Object.keys(splitGroups).sort();

  // Build monthly data per group (full 12 months, then slice for period)
  const isForecastYear=execTrendYear!=='current';
  const monthlyDataFull={};
  if(isForecastYear){
    // For forecast years, derive monthly from forecast annual totals using current year's distribution pattern
    const selYear=parseInt(execTrendYear);
    const fcYearIdx=FORECAST_YEARS.indexOf(selYear);
    groupNames.forEach(g=>{
      const gEmps=splitGroups[g];
      // Current year monthly pattern for this group
      const curMonthly=MONTH_SHORT.map((_,mi)=>gEmps.reduce((a,e)=>{
        if(execView==='opex'){return a+getMonthlyComp(e,mi)-getMonthlyCapEx(e,mi)}
        return a+getMonthlyComp(e,mi);
      },0));
      const curTotal=curMonthly.reduce((a,v)=>a+v,0);
      // Get forecast annual total for this group
      const fcRows=projectForecast(gEmps,execSplit!=='none'?g:undefined);
      const fcRow=fcYearIdx>=0&&fcRows[fcYearIdx+1]?fcRows[fcYearIdx+1]:null;
      const fcAnnual=fcRow?(execView==='opex'?fcRow.opex:fcRow.total):0;
      // Scale current monthly pattern to forecast annual
      const scale=curTotal?fcAnnual/curTotal:0;
      monthlyDataFull[g]=curMonthly.map(v=>Math.round(v*scale));
    });
  } else {
    groupNames.forEach(g=>{
      monthlyDataFull[g]=MONTH_SHORT.map((_,mi)=>{
        const gEmps=splitGroups[g];
        return gEmps.reduce((a,e)=>{
          if(execView==='opex'){
            const comp=getMonthlyComp(e,mi);
            const cap=getMonthlyCapEx(e,mi);
            return a+comp-cap;
          }
          return a+getMonthlyComp(e,mi);
        },0);
      });
    });
  }
  const monthlyData={};
  groupNames.forEach(g=>{
    const raw=monthlyDataFull[g];
    let transformed;
    if(isQuarterly){
      // Aggregate 12 months into 4 quarters
      transformed=[0,1,2,3].map(q=>raw[q*3]+raw[q*3+1]+raw[q*3+2]);
    } else if(execPeriod==='ytd'){
      // Cumulative from Jan (same as dashboard YTD)
      const cumul=[];raw.forEach((v,i)=>cumul.push((cumul[i-1]||0)+v));
      transformed=cumul;
    } else if(execPeriod==='qtd'){
      // Cumulative with quarterly reset (same as dashboard QTD)
      const cumul=[];raw.forEach((v,i)=>{const qi=i%3;cumul.push(qi===0?v:(cumul[i-1]||0)+v)});
      transformed=cumul;
    } else {
      // 'full' or 'mtd': show each month as-is (same as dashboard MTD)
      transformed=raw.slice();
    }
    // Filter to selected months (non-quarterly only)
    if(!isQuarterly&&execSelectedMonths.size>0){
      monthlyData[g]=periodMonths.map(mi=>transformed[mi]);
    } else {
      monthlyData[g]=transformed;
    }
  });

  // Build FTE and Avg Annualized FTE Comp overlay data (period-scoped)
  let monthlyFteFull,monthlyAvgAnnFteCompFull;
  if(isForecastYear){
    // For forecast years, use projected HC as flat FTE across all months
    const selYear=parseInt(execTrendYear);
    const fcYearIdx=FORECAST_YEARS.indexOf(selYear);
    const fcRows=projectForecast(emps);
    const fcRow=fcYearIdx>=0&&fcRows[fcYearIdx+1]?fcRows[fcYearIdx+1]:null;
    const fcHC=fcRow?fcRow.hc:emps.length;
    const fcTotal=fcRow?fcRow.total:0;
    const avgAnnComp=fcHC?Math.round(fcTotal/fcHC):0;
    monthlyFteFull=MONTH_SHORT.map(()=>fcHC);
    monthlyAvgAnnFteCompFull=MONTH_SHORT.map(()=>avgAnnComp);
  } else {
    monthlyFteFull=MONTH_SHORT.map((_,mi)=>{
      let fte=0;
      emps.forEach(e=>{const f=getMonthFactor(e,mi);if(f>0){const allocTotal=(e.allocations||[]).reduce((s,a)=>s+a.pct,0);fte+=f*(allocTotal/100)}});
      return Math.round(fte*100)/100;
    });
    monthlyAvgAnnFteCompFull=MONTH_SHORT.map((_,mi)=>{
      if(!monthlyFteFull[mi])return 0;
      const mComp=emps.reduce((a,e)=>a+getMonthlyComp(e,mi),0);
      return Math.round((mComp/monthlyFteFull[mi])*12);
    });
  }
  let monthlyFte,monthlyAvgAnnFteComp;
  if(isQuarterly){
    // Average FTE per quarter, average ann. comp per quarter
    monthlyFte=[0,1,2,3].map(q=>{const s=monthlyFteFull[q*3]+monthlyFteFull[q*3+1]+monthlyFteFull[q*3+2];return Math.round(s/3*100)/100});
    monthlyAvgAnnFteComp=[0,1,2,3].map(q=>{const s=monthlyAvgAnnFteCompFull[q*3]+monthlyAvgAnnFteCompFull[q*3+1]+monthlyAvgAnnFteCompFull[q*3+2];return Math.round(s/3)});
  } else {
    monthlyFte=periodMonths.map(mi=>monthlyFteFull[mi]);
    monthlyAvgAnnFteComp=periodMonths.map(mi=>monthlyAvgAnnFteCompFull[mi]);
  }

  // Chart
  if(typeof Chart!=='undefined'){
    if(execMonthlyChart)execMonthlyChart.destroy();
    const datasets=groupNames.map((g,i)=>{
      const color=execSplit==='none'?window.getChartColors()[0]:window.getChartColors()[i%window.getChartColors().length];
      return {label:g.length>25?g.slice(0,23)+'\u2026':g,data:monthlyData[g],backgroundColor:color,borderColor:color,borderWidth:execSplit==='none'?2:1,yAxisID:'y',order:2};
    });
    if(execSplit!=='none'){window.stackedBarDatalabels(datasets,tickColor,null,'exec')}
    else{const _execDlC=window.getCrispDatalabelColor('exec')||tickColor;datasets.forEach(ds=>{ds.datalabels={display:true,anchor:'end',align:'end',color:_execDlC,font:{size:window.chartColorScheme==='crisp'?13:11,weight:'bold'},formatter:v=>v>=1000?'$'+(v/1000).toFixed(0)+'K':'$'+Math.round(v)}})}
    // FTE count line
    const ecc=window.getChartColors();
    datasets.push({label:'Allocated FTE',data:monthlyFte,type:'line',borderColor:ecc[1],backgroundColor:'transparent',borderWidth:2,pointRadius:3,pointBackgroundColor:ecc[1],yAxisID:'y1',tension:0.3,datalabels:{display:false},order:0});
    // Avg Annualized FTE comp line
    datasets.push({label:'Avg Ann. FTE Comp',data:monthlyAvgAnnFteComp,type:'line',borderColor:ecc[4],backgroundColor:'transparent',borderWidth:2,borderDash:[5,3],pointRadius:3,pointBackgroundColor:ecc[4],yAxisID:'y',tension:0.3,datalabels:{display:false},order:0});
    execMonthlyChart=new Chart(document.getElementById('execMonthlyChart'),{
      type:'bar',
      data:{labels:periodLabels,datasets},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
        plugins:{legend:{display:true,position:'bottom',labels:{color:tickColor,boxWidth:14,font:{size:13},padding:16}},datalabels:{},
          tooltip:{mode:'index',intersect:false,animation:{duration:0},callbacks:{label:function(ctx){
            const label=ctx.dataset.label||'';
            const val=ctx.parsed.y;
            if(ctx.dataset.yAxisID==='y1')return label+': '+Math.round(val*10)/10+' FTEs';
            return label+': '+(val<0?'-':'')+'$'+(Math.abs(val)/1e6).toFixed(2)+'M';
          }}}},
        scales:{
          x:{stacked:execSplit!=='none',ticks:{color:tickColor},grid:{color:gridColor}},
          y:{stacked:execSplit!=='none',beginAtZero:true,position:'left',ticks:{color:tickColor,callback:v=>(v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(2)+'M'},grid:{color:gridColor}},
          y1:{beginAtZero:true,position:'right',title:{display:true,text:'FTE',color:tickColor,font:{size:12}},ticks:{color:tickColor},grid:{drawOnChartArea:false}}
        }
      }
    });
  }

  // Monthly/Quarterly table
  const tbl=document.getElementById('execMonthlyTable');
  const QLABELS=['Q1','Q2','Q3','Q4'];
  const numDataPoints=isQuarterly?4:periodMonths.length;
  const dataPointLabels=isQuarterly?QLABELS:periodMonths.map(i=>MONTH_SHORT[i]);
  const periodColLabel=isQuarterly?'Quarter':'Month';
  if(execSplit==='none'){
    let html=`<thead><tr><th>${periodColLabel}</th><th>Amount</th><th>FTE</th><th>Avg Ann. FTE Comp</th></tr></thead><tbody>`;
    let periodTotal=0;
    for(let pi=0;pi<numDataPoints;pi++){const v=monthlyData['Total'][pi];periodTotal+=v;html+=`<tr><td>${dataPointLabels[pi]}</td><td style="text-align:right">${fmt(v)}</td><td style="text-align:right">${monthlyFte[pi]}</td><td style="text-align:right">${fmt(monthlyAvgAnnFteComp[pi])}</td></tr>`}
    const sumFte=monthlyFte.reduce((a,v)=>a+v,0);const avgFte=Math.round(sumFte/numDataPoints*100)/100;
    html+=`</tbody><tfoot><tr><td>${periodLabel} Total</td><td style="text-align:right;font-weight:700;color:var(--accent)">${fmt(periodTotal)}</td><td style="text-align:right;font-weight:700">${avgFte} avg</td><td style="text-align:right;font-weight:700">${periodTotal&&avgFte?fmt(Math.round(periodTotal/numDataPoints/avgFte*12)):'\u2014'}</td></tr></tfoot>`;
    tbl.innerHTML=html;
  } else {
    let html=`<thead><tr><th>${periodColLabel}</th>`;
    groupNames.forEach(g=>html+=`<th class="split-th">${g}</th>`);
    html+='<th class="split-th col-divider">Total</th><th style="text-align:right">FTE</th><th style="text-align:right">Avg Ann. FTE</th></tr></thead><tbody>';
    const annuals=groupNames.map(()=>0);
    let grandTotal=0;
    for(let pi=0;pi<numDataPoints;pi++){
      html+=`<tr><td>${dataPointLabels[pi]}</td>`;
      let rowTotal=0;
      groupNames.forEach((g,gi)=>{const v=monthlyData[g][pi];annuals[gi]+=v;rowTotal+=v;html+=`<td style="text-align:right">${fmt(v)}</td>`});
      grandTotal+=rowTotal;
      html+=`<td style="text-align:right;font-weight:600" class="col-divider">${fmt(rowTotal)}</td><td style="text-align:right">${monthlyFte[pi]}</td><td style="text-align:right">${fmt(monthlyAvgAnnFteComp[pi])}</td></tr>`;
    }
    html+=`</tbody><tfoot><tr><td>${periodLabel} Total</td>`;
    groupNames.forEach((_,gi)=>html+=`<td style="text-align:right">${fmt(annuals[gi])}</td>`);
    const sumFte=monthlyFte.reduce((a,v)=>a+v,0);const avgFte=Math.round(sumFte/numDataPoints*100)/100;
    html+=`<td style="text-align:right;font-weight:700;color:var(--accent)" class="col-divider">${fmt(grandTotal)}</td><td style="text-align:right;font-weight:700">${avgFte} avg</td><td style="text-align:right;font-weight:700">${grandTotal&&avgFte?fmt(Math.round(grandTotal/numDataPoints/avgFte*12)):'\u2014'}</td></tr></tfoot>`;
    tbl.innerHTML=html;
  }

  // ── Pane 2: Long term forecast ──
  let fcSplitGroups=null,fcGroupKeys={};
  if(execFcSplit==='project'){
    fcSplitGroups={};
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
      if(allocated.length){fcSplitGroups[p.code]=allocated;fcGroupKeys[p.code]=p.id}
    });
    // Capture unassigned and partially-allocated remainder — merge into GEN-000
    const genProjFc=state.projects.find(p=>p.code==='GEN-000');
    const genCodeFc=genProjFc?'GEN-000':'Unassigned';
    emps.forEach(e=>{
      const used=allocTracker[e.id]||0;
      if(used<0.999){
        const rem=1-used;
        if(!fcSplitGroups[genCodeFc])fcSplitGroups[genCodeFc]=[];
        fcSplitGroups[genCodeFc].push({...e,salary:Math.round((e.salary||0)*rem),capPct:e.capPct,_allocPct:rem});
        if(!fcGroupKeys[genCodeFc])fcGroupKeys[genCodeFc]=genProjFc?genProjFc.id:null;
      }
    });
  } else if(execFcSplit==='function'){
    fcSplitGroups={};
    const used=new Set();
    FUNCTIONS.forEach(f=>{const e=emps.filter(e=>{if(e.function===f){used.add(e.id);return true}return false});if(e.length){fcSplitGroups[f]=e;fcGroupKeys[f]=f}});
    const other=emps.filter(e=>!used.has(e.id));
    if(other.length){fcSplitGroups['Other']=other;fcGroupKeys['Other']='Other'}
  } else if(execFcSplit==='country'){
    fcSplitGroups={};
    const used=new Set();
    COUNTRIES.forEach(c=>{const e=emps.filter(e=>{if(e.country===c){used.add(e.id);return true}return false});if(e.length){fcSplitGroups[c]=e;fcGroupKeys[c]=c}});
    const other=emps.filter(e=>!used.has(e.id));
    if(other.length){fcSplitGroups['Other']=other;fcGroupKeys['Other']='Other'}
  }

  const totalFcRows=projectForecast(emps);
  const yearLabels=getDisplayFcLabels();
  const fcTbl=document.getElementById('execForecastTable');
  const showFcOpex=execFcView==='opex';

  if(!fcSplitGroups){
    // Total view
    let html='<thead><tr><th>Year</th><th>HC</th><th>Total Comp</th><th>CapEx</th><th>OpEx</th></tr></thead><tbody>';
    totalFcRows.forEach(r=>html+=`<tr><td style="font-weight:600;color:var(--accent)">${displayYear(r.year)}</td><td>${r.hc}</td><td>${fmt(r.total)}</td><td>${fmt(r.capex)}</td><td style="color:var(--success)">${fmt(r.opex)}</td></tr>`);
    html+='</tbody>';
    fcTbl.innerHTML=html;

    if(typeof Chart!=='undefined'){
      if(execForecastChart)execForecastChart.destroy();
      const efc=window.getChartColors();
      const ds=showFcOpex?[
        {label:'OpEx',data:totalFcRows.map(r=>r.opex),backgroundColor:efc[4],stack:'pos'},
        {label:'CapEx',data:totalFcRows.map(r=>-r.capex),backgroundColor:window.hexToRgba(efc[0],0.4),stack:'neg'}
      ]:[
        {label:'Total Comp',data:totalFcRows.map(r=>r.total),backgroundColor:efc[0]}
      ];
      window.stackedBarDatalabels(ds,tickColor,null,'execFc');
      execForecastChart=new Chart(document.getElementById('execForecastChart'),{
        type:'bar',data:{labels:yearLabels,datasets:ds},
        plugins:[window.yoyArrowsPlugin],
        options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:32}},plugins:{legend:{position:'bottom',labels:{color:tickColor,padding:16}},datalabels:{},yoyArrows:{}},scales:{
          x:{stacked:true,ticks:{color:tickColor},grid:{color:gridColor}},
          y:{stacked:true,ticks:{color:tickColor,callback:v=>(v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(2)+'M'},grid:{color:gridColor}}
        }}
      });
    }
  } else {
    const gNames=Object.keys(fcSplitGroups);
    const gForecasts={};
    gNames.forEach(g=>gForecasts[g]=projectForecast(fcSplitGroups[g],fcGroupKeys[g]));

    // Normalize group values so they sum exactly to the independent total
    yearLabels.forEach((_,yi)=>{
      const tr=totalFcRows[yi];
      let sumTotal=0,sumCapex=0;
      gNames.forEach(g=>{const r=gForecasts[g][yi];if(r){sumTotal+=r.total;sumCapex+=r.capex}});
      if(sumTotal){
        const ratioT=tr.total/sumTotal;
        const ratioC=sumCapex?tr.capex/sumCapex:0;
        gNames.forEach(g=>{const r=gForecasts[g][yi];if(r){r.total=Math.round(r.total*ratioT);r.capex=Math.round(r.capex*ratioC);r.opex=r.total-r.capex}});
      }
    });

    let html='<thead><tr><th>Year</th>';
    gNames.forEach(g=>html+=`<th class="split-th">${g}</th>`);
    html+='<th class="split-th col-divider">Total</th></tr></thead><tbody>';
    yearLabels.forEach((y,yi)=>{
      html+=`<tr><td style="font-weight:600;color:var(--accent)">${y}</td>`;
      gNames.forEach(g=>{const r=gForecasts[g][yi];const v=r?(showFcOpex?r.opex:r.total):0;html+=`<td style="text-align:right">${fmt(v)}</td>`});
      // Use independently-computed total to ensure consistency across split modes
      const tr=totalFcRows[yi];
      html+=`<td style="text-align:right;font-weight:600;color:var(--accent)" class="col-divider">${fmt(showFcOpex?tr.opex:tr.total)}</td></tr>`;
    });
    html+='</tbody>';
    fcTbl.innerHTML=html;

    if(typeof Chart!=='undefined'){
      if(execForecastChart)execForecastChart.destroy();
      const ds=gNames.map((g,i)=>({
        label:g.length>20?g.slice(0,18)+'\u2026':g,
        data:yearLabels.map((_,yi)=>{const r=gForecasts[g][yi];return r?(showFcOpex?r.opex:r.total):0}),
        backgroundColor:window.getChartColors()[i%window.getChartColors().length]
      }));
      window.stackedBarDatalabels(ds,tickColor,null,'execFc');
      execForecastChart=new Chart(document.getElementById('execForecastChart'),{
        type:'bar',data:{labels:yearLabels,datasets:ds},
        plugins:[window.yoyArrowsPlugin],
        options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:32}},plugins:{legend:{position:'bottom',labels:{color:tickColor,boxWidth:14,font:{size:13},padding:16}},datalabels:{},yoyArrows:{}},scales:{
          x:{stacked:true,ticks:{color:tickColor},grid:{color:gridColor}},
          y:{stacked:true,ticks:{color:tickColor,callback:v=>(v<0?'-':'')+'$'+(Math.abs(v)/1e6).toFixed(2)+'M'},grid:{color:gridColor}}
        }}
      });
    }
  }

  // Update sparkline if collapsed
  if(execFcCollapsed)renderExecFcSparkline();

  // ── Pane 3: Roster by Category > Product > People ──
  const rosterPane=document.getElementById('execRosterPane');
  // Build category > product > [{emp, alloc}] tree
  const tree={};
  emps.forEach(emp=>{
    (emp.allocations||[]).forEach(alloc=>{
      const proj=window.getProjectById(alloc.projId);
      if(!proj)return;
      const cat=proj.category||'Uncategorized';
      const prod=proj.product||proj.name||proj.code;
      if(!tree[cat])tree[cat]={};
      if(!tree[cat][prod])tree[cat][prod]=[];
      const annualComp=getProratedComp(emp);
      const capEx=getProratedCapEx(emp);
      tree[cat][prod].push({
        name:emp.name,
        seniority:emp.seniority,
        function:emp.function,
        allocPct:alloc.pct,
        capEx:Math.round(capEx*alloc.pct/100),
        opEx:Math.round((annualComp-capEx)*alloc.pct/100),
        totalComp:Math.round(annualComp*alloc.pct/100)
      });
    });
  });

  const cats=Object.keys(tree).sort();
  if(!cats.length){rosterPane.innerHTML='<p style="color:var(--text-dim)">No project allocations found.</p>';return}

  let rHtml='';
  cats.forEach(cat=>{
    const allCatPeople=Object.values(tree[cat]).flat();
    const catTotal=allCatPeople.reduce((a,p)=>a+p.totalComp,0);
    const catCapEx=allCatPeople.reduce((a,p)=>a+p.capEx,0);
    const catOpEx=allCatPeople.reduce((a,p)=>a+p.opEx,0);
    const catFte=Math.round(allCatPeople.reduce((a,p)=>a+p.allocPct,0))/100;
    rHtml+=`<div class="exec-roster-cat collapsed"><div class="cat-header"><span><span class="toggle-icon">&#9660;</span>${cat}</span><span style="font-weight:700;font-size:.82rem">${catFte} FTE &middot; ${fmtM(catTotal)} total &middot; ${fmtM(catCapEx)} CapEx &middot; ${fmtM(catOpEx)} OpEx</span></div><div class="cat-body">`;
    const prods=Object.keys(tree[cat]).sort();
    prods.forEach(prod=>{
      const people=tree[cat][prod];
      const prodCapEx=people.reduce((a,p)=>a+p.capEx,0);
      const prodTotal=people.reduce((a,p)=>a+p.totalComp,0);
      rHtml+=`<div class="exec-roster-prod"><div class="prod-header"><span class="toggle-icon">&#9660;</span>${prod} <span style="font-weight:600;font-size:.8rem">(${people.length} people &middot; ${fmtM(prodTotal)} total &middot; ${fmtM(prodCapEx)} CapEx)</span></div><div class="prod-body">`;
      people.sort((a,b)=>b.allocPct-a.allocPct).forEach(p=>{
        rHtml+=`<div class="exec-roster-person"><span class="person-name">${p.name} <span style="color:var(--text-dim);font-size:.75rem">${p.seniority}, ${p.function}</span></span><span class="person-metrics">${p.allocPct}% alloc &middot; ${fmt(p.capEx)} CapEx &middot; ${fmt(p.opEx)} OpEx</span></div>`;
      });
      rHtml+=`</div></div>`;
    });
    rHtml+=`</div></div>`;
  });
  rosterPane.innerHTML=rHtml;
  // Attach collapse/expand handlers
  rosterPane.querySelectorAll('.cat-header').forEach(h=>h.addEventListener('click',()=>h.parentElement.classList.toggle('collapsed')));
  rosterPane.querySelectorAll('.prod-header').forEach(h=>h.addEventListener('click',(e)=>{e.stopPropagation();if(!document.body.classList.contains('ops-mode'))h.parentElement.classList.toggle('collapsed')}));
}

// Expose to window for inline onclick handlers and cross-module references
window.toggleExecPane = toggleExecPane;
window.renderExecView = renderExecView;
window.execFilterProduct = execFilterProduct;
window.execFilterCategory = execFilterCategory;
window.execSelectedMonths = execSelectedMonths;

export { renderExecView, toggleExecPane, renderSparkline, execSelectedMonths };
