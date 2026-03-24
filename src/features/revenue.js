// ── revenue.js — ES module extracted from index.html lines 14273–14871 ──
import { state, saveState } from '../lib/state.js';
import { fmt } from '../lib/constants.js';

/* ── globals accessed via window (not yet modularised) ── */
const showUndoToast   = (...a) => window.showUndoToast(...a);
const getChartColors  = (...a) => window.getChartColors(...a);

/* ── CDN globals (loaded externally, accessed via window) ── */
const XLSX = window.XLSX;
const Chart = window.Chart;

/* escHtml helper used locally */
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── TECH REVENUE MODULE ──
// ══════════════════════════════════════════════════════════════════
let revenueModuleInited=false;
let revScale=1,revSelectedMonths=new Set();
let revSortCol='',revSortDir=1;
let revPivotChartInst=null,revFcChartInst=null;
let landingRevenueChartInst=null,landingRevFcChartInst=null;

function getRevenueTotal(){
  return (state.revenueRows||[]).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
}
function getRevenueByMonth(mi){
  return (state.revenueRows||[]).reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
}
function getRevenueMrr(){
  // MRR = current month's sum for MRR-type rows (use latest non-zero month as proxy)
  const rows=(state.revenueRows||[]).filter(r=>r.revenueType==='Subscription'||r.revenueType==='MRR'||r.revenueType==='ARR');
  for(let mi=11;mi>=0;mi--){
    const v=rows.reduce((s,r)=>s+(parseFloat(r[moKeys[mi]])||0),0);
    if(v>0)return v;
  }
  return rows.reduce((s,r)=>s+(parseFloat(r[moKeys[0]])||0),0);
}

function buildRevenueRow(row,i){
  const fy=moKeys.reduce((s,m)=>s+(parseFloat(row[m])||0),0);
  let h='<tr data-ri="'+i+'">';
  h+='<td style="width:30px;cursor:grab">&#9776;</td>';
  h+='<td style="width:30px"><span class="color-dot" style="background:'+(row._colorTag||'transparent')+';width:12px;height:12px;display:inline-block;border-radius:50%;cursor:pointer;border:1px solid var(--border)" data-ri="'+i+'"></span></td>';
  // Client name - linked to clients
  h+='<td><select class="rev-field" data-ri="'+i+'" data-f="clientName" style="width:140px"><option value="">— Select Client —</option>';
  (state.revenueClients||[]).forEach(c=>{h+='<option value="'+escHtml(c.name)+'"'+(c.name===row.clientName?' selected':'')+'>'+escHtml(c.name)+'</option>'});
  h+='<option value="_custom"'+(row.clientName&&!(state.revenueClients||[]).find(c=>c.name===row.clientName)?' selected':'')+'>Custom: '+escHtml(row.clientName||'')+'</option>';
  h+='</select></td>';
  h+='<td><input class="rev-field" data-ri="'+i+'" data-f="productName" value="'+escHtml(row.productName||'')+'" style="width:120px" placeholder="Product/Service"></td>';
  h+='<td><select class="rev-field" data-ri="'+i+'" data-f="revenueType" style="width:100px"><option value="Subscription"'+(row.revenueType==='Subscription'||row.revenueType==='MRR'||row.revenueType==='ARR'?' selected':'')+'>Subscription</option><option value="One-Time"'+(row.revenueType==='One-Time'?' selected':'')+'>One-Time</option><option value="Usage"'+(row.revenueType==='Usage'?' selected':'')+'>Usage-Based</option><option value="ProfServ"'+(row.revenueType==='ProfServ'?' selected':'')+'>Prof. Services</option><option value="Contractual"'+(row.revenueType==='Contractual'?' selected':'')+'>Contractual</option></select></td>';
  h+='<td style="white-space:nowrap"><select class="rev-field" data-ri="'+i+'" data-f="_startMonth" style="width:50px">'+buildMonthOptions(row._startMonth)+'</select> – <select class="rev-field" data-ri="'+i+'" data-f="_endMonth" style="width:50px">'+buildMonthOptions(row._endMonth)+'</select></td>';
  h+='<td><input class="rev-field" data-ri="'+i+'" data-f="notes" value="'+escHtml(row.notes||'')+'" style="width:90px" placeholder="Notes"></td>';
  h+=buildDimCells('rev-field',i,row);
  moKeys.forEach(m=>{
    const v=parseFloat(row[m])||0;
    h+='<td class="num"><input class="rev-mo" data-ri="'+i+'" data-m="'+m+'" value="'+fmtScaled(v,revScale)+'" style="width:80px;text-align:right"></td>';
  });
  h+='<td class="num" style="font-weight:700">'+fmtScaled(fy,revScale)+'</td>';
  h+='<td><button class="rev-del" data-ri="'+i+'" style="color:var(--danger);cursor:pointer;border:none;background:none;font-size:1rem">&times;</button></td>';
  h+='</tr>';
  return h;
}

