// ── Chart utilities ──
import { fmt } from './constants.js';

export const CHART_COLORS=['#8b5e5e','#6b8da3','#a38b5e','#7a6b8d','#5e8b6b','#8d6b7a','#5e7a8b','#8b7a5e','#6b8b7a','#7a8b5e'];
export const CHART_COLORS_MUTED_DARK=['#c4a0a0','#a0b8c8','#c8b8a0','#b0a0c0','#a0c0a0','#c0a0b0','#a0b0c0','#c0b0a0','#a0c0b0','#b0c0a0'];
export const CHART_COLORS_NEON=['#ff2a6d','#00fff0','#ffe600','#00b4ff','#39ff14','#ff6b00','#e040fb','#00ddff','#ff4444','#c8ff00'];
export const CHART_COLORS_CRISP=['#222222','#888888','#bbbbbb','#555555','#999999','#333333','#aaaaaa','#666666','#cccccc','#444444'];
export const CHART_COLORS_CRISP_DARK=['#8a8a8a','#6a6a6a','#555555','#7a7a7a','#606060','#909090','#505050','#6e6e6e','#484848','#858585'];
// Unified tag/label color palette — draws from all schemes for consistency regardless of active color scheme
export const TAG_COLORS_LIGHT=['#1a1a1a','#8b5e5e','#6b8da3','#3a7d44','#7a6b8d','#a38b5e','#2a3a6a','#b83030','#5e8b6b','#8d6b7a','#555555','#0088aa'];
export const TAG_COLORS_DARK=['#ffffff','#c4a0a0','#a0b8c8','#5ab866','#b0a0c0','#c8b8a0','#7a8aff','#e06060','#a0c0a0','#c0a0b0','#999999','#00b4cc'];
export let chartColorScheme='crisp';
export function setChartColorScheme(val){chartColorScheme=val}

// Crisp pattern helpers — clean digital lines and simple dots
export function drawCrispPattern(ctx,px,py,pw,ph,patIdx,fg){
  ctx.save();ctx.beginPath();ctx.rect(px,py,pw,ph);ctx.clip();
  ctx.strokeStyle=fg;ctx.fillStyle=fg;ctx.lineWidth=0.8;
  const pt=patIdx%6;
  if(pt===0){/* thin horizontal lines */for(let y2=py+4;y2<py+ph;y2+=8){ctx.beginPath();ctx.moveTo(px,y2);ctx.lineTo(px+pw,y2);ctx.stroke()}}
  else if(pt===1){/* small dots grid */for(let y2=py+5;y2<py+ph;y2+=8)for(let x2=px+5;x2<px+pw;x2+=8){ctx.beginPath();ctx.arc(x2,y2,0.9,0,Math.PI*2);ctx.fill()}}
  else if(pt===2){/* thin vertical lines */for(let x2=px+4;x2<px+pw;x2+=8){ctx.beginPath();ctx.moveTo(x2,py);ctx.lineTo(x2,py+ph);ctx.stroke()}}
  else if(pt===3){/* diagonal lines — single direction, widely spaced */for(let i=-ph;i<pw+ph;i+=10){ctx.beginPath();ctx.moveTo(px+i,py+ph);ctx.lineTo(px+i+ph,py);ctx.stroke()}}
  else if(pt===4){/* sparse dots */for(let y2=py+6;y2<py+ph;y2+=10)for(let x2=px+6;x2<px+pw;x2+=10){ctx.beginPath();ctx.arc(x2,y2,0.7,0,Math.PI*2);ctx.fill()}}
  else{/* dashed horizontal */ctx.setLineDash([3,4]);for(let y2=py+4;y2<py+ph;y2+=8){ctx.beginPath();ctx.moveTo(px,y2);ctx.lineTo(px+pw,y2);ctx.stroke()}ctx.setLineDash([])}
  ctx.restore();
}

