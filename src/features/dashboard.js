// ── DASHBOARD ──
import { state, saveState } from '../lib/state.js';
import { fmt, esc, uid, COUNTRIES, SENIORITY, FUNCTIONS, COUNTRY_MULT, SENIORITY_BASE, FUNCTION_MULT } from '../lib/constants.js';
import {
  getProratedBase, getProratedBonus, getProratedBenefits, getProratedComp,
  getProratedCapEx, getProratedOpEx, getCapPct, getCapEx, getOpEx,
  getMonthlyBase, getMonthlyBonus, getMonthlyBenefits, getMonthlyComp,
  getMonthlyCapEx, getMonthFactor, getAnnualFactor,
  getProjectById, getEmpProject, getEmpMarkets, getAllocFlag, CURRENT_YEAR
} from '../lib/proration.js';

let dashChart=null;
let fteChart=null;
let groupBy='month',stackBy='category',compView='total';
function getFilteredEmployees(){
  let emps=state.employees;
  const c=document.getElementById('dashCountry').value;
  const s=document.getElementById('dashSeniority').value;
  const f=document.getElementById('dashFunction').value;
  const pc=document.getElementById('dashProdCat').value;
  const pr=document.getElementById('dashProduct').value;
  const pj=document.getElementById('dashProject').value;
  if(c)emps=emps.filter(e=>e.country===c);
  if(s)emps=emps.filter(e=>e.seniority===s);
  if(f)emps=emps.filter(e=>e.function===f);
  if(pc||pr||pj){
    const matchProjIds=new Set(state.projects.filter(p=>{
      if(pc&&p.category!==pc)return false;
      if(pr&&p.product!==pr)return false;
      if(pj&&p.code!==pj)return false;
      return true;
    }).map(p=>p.id));
    emps=emps.filter(e=>e.allocations&&e.allocations.some(a=>matchProjIds.has(a.projId)));
  }
  return emps;
}
function renderStats(emps){
  const totalHC=emps.length;
  const totalBase=emps.reduce((a,e)=>a+getProratedBase(e),0);
  const avgBase=totalHC?Math.round(emps.reduce((a,e)=>a+e.salary,0)/totalHC):0;
  const totalBonus=emps.reduce((a,e)=>a+getProratedBonus(e),0);
  const totalBenefits=emps.reduce((a,e)=>a+getProratedBenefits(e),0);
  const totalComp=emps.reduce((a,e)=>a+getProratedComp(e),0);
  const totalCapEx=emps.reduce((a,e)=>a+getProratedCapEx(e),0);
  const totalOpEx=totalComp-totalCapEx;
  const svc=getStatValueColor();
  document.getElementById('dashStatCards').innerHTML=`
    <div class="stat-card"><div class="label">Headcount</div><div class="value" style="color:${svc}">${totalHC}</div></div>
    <div class="stat-card"><div class="label">Base Cost</div><div class="value" style="color:${svc}">${fmt(totalBase)}</div></div>
    <div class="stat-card"><div class="label">Avg Base</div><div class="value" style="color:${svc}">${fmt(avgBase)}</div></div>
    <div class="stat-card"><div class="label">Bonus</div><div class="value" style="color:${svc}">${fmt(totalBonus)}</div></div>
    <div class="stat-card"><div class="label">Benefits</div><div class="value" style="color:${svc}">${fmt(totalBenefits)}</div></div>
    <div class="stat-card"><div class="label">Total Comp</div><div class="value" style="color:${svc}">${fmt(totalComp)}</div></div>
    <div class="stat-card"><div class="label">CapEx Offset</div><div class="value" style="color:${svc}">${fmt(totalCapEx)}</div></div>
    <div class="stat-card"><div class="label">C&B OpEx</div><div class="value" style="color:${svc};font-weight:800">${fmt(totalOpEx)}</div></div>`;
}
// Use shared chart utilities from chart-utils.js via window
const getChartColors=(...a)=>window.getChartColors(...a);
const getCrispDatalabelColor=(...a)=>window.getCrispDatalabelColor(...a);
const getSparkColor=(...a)=>window.getSparkColor(...a);
const getStatValueColor=(...a)=>window.getStatValueColor(...a);
const hexToRgba=(...a)=>window.hexToRgba(...a);
const FTE_TOOLTIP={
  mode:'index',intersect:false,
  callbacks:{
    label(ctx){return `${ctx.dataset.label}: ${ctx.parsed.y} FTEs`},
    afterBody(items){
      if(!items.length)return '';
      const chart=items[0].chart;
      const idx=items[0].dataIndex;
      let total=0;
      chart.data.datasets.forEach(ds=>{const v=ds.data[idx];if(typeof v==='number')total+=v});
      return `\nTotal: ${Math.round(total*10)/10} FTEs`;
    }
  }
};
function fmtShort(n){const abs=Math.abs(n);if(abs>=1e5)return (n<0?'-':'')+'$'+(abs/1e6).toFixed(2)+'M';if(abs>=1e3)return (n<0?'-':'')+'$'+(abs/1e3).toFixed(0)+'K';return fmt(n)}
function stackedBarDatalabels(datasets,tickColor,fontSize,crispSection){
  const isCrispDl=window.chartColorScheme==='crisp';
  const fs=fontSize||(isCrispDl?13:11);
  const dlColor=getCrispDatalabelColor(crispSection)||tickColor;
  const posStacks=datasets.filter(d=>!d.stack||d.stack==='pos');
  const negStacks=datasets.filter(d=>d.stack==='neg');
  const topPosIdx=posStacks.length?datasets.indexOf(posStacks[posStacks.length-1]):-1;
  const bottomNegIdx=negStacks.length?datasets.indexOf(negStacks[negStacks.length-1]):-1;
  datasets.forEach((ds,i)=>{
    if(i===topPosIdx){
      ds.datalabels={display:true,anchor:'end',align:'end',color:dlColor,font:{size:fs,weight:'bold'},
        formatter:(_,ctx)=>{
          let sum=0;posStacks.forEach(d=>{const val=d.data[ctx.dataIndex];if(val>0)sum+=val});
          return sum?fmtShort(sum):'';
        }};
    } else if(i===bottomNegIdx){
      ds.datalabels={display:true,anchor:'start',align:'start',color:dlColor,font:{size:fs,weight:'bold'},
        formatter:(_,ctx)=>{
          let sum=0;negStacks.forEach(d=>{sum+=d.data[ctx.dataIndex]});
          return sum<0?fmtShort(sum):'';
        }};
    } else {
      ds.datalabels={display:false};
    }
  });
}
// Y/Y % change arrows plugin for forecast bar charts
const yoyArrowsPlugin={
  id:'yoyArrows',
  afterDraw(chart){
    if(!chart.options.plugins.yoyArrows)return;
    const opts=chart.options.plugins.yoyArrows;
    const ctx=chart.ctx;
    const area=chart.chartArea;
    const datasets=chart.data.datasets;
    const nLabels=chart.data.labels.length;
    if(nLabels<2)return;
    const totals=[];
    const yPositions=[];
    for(let i=0;i<nLabels;i++){
      let sumPos=0,sumNeg=0;
      datasets.forEach((ds,di)=>{
        const meta=chart.getDatasetMeta(di);
        if(meta.hidden)return;
        const v=ds.data[i];if(typeof v!=='number')return;
        if(ds.stack==='neg'){sumNeg+=v}
        else if(v>0)sumPos+=v;
      });
      if(sumPos>0){
        totals.push(sumPos);
        yPositions.push(sumPos);
      } else {
        totals.push(Math.abs(sumNeg));
        yPositions.push(sumNeg);
      }
    }
    let visMetaIdx=0;
    for(let di=0;di<datasets.length;di++){if(!chart.getDatasetMeta(di).hidden){visMetaIdx=di;break}}
    const chartW=area.right-area.left;
    const baseFontSize=Math.max(9,Math.min(13,chartW/(nLabels*6)));
    const fontSize=opts.fontSize||baseFontSize;
    const arrowColor=opts.color||(document.documentElement.classList.contains('dark')?'rgba(255,255,255,.45)':'rgba(0,0,0,.35)');
    const textColor=opts.textColor||(document.documentElement.classList.contains('dark')?'rgba(255,255,255,.7)':'rgba(0,0,0,.6)');
    ctx.save();
    for(let i=0;i<nLabels-1;i++){
      const prev=totals[i],cur=totals[i+1];
      if(!prev)continue;
      const pct=((cur-prev)/Math.abs(prev))*100;
      const pctStr=(pct>=0?'+':'')+pct.toFixed(1)+'%';
      const meta0=chart.getDatasetMeta(visMetaIdx);
      if(!meta0||!meta0.data[i]||!meta0.data[i+1])continue;
      const barL=meta0.data[i];
      const barR=meta0.data[i+1];
      const yScale=chart.scales.y;
      const y1=yScale.getPixelForValue(yPositions[i]);
      const y2=yScale.getPixelForValue(yPositions[i+1]);
      const halfW=barL.width?barL.width/2:12;
      const x1=barL.x+halfW+2;
      const x2=barR.x-halfW-2;
      const midX=(x1+x2)/2;
      const midY=(y1+y2)/2;
      ctx.beginPath();
      ctx.strokeStyle=arrowColor;
      ctx.lineWidth=1.2;
      ctx.setLineDash([3,2]);
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const angle=Math.atan2(y2-y1,x2-x1);
      const headLen=6;
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle-0.4),y2-headLen*Math.sin(angle-0.4));
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle+0.4),y2-headLen*Math.sin(angle+0.4));
      ctx.strokeStyle=arrowColor;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font=`600 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      const tw=ctx.measureText(pctStr).width;
      const pad=3;
      const bgColor=pct>=0?(document.documentElement.classList.contains('dark')?'rgba(60,120,60,.6)':'rgba(58,125,68,.12)'):(document.documentElement.classList.contains('dark')?'rgba(140,50,50,.6)':'rgba(184,48,48,.12)');
      const labelColor=pct>=0?(document.documentElement.classList.contains('dark')?'#7adf7a':'#2a6a2a'):(document.documentElement.classList.contains('dark')?'#ff8a8a':'#a03030');
      ctx.fillStyle=bgColor;
      ctx.beginPath();
      const rx=midX-tw/2-pad,ry=midY-fontSize/2-pad-2,rw=tw+pad*2,rh=fontSize+pad*2;
      ctx.roundRect?ctx.roundRect(rx,ry,rw,rh,3):ctx.rect(rx,ry,rw,rh);
      ctx.fill();
      ctx.fillStyle=labelColor;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(pctStr,midX,midY-1);
    }
    ctx.restore();
  }
};
function renderDashboard(){
  const emps=getFilteredEmployees();
  const avgBase=emps.length?Math.round(emps.reduce((a,e)=>a+e.salary,0)/emps.length):0;
  const avgCapPct=emps.length?Math.round(emps.reduce((a,e)=>a+getCapPct(e),0)/emps.length):0;
  const totalComp=emps.reduce((a,e)=>a+getProratedComp(e),0);
  const totalCapEx=emps.reduce((a,e)=>a+getProratedCapEx(e),0);
  const svc=getStatValueColor();
  const cbOpEx=totalComp-totalCapEx;
  const fmtM=v=>{const a=Math.abs(v);if(a>=1e5)return(v<0?'-':'')+'$'+(v/1e6).toFixed(2)+'M';return fmt(v)};
  document.getElementById('dashStatCards').innerHTML=
    `<div class="stat-card"><div class="label">Headcount</div><div class="value" style="color:${svc}">${emps.length}</div></div>`+
    `<div class="stat-card"><div class="label">Avg Base</div><div class="value" style="color:${svc}">${fmt(avgBase)}</div></div>`+
    `<div class="stat-card"><div class="label">Total Comp</div><div class="value" style="color:${svc}">${fmtM(totalComp)}</div></div>`+
    `<div class="stat-card"><div class="label">CapEx Offset</div><div class="value" style="color:${svc}">${fmtM(totalCapEx)}</div></div>`+
    `<div class="stat-card"><div class="label">Avg Cap %</div><div class="value" style="color:${svc}">${avgCapPct}%</div></div>`+
    `<div class="stat-card"><div class="label">C&B OpEx</div><div class="value" style="color:${svc};font-weight:800">${fmtM(cbOpEx)}</div></div>`;
  const showPeriod=(groupBy==='month'||groupBy==='quarter');
  document.getElementById('periodToggleWrap').style.display=showPeriod?'':'none';
  const isDark=document.documentElement.classList.contains('dark');
  const tickColor=isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
  const gridColor=isDark?'rgba(255,255,255,.08)':'#ddd';
  let labels,groups;
  if(groupBy==='month'){
    const MONTH_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    labels=MONTH_SHORT;
    groups={};
    MONTH_SHORT.forEach(m=>groups[m]=[]);
    emps.forEach(e=>MONTH_SHORT.forEach((m,mi)=>{groups[m].push({emp:e,mi})}));
  } else if(groupBy==='quarter'){
    const Q_LABELS=['Q1','Q2','Q3','Q4'];
    labels=Q_LABELS;
    groups={};
    Q_LABELS.forEach(q=>groups[q]=[]);
    emps.forEach(e=>{
      Q_LABELS.forEach((q,qi)=>{
        for(let m=qi*3;m<qi*3+3;m++){groups[q].push({emp:e,mi:m})}
      });
    });
  } else {
    const groupKey=groupBy==='function'?'function':groupBy==='seniority'?'seniority':'country';
    const groupLabels=groupBy==='function'?FUNCTIONS:groupBy==='seniority'?SENIORITY:COUNTRIES;
    groups={};
    groupLabels.forEach(l=>groups[l]=[]);
    emps.forEach(e=>{if(groups[e[groupKey]])groups[e[groupKey]].push(e)});
    labels=groupLabels.filter(l=>groups[l].length>0||emps.length===0);
  }
  let datasets=[];
  const isMonth=groupBy==='month'||groupBy==='quarter';
  const compVal=(entry)=>isMonth?getMonthlyComp(entry.emp,entry.mi):getProratedComp(entry);
  const baseVal=(entry)=>isMonth?getMonthlyBase(entry.emp,entry.mi):getProratedBase(entry);
  const bonusVal=(entry)=>isMonth?getMonthlyBonus(entry.emp,entry.mi):getProratedBonus(entry);
  const benVal=(entry)=>isMonth?getMonthlyBenefits(entry.emp,entry.mi):getProratedBenefits(entry);
  const empOf=(entry)=>isMonth?entry.emp:entry;

  const capExVal=(entry)=>isMonth?getMonthlyCapEx(empOf(entry),entry.mi):getProratedCapEx(entry);

  if(stackBy==='country'){
    const opexAdjComp=(x)=>compView==='opex'?compVal(x)-capExVal(x):compVal(x);
    COUNTRIES.forEach((c,i)=>{
      const data=labels.map(l=>groups[l].filter(x=>empOf(x).country===c).reduce((a,x)=>a+opexAdjComp(x),0));
      if(data.some(v=>v>0))datasets.push({label:c,data,backgroundColor:getChartColors()[i%getChartColors().length],stack:'pos'});
    });
    if(compView==='opex'){
      COUNTRIES.forEach((c,i)=>{
        const data=labels.map(l=>-groups[l].filter(x=>empOf(x).country===c).reduce((a,x)=>a+capExVal(x),0));
        if(data.some(v=>v<0))datasets.push({label:c+' (CapEx)',data,backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.35),stack:'neg'});
      });
    }
  } else if(stackBy==='category'){
    function getEffectiveAllocs(e){
      if(e.allocations&&e.allocations.length)return e.allocations;
      return[];
    }
    const opexAdjComp2=(x)=>compView==='opex'?compVal(x)-capExVal(x):compVal(x);
    const cats=[...new Set(state.projects.map(p=>p.category||'Uncategorized'))];
    cats.forEach((cat,i)=>{
      const catProjIds=new Set(state.projects.filter(p=>(p.category||'Uncategorized')===cat).map(p=>p.id));
      const data=labels.map(l=>groups[l].reduce((a,x)=>{
        const allocs=getEffectiveAllocs(empOf(x));
        if(!allocs.length)return a;
        const allocPct=allocs.filter(al=>catProjIds.has(al.projId)).reduce((s,al)=>s+al.pct,0)/100;
        return a+Math.round(opexAdjComp2(x)*allocPct);
      },0));
      if(data.some(v=>v>0))datasets.push({label:cat,data,backgroundColor:getChartColors()[i%getChartColors().length],stack:'pos'});
    });
    const unData=labels.map(l=>groups[l].reduce((a,x)=>{
      const allocs=getEffectiveAllocs(empOf(x));
      if(!allocs.length)return a+opexAdjComp2(x);
      const allocPct=allocs.reduce((s,al)=>s+al.pct,0)/100;
      if(allocPct>=1)return a;
      return a+Math.round(opexAdjComp2(x)*(1-allocPct));
    },0));
    if(unData.some(v=>v>0))datasets.push({label:'Unallocated',data:unData,backgroundColor:getChartColors()[cats.length%getChartColors().length],stack:'pos'});
    if(compView==='opex'){
      cats.forEach((cat,i)=>{
        const catProjIds2=new Set(state.projects.filter(p=>(p.category||'Uncategorized')===cat).map(p=>p.id));
        const data=labels.map(l=>-groups[l].reduce((a,x)=>{
          const allocs=getEffectiveAllocs(empOf(x));
          if(!allocs.length)return a;
          const allocPct=allocs.filter(al=>catProjIds2.has(al.projId)).reduce((s,al)=>s+al.pct,0)/100;
          return a+Math.round(capExVal(x)*allocPct);
        },0));
        if(data.some(v=>v<0))datasets.push({label:cat+' (CapEx)',data,backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.35),stack:'neg'});
      });
    }
  } else {
    const opexAdjComp3=(x)=>compView==='opex'?compVal(x)-capExVal(x):compVal(x);
    SENIORITY.forEach((s,i)=>{
      const data=labels.map(l=>groups[l].filter(x=>empOf(x).seniority===s).reduce((a,x)=>a+opexAdjComp3(x),0));
      if(data.some(v=>v>0))datasets.push({label:s,data,backgroundColor:getChartColors()[i%getChartColors().length],stack:'pos'});
    });
    if(compView==='opex'){
      SENIORITY.forEach((s,i)=>{
        const data=labels.map(l=>-groups[l].filter(x=>empOf(x).seniority===s).reduce((a,x)=>a+capExVal(x),0));
        if(data.some(v=>v<0))datasets.push({label:s+' (CapEx)',data,backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.35),stack:'neg'});
      });
    }
  }
  // Apply cumulative transform for QTD/YTD when grouped by month
  if(groupBy==='month'&&periodMode!=='mtd'){
    datasets.forEach(ds=>{
      const cumul=[];
      ds.data.forEach((v,i)=>{
        if(periodMode==='ytd'){
          cumul.push((cumul[i-1]||0)+v);
        } else {
          const qi=i%3;
          cumul.push(qi===0?v:(cumul[i-1]||0)+v);
        }
      });
      ds.data=cumul;
    });
  }
  // Apply YTD cumulative for quarter grouping
  if(groupBy==='quarter'&&periodMode==='ytd'){
    datasets.forEach(ds=>{
      const cumul=[];
      ds.data.forEach((v,i)=>{cumul.push((cumul[i-1]||0)+v)});
      ds.data=cumul;
    });
  }
  if(typeof Chart!=='undefined'){
    if(dashChart)dashChart.destroy();
    stackedBarDatalabels(datasets,tickColor,null,'budget');
    dashChart=new Chart(document.getElementById('dashChart'),{
      type:'bar',
      data:{labels:labels.map(l=>l.length>18?l.slice(0,16)+'…':l),datasets},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:'bottom',labels:{color:tickColor,padding:14}},datalabels:{}},scales:{
        x:{stacked:true,ticks:{color:tickColor},grid:{color:gridColor}},
        y:{stacked:true,ticks:{color:tickColor,callback:v=>'$'+v.toLocaleString()},grid:{color:gridColor}}
      }}
    });
    // FTE sparkline chart
    if(fteChart)fteChart.destroy();
    const MONTH_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function empFte(e,mi){
      const mf=getMonthFactor(e,mi);if(mf<=0)return 0;
      const allocTotal=e.allocations&&e.allocations.length?e.allocations.reduce((s,a)=>s+a.pct,0)/100:0;
      return mf*allocTotal;
    }
    let fteDatasets=[];
    if(stackBy==='seniority'){
      SENIORITY.forEach((s,i)=>{
        const segEmps=emps.filter(e=>e.seniority===s);
        if(!segEmps.length)return;
        const data=MONTH_SHORT.map((_,mi)=>Math.round(segEmps.reduce((a,e)=>a+empFte(e,mi),0)*10)/10);
        fteDatasets.push({label:s,data,borderColor:getChartColors()[i%getChartColors().length],backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.25),fill:true,tension:0.4,pointRadius:0,borderWidth:1.5});
      });
    } else if(stackBy==='country'){
      COUNTRIES.forEach((c,i)=>{
        const segEmps=emps.filter(e=>e.country===c);
        if(!segEmps.length)return;
        const data=MONTH_SHORT.map((_,mi)=>Math.round(segEmps.reduce((a,e)=>a+empFte(e,mi),0)*10)/10);
        fteDatasets.push({label:c,data,borderColor:getChartColors()[i%getChartColors().length],backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.25),fill:true,tension:0.4,pointRadius:0,borderWidth:1.5});
      });
    } else if(stackBy==='category'){
      const cats=[...new Set(state.projects.map(p=>p.category||'Uncategorized'))];
      cats.forEach((cat,i)=>{
        const catProjIds=new Set(state.projects.filter(p=>(p.category||'Uncategorized')===cat).map(p=>p.id));
        const data=MONTH_SHORT.map((_,mi)=>{
          let fte=0;
          emps.forEach(e=>{
            const mf=getMonthFactor(e,mi);if(mf<=0)return;
            if(!e.allocations)return;
            e.allocations.forEach(a=>{if(catProjIds.has(a.projId))fte+=mf*a.pct/100});
          });
          return Math.round(fte*10)/10;
        });
        fteDatasets.push({label:cat,data,borderColor:getChartColors()[i%getChartColors().length],backgroundColor:hexToRgba(getChartColors()[i%getChartColors().length],0.25),fill:true,tension:0.4,pointRadius:0,borderWidth:1.5});
      });
    } else {
      const data=MONTH_SHORT.map((_,mi)=>Math.round(emps.reduce((a,e)=>a+empFte(e,mi),0)*10)/10);
      fteDatasets=[{label:'Allocated FTEs',data,borderColor:getChartColors()[0],backgroundColor:hexToRgba(getChartColors()[0],0.15),fill:true,tension:0.4,pointRadius:2,borderWidth:2}];
    }
    fteDatasets.forEach((ds,i)=>{
      if(i===fteDatasets.length-1){
        ds.datalabels={display:true,anchor:'end',align:'end',color:getCrispDatalabelColor('fte')||tickColor,font:{size:window.chartColorScheme==='crisp'?13:11,weight:'bold'},
          formatter:(_,ctx)=>{
            let sum=0;fteDatasets.forEach(d=>{const v=d.data[ctx.dataIndex];if(typeof v==='number')sum+=v});
            return sum?Math.round(sum*10)/10:'';
          }};
      } else {
        ds.datalabels={display:false};
      }
    });
    fteChart=new Chart(document.getElementById('fteChart'),{
      type:'line',
      data:{labels:MONTH_SHORT,datasets:fteDatasets},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
        plugins:{legend:{display:fteDatasets.length>1,position:'bottom',labels:{color:tickColor,boxWidth:14,font:{size:13},padding:14}},datalabels:{},tooltip:FTE_TOOLTIP},
        scales:{
          x:{ticks:{color:tickColor,font:{size:12}},grid:{display:false},stacked:true},
          y:{beginAtZero:true,stacked:true,ticks:{color:tickColor,font:{size:12}},grid:{color:gridColor},title:{display:true,text:'Allocated FTEs',color:tickColor,font:{size:12}}}
        }
      }
    });
    // Comp breakdown sub-charts (Base / Bonus / Benefits)
    if(document.getElementById('dashCompBreakdown').style.display!=='none'){
      renderDashBreakdownCharts(labels,groups,isMonth,baseVal,bonusVal,benVal,empOf,capExVal,tickColor,gridColor);
    }
  }
}
let dashBaseChart=null,dashBonusChart=null,dashBenefitsChart=null;
function renderDashBreakdownCharts(labels,groups,isMonth,baseVal,bonusVal,benVal,empOf,capExVal,tickColor,gridColor){
  const cc=getChartColors();
  const shortLabels=labels.map(l=>l.length>10?l.slice(0,8)+'…':l);
  const chartOpts=(title)=>({responsive:true,maintainAspectRatio:false,layout:{padding:{top:14}},
    plugins:{legend:{display:false},datalabels:{display:true,anchor:'end',align:'end',color:getCrispDatalabelColor('breakdown')||tickColor,font:{size:window.chartColorScheme==='crisp'?12:10,weight:'bold'},formatter:v=>v>=1000?'$'+(v/1000).toFixed(0)+'K':'$'+Math.round(v)}},
    scales:{x:{ticks:{color:tickColor,font:{size:10}},grid:{color:gridColor}},y:{beginAtZero:true,ticks:{color:tickColor,font:{size:10},callback:v=>'$'+v.toLocaleString()},grid:{color:gridColor}}}
  });
  function makeData(valFn){
    if(compView==='opex'){
      return[
        {label:'OpEx',data:labels.map(l=>groups[l].reduce((a,x)=>a+valFn(x)-Math.round(valFn(x)*getCapPct(empOf(x))/100),0)),backgroundColor:cc[0],stack:'pos'},
        {label:'CapEx',data:labels.map(l=>-groups[l].reduce((a,x)=>a+Math.round(valFn(x)*getCapPct(empOf(x))/100),0)),backgroundColor:hexToRgba(cc[0],0.35),stack:'neg'}
      ];
    }
    return[{label:'Total',data:labels.map(l=>groups[l].reduce((a,x)=>a+valFn(x),0)),backgroundColor:cc[0]}];
  }
  if(dashBaseChart)dashBaseChart.destroy();
  if(dashBonusChart)dashBonusChart.destroy();
  if(dashBenefitsChart)dashBenefitsChart.destroy();
  dashBaseChart=new Chart(document.getElementById('dashBaseChart'),{type:'bar',data:{labels:shortLabels,datasets:makeData(baseVal)},options:chartOpts('Base')});
  const bonusDs=makeData(bonusVal);bonusDs.forEach(d=>d.backgroundColor=d.stack==='neg'?hexToRgba(cc[1],0.35):cc[1]);
  dashBonusChart=new Chart(document.getElementById('dashBonusChart'),{type:'bar',data:{labels:shortLabels,datasets:bonusDs},options:chartOpts('Bonus')});
  const benDs=makeData(benVal);benDs.forEach(d=>d.backgroundColor=d.stack==='neg'?hexToRgba(cc[2],0.35):cc[2]);
  dashBenefitsChart=new Chart(document.getElementById('dashBenefitsChart'),{type:'bar',data:{labels:shortLabels,datasets:benDs},options:chartOpts('Benefits')});
}
document.getElementById('dashCompBreakdownToggle').addEventListener('click',function(){
  const wrap=document.getElementById('dashCompBreakdown');
  const vis=wrap.style.display!=='none';
  wrap.style.display=vis?'none':'';
  this.innerHTML=vis?'&#9654; Base / Bonus / Benefits':'&#9660; Base / Bonus / Benefits';
  if(!vis)renderDashboard();
});
document.querySelectorAll('#groupToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#groupToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');groupBy=b.dataset.group;renderDashboard();
}));
document.querySelectorAll('#compViewToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#compViewToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');compView=b.dataset.view;renderDashboard();
}));
document.querySelectorAll('#stackToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#stackToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');stackBy=b.dataset.stack;renderDashboard();
}));
['dashCountry','dashSeniority','dashFunction','dashProdCat','dashProduct','dashProject'].forEach(id=>document.getElementById(id).addEventListener('change',renderDashboard));
let periodMode='mtd';
let currentMonth=new Date().getMonth();
function syncMonthSelectors(){
  document.getElementById('curMonthSelDash').value=currentMonth;
  document.getElementById('curMonthSelExec').value=currentMonth;
}
document.querySelectorAll('#periodToggle .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#periodToggle .btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');periodMode=b.dataset.period;
  renderDashboard();
}));
document.getElementById('curMonthSelDash').addEventListener('change',function(){
  currentMonth=parseInt(this.value);syncMonthSelectors();renderDashboard();window.renderExecView();
});
document.getElementById('curMonthSelExec').addEventListener('change',function(){
  currentMonth=parseInt(this.value);syncMonthSelectors();renderDashboard();window.renderExecView();
});
syncMonthSelectors();

// Exports
export {
  renderDashboard, renderStats, getFilteredEmployees,
  fmtShort, stackedBarDatalabels, yoyArrowsPlugin, FTE_TOOLTIP,
  periodMode, currentMonth, syncMonthSelectors
};

// Assign to window for onclick handlers and cross-module access
window.renderDashboard = renderDashboard;
window.fmtShort = fmtShort;
window.stackedBarDatalabels = stackedBarDatalabels;
window.yoyArrowsPlugin = yoyArrowsPlugin;
window.FTE_TOOLTIP = FTE_TOOLTIP;
window.periodMode = periodMode;
window.currentMonth = currentMonth;
window.syncMonthSelectors = syncMonthSelectors;
window.getFilteredEmployees = getFilteredEmployees;
window.renderStats = renderStats;