function renderRevenueGrid(){
  const tbody=document.getElementById('revTbody');
  const totalRow=document.getElementById('revTotalRow');
  if(!tbody)return;
  let h='';
  (state.revenueRows||[]).forEach((row,i)=>{h+=buildRevenueRow(row,i)});
  tbody.innerHTML=h;
  // Footer
  let ft='<tr style="font-weight:700;background:var(--panel-inset)"><td colspan="2"></td><td>TOTAL</td><td colspan="4"></td><td colspan="6"></td>';
  moKeys.forEach(m=>{
    const t=(state.revenueRows||[]).reduce((s,r)=>s+(parseFloat(r[m])||0),0);
    ft+='<td class="num">'+fmtScaled(t,revScale)+'</td>';
  });
  const fy=(state.revenueRows||[]).reduce((s,r)=>s+moKeys.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
  ft+='<td class="num">'+fmtScaled(fy,revScale)+'</td><td></td></tr>';
  totalRow.innerHTML=ft;
  // Bind events
  tbody.querySelectorAll('.rev-field').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.ri;const f=this.dataset.f;const row=state.revenueRows[i];if(!row)return;
      row[f]=this.value;saveState();renderRevenueGrid();renderRevenueKpis();
    });
  });
  tbody.querySelectorAll('.rev-mo').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.ri;const m=this.dataset.m;const row=state.revenueRows[i];if(!row)return;
      let v=parseFloat(this.value.replace(/[,$]/g,''))||0;
      if(revScale>1)v=v*revScale;
      row[m]=v;saveState();renderRevenueGrid();renderRevenueKpis();
    });
  });
  tbody.querySelectorAll('.rev-del').forEach(btn=>{
    btn.addEventListener('click',function(){
      const i=+this.dataset.ri;
      const item=state.revenueRows[i];
      const label=(item&&(item.clientName||item.productName))||'revenue row';
      state.revenueRows.splice(i,1);saveState();renderRevenueGrid();renderRevenueKpis();
      showUndoToast(label,state.revenueRows,i,item,function(){renderRevenueGrid();renderRevenueKpis()});
    });
  });
}

function renderRevenueKpis(){
  const mrr=getRevenueMrr();
  const arr=mrr*12;
  const totalRev=getRevenueTotal();
  const clients=(state.revenueClients||[]);
  const mappedClients=new Set((state.revenueClientMapping||[]).map(m=>m.clientId));
  const uniqueClients=mappedClients.size||1;
  const arpc=totalRev/uniqueClients;
  // Renewal rate: weighted avg
  let renewalNum=0,renewalDen=0;
  clients.forEach(c=>{
    const cRev=getClientRevenue(c.id);
    renewalNum+=(parseFloat(c.renewalRate)||90)*cRev;
    renewalDen+=cRev;
  });
  const renewalRate=renewalDen>0?renewalNum/renewalDen:0;
  // NRR
  let nrrNum=0,nrrDen=0;
  clients.forEach(c=>{
    const cRev=getClientRevenue(c.id);
    nrrNum+=(parseFloat(c.nrrPct)||100)*cRev;
    nrrDen+=cRev;
  });
  const nrr=nrrDen>0?nrrNum/nrrDen:0;
  // Churn
  const highRisk=clients.filter(c=>c.churnRisk==='high').length;
  const churnRate=clients.length>0?(highRisk/clients.length*100):0;
  // Credit memo
  let creditMemo=0;
  clients.forEach(c=>{
    const cRev=getClientRevenue(c.id);
    creditMemo+=cRev*(parseFloat(c.creditMemoRiskPct)||2)/100;
  });
  // Update KPI cards
  const el=id=>document.getElementById(id);
  if(el('revKpiMrr'))el('revKpiMrr').textContent=fmt(mrr);
  if(el('revKpiArr'))el('revKpiArr').textContent=fmt(arr);
  if(el('revKpiTotal'))el('revKpiTotal').textContent=fmt(totalRev);
  if(el('revKpiNrr'))el('revKpiNrr').textContent=nrr>0?nrr.toFixed(1)+'%':'—';
  if(el('revKpiArpc'))el('revKpiArpc').textContent=fmt(arpc);
  if(el('revKpiRenewal'))el('revKpiRenewal').textContent=renewalRate>0?renewalRate.toFixed(1)+'%':'—';
  if(el('revKpiChurn'))el('revKpiChurn').textContent=churnRate.toFixed(1)+'%';
  if(el('revKpiCreditMemo'))el('revKpiCreditMemo').textContent=fmt(creditMemo);
  // New vs expansion
  const thisYear=new Date().getFullYear();
  let newRev=0,expRev=0;
  clients.forEach(c=>{
    const cRev=getClientRevenue(c.id);
    const startYr=c.contractStart?new Date(c.contractStart).getFullYear():0;
    if(startYr>=thisYear)newRev+=cRev;else expRev+=cRev;
  });
  if(el('revKpiNew'))el('revKpiNew').textContent=fmt(newRev);
  if(el('revKpiExpansion'))el('revKpiExpansion').textContent=fmt(expRev);
  // Sparklines
  renderRevSparklines();
}