export const crispPatternPlugin={
  id:'crispPatterns',
  _patternMode(chart){
    if(chartColorScheme!=='crisp')return null;
    let barCount=0,filledLineCount=0;
    chart.data.datasets.forEach((ds,i)=>{const m=chart.getDatasetMeta(i);if(m.hidden)return;if(m.type!=='line')barCount++;else if(ds.fill!=null&&ds.fill!==false)filledLineCount++});
    if(barCount>3)return 'bar';
    if(filledLineCount>1)return 'area';
    return null;
  },
  afterDatasetsDraw(chart){
    const mode=this._patternMode(chart);
    if(!mode)return;
    const isDark=document.documentElement.classList.contains('dark');
    const ctx=chart.ctx;
    if(mode==='bar'){
      const fg=isDark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.12)';
      chart.data.datasets.forEach((ds,dsi)=>{
        const meta=chart.getDatasetMeta(dsi);
        if(meta.hidden||meta.type==='line')return;
        meta.data.forEach(el=>{
          const{x,y,width,height,base}=el.getProps(['x','y','width','height','base']);
          if(width===undefined||base===undefined)return;
          const bY=Math.min(y,base),bH=Math.abs(base-y),bW=width;
          if(bH<2||bW<2)return;
          drawCrispPattern(ctx,x-bW/2,bY,bW,bH,dsi,fg);
        });
      });
    } else if(mode==='area'){
      const fg=isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.07)';
      const yScale=chart.scales.y;
      const baseline=yScale?yScale.getPixelForValue(0):chart.chartArea.bottom;
      let prevPoints=null;
      chart.data.datasets.forEach((ds,dsi)=>{
        const meta=chart.getDatasetMeta(dsi);
        if(meta.hidden||meta.type!=='line'||ds.fill==null||ds.fill===false){return}
        const points=meta.data.map(pt=>({x:pt.x,y:pt.y}));
        if(!points.length){prevPoints=points;return}
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x,points[0].y);
        for(let j=1;j<points.length;j++)ctx.lineTo(points[j].x,points[j].y);
        if(prevPoints&&prevPoints.length===points.length){
          for(let j=points.length-1;j>=0;j--)ctx.lineTo(prevPoints[j].x,prevPoints[j].y);
        } else {
          ctx.lineTo(points[points.length-1].x,baseline);
          ctx.lineTo(points[0].x,baseline);
        }
        ctx.closePath();
        ctx.clip();
        const xs=points.map(p=>p.x);
        const allY=points.map(p=>p.y).concat(prevPoints?prevPoints.map(p=>p.y):[baseline]);
        const minX=Math.min(...xs),maxX=Math.max(...xs);
        const minY=Math.min(...allY),maxY=Math.max(...allY);
        if(maxX-minX>2&&maxY-minY>2)drawCrispPattern(ctx,minX,minY,maxX-minX,maxY-minY,dsi,fg);
        ctx.restore();
        prevPoints=points;
      });
    }
  },
  afterDraw(chart){
    const mode=this._patternMode(chart);
    if(!mode)return;
    const isDark=document.documentElement.classList.contains('dark');
    const fg=isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)';
    const legend=chart.legend;
    if(!legend||!legend.legendItems)return;
    const ctx=chart.ctx;
    const chartArea=chart.chartArea;
    legend.legendItems.forEach((item,i)=>{
      if(item.hidden)return;
      const dsi=item.datasetIndex!=null?item.datasetIndex:i;
      const meta=chart.getDatasetMeta(dsi);
      if(mode==='bar'&&meta.type==='line')return;
      if(mode==='area'&&meta.type!=='line')return;
      const bw=legend.options.labels.boxWidth||40;
      const bh=legend.options.labels.boxHeight||Math.min((item.height||12),12);
      const bx=item.left;
      const by=item.top;
      if(bx==null||by==null)return;
      if(bx<0||by<0||bx>chart.width||by>chart.height)return;
      if(bw>0&&bh>0)drawCrispPattern(ctx,bx,by,bw,bh,dsi,fg);
    });
  }
};

