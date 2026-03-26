// ── depreciation.js — ES module extracted from index.html lines 13704–14079 ──
import { state, saveState } from '../lib/state.js';
import { fmt } from '../lib/constants.js';

/* ── globals accessed via window (not yet modularised) ── */
const showUndoToast = (...a) => window.showUndoToast(...a);
function initDepScratch() { if(window.initDepScratch) window.initDepScratch(); }

// ── DEPRECIATION MODULE ──
// ══════════════════════════════════════════════════════════════════
let depModuleInited=false;
let depScale=1,depSelectedMonths=new Set();
const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
let depExpandedCategories=new Set();
let depSortCol='',depSortDir=1;
let depPivotChartInst=null;
let depBand='all',depNameFilter=new Set(),depNotesFilter='';

function getDepreciationTotal(){
  return (state.depreciationRows||[]).reduce((s,r)=>
    s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
}
function getDepreciationByMonth(mi){
  return (state.depreciationRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
}

function buildDepRow(row,i){
  const mos=moKeys;
  const acctCode=(state.accounts||[]).find(a=>a.description===row.acctDesc);
  const fy=mos.reduce((s,m)=>s+(parseFloat(row[m])||0),0);
  const isCatRow=row._isCategoryHeader;
  const rowClass=isCatRow?'dep-cat-row':'dep-entry-row'+(row._categoryId&&!depExpandedCategories.has(row._categoryId)?' hidden':'');
  let h='<tr class="'+rowClass+'" data-di="'+i+'">';
  h+='<td style="width:30px;cursor:grab">&#9776;</td>';
  h+='<td style="width:30px"><span class="color-dot" style="background:'+(row._colorTag||'transparent')+';width:12px;height:12px;display:inline-block;border-radius:50%;cursor:pointer;border:1px solid var(--border)" data-di="'+i+'"></span></td>';
  if(isCatRow){
    const arrow=depExpandedCategories.has(row._categoryId)?'&#9660;':'&#9654;';
    h+='<td colspan="13" style="font-weight:700;cursor:pointer" onclick="toggleDepCategory(\''+row._categoryId+'\')"><span style="font-size:.7rem;margin-right:4px">'+arrow+'</span>'+escHtml(row.name||'Unnamed Category')+'</td>';
    mos.forEach(m=>{
      const catTotal=(state.depreciationRows||[]).filter(r=>r._categoryId===row._categoryId&&!r._isCategoryHeader).reduce((s,r)=>s+(parseFloat(r[m])||0),0);
      h+='<td class="num" style="font-weight:700">'+fmtScaled(catTotal,depScale)+'</td>';
    });
    const catFy=(state.depreciationRows||[]).filter(r=>r._categoryId===row._categoryId&&!r._isCategoryHeader).reduce((s,r)=>s+mos.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    h+='<td class="num" style="font-weight:700">'+fmtScaled(catFy,depScale)+'</td>';
    h+='<td><button class="btn btn-sm" style="color:var(--danger);padding:2px 6px;font-size:.72rem" onclick="deleteDepCategory(\''+row._categoryId+'\')">&times;</button></td>';
  } else {
    h+='<td><input class="dep-field" data-di="'+i+'" data-f="name" value="'+escHtml(row.name||'')+'" style="width:140px;'+(row._categoryId?'padding-left:20px;':'')+'" placeholder="Entry name"></td>';
    h+='<td><input class="dep-field" data-di="'+i+'" data-f="assetSource" value="'+escHtml(row.assetSource||'')+'" style="width:120px" placeholder="Asset source"></td>';
    h+='<td><select class="dep-field" data-di="'+i+'" data-f="depMethod" style="width:100px"><option value="SL"'+(row.depMethod==='SL'?' selected':'')+'>Straight-Line</option><option value="SW36"'+(row.depMethod==='SW36'?' selected':'')+'>SW Dev 36mo</option><option value="SW48"'+(row.depMethod==='SW48'?' selected':'')+'>SW Dev 48mo</option><option value="SW60"'+(row.depMethod==='SW60'?' selected':'')+'>SW Dev 60mo</option></select></td>';
    h+='<td style="white-space:nowrap"><select class="dep-field" data-di="'+i+'" data-f="_startMonth" style="width:50px">'+buildMonthOptions(row._startMonth)+'</select> – <select class="dep-field" data-di="'+i+'" data-f="_endMonth" style="width:50px">'+buildMonthOptions(row._endMonth)+'</select></td>';
    h+='<td><input class="dep-field" data-di="'+i+'" data-f="notes" value="'+escHtml(row.notes||'')+'" style="width:90px" placeholder="Notes"></td>';
    h+='<td><input class="dep-amount" data-di="'+i+'" value="'+fmtScaled(parseFloat(row._amount)||0,depScale)+'" style="width:100px;text-align:right" placeholder="Total amount"></td>';
    // Impairment inline
    const imp=row._impairments||[];
    const impSum=imp.reduce((s,im)=>s+(parseFloat(im.amount)||0),0);
    h+='<td style="white-space:nowrap;font-size:.72rem">';
    if(imp.length){h+='<span style="color:var(--danger);font-weight:600" title="'+imp.map(im=>moKeys[im.month].toUpperCase()+': '+fmt(im.amount)).join(', ')+'">'+fmt(impSum)+'</span> <button class="dep-impair-clear btn btn-sm" data-di="'+i+'" style="padding:1px 5px;font-size:.62rem;color:var(--text-dim);border-color:var(--border)" title="Clear impairments">&times;</button> '}
    h+='<button class="dep-impair-btn btn btn-sm" data-di="'+i+'" style="padding:1px 6px;font-size:.68rem;color:var(--danger);border-color:var(--danger)">+Impair</button></td>';
    h+=buildDimCells('dep-field',i,row);
    mos.forEach(m=>{
      const v=parseFloat(row[m])||0;
      h+='<td class="num"><input class="dep-mo" data-di="'+i+'" data-m="'+m+'" value="'+fmtScaled(v,depScale)+'" style="width:80px;text-align:right"></td>';
    });
    h+='<td class="num" style="font-weight:700">'+fmtScaled(fy,depScale)+'</td>';
    h+='<td><button class="dep-del" data-di="'+i+'" style="color:var(--danger);cursor:pointer;border:none;background:none;font-size:1rem">&times;</button></td>';
  }
  h+='</tr>';
  return h;
}

function buildDimCells(cls,i,row){
  let h='';
  h+='<td><select class="'+cls+'" data-di="'+i+'" data-f="businessUnit" style="width:90px">'+buildBuOptions(row.businessUnit)+'</select></td>';
  h+='<td><select class="'+cls+'" data-di="'+i+'" data-f="bizLine" style="width:100px">'+buildBizLineOptions(row.bizLine)+'</select></td>';
  h+='<td><select class="'+cls+'" data-di="'+i+'" data-f="market" style="width:80px">'+buildMarketOptions(row.market)+'</select></td>';
  h+='<td><select class="'+cls+'" data-di="'+i+'" data-f="project" style="width:80px">'+buildProjectOptions(row.project)+'</select></td>';
  h+='<td><select class="'+cls+'" data-di="'+i+'" data-f="acctDesc" style="width:120px">'+buildAcctOptions(row.acctDesc)+'</select></td>';
  const ac=(state.accounts||[]).find(a=>a.description===row.acctDesc);
  h+='<td style="font-size:.72rem;color:var(--text-dim)">'+(ac?ac.code:'')+'</td>';
  return h;
}

function buildBuOptions(sel){
  const bus=[...new Set((state.employees||[]).map(e=>e.businessUnit).filter(Boolean))].sort();
  let h='<option value="">—</option>';
  bus.forEach(b=>{h+='<option'+(b===sel?' selected':'')+'>'+escHtml(b)+'</option>'});
  return h;
}
function buildBizLineOptions(sel){
  let h='<option value="">—</option>';
  (state.bizLines||[]).forEach(b=>{h+='<option value="'+escHtml(b.code)+'"'+(b.code===sel?' selected':'')+'>'+escHtml(b.name||b.code)+'</option>'});
  return h;
}
function buildMarketOptions(sel){
  let h='<option value="">—</option>';
  (state.markets||[]).forEach(m=>{h+='<option value="'+escHtml(m.code)+'"'+(m.code===sel?' selected':'')+'>'+escHtml(m.name||m.code)+'</option>'});
  return h;
}
function buildProjectOptions(sel){
  let h='<option value="">—</option>';
  (state.projects||[]).forEach(p=>{h+='<option value="'+escHtml(p.id)+'"'+(p.id===sel?' selected':'')+'>'+escHtml(p.product||p.code)+'</option>'});
  return h;
}
function buildAcctOptions(sel){
  let h='<option value="">—</option>';
  (state.accounts||[]).filter(a=>(a.group||'vendor')==='depreciation').forEach(a=>{h+='<option'+(a.description===sel?' selected':'')+'>'+escHtml(a.description)+'</option>'});
  return h;
}
function buildMonthOptions(sel){
  const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h='<option value="">—</option>';
  ms.forEach((m,i)=>{h+='<option value="'+i+'"'+(parseInt(sel)===i?' selected':'')+'>'+m+'</option>'});
  return h;
}
function fmtScaled(v,scale){
  if(!scale||scale===1)return fmt(v);
  const sv=v/scale;
  if(sv<0)return scale>=1000000?'-$'+Math.abs(sv).toFixed(2)+'M':'-$'+Math.abs(sv).toFixed(1)+'K';
  return scale>=1000000?'$'+sv.toFixed(2)+'M':'$'+sv.toFixed(1)+'K';
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function renderDepreciationGrid(){
  const tbody=document.getElementById('depTbody');
  const totalRow=document.getElementById('depTotalRow');
  if(!tbody)return;
  let h='';
  (state.depreciationRows||[]).forEach((row,i)=>{h+=buildDepRow(row,i)});
  tbody.innerHTML=h;
  // Footer totals
  let ft='<tr style="font-weight:700;background:var(--panel-inset)">';
  ft+='<td colspan="2"></td><td>TOTAL</td><td colspan="6"></td><td colspan="6"></td>';
  moKeys.forEach(m=>{
    const t=(state.depreciationRows||[]).filter(r=>!r._isCategoryHeader).reduce((s,r)=>s+(parseFloat(r[m])||0),0);
    ft+='<td class="num">'+fmtScaled(t,depScale)+'</td>';
  });
  const fy=(state.depreciationRows||[]).filter(r=>!r._isCategoryHeader).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  ft+='<td class="num">'+fmtScaled(fy,depScale)+'</td><td></td></tr>';
  totalRow.innerHTML=ft;
  // Bind events
  tbody.querySelectorAll('.dep-field').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.di;const f=this.dataset.f;const row=state.depreciationRows[i];if(!row)return;
      row[f]=this.value;
      if((f==='_startMonth'||f==='_endMonth'||f==='depMethod')&&row._amount)spreadDepAmount(row);
      saveState();renderDepreciationGrid();
    });
  });
  tbody.querySelectorAll('.dep-mo').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.di;const m=this.dataset.m;const row=state.depreciationRows[i];if(!row)return;
      let v=parseFloat(this.value.replace(/[,$]/g,''))||0;
      if(depScale>1)v=v*depScale;
      row[m]=v;saveState();renderDepreciationGrid();
    });
  });
  tbody.querySelectorAll('.dep-amount').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.di;const row=state.depreciationRows[i];if(!row)return;
      let v=parseFloat(this.value.replace(/[,$-]/g,''))||0;
      if(this.value.trim().charAt(0)==='-'||this.value.indexOf('-$')===0)v=-v;
      if(depScale>1)v=v*depScale;
      row._amount=v;spreadDepAmount(row);saveState();renderDepreciationGrid();
    });
  });
  tbody.querySelectorAll('.dep-impair-btn').forEach(btn=>{
    btn.addEventListener('click',function(){
      const i=+this.dataset.di;const row=state.depreciationRows[i];if(!row)return;
      const moLabel=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const moStr=prompt('Impairment month (Jan-Dec):');
      if(!moStr)return;
      const mi=moLabel.findIndex(m=>m.toLowerCase()===moStr.trim().toLowerCase().slice(0,3));
      if(mi<0){alert('Invalid month');return}
      const amtStr=prompt('Impairment amount ($):');
      if(!amtStr)return;
      const amt=parseFloat(amtStr.replace(/[,$]/g,''))||0;
      if(amt===0)return;
      if(!row._impairments)row._impairments=[];
      row._impairments.push({month:mi,amount:amt});
      spreadDepAmount(row);saveState();renderDepreciationGrid();
    });
  });
  tbody.querySelectorAll('.dep-impair-clear').forEach(btn=>{
    btn.addEventListener('click',function(){
      const i=+this.dataset.di;const row=state.depreciationRows[i];if(!row)return;
      if(!confirm('Clear all impairments for this entry?'))return;
      row._impairments=[];
      spreadDepAmount(row);saveState();renderDepreciationGrid();
    });
  });
  tbody.querySelectorAll('.dep-del').forEach(btn=>{
    btn.addEventListener('click',function(){
      const i=+this.dataset.di;
      const item=state.depreciationRows[i];
      const label=(item&&item.name)||'depreciation entry';
      state.depreciationRows.splice(i,1);saveState();renderDepreciationGrid();
      showUndoToast(label,state.depreciationRows,i,item,renderDepreciationGrid);
    });
  });
}

