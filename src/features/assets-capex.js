// ── assets-capex.js — ES module extracted from index.html lines 14081–14271 ──
import { state, saveState } from '../lib/state.js';

/* ── globals accessed via window (not yet modularised) ── */
const showUndoToast    = (...a) => window.showUndoToast(...a);
const exportGridToExcel = (...a) => window.exportGridToExcel(...a);
const importGridFromExcel = (...a) => window.importGridFromExcel(...a);
// Shared helpers defined in depreciation.js, exposed via window
const buildDimCells = (...a) => window.buildDimCells(...a);
const fmtScaled = (...a) => window.fmtScaled(...a);
const escHtml = (s) => window.escHtml ? window.escHtml(s) : String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── ASSETS & CAPEX MODULE ──
// ══════════════════════════════════════════════════════════════════
let assetScale=1;
let assetExpandedYears=new Set();
const ASSET_YEARS=['2026','2027','2028','2029','2030'];
const ASSET_MO_KEYS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function getAssetYearTotal(row,yr){
  const md=row.monthlyDetail&&row.monthlyDetail[yr];
  if(md)return ASSET_MO_KEYS.reduce((s,m)=>s+(parseFloat(md[m])||0),0);
  return parseFloat(row['y'+yr])||0;
}
function getAssetFullLifeTotal(row){
  return ASSET_YEARS.reduce((s,yr)=>s+getAssetYearTotal(row,yr),0);
}

function buildAssetRow(row,i){
  let h='<tr data-ai="'+i+'">';
  h+='<td style="width:30px;cursor:grab">&#9776;</td>';
  h+='<td style="width:30px"><span class="color-dot" style="background:'+(row._colorTag||'transparent')+';width:12px;height:12px;display:inline-block;border-radius:50%;cursor:pointer;border:1px solid var(--border)" data-ai="'+i+'"></span></td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="name" value="'+escHtml(row.name||'')+'" style="width:140px" placeholder="Asset name"></td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="vendorSource" value="'+escHtml(row.vendorSource||'')+'" style="width:120px" placeholder="Vendor"></td>';
  h+='<td><select class="asset-field" data-ai="'+i+'" data-f="assetType" style="width:100px"><option value="">—</option><option'+(row.assetType==='Hardware'?' selected':'')+'>Hardware</option><option'+(row.assetType==='Software'?' selected':'')+'>Software</option><option'+(row.assetType==='Leasehold'?' selected':'')+'>Leasehold</option><option'+(row.assetType==='Furniture'?' selected':'')+'>Furniture</option><option'+(row.assetType==='Vehicles'?' selected':'')+'>Vehicles</option><option'+(row.assetType==='Other'?' selected':'')+'>Other</option></select></td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="acquireDate" type="date" value="'+(row.acquireDate||'')+'" style="width:90px"></td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="usefulLifeYrs" type="number" value="'+(row.usefulLifeYrs||5)+'" min="1" max="50" style="width:60px;text-align:center"></td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="totalCost" type="number" value="'+(row.totalCost||0)+'" style="width:90px;text-align:right"></td>';
  const accDepr=parseFloat(row.accDepr)||0;
  const nbv=(parseFloat(row.totalCost)||0)-accDepr;
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="accDepr" type="number" value="'+accDepr+'" style="width:100px;text-align:right" placeholder="0"></td>';
  h+='<td class="num" style="text-align:right;font-weight:600;color:'+(nbv<0?'var(--danger)':'inherit')+'">'+fmtScaled(nbv,assetScale)+'</td>';
  h+='<td><input class="asset-field" data-ai="'+i+'" data-f="notes" value="'+escHtml(row.notes||'')+'" style="width:90px" placeholder="Notes"></td>';
  h+=buildDimCells('asset-field',i,row);
  // Year columns
  ASSET_YEARS.forEach(yr=>{
    const yt=getAssetYearTotal(row,yr);
    if(assetExpandedYears.has(yr)){
      ASSET_MO_KEYS.forEach(m=>{
        const md=row.monthlyDetail&&row.monthlyDetail[yr]?row.monthlyDetail[yr]:{};
        const v=parseFloat(md[m])||0;
        h+='<td class="asset-mo-sub"><input class="asset-mo" data-ai="'+i+'" data-yr="'+yr+'" data-m="'+m+'" value="'+fmtScaled(v,assetScale)+'" style="width:70px;text-align:right;font-size:.72rem"></td>';
      });
    } else {
      h+='<td class="num" style="text-align:center">'+fmtScaled(yt,assetScale)+'</td>';
    }
  });
  h+='<td class="num" style="font-weight:700">'+fmtScaled(getAssetFullLifeTotal(row),assetScale)+'</td>';
  h+='<td><button class="asset-del" data-ai="'+i+'" style="color:var(--danger);cursor:pointer;border:none;background:none;font-size:1rem">&times;</button></td>';
  h+='</tr>';
  return h;
}

