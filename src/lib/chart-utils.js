// ── Chart utilities ──
import { fmt } from './constants.js';

// Format as $M for chart labels (consistent across all charts)
function fmtChartM(n){if(!n)return '';const a=Math.abs(n);const s=n<0?'-':'';return s+'$'+(a/1e6).toFixed(2)+'M'}

// Unified chart colors — read from CSS custom properties
function getCSSVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export let chartColorScheme='default';
export function setChartColorScheme(val){chartColorScheme=val}

export function getChartColors(){
  return [
    getCSSVar('--chart-1')||'#2dd4bf',
    getCSSVar('--chart-2')||'#38bdf8',
    getCSSVar('--chart-3')||'#818cf8',
    getCSSVar('--chart-4')||'#6366f1',
    getCSSVar('--chart-5')||'#4f88c8',
    getCSSVar('--chart-6')||'#a78bfa',
    getCSSVar('--chart-7')||'#67e8f9',
    getCSSVar('--chart-8')||'#86efac',
  ];
}

export function getChartFills(){
  return [
    getCSSVar('--chart-1-fill')||'rgba(45,212,191,0.18)',
    getCSSVar('--chart-2-fill')||'rgba(56,189,248,0.18)',
    getCSSVar('--chart-3-fill')||'rgba(129,140,248,0.18)',
    getCSSVar('--chart-4-fill')||'rgba(99,102,241,0.18)',
    getCSSVar('--chart-5-fill')||'rgba(79,136,200,0.18)',
    getCSSVar('--chart-6-fill')||'rgba(167,139,250,0.18)',
    getCSSVar('--chart-7-fill')||'rgba(103,232,249,0.18)',
    getCSSVar('--chart-8-fill')||'rgba(134,239,172,0.18)',
  ];
}

// Static fallback arrays for code that imports these at module load time
const _fallback=['#1B1E38','#A17849','#3A7A7D','#6B6660','#A83C3C','#7A9478','#C4A574','#8E8680'];
export const CHART_COLORS=_fallback;
export const CHART_COLORS_MUTED_DARK=_fallback;
export const CHART_COLORS_NEON=_fallback;
export const CHART_COLORS_CRISP=_fallback;
export const CHART_COLORS_CRISP_DARK=_fallback;

// Tag colors — Indigo Slate
export const TAG_COLORS_LIGHT=['#1B1E38','#A17849','#3A7A7D','#6B6660','#A83C3C','#7A9478','#2E3356','#C08552','#3F3A33','#8B5A2E','#4A3A20','#938D85'];
export const TAG_COLORS_DARK=['#C4BFB3','#C4A574','#5A9A9D','#938D85','#C87878','#9AB898','#7A80A8','#E0B878','#B0A898','#D4A870','#A08060','#C4BFB3'];

export function getCrispDatalabelColor(){return null}

export function getSparkColor(type){
  if(type==='danger')return getCSSVar('--danger')||'#ef4444';
  return getCSSVar('--accent')||'#2dd4bf';
}

export function getStatValueColor(){
  return getCSSVar('--accent')||'#2dd4bf';
}

