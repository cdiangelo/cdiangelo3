// ── vendor.js — ES module extracted from index.html lines 11699–13702 ──
import { state, saveState } from '../lib/state.js';
import { fmt, esc, uid, VENDOR_TYPES, EXPENSE_TYPES, COUNTRY_BU } from '../lib/constants.js';
import { TAG_COLORS_DARK, TAG_COLORS_LIGHT } from '../lib/chart-utils.js';
import { attachSpreadsheetNav } from '../lib/spreadsheet-nav.js';

/* ── globals accessed via window (not yet modularised) ── */
const getChartColors         = (...a) => window.getChartColors(...a);
const xlsxDownload           = (...a) => window.xlsxDownload(...a);
const readExcelFile          = (...a) => window.readExcelFile(...a);
const showUndoToast          = (...a) => window.showUndoToast(...a);
const createSpendMonthRangeBar = (...a) => window.createSpendMonthRangeBar(...a);
const renderPnlWalk          = (...a) => window.renderPnlWalk(...a);
const renderLandingCharts    = (...a) => window.renderLandingCharts(...a);
function initVendorScratch() { if(window.initVendorScratch) window.initVendorScratch(); }
function refreshProjectDropdown() { if(window.refreshProjectDropdown) window.refreshProjectDropdown(); }

/* ── CDN globals (loaded externally, accessed via window) ── */
const XLSX = window.XLSX;
const Chart = window.Chart;