function getClientRevenue(clientId){
  const client=(state.revenueClients||[]).find(c=>c.id===clientId);
  if(!client)return 0;
  const mappings=(state.revenueClientMapping||[]).filter(m=>m.clientId===clientId);
  let total=0;
  mappings.forEach(m=>{
    const row=(state.revenueRows||[])[m.revenueRowIdx];
    if(row)total+=moKeys.reduce((s,k)=>s+(parseFloat(row[k])||0),0);
  });
  return total;
}

function renderRevSparklines(){
  if(typeof Chart==='undefined')return;
  const data=moKeys.map((_,mi)=>getRevenueByMonth(mi));
  const sparkIds=['revSparkMrr','revSparkArr','revSparkTotal'];
  sparkIds.forEach(id=>{
    const canvas=document.getElementById(id);
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const existing=Chart.getChart(canvas);
    if(existing)existing.destroy();
    new Chart(ctx,{type:'line',data:{labels:moKeys.map(m=>m.charAt(0).toUpperCase()+m.slice(1,3)),datasets:[{data:data,borderColor:'var(--accent)',borderWidth:1.5,fill:false,pointRadius:0,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
  });
}

function addRevenueRow(){
  state.revenueRows.push({clientName:'',productName:'',revenueType:'Subscription',_startMonth:'',_endMonth:'',businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,_colorTag:''});
  saveState();renderRevenueGrid();
}

// Client Detail functions
function renderClientTable(){
  const tbody=document.getElementById('revClientBody');
  if(!tbody)return;
  let h='';
  (state.revenueClients||[]).forEach((c,i)=>{
    const cRev=getClientRevenue(c.id);
    const mrrVal=cRev/12;
    h+='<tr>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="name" value="'+escHtml(c.name||'')+'" style="width:100px"></td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="industry" value="'+escHtml(c.industry||'')+'" style="width:70px"></td>';
    h+='<td><select class="rclient-f" data-ci="'+i+'" data-f="tier" style="width:80px"><option value="">—</option><option'+(c.tier==='Enterprise'?' selected':'')+'>Enterprise</option><option'+(c.tier==='Mid-Market'?' selected':'')+'>Mid-Market</option><option'+(c.tier==='SMB'?' selected':'')+'>SMB</option></select></td>';
    h+='<td><select class="rclient-f" data-ci="'+i+'" data-f="contractType" style="width:70px"><option value="">—</option><option value="Subscription"'+(c.contractType==='Subscription'||c.contractType==='MRR'||c.contractType==='ARR'?' selected':'')+'>Subscription</option><option'+(c.contractType==='One-Time'?' selected':'')+'>One-Time</option><option'+(c.contractType==='Usage'?' selected':'')+'>Usage</option></select></td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="contractStart" type="date" value="'+(c.contractStart||'')+'" style="width:90px"></td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="contractEnd" type="date" value="'+(c.contractEnd||'')+'" style="width:90px"></td>';
    h+='<td><select class="rclient-f" data-ci="'+i+'" data-f="billingFreq" style="width:70px"><option value="">—</option><option'+(c.billingFreq==='Monthly'?' selected':'')+'>Monthly</option><option'+(c.billingFreq==='Quarterly'?' selected':'')+'>Quarterly</option><option'+(c.billingFreq==='Annual'?' selected':'')+'>Annual</option></select></td>';
    h+='<td class="num" style="font-size:.72rem">'+fmt(mrrVal)+'</td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="renewalRate" type="number" value="'+(c.renewalRate||90)+'" min="0" max="100" style="width:50px;text-align:center">%</td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="creditMemoRiskPct" type="number" value="'+(c.creditMemoRiskPct||2)+'" min="0" max="100" style="width:50px;text-align:center">%</td>';
    h+='<td><select class="rclient-f" data-ci="'+i+'" data-f="churnRisk" style="width:70px"><option value="low"'+(c.churnRisk==='low'?' selected':'')+'>Low</option><option value="medium"'+(c.churnRisk==='medium'?' selected':'')+'>Medium</option><option value="high"'+(c.churnRisk==='high'?' selected':'')+'>High</option></select></td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="nrrPct" type="number" value="'+(c.nrrPct||100)+'" min="0" max="300" style="width:50px;text-align:center">%</td>';
    h+='<td><input class="rclient-f" data-ci="'+i+'" data-f="expansionPipeline" type="number" value="'+(c.expansionPipeline||0)+'" style="width:80px;text-align:right"></td>';
    // Contract attachments
    h+='<td style="font-size:.72rem">';
    const atts=c._attachments||[];
    atts.forEach((a,ai)=>{
      h+='<div style="display:flex;gap:3px;align-items:center;margin-bottom:2px"><a href="#" onclick="downloadAttachment('+i+','+ai+');return false" style="color:var(--accent);text-decoration:underline">'+escHtml(a.fileName)+'</a><button onclick="removeAttachment('+i+','+ai+')" style="border:none;background:none;color:var(--danger);cursor:pointer;font-size:.7rem">&times;</button></div>';
    });
    h+='<label style="cursor:pointer;color:var(--accent);font-size:.7rem"><input type="file" style="display:none" onchange="handleContractUpload('+i+',this.files[0])">+ Attach</label>';
    h+='</td>';
    h+='<td><button class="btn btn-sm" style="color:var(--danger);padding:1px 6px;font-size:.72rem" onclick="deleteClient('+i+')">&times;</button></td>';
    h+='</tr>';
  });
  tbody.innerHTML=h;
  // Bind field changes
  tbody.querySelectorAll('.rclient-f').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.ci;const f=this.dataset.f;const c=state.revenueClients[i];if(!c)return;
      if(f==='renewalRate'||f==='creditMemoRiskPct'||f==='nrrPct'||f==='expansionPipeline')c[f]=parseFloat(this.value)||0;
      else c[f]=this.value;
      saveState();renderClientTable();renderRevenueKpis();
    });
  });
}

function handleContractUpload(clientIdx,file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    const c=state.revenueClients[clientIdx];if(!c)return;
    if(!c._attachments)c._attachments=[];
    c._attachments.push({fileName:file.name,fileData:e.target.result,uploadDate:new Date().toISOString()});
    saveState();renderClientTable();
  };
  reader.readAsDataURL(file);
}
function downloadAttachment(clientIdx,attIdx){
  const c=state.revenueClients[clientIdx];if(!c||!c._attachments||!c._attachments[attIdx])return;
  const att=c._attachments[attIdx];
  const a=document.createElement('a');a.href=att.fileData;a.download=att.fileName;document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function removeAttachment(clientIdx,attIdx){
  const c=state.revenueClients[clientIdx];if(!c||!c._attachments)return;
  c._attachments.splice(attIdx,1);saveState();renderClientTable();
}
function deleteClient(i){
  state.revenueClients.splice(i,1);
  // Clean up mappings
  state.revenueClientMapping=(state.revenueClientMapping||[]).filter(m=>m.clientId!==(state.revenueClients[i]||{}).id);
  saveState();renderClientTable();renderRevenueKpis();renderClientMapping();
}

function renderClientMapping(){
  const tbody=document.getElementById('revMappingBody');
  if(!tbody)return;
  let h='';
  (state.revenueClientMapping||[]).forEach((m,i)=>{
    const client=(state.revenueClients||[]).find(c=>c.id===m.clientId);
    const row=(state.revenueRows||[])[m.revenueRowIdx];
    const mRev=row?moKeys.reduce((s,k)=>s+(parseFloat(row[k])||0),0)/12:0;
    h+='<tr><td>'+(client?escHtml(client.name):'Unknown')+'</td>';
    h+='<td>'+(row?escHtml(row.clientName||'')+' — '+escHtml(row.productName||''):'Row #'+m.revenueRowIdx)+'</td>';
    h+='<td class="num">'+fmt(mRev)+'/mo</td>';
    h+='<td><button class="btn btn-sm" style="color:var(--danger);padding:1px 6px;font-size:.72rem" onclick="unmapRevenue('+i+')">&times;</button></td></tr>';
  });
  tbody.innerHTML=h;
  // Unmapped rows
  const mappedIdxs=new Set((state.revenueClientMapping||[]).map(m=>m.revenueRowIdx));
  const unmapped=(state.revenueRows||[]).map((r,i)=>({r,i})).filter(x=>!mappedIdxs.has(x.i));
  const unmappedDiv=document.getElementById('revUnmappedList');
  if(unmappedDiv){
    unmappedDiv.innerHTML=unmapped.length?unmapped.map(x=>'<div style="margin-bottom:2px">Row #'+(x.i+1)+': '+escHtml(x.r.clientName||'Unnamed')+' — '+escHtml(x.r.productName||'')+'</div>').join(''):'<span style="color:var(--text-dim)">All rows mapped.</span>';
  }
  // Populate mapping selects
  const clientSel=document.getElementById('revMapClient');
  const rowSel=document.getElementById('revMapRow');
  if(clientSel){
    clientSel.innerHTML='<option value="">—</option>';
    (state.revenueClients||[]).forEach(c=>{clientSel.innerHTML+='<option value="'+c.id+'">'+escHtml(c.name)+'</option>'});
  }
  if(rowSel){
    rowSel.innerHTML='<option value="">—</option>';
    (state.revenueRows||[]).forEach((r,i)=>{rowSel.innerHTML+='<option value="'+i+'">Row #'+(i+1)+': '+escHtml(r.clientName||'Unnamed')+'</option>'});
  }
}
function unmapRevenue(i){
  state.revenueClientMapping.splice(i,1);saveState();renderClientMapping();
}

// Contractual Revenue Addition
function addContractualRevenue(){
  const clientSel=document.getElementById('contractualRevClient');
  const amount=parseFloat(document.getElementById('contractualRevAmount').value)||0;
  const start=document.getElementById('contractualRevStart').value;
  const end=document.getElementById('contractualRevEnd').value;
  const phasing=document.getElementById('contractualRevPhasing').value;
  const product=document.getElementById('contractualRevProduct').value;
  if(!amount||!start||!end){alert('Please fill in amount, start date, and end date');return}
  const startD=new Date(start),endD=new Date(end);
  if(endD<=startD){alert('End date must be after start date');return}
  // Calculate months
  const months=[];
  let d=new Date(startD.getFullYear(),startD.getMonth(),1);
  while(d<=endD){months.push({yr:d.getFullYear(),mo:d.getMonth()});d.setMonth(d.getMonth()+1)}
  if(!months.length)return;
  // Distribute amount
  let monthlyAmounts;
  if(phasing==='SL'){
    const perMonth=amount/months.length;
    monthlyAmounts=months.map(()=>Math.round(perMonth));
  } else if(phasing==='front'){
    // 60% in first half, 40% in second half
    const half=Math.ceil(months.length/2);
    const first=amount*0.6/half,second=amount*0.4/(months.length-half);
    monthlyAmounts=months.map((_,i)=>Math.round(i<half?first:second));
  } else if(phasing==='back'){
    const half=Math.ceil(months.length/2);
    const first=amount*0.4/half,second=amount*0.6/(months.length-half);
    monthlyAmounts=months.map((_,i)=>Math.round(i<half?first:second));
  } else {
    // Custom - SL default, user edits later
    const perMonth=amount/months.length;
    monthlyAmounts=months.map(()=>Math.round(perMonth));
  }
  // Store contractual revenue
  const id='cr_'+Date.now();
  state.contractualRevenue.push({id,clientId:clientSel.value,totalAmount:amount,startDate:start,endDate:end,phasingMethod:phasing,product,monthlyAmounts});
  // Create revenue rows for current year months
  const currentYear=new Date().getFullYear();
  const currentYearMonths=months.filter(m=>m.yr===currentYear);
  if(currentYearMonths.length){
    const row={clientName:(state.revenueClients||[]).find(c=>c.id===clientSel.value)?.name||'',productName:product,revenueType:'Contractual',_startMonth:currentYearMonths[0].mo,_endMonth:currentYearMonths[currentYearMonths.length-1].mo,businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'Contract: '+fmt(amount)+' over '+months.length+' months',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,_colorTag:'',_contractualId:id};
    currentYearMonths.forEach((m,mi)=>{
      const moIdx=months.findIndex(x=>x.yr===m.yr&&x.mo===m.mo);
      row[moKeys[m.mo]]=monthlyAmounts[moIdx]||0;
    });
    state.revenueRows.push(row);
  }
  saveState();renderRevenueGrid();renderRevenueKpis();renderContractualList();
}

function renderContractualList(){
  const list=document.getElementById('contractualRevList');
  if(!list)return;
  let h='';
  (state.contractualRevenue||[]).forEach((cr,i)=>{
    const client=(state.revenueClients||[]).find(c=>c.id===cr.clientId);
    h+='<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-bottom:1px solid var(--border-light);font-size:.78rem">';
    h+='<span style="font-weight:600">'+(client?escHtml(client.name):'—')+'</span>';
    h+='<span>'+escHtml(cr.product||'')+'</span>';
    h+='<span>'+fmt(cr.totalAmount)+'</span>';
    h+='<span style="color:var(--text-dim)">'+cr.startDate+' → '+cr.endDate+'</span>';
    h+='<span style="color:var(--text-dim)">['+cr.phasingMethod+']</span>';
    h+='<button onclick="deleteContractualRevenue('+i+')" style="margin-left:auto;border:none;background:none;color:var(--danger);cursor:pointer">&times;</button>';
    h+='</div>';
  });
  list.innerHTML=h||'<div style="padding:8px;color:var(--text-dim);font-size:.78rem">No contractual revenue entries yet.</div>';
}
function deleteContractualRevenue(i){
  const cr=state.contractualRevenue[i];if(!cr)return;
  // Remove associated revenue rows
  state.revenueRows=(state.revenueRows||[]).filter(r=>r._contractualId!==cr.id);
  state.contractualRevenue.splice(i,1);
  saveState();renderRevenueGrid();renderRevenueKpis();renderContractualList();
}

// Revenue Forecast
function renderRevenueForecast(){
  const tbody=document.getElementById('revFcBody');
  const outputBody=document.getElementById('revFcOutputBody');
  if(!tbody)return;
  // Render assumptions table
  let h='';
  (state.revenueForecast||[]).forEach((f,i)=>{
    const clientLabel=f.clientId==='_all'?'All Clients (Blended)':(state.revenueClients||[]).find(c=>c.id===f.clientId)?.name||f.clientId;
    h+='<tr><td>'+escHtml(clientLabel)+'</td>';
    h+='<td><input type="number" value="'+(f.growthPct||0)+'" data-fi="'+i+'" data-ff="growthPct" class="revfc-f" style="width:60px;text-align:center">%</td>';
    h+='<td><input type="number" value="'+(f.churnPct||0)+'" data-fi="'+i+'" data-ff="churnPct" class="revfc-f" style="width:60px;text-align:center">%</td>';
    h+='<td><input type="number" value="'+(f.priceIncPct||0)+'" data-fi="'+i+'" data-ff="priceIncPct" class="revfc-f" style="width:60px;text-align:center">%</td>';
    h+='<td><input type="number" value="'+(f.newClientsPerYr||0)+'" data-fi="'+i+'" data-ff="newClientsPerYr" class="revfc-f" style="width:60px;text-align:center"></td>';
    h+='<td><input type="number" value="'+(f.avgNewRev||0)+'" data-fi="'+i+'" data-ff="avgNewRev" class="revfc-f" style="width:80px;text-align:right"></td>';
    h+='<td><button onclick="state.revenueForecast.splice('+i+',1);saveState();renderRevenueForecast()" style="border:none;background:none;color:var(--danger);cursor:pointer">&times;</button></td></tr>';
  });
  tbody.innerHTML=h;
  // Bind
  tbody.querySelectorAll('.revfc-f').forEach(el=>{
    el.addEventListener('change',function(){
      const i=+this.dataset.fi;const f=this.dataset.ff;
      state.revenueForecast[i][f]=parseFloat(this.value)||0;
      saveState();renderRevenueForecast();
    });
  });
  // Compute 5-year forecast output
  const baseRev=getRevenueTotal();
  const forecasts=state.revenueForecast||[];
  // Use blended assumptions (first entry or defaults)
  const blended=forecasts.find(f=>f.clientId==='_all')||{growthPct:10,churnPct:5,priceIncPct:3,newClientsPerYr:0,avgNewRev:0};
  let oh='';
  const years=[];
  let prevRev=baseRev;
  for(let y=0;y<5;y++){
    const yr=new Date().getFullYear()+y;
    const growth=y===0?0:Math.round(prevRev*(blended.growthPct||0)/100);
    const churn=y===0?0:-Math.round(prevRev*(blended.churnPct||0)/100);
    const priceImp=y===0?0:Math.round(prevRev*(blended.priceIncPct||0)/100);
    const newRev=y===0?0:(blended.newClientsPerYr||0)*(blended.avgNewRev||0);
    const totalYr=y===0?baseRev:prevRev+growth+churn+priceImp+newRev;
    years.push({yr,base:prevRev,growth,churn,priceImp,newRev,total:totalYr});
    oh+='<tr><td>'+yr+'</td><td class="num">'+fmt(prevRev)+'</td><td class="num" style="color:#27ae60">'+fmt(growth)+'</td>';
    oh+='<td class="num" style="color:var(--danger)">'+fmt(churn)+'</td><td class="num">'+fmt(priceImp)+'</td>';
    oh+='<td class="num">'+fmt(newRev)+'</td><td class="num" style="font-weight:700">'+fmt(totalYr)+'</td></tr>';
    prevRev=totalYr;
  }
  if(outputBody)outputBody.innerHTML=oh;
  // Chart
  renderRevFcChart(years);
}
function renderRevFcChart(years){
  if(typeof Chart==='undefined')return;
  const canvas=document.getElementById('revFcChart');
  if(!canvas)return;
  if(revFcChartInst)revFcChartInst.destroy();
  const lcc=getChartColors();
  revFcChartInst=new Chart(canvas,{
    type:'bar',
    data:{labels:years.map(y=>y.yr),datasets:[{label:'Revenue',data:years.map(y=>y.total),backgroundColor:lcc[2]||'#27ae60'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)}}}}
  });
}