function toggleDepCategory(catId){
  if(depExpandedCategories.has(catId))depExpandedCategories.delete(catId);
  else depExpandedCategories.add(catId);
  renderDepreciationGrid();
}
function deleteDepCategory(catId){
  state.depreciationRows=state.depreciationRows.filter(r=>r._categoryId!==catId);
  saveState();renderDepreciationGrid();
}
function spreadDepAmount(row){
  const amt=parseFloat(row._amount)||0;
  const s=row._startMonth!==''?parseInt(row._startMonth):0;
  const e=row._endMonth!==''?parseInt(row._endMonth):11;
  const start=Math.min(s,e);const end=Math.max(s,e);
  const span=end-start+1;
  const method=row.depMethod||'SL';
  moKeys.forEach((m,mi)=>{row[m]=0});
  if(amt===0&&!(row._impairments||[]).length)return;
  // Determine monthly depreciation rate
  let monthlyRate;
  if(method==='SW36')monthlyRate=amt/36;
  else if(method==='SW48')monthlyRate=amt/48;
  else if(method==='SW60')monthlyRate=amt/60;
  else monthlyRate=span>0?amt/span:0; // SL: spread over start-end range
  // Apply monthly rate across active months
  for(let mi=start;mi<=end;mi++){
    row[moKeys[mi]]=Math.round(monthlyRate*100)/100;
  }
  // Adjust rounding on last active month for SL
  if(method==='SL'&&amt!==0){
    const allocated=moKeys.reduce((sm,m)=>sm+(row[m]||0),0);
    row[moKeys[end]]+=(amt-allocated);
    row[moKeys[end]]=Math.round(row[moKeys[end]]*100)/100;
  }
  // Apply impairments
  (row._impairments||[]).forEach(function(imp){
    const mi=parseInt(imp.month);
    if(mi>=0&&mi<=11)row[moKeys[mi]]+=(parseFloat(imp.amount)||0);
  });
}
function addDepCategory(){
  const name=prompt('Category name:');
  if(!name)return;
  const catId='depcat_'+Date.now();
  state.depreciationRows.push({_isCategoryHeader:true,_categoryId:catId,name:name});
  depExpandedCategories.add(catId);
  saveState();renderDepreciationGrid();
}
function addDepRow(){
  const cats=state.depreciationRows.filter(r=>r._isCategoryHeader);
  let catId='';
  if(cats.length){
    const catName=prompt('Enter category name to add to (or leave blank for uncategorized):\n'+cats.map(c=>c.name).join(', '));
    const found=cats.find(c=>c.name.toLowerCase()===(catName||'').toLowerCase());
    if(found)catId=found._categoryId;
  }
  state.depreciationRows.push({name:'',assetSource:'',depMethod:'SL',_startMonth:'',_endMonth:'',_amount:0,_impairments:[],businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',_categoryId:catId,jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,_colorTag:''});
  if(catId)depExpandedCategories.add(catId);
  saveState();renderDepreciationGrid();
}

function initDepModule(){
  if(depModuleInited)return;
  // Tab switching
  document.getElementById('depNav').querySelectorAll('[data-dtab]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#depNav .btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.dtab-content').forEach(c=>c.style.display='none');
      const t=document.getElementById('dtab-'+this.dataset.dtab);
      if(t)t.style.display='block';
      if(this.dataset.dtab==='dep-scratch')setTimeout(initDepScratch,50);
    });
  });
  // Scale toggle
  document.getElementById('depScaleToggle').querySelectorAll('[data-dscale]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#depScaleToggle .btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      depScale=+this.dataset.dscale;
      renderDepreciationGrid();
    });
  });
  // Add buttons
  document.getElementById('depAddCategory').addEventListener('click',addDepCategory);
  document.getElementById('depAddRow').addEventListener('click',addDepRow);
  document.getElementById('depClearAllRows').addEventListener('click',function(){
    if(confirm('Clear all depreciation entries?')){state.depreciationRows=[];saveState();renderDepreciationGrid()}
  });
  // QA panel toggle
  const qaToggle=document.getElementById('depQaToggle');
  if(qaToggle)qaToggle.addEventListener('click',function(){this.closest('.qa-panel').classList.toggle('open')});
  // Month range bar
  initMonthRangeBar('depMonthRangeBar','depMonthRangeLabel',depSelectedMonths,function(){renderDepreciationGrid()});
  // Import/Export
  document.getElementById('depExportBtn').addEventListener('click',function(){exportGridToExcel(state.depreciationRows,'Depreciation','depreciation_export.xlsx',['name','assetSource','depMethod','businessUnit','bizLine','market','project','acctDesc','notes','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])});
  document.getElementById('depImportBtn').addEventListener('click',function(){document.getElementById('depFileInput').click()});
  document.getElementById('depFileInput').addEventListener('change',function(e){importGridFromExcel(e,state.depreciationRows,'depreciationRows',renderDepreciationGrid)});
  // ── Dep QA panel functionality ──
  function renderDepQaList(){
    const list=document.getElementById('depQaList');
    const mo=document.getElementById('depQaMo').value;
    const step=parseFloat(document.getElementById('depQaStep').value)||5000;
    const search=(document.getElementById('depQaSearch').value||'').toLowerCase();
    if(!list)return;
    let h='';
    (state.depreciationRows||[]).forEach(function(row,i){
      if(row._isCategoryHeader)return;
      const name=row.name||'Entry '+(i+1);
      if(search&&name.toLowerCase().indexOf(search)<0)return;
      let val;
      if(mo==='all'){val=moKeys.reduce(function(s,m){return s+(parseFloat(row[m])||0)},0)}
      else{val=parseFloat(row[mo])||0}
      h+='<div class="qa-row">';
      h+='<span class="qa-row-name" title="'+escHtml(name)+'">'+escHtml(name.length>22?name.slice(0,20)+'…':name)+'</span>';
      h+='<span class="qa-row-amt">'+fmt(val)+'</span>';
      h+='<span class="qa-row-btns">';
      h+='<button class="qa-minus" data-qi="'+i+'">−</button>';
      h+='<button class="qa-plus" data-qi="'+i+'">+</button>';
      h+='</span></div>';
    });
    list.innerHTML=h;
    // Bind +/- buttons
    list.querySelectorAll('.qa-minus,.qa-plus').forEach(function(btn){
      btn.addEventListener('click',function(){
        const i=+this.dataset.qi;const row=state.depreciationRows[i];if(!row)return;
        const dir=this.classList.contains('qa-plus')?1:-1;
        if(mo==='all'){moKeys.forEach(function(m){row[m]=(parseFloat(row[m])||0)+dir*step})}
        else{row[mo]=(parseFloat(row[mo])||0)+dir*step}
        saveState();renderDepQaList();updateDepQaTotal();renderDepreciationGrid();
      });
    });
  }
  function updateDepQaTotal(){
    const el=document.getElementById('depQaTotal');
    if(el)el.textContent=fmt(getDepreciationTotal());
  }
  function populateDepQaImpairEntries(){
    const sel=document.getElementById('depQaImpairEntry');
    if(!sel)return;
    sel.innerHTML='<option value="">— Select Entry —</option>';
    (state.depreciationRows||[]).forEach(function(row,i){
      if(row._isCategoryHeader)return;
      sel.innerHTML+='<option value="'+i+'">'+escHtml(row.name||'Entry '+(i+1))+'</option>';
    });
  }
  document.getElementById('depQaMo').addEventListener('change',function(){renderDepQaList();updateDepQaTotal()});
  document.getElementById('depQaStep').addEventListener('change',function(){renderDepQaList()});
  document.getElementById('depQaSearch').addEventListener('input',function(){renderDepQaList()});
  // Add entry from QA
  document.getElementById('depQaAddBtn').addEventListener('click',function(){
    const name=document.getElementById('depQaNewName').value.trim();
    if(!name){alert('Enter an entry name');return}
    const catSel=document.getElementById('depQaNewCat');
    const catId=catSel?catSel.value:'';
    const buSel=document.getElementById('depQaNewBU');
    const bu=buSel?buSel.value:'';
    state.depreciationRows.push({name:name,assetSource:'',depMethod:'SL',_startMonth:'',_endMonth:'',_amount:0,_impairments:[],businessUnit:bu,bizLine:'',market:'',project:'',acctDesc:'',notes:'',_categoryId:catId,jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,_colorTag:''});
    document.getElementById('depQaNewName').value='';
    saveState();renderDepQaList();updateDepQaTotal();populateDepQaImpairEntries();renderDepreciationGrid();
  });
  // Impairment from QA
  document.getElementById('depQaImpairBtn').addEventListener('click',function(){
    const entryIdx=document.getElementById('depQaImpairEntry').value;
    if(entryIdx===''){alert('Select a depreciation entry');return}
    const row=state.depreciationRows[+entryIdx];
    if(!row)return;
    const mi=parseInt(document.getElementById('depQaImpairMo').value);
    const amtStr=document.getElementById('depQaImpairAmt').value;
    const amt=parseFloat(amtStr.replace(/[,$]/g,''))||0;
    if(amt===0){alert('Enter an impairment amount');return}
    if(!row._impairments)row._impairments=[];
    row._impairments.push({month:mi,amount:amt});
    // Apply impairment directly to the month (one-time, not affecting run rate)
    row[moKeys[mi]]=(parseFloat(row[moKeys[mi]])||0)+amt;
    document.getElementById('depQaImpairAmt').value='';
    saveState();renderDepQaList();updateDepQaTotal();renderDepreciationGrid();
  });
  renderDepQaList();updateDepQaTotal();populateDepQaImpairEntries();
  renderDepreciationGrid();
  depModuleInited=true;
}


/* ── window assignments for inline onclick handlers ── */
window.toggleDepCategory = toggleDepCategory;
window.deleteDepCategory = deleteDepCategory;
window.addDepCategory = addDepCategory;
window.addDepRow = addDepRow;
window.initDepModule = initDepModule;
window.getDepreciationTotal = getDepreciationTotal;
window.getDepreciationByMonth = getDepreciationByMonth;

/* ── named exports ── */
export {
  getDepreciationTotal, getDepreciationByMonth,
  renderDepreciationGrid, initDepModule,
  spreadDepAmount
};