// Soft-bar plugin: apply gentle opacity to all bar dataset backgrounds
export const softBarPlugin={id:'softBar',beforeUpdate(chart){
  if(chart.config.type!=='bar')return;
  const isNeon=(typeof chartColorScheme!=='undefined'&&chartColorScheme==='neon');
  const isCrisp=(typeof chartColorScheme!=='undefined'&&chartColorScheme==='crisp');
  const alpha=isCrisp?0.82:isNeon?0.55:0.72;
  chart.data.datasets.forEach(ds=>{
    if(ds._softBarApplied)return;
    const bg=ds.backgroundColor;
    if(typeof bg==='string'&&bg.charAt(0)==='#'){
      ds.backgroundColor=hexToRgba(bg,alpha);
      ds.borderColor=isCrisp?(document.documentElement.classList.contains('dark')?'#555':'#ccc'):bg;
      ds.borderWidth=isCrisp?1:(ds.borderWidth||1);
    } else if(typeof bg==='string'&&bg.startsWith('rgba')){
      // Already rgba — reduce further if needed
      const m=bg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if(m){const curA=parseFloat(m[4]);if(curA>alpha)ds.backgroundColor=`rgba(${m[1]},${m[2]},${m[3]},${Math.round(curA*alpha*100)/100})`}
    }
    ds._softBarApplied=true;
  });
}};

// Register plugins if Chart.js is available
if(typeof Chart!=='undefined')Chart.register(crispPatternPlugin);
if(typeof Chart!=='undefined')Chart.register(softBarPlugin);
// Global tooltip defaults: show all datasets on hover, format currency
if(typeof Chart!=='undefined'){
  Chart.defaults.plugins.tooltip.mode='index';
  Chart.defaults.plugins.tooltip.intersect=false;
  Chart.defaults.plugins.tooltip.callbacks.label=function(ctx){
    const label=ctx.dataset.label||'';
    const val=ctx.parsed.y;
    if(typeof val!=='number')return label+': '+val;
    const fmtVal=Math.abs(val)>=1e5?'$'+(val/1e6).toFixed(2)+'M':Math.abs(val)>=1e3?'$'+(val/1e3).toFixed(0)+'K':'$'+val.toLocaleString();
    return label+': '+fmtVal;
  };
}

export function getChartColors(){
  const isDark=document.documentElement.classList.contains('dark');
  if(chartColorScheme==='neon')return CHART_COLORS_NEON;
  if(chartColorScheme==='crisp')return isDark?CHART_COLORS_CRISP_DARK:CHART_COLORS_CRISP;
  return isDark?CHART_COLORS_MUTED_DARK:CHART_COLORS;
}

export function getCrispDatalabelColor(section){
  if(chartColorScheme!=='crisp')return null;
  const dk=document.documentElement.classList.contains('dark');
  return dk?'#ffffff':'#111111';
}

export function getSparkColor(type){
  // type: 'primary' (HC, Comp, OpEx), 'danger' (CapEx)
  const isDark=document.documentElement.classList.contains('dark');
  if(chartColorScheme==='neon')return type==='danger'?'#ff2a6d':'#00fff0';
  if(chartColorScheme==='crisp')return isDark?'#a0a0a0':'#222222';
  // muted
  if(isDark)return type==='danger'?'#e0a8a8':'#a0c8b0';
  return type==='danger'?'#8b2020':'#3a7d44';
}

export function getStatValueColor(){
  const isDark=document.documentElement.classList.contains('dark');
  if(chartColorScheme==='neon')return isDark?'#00fff0':'#0088aa';
  if(chartColorScheme==='crisp')return isDark?'#c0c0c0':'#111111';
  return isDark?'#c8b0b0':'var(--accent)';
}