// ── VENDOR MODULE ──
let vendorModuleInited=false;
function initVendorModule(){
  // Tab switching
  document.querySelectorAll('#vendorNav button').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#vendorNav button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.vtab-content').forEach(t=>t.style.display='none');
      document.getElementById('vtab-'+b.dataset.vtab).style.display='block';
      if(b.dataset.vtab==='vendor-scratch')setTimeout(initVendorScratch,50);
      if(b.dataset.vtab==='vendor-dims')renderVendorDims();
      if(b.dataset.vtab==='vendor-te'){renderTeGrid();refreshTePivot()}
      if(b.dataset.vtab==='vendor-contractors'){renderContractorGrid();refreshContractorPivot()}
    });
  });

  // ── Vendor Type BU options ──
  const BU_OPTIONS=Object.values(COUNTRY_BU).filter((v,i,a)=>a.indexOf(v)===i);

  function acctDescToCode(desc){
    const a=state.accounts.find(x=>x.description===desc);
    return a?a.code:'';
  }

  function getBlankBg(){const dk=document.documentElement.classList.contains('dark');const cr=window.chartColorScheme==='crisp';if(dk)return cr?'background:#1e1e22;color:#555':'background:#2a2a2a;color:#666';return cr?'background:#ddd;color:#888':'background:#e8e8e8;color:#888'}
  let vendorAmtScale=1;
  function getScaleLabel(){return vendorAmtScale===1000?'K':vendorAmtScale===1000000?'M':'$'}
  function scaleVal(v){return vendorAmtScale===1?v:Math.round((v/vendorAmtScale)*100)/100}
  function unscaleVal(v){return v*vendorAmtScale}
  function fmtScaled(n){
    const v=scaleVal(n);
    if(vendorAmtScale===1)return fmt(n);
    return '$'+v.toLocaleString('en-US',{maximumFractionDigits:2})+(vendorAmtScale===1000?'K':'M');
  }

  function buildSpendRow(row,i,prefix,fields){
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const buOpts=BU_OPTIONS.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const vtOpts=VENDOR_TYPES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    const etOpts=EXPENSE_TYPES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    const mktOpts=state.markets.map(m=>`<option value="${esc(m.code)}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
    const blOpts=state.bizLines.map(b=>`<option value="${esc(b.code)}">${esc(b.code)} — ${esc(b.name)}</option>`).join('');
    const projOpts=state.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.code)}</option>`).join('');
    const acctGroup=fields==='vendor'?'vendor':'te';
    const acctOpts=state.accounts.filter(a=>(a.group||'vendor')===acctGroup).map(a=>`<option value="${esc(a.description)}">${esc(a.description)}</option>`).join('');
    const fy=MO.reduce((s,m)=>s+(parseFloat(row[m])||0),0);
    const BLANK_BG=getBlankBg();const blk=v=>!v?BLANK_BG:'';
    // Color tag: use whiteboard color suite for row tagging
    const tagColor=row._colorTag||'';
    const tagDefault=document.documentElement.classList.contains('dark')?'#2a2a2e':'#eee';
    const tagDotStyle=`width:16px;height:16px;border-radius:3px;cursor:pointer;display:inline-block;border:1px solid var(--border);background:${tagColor||tagDefault}`;
    let h=`<tr data-vi="${i}" draggable="false" style="${tagColor?'border-left:3px solid '+tagColor:''}"><td class="drag-handle" title="Drag to reorder">&#9776;</td><td style="color:var(--text-dim);font-size:.75rem;position:relative"><span class="row-color-tag" data-vi="${i}" data-prefix="${prefix}" style="${tagDotStyle}" title="Color tag"></span></td>`;
    // Custom first columns per type
    if(fields==='vendor'){
      h+=`<td style="${blk(row.parentCo)}"><input class="${prefix}-field" data-f="parentCo" value="${esc(row.parentCo)}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px"></td>`;
      h+=`<td style="${blk(row.vendorName)}"><input class="${prefix}-field" data-f="vendorName" value="${esc(row.vendorName)}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px"></td>`;
      h+=`<td style="${blk(row.vendorType)}"><select class="${prefix}-field" data-f="vendorType" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${vtOpts}</select></td>`;
      h+=`<td><input class="${prefix}-field" data-f="notes" value="${esc(row.notes||'')}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px" placeholder=""></td>`;
    } else {
      h+=`<td style="${blk(row.expenseType)}"><select class="${prefix}-field" data-f="expenseType" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${etOpts}</select></td>`;
      h+=`<td style="${blk(row.description)}"><input class="${prefix}-field" data-f="description" value="${esc(row.description)}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px"></td>`;
      h+=`<td><input class="${prefix}-field" data-f="notes" value="${esc(row.notes||'')}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px" placeholder=""></td>`;
    }
    h+=`<td style="${blk(row.businessUnit)}"><select class="${prefix}-field" data-f="businessUnit" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${buOpts}</select></td>`;
    h+=`<td style="${blk(row.bizLine)}"><select class="${prefix}-field" data-f="bizLine" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${blOpts}</select></td>`;
    h+=`<td style="${blk(row.market)}"><select class="${prefix}-field" data-f="market" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${mktOpts}</select></td>`;
    h+=`<td style="${blk(row.project)}"><select class="${prefix}-field" data-f="project" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${projOpts}</select></td>`;
    h+=`<td style="${blk(row.acctDesc)}"><select class="${prefix}-field ${prefix}-acctDesc" data-f="acctDesc" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${acctOpts}</select></td>`;
    h+=`<td class="${prefix}-acctCode" style="font-size:.78rem;color:var(--text-dim);text-align:center">${acctDescToCode(row.acctDesc)}</td>`;
    // Rate Increase column
    const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const riMo=typeof row._rateIncMonth==='number'?row._rateIncMonth:-1;
    const riPct=parseFloat(row._rateIncPct)||0;
    const riMoOpts='<option value="-1">—</option>'+MO_LABELS.map((l,mi)=>`<option value="${mi}">${l}</option>`).join('');
    h+=`<td style="vertical-align:top;white-space:nowrap"><div style="display:flex;flex-direction:column;gap:2px">`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">Mo</label><select class="${prefix}-field ${prefix}-ri-mo" data-f="_rateIncMonth" style="font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${riMoOpts}</select></div>`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">%</label><input class="${prefix}-field ${prefix}-ri-pct" data-f="_rateIncPct" type="number" value="${riPct||''}" step="any" style="width:55px;font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)"></div>`;
    h+=`<button class="btn btn-sm ${prefix}-apply-ri" data-vi="${i}" style="padding:2px 8px;font-size:.68rem;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);color:#6366f1;margin-top:2px">Apply increase</button>`;
    h+=`</div></td>`;
    MO.forEach(m=>{
      const raw=row[m]!==undefined&&row[m]!==''?row[m]:0;
      const displayed=scaleVal(parseFloat(raw)||0);
      h+=`<td><input class="${prefix}-field ${prefix}-mo" data-f="${m}" type="number" value="${displayed}" style="width:100%;min-width:80px;border:none;background:transparent;font-size:.82rem;padding:3px 6px;text-align:right" step="any"></td>`;
    });
    h+=`<td style="font-weight:700;text-align:right;font-size:.82rem;white-space:nowrap">${fmtScaled(fy)}</td>`;
    h+=`<td><button class="btn btn-sm btn-danger ${prefix}-del" data-vi="${i}" style="padding:2px 6px;font-size:.7rem">X</button></td></tr>`;
    return h;
  }

  function bindSpendRows(tbodyEl,tfootEl,dataArr,prefix,renderFn,monthFilter){
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    // Set selected values
    tbodyEl.querySelectorAll('tr').forEach(tr=>{
      const i=+tr.dataset.vi;
      const row=dataArr[i];
      tr.querySelectorAll(`select.${prefix}-field`).forEach(sel=>{
        const f=sel.dataset.f;
        if(row[f])sel.value=row[f];
      });
    });
    // Bind change/input
    tbodyEl.querySelectorAll(`.${prefix}-field`).forEach(el=>{
      const ev=el.tagName==='SELECT'?'change':'input';
      el.addEventListener(ev,()=>{
        const i=+el.closest('tr').dataset.vi;
        const f=el.dataset.f;
        if(el.classList.contains(`${prefix}-mo`)){
          dataArr[i][f]=unscaleVal(parseFloat(el.value)||0);
        } else if(f==='_rateIncMonth'){
          dataArr[i][f]=parseInt(el.value);
        } else if(f==='_rateIncPct'){
          dataArr[i][f]=parseFloat(el.value)||0;
        } else {
          dataArr[i][f]=el.value;
        }
        // Update blank highlighting
        const td=el.closest('td');
        if(el.tagName==='SELECT'||['parentCo','vendorName','description'].includes(f)){
          const blankHl=document.documentElement.classList.contains('dark')?(window.chartColorScheme==='crisp'?'#252529':'#2a2a2a'):(window.chartColorScheme==='crisp'?'#e0e0e0':'#fffde7');
          td.style.background=el.value?'':blankHl;
        }
        if(f==='project'){
          const proj=state.projects.find(p=>p.id===el.value);
          if(proj){
            if(proj.marketCode){dataArr[i].market=proj.marketCode;const mSel=el.closest('tr').querySelector(`select.${prefix}-field[data-f="market"]`);if(mSel)mSel.value=proj.marketCode}
            if(proj.bizLineCode){dataArr[i].bizLine=proj.bizLineCode;const bSel=el.closest('tr').querySelector(`select.${prefix}-field[data-f="bizLine"]`);if(bSel)bSel.value=proj.bizLineCode}
          }
        }
        if(f==='acctDesc'){
          el.closest('tr').querySelector(`.${prefix}-acctCode`).textContent=acctDescToCode(el.value);
        }
        if(el.classList.contains(`${prefix}-mo`)){
          const fy2=MO.reduce((s,m)=>s+(parseFloat(dataArr[i][m])||0),0);
          const cells=el.closest('tr').querySelectorAll('td');
          cells[cells.length-2].textContent=fmtScaled(fy2);
          // Recalc footer
          renderFooter(tfootEl,dataArr,fields2colSpan(prefix),monthFilter);
        }
        saveState();
      });
    });
    tbodyEl.querySelectorAll(`.${prefix}-del`).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=+btn.dataset.vi;
        const item=dataArr[idx];
        const label=(item&&(item.vendorName||item.category||item.name))||prefix+' row';
        dataArr.splice(idx,1);
        saveState();renderFn();
        showUndoToast(label,dataArr,idx,item,renderFn);
      });
    });
    // Apply rate increase
    tbodyEl.querySelectorAll(`.${prefix}-apply-ri`).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=+btn.dataset.vi;
        const row=dataArr[idx];if(!row)return;
        const riMo=typeof row._rateIncMonth==='number'?row._rateIncMonth:-1;
        const riPct=parseFloat(row._rateIncPct)||0;
        if(riMo<0||!riPct)return;
        MO.forEach((m,mi)=>{
          if(mi>=riMo){row[m]=Math.round((parseFloat(row[m])||0)*(1+riPct/100))}
        });
        saveState();renderFn();
      });
    });
    // Drag-to-reorder rows
    tbodyEl.querySelectorAll('.drag-handle').forEach(handle=>{
      handle.addEventListener('mousedown',e=>{
        e.preventDefault();
        const tr=handle.closest('tr');
        let dragIdx=+tr.dataset.vi;
        tr.classList.add('drag-active');
        document.body.classList.add('dragging-row');
        let lastSwap=0;
        function getRows(){return Array.from(tbodyEl.querySelectorAll('tr'))}
        function onMove(ev){
          ev.preventDefault();
          if(Date.now()-lastSwap<100)return;
          const rows=getRows();
          const curRow=rows.find(r=>+r.dataset.vi===dragIdx);
          if(!curRow)return;
          const mouseY=ev.clientY;
          // Check swap with row above
          const curPos=rows.indexOf(curRow);
          if(curPos>0){
            const prevRow=rows[curPos-1];
            const prevRect=prevRow.getBoundingClientRect();
            if(mouseY<prevRect.top+prevRect.height/2){
              const prevIdx=+prevRow.dataset.vi;
              // Swap data
              [dataArr[prevIdx],dataArr[dragIdx]]=[dataArr[dragIdx],dataArr[prevIdx]];
              // Swap DOM: move current row before previous
              tbodyEl.insertBefore(curRow,prevRow);
              // Update data-vi attributes
              curRow.dataset.vi=prevIdx;
              prevRow.dataset.vi=dragIdx;
              dragIdx=prevIdx;
              lastSwap=Date.now();
              return;
            }
          }
          // Check swap with row below
          if(curPos<rows.length-1){
            const nextRow=rows[curPos+1];
            const nextRect=nextRow.getBoundingClientRect();
            if(mouseY>nextRect.top+nextRect.height/2){
              const nextIdx=+nextRow.dataset.vi;
              // Swap data
              [dataArr[dragIdx],dataArr[nextIdx]]=[dataArr[nextIdx],dataArr[dragIdx]];
              // Swap DOM: move next row before current
              tbodyEl.insertBefore(nextRow,curRow);
              // Update data-vi attributes
              curRow.dataset.vi=nextIdx;
              nextRow.dataset.vi=dragIdx;
              dragIdx=nextIdx;
              lastSwap=Date.now();
              return;
            }
          }
        }
        function onUp(){
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          document.body.classList.remove('dragging-row');
          tbodyEl.querySelectorAll('tr').forEach(r=>r.classList.remove('drag-active'));
          saveState();renderFn();
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
      // Touch support for drag-to-reorder
      handle.addEventListener('touchstart',te=>{
        te.preventDefault();
        const me=new MouseEvent('mousedown',{clientX:te.touches[0].clientX,clientY:te.touches[0].clientY});
        handle.dispatchEvent(me);
      },{passive:false});
      handle.addEventListener('touchmove',te=>{
        te.preventDefault();
        const me=new MouseEvent('mousemove',{clientX:te.touches[0].clientX,clientY:te.touches[0].clientY});
        document.dispatchEvent(me);
      },{passive:false});
      handle.addEventListener('touchend',te=>{
        te.preventDefault();
        const me=new MouseEvent('mouseup',{});
        document.dispatchEvent(me);
      },{passive:false});
    });
    // Color tag click handler — show popup with whiteboard color swatches
    tbodyEl.querySelectorAll('.row-color-tag').forEach(dot=>{
      dot.addEventListener('click',e=>{
        e.stopPropagation();
        // Remove any existing color-tag popup
        document.querySelectorAll('.color-tag-popup').forEach(p=>p.remove());
        const i=+dot.dataset.vi;
        const popup=document.createElement('div');
        popup.className='color-tag-popup';
        popup.style.cssText='position:absolute;z-index:999;background:var(--bg,#fff);border:1px solid var(--border,#ccc);border-radius:6px;padding:6px;display:flex;gap:3px;flex-wrap:wrap;max-width:140px;box-shadow:0 2px 8px rgba(0,0,0,.18)';
        // White (clear) option
        const colors=[''].concat(getWbTagColors());
        colors.forEach(c=>{
          const s=document.createElement('span');
          s.style.cssText=`width:18px;height:18px;border-radius:3px;cursor:pointer;display:inline-block;border:1px solid var(--border,#ccc);background:${c||'#fff'}`;
          if(c===(dataArr[i]._colorTag||''))s.style.borderColor='var(--accent)';
          s.title=c||'None';
          s.addEventListener('click',()=>{
            dataArr[i]._colorTag=c;
            saveState();renderFn();
            popup.remove();
          });
          popup.appendChild(s);
        });
        dot.closest('td').appendChild(popup);
        // Close on outside click
        setTimeout(()=>{
          function closePopup(ev){if(!popup.contains(ev.target)){popup.remove();document.removeEventListener('click',closePopup)}}
          document.addEventListener('click',closePopup);
        },0);
      });
    });
  }

  // Color palette for row tags — same suite as whiteboard swatches
  function getWbTagColors(){
    const isDark=document.documentElement.classList.contains('dark');
    return isDark?TAG_COLORS_DARK.slice():TAG_COLORS_LIGHT.slice();
  }

  function fields2colSpan(prefix){return prefix==='vr'?12:11}

  function renderFooter(tfootEl,dataArr,colSpan,monthFilter){
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const moTotals=MO.map(m=>dataArr.reduce((s,r)=>s+(parseFloat(r[m])||0),0));
    const hasFilter=monthFilter&&monthFilter.size>0&&monthFilter.size<12;
    const fyTotal=hasFilter?moTotals.filter((_,i)=>monthFilter.has(i)).reduce((s,v)=>s+v,0):moTotals.reduce((s,v)=>s+v,0);
    // Use individual <td>s instead of colspan to prevent column misalignment
    const label=`TOTAL${hasFilter?' (filtered)':''}`;
    let ft=`<tr style="font-weight:700;background:var(--panel);border-bottom:2px solid var(--border)"><td></td><td></td><td style="font-size:.8rem;white-space:nowrap">${label}</td>`;
    for(let c=1;c<colSpan;c++)ft+='<td></td>';
    moTotals.forEach((t,mi)=>{
      const dim=hasFilter&&!monthFilter.has(mi)?'opacity:.35;':'';
      ft+=`<td style="text-align:right;font-size:.82rem;white-space:nowrap;${dim}">${fmtScaled(t)}</td>`;
    });
    ft+=`<td style="text-align:right;font-size:.82rem;white-space:nowrap">${fmtScaled(fyTotal)}</td><td></td></tr>`;
    tfootEl.innerHTML=ft;
  }

  function ensureVendorRows(){
    if(!state.vendorRows||!state.vendorRows.length){
      const genProj=state.projects.find(p=>p.code==='GEN-000');
      const defProjId=genProj?genProj.id:'';
      state.vendorRows=[{parentCo:'',vendorName:'OAO - Vendor Spend',vendorType:'Other',businessUnit:'',bizLine:'',market:'',project:defProjId,acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0}];
      saveState();
    }
  }
  let vendorSortCol=null,vendorSortAsc=true;
  function renderVendorGrid(){
    ensureVendorRows();
    // Apply sort if active
    if(vendorSortCol){
      const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const dir=vendorSortAsc?1:-1;
      state.vendorRows.sort((a,b)=>{
        let va,vb;
        if(vendorSortCol==='fullYear'){
          va=moKeys.reduce((s,m)=>s+(parseFloat(a[m])||0),0);
          vb=moKeys.reduce((s,m)=>s+(parseFloat(b[m])||0),0);
        } else {
          va=a[vendorSortCol]||'';vb=b[vendorSortCol]||'';
        }
        if(typeof va==='number'&&typeof vb==='number')return (va-vb)*dir;
        return String(va).localeCompare(String(vb))*dir;
      });
      saveState();
    }
    // Update sort arrows
    document.querySelectorAll('#vendorTable th.sortable').forEach(th=>{
      const col=th.dataset.vsort;
      const arrow=th.querySelector('.sort-arrow');
      if(col===vendorSortCol){th.classList.add('sort-active');arrow.textContent=vendorSortAsc?'▲':'▼'}
      else{th.classList.remove('sort-active');arrow.textContent=''}
    });
    const tbody=document.getElementById('vendorTbody');
    const totalEl=document.getElementById('vendorTotalRow');
    let h='';
    state.vendorRows.forEach((row,i)=>{h+=buildSpendRow(row,i,'vr','vendor')});
    tbody.innerHTML=h;
    renderFooter(totalEl,state.vendorRows,11,vendorSelectedMonths);
    bindSpendRows(tbody,totalEl,state.vendorRows,'vr',renderVendorGrid,vendorSelectedMonths);
    attachSpreadsheetNav('vendorTbody','vr-mo');
  }

  document.getElementById('vendorAddRow').addEventListener('click',()=>{
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    state.vendorRows.push({parentCo:'',vendorName:'',vendorType:'',businessUnit:'',bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0});
    saveState();renderVendorGrid();
  });
  document.getElementById('vendorClearAllRows').addEventListener('click',()=>{
    if(!confirm('Clear all data from all vendor rows? This keeps the rows but zeros out all values and text.'))return;
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    state.vendorRows.forEach(r=>{r.parentCo='';r.vendorName='';r.vendorType='';r.businessUnit='';r.bizLine='';r.market='';r.project='';r.acctDesc='';r.notes='';moKeys.forEach(m=>r[m]=0)});
    saveState();renderVendorGrid();refreshVendorPivot();renderPnlWalk();renderLandingCharts();
  });

  // ── CSV Import / Export ──
  document.getElementById('vendorImportBtn').addEventListener('click',()=>document.getElementById('vendorFileInput').click());
  document.getElementById('vendorFileInput').addEventListener('change',function(){
    readExcelFile(this,wb=>{
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){alert('No data rows found.');return}
      const MO_NAMES=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const FIELD_MAP={};
      const fieldPairs=[['Parent Co','parentCo'],['Parent','parentCo'],['Vendor Name','vendorName'],['Vendor','vendorName'],['Vendor Type','vendorType'],['Type','vendorType'],['Business Unit','businessUnit'],['BU','businessUnit'],['Biz Line','bizLine'],['Business Line','bizLine'],['Function','bizLine'],['Market','market'],['Project','project'],['Account Description','acctDesc'],['Account','acctDesc'],['Notes','notes']];
      fieldPairs.forEach(([k,v])=>{FIELD_MAP[k]=v;FIELD_MAP[k.toLowerCase()]=v});
      MO_LABELS.forEach((m,i)=>{FIELD_MAP[m]=MO_NAMES[i];FIELD_MAP[m.toLowerCase()]=MO_NAMES[i]});
      let imported=0;
      const startIdx=state.vendorRows.length;
      rows.forEach(r=>{
        const row={parentCo:'',vendorName:'',vendorType:'',businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
        Object.keys(r).forEach(k=>{const mapped=FIELD_MAP[k]||FIELD_MAP[k.trim().toLowerCase()];if(mapped)row[mapped]=MO_NAMES.includes(mapped)?parseFloat(r[k])||0:String(r[k])});
        state.vendorRows.push(row);
        imported++;
      });
      // Ask about scale of imported values
      const scale=prompt(`Imported ${imported} vendor rows.\n\nWere values loaded as:\n  1 = Singles (actual dollars)\n  2 = Thousands ($K)\n  3 = Millions ($M)\n\nEnter 1, 2, or 3:`,'1');
      const mult=scale==='2'?1000:scale==='3'?1000000:1;
      if(mult>1){
        for(let idx=startIdx;idx<state.vendorRows.length;idx++){
          MO_NAMES.forEach(m=>{state.vendorRows[idx][m]=Math.round((state.vendorRows[idx][m]||0)*mult)});
        }
      }
      window.logAudit('Import Vendor',imported+' rows');
      saveState();renderVendorGrid();
    });
  });

  // Build a Reference Values sheet for re-upload mapping
  function buildRefValuesSheet(){
    const data=[];
    // Markets
    data.push(['--- Markets ---','','']);
    data.push(['Market Code','Market Name','']);
    state.markets.forEach(m=>data.push([m.code,m.name,'']));
    data.push([]);
    // Business Lines
    data.push(['--- Business Lines ---','','']);
    data.push(['BL Code','BL Name','']);
    state.bizLines.forEach(b=>data.push([b.code,b.name,'']));
    data.push([]);
    // Projects
    data.push(['--- Projects ---','','','']);
    data.push(['Project Code','Product','Category','Market']);
    state.projects.forEach(p=>data.push([p.code,p.product||'',p.category||'',p.marketCode||'']));
    data.push([]);
    // Accounts
    data.push(['--- Accounts ---','','','']);
    data.push(['Account Code','Description','Category','Group']);
    state.accounts.forEach(a=>data.push([a.code,a.description,a.category||'',a.group||'']));
    data.push([]);
    // Vendor Types
    data.push(['--- Vendor Types ---']);
    VENDOR_TYPES.forEach(v=>data.push([v]));
    data.push([]);
    // Expense Types
    data.push(['--- Expense Types ---']);
    EXPENSE_TYPES.forEach(v=>data.push([v]));
    data.push([]);
    // Business Units
    data.push(['--- Business Units ---']);
    const buOpts=Object.values(COUNTRY_BU).filter((v,i,a)=>a.indexOf(v)===i);
    buOpts.forEach(b=>data.push([b]));
    const ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:20},{wch:24},{wch:20},{wch:14}];
    return ws;
  }

  document.getElementById('vendorExportBtn').addEventListener('click',()=>{
    if(typeof XLSX==='undefined'){alert('Excel library failed to load.');return}
    const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const headers=['Parent Co','Vendor Name','Vendor Type','Notes','Business Unit','Biz Line','Market','Project','Account Description','Account Code',...MO,'Full Year'];
    const data=[headers];
    state.vendorRows.forEach(r=>{
      const fy=moKeys.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
      const projObj=state.projects.find(p=>p.id===r.project);
      data.push([r.parentCo||'',r.vendorName||'',r.vendorType||'',r.notes||'',r.businessUnit||'',r.bizLine||'',r.market||'',projObj?projObj.code:(r.project||''),r.acctDesc||'',acctDescToCode(r.acctDesc),...moKeys.map(m=>parseFloat(r[m])||0),fy]);
    });
    const ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:16},{wch:18},{wch:16},{wch:16},{wch:14},{wch:14},{wch:10},{wch:12},{wch:20},{wch:12},...MO.map(()=>({wch:12})),{wch:14}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Vendor Spend');
    XLSX.utils.book_append_sheet(wb,buildRefValuesSheet(),'Reference Values');
    xlsxDownload(wb,'vendor_spend_export.xlsx');
  });

  // ── Account Mapping ──
  // ── Vendor Dimensions Tab (universal) ──
  function renderAccounts(){
    const tbody=document.getElementById('acctTableBody');
    tbody.innerHTML=state.accounts.map((a,idx)=>{
      const vCount=state.vendorRows.filter(r=>r.acctDesc===a.description).length + state.teRows.filter(r=>r.acctDesc===a.description).length;
      return `<tr>
        <td><input class="acct-code-edit dim-edit-input" value="${esc(a.code)}" data-idx="${idx}" style="font-weight:600;color:var(--accent);width:70px"></td>
        <td><input class="acct-desc-edit dim-edit-input" value="${esc(a.description)}" data-idx="${idx}" style="width:180px"></td>
        <td><select class="acct-cat-edit dim-edit-select" data-idx="${idx}">
          <option value="">—</option><option value="Software &amp; Licenses"${a.category==='Software & Licenses'?' selected':''}>Software &amp; Licenses</option>
          <option value="Professional Services"${a.category==='Professional Services'?' selected':''}>Professional Services</option>
          <option value="Data &amp; Analytics"${a.category==='Data & Analytics'?' selected':''}>Data &amp; Analytics</option>
          <option value="T&amp;E"${a.category==='T&E'?' selected':''}>T&amp;E</option>
          <option value="Infrastructure"${a.category==='Infrastructure'?' selected':''}>Infrastructure</option>
          <option value="Other OpEx"${a.category==='Other OpEx'?' selected':''}>Other OpEx</option>
        </select></td>
        <td><select class="acct-group-edit dim-edit-select" data-idx="${idx}">
          <option value="vendor"${(a.group||'vendor')==='vendor'?' selected':''}>Vendor</option>
          <option value="te"${a.group==='te'?' selected':''}>T&amp;E</option>
          <option value="depreciation"${a.group==='depreciation'?' selected':''}>Depreciation</option>
        </select></td>
        <td style="font-size:.78rem;color:var(--text-dim)">${vCount}</td>
        <td><button class="btn btn-sm btn-danger acct-del" data-idx="${idx}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('.acct-code-edit').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const i=parseInt(inp.dataset.idx);const a=state.accounts[i];
        if(a){const newCode=inp.value.trim();if(newCode&&!state.accounts.some((x,xi)=>xi!==i&&x.code===newCode)){a.code=newCode;saveState()}else{inp.value=a.code;if(newCode)alert('Code already exists or is empty')}}
      });
    });
    tbody.querySelectorAll('.acct-desc-edit').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const i=parseInt(inp.dataset.idx);const a=state.accounts[i];
        if(a){const oldDesc=a.description;a.description=inp.value;state.vendorRows.forEach(r=>{if(r.acctDesc===oldDesc)r.acctDesc=a.description});state.teRows.forEach(r=>{if(r.acctDesc===oldDesc)r.acctDesc=a.description});saveState();renderVendorGrid();renderTeGrid()}
      });
    });
    tbody.querySelectorAll('.acct-cat-edit').forEach(sel=>{
      sel.addEventListener('change',()=>{
        const i=parseInt(sel.dataset.idx);const a=state.accounts[i];
        if(a){a.category=sel.value;saveState()}
      });
    });
    tbody.querySelectorAll('.acct-group-edit').forEach(sel=>{
      sel.addEventListener('change',()=>{
        const i=parseInt(sel.dataset.idx);const a=state.accounts[i];
        if(a){a.group=sel.value;saveState();renderVendorGrid();renderTeGrid()}
      });
    });
    tbody.querySelectorAll('.acct-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=parseInt(btn.dataset.idx);
        if(!confirm('Delete account '+(state.accounts[i].code||'(blank)')+'?'))return;
        state.accounts.splice(i,1);
        saveState();renderAccounts();renderVendorGrid();renderTeGrid();
      });
    });
  }

  function renderVendorDims(){
    // Markets
    const mbody=document.getElementById('vMarketsBody');
    mbody.innerHTML=state.markets.map(m=>`<tr>
      <td><input class="vm-code dim-edit-input" data-code="${m.code}" value="${esc(m.code)}" style="font-weight:600;color:var(--accent);width:70px"></td>
      <td><input class="vm-name dim-edit-input" data-code="${m.code}" value="${esc(m.name)}" style="width:140px"></td>
      <td><button class="btn btn-sm btn-danger vm-del" data-code="${m.code}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
    </tr>`).join('');
    mbody.querySelectorAll('.vm-code').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const oldCode=inp.dataset.code;
        const newCode=inp.value.trim();
        if(!newCode||state.markets.some(x=>x.code!==oldCode&&x.code===newCode)){inp.value=oldCode;if(newCode)alert('Code already exists or is empty');return}
        const m=state.markets.find(x=>x.code===oldCode);
        if(m){
          state.employees.forEach(e=>{if(e.allocations)e.allocations.forEach(a=>{/* market code on projects */})});
          state.projects.forEach(p=>{if(p.marketCode===oldCode)p.marketCode=newCode});
          m.code=newCode;saveState();renderVendorDims();refreshAllDropdowns();renderMarkets();
        }
      });
    });
    mbody.querySelectorAll('.vm-name').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const m=state.markets.find(x=>x.code===inp.dataset.code);
        if(m){m.name=inp.value;saveState();refreshAllDropdowns();renderMarkets()}
      });
    });
    mbody.querySelectorAll('.vm-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(!confirm('Delete market '+btn.dataset.code+'?'))return;
        state.markets=state.markets.filter(m=>m.code!==btn.dataset.code);
        saveState();renderVendorDims();refreshAllDropdowns();renderMarkets();
      });
    });
    // Biz lines
    const bbody=document.getElementById('vBizBody');
    bbody.innerHTML=state.bizLines.map(b=>`<tr>
      <td><input class="vb-code dim-edit-input" data-code="${b.code}" value="${esc(b.code)}" style="font-weight:600;color:var(--accent);width:60px"></td>
      <td><input class="vb-name dim-edit-input" data-code="${b.code}" value="${esc(b.name)}" style="width:140px"></td>
      <td><button class="btn btn-sm btn-danger vb-del" data-code="${b.code}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
    </tr>`).join('');
    bbody.querySelectorAll('.vb-code').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const oldCode=inp.dataset.code;
        const newCode=inp.value.trim();
        if(!newCode||state.bizLines.some(x=>x.code!==oldCode&&x.code===newCode)){inp.value=oldCode;if(newCode)alert('Code already exists or is empty');return}
        const b=state.bizLines.find(x=>x.code===oldCode);
        if(b){
          state.employees.forEach(e=>{if(e.businessLine===oldCode)e.businessLine=newCode});
          state.vendorRows.forEach(r=>{if(r.bizLine===oldCode)r.bizLine=newCode});
          state.teRows.forEach(r=>{if(r.bizLine===oldCode)r.bizLine=newCode});
          b.code=newCode;saveState();renderVendorDims();refreshAllDropdowns();renderBizLines();
        }
      });
    });
    bbody.querySelectorAll('.vb-name').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const b=state.bizLines.find(x=>x.code===inp.dataset.code);
        if(b){b.name=inp.value;saveState();refreshAllDropdowns();renderBizLines()}
      });
    });
    bbody.querySelectorAll('.vb-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(!confirm('Delete business line '+btn.dataset.code+'?'))return;
        state.bizLines=state.bizLines.filter(b=>b.code!==btn.dataset.code);
        saveState();renderVendorDims();refreshAllDropdowns();renderBizLines();
      });
    });
    // Accounts
    renderAccounts();
  }

  document.getElementById('btnAddAcct').addEventListener('click',()=>{
    const code=document.getElementById('acctCode').value.trim();
    const desc=document.getElementById('acctDesc').value.trim();
    const cat=document.getElementById('acctCategory').value;
    const grp=document.getElementById('acctGroup').value;
    if(!code||!desc){alert('Please fill account code and description');return}
    if(state.accounts.some(a=>a.code===code)){alert('Account code already exists');return}
    state.accounts.push({code,description:desc,category:cat,group:grp});
    saveState();renderAccounts();renderVendorGrid();renderTeGrid();
    document.getElementById('acctCode').value='';document.getElementById('acctDesc').value='';document.getElementById('acctCategory').value='';
  });

  document.getElementById('btnAddBlankAcct').addEventListener('click',()=>{
    state.accounts.push({code:'',description:'',category:''});
    saveState();renderAccounts();
  });

  document.getElementById('vBtnAddMarket').addEventListener('click',()=>{
    const code=document.getElementById('vMktCode').value.trim().toUpperCase();
    const name=document.getElementById('vMktName').value.trim();
    if(!code||!name){alert('Fill code and name');return}
    if(!/^[A-Z]{2}\d{4}$/.test(code)){alert('Market code must be 2 letters + 4 digits (e.g. JP0011)');return}
    if(state.markets.some(m=>m.code===code)){alert('Market code already exists');return}
    state.markets.push({code,name});
    saveState();renderVendorDims();refreshAllDropdowns();renderMarkets();
    document.getElementById('vMktCode').value='';document.getElementById('vMktName').value='';
  });

  document.getElementById('vBtnAddBizLine').addEventListener('click',()=>{
    const code=document.getElementById('vBizCode').value.trim();
    const name=document.getElementById('vBizName').value.trim();
    if(!code||!name){alert('Fill code and name');return}
    if(!/^\d+$/.test(code)){alert('Code must be numeric');return}
    if(state.bizLines.some(b=>b.code===code)){alert('Code already exists');return}
    state.bizLines.push({code,name});
    saveState();renderVendorDims();refreshAllDropdowns();renderBizLines();
    document.getElementById('vBizCode').value='';document.getElementById('vBizName').value='';
  });

  // Month range filter state (must be declared before renderVendorGrid/renderTeGrid)
  let vendorSelectedMonths=new Set(), teSelectedMonths=new Set();

  // ── T&E Tab ──
  function ensureTeRows(){
    if(!state.teRows||!state.teRows.length){
      const genProj=state.projects.find(p=>p.code==='GEN-000');
      const defProjId=genProj?genProj.id:'';
      state.teRows=[{expenseType:'T&E',description:'OAO - T&E Spend',businessUnit:'',bizLine:'',market:'',project:defProjId,acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0}];
      saveState();
    }
  }
  function renderTeGrid(){
    ensureTeRows();
    const tbody=document.getElementById('teTbody');
    const totalEl=document.getElementById('teTotalRow');
    let h='';
    state.teRows.forEach((row,i)=>{h+=buildSpendRow(row,i,'te','te')});
    tbody.innerHTML=h;
    renderFooter(totalEl,state.teRows,10,teSelectedMonths);
    bindSpendRows(tbody,totalEl,state.teRows,'te',renderTeGrid,teSelectedMonths);
    attachSpreadsheetNav('teTbody','te-mo');
  }

  document.getElementById('teAddRow').addEventListener('click',()=>{
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    state.teRows.push({expenseType:'',description:'',businessUnit:'',bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0});
    saveState();renderTeGrid();
  });
  document.getElementById('teClearAllRows').addEventListener('click',()=>{
    if(!confirm('Clear all data from all T&E rows? This keeps the rows but zeros out all values and text.'))return;
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    state.teRows.forEach(r=>{r.expenseType='';r.description='';r.businessUnit='';r.bizLine='';r.market='';r.project='';r.acctDesc='';r.notes='';moKeys.forEach(m=>r[m]=0)});
    saveState();renderTeGrid();refreshTePivot();renderPnlWalk();renderLandingCharts();
  });

  document.getElementById('teExportBtn').addEventListener('click',()=>{
    if(typeof XLSX==='undefined'){alert('Excel library failed to load.');return}
    const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const headers=['Expense Type','Description','Notes','Business Unit','Biz Line','Market','Project','Account Description','Account Code',...MO,'Full Year'];
    const data=[headers];
    state.teRows.forEach(r=>{
      const fy=moKeys.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
      const projObj=state.projects.find(p=>p.id===r.project);
      data.push([r.expenseType||'',r.description||'',r.notes||'',r.businessUnit||'',r.bizLine||'',r.market||'',projObj?projObj.code:(r.project||''),r.acctDesc||'',acctDescToCode(r.acctDesc),...moKeys.map(m=>parseFloat(r[m])||0),fy]);
    });
    const ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:16},{wch:18},{wch:16},{wch:14},{wch:14},{wch:10},{wch:12},{wch:20},{wch:12},...MO.map(()=>({wch:12})),{wch:14}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'T&E Spend');
    XLSX.utils.book_append_sheet(wb,buildRefValuesSheet(),'Reference Values');
    xlsxDownload(wb,'te_spend_export.xlsx');
  });

  renderTeGrid();

  // ── Contractors Tab ──
  let contractorSelectedMonths=new Set();
  let contractorAmtScale=1;
  let contractorView='expense'; // expense, capex, opex
  let contractorSortCol=null,contractorSortAsc=true;

  function buildContractorRow(row,i){
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const buOpts=BU_OPTIONS.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const mktOpts=state.markets.map(m=>`<option value="${esc(m.code)}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
    const blOpts=state.bizLines.map(b=>`<option value="${esc(b.code)}">${esc(b.code)} — ${esc(b.name)}</option>`).join('');
    const projOpts=state.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.code)}</option>`).join('');
    const acctOpts=state.accounts.filter(a=>(a.group||'vendor')==='vendor').map(a=>`<option value="${esc(a.description)}">${esc(a.description)}</option>`).join('');
    const BLANK_BG=getBlankBg();const blk=v=>!v?BLANK_BG:'';
    const tagColor=row._colorTag||'';
    const tagDefault=document.documentElement.classList.contains('dark')?'#2a2a2e':'#eee';
    const tagDotStyle=`width:16px;height:16px;border-radius:3px;cursor:pointer;display:inline-block;border:1px solid var(--border);background:${tagColor||tagDefault}`;
    const expanded=row._rateExpanded;
    const hourly=parseFloat(row.hourlyRate)||0;
    const hours=parseFloat(row.monthlyHours)||0;
    const computed=Math.round(hourly*hours);
    const capPct=parseFloat(row.capPct)||0;

    let h=`<tr data-ci="${i}" draggable="false" style="${tagColor?'border-left:3px solid '+tagColor:''}"><td class="drag-handle" title="Drag to reorder">&#9776;</td><td style="color:var(--text-dim);font-size:.75rem;position:relative"><span class="row-color-tag" data-vi="${i}" data-prefix="cr" style="${tagDotStyle}" title="Color tag"></span></td>`;
    // Name
    h+=`<td style="${blk(row.name)}"><input class="cr-field" data-f="name" value="${esc(row.name)}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px"></td>`;
    // Vendor Name
    h+=`<td style="${blk(row.vendorName)}"><input class="cr-field" data-f="vendorName" value="${esc(row.vendorName||'')}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px"></td>`;
    // Rate / Hours — expandable cell
    h+=`<td style="vertical-align:top;min-width:100px">`;
    h+=`<div style="display:flex;align-items:center;gap:4px"><button class="cr-rate-toggle btn btn-sm" data-ci="${i}" style="padding:0 4px;font-size:.65rem;line-height:1.3;border:1px solid var(--border);background:transparent;color:var(--text-dim)" title="Toggle rate calculator">${expanded?'▼':'▶'}</button>`;
    h+=`<span style="font-size:.72rem;color:var(--text-dim)">${hourly>0&&hours>0?'$'+hourly.toLocaleString()+'/hr × '+hours+'h = $'+computed.toLocaleString()+'/mo':'Enter rate ▶'}</span></div>`;
    if(expanded){
      h+=`<div style="margin-top:4px;display:flex;flex-direction:column;gap:3px;padding:4px;background:var(--panel-inset);border-radius:4px">`;
      h+=`<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.68rem;color:var(--text-dim);width:50px">$/hr</label><input class="cr-field cr-rate-input" data-f="hourlyRate" type="number" value="${hourly||''}" step="any" style="width:80px;font-size:.76rem;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)"></div>`;
      h+=`<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.68rem;color:var(--text-dim);width:50px">Hrs/mo</label><input class="cr-field cr-rate-input" data-f="monthlyHours" type="number" value="${hours||''}" step="any" style="width:80px;font-size:.76rem;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)"></div>`;
      h+=`<button class="btn btn-sm cr-apply-rate" data-ci="${i}" style="padding:2px 8px;font-size:.68rem;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);color:#6366f1;margin-top:2px">Apply to selected months</button>`;
      h+=`</div>`;
    }
    h+=`</td>`;
    // Start / End Month
    const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const startMo=typeof row._startMonth==='number'?row._startMonth:0;
    const endMo=typeof row._endMonth==='number'?row._endMonth:11;
    const moSelOpts=MO_LABELS.map((l,mi)=>`<option value="${mi}">${l}</option>`).join('');
    h+=`<td style="vertical-align:top;white-space:nowrap"><div style="display:flex;flex-direction:column;gap:2px">`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">From</label><select class="cr-field cr-start-mo" data-f="_startMonth" style="font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${moSelOpts}</select></div>`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">To</label><select class="cr-field cr-end-mo" data-f="_endMonth" style="font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${moSelOpts}</select></div>`;
    h+=`</div></td>`;
    // CapEx %
    h+=`<td><input class="cr-field" data-f="capPct" type="number" value="${capPct}" min="0" max="100" step="1" style="width:60px;border:none;background:transparent;font-size:.82rem;padding:2px 4px;text-align:right">%</td>`;
    // Notes
    h+=`<td><input class="cr-field" data-f="notes" value="${esc(row.notes||'')}" style="width:100%;border:none;background:transparent;font-size:.8rem;padding:2px 4px" placeholder=""></td>`;
    // Shared dimension columns
    h+=`<td style="${blk(row.businessUnit)}"><select class="cr-field" data-f="businessUnit" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${buOpts}</select></td>`;
    h+=`<td style="${blk(row.bizLine)}"><select class="cr-field" data-f="bizLine" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${blOpts}</select></td>`;
    h+=`<td style="${blk(row.market)}"><select class="cr-field" data-f="market" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${mktOpts}</select></td>`;
    h+=`<td style="${blk(row.project)}"><select class="cr-field" data-f="project" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${projOpts}</select></td>`;
    h+=`<td style="${blk(row.acctDesc)}"><select class="cr-field cr-acctDesc" data-f="acctDesc" style="width:100%;border:none;background:transparent;font-size:.78rem;padding:1px 2px"><option value="">—</option>${acctOpts}</select></td>`;
    h+=`<td class="cr-acctCode" style="font-size:.78rem;color:var(--text-dim);text-align:center">${acctDescToCode(row.acctDesc)}</td>`;
    // Rate Increase column
    const riMo=typeof row._rateIncMonth==='number'?row._rateIncMonth:-1;
    const riPct=parseFloat(row._rateIncPct)||0;
    const riMoOpts='<option value="-1">—</option>'+MO_LABELS.map((l,mi)=>`<option value="${mi}">${l}</option>`).join('');
    h+=`<td style="vertical-align:top;white-space:nowrap"><div style="display:flex;flex-direction:column;gap:2px">`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">Mo</label><select class="cr-field cr-ri-mo" data-f="_rateIncMonth" style="font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${riMoOpts}</select></div>`;
    h+=`<div style="display:flex;align-items:center;gap:3px"><label style="font-size:.65rem;color:var(--text-dim);width:28px">%</label><input class="cr-field cr-ri-pct" data-f="_rateIncPct" type="number" value="${riPct||''}" step="any" style="width:55px;font-size:.74rem;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)"></div>`;
    h+=`<button class="btn btn-sm cr-apply-ri" data-ci="${i}" style="padding:2px 8px;font-size:.68rem;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);color:#6366f1;margin-top:2px">Apply increase</button>`;
    h+=`</div></td>`;
    // Monthly columns — display based on view toggle
    MO.forEach(m=>{
      const raw=parseFloat(row[m])||0;
      const capAmt=Math.round(raw*capPct/100);
      const opAmt=raw-capAmt;
      let displayed;
      if(contractorView==='capex')displayed=contractorAmtScale===1?capAmt:Math.round((capAmt/contractorAmtScale)*100)/100;
      else if(contractorView==='opex')displayed=contractorAmtScale===1?opAmt:Math.round((opAmt/contractorAmtScale)*100)/100;
      else displayed=contractorAmtScale===1?raw:Math.round((raw/contractorAmtScale)*100)/100;
      const isReadonly=contractorView!=='expense';
      h+=`<td><input class="cr-field cr-mo" data-f="${m}" type="number" value="${displayed}" style="width:100%;min-width:80px;border:none;background:transparent;font-size:.82rem;padding:3px 6px;text-align:right${isReadonly?';color:var(--text-dim)':''}" step="any" ${isReadonly?'readonly':''}></td>`;
    });
    // Full Year
    const rawFy=MO.reduce((s,m)=>s+(parseFloat(row[m])||0),0);
    let fyDisplay;
    if(contractorView==='capex')fyDisplay=Math.round(rawFy*capPct/100);
    else if(contractorView==='opex')fyDisplay=rawFy-Math.round(rawFy*capPct/100);
    else fyDisplay=rawFy;
    const fySuffix=contractorAmtScale===1000?'K':contractorAmtScale===1000000?'M':'';
    const fyScaled=contractorAmtScale===1?fyDisplay:Math.round((fyDisplay/contractorAmtScale)*100)/100;
    h+=`<td style="font-weight:700;text-align:right;font-size:.82rem;white-space:nowrap">$${fyScaled.toLocaleString('en-US',{maximumFractionDigits:2})}${fySuffix}</td>`;
    h+=`<td><button class="btn btn-sm btn-danger cr-del" data-ci="${i}" style="padding:2px 6px;font-size:.7rem">X</button></td></tr>`;
    return h;
  }

  function renderContractorFooter(){
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const totalEl=document.getElementById('contractorTotalRow');
    const capPcts=state.contractorRows.map(r=>parseFloat(r.capPct)||0);
    const moTotals=MO.map((m,mi)=>{
      return state.contractorRows.reduce((s,r,ri)=>{
        const raw=parseFloat(r[m])||0;
        const cp=capPcts[ri];
        if(contractorView==='capex')return s+Math.round(raw*cp/100);
        if(contractorView==='opex')return s+(raw-Math.round(raw*cp/100));
        return s+raw;
      },0);
    });
    const hasFilter=contractorSelectedMonths.size>0&&contractorSelectedMonths.size<12;
    const fyTotal=hasFilter?moTotals.filter((_,i)=>contractorSelectedMonths.has(i)).reduce((s,v)=>s+v,0):moTotals.reduce((s,v)=>s+v,0);
    // Use individual <td>s instead of colspan to prevent column misalignment with data rows
    const totalLabel=`TOTAL${hasFilter?' (filtered)':''}${contractorView!=='expense'?' — '+contractorView.toUpperCase():''}`;
    let ft=`<tr style="font-weight:700;background:var(--panel);border-bottom:2px solid var(--border)"><td></td><td></td><td style="font-size:.8rem;white-space:nowrap">${totalLabel}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
    moTotals.forEach((t,mi)=>{
      const dim=hasFilter&&!contractorSelectedMonths.has(mi)?'opacity:.35;':'';
      const sv=contractorAmtScale===1?t:Math.round((t/contractorAmtScale)*100)/100;
      const suf=contractorAmtScale===1000?'K':contractorAmtScale===1000000?'M':'';
      ft+=`<td style="text-align:right;font-size:.82rem;white-space:nowrap;${dim}">$${sv.toLocaleString('en-US',{maximumFractionDigits:2})}${suf}</td>`;
    });
    const fySv=contractorAmtScale===1?fyTotal:Math.round((fyTotal/contractorAmtScale)*100)/100;
    const fySuf=contractorAmtScale===1000?'K':contractorAmtScale===1000000?'M':'';
    ft+=`<td style="text-align:right;font-size:.82rem;white-space:nowrap;font-weight:700">$${fySv.toLocaleString('en-US',{maximumFractionDigits:2})}${fySuf}</td><td></td></tr>`;
    totalEl.innerHTML=ft;
  }

  function renderContractorGrid(){
    const tbody=document.getElementById('contractorTbody');
    let h='';
    state.contractorRows.forEach((row,i)=>{h+=buildContractorRow(row,i)});
    tbody.innerHTML=h;
    renderContractorFooter();
    // Bind fields
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    // Set selected dropdown values
    tbody.querySelectorAll('tr').forEach(tr=>{
      const i=+tr.dataset.ci;if(isNaN(i))return;
      const row=state.contractorRows[i];if(!row)return;
      tr.querySelectorAll('select.cr-field').forEach(sel=>{
        const f=sel.dataset.f;
        if(f==='_startMonth'){sel.value=typeof row._startMonth==='number'?row._startMonth:0}
        else if(f==='_endMonth'){sel.value=typeof row._endMonth==='number'?row._endMonth:11}
        else if(f==='_rateIncMonth'){sel.value=typeof row._rateIncMonth==='number'?row._rateIncMonth:-1}
        else if(f&&row[f])sel.value=row[f];
      });
    });
    // Field changes
    tbody.querySelectorAll('.cr-field').forEach(el=>{
      el.addEventListener('change',()=>{
        const tr=el.closest('tr');const i=+tr.dataset.ci;
        const f=el.dataset.f;const row=state.contractorRows[i];if(!row)return;
        if(MO.includes(f)){
          if(contractorView!=='expense')return;// readonly in capex/opex view
          row[f]=Math.round((parseFloat(el.value)||0)*contractorAmtScale);
          // Recalc footer
          renderContractorFooter();
        } else if(f==='capPct'){
          row[f]=Math.max(0,Math.min(100,parseFloat(el.value)||0));
          renderContractorGrid();
        } else if(f==='hourlyRate'||f==='monthlyHours'){
          row[f]=parseFloat(el.value)||0;
        } else if(f==='_startMonth'||f==='_endMonth'||f==='_rateIncMonth'){
          row[f]=parseInt(el.value);
          saveState();return;
        } else if(f==='_rateIncPct'){
          row[f]=parseFloat(el.value)||0;
          saveState();return;
        } else {
          row[f]=el.value;
          if(f==='acctDesc'){
            const codeCell=tr.querySelector('.cr-acctCode');
            if(codeCell)codeCell.textContent=acctDescToCode(el.value);
          }
        }
        saveState();
      });
    });
    // Rate toggle
    tbody.querySelectorAll('.cr-rate-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=+btn.dataset.ci;
        state.contractorRows[i]._rateExpanded=!state.contractorRows[i]._rateExpanded;
        renderContractorGrid();
      });
    });
    // Apply rate to selected months (respects start/end month, individual months remain manually editable)
    tbody.querySelectorAll('.cr-apply-rate').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=+btn.dataset.ci;const row=state.contractorRows[i];
        const monthlyAmt=Math.round((parseFloat(row.hourlyRate)||0)*(parseFloat(row.monthlyHours)||0));
        const startMo=typeof row._startMonth==='number'?row._startMonth:0;
        const endMo=typeof row._endMonth==='number'?row._endMonth:11;
        MO.forEach((m,mi)=>{if(mi>=startMo&&mi<=endMo)row[m]=monthlyAmt;else row[m]=0});
        saveState();renderContractorGrid();
      });
    });
    // Apply rate increase
    tbody.querySelectorAll('.cr-apply-ri').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=+btn.dataset.ci;const row=state.contractorRows[i];if(!row)return;
        const riMo=typeof row._rateIncMonth==='number'?row._rateIncMonth:-1;
        const riPct=parseFloat(row._rateIncPct)||0;
        if(riMo<0||!riPct)return;
        MO.forEach((m,mi)=>{
          if(mi>=riMo){row[m]=Math.round((parseFloat(row[m])||0)*(1+riPct/100))}
        });
        saveState();renderContractorGrid();
      });
    });
    // Delete
    tbody.querySelectorAll('.cr-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=+btn.dataset.ci;
        const item=state.contractorRows[i];
        const label=(item&&(item.name||item.vendorName))||'contractor row';
        state.contractorRows.splice(i,1);
        saveState();renderContractorGrid();refreshContractorPivot();renderPnlWalk();renderLandingCharts();
        showUndoToast(label,state.contractorRows,i,item,function(){renderContractorGrid();refreshContractorPivot();renderPnlWalk();renderLandingCharts()});
      });
    });
    // Color tags
    tbody.querySelectorAll('.row-color-tag[data-prefix="cr"]').forEach(dot=>{
      dot.addEventListener('click',(e)=>{
        e.stopPropagation();
        const i=+dot.dataset.vi;const row=state.contractorRows[i];if(!row)return;
        const PALETTE=['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#1abc9c','#e91e63',''];
        const cur=row._colorTag||'';const idx=PALETTE.indexOf(cur);
        row._colorTag=PALETTE[(idx+1)%PALETTE.length];
        saveState();renderContractorGrid();
      });
    });
    attachSpreadsheetNav('contractorTbody','cr-mo');
  }

  // Add contractor row
  document.getElementById('contractorAddRow').addEventListener('click',()=>{
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    state.contractorRows.push({name:'',vendorName:'',hourlyRate:0,monthlyHours:0,_startMonth:0,_endMonth:11,capPct:0,businessUnit:'',bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0});
    saveState();renderContractorGrid();
  });

  // Clear all contractor rows
  document.getElementById('contractorClearAllRows').addEventListener('click',()=>{
    if(!confirm('Clear all data from all Contractor rows?'))return;
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    state.contractorRows.forEach(r=>{r.name='';r.vendorName='';r.hourlyRate=0;r.monthlyHours=0;r._startMonth=0;r._endMonth=11;r.capPct=0;r.businessUnit='';r.bizLine='';r.market='';r.project='';r.acctDesc='';r.notes='';moKeys.forEach(m=>r[m]=0)});
    saveState();renderContractorGrid();refreshContractorPivot();renderPnlWalk();renderLandingCharts();
  });

  // Contractor scale toggle
  document.querySelectorAll('#contractorScaleToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      contractorAmtScale=parseInt(btn.dataset.cscale);
      document.querySelectorAll('#contractorScaleToggle button').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.cscale)===contractorAmtScale));
      renderContractorGrid();
    });
  });

  // Contractor view toggle (expense/capex/opex)
  document.querySelectorAll('#contractorViewToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      contractorView=btn.dataset.cview;
      document.querySelectorAll('#contractorViewToggle button').forEach(b=>b.classList.toggle('active',b.dataset.cview===contractorView));
      renderContractorGrid();
    });
  });

  // Contractor import
  document.getElementById('contractorImportBtn').addEventListener('click',()=>document.getElementById('contractorFileInput').click());
  document.getElementById('contractorFileInput').addEventListener('change',function(){
    readExcelFile(this,wb=>{
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){alert('No data rows found.');return}
      const MO_NAMES=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const FIELD_MAP={};
      [['Contractor Name','name'],['Name','name'],['Vendor Name','vendorName'],['Vendor','vendorName'],['Hourly Rate','hourlyRate'],['Rate','hourlyRate'],['Monthly Hours','monthlyHours'],['Hours','monthlyHours'],['CapEx %','capPct'],['CapEx','capPct'],['Cap %','capPct'],['Business Unit','businessUnit'],['BU','businessUnit'],['Biz Line','bizLine'],['Business Line','bizLine'],['Market','market'],['Project','project'],['Account Description','acctDesc'],['Account','acctDesc'],['Notes','notes']].forEach(([k,v])=>{FIELD_MAP[k]=v;FIELD_MAP[k.toLowerCase()]=v});
      MO_LABELS.forEach((m,i)=>{FIELD_MAP[m]=MO_NAMES[i];FIELD_MAP[m.toLowerCase()]=MO_NAMES[i]});
      let imported=0;
      const startIdx=state.contractorRows.length;
      rows.forEach(r=>{
        const row={name:'',vendorName:'',hourlyRate:0,monthlyHours:0,_startMonth:0,_endMonth:11,capPct:0,businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
        Object.keys(r).forEach(k=>{const mapped=FIELD_MAP[k]||FIELD_MAP[k.trim().toLowerCase()];if(mapped)row[mapped]=['hourlyRate','monthlyHours','capPct',...MO_NAMES].includes(mapped)?parseFloat(r[k])||0:String(r[k])});
        state.contractorRows.push(row);imported++;
      });
      const scale=prompt(`Imported ${imported} contractor rows.\n\nWere values loaded as:\n  1 = Singles (actual dollars)\n  2 = Thousands ($K)\n  3 = Millions ($M)\n\nEnter 1, 2, or 3:`,'1');
      const mult=scale==='2'?1000:scale==='3'?1000000:1;
      if(mult>1){
        for(let idx=startIdx;idx<state.contractorRows.length;idx++){
          MO_NAMES.forEach(m=>{state.contractorRows[idx][m]=Math.round((state.contractorRows[idx][m]||0)*mult)});
        }
      }
      saveState();renderContractorGrid();
    });
  });

  // Contractor export
  document.getElementById('contractorExportBtn').addEventListener('click',()=>{
    if(typeof XLSX==='undefined'){alert('Excel library failed to load.');return}
    const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const headers=['Contractor Name','Vendor Name','Hourly Rate','Monthly Hours','CapEx %','Notes','Business Unit','Biz Line','Market','Project','Account Description','Account Code',...MO,'Full Year'];
    const data=[headers];
    state.contractorRows.forEach(r=>{
      const fy=moKeys.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
      const projObj=state.projects.find(p=>p.id===r.project);
      data.push([r.name||'',r.vendorName||'',r.hourlyRate||0,r.monthlyHours||0,r.capPct||0,r.notes||'',r.businessUnit||'',r.bizLine||'',r.market||'',projObj?projObj.code:(r.project||''),r.acctDesc||'',acctDescToCode(r.acctDesc),...moKeys.map(m=>parseFloat(r[m])||0),fy]);
    });
    const ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:20},{wch:20},{wch:12},{wch:14},{wch:10},{wch:16},{wch:14},{wch:14},{wch:10},{wch:12},{wch:20},{wch:12},...MO.map(()=>({wch:12})),{wch:14}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Contractors');
    XLSX.utils.book_append_sheet(wb,buildRefValuesSheet(),'Reference Values');
    xlsxDownload(wb,'contractor_export.xlsx');
  });

  // Contractor sort click handlers
  document.querySelectorAll('#contractorTable th.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const col=th.dataset.csort;
      if(contractorSortCol===col){contractorSortAsc=!contractorSortAsc}else{contractorSortCol=col;contractorSortAsc=true}
      // Sort contractor rows
      const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const dir=contractorSortAsc?1:-1;
      state.contractorRows.sort((a,b)=>{
        let va,vb;
        if(col==='fullYear'){va=MO.reduce((s,m)=>s+(parseFloat(a[m])||0),0);vb=MO.reduce((s,m)=>s+(parseFloat(b[m])||0),0)}
        else{va=a[col]||'';vb=b[col]||''}
        if(typeof va==='number'&&typeof vb==='number')return (va-vb)*dir;
        return String(va).localeCompare(String(vb))*dir;
      });
      saveState();renderContractorGrid();
    });
  });

  renderContractorGrid();

  // ── Projects in Dimensions ──
  function renderVendorProjects(){
    const pbody=document.getElementById('vProjectsBody');
    pbody.innerHTML=state.projects.map(p=>{
      const mkt=state.markets.find(m=>m.code===p.marketCode);
      return `<tr>
        <td style="font-weight:600;color:var(--accent)">${esc(p.code)}</td>
        <td>${esc(p.product||'')}</td><td>${esc(p.category||'')}</td>
        <td style="font-size:.78rem">${mkt?esc(mkt.code+' — '+mkt.name):'—'}</td>
        <td><button class="btn btn-sm btn-danger vp-del" data-pid="${p.id}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
      </tr>`;
    }).join('');
    pbody.querySelectorAll('.vp-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const pid=btn.dataset.pid;
        const p=state.projects.find(x=>x.id===pid);
        if(!confirm('Delete project '+(p?p.code:pid)+'?'))return;
        state.projects=state.projects.filter(x=>x.id!==pid);
        state.employees.forEach(e=>{if(e.allocations)e.allocations=e.allocations.filter(a=>a.projId!==pid)});
        saveState();renderVendorProjects();renderVendorGrid();renderTeGrid();
        if(typeof renderProjects==='function')renderProjects();
        if(typeof refreshProjectDropdown==='function')refreshProjectDropdown();
      });
    });
    // Populate market select
    const vProjMkt=document.getElementById('vProjMarket');
    const curVal=vProjMkt.value;
    vProjMkt.innerHTML='<option value="">—</option>'+state.markets.map(m=>`<option value="${esc(m.code)}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
    if(curVal)vProjMkt.value=curVal;
  }

  document.getElementById('vBtnAddProject').addEventListener('click',()=>{
    const code=document.getElementById('vProjCode').value.trim();
    const product=document.getElementById('vProjProduct').value.trim();
    const category=document.getElementById('vProjCategory').value.trim();
    const marketCode=document.getElementById('vProjMarket').value;
    if(!code||!product||!category){alert('Fill code, product, and category');return}
    if(state.projects.some(p=>p.code===code)){alert('Project code already exists');return}
    state.projects.push({id:uid(),code,product,category,marketCode,description:''});
    saveState();renderVendorProjects();renderVendorGrid();renderTeGrid();
    if(typeof renderProjects==='function')renderProjects();
    if(typeof refreshProjectDropdown==='function')refreshProjectDropdown();
    document.getElementById('vProjCode').value='';document.getElementById('vProjProduct').value='';document.getElementById('vProjCategory').value='';document.getElementById('vProjMarket').value='';
  });

  // Wire dims render to also render projects
  const origRenderDims=renderVendorDims;
  renderVendorDims=function(){origRenderDims();renderVendorProjects()};

  // Scale toggle — sync both vendor and T&E toggles
  function setAmtScale(scale){
    vendorAmtScale=scale;
    document.querySelectorAll('#vendorScaleToggle button, #teScaleToggle button').forEach(b=>{
      b.classList.toggle('active',parseInt(b.dataset.vscale)===scale);
    });
    renderVendorGrid();renderTeGrid();
  }
  document.querySelectorAll('#vendorScaleToggle button, #teScaleToggle button').forEach(btn=>{
    btn.addEventListener('click',()=>setAmtScale(parseInt(btn.dataset.vscale)));
  });

  // Vendor sort click handlers
  document.querySelectorAll('#vendorTable th.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const col=th.dataset.vsort;
      if(vendorSortCol===col){vendorSortAsc=!vendorSortAsc}else{vendorSortCol=col;vendorSortAsc=true}
      renderVendorGrid();
    });
  });

  // ── Top Spend Pivot + Chart (Vendor & T&E) ──
  const MO_KEYS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const MO_LABELS_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const PIVOT_COLORS=['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#65a30d','#ea580c','#4f46e5','#0d9488','#b91c1c','#7e22ce','#0284c7','#c2410c','#15803d'];

  // ── Pivot filter state ──
  let vPivotBand='all', tePivotBand='all', crPivotBand='all';
  let vPivotSelectedVendors=new Set(), tePivotSelectedDescs=new Set(), crPivotSelectedNames=new Set();

  function parseBand(band){
    if(!band||band==='all')return null;
    const parts=band.split('-');
    const lo=parseFloat(parts[0])||0;
    const hi=parts[1]?parseFloat(parts[1]):Infinity;
    return {lo,hi};
  }

  function buildPivot(rows, rowDim, colDim, filters){
    const {band, selectedNames, nameField, notesSearch, monthFilter}=filters||{};
    // Determine which month keys to include
    const activeMoIdx=monthFilter&&monthFilter.size>0?[...monthFilter]:null;
    const activeMoKeys=activeMoIdx?activeMoIdx.sort((a,b)=>a-b).map(i=>MO_KEYS[i]):MO_KEYS;
    // Compute full-year per row (scoped to selected months) and enrich with product/productType
    let withFY=rows.map(r=>{
      const proj=r.project?state.projects.find(p=>p.id===r.project):null;
      return {...r, _fy:activeMoKeys.reduce((s,m)=>s+(parseFloat(r[m])||0),0), _product:proj?proj.product||'':'', _productType:proj?proj.category||'':''};
    }).filter(r=>r._fy>0);
    // Apply dollar band filter
    const bandRange=parseBand(band);
    if(bandRange)withFY=withFY.filter(r=>r._fy>=bandRange.lo&&r._fy<bandRange.hi);
    // Apply name multi-select filter (vendor name or description)
    if(selectedNames&&selectedNames.size>0&&nameField){
      withFY=withFY.filter(r=>selectedNames.has(r[nameField]||''));
    }
    // Apply notes text search
    if(notesSearch){
      const q=notesSearch.toLowerCase();
      withFY=withFY.filter(r=>(r.notes||'').toLowerCase().includes(q));
    }
    withFY.sort((a,b)=>b._fy-a._fy);
    const topRows=withFY;

    // Build pivot data: rowDim values as rows, colDim values as columns
    const rowVals=[...new Set(topRows.map(r=>r[rowDim]||'(blank)'))];
    const colVals=[...new Set(topRows.map(r=>r[colDim]||'(blank)'))];

    // pivot[rowVal][colVal] = {months: [12], total}
    const pivot={};
    rowVals.forEach(rv=>{pivot[rv]={};colVals.forEach(cv=>{pivot[rv][cv]={months:new Array(12).fill(0),total:0}})});
    topRows.forEach(r=>{
      const rv=r[rowDim]||'(blank)';
      const cv=r[colDim]||'(blank)';
      MO_KEYS.forEach((m,mi)=>{
        const v=parseFloat(r[m])||0;
        pivot[rv][cv].months[mi]+=v;
        // Only add to total if this month is in the active range
        if(!activeMoIdx||activeMoIdx.includes(mi))pivot[rv][cv].total+=v;
      });
    });

    const totalSpend=topRows.reduce((s,r)=>s+r._fy,0);
    return {rowVals,colVals,pivot,topRows,totalSpend,topCount:topRows.length,allCount:rows.length,monthFilter:activeMoIdx};
  }

  // ── Vendor name pills ──
  function renderVendorPills(){
    const search=(document.getElementById('vPivotVendorSearch').value||'').toLowerCase();
    const names=[...new Set((state.vendorRows||[]).map(r=>r.vendorName||'').filter(Boolean))].sort();
    const filtered=search?names.filter(n=>n.toLowerCase().includes(search)):names;
    const el=document.getElementById('vPivotVendorPills');
    el.innerHTML=filtered.map(n=>{
      const active=vPivotSelectedVendors.has(n)?'active':'';
      return `<button class="scen-pill ${active}" data-vname="${esc(n)}">${esc(n)}</button>`;
    }).join('')||'<span style="font-size:.7rem;color:var(--text-dim)">No vendors</span>';
    el.querySelectorAll('.scen-pill').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const name=btn.dataset.vname;
        if(vPivotSelectedVendors.has(name))vPivotSelectedVendors.delete(name);else vPivotSelectedVendors.add(name);
        btn.classList.toggle('active',vPivotSelectedVendors.has(name));
        refreshVendorPivot();
      });
    });
  }

  // ── T&E description pills ──
  function renderTeDescPills(){
    const search=(document.getElementById('tePivotDescSearch').value||'').toLowerCase();
    const descs=[...new Set((state.teRows||[]).map(r=>r.description||'').filter(Boolean))].sort();
    const filtered=search?descs.filter(d=>d.toLowerCase().includes(search)):descs;
    const el=document.getElementById('tePivotDescPills');
    el.innerHTML=filtered.map(d=>{
      const active=tePivotSelectedDescs.has(d)?'active':'';
      return `<button class="scen-pill ${active}" data-dname="${esc(d)}">${esc(d)}</button>`;
    }).join('')||'<span style="font-size:.7rem;color:var(--text-dim)">No descriptions</span>';
    el.querySelectorAll('.scen-pill').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const name=btn.dataset.dname;
        if(tePivotSelectedDescs.has(name))tePivotSelectedDescs.delete(name);else tePivotSelectedDescs.add(name);
        btn.classList.toggle('active',tePivotSelectedDescs.has(name));
        refreshTePivot();
      });
    });
  }

  // ── Band toggle handlers (called from onclick in HTML) ──
  window.toggleVBand=function(btn){
    vPivotBand=btn.dataset.band;
    document.querySelectorAll('#vBandGroup .scen-pill').forEach(b=>b.classList.toggle('active',b.dataset.band===vPivotBand));
    refreshVendorPivot();
  };
  window.toggleTeBand=function(btn){
    tePivotBand=btn.dataset.band;
    document.querySelectorAll('#teBandGroup .scen-pill').forEach(b=>b.classList.toggle('active',b.dataset.band===tePivotBand));
    refreshTePivot();
  };
  // ── Collapsible spend analysis sections (moved to global scope) ──

  window.toggleCrBand=function(btn){
    crPivotBand=btn.dataset.band;
    document.querySelectorAll('#crBandGroup .scen-pill').forEach(b=>b.classList.toggle('active',b.dataset.band===crPivotBand));
    refreshContractorPivot();
  };

  // ── Contractor name pills ──
  function renderContractorPills(){
    const search=(document.getElementById('crPivotNameSearch').value||'').toLowerCase();
    const names=[...new Set((state.contractorRows||[]).map(r=>r.name||'').filter(Boolean))].sort();
    const filtered=search?names.filter(n=>n.toLowerCase().includes(search)):names;
    const el=document.getElementById('crPivotNamePills');
    el.innerHTML=filtered.map(n=>{
      const active=crPivotSelectedNames.has(n)?'active':'';
      return `<button class="scen-pill ${active}" data-cname="${esc(n)}">${esc(n)}</button>`;
    }).join('')||'<span style="font-size:.7rem;color:var(--text-dim)">No contractors</span>';
    el.querySelectorAll('.scen-pill').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const name=btn.dataset.cname;
        if(crPivotSelectedNames.has(name))crPivotSelectedNames.delete(name);else crPivotSelectedNames.add(name);
        btn.classList.toggle('active',crPivotSelectedNames.has(name));
        refreshContractorPivot();
      });
    });
  }

  function renderPivotTable(theadEl, tbodyEl, wrapEl, data, scaleFn){
    const {rowVals,colVals,pivot}=data;
    // Totals row
    const colTotals={};colVals.forEach(cv=>{colTotals[cv]=0;rowVals.forEach(rv=>{colTotals[cv]+=pivot[rv][cv].total})});
    const grandTotal=Object.values(colTotals).reduce((s,v)=>s+v,0);
    // Row totals
    const rowTotals={};rowVals.forEach(rv=>{rowTotals[rv]=colVals.reduce((s,cv)=>s+pivot[rv][cv].total,0)});

    // Thead — totals row first, then header row
    let th='<tr style="font-weight:700;background:var(--panel);position:sticky;top:0;z-index:3"><th style="position:sticky;left:0;z-index:4;background:var(--panel);padding:6px 10px;font-size:.78rem">TOTAL</th>';
    colVals.forEach(cv=>{th+=`<th style="text-align:right;padding:6px 10px;font-size:.78rem;white-space:nowrap">${scaleFn(colTotals[cv])}</th>`});
    th+=`<th style="text-align:right;padding:6px 10px;font-size:.82rem;font-weight:800;white-space:nowrap">${scaleFn(grandTotal)}</th></tr>`;
    th+='<tr style="position:sticky;top:32px;z-index:3"><th style="position:sticky;left:0;z-index:4;background:var(--panel-inset);padding:6px 10px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">Row \\ Col</th>';
    colVals.forEach(cv=>{th+=`<th style="text-align:right;padding:6px 10px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap">${esc(cv)}</th>`});
    th+='<th style="text-align:right;padding:6px 10px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">Row Total</th></tr>';
    theadEl.innerHTML=th;

    // Tbody — sorted by row total desc
    const sortedRows=[...rowVals].sort((a,b)=>rowTotals[b]-rowTotals[a]);
    let tb='';
    sortedRows.forEach(rv=>{
      tb+=`<tr><td style="position:sticky;left:0;z-index:1;background:var(--panel);padding:4px 10px;font-size:.78rem;font-weight:600;white-space:nowrap">${esc(rv)}</td>`;
      colVals.forEach(cv=>{
        const v=pivot[rv][cv].total;
        tb+=`<td style="text-align:right;padding:4px 10px;font-size:.78rem;white-space:nowrap;${v===0?'color:var(--text-dim)':''}">${v===0?'—':scaleFn(v)}</td>`;
      });
      tb+=`<td style="text-align:right;padding:4px 10px;font-size:.78rem;font-weight:700;white-space:nowrap">${scaleFn(rowTotals[rv])}</td></tr>`;
    });
    tbodyEl.innerHTML=tb;
  }

  let vPivotChartInst=null, tePivotChartInst=null, crPivotChartInst=null;

  function renderPivotChart(canvasId, data, chartInstRef, rowDim, nameField){
    if(typeof Chart==='undefined')return null;
    const {rowVals,colVals,pivot,topRows,monthFilter}=data;
    // Determine which months to show on x-axis
    const chartMonthIdx=monthFilter||MO_KEYS.map((_,i)=>i);
    const chartLabels=chartMonthIdx.map(i=>MO_LABELS_SHORT[i]);
    // Monthly stacked bar: x-axis = months, stacks = rowDim values (clustered by colDim)
    // We show monthly totals grouped by the row dimension
    const rowTotals={};rowVals.forEach(rv=>{rowTotals[rv]=chartMonthIdx.reduce((s,mi)=>{
      let moSum=0;colVals.forEach(cv=>{moSum+=pivot[rv][cv].months[mi]});return s+moSum;
    },0)});
    const sortedRows=[...rowVals].sort((a,b)=>rowTotals[b]-rowTotals[a]);
    // Build datasets in reverse so first legend/table row (largest) is at top of stack
    const datasets=[...sortedRows].reverse().map((rv,i)=>{
      const ri=sortedRows.length-1-i;
      return {label:rv,
        data:chartMonthIdx.map(mi=>{let s=0;colVals.forEach(cv=>{s+=pivot[rv][cv].months[mi]});return s}),
        backgroundColor:getChartColors()[ri%getChartColors().length],
        stack:'stack0'};
    });

    // Build a lookup: for each rowDim value + month index, list the distinct vendor/description names
    const showNames=nameField&&rowDim!==nameField;
    const namesByRowMonth={};
    if(showNames){
      topRows.forEach(r=>{
        const rv=r[rowDim]||'(blank)';
        const name=r[nameField]||'';
        if(!name)return;
        chartMonthIdx.forEach((mi,di)=>{
          const m=MO_KEYS[mi];
          if((parseFloat(r[m])||0)>0){
            const key=rv+'|'+di;
            if(!namesByRowMonth[key])namesByRowMonth[key]=new Set();
            namesByRowMonth[key].add(name);
          }
        });
      });
    }

    const canvas=document.getElementById(canvasId);
    const ctx=canvas.getContext('2d');
    if(chartInstRef)chartInstRef.destroy();
    const _isDark=document.documentElement.classList.contains('dark');
    const _tickC=_isDark?(window.chartColorScheme==='crisp'?'#c0c0c0':window.chartColorScheme==='neon'?'#88ccdd':'#aaaaaa'):(window.chartColorScheme==='crisp'?'#333333':window.chartColorScheme==='neon'?'#006680':'#5a5a5a');
    const _gridC=_isDark?'rgba(255,255,255,.08)':'#ddd';
    return new Chart(ctx,{
      type:'bar',
      data:{labels:chartLabels,datasets},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:10},color:_tickC}},
          datalabels:{display:false},
          title:{display:true,text:'Monthly Spend by '+rowDim.replace(/([A-Z])/g,' $1').replace(/^\w/,c=>c.toUpperCase()),font:{size:13},color:_tickC},
          tooltip:{
            callbacks:{
              afterBody:function(items){
                if(!showNames||!items.length)return '';
                const item=items[0];
                const rv=item.dataset.label;
                const mi=item.dataIndex;
                const key=rv+'|'+mi;
                const names=namesByRowMonth[key];
                if(!names||!names.size)return '';
                const abbr=n=>n.length>28?n.slice(0,26)+'…':n;
                const list=[...names].sort().map(abbr);
                return list.length>12?list.slice(0,12).concat('+'+(list.length-12)+' more'):list;
              }
            },
            bodyFont:{size:10},
            footerFont:{size:9}
          }
        },
        scales:{
          x:{stacked:true,ticks:{font:{size:10},color:_tickC},grid:{color:_gridC}},
          y:{stacked:true,ticks:{font:{size:10},color:_tickC,callback:function(v){return v>=100000?'$'+(v/1000000).toFixed(2)+'M':v>=1000?'$'+(v/1000).toFixed(0)+'K':'$'+v.toLocaleString()}},grid:{color:_gridC}}
        }
      }
    });
  }

  function refreshVendorPivot(){
    const rowDim=document.getElementById('vPivotRowDim').value;
    const colDim=document.getElementById('vPivotColDim').value;
    const notesSearch=document.getElementById('vPivotNotesSearch').value.trim();
    const filters={band:vPivotBand,selectedNames:vPivotSelectedVendors,nameField:'vendorName',notesSearch,monthFilter:vendorSelectedMonths};
    const data=buildPivot(state.vendorRows||[],rowDim,colDim,filters);
    renderVendorPills();
    if(!data.topRows.length){
      document.getElementById('vPivotThead').innerHTML='';
      document.getElementById('vPivotTbody').innerHTML='<tr><td style="padding:12px;color:var(--text-dim)">No vendor spend data matching filters</td></tr>';
      if(vPivotChartInst){vPivotChartInst.destroy();vPivotChartInst=null}
      return;
    }
    renderPivotTable(document.getElementById('vPivotThead'),document.getElementById('vPivotTbody'),document.getElementById('vPivotWrap'),data,fmtScaled);
    vPivotChartInst=renderPivotChart('vPivotChart',data,vPivotChartInst,rowDim,'vendorName');
  }

  function refreshTePivot(){
    const rowDim=document.getElementById('tePivotRowDim').value;
    const colDim=document.getElementById('tePivotColDim').value;
    const notesSearch=document.getElementById('tePivotNotesSearch').value.trim();
    const filters={band:tePivotBand,selectedNames:tePivotSelectedDescs,nameField:'description',notesSearch,monthFilter:teSelectedMonths};
    const data=buildPivot(state.teRows||[],rowDim,colDim,filters);
    renderTeDescPills();
    if(!data.topRows.length){
      document.getElementById('tePivotThead').innerHTML='';
      document.getElementById('tePivotTbody').innerHTML='<tr><td style="padding:12px;color:var(--text-dim)">No T&amp;E spend data matching filters</td></tr>';
      if(tePivotChartInst){tePivotChartInst.destroy();tePivotChartInst=null}
      return;
    }
    renderPivotTable(document.getElementById('tePivotThead'),document.getElementById('tePivotTbody'),document.getElementById('tePivotWrap'),data,fmtScaled);
    tePivotChartInst=renderPivotChart('tePivotChart',data,tePivotChartInst,rowDim,'expenseType');
  }

  function refreshContractorPivot(){
    const rowDim=document.getElementById('crPivotRowDim').value;
    const colDim=document.getElementById('crPivotColDim').value;
    const notesSearch=document.getElementById('crPivotNotesSearch').value.trim();
    const filters={band:crPivotBand,selectedNames:crPivotSelectedNames,nameField:'name',notesSearch,monthFilter:contractorSelectedMonths};
    const data=buildPivot(state.contractorRows||[],rowDim,colDim,filters);
    renderContractorPills();
    if(!data.topRows.length){
      document.getElementById('crPivotThead').innerHTML='';
      document.getElementById('crPivotTbody').innerHTML='<tr><td style="padding:12px;color:var(--text-dim)">No contractor spend data matching filters</td></tr>';
      if(crPivotChartInst){crPivotChartInst.destroy();crPivotChartInst=null}
      return;
    }
    renderPivotTable(document.getElementById('crPivotThead'),document.getElementById('crPivotTbody'),document.getElementById('crPivotWrap'),data,fmtScaled);
    crPivotChartInst=renderPivotChart('crPivotChart',data,crPivotChartInst,rowDim,'name');
  }

  // ── Pivot Row Selection & Refinement ──
  let vPivotSelectedRows=new Set(), tePivotSelectedRows=new Set(), crPivotSelectedRows=new Set();
  let vPivotAppliedAdjs=[], tePivotAppliedAdjs=[], crPivotAppliedAdjs=[]; // {id, rowDim, rowVal, pct, preDelta, rows affected}

  function bindPivotRowClicks(tbodyEl, selectedSet, adjBarId){
    tbodyEl.querySelectorAll('tr').forEach(tr=>{
      tr.classList.add('pivot-row-sel');
      tr.addEventListener('click',()=>{
        const rv=tr.dataset.rowval;
        if(!rv)return;
        if(selectedSet.has(rv))selectedSet.delete(rv);else selectedSet.add(rv);
        tr.classList.toggle('selected',selectedSet.has(rv));
        document.getElementById(adjBarId).style.display=selectedSet.size?'flex':'none';
      });
    });
  }

  // Override renderPivotTable to add data-rowval and bind clicks
  const _origRenderPivotTable=renderPivotTable;
  renderPivotTable=function(theadEl, tbodyEl, wrapEl, data, scaleFn){
    _origRenderPivotTable(theadEl, tbodyEl, wrapEl, data, scaleFn);
    // Add data-rowval to each body row
    const sortedRows=[...data.rowVals].sort((a,b)=>{
      const ra=data.colVals.reduce((s,cv)=>s+data.pivot[a][cv].total,0);
      const rb=data.colVals.reduce((s,cv)=>s+data.pivot[b][cv].total,0);
      return rb-ra;
    });
    tbodyEl.querySelectorAll('tr').forEach((tr,i)=>{
      if(sortedRows[i])tr.dataset.rowval=sortedRows[i];
    });
  };

  function applyPivotAdj(dataRows, rowDim, selectedSet, pctInput, adjList, impactId, renderFn, scaleFn){
    const pct=parseFloat(document.getElementById(pctInput).value)||10;
    if(pct<=0||pct>100)return;
    // Snapshot before
    const MO=MO_KEYS;
    const beforeTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);

    const affected=[];
    dataRows.forEach((r,i)=>{
      const rv=r[rowDim]||'(blank)';
      if(!selectedSet.has(rv))return;
      const before=MO.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
      MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1-pct/100))});
      const after=MO.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
      affected.push({idx:i,before,after});
    });

    const afterTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    const delta=afterTotal-beforeTotal;

    const adj={id:Date.now(),rowDim,selectedVals:[...selectedSet],pct,delta,affectedCount:affected.length,active:true};
    adjList.push(adj);

    saveState();
    renderFn();

    // Show impact
    showPivotImpact(impactId, adj, scaleFn, adjList, dataRows, rowDim, renderFn);
    selectedSet.clear();
    document.querySelectorAll('.pivot-row-sel.selected').forEach(tr=>tr.classList.remove('selected'));
  }

  function showPivotImpact(impactId, latestAdj, scaleFn, adjList, dataRows, rowDim, renderFn){
    const el=document.getElementById(impactId);
    el.style.display='block';
    let html='<div style="font-weight:600;margin-bottom:6px;font-size:.8rem">Applied Refinements</div>';
    adjList.forEach((adj,ai)=>{
      const cls=adj.delta<0?'negative':adj.delta>0?'positive':'neutral';
      const sign=adj.delta<0?'':'+'
      const toggleLabel=adj.active?'Undo':'Re-apply';
      html+=`<div class="pivot-impact ${cls}" style="margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div>
          <strong>${adj.selectedVals.join(', ')}</strong> — cut ${adj.pct}% (${adj.affectedCount} rows)
          <span style="font-weight:700;margin-left:6px">${sign}${scaleFn(adj.delta)}</span>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm pivot-adj-toggle" data-adjidx="${ai}" style="padding:2px 8px;font-size:.7rem">${toggleLabel}</button>
          <button class="btn btn-sm pivot-adj-override" data-adjidx="${ai}" style="padding:2px 8px;font-size:.7rem">Override</button>
        </div>
      </div>`;
    });
    el.innerHTML=html;

    // Bind toggle buttons
    el.querySelectorAll('.pivot-adj-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=parseInt(btn.dataset.adjidx);
        const adj=adjList[idx];
        if(!adj)return;
        // Toggle: undo or re-apply
        const factor=adj.active?(1/(1-adj.pct/100))-1:-(adj.pct/100);
        const MO=MO_KEYS;
        const beforeTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
        dataRows.forEach(r=>{
          const rv=r[rowDim]||'(blank)';
          if(!adj.selectedVals.includes(rv))return;
          if(adj.active){
            // Undo: multiply back up
            MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)/(1-adj.pct/100))});
          } else {
            // Re-apply
            MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1-adj.pct/100))});
          }
        });
        const afterTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
        adj.active=!adj.active;
        adj.delta=adj.active?-(afterTotal-beforeTotal+adj.delta-adj.delta):(afterTotal-beforeTotal);
        // Recalculate delta accurately
        adj.delta=afterTotal-beforeTotal;
        saveState();
        renderFn();
        showPivotImpact(impactId, adj, scaleFn, adjList, dataRows, rowDim, renderFn);
      });
    });

    // Bind override buttons — first show the impact, then allow re-adjusting
    el.querySelectorAll('.pivot-adj-override').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=parseInt(btn.dataset.adjidx);
        const adj=adjList[idx];
        if(!adj||!adj.active)return;
        // First show current impact before allowing override
        const MO=MO_KEYS;
        const currentImpact=adj.delta;
        const overridePct=prompt(`Current refinement: cut ${adj.pct}% (impact: ${scaleFn(currentImpact)}).\n\nEnter new cut % to override (will undo previous first):`);
        if(!overridePct||isNaN(parseFloat(overridePct)))return;
        const newPct=parseFloat(overridePct);
        if(newPct<=0||newPct>100)return;
        // Undo old adjustment
        dataRows.forEach(r=>{
          const rv=r[rowDim]||'(blank)';
          if(!adj.selectedVals.includes(rv))return;
          MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)/(1-adj.pct/100))});
        });
        // Apply new
        const beforeTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
        dataRows.forEach(r=>{
          const rv=r[rowDim]||'(blank)';
          if(!adj.selectedVals.includes(rv))return;
          MO.forEach(m=>{r[m]=Math.round((parseFloat(r[m])||0)*(1-newPct/100))});
        });
        const afterTotal=dataRows.reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
        adj.pct=newPct;
        adj.delta=afterTotal-beforeTotal;
        saveState();
        renderFn();
        showPivotImpact(impactId, adj, scaleFn, adjList, dataRows, rowDim, renderFn);
      });
    });
  }

  // Override refresh functions to bind clicks
  const _origRefreshVendorPivot=refreshVendorPivot;
  refreshVendorPivot=function(){
    _origRefreshVendorPivot();
    const rowDim=document.getElementById('vPivotRowDim').value;
    bindPivotRowClicks(document.getElementById('vPivotTbody'),vPivotSelectedRows,'vPivotAdjBar');
    // Restore selection highlight
    document.getElementById('vPivotTbody').querySelectorAll('tr').forEach(tr=>{
      if(vPivotSelectedRows.has(tr.dataset.rowval))tr.classList.add('selected');
    });
    document.getElementById('vPivotAdjBar').style.display=vPivotSelectedRows.size?'flex':'none';
  };
  const _origRefreshTePivot=refreshTePivot;
  refreshTePivot=function(){
    _origRefreshTePivot();
    bindPivotRowClicks(document.getElementById('tePivotTbody'),tePivotSelectedRows,'tePivotAdjBar');
    document.getElementById('tePivotTbody').querySelectorAll('tr').forEach(tr=>{
      if(tePivotSelectedRows.has(tr.dataset.rowval))tr.classList.add('selected');
    });
    document.getElementById('tePivotAdjBar').style.display=tePivotSelectedRows.size?'flex':'none';
  };

  // Wire adjustment buttons
  document.getElementById('vPivotAdjApply').addEventListener('click',()=>{
    const rowDim=document.getElementById('vPivotRowDim').value;
    applyPivotAdj(state.vendorRows,rowDim,vPivotSelectedRows,'vPivotAdjPct',vPivotAppliedAdjs,'vPivotImpact',()=>{renderVendorGrid();refreshVendorPivot()},fmtScaled);
    document.getElementById('vPivotAdjBar').style.display='none';
  });
  document.getElementById('vPivotAdjClear').addEventListener('click',()=>{
    vPivotSelectedRows.clear();
    document.querySelectorAll('#vPivotTbody .pivot-row-sel').forEach(tr=>tr.classList.remove('selected'));
    document.getElementById('vPivotAdjBar').style.display='none';
  });

  document.getElementById('tePivotAdjApply').addEventListener('click',()=>{
    const rowDim=document.getElementById('tePivotRowDim').value;
    applyPivotAdj(state.teRows,rowDim,tePivotSelectedRows,'tePivotAdjPct',tePivotAppliedAdjs,'tePivotImpact',()=>{renderTeGrid();refreshTePivot()},fmtScaled);
    document.getElementById('tePivotAdjBar').style.display='none';
  });
  document.getElementById('tePivotAdjClear').addEventListener('click',()=>{
    tePivotSelectedRows.clear();
    document.querySelectorAll('#tePivotTbody .pivot-row-sel').forEach(tr=>tr.classList.remove('selected'));
    document.getElementById('tePivotAdjBar').style.display='none';
  });

  // Contractor pivot row selection override
  const _origRefreshContractorPivot=refreshContractorPivot;
  refreshContractorPivot=function(){
    _origRefreshContractorPivot();
    bindPivotRowClicks(document.getElementById('crPivotTbody'),crPivotSelectedRows,'crPivotAdjBar');
    document.getElementById('crPivotTbody').querySelectorAll('tr').forEach(tr=>{
      if(crPivotSelectedRows.has(tr.dataset.rowval))tr.classList.add('selected');
    });
    document.getElementById('crPivotAdjBar').style.display=crPivotSelectedRows.size?'flex':'none';
  };

  document.getElementById('crPivotAdjApply').addEventListener('click',()=>{
    const rowDim=document.getElementById('crPivotRowDim').value;
    applyPivotAdj(state.contractorRows,rowDim,crPivotSelectedRows,'crPivotAdjPct',crPivotAppliedAdjs,'crPivotImpact',()=>{renderContractorGrid();refreshContractorPivot()},fmtScaled);
    document.getElementById('crPivotAdjBar').style.display='none';
  });
  document.getElementById('crPivotAdjClear').addEventListener('click',()=>{
    crPivotSelectedRows.clear();
    document.querySelectorAll('#crPivotTbody .pivot-row-sel').forEach(tr=>tr.classList.remove('selected'));
    document.getElementById('crPivotAdjBar').style.display='none';
  });

  document.getElementById('vPivotRefresh').addEventListener('click',refreshVendorPivot);
  document.getElementById('vPivotRowDim').addEventListener('change',refreshVendorPivot);
  document.getElementById('vPivotColDim').addEventListener('change',refreshVendorPivot);
  document.getElementById('vPivotVendorSearch').addEventListener('input',renderVendorPills);
  document.getElementById('vPivotNotesSearch').addEventListener('input',refreshVendorPivot);

  document.getElementById('tePivotRefresh').addEventListener('click',refreshTePivot);
  document.getElementById('tePivotRowDim').addEventListener('change',refreshTePivot);
  document.getElementById('tePivotColDim').addEventListener('change',refreshTePivot);
  document.getElementById('tePivotDescSearch').addEventListener('input',renderTeDescPills);
  document.getElementById('tePivotNotesSearch').addEventListener('input',refreshTePivot);

  document.getElementById('crPivotRefresh').addEventListener('click',refreshContractorPivot);
  document.getElementById('crPivotRowDim').addEventListener('change',refreshContractorPivot);
  document.getElementById('crPivotColDim').addEventListener('change',refreshContractorPivot);
  document.getElementById('crPivotNameSearch').addEventListener('input',renderContractorPills);
  document.getElementById('crPivotNotesSearch').addEventListener('input',refreshContractorPivot);

  // ── Quick-Adjust Panels (Vendor & T&E) ──
  const QA_MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const QA_MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let vendorQaUndoStack=[], teQaUndoStack=[];
  let vendorQaHistory=[], teQaHistory=[];

  function qaFmt(v){
    const abs=Math.abs(v);
    if(abs>=1e6)return (v<0?'-':'')+'$'+((abs/1e6).toFixed(abs%1e6===0?0:1))+'M';
    if(abs>=1e3)return (v<0?'-':'')+'$'+((abs/1e3).toFixed(abs%1e3===0?0:1))+'K';
    return '$'+v.toLocaleString();
  }

  // Vendor QA: toggle panel open/close
  document.getElementById('vendorQaToggle').addEventListener('click',()=>{
    document.getElementById('vendorQaPanel').classList.toggle('open');
    if(document.getElementById('vendorQaPanel').classList.contains('open'))renderVendorQaList();
  });
  // T&E QA: toggle panel
  document.getElementById('teQaToggle').addEventListener('click',()=>{
    document.getElementById('teQaPanel').classList.toggle('open');
    if(document.getElementById('teQaPanel').classList.contains('open'))renderTeQaList();
  });
  // Contractor QA: toggle panel
  document.getElementById('contractorQaToggle').addEventListener('click',()=>{
    document.getElementById('contractorQaPanel').classList.toggle('open');
    if(document.getElementById('contractorQaPanel').classList.contains('open'))renderContractorQaList();
  });

  // Populate add-form dropdowns
  function populateVendorQaDropdowns(){
    const vtSel=document.getElementById('vendorQaNewType');
    vtSel.innerHTML='<option value="">—</option>'+VENDOR_TYPES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    const buOpts=Object.values(COUNTRY_BU).filter((v,i,a)=>a.indexOf(v)===i);
    const buSel=document.getElementById('vendorQaNewBU');
    buSel.innerHTML='<option value="">—</option>'+buOpts.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const acctSel=document.getElementById('vendorQaNewAcct');
    acctSel.innerHTML='<option value="">—</option>'+state.accounts.filter(a=>(a.group||'vendor')==='vendor').map(a=>`<option value="${esc(a.description)}">${esc(a.description)}</option>`).join('');
  }
  function populateTeQaDropdowns(){
    const etSel=document.getElementById('teQaNewType');
    etSel.innerHTML='<option value="">—</option>'+EXPENSE_TYPES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    const buOpts=Object.values(COUNTRY_BU).filter((v,i,a)=>a.indexOf(v)===i);
    const buSel=document.getElementById('teQaNewBU');
    buSel.innerHTML='<option value="">—</option>'+buOpts.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const acctSel=document.getElementById('teQaNewAcct');
    acctSel.innerHTML='<option value="">—</option>'+state.accounts.filter(a=>(a.group||'vendor')==='te').map(a=>`<option value="${esc(a.description)}">${esc(a.description)}</option>`).join('');
  }

  // Render vendor quick-adjust list
  function renderVendorQaList(){
    populateVendorQaDropdowns();
    const search=(document.getElementById('vendorQaSearch').value||'').toLowerCase();
    const moSel=document.getElementById('vendorQaMo').value;
    const rows=state.vendorRows||[];
    // Group by vendorName (aggregate rows with same name)
    const grouped={};
    rows.forEach((r,idx)=>{
      const name=r.vendorName||'(unnamed)';
      if(search&&!name.toLowerCase().includes(search)&&!(r.parentCo||'').toLowerCase().includes(search)&&!(r.vendorType||'').toLowerCase().includes(search))return;
      if(!grouped[name])grouped[name]={indices:[],fy:0,moAmts:{}};
      grouped[name].indices.push(idx);
      QA_MO.forEach(m=>{
        grouped[name].moAmts[m]=(grouped[name].moAmts[m]||0)+(parseFloat(r[m])||0);
      });
      const vActiveMo=vendorSelectedMonths.size>0?QA_MO.filter((_,i)=>vendorSelectedMonths.has(i)):QA_MO;
      grouped[name].fy+=vActiveMo.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
    });
    const list=document.getElementById('vendorQaList');
    const entries=Object.entries(grouped).sort((a,b)=>b[1].fy-a[1].fy);
    if(!entries.length){list.innerHTML='<div style="padding:12px;color:var(--text-dim);font-size:.8rem;text-align:center">No vendors found</div>';updateVendorQaTotal();return}
    const vRangeLabel=vendorSelectedMonths.size>0&&vendorSelectedMonths.size<12?'Range':'FY';
    let h='';
    entries.forEach(([name,g])=>{
      const displayAmt=moSel==='all'?g.fy:(g.moAmts[moSel]||0);
      const moLabel=moSel==='all'?vRangeLabel:QA_MO_LABELS[QA_MO.indexOf(moSel)];
      h+=`<div class="qa-row-item" data-qa-name="${esc(name)}">
        <span class="qa-row-name" title="${esc(name)}">${esc(name)}</span>
        <span class="qa-row-fy">${moLabel}: ${qaFmt(displayAmt)}</span>
        <div class="qa-mo-adj">
          <button class="qa-dec-btn" data-qa-name="${esc(name)}" data-dir="-1" title="Decrease">−</button>
          <button class="qa-inc-btn" data-qa-name="${esc(name)}" data-dir="1" title="Increase">+</button>
        </div>
      </div>`;
    });
    list.innerHTML=h;
    // Bind +/- buttons
    list.querySelectorAll('.qa-inc-btn,.qa-dec-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const vName=btn.dataset.qaName;
        const dir=parseInt(btn.dataset.dir);
        const step=parseInt(document.getElementById('vendorQaStep').value)||5000;
        if(step%5000!==0)return;
        const mo=document.getElementById('vendorQaMo').value;
        // Save undo
        vendorQaUndoStack.push(JSON.parse(JSON.stringify(state.vendorRows)));
        document.getElementById('vendorQaUndo').style.display='';
        const g=grouped[vName];
        if(!g)return;
        const targetMos=mo==='all'?(vendorSelectedMonths.size>0?QA_MO.filter((_,i)=>vendorSelectedMonths.has(i)):QA_MO):[mo];
        // Distribute evenly across matching rows
        const perRow=Math.round((step*dir)/g.indices.length);
        g.indices.forEach(idx=>{
          targetMos.forEach(m=>{
            state.vendorRows[idx][m]=Math.round((parseFloat(state.vendorRows[idx][m])||0)+perRow);
          });
        });
        const moLabel=mo==='all'?(vendorSelectedMonths.size>0?targetMos.map(m=>QA_MO_LABELS[QA_MO.indexOf(m)]).join(', '):'all months'):QA_MO_LABELS[QA_MO.indexOf(mo)];
        vendorQaHistory.unshift(`${dir>0?'+':''}${qaFmt(step*dir)} → ${vName} (${moLabel})`);
        if(vendorQaHistory.length>20)vendorQaHistory.pop();
        saveState();renderVendorQaList();renderVendorGrid();refreshVendorPivot();renderPnlWalk();renderLandingCharts();
      });
    });
    updateVendorQaTotal();
    renderVendorQaHistoryList();
  }
  function updateVendorQaTotal(){
    const activeMo=vendorSelectedMonths.size>0?QA_MO.filter((_,i)=>vendorSelectedMonths.has(i)):QA_MO;
    const total=(state.vendorRows||[]).reduce((s,r)=>s+activeMo.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    const label=vendorSelectedMonths.size>0&&vendorSelectedMonths.size<12?'Filtered Vendor Spend':'Total Vendor Spend';
    document.getElementById('vendorQaTotal').textContent=qaFmt(total);
  }
  function renderVendorQaHistoryList(){
    const el=document.getElementById('vendorQaHistory');
    el.innerHTML=vendorQaHistory.map(h=>`<div class="qa-history-item">${esc(h)}</div>`).join('');
  }

  // Vendor QA: undo
  document.getElementById('vendorQaUndo').addEventListener('click',()=>{
    if(!vendorQaUndoStack.length)return;
    state.vendorRows=vendorQaUndoStack.pop();
    if(vendorQaHistory.length)vendorQaHistory.shift();
    if(!vendorQaUndoStack.length)document.getElementById('vendorQaUndo').style.display='none';
    saveState();renderVendorQaList();renderVendorGrid();refreshVendorPivot();renderPnlWalk();renderLandingCharts();
  });

  // Vendor QA: add new vendor
  document.getElementById('vendorQaAddBtn').addEventListener('click',()=>{
    const name=document.getElementById('vendorQaNewName').value.trim();
    if(!name){alert('Enter a vendor name');return}
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const row={parentCo:'',vendorName:name,vendorType:document.getElementById('vendorQaNewType').value,businessUnit:document.getElementById('vendorQaNewBU').value,bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:document.getElementById('vendorQaNewAcct').value,notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
    state.vendorRows.push(row);
    vendorQaHistory.unshift('Added: '+name);
    document.getElementById('vendorQaNewName').value='';
    saveState();renderVendorQaList();renderVendorGrid();refreshVendorPivot();
  });

  // Vendor QA: search filter
  document.getElementById('vendorQaSearch').addEventListener('input',renderVendorQaList);
  document.getElementById('vendorQaMo').addEventListener('change',renderVendorQaList);

  // ── T&E Quick-Adjust ──
  function renderTeQaList(){
    populateTeQaDropdowns();
    const search=(document.getElementById('teQaSearch').value||'').toLowerCase();
    const moSel=document.getElementById('teQaMo').value;
    const rows=state.teRows||[];
    const grouped={};
    rows.forEach((r,idx)=>{
      const name=(r.expenseType?r.expenseType+': ':'')+(r.description||'(unnamed)');
      if(search&&!name.toLowerCase().includes(search)&&!(r.expenseType||'').toLowerCase().includes(search))return;
      if(!grouped[name])grouped[name]={indices:[],fy:0,moAmts:{}};
      grouped[name].indices.push(idx);
      QA_MO.forEach(m=>{
        grouped[name].moAmts[m]=(grouped[name].moAmts[m]||0)+(parseFloat(r[m])||0);
      });
      const tActiveMo=teSelectedMonths.size>0?QA_MO.filter((_,i)=>teSelectedMonths.has(i)):QA_MO;
      grouped[name].fy+=tActiveMo.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
    });
    const list=document.getElementById('teQaList');
    const entries=Object.entries(grouped).sort((a,b)=>b[1].fy-a[1].fy);
    if(!entries.length){list.innerHTML='<div style="padding:12px;color:var(--text-dim);font-size:.8rem;text-align:center">No T&amp;E entries found</div>';updateTeQaTotal();return}
    const tRangeLabel=teSelectedMonths.size>0&&teSelectedMonths.size<12?'Range':'FY';
    let h='';
    entries.forEach(([name,g])=>{
      const displayAmt=moSel==='all'?g.fy:(g.moAmts[moSel]||0);
      const moLabel=moSel==='all'?tRangeLabel:QA_MO_LABELS[QA_MO.indexOf(moSel)];
      h+=`<div class="qa-row-item" data-qa-name="${esc(name)}">
        <span class="qa-row-name" title="${esc(name)}">${esc(name)}</span>
        <span class="qa-row-fy">${moLabel}: ${qaFmt(displayAmt)}</span>
        <div class="qa-mo-adj">
          <button class="qa-dec-btn" data-qa-name="${esc(name)}" data-dir="-1" title="Decrease">−</button>
          <button class="qa-inc-btn" data-qa-name="${esc(name)}" data-dir="1" title="Increase">+</button>
        </div>
      </div>`;
    });
    list.innerHTML=h;
    list.querySelectorAll('.qa-inc-btn,.qa-dec-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const vName=btn.dataset.qaName;
        const dir=parseInt(btn.dataset.dir);
        const step=parseInt(document.getElementById('teQaStep').value)||5000;
        if(step%5000!==0)return;
        const mo=document.getElementById('teQaMo').value;
        teQaUndoStack.push(JSON.parse(JSON.stringify(state.teRows)));
        document.getElementById('teQaUndo').style.display='';
        const g=grouped[vName];
        if(!g)return;
        const targetMos=mo==='all'?(teSelectedMonths.size>0?QA_MO.filter((_,i)=>teSelectedMonths.has(i)):QA_MO):[mo];
        const perRow=Math.round((step*dir)/g.indices.length);
        g.indices.forEach(idx=>{
          targetMos.forEach(m=>{
            state.teRows[idx][m]=Math.round((parseFloat(state.teRows[idx][m])||0)+perRow);
          });
        });
        const moLabel=mo==='all'?(teSelectedMonths.size>0?targetMos.map(m=>QA_MO_LABELS[QA_MO.indexOf(m)]).join(', '):'all months'):QA_MO_LABELS[QA_MO.indexOf(mo)];
        teQaHistory.unshift(`${dir>0?'+':''}${qaFmt(step*dir)} → ${vName} (${moLabel})`);
        if(teQaHistory.length>20)teQaHistory.pop();
        saveState();renderTeQaList();renderTeGrid();refreshTePivot();renderPnlWalk();renderLandingCharts();
      });
    });
    updateTeQaTotal();
    renderTeQaHistoryList();
  }
  function updateTeQaTotal(){
    const activeMo=teSelectedMonths.size>0?QA_MO.filter((_,i)=>teSelectedMonths.has(i)):QA_MO;
    const total=(state.teRows||[]).reduce((s,r)=>s+activeMo.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    document.getElementById('teQaTotal').textContent=qaFmt(total);
  }
  function renderTeQaHistoryList(){
    const el=document.getElementById('teQaHistory');
    el.innerHTML=teQaHistory.map(h=>`<div class="qa-history-item">${esc(h)}</div>`).join('');
  }

  // T&E QA: undo
  document.getElementById('teQaUndo').addEventListener('click',()=>{
    if(!teQaUndoStack.length)return;
    state.teRows=teQaUndoStack.pop();
    if(teQaHistory.length)teQaHistory.shift();
    if(!teQaUndoStack.length)document.getElementById('teQaUndo').style.display='none';
    saveState();renderTeQaList();renderTeGrid();refreshTePivot();renderPnlWalk();renderLandingCharts();
  });

  // T&E QA: add new entry
  document.getElementById('teQaAddBtn').addEventListener('click',()=>{
    const eType=document.getElementById('teQaNewType').value;
    const desc=document.getElementById('teQaNewDesc').value.trim();
    if(!desc&&!eType){alert('Enter an expense type or description');return}
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const row={expenseType:eType,description:desc,businessUnit:document.getElementById('teQaNewBU').value,bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:document.getElementById('teQaNewAcct').value,notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
    state.teRows.push(row);
    teQaHistory.unshift('Added: '+(eType?eType+': ':'')+desc);
    document.getElementById('teQaNewDesc').value='';
    saveState();renderTeQaList();renderTeGrid();refreshTePivot();
  });

  // T&E QA: search filter
  document.getElementById('teQaSearch').addEventListener('input',renderTeQaList);
  document.getElementById('teQaMo').addEventListener('change',renderTeQaList);

  // ── Contractor Quick-Adjust ──
  let contractorQaUndoStack=[], contractorQaHistory=[];

  function populateContractorQaDropdowns(){
    const buOpts=Object.values(COUNTRY_BU).filter((v,i,a)=>a.indexOf(v)===i);
    const buSel=document.getElementById('contractorQaNewBU');
    buSel.innerHTML='<option value="">—</option>'+buOpts.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const acctSel=document.getElementById('contractorQaNewAcct');
    acctSel.innerHTML='<option value="">—</option>'+state.accounts.filter(a=>(a.group||'vendor')==='vendor').map(a=>`<option value="${esc(a.description)}">${esc(a.description)}</option>`).join('');
  }

  function renderContractorQaList(){
    populateContractorQaDropdowns();
    const search=(document.getElementById('contractorQaSearch').value||'').toLowerCase();
    const moSel=document.getElementById('contractorQaMo').value;
    const rows=state.contractorRows||[];
    const grouped={};
    rows.forEach((r,idx)=>{
      const name=r.name||'(unnamed)';
      if(search&&!name.toLowerCase().includes(search))return;
      if(!grouped[name])grouped[name]={indices:[],fy:0,moAmts:{}};
      grouped[name].indices.push(idx);
      QA_MO.forEach(m=>{
        grouped[name].moAmts[m]=(grouped[name].moAmts[m]||0)+(parseFloat(r[m])||0);
      });
      const cActiveMo=contractorSelectedMonths.size>0?QA_MO.filter((_,i)=>contractorSelectedMonths.has(i)):QA_MO;
      grouped[name].fy+=cActiveMo.reduce((s,m)=>s+(parseFloat(r[m])||0),0);
    });
    const list=document.getElementById('contractorQaList');
    const entries=Object.entries(grouped).sort((a,b)=>b[1].fy-a[1].fy);
    if(!entries.length){list.innerHTML='<div style="padding:12px;color:var(--text-dim);font-size:.8rem;text-align:center">No contractors found</div>';updateContractorQaTotal();return}
    const cRangeLabel=contractorSelectedMonths.size>0&&contractorSelectedMonths.size<12?'Range':'FY';
    let h='';
    entries.forEach(([name,g])=>{
      const displayAmt=moSel==='all'?g.fy:(g.moAmts[moSel]||0);
      const moLabel=moSel==='all'?cRangeLabel:QA_MO_LABELS[QA_MO.indexOf(moSel)];
      h+=`<div class="qa-row-item" data-qa-name="${esc(name)}">
        <span class="qa-row-name" title="${esc(name)}">${esc(name)}</span>
        <span class="qa-row-fy">${moLabel}: ${qaFmt(displayAmt)}</span>
        <div class="qa-mo-adj">
          <button class="qa-dec-btn" data-qa-name="${esc(name)}" data-dir="-1" title="Decrease">−</button>
          <button class="qa-inc-btn" data-qa-name="${esc(name)}" data-dir="1" title="Increase">+</button>
        </div>
      </div>`;
    });
    list.innerHTML=h;
    list.querySelectorAll('.qa-inc-btn,.qa-dec-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const vName=btn.dataset.qaName;
        const dir=parseInt(btn.dataset.dir);
        const step=parseInt(document.getElementById('contractorQaStep').value)||5000;
        if(step%5000!==0)return;
        const mo=document.getElementById('contractorQaMo').value;
        contractorQaUndoStack.push(JSON.parse(JSON.stringify(state.contractorRows)));
        document.getElementById('contractorQaUndo').style.display='';
        const g=grouped[vName];
        if(!g)return;
        const targetMos=mo==='all'?(contractorSelectedMonths.size>0?QA_MO.filter((_,i)=>contractorSelectedMonths.has(i)):QA_MO):[mo];
        const perRow=Math.round((step*dir)/g.indices.length);
        g.indices.forEach(idx=>{
          targetMos.forEach(m=>{
            state.contractorRows[idx][m]=Math.round((parseFloat(state.contractorRows[idx][m])||0)+perRow);
          });
        });
        const moLabel=mo==='all'?(contractorSelectedMonths.size>0?targetMos.map(m=>QA_MO_LABELS[QA_MO.indexOf(m)]).join(', '):'all months'):QA_MO_LABELS[QA_MO.indexOf(mo)];
        contractorQaHistory.unshift(`${dir>0?'+':''}${qaFmt(step*dir)} → ${vName} (${moLabel})`);
        if(contractorQaHistory.length>20)contractorQaHistory.pop();
        saveState();renderContractorQaList();renderContractorGrid();refreshContractorPivot();renderPnlWalk();renderLandingCharts();
      });
    });
    updateContractorQaTotal();
    renderContractorQaHistoryList();
  }
  function updateContractorQaTotal(){
    const activeMo=contractorSelectedMonths.size>0?QA_MO.filter((_,i)=>contractorSelectedMonths.has(i)):QA_MO;
    const total=(state.contractorRows||[]).reduce((s,r)=>s+activeMo.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    document.getElementById('contractorQaTotal').textContent=qaFmt(total);
  }
  function renderContractorQaHistoryList(){
    const el=document.getElementById('contractorQaHistory');
    el.innerHTML=contractorQaHistory.map(h=>`<div class="qa-history-item">${esc(h)}</div>`).join('');
  }

  // Contractor QA: undo
  document.getElementById('contractorQaUndo').addEventListener('click',()=>{
    if(!contractorQaUndoStack.length)return;
    state.contractorRows=contractorQaUndoStack.pop();
    if(contractorQaHistory.length)contractorQaHistory.shift();
    if(!contractorQaUndoStack.length)document.getElementById('contractorQaUndo').style.display='none';
    saveState();renderContractorQaList();renderContractorGrid();refreshContractorPivot();renderPnlWalk();renderLandingCharts();
  });

  // Contractor QA: add new entry
  document.getElementById('contractorQaAddBtn').addEventListener('click',()=>{
    const name=document.getElementById('contractorQaNewName').value.trim();
    if(!name){alert('Enter a contractor name');return}
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    const row={name,vendorName:'',hourlyRate:0,monthlyHours:0,_startMonth:0,_endMonth:11,capPct:0,businessUnit:document.getElementById('contractorQaNewBU').value,bizLine:'',market:'',project:genProj?genProj.id:'',acctDesc:document.getElementById('contractorQaNewAcct').value,notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
    state.contractorRows.push(row);
    contractorQaHistory.unshift('Added: '+name);
    document.getElementById('contractorQaNewName').value='';
    saveState();renderContractorQaList();renderContractorGrid();
  });

  // Contractor QA: search filter
  document.getElementById('contractorQaSearch').addEventListener('input',renderContractorQaList);
  document.getElementById('contractorQaMo').addEventListener('change',renderContractorQaList);

  // ── Vendor, T&E & Contractor Month Range Bars ──
  // Top-level bars (above tables)
  const vendorMonthBar=createSpendMonthRangeBar('vendorMonthRangeBar','vendorMonthRangeLabel',vendorSelectedMonths,function(){
    vendorQaMonthBar.render();renderVendorGrid();refreshVendorPivot();renderVendorQaList();
  });
  const teMonthBar=createSpendMonthRangeBar('teMonthRangeBar','teMonthRangeLabel',teSelectedMonths,function(){
    teQaMonthBar.render();renderTeGrid();refreshTePivot();renderTeQaList();
  });
  const contractorMonthBar=createSpendMonthRangeBar('contractorMonthRangeBar','contractorMonthRangeLabel',contractorSelectedMonths,function(){
    renderContractorGrid();renderContractorQaList();refreshContractorPivot();
  });
  // QA-embedded bars (inside quick-adjust panels) — share the same selectedMonths sets
  const vendorQaMonthBar=createSpendMonthRangeBar('vendorQaMonthRangeBar','vendorQaMonthRangeLabel',vendorSelectedMonths,function(){
    vendorMonthBar.render();renderVendorGrid();refreshVendorPivot();renderVendorQaList();
  });
  const teQaMonthBar=createSpendMonthRangeBar('teQaMonthRangeBar','teQaMonthRangeLabel',teSelectedMonths,function(){
    teMonthBar.render();renderTeGrid();refreshTePivot();renderTeQaList();
  });
  vendorMonthBar.init();
  teMonthBar.init();
  contractorMonthBar.init();
  vendorQaMonthBar.init();
  teQaMonthBar.init();

  // Initial render
  renderVendorGrid();
  renderAccounts();
  refreshVendorPivot();
  refreshContractorPivot();
  window.renderVendorGridPublic=function(){renderVendorGrid();renderTeGrid();renderContractorGrid();refreshVendorPivot();refreshTePivot();refreshContractorPivot()};
  window.refreshVendorPivot=refreshVendorPivot;
  window.refreshTePivot=refreshTePivot;
  window.refreshContractorPivot=refreshContractorPivot;
  // Re-render vendor/T&E/contractor pivot charts on color scheme or dark mode change
  if(typeof colorSchemeCallbacks!=='undefined')colorSchemeCallbacks.push(function(){refreshVendorPivot();refreshTePivot();refreshContractorPivot()});
}

function getVendorOaoTotal(){
  const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const vTotal=(state.vendorRows||[]).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  const tTotal=(state.teRows||[]).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  // Contractor OpEx (expense - capex) goes to OAO
  const cOpex=(state.contractorRows||[]).reduce((s,r)=>{
    const capPct=parseFloat(r.capPct)||0;
    return s+moKeys.reduce((ms,m)=>{const raw=parseFloat(r[m])||0;return ms+(raw-Math.round(raw*capPct/100))},0);
  },0);
  return vTotal+tTotal+cOpex;
}
function getVendorOaoByMonth(mi){
  const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const vAmt=(state.vendorRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
  const tAmt=(state.teRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
  // Contractor OpEx for this month
  const cOpex=(state.contractorRows||[]).reduce((s,r)=>{
    const raw=parseFloat(r[moKeys[mi]])||0;const capPct=parseFloat(r.capPct)||0;
    return s+(raw-Math.round(raw*capPct/100));
  },0);
  return vAmt+tAmt+cOpex;
}
function getContractorCapExTotal(){
  const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  return (state.contractorRows||[]).reduce((s,r)=>{
    const capPct=parseFloat(r.capPct)||0;
    return s+moKeys.reduce((ms,m)=>ms+Math.round((parseFloat(r[m])||0)*capPct/100),0);
  },0);
}
function getContractorCapExByMonth(mi){
  const moKeys=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  return (state.contractorRows||[]).reduce((s,r)=>{
    const raw=parseFloat(r[moKeys[mi]])||0;const capPct=parseFloat(r.capPct)||0;
    return s+Math.round(raw*capPct/100);
  },0);
}


/* ── window assignments for cross-module access ── */
window.initVendorModule = initVendorModule;
window.getVendorOaoTotal = getVendorOaoTotal;
window.getVendorOaoByMonth = getVendorOaoByMonth;
window.getContractorCapExTotal = getContractorCapExTotal;
window.getContractorCapExByMonth = getContractorCapExByMonth;

/* ── named exports ── */
export {
  initVendorModule,
  getVendorOaoTotal, getVendorOaoByMonth,
  getContractorCapExTotal, getContractorCapExByMonth
};