export function hexToRgba(hex,alpha){
  if(hex.startsWith('rgba'))return hex.replace(/,[\d.]+\)$/,','+alpha+')');
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${alpha})`
}

// Soft-bar plugin: gentle opacity on bar backgrounds
export const softBarPlugin={id:'softBar',beforeUpdate(chart){
  if(chart.config.type!=='bar')return;
  const alpha=0.65;
  chart.data.datasets.forEach(ds=>{
    if(ds._softBarApplied)return;
    const bg=ds.backgroundColor;
    if(typeof bg==='string'&&bg.charAt(0)==='#'){
      ds.backgroundColor=hexToRgba(bg,alpha);
      ds.borderColor=bg;
      ds.borderWidth=ds.borderWidth||1;
    } else if(typeof bg==='string'&&bg.startsWith('rgba')){
      const m=bg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if(m){const curA=parseFloat(m[4]);if(curA>alpha)ds.backgroundColor=`rgba(${m[1]},${m[2]},${m[3]},${Math.round(curA*alpha*100)/100})`}
    }
    ds._softBarApplied=true;
  });
}};

// Register plugins
if(typeof Chart!=='undefined')Chart.register(softBarPlugin);
if(typeof Chart!=='undefined'){
  Chart.defaults.plugins.tooltip.mode='index';
  Chart.defaults.plugins.tooltip.intersect=false;
  Chart.defaults.plugins.tooltip.animation={duration:0};
  Chart.defaults.plugins.tooltip.callbacks.label=function(ctx){
    const label=ctx.dataset.label||'';
    const val=ctx.parsed.y;
    if(typeof val!=='number')return label+': '+val;
    if(Math.abs(val)<500)return label+': '+Math.round(val*10)/10;
    const fmtVal=(val<0?'-':'')+'$'+(Math.abs(val)/1e6).toFixed(2)+'M';
    return label+': '+fmtVal;
  };
  Chart.defaults.hover.animationDuration=0;
}

export const FTE_TOOLTIP={
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

export function fmtShort(n){return (n<0?'-':'')+'$'+(Math.abs(n)/1e6).toFixed(2)+'M'}
export function fmtShort1(n){return (n<0?'-':'')+'$'+(Math.abs(n)/1e6).toFixed(1)+'M'}

export function stackedBarDatalabels(datasets,tickColor,fontSize){
  const fs=fontSize||11;
  const dlColor=tickColor;
  const posStacks=datasets.filter(d=>!d.stack||d.stack==='pos');
  const negStacks=datasets.filter(d=>d.stack==='neg');
  const topPosIdx=posStacks.length?datasets.indexOf(posStacks[posStacks.length-1]):-1;
  const bottomNegIdx=negStacks.length?datasets.indexOf(negStacks[negStacks.length-1]):-1;
  // Auto-detect if labels will be crunched (>6 data points)
  const nBars=(datasets[0]&&datasets[0].data)?datasets[0].data.length:0;
  const crunched=nBars>6;
  const fmt=crunched?fmtShort1:fmtShort;
  const rotation=crunched?-90:0;
  const labelFs=crunched?Math.max(9,fs-1):fs;
  datasets.forEach((ds,i)=>{
    if(i===topPosIdx){
      ds.datalabels={display:true,anchor:'end',align:'end',rotation:rotation,color:dlColor,font:{size:labelFs,weight:'bold'},
        formatter:(_,ctx)=>{
          let sum=0;posStacks.forEach(d=>{const val=d.data[ctx.dataIndex];if(val>0)sum+=val});
          return sum?fmtChartM(sum):'';
        }};
    } else if(i===bottomNegIdx){
      ds.datalabels={display:true,anchor:'start',align:'start',rotation:rotation,color:dlColor,font:{size:labelFs,weight:'bold'},
        formatter:(_,ctx)=>{
          let sum=0;negStacks.forEach(d=>{sum+=d.data[ctx.dataIndex]});
          return sum<0?fmtChartM(sum):'';
        }};
    } else {
      ds.datalabels={display:false};
    }
  });
}

// Y/Y arrows plugin
export const yoyArrowsPlugin={
  id:'yoyArrows',
  afterDatasetsDraw(chart){
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
      if(sumPos>0){totals.push(sumPos);yPositions.push(sumPos)}
      else{totals.push(Math.abs(sumNeg));yPositions.push(sumNeg)}
    }
    let visMetaIdx=0;
    for(let di=0;di<datasets.length;di++){if(!chart.getDatasetMeta(di).hidden){visMetaIdx=di;break}}
    const chartW=area.right-area.left;
    const baseFontSize=Math.max(8,Math.min(10,chartW/(nLabels*7)));
    const fontSize=opts.fontSize||baseFontSize;
    const isLight=document.documentElement.getAttribute('data-theme')==='light';
    const arrowColor=opts.color||(isLight?'rgba(15,23,42,.15)':'rgba(148,163,184,.25)');
    const textColor=opts.textColor||(isLight?'rgba(15,23,42,.5)':'rgba(226,232,240,.6)');
    ctx.save();
    for(let i=0;i<nLabels-1;i++){
      const prev=totals[i],cur=totals[i+1];
      if(!prev)continue;
      const pct=((cur-prev)/Math.abs(prev))*100;
      const pctStr=(pct>=0?'+':'')+((Math.abs(pct)>=5)?Math.round(pct):pct.toFixed(1))+'%';
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
      ctx.lineWidth=0.8;
      ctx.setLineDash([2,3]);
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const angle=Math.atan2(y2-y1,x2-x1);
      const headLen=4;
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle-0.4),y2-headLen*Math.sin(angle-0.4));
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle+0.4),y2-headLen*Math.sin(angle+0.4));
      ctx.strokeStyle=arrowColor;ctx.lineWidth=1;ctx.stroke();
      ctx.font=`400 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      const tw=ctx.measureText(pctStr).width;
      const pad=2;
      const bgColor=pct>=0?(isLight?'rgba(5,150,105,.06)':'rgba(16,185,129,.12)'):(isLight?'rgba(220,38,38,.06)':'rgba(239,68,68,.12)');
      const labelColor=pct>=0?(isLight?'rgba(5,150,105,.7)':'rgba(16,185,129,.7)'):(isLight?'rgba(220,38,38,.7)':'rgba(239,68,68,.7)');
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
if(typeof Chart!=='undefined')Chart.register(yoyArrowsPlugin);

// Removed: crispPatternPlugin (no longer needed without crisp scheme)
export function drawCrispPattern(){}
export const crispPatternPlugin={id:'crispPatternsLegacy'};

// ── Window globals for non-module code ──
window.getChartColors=getChartColors;
window.getChartFills=getChartFills;
window.hexToRgba=hexToRgba;
window.getSparkColor=getSparkColor;
window.getStatValueColor=getStatValueColor;
window.fmtShort=fmtShort;
window.fmtShort1=fmtShort1;
window.setChartColorScheme=setChartColorScheme;
window.stackedBarDatalabels=stackedBarDatalabels;
window.getCrispDatalabelColor=getCrispDatalabelColor;
window.FTE_TOOLTIP=FTE_TOOLTIP;