function renderAssetGrid(){
  const tbody=document.getElementById('assetTbody');
  const totalRow=document.getElementById('assetTotalRow');
  const thead=document.getElementById('assetThead');
  if(!tbody)return;
  // Rebuild thead for expanded years
  let th='<tr><th style="width:30px"></th><th style="width:30px">&#9679;</th>';
  th+='<th style="min-width:150px">Asset Name</th><th style="min-width:130px">Vendor/Source</th>';
  th+='<th style="min-width:110px">Asset Type</th><th style="min-width:100px">Acquisition Date</th>';
  th+='<th style="min-width:80px">Life (Yrs)</th><th style="min-width:100px">Total Cost</th>';
  th+='<th style="min-width:110px">Acc. Depr</th><th style="min-width:100px">NBV</th>';
  th+='<th style="min-width:100px">Notes</th><th style="min-width:100px">BU</th><th style="min-width:100px">Bus. Line</th>';
  th+='<th style="min-width:80px">Market</th><th style="min-width:80px">Project</th><th style="min-width:120px">Account</th><th style="min-width:80px">Code</th>';
  let hasExpanded=false;
  ASSET_YEARS.forEach(yr=>{
    if(assetExpandedYears.has(yr)){
      hasExpanded=true;
      th+='<th class="v-hdr asset-yr-hdr expanded" data-yr="'+yr+'" style="cursor:pointer;min-width:70px;text-align:center;background:var(--accent);color:#fff;font-size:.72rem" title="Click to collapse months" colspan="12">'+yr+' &#9660;</th>';
    } else {
      th+='<th class="v-hdr asset-yr-hdr" data-yr="'+yr+'" style="cursor:pointer;min-width:90px" title="Click to expand months">'+yr+' &#9654;</th>';
    }
  });
  th+='<th style="font-weight:700;min-width:100px">Full Life Total</th><th style="width:40px"></th></tr>';
  // Add month sub-header row if any year is expanded
  if(hasExpanded){
    th+='<tr>';
    th+='<th colspan="17" style="border:none"></th>';
    ASSET_YEARS.forEach(yr=>{
      if(assetExpandedYears.has(yr)){
        const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        ms.forEach(m=>{th+='<th class="asset-mo-sub" style="font-size:.68rem;min-width:70px;text-align:center">'+m+'</th>'});
      } else {
        th+='<th style="border:none"></th>';
      }
    });
    th+='<th style="border:none" colspan="2"></th></tr>';
  }
  thead.innerHTML=th;
  // Bind year header clicks
  thead.querySelectorAll('.asset-yr-hdr').forEach(el=>{
    el.addEventListener('click',function(){
      const yr=this.dataset.yr;
      if(assetExpandedYears.has(yr))assetExpandedYears.delete(yr);
      else assetExpandedYears.add(yr);
      renderAssetGrid();
    });
  });
  // Render rows
  let h='';
  (state.assetRows||[]).forEach((row,i)=>{h+=buildAssetRow(row,i)});
  tbody.innerHTML=h;
  // Footer totals
  const totalAccDepr=(state.assetRows||[]).reduce((s,r)=>s+(parseFloat(r.accDepr)||0),0);
  const totalCostAll=(state.assetRows||[]).reduce((s,r)=>s+(parseFloat(r.totalCost)||0),0);
  const totalNbv=totalCostAll-totalAccDepr;
  let ft='<tr style="font-weight:700;background:var(--panel-inset)"><td colspan="2"></td><td>TOTAL</td><td colspan="4"></td><td class="num">'+fmtScaled(totalCostAll,assetScale)+'</td><td class="num">'+fmtScaled(totalAccDepr,assetScale)+'</td><td class="num" style="color:'+(totalNbv<0?'var(--danger)':'inherit')+'">'+fmtScaled(totalNbv,assetScale)+'</td><td colspan="6"></td>';
  ASSET_YEARS.forEach(yr=>{
    if(assetExpandedYears.has(yr)){
      ASSET_MO_KEYS.forEach(m=>{
        const t=(state.assetRows||[]).reduce((s,r)=>{
          const md=r.monthlyDetail&&r.monthlyDetail[yr]?r.monthlyDetail[yr]:{};
          return s+(parseFloat(md[m])||0);
        },0);
        ft+='<td class="num asset-mo-sub">'+fmtScaled(t,assetScale)+'</td>';
      });
    } else {
      const t=(state.assetRows||[]).reduce((s,r)=>s+getAssetYearTotal(r,yr),0);
      ft+='<td class="num">'+fmtScaled(t,assetScale)+'</td>';
    }
  });
  const fullTotal=(state.assetRows||[]).reduce((s,r)=>s+getAssetFullLifeTotal(r),0);
  ft+='<td class="num">'+fmtScaled(fullTotal,assetScale)+'</td><td></td></tr>';
  totalRow.innerHTML=ft;
  // Bind events
  tbody.querySelectorAll('.asset-field').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.ai;const f=this.dataset.f;const row=state.assetRows[i];if(!row)return;
      row[f]=f==='usefulLifeYrs'||f==='totalCost'||f==='accDepr'?(parseFloat(this.value)||0):this.value;
      saveState();renderAssetGrid();
    });
  });
  tbody.querySelectorAll('.asset-mo').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.ai;const yr=this.dataset.yr;const m=this.dataset.m;
      const row=state.assetRows[i];if(!row)return;
      if(!row.monthlyDetail)row.monthlyDetail={};
      if(!row.monthlyDetail[yr])row.monthlyDetail[yr]={jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
      let v=parseFloat(this.value.replace(/[,$]/g,''))||0;
      if(assetScale>1)v=v*assetScale;
      row.monthlyDetail[yr][m]=v;
      saveState();renderAssetGrid();
    });
  });
  tbody.querySelectorAll('.asset-del').forEach(btn=>{
    btn.addEventListener('click',function(){
      const i=+this.dataset.ai;
      const item=state.assetRows[i];
      const label=(item&&item.name)||'asset row';
      state.assetRows.splice(i,1);saveState();renderAssetGrid();
      showUndoToast(label,state.assetRows,i,item,renderAssetGrid);
    });
  });
}