function initRevenueModule(){
  if(revenueModuleInited)return;
  // Tab switching
  document.getElementById('revNav').querySelectorAll('[data-rtab]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#revNav .btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.rtab-content').forEach(c=>c.style.display='none');
      const t=document.getElementById('rtab-'+this.dataset.rtab);
      if(t)t.style.display='block';
      if(this.dataset.rtab==='rev-clients'){renderClientTable();renderClientMapping()}
      if(this.dataset.rtab==='rev-forecast')renderRevenueForecast();
    });
  });
  // Scale toggle
  document.getElementById('revScaleToggle').querySelectorAll('[data-rscale]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#revScaleToggle .btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      revScale=+this.dataset.rscale;
      renderRevenueGrid();
    });
  });
  // Add row
  document.getElementById('revAddRow').addEventListener('click',addRevenueRow);
  document.getElementById('revClearAllRows').addEventListener('click',function(){
    if(confirm('Clear all revenue rows?')){state.revenueRows=[];saveState();renderRevenueGrid();renderRevenueKpis()}
  });
  // QA panel toggle
  ['revQaToggle','contractualRevToggle'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('click',function(){this.closest('.qa-panel').classList.toggle('open')});
  });
  // Revenue QA add row
  document.getElementById('revQaAddBtn').addEventListener('click',function(){
    const clientId=document.getElementById('revQaNewClient').value;
    const product=document.getElementById('revQaNewProduct').value.trim();
    const revType=document.getElementById('revQaNewType').value;
    const clientName=(state.revenueClients||[]).find(function(c){return c.id===clientId});
    state.revenueRows.push({clientName:clientName?clientName.name:'',productName:product,revenueType:revType,_startMonth:'',_endMonth:'',businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,_colorTag:''});
    document.getElementById('revQaNewProduct').value='';
    saveState();renderRevenueGrid();renderRevenueKpis();
  });
  // Month range bar
  initMonthRangeBar('revMonthRangeBar','revMonthRangeLabel',revSelectedMonths,function(){renderRevenueGrid()});
  // Add client
  document.getElementById('revAddClientBtn').addEventListener('click',function(){
    const name=document.getElementById('revClientName').value.trim();
    if(!name){alert('Enter a client name');return}
    state.revenueClients.push({id:'rc_'+Date.now(),name,industry:document.getElementById('revClientIndustry').value,tier:document.getElementById('revClientTier').value,contractType:document.getElementById('revClientContractType').value,contractStart:'',contractEnd:'',billingFreq:'',churnRisk:'low',nrrPct:100,renewalRate:90,creditMemoRiskPct:2,expansionPipeline:0,notes:'',_attachments:[]});
    document.getElementById('revClientName').value='';
    saveState();renderClientTable();renderRevenueKpis();renderClientMapping();renderRevenueGrid();
    // Refresh client dropdowns so new client appears in contractual rev, forecast, etc.
    ['contractualRevClient','revQaNewClient'].forEach(function(id){
      var el=document.getElementById(id);if(!el)return;
      el.innerHTML='<option value="">— Select —</option>';
      (state.revenueClients||[]).forEach(function(c){el.innerHTML+='<option value="'+c.id+'">'+escHtml(c.name)+'</option>'});
    });
    var fcSel=document.getElementById('revFcClient');
    if(fcSel){
      fcSel.innerHTML='<option value="">— Select —</option>';
      (state.revenueClients||[]).forEach(function(c){fcSel.innerHTML+='<option value="'+c.id+'">'+escHtml(c.name)+'</option>'});
      (state.revenueRows||[]).forEach(function(r,i){if(r.clientName)fcSel.innerHTML+='<option value="row_'+i+'">Row: '+escHtml(r.clientName)+'</option>'});
    }
  });
  // Map button
  document.getElementById('revMapBtn').addEventListener('click',function(){
    const clientId=document.getElementById('revMapClient').value;
    const rowIdx=parseInt(document.getElementById('revMapRow').value);
    if(!clientId||isNaN(rowIdx)){alert('Select both a client and a revenue row');return}
    state.revenueClientMapping.push({clientId,revenueRowIdx:rowIdx});
    saveState();renderClientMapping();renderRevenueKpis();
  });
  // Contractual revenue
  document.getElementById('contractualRevAddBtn').addEventListener('click',addContractualRevenue);
  // Populate client selects
  const revClientSelects=['contractualRevClient','revQaNewClient'];
  revClientSelects.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.innerHTML='<option value="">— Select —</option>';
    (state.revenueClients||[]).forEach(c=>{el.innerHTML+='<option value="'+c.id+'">'+escHtml(c.name)+'</option>'});
  });
  // Revenue forecast add
  document.getElementById('revFcAddBtn').addEventListener('click',function(){
    const clientId=document.getElementById('revFcClient').value;
    // Replace existing entry for same client
    state.revenueForecast=(state.revenueForecast||[]).filter(f=>f.clientId!==clientId);
    state.revenueForecast.push({
      clientId,
      growthPct:parseFloat(document.getElementById('revFcGrowth').value)||0,
      churnPct:parseFloat(document.getElementById('revFcChurn').value)||0,
      priceIncPct:parseFloat(document.getElementById('revFcPriceInc').value)||0,
      newClientsPerYr:parseInt(document.getElementById('revFcNewClients').value)||0,
      avgNewRev:parseFloat(document.getElementById('revFcAvgNewRev').value)||0
    });
    saveState();renderRevenueForecast();
  });
  // Populate forecast client select
  const fcSel=document.getElementById('revFcClient');
  if(fcSel){
    (state.revenueClients||[]).forEach(c=>{fcSel.innerHTML+='<option value="'+c.id+'">'+escHtml(c.name)+'</option>'});
    // Also add individual revenue rows
    (state.revenueRows||[]).forEach((r,i)=>{
      if(r.clientName)fcSel.innerHTML+='<option value="row_'+i+'">Row: '+escHtml(r.clientName)+'</option>';
    });
  }
  // Import/Export
  document.getElementById('revExportBtn').addEventListener('click',function(){exportGridToExcel(state.revenueRows,'Revenue','revenue_export.xlsx',['clientName','productName','revenueType','businessUnit','bizLine','market','project','acctDesc','notes','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])});
  document.getElementById('revImportBtn').addEventListener('click',function(){document.getElementById('revFileInput').click()});
  document.getElementById('revFileInput').addEventListener('change',function(e){importGridFromExcel(e,state.revenueRows,'revenueRows',function(){renderRevenueGrid();renderRevenueKpis()})});
  // Phasing toggle for custom
  document.getElementById('contractualRevPhasing').addEventListener('change',function(){
    document.getElementById('contractualRevCustomGrid').style.display=this.value==='custom'?'block':'none';
  });
  renderRevenueGrid();
  renderRevenueKpis();
  renderContractualList();
  revenueModuleInited=true;
}

// Generic helpers for month range bars and import/export
function initMonthRangeBar(barId,labelId,selectedSet,callback){
  const bar=document.getElementById(barId);
  if(!bar)return;
  bar.querySelectorAll('.month-cell').forEach(cell=>{
    cell.addEventListener('click',function(){
      const mo=+this.dataset.mo;
      if(selectedSet.has(mo))selectedSet.delete(mo);else selectedSet.add(mo);
      bar.querySelectorAll('.month-cell').forEach(c=>{c.classList.toggle('active',selectedSet.has(+c.dataset.mo))});
      const label=document.getElementById(labelId);
      if(label)label.textContent=selectedSet.size===0?'All months':''+selectedSet.size+' months selected';
      if(callback)callback();
    });
  });
}

function exportGridToExcel(rows,sheetName,fileName,fields){
  if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
  const headers=fields.map(f=>f.charAt(0).toUpperCase()+f.slice(1).replace(/([A-Z])/g,' $1'));
  const data=rows.filter(r=>!r._isCategoryHeader).map(r=>fields.map(f=>r[f]||''));
  const ws=XLSX.utils.aoa_to_sheet([headers,...data]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  XLSX.writeFile(wb,fileName);
}

function importGridFromExcel(e,targetArray,stateKey,callback){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
    const wb=XLSX.read(ev.target.result,{type:'binary'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const data=XLSX.utils.sheet_to_json(ws);
    data.forEach(row=>{
      const entry={};
      Object.keys(row).forEach(k=>{
        const lk=k.toLowerCase().replace(/[^a-z]/g,'');
        if(moKeys.includes(lk))entry[lk]=parseFloat(row[k])||0;
        else entry[lk.replace(/\s/g,'')]=row[k];
      });
      targetArray.push(entry);
    });
    saveState();if(callback)callback();
  };
  reader.readAsBinaryString(file);
  e.target.value='';
}


/* ── window assignments for inline onclick handlers ── */
window.handleContractUpload = handleContractUpload;
window.downloadAttachment = downloadAttachment;
window.removeAttachment = removeAttachment;
window.deleteClient = deleteClient;
window.unmapRevenue = unmapRevenue;
window.deleteContractualRevenue = deleteContractualRevenue;
window.addContractualRevenue = addContractualRevenue;

/* ── also expose on window for cross-module access ── */
window.initMonthRangeBar = initMonthRangeBar;
window.exportGridToExcel = exportGridToExcel;
window.importGridFromExcel = importGridFromExcel;
window.initRevenueModule = initRevenueModule;
window.getRevenueTotal = getRevenueTotal;
window.getRevenueByMonth = getRevenueByMonth;
window.getRevenueMrr = getRevenueMrr;
window.getClientRevenue = getClientRevenue;

/* ── named exports ── */
export {
  getRevenueTotal, getRevenueByMonth, getRevenueMrr,
  renderRevenueGrid, renderRevenueKpis,
  initRevenueModule,
  initMonthRangeBar, exportGridToExcel, importGridFromExcel
};