export function hexToRgba(hex,alpha){
  if(hex.startsWith('rgba'))return hex.replace(/,[\d.]+\)$/,','+alpha+')');
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${alpha})`
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

export function stackedBarDatalabels(datasets,tickColor,fontSize,crispSection){
  const isCrispDl=chartColorScheme==='crisp';
  const fs=fontSize||(isCrispDl?13:11);
  const dlColor=getCrispDatalabelColor(crispSection)||tickColor;
  // Show total label on topmost positive bar and bottommost negative bar per x-index
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
export const yoyArrowsPlugin={
  id:'yoyArrows',
  afterDraw(chart){
    if(!chart.options.plugins.yoyArrows)return;
    const opts=chart.options.plugins.yoyArrows;
    const ctx=chart.ctx;
    const area=chart.chartArea;
    const datasets=chart.data.datasets;
    const nLabels=chart.data.labels.length;
    if(nLabels<2)return;
    // Sum visible stacked values per x-index (respects legend toggle)
    const totals=[];
    const yPositions=[]; // actual values for y-positioning (may be negative)
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
        yPositions.push(sumNeg); // keep negative for correct y-positioning
      }
    }
    // Find first visible dataset for bar positions
    let visMetaIdx=0;
    for(let di=0;di<datasets.length;di++){if(!chart.getDatasetMeta(di).hidden){visMetaIdx=di;break}}
    // Responsive font: scale with chart width
    const chartW=area.right-area.left;
    const baseFontSize=Math.max(10,Math.min(14,chartW/(nLabels*5)));
    const fontSize=opts.fontSize||baseFontSize;
    const arrowColor=opts.color||(document.documentElement.classList.contains('dark')?'rgba(255,255,255,.45)':'rgba(0,0,0,.35)');
    const textColor=opts.textColor||(document.documentElement.classList.contains('dark')?'rgba(255,255,255,.7)':'rgba(0,0,0,.6)');
    ctx.save();
    for(let i=0;i<nLabels-1;i++){
      const prev=totals[i],cur=totals[i+1];
      if(!prev)continue;
      const pct=((cur-prev)/Math.abs(prev))*100;
      const pctStr=(pct>=0?'+':'')+pct.toFixed(1)+'%';
      // Get bar positions from first visible dataset meta
      const meta0=chart.getDatasetMeta(visMetaIdx);
      if(!meta0||!meta0.data[i]||!meta0.data[i+1])continue;
      const barL=meta0.data[i];
      const barR=meta0.data[i+1];
      // Y position: map value to pixel using y scale
      const yScale=chart.scales.y;
      const y1=yScale.getPixelForValue(yPositions[i]);
      const y2=yScale.getPixelForValue(yPositions[i+1]);
      const halfW=barL.width?barL.width/2:12;
      const x1=barL.x+halfW+2;
      const x2=barR.x-halfW-2;
      const midX=(x1+x2)/2;
      const midY=(y1+y2)/2;
      // Draw arrow line
      ctx.beginPath();
      ctx.strokeStyle=arrowColor;
      ctx.lineWidth=1.2;
      ctx.setLineDash([3,2]);
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      const angle=Math.atan2(y2-y1,x2-x1);
      const headLen=6;
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle-0.4),y2-headLen*Math.sin(angle-0.4));
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle+0.4),y2-headLen*Math.sin(angle+0.4));
      ctx.strokeStyle=arrowColor;ctx.lineWidth=1.5;ctx.stroke();
      // Label background + text
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

// Expose on window for cross-module references
window.chartColorScheme = chartColorScheme;
window.getChartColors = getChartColors;
window.getCrispDatalabelColor = getCrispDatalabelColor;
window.getSparkColor = getSparkColor;
window.getStatValueColor = getStatValueColor;
window.hexToRgba = hexToRgba;
window.stackedBarDatalabels = stackedBarDatalabels;
window.yoyArrowsPlugin = yoyArrowsPlugin;
window.FTE_TOOLTIP = FTE_TOOLTIP;
window.fmtShort = fmtShort;
window.TAG_COLORS_LIGHT = TAG_COLORS_LIGHT;
window.TAG_COLORS_DARK = TAG_COLORS_DARK;
window.setChartColorScheme = setChartColorScheme;
// Provide a callback registry for color scheme changes
window.colorSchemeCallbacks = window.colorSchemeCallbacks || [];