function addAssetRow(){
  state.assetRows.push({name:'',vendorSource:'',assetType:'',acquireDate:'',usefulLifeYrs:5,totalCost:0,accDepr:0,businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',monthlyDetail:{},_colorTag:''});
  saveState();renderAssetGrid();
}

function initAssetTab(){
  document.getElementById('assetAddRow').addEventListener('click',addAssetRow);
  document.getElementById('assetClearAllRows').addEventListener('click',function(){
    if(confirm('Clear all asset entries?')){state.assetRows=[];saveState();renderAssetGrid()}
  });
  document.getElementById('assetExpandAllYears').addEventListener('click',function(){
    ASSET_YEARS.forEach(yr=>assetExpandedYears.add(yr));renderAssetGrid();
  });
  document.getElementById('assetCollapseAllYears').addEventListener('click',function(){
    assetExpandedYears.clear();renderAssetGrid();
  });
  const qaToggle=document.getElementById('assetQaToggle');
  if(qaToggle)qaToggle.addEventListener('click',function(){this.closest('.qa-panel').classList.toggle('open')});
  // Scale toggle
  document.getElementById('assetScaleToggle').querySelectorAll('[data-ascale]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#assetScaleToggle .btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      assetScale=+this.dataset.ascale;
      renderAssetGrid();
    });
  });
  // Import/Export
  document.getElementById('assetExportBtn').addEventListener('click',function(){
    exportGridToExcel(state.assetRows,'Assets','assets_export.xlsx',['name','vendorSource','assetType','acquireDate','usefulLifeYrs','totalCost','accDepr','businessUnit','bizLine','market','project','acctDesc','notes']);
  });
  document.getElementById('assetImportBtn').addEventListener('click',function(){document.getElementById('assetFileInput').click()});
  document.getElementById('assetFileInput').addEventListener('change',function(e){importGridFromExcel(e,state.assetRows,'assetRows',renderAssetGrid)});
  renderAssetGrid();
}


/* ── window assignments for inline onclick handlers ── */
window.addAssetRow = addAssetRow;
window.initAssetTab = initAssetTab;

/* ── named exports ── */
export {
  buildAssetRow, renderAssetGrid, addAssetRow, initAssetTab
};
