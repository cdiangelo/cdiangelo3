// ── EMPLOYEES ──
import { state, saveState } from '../lib/state.js';
import { getBonusPct, getBonusAmt, getBenefitsPct, getBenefitsAmt, getTotalComp } from '../lib/state.js';
import { fmt, esc, uid, benchmark, COUNTRIES, SENIORITY, FUNCTIONS, COUNTRY_BU } from '../lib/constants.js';
import {
  getProratedComp, getProratedCapEx, getProratedOpEx, getCapPct, getCapEx, getOpEx,
  getAnnualFactor,
  getProjectById, getEmpProject, getEmpMarkets, getAllocFlag
} from '../lib/proration.js';

let editingId=null;
let empSortCol=null,empSortAsc=true;
function updateBenchmarkBadge(){
  const c=document.getElementById('empCountry').value;
  const s=document.getElementById('empSeniority').value;
  const f=document.getElementById('empFunction').value;
  const el=document.getElementById('benchmarkBadge');
  if(c&&s&&f){
    const bm=benchmark(s,f,c);
    const top=Math.round(bm*1.25);
    const custom=state.customRates.find(cr=>cr.country===c&&cr.seniority===s&&cr.function===f);
    let html='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">';
    html+=`<span class="benchmark-badge bm-click" data-val="${bm}" style="font-size:.72rem;padding:2px 8px">Mkt Avg: ${fmt(bm)}</span>`;
    html+=`<span class="benchmark-badge bm-click" data-val="${top}" style="font-size:.72rem;padding:2px 8px;background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7">Top Talent: ${fmt(top)}</span>`;
    if(custom){
      html+=`<span class="benchmark-badge bm-click" data-val="${custom.rate}" style="font-size:.72rem;padding:2px 8px;background:#e3f2fd;color:#1565c0;border-color:#90caf9">Custom: ${fmt(custom.rate)}</span>`;
    }
    html+='</div>';
    el.innerHTML=html;
    el.querySelectorAll('.bm-click').forEach(badge=>{
      badge.addEventListener('click',()=>{document.getElementById('empSalary').value=badge.dataset.val});
    });
  } else {el.innerHTML=''}
}
['empCountry','empSeniority','empFunction'].forEach(id=>document.getElementById(id).addEventListener('change',updateBenchmarkBadge));
document.getElementById('empCountry').addEventListener('change',()=>{
  const c=document.getElementById('empCountry').value;
  document.getElementById('empBusinessUnit').value=COUNTRY_BU[c]||'';
});

// ── Ops-mode form comp visibility ──
function syncFormCompVisibility(){
  const isOps=document.body.classList.contains('ops-mode');
  const empTypeVal=document.getElementById('empType').value;
  const empTypeEl=document.getElementById('empType');
  const salaryGroup=document.getElementById('empSalary').closest('.form-group');
  const capGroup=document.getElementById('empCapPct').closest('.form-group');
  if(isOps){
    // In ops mode: type is read-only; new adds are forced to 'hire'
    empTypeEl.disabled=true;
    if(!editingId){empTypeEl.value='hire'}
    // Hide comp for existing employees only; hires see salary + benchmarks
    const actualType=empTypeEl.value;
    const hideComp=actualType==='existing';
    salaryGroup.style.display=hideComp?'none':'';
    capGroup.style.display=hideComp?'none':'';
    if(!hideComp)updateBenchmarkBadge();
  } else {
    empTypeEl.disabled=false;
    salaryGroup.style.display='';
    capGroup.style.display='';
  }
}
window.syncFormCompVisibility=syncFormCompVisibility;
document.getElementById('empType').addEventListener('change',syncFormCompVisibility);

document.getElementById('btnSaveEmp').addEventListener('click',()=>{
  const name=document.getElementById('empName').value.trim();
  const country=document.getElementById('empCountry').value;
  const seniority=document.getElementById('empSeniority').value;
  const func=document.getElementById('empFunction').value;
  const businessLine=document.getElementById('empBusinessLine').value;
  const businessUnit=COUNTRY_BU[country]||'';
  const isOps=document.body.classList.contains('ops-mode');
  const empType=isOps&&!editingId?'hire':document.getElementById('empType').value;
  const rawSalary=parseFloat(document.getElementById('empSalary').value)||0;
  const salary=rawSalary>0?rawSalary:benchmark(seniority,func,country);
  const capPct=parseFloat(document.getElementById('empCapPct').value)||0;
  const notes=document.getElementById('empNotes').value.trim();
  const hireDate=document.getElementById('empHireDate').value;
  const termDate=document.getElementById('empTermDate').value;
  if(!name||!country||!seniority||!func){alert('Please fill required fields');return}
  let allocations=getFormAllocations();
  // Default coding string if no allocations provided
  if(!allocations.length){
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    if(genProj)allocations=[{projId:genProj.id,pct:100,primary:true}];
  }
  // Validate allocation total
  const allocTotal=allocations.reduce((s,a)=>s+a.pct,0);
  if(allocTotal>100){alert('Allocation total is '+allocTotal+'%. It cannot exceed 100%. Please adjust project allocations.');return}
  if(allocations.length&&allocTotal<100-0.01){
    if(!document.getElementById('empSplitOutside').checked){alert('Allocation total is below 100%. Please confirm that this employee is split outside of this organization.');return}
  }
  if(editingId){
    const emp=state.employees.find(e=>e.id===editingId);
    if(emp){
      // In ops mode, preserve the existing empType (can't change it)
      const saveType=isOps?emp.empType:empType;
      Object.assign(emp,{name,country,seniority,function:func,businessLine,businessUnit,salary,capPct,notes,hireDate,termDate,allocations,empType:saveType});
    }
    window.logAudit('Edit Employee',name+' ('+func+', '+country+')');
    editingId=null;
    document.getElementById('formTitle').textContent='Add Employee';
    document.getElementById('btnSaveEmp').textContent='Add Employee';
    document.getElementById('btnCancelEmp').style.display='none';
  } else {
    const count=Math.max(1,Math.min(100,parseInt(document.getElementById('empCount').value)||1));
    for(let ci=0;ci<count;ci++){
      const empName=count>1?name+' '+(ci+1):name;
      state.employees.push({id:uid(),name:empName,country,seniority,function:func,businessLine,businessUnit,salary,capPct,notes,hireDate,termDate,empType,allocations:allocations.map(a=>({...a}))});
    }
    window.logAudit('Add Employee',(count>1?count+'x ':'')+name+' ('+func+', '+country+')');
  }
  saveState();clearForm();renderEmployees();
});
document.getElementById('btnCancelEmp').addEventListener('click',()=>{
  editingId=null;clearForm();
  document.getElementById('formTitle').textContent='Add Employee';
  document.getElementById('btnSaveEmp').textContent='Add Employee';
  document.getElementById('btnCancelEmp').style.display='none';
});
function clearForm(){['empName','empSalary','empNotes','empHireDate','empTermDate','empBusinessUnit','empMarketCode'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('empCapPct').value=0;
  document.getElementById('empType').value=document.body.classList.contains('ops-mode')?'hire':'existing';
  syncFormCompVisibility();
  ['empCountry','empSeniority','empFunction','empBusinessLine'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('benchmarkBadge').innerHTML='';
  document.getElementById('empSplitOutside').checked=false;
  document.getElementById('empSplitOutsideWrap').style.display='none';
  document.getElementById('empCount').value=1;
  document.getElementById('empCountWrap').style.display='';
  renderFormAllocations([]);
}
// ── Form allocation rows ──
let formAllocations=[];
function renderFormAllocations(allocs){
  formAllocations=allocs||[];
  // Ensure exactly one primary
  if(formAllocations.length&&!formAllocations.some(a=>a.primary))formAllocations[0].primary=true;
  const container=document.getElementById('empAllocRows');
  container.innerHTML=formAllocations.map((a,i)=>{
    const proj=getProjectById(a.projId);
    const product=proj?proj.product:'';
    const category=proj?proj.category:'';
    const starStyle=a.primary?'color:var(--accent);font-size:1.1rem':'color:var(--border);font-size:1.1rem;cursor:pointer';
    const starTitle=a.primary?'Primary project':'Click to set as primary';
    return `<div class="form-grid" style="margin-bottom:8px;align-items:end;grid-template-columns:auto 1fr 1fr 1fr 80px auto">
      <div class="form-group" style="text-align:center"><label>Primary</label><span style="${starStyle}" title="${starTitle}" onclick="window.setFormPrimary(${i})">&#9733;</span></div>
      <div class="form-group"><label>Project Code</label><select class="fa-proj" data-idx="${i}" onchange="window.onFormAllocProjChange(${i},this.value)">
        <option value="">Select…</option>
        ${state.projects.map(p=>`<option value="${p.id}"${p.id===a.projId?' selected':''}>${p.code}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Product</label><input value="${product}" disabled style="background:var(--panel-inset);color:var(--text-dim)"></div>
      <div class="form-group"><label>Category</label><input value="${category}" disabled style="background:var(--panel-inset);color:var(--text-dim)"></div>
      <div class="form-group"><label>Alloc %</label><input type="number" min="0" max="100" value="${a.pct}" class="fa-pct" data-idx="${i}" onchange="window.onFormAllocPctChange(${i},this.value)"></div>
      <div class="form-group"><label>&nbsp;</label><button class="btn btn-sm btn-danger" type="button" onclick="window.removeFormAlloc(${i})">Del</button></div>
    </div>`;
  }).join('');
  updateFormAllocInfo();
  updateFormMarketDisplay();
}
function setFormPrimary(idx){
  formAllocations.forEach((a,i)=>a.primary=(i===idx));
  renderFormAllocations(formAllocations);
}
function onFormAllocProjChange(idx,projId){formAllocations[idx].projId=projId;renderFormAllocations(formAllocations)}
function onFormAllocPctChange(idx,val){formAllocations[idx].pct=parseFloat(val)||0;updateFormAllocInfo();updateFormMarketDisplay()}
function removeFormAlloc(idx){formAllocations.splice(idx,1);renderFormAllocations(formAllocations)}
function updateFormMarketDisplay(){
  const mkts=[];
  formAllocations.forEach(a=>{
    const p=getProjectById(a.projId);if(!p)return;
    const mkt=p.marketCode||'GL0000';
    const existing=mkts.find(m=>m.code===mkt);
    if(existing)existing.pct+=a.pct;else mkts.push({code:mkt,pct:a.pct});
  });
  function mktLabel(code){const m=state.markets.find(x=>x.code===code);return m?`${code} — ${m.name}`:code}
  const display=mkts.length?mkts.map(m=>mktLabel(m.code)+(mkts.length>1?` (${m.pct}%)`:'')).join(', '):'Global (GL0000)';
  document.getElementById('empMarketCode').value=display;
}
function updateFormAllocInfo(){
  const total=formAllocations.reduce((s,a)=>s+a.pct,0);
  const el=document.getElementById('empAllocInfo');
  const splitWrap=document.getElementById('empSplitOutsideWrap');
  const splitCb=document.getElementById('empSplitOutside');
  if(!formAllocations.length){el.innerHTML='';splitWrap.style.display='none';splitCb.checked=false;return}
  if(total>100){
    el.innerHTML='<span class="alloc-flag">Total: '+total+'% — Exceeds 100%. Reduce allocations to proceed.</span>';
    splitWrap.style.display='none';splitCb.checked=false;
  } else if(Math.abs(total-100)<0.01){
    el.innerHTML='<span class="alloc-flag ok">Total: '+total+'% — Balanced</span>';
    splitWrap.style.display='none';splitCb.checked=false;
  } else {
    el.innerHTML='<span class="alloc-flag">Total: '+total+'% — Below 100%</span>';
    splitWrap.style.display='block';
  }
}
function getFormAllocations(){
  return formAllocations.filter(a=>a.projId).map(a=>({projId:a.projId,pct:a.pct,primary:!!a.primary}));
}
document.getElementById('btnAddEmpAlloc').addEventListener('click',()=>{
  const isPrimary=formAllocations.length===0;
  formAllocations.push({projId:'',pct:100,primary:isPrimary});
  renderFormAllocations(formAllocations);
});
function startEdit(id){
  const emp=state.employees.find(e=>e.id===id);if(!emp)return;
  editingId=id;
  document.getElementById('empName').value=emp.name;
  document.getElementById('empCountry').value=emp.country;
  document.getElementById('empSeniority').value=emp.seniority;
  document.getElementById('empFunction').value=emp.function;
  const empMkts=getEmpMarkets(emp);
  document.getElementById('empMarketCode').value=empMkts.map(m=>m.code+(empMkts.length>1?` (${m.pct}%)`:'')).join(', ');
  document.getElementById('empBusinessLine').value=emp.businessLine||'';
  document.getElementById('empBusinessUnit').value=emp.businessUnit||COUNTRY_BU[emp.country]||'';
  document.getElementById('empSalary').value=emp.salary;
  document.getElementById('empCapPct').value=emp.capPct||0;
  document.getElementById('empType').value=emp.empType||'existing';
  document.getElementById('empNotes').value=emp.notes||'';
  document.getElementById('empHireDate').value=emp.hireDate||'';
  document.getElementById('empTermDate').value=emp.termDate||'';
  renderFormAllocations(emp.allocations?emp.allocations.map(a=>({...a})):[]);
  document.getElementById('formTitle').textContent='Edit Employee';
  document.getElementById('btnSaveEmp').textContent='Save Changes';
  document.getElementById('btnCancelEmp').style.display='inline-block';
  document.getElementById('empCountWrap').style.display='none';
  syncFormCompVisibility();
  updateBenchmarkBadge();
  window.scrollTo({top:0,behavior:'smooth'});
}
function deleteEmp(id){
  const idx=state.employees.findIndex(e=>e.id===id);if(idx<0)return;
  const item=state.employees[idx];
  const name=item.name||item.role||'employee';
  window.logAudit('Delete Employee',name);
  state.employees.splice(idx,1);delete state.allocOverrides[id];saveState();window.renderAll();
  window.showUndoToast(name,state.employees,idx,item,window.renderAll);
}
document.getElementById('btnClearFilter').addEventListener('click',()=>{
  document.getElementById('empFilterName').value='';
  ['empFilterCountry','empFilterSeniority','empFilterFunction','empFilterMarket','empFilterBizLine','empFilterProject'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  renderEmployees();
});
document.getElementById('btnClearAllEmps').addEventListener('click',()=>{if(!state.employees.length)return;if(confirm('⚠️ DELETE ALL HEADCOUNT?\n\nThis will permanently remove all '+state.employees.length+' employees. This cannot be undone.')){window.logAudit('Clear All','Removed all employees');state.employees=[];state.allocOverrides={};saveState();window.renderAll()}});
document.getElementById('btnImportRoster').addEventListener('click',()=>document.getElementById('empInlineRosterFile').click());
document.getElementById('empInlineRosterFile').addEventListener('change',function(){
  const mainInput=document.getElementById('rosterFileInput');
  const dt=new DataTransfer();
  if(this.files[0])dt.items.add(this.files[0]);
  mainInput.files=dt.files;
  mainInput.dispatchEvent(new Event('change'));
  this.value='';
});

let inlineEditId=null;
let inlineEditAllocs=null;
function startInlineEdit(id){inlineEditId=id;inlineEditAllocs=null;renderEmployees()}
function saveInlineEdit(id){
  const row=document.querySelector(`tr[data-id="${id}"]`);if(!row)return;
  const emp=state.employees.find(e=>e.id===id);if(!emp)return;
  emp.name=row.querySelector('.ie-name').value.trim()||emp.name;
  emp.country=row.querySelector('.ie-country').value;
  emp.businessUnit=COUNTRY_BU[emp.country]||'';
  emp.seniority=row.querySelector('.ie-seniority').value;
  emp.function=row.querySelector('.ie-function').value;
  const ieBiz=row.querySelector('.ie-bizline');
  if(ieBiz)emp.businessLine=ieBiz.value;
  // empType: only changeable in finance mode (ie-emptype select exists)
  const ieType=row.querySelector('.ie-emptype');
  if(ieType)emp.empType=ieType.value;
  const rawSal=parseFloat(row.querySelector('.ie-salary').value)||0;
  emp.salary=rawSal>0?rawSal:benchmark(emp.seniority,emp.function,emp.country);
  const ieCap=row.querySelector('.ie-cappct');
  if(ieCap)emp.capPct=parseFloat(ieCap.value)||0;
  const ieHire=row.querySelector('.ie-hire');
  if(ieHire)emp.hireDate=ieHire.value;
  const ieTerm=row.querySelector('.ie-term');
  if(ieTerm)emp.termDate=ieTerm.value;
  // Save inline alloc edits
  if(inlineEditAllocs){
    row.querySelectorAll('.ie-alloc-proj').forEach(sel=>{
      const idx=parseInt(sel.dataset.ai);
      if(inlineEditAllocs[idx])inlineEditAllocs[idx].projId=sel.value;
    });
    row.querySelectorAll('.ie-alloc-pct').forEach(inp=>{
      const idx=parseInt(inp.dataset.ai);
      if(inlineEditAllocs[idx])inlineEditAllocs[idx].pct=parseFloat(inp.value)||0;
    });
    emp.allocations=inlineEditAllocs.filter(a=>a.projId).map(a=>({projId:a.projId,pct:a.pct,primary:!!a.primary}));
  }
  // Ensure default coding string if allocations ended up empty
  if(!emp.allocations||!emp.allocations.length){
    const genProj=state.projects.find(p=>p.code==='GEN-000');
    if(genProj)emp.allocations=[{projId:genProj.id,pct:100,primary:true}];
  }
  // Validate allocation total
  const inlineAllocTotal=emp.allocations.reduce((s,a)=>s+a.pct,0);
  if(inlineAllocTotal>100){alert('Allocation total is '+inlineAllocTotal+'%. It cannot exceed 100%. Please adjust project allocations.');return}
  if(emp.allocations.length&&inlineAllocTotal<100-0.01){
    if(!confirm('Allocation total is '+Math.round(inlineAllocTotal*100)/100+'% (below 100%). Is this employee split outside of this organization?'))return;
  }
  if(emp.allocations.length&&!emp.allocations.some(a=>a.primary))emp.allocations[0].primary=true;
  inlineEditId=null;inlineEditAllocs=null;saveState();renderEmployees();
}
function cancelInlineEdit(){inlineEditId=null;inlineEditAllocs=null;renderEmployees()}
function setInlinePrimary(idx){
  if(!inlineEditAllocs)return;
  // Capture current DOM values first
  const row=document.querySelector(`tr[data-id="${inlineEditId}"]`);
  if(row){
    row.querySelectorAll('.ie-alloc-proj').forEach(sel=>{const i=parseInt(sel.dataset.ai);if(inlineEditAllocs[i])inlineEditAllocs[i].projId=sel.value});
    row.querySelectorAll('.ie-alloc-pct').forEach(inp=>{const i=parseInt(inp.dataset.ai);if(inlineEditAllocs[i])inlineEditAllocs[i].pct=parseFloat(inp.value)||0});
  }
  inlineEditAllocs.forEach((a,i)=>a.primary=(i===idx));
  renderEmployees();
}
function addInlineAlloc(){
  if(!inlineEditAllocs)inlineEditAllocs=[];
  // Capture current values from DOM before re-render
  const row=document.querySelector(`tr[data-id="${inlineEditId}"]`);
  if(row){
    row.querySelectorAll('.ie-alloc-proj').forEach(sel=>{const idx=parseInt(sel.dataset.ai);if(inlineEditAllocs[idx])inlineEditAllocs[idx].projId=sel.value});
    row.querySelectorAll('.ie-alloc-pct').forEach(inp=>{const idx=parseInt(inp.dataset.ai);if(inlineEditAllocs[idx])inlineEditAllocs[idx].pct=parseFloat(inp.value)||0});
  }
  const isPrimary=inlineEditAllocs.length===0;
  inlineEditAllocs.push({projId:'',pct:100,primary:isPrimary});
  renderEmployees();
}
function removeInlineAlloc(idx){
  if(!inlineEditAllocs)return;
  const row=document.querySelector(`tr[data-id="${inlineEditId}"]`);
  if(row){
    row.querySelectorAll('.ie-alloc-proj').forEach(sel=>{const i=parseInt(sel.dataset.ai);if(inlineEditAllocs[i])inlineEditAllocs[i].projId=sel.value});
    row.querySelectorAll('.ie-alloc-pct').forEach(inp=>{const i=parseInt(inp.dataset.ai);if(inlineEditAllocs[i])inlineEditAllocs[i].pct=parseFloat(inp.value)||0});
  }
  inlineEditAllocs.splice(idx,1);
  renderEmployees();
}

function refreshEmpFilters(){
  const fCountry=document.getElementById('empFilterCountry');
  const fSeniority=document.getElementById('empFilterSeniority');
  const fFunction=document.getElementById('empFilterFunction');
  const fBizLine=document.getElementById('empFilterBizLine');
  const fProject=document.getElementById('empFilterProject');
  const fMarket=document.getElementById('empFilterMarket');
  const cv=fCountry.value,sv=fSeniority.value,fv=fFunction.value,bv=fBizLine.value,pv=fProject.value,mv=fMarket.value;
  const countries=[...new Set(state.employees.map(e=>e.country))].sort();
  const seniorities=[...new Set(state.employees.map(e=>e.seniority))].sort();
  const functions=[...new Set(state.employees.map(e=>e.function))].sort();
  const bizLines=[...new Set(state.employees.map(e=>e.businessLine).filter(Boolean))].sort();
  const projIds=new Set();state.employees.forEach(e=>(e.allocations||[]).forEach(a=>projIds.add(a.projId)));
  const projects=state.projects.filter(p=>projIds.has(p.id)).sort((a,b)=>a.code.localeCompare(b.code));
  const marketCodes=new Set();state.employees.forEach(e=>getEmpMarkets(e).forEach(m=>marketCodes.add(m.code)));
  const markets=[...marketCodes].sort();
  fCountry.innerHTML='<option value="">Country</option>'+countries.map(c=>`<option value="${c}"${c===cv?' selected':''}>${c}</option>`).join('');
  fSeniority.innerHTML='<option value="">Seniority</option>'+seniorities.map(s=>`<option value="${s}"${s===sv?' selected':''}>${s}</option>`).join('');
  fFunction.innerHTML='<option value="">Function</option>'+functions.map(f=>`<option value="${esc(f)}"${f===fv?' selected':''}>${esc(f)}</option>`).join('');
  fMarket.innerHTML='<option value="">Market</option>'+markets.map(m=>`<option value="${esc(m)}"${m===mv?' selected':''}>${esc(m)}</option>`).join('');
  fBizLine.innerHTML='<option value="">Biz Line</option>'+bizLines.map(b=>{const bl=state.bizLines.find(x=>x.code===b);return `<option value="${esc(b)}"${b===bv?' selected':''}>${esc(b)}${bl?' — '+esc(bl.name):''}</option>`}).join('');
  fProject.innerHTML='<option value="">Project</option>'+projects.map(p=>`<option value="${p.id}"${p.id===pv?' selected':''}>${esc(p.code)}</option>`).join('');
}
function renderEmployees(){
  refreshEmpFilters();
  const fName=(document.getElementById('empFilterName').value||'').toLowerCase();
  const fCountry=document.getElementById('empFilterCountry').value;
  const fSeniority=document.getElementById('empFilterSeniority').value;
  const fFunction=document.getElementById('empFilterFunction').value;
  const fMarket=document.getElementById('empFilterMarket').value;
  const fBizLine=document.getElementById('empFilterBizLine').value;
  const fProject=document.getElementById('empFilterProject').value;
  let emps=state.employees;
  if(fName)emps=emps.filter(e=>e.name.toLowerCase().includes(fName));
  if(fCountry)emps=emps.filter(e=>e.country===fCountry);
  if(fSeniority)emps=emps.filter(e=>e.seniority===fSeniority);
  if(fFunction)emps=emps.filter(e=>e.function===fFunction);
  if(fMarket)emps=emps.filter(e=>getEmpMarkets(e).some(m=>m.code===fMarket));
  if(fBizLine)emps=emps.filter(e=>e.businessLine===fBizLine);
  if(fProject)emps=emps.filter(e=>(e.allocations||[]).some(a=>a.projId===fProject));
  // Sort
  if(empSortCol){
    const dir=empSortAsc?1:-1;
    const getSortVal=(e)=>{
      switch(empSortCol){
        case 'name':return e.name.toLowerCase();
        case 'empType':return e.empType||'existing';
        case 'country':return e.country;
        case 'seniority':return e.seniority;
        case 'function':return e.function;
        case 'market':return (getEmpMarkets(e)[0]||{code:''}).code;
        case 'businessLine':return e.businessLine||'';
        case 'businessUnit':return e.businessUnit||'';
        case 'project':{const p=getEmpProject(e);return p?p.code.toLowerCase():'\uffff';}
        case 'salary':return e.salary||0;
        case 'bonusPct':return getBonusPct(e);
        case 'bonus':return getBonusAmt(e);
        case 'benefits':return getBenefitsAmt(e);
        case 'totalComp':return getProratedComp(e);
        case 'capPct':return getCapPct(e);
        case 'opex':return getProratedOpEx(e);
        case 'capex':return getProratedCapEx(e);
        case 'hireDate':return e.hireDate||'';
        case 'termDate':return e.termDate||'';
        default:return '';
      }
    };
    emps=[...emps].sort((a,b)=>{const va=getSortVal(a),vb=getSortVal(b);if(typeof va==='number')return (va-vb)*dir;return String(va).localeCompare(String(vb))*dir});
  }
  // Update sort arrows
  document.querySelectorAll('#empTable th.sortable').forEach(th=>{
    const col=th.dataset.sort;
    const arrow=th.querySelector('.sort-arrow');
    if(col===empSortCol){th.classList.add('sort-active');arrow.textContent=empSortAsc?'▲':'▼'}
    else{th.classList.remove('sort-active');arrow.textContent=''}
  });
  const tbody=document.querySelector('#empTable tbody');
  const isOps=document.body.classList.contains('ops-mode');
  tbody.innerHTML=emps.map(e=>{
    const bp=getBonusPct(e),ba=getBonusAmt(e),ben=getBenefitsAmt(e),tc=getTotalComp(e);
    const af=getAnnualFactor(e);
    const proratedTc=getProratedComp(e);
    // In ops mode, only hide comp for existing employees; hire comp stays visible
    const cs=(e.empType||'existing')==='existing'?'comp-sensitive':'';
    // Build projects cell
    let projHtml='<span style="color:var(--text-dim);font-size:.8rem">—</span>';
    if(e.allocations&&e.allocations.length){
      projHtml=e.allocations.map(a=>{
        const p=getProjectById(a.projId);
        if(!p)return '';
        const isPrimary=a.primary;
        const star=isPrimary?'<span style="color:var(--accent)" title="Primary">&#9733;</span> ':'';
        return `<div style="font-size:.82rem;margin-bottom:2px">${star}<strong style="color:var(--accent)">${p.code}</strong> <span style="color:var(--text-dim)">${p.product}</span> <span style="font-size:.75rem;color:var(--text-dim)">${a.pct}%</span></div>`;
      }).filter(Boolean).join('');
      const flag=getAllocFlag(e.id);
      if(flag&&!flag.ok){
        projHtml+=`<span class="alloc-flag" style="font-size:.72rem;margin-top:2px">${flag.total}% total</span>`;
        if(flag.overridden)projHtml+=`<span style="font-size:.7rem;color:var(--success);margin-left:4px">OK'd</span>`;
      }
    }
    if(inlineEditId===e.id){
      const ieAllocs=inlineEditAllocs||(e.allocations?e.allocations.map(a=>({...a})):[]);
      if(!inlineEditAllocs)inlineEditAllocs=ieAllocs;
      let allocEditHtml=ieAllocs.map((a,i)=>{
        const ap=getProjectById(a.projId);
        const starStyle=a.primary?'color:var(--accent);cursor:pointer':'color:var(--border);cursor:pointer';
        return `<div style="display:flex;gap:4px;align-items:center;margin-bottom:4px">
          <span style="${starStyle};font-size:.9rem" title="${a.primary?'Primary':'Set as primary'}" onclick="window.setInlinePrimary(${i})">&#9733;</span>
          <select class="ie-alloc-proj" data-ai="${i}" style="width:100px;padding:3px;font-size:.78rem">
            <option value="">—</option>${state.projects.map(p=>`<option value="${p.id}"${p.id===a.projId?' selected':''}>${p.code}</option>`).join('')}
          </select>
          <input type="number" class="ie-alloc-pct" data-ai="${i}" value="${a.pct}" min="0" max="100" style="width:55px;padding:3px;font-size:.78rem">%
          <button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:.7rem" onclick="window.removeInlineAlloc(${i})">×</button>
        </div>`;
      }).join('');
      allocEditHtml+=`<button class="btn btn-sm" style="padding:2px 8px;font-size:.72rem;margin-top:2px" onclick="window.addInlineAlloc()">+ Add</button>`;
      const typeLabel=(e.empType||'existing')==='hire'?'New Hire':'Existing';
      const typeStyle=(e.empType||'existing')==='hire'?'color:#059669;font-weight:600':'color:var(--text-dim)';
      return `<tr data-id="${e.id}" class="inline-edit">
        <td><button class="btn btn-sm btn-primary" onclick="window.saveInlineEdit('${e.id}')">Save</button> <button class="btn btn-sm" onclick="window.cancelInlineEdit()">Cancel</button></td>
        <td><input class="ie-name" value="${e.name}"></td>
        <td>${isOps?`<span style="${typeStyle};font-size:.78rem">${typeLabel}</span>`:`<select class="ie-emptype" style="font-size:.78rem"><option value="existing"${(e.empType||'existing')==='existing'?' selected':''}>Existing</option><option value="hire"${e.empType==='hire'?' selected':''}>New Hire</option></select>`}</td>
        <td><select class="ie-country">${COUNTRIES.map(c=>`<option${c===e.country?' selected':''}>${c}</option>`).join('')}</select></td>
        <td><select class="ie-seniority">${SENIORITY.map(s=>`<option${s===e.seniority?' selected':''}>${s}</option>`).join('')}</select></td>
        <td><select class="ie-function">${FUNCTIONS.map(f=>`<option${f===e.function?' selected':''}>${f}</option>`).join('')}</select></td>
        <td style="font-size:.82rem">${(()=>{const mkts=getEmpMarkets(e);return mkts.map(m=>`<div>${m.code}${mkts.length>1?` <span style="font-size:.75rem;color:var(--text-dim)">${m.pct}%</span>`:''}</div>`).join('')})()}</td>
        <td><select class="ie-bizline"><option value="">—</option>${state.bizLines.map(b=>`<option value="${b.code}"${b.code===(e.businessLine||'')?' selected':''}>${b.code} — ${b.name}</option>`).join('')}</select></td>
        <td class="ops-hide" style="font-size:.82rem">${e.businessUnit||COUNTRY_BU[e.country]||'—'}</td>
        <td style="min-width:200px">${allocEditHtml}</td>
        <td class="emp-comp-toggle-cell"></td>
        <td class="${cs} emp-comp-col"><input class="ie-salary" type="number" value="${e.salary}"></td>
        <td class="emp-comp-col">${bp}%</td><td class="${cs} emp-comp-col">${fmt(ba)}</td><td class="${cs} emp-comp-col">${fmt(ben)}</td><td class="${cs} emp-comp-col">${fmt(tc)}</td>
        <td><input class="ie-cappct" type="number" min="0" max="100" value="${e.capPct||0}" style="width:55px"></td>
        <td class="${cs} emp-comp-col">${fmt(getOpEx(e))}</td><td class="${cs} emp-comp-col">${fmt(getCapEx(e))}</td>
        <td><input class="ie-hire" type="date" value="${e.hireDate||''}"></td>
        <td><input class="ie-term" type="date" value="${e.termDate||''}"></td>
      </tr>`;
    }
    const typeLabel=(e.empType||'existing')==='hire'?'New Hire':'Existing';
    const typeStyle=(e.empType||'existing')==='hire'?'color:#059669;font-weight:600':'color:var(--text-dim)';
    return `<tr data-id="${e.id}">
      <td style="white-space:nowrap"><button class="btn btn-sm" onclick="window.startInlineEdit('${e.id}')">Edit</button> <button class="btn btn-sm" onclick="window.startEdit('${e.id}')">Form</button> <button class="btn btn-sm" style="background:#555;border-color:#555;color:#fff" onclick="window.deleteEmp('${e.id}')">Del</button></td>
      <td>${e.name}</td><td style="${typeStyle};font-size:.78rem">${typeLabel}</td><td>${e.country}</td><td>${e.seniority}</td><td>${e.function}</td>
      <td style="font-size:.82rem">${(()=>{const mkts=getEmpMarkets(e);return mkts.map(m=>`<div>${m.code}${mkts.length>1?` <span style="font-size:.75rem;color:var(--text-dim)">${m.pct}%</span>`:''}</div>`).join('')})()}</td><td style="font-size:.82rem">${window.getBizLineName(e.businessLine)}</td>
      <td class="ops-hide" style="font-size:.82rem">${e.businessUnit||'—'}</td>
      <td style="min-width:180px">${projHtml}</td>
      <td class="emp-comp-toggle-cell"></td>
      <td class="${cs} emp-comp-col">${fmt(e.salary)}</td><td class="emp-comp-col">${bp}%</td><td class="${cs} emp-comp-col">${fmt(ba)}</td><td class="${cs} emp-comp-col">${fmt(ben)}</td><td class="${cs} emp-comp-col" style="font-weight:600;color:var(--accent)">${fmt(proratedTc)}${af<1?`<span style="font-size:.7rem;color:var(--text-dim);margin-left:4px" title="Prorated from ${fmt(tc)} annual">(${Math.round(af*100)}%)</span>`:''}</td>
      <td>${getCapPct(e)}%</td><td class="${cs} emp-comp-col">${fmt(getProratedOpEx(e))}</td><td class="${cs} emp-comp-col">${fmt(getProratedCapEx(e))}</td>
      <td>${e.hireDate||'—'}</td><td>${e.termDate||'—'}</td>
    </tr>`;
  }).join('');
}
// Comp detail column toggle
let empCompExpanded=false;
function syncEmpCompCols(){
  document.querySelectorAll('#empTable .emp-comp-col').forEach(el=>{el.style.display=empCompExpanded?'':'none'});
  const tog=document.getElementById('empCompToggle');
  if(tog)tog.textContent=empCompExpanded?'−':'+';
}
document.getElementById('empCompToggle').addEventListener('click',()=>{empCompExpanded=!empCompExpanded;syncEmpCompCols()});
// Re-sync after render
const _origRenderEmployees=renderEmployees;
renderEmployees=function(){_origRenderEmployees();syncEmpCompCols()};

document.getElementById('empFilterName').addEventListener('input',renderEmployees);
['empFilterCountry','empFilterSeniority','empFilterFunction','empFilterMarket','empFilterBizLine','empFilterProject'].forEach(id=>{
  document.getElementById(id).addEventListener('change',renderEmployees);
});
document.querySelectorAll('#empTable th.sortable').forEach(th=>{
  th.addEventListener('click',()=>{
    const col=th.dataset.sort;
    if(empSortCol===col){empSortAsc=!empSortAsc}else{empSortCol=col;empSortAsc=true}
    renderEmployees();
  });
});

// ── MASS CHANGE ──
function openMassChange(){
  document.getElementById('massChangeOverlay').style.display='block';
  document.getElementById('massChangeModal').style.display='block';
  document.getElementById('mcField').value='';
  document.getElementById('mcFrom').innerHTML='<option value="">Select field first</option>';
  document.getElementById('mcTo').innerHTML='<option value="">Select field first</option>';
  document.getElementById('mcFilteredOnly').checked=false;
  document.getElementById('mcPreview').style.display='none';
  document.getElementById('btnApplyMassChange').disabled=true;
  // Hide empType option in ops mode (only finance can change type)
  const isOps=document.body.classList.contains('ops-mode');
  const typeOpt=document.querySelector('#mcField option[value="empType"]');
  if(typeOpt)typeOpt.style.display=isOps?'none':'';
}
function closeMassChange(){
  document.getElementById('massChangeOverlay').style.display='none';
  document.getElementById('massChangeModal').style.display='none';
}
function getMassChangeOptions(field){
  if(field==='empType')return [{value:'existing',label:'Existing'},{value:'hire',label:'New Hire'}];
  if(field==='project'){
    return state.projects.map(p=>({value:p.id,label:p.code+(p.product?' — '+p.product:'')}));
  }
  if(field==='function')return FUNCTIONS.map(f=>({value:f,label:f}));
  if(field==='seniority')return SENIORITY.map(s=>({value:s,label:s}));
  if(field==='country')return COUNTRIES.map(c=>({value:c,label:c}));
  if(field==='businessLine')return state.bizLines.map(b=>({value:b.code,label:b.code+' — '+b.name}));
  if(field==='capPct'){
    const vals=[...new Set(state.employees.map(e=>e.capPct||0))].sort((a,b)=>a-b);
    return vals.map(v=>({value:String(v),label:v+'%'}));
  }
  return [];
}
function populateMcDropdowns(){
  const field=document.getElementById('mcField').value;
  const fromSel=document.getElementById('mcFrom');
  const toSel=document.getElementById('mcTo');
  if(!field){
    fromSel.innerHTML='<option value="">Select field first</option>';
    toSel.innerHTML='<option value="">Select field first</option>';
    document.getElementById('mcPreview').style.display='none';
    document.getElementById('btnApplyMassChange').disabled=true;
    return;
  }
  const opts=getMassChangeOptions(field);
  if(field==='capPct'){
    // From: dropdown of existing values; To: free numeric input
    fromSel.outerHTML=`<select id="mcFrom" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px"><option value="">Any value</option>${opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`;
    toSel.outerHTML=`<input id="mcTo" type="number" min="0" max="100" placeholder="New CapEx %" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px">`;
    document.getElementById('mcFrom').addEventListener('change',updateMcPreview);
    document.getElementById('mcTo').addEventListener('input',updateMcPreview);
  } else {
    // Restore selects if they were replaced by inputs
    const fromEl=document.getElementById('mcFrom');
    if(fromEl.tagName!=='SELECT'){
      fromEl.outerHTML=`<select id="mcFrom" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px"></select>`;
    }
    const toEl=document.getElementById('mcTo');
    if(toEl.tagName!=='SELECT'){
      toEl.outerHTML=`<select id="mcTo" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px"></select>`;
    }
    const fromSelect=document.getElementById('mcFrom');
    const toSelect=document.getElementById('mcTo');
    fromSelect.innerHTML='<option value="">Select…</option>'+opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    toSelect.innerHTML='<option value="">Select…</option>'+opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    fromSelect.addEventListener('change',updateMcPreview);
    toSelect.addEventListener('change',updateMcPreview);
  }
  updateMcPreview();
}
function getFilteredEmployees(){
  const fName=(document.getElementById('empFilterName').value||'').toLowerCase();
  const fCountry=document.getElementById('empFilterCountry').value;
  const fSeniority=document.getElementById('empFilterSeniority').value;
  const fFunction=document.getElementById('empFilterFunction').value;
  const fMarket=document.getElementById('empFilterMarket').value;
  const fBizLine=document.getElementById('empFilterBizLine').value;
  const fProject=document.getElementById('empFilterProject').value;
  let emps=state.employees;
  if(fName)emps=emps.filter(e=>e.name.toLowerCase().includes(fName));
  if(fCountry)emps=emps.filter(e=>e.country===fCountry);
  if(fSeniority)emps=emps.filter(e=>e.seniority===fSeniority);
  if(fFunction)emps=emps.filter(e=>e.function===fFunction);
  if(fMarket)emps=emps.filter(e=>getEmpMarkets(e).some(m=>m.code===fMarket));
  if(fBizLine)emps=emps.filter(e=>e.businessLine===fBizLine);
  if(fProject)emps=emps.filter(e=>(e.allocations||[]).some(a=>a.projId===fProject));
  return emps;
}
function getMcMatchingEmps(){
  const field=document.getElementById('mcField').value;
  const fromVal=document.getElementById('mcFrom').value;
  const filteredOnly=document.getElementById('mcFilteredOnly').checked;
  let emps=filteredOnly?getFilteredEmployees():state.employees;
  if(!field)return [];
  if(field==='project'){
    if(!fromVal)return emps.filter(e=>(e.allocations||[]).length>0);
    return emps.filter(e=>(e.allocations||[]).some(a=>a.projId===fromVal));
  }
  if(field==='capPct'){
    if(!fromVal)return emps;
    return emps.filter(e=>String(e.capPct||0)===fromVal);
  }
  if(!fromVal)return emps;
  if(field==='empType')return emps.filter(e=>(e.empType||'existing')===fromVal);
  if(field==='function')return emps.filter(e=>e.function===fromVal);
  if(field==='seniority')return emps.filter(e=>e.seniority===fromVal);
  if(field==='country')return emps.filter(e=>e.country===fromVal);
  if(field==='businessLine')return emps.filter(e=>e.businessLine===fromVal);
  return [];
}
function updateMcPreview(){
  const field=document.getElementById('mcField').value;
  const toVal=document.getElementById('mcTo').value;
  const preview=document.getElementById('mcPreview');
  const btn=document.getElementById('btnApplyMassChange');
  if(!field||!toVal){
    preview.style.display='none';
    btn.disabled=true;
    return;
  }
  const matches=getMcMatchingEmps();
  preview.style.display='block';
  const fieldLabel={empType:'Type',project:'Project',function:'Function',seniority:'Seniority',capPct:'CapEx %',country:'Country',businessLine:'Business Line'}[field];
  if(matches.length===0){
    preview.innerHTML=`No employees match the selected criteria.`;
    btn.disabled=true;
  } else {
    preview.innerHTML=`<strong>${matches.length}</strong> employee${matches.length!==1?'s':''} will have their <strong>${fieldLabel}</strong> updated.`;
    btn.disabled=false;
  }
}
function applyMassChange(){
  const field=document.getElementById('mcField').value;
  const fromVal=document.getElementById('mcFrom').value;
  const toVal=document.getElementById('mcTo').value;
  if(!field||!toVal)return;
  const matches=getMcMatchingEmps();
  if(!matches.length)return;
  const fieldLabel={empType:'Type',project:'Project',function:'Function',seniority:'Seniority',capPct:'CapEx %',country:'Country',businessLine:'Business Line'}[field];
  if(!confirm(`Update ${fieldLabel} for ${matches.length} employee${matches.length!==1?'s':''}?`))return;
  matches.forEach(emp=>{
    if(field==='empType'){
      emp.empType=toVal;
    } else if(field==='project'){
      if(fromVal){
        // Replace specific project allocation
        (emp.allocations||[]).forEach(a=>{if(a.projId===fromVal)a.projId=toVal});
      } else {
        // Replace primary project
        const primary=(emp.allocations||[]).find(a=>a.primary);
        if(primary)primary.projId=toVal;
      }
    } else if(field==='capPct'){
      emp.capPct=parseFloat(toVal)||0;
    } else if(field==='function'){
      emp.function=toVal;
    } else if(field==='seniority'){
      emp.seniority=toVal;
    } else if(field==='country'){
      emp.country=toVal;
      emp.businessUnit=COUNTRY_BU[toVal]||'';
    } else if(field==='businessLine'){
      emp.businessLine=toVal;
    }
  });
  saveState();
  closeMassChange();
  renderEmployees();
}
document.getElementById('btnMassChange').addEventListener('click',openMassChange);
document.getElementById('mcField').addEventListener('change',populateMcDropdowns);
document.getElementById('mcFilteredOnly').addEventListener('change',updateMcPreview);
document.getElementById('btnApplyMassChange').addEventListener('click',applyMassChange);

// Exports
export { renderEmployees, startEdit, deleteEmp, startInlineEdit, saveInlineEdit, cancelInlineEdit,
  setInlinePrimary, addInlineAlloc, removeInlineAlloc,
  setFormPrimary, onFormAllocProjChange, onFormAllocPctChange, removeFormAlloc,
  clearForm, renderFormAllocations, getFormAllocations,
  openMassChange, closeMassChange, applyMassChange };

// Assign to window for onclick handlers
window.startEdit = startEdit;
window.deleteEmp = deleteEmp;
window.startInlineEdit = startInlineEdit;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.setInlinePrimary = setInlinePrimary;
window.addInlineAlloc = addInlineAlloc;
window.removeInlineAlloc = removeInlineAlloc;
window.setFormPrimary = setFormPrimary;
window.onFormAllocProjChange = onFormAllocProjChange;
window.onFormAllocPctChange = onFormAllocPctChange;
window.removeFormAlloc = removeFormAlloc;
window.renderEmployees = renderEmployees;

// ── FTE Sparkline + TBD/TBH Adjustment ──
let fteSparkChart=null;
let fteAdjPending=0;
function renderFteSparkline(){
  const canvas=document.getElementById('empFteSparkline');
  const totalEl=document.getElementById('fteTrendTotal');
  if(!canvas||typeof Chart==='undefined')return;
  // Constrain canvas parent height
  canvas.parentElement.style.height='44px';
  canvas.style.height='44px';
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const emps=state.employees||[];
  const hcByMonth=MO.map((_,mi)=>emps.filter(e=>(e.startMonth||0)<=mi).length);
  if(totalEl)totalEl.textContent=hcByMonth[hcByMonth.length-1]+' FTEs';
  const colors=window.getChartColors?window.getChartColors():['#4a8cc8'];
  if(fteSparkChart)fteSparkChart.destroy();
  fteSparkChart=new Chart(canvas,{
    type:'line',
    data:{labels:MO,datasets:[{data:hcByMonth,borderColor:colors[0],backgroundColor:'transparent',borderWidth:2,pointRadius:2,pointBackgroundColor:colors[0],tension:0.3,datalabels:{display:false}}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:2,bottom:2,left:2,right:2}},
      plugins:{legend:{display:false},datalabels:{display:false},tooltip:{enabled:true,callbacks:{label:ctx=>ctx.parsed.y+' FTEs'}},yoyArrows:false},
      scales:{x:{display:false},y:{display:false}}
    }
  });
}

function applyFteAdj(delta){
  fteAdjPending+=delta;
  const countEl=document.getElementById('fteAdjCount');
  if(countEl)countEl.textContent=fteAdjPending>0?'+'+fteAdjPending:String(fteAdjPending);
  if(delta>0){
    // Add a TBH (to-be-hired) placeholder
    const nextNum=(state.employees||[]).filter(e=>e.name&&e.name.startsWith('TBH#')).length+1;
    state.employees.push({
      id:'tbh'+Date.now()+Math.random().toString(36).slice(2,5),
      name:'TBH#'+nextNum,
      function:'Software Engineering',seniority:'Mid-Level',country:'United States',
      businessUnit:'US001',businessLine:'100000',
      baseSalary:118000,bonusPct:8,benefitsPct:20,
      startMonth:Math.min(11,new Date().getMonth()+1),
      isNewHire:true,allocations:[],_colorTag:''
    });
  } else if(delta<0){
    // Add a TBD (to-be-determined/removed) — negative adjustment
    const nextNum=(state.employees||[]).filter(e=>e.name&&e.name.startsWith('TBD#')).length+1;
    state.employees.push({
      id:'tbd'+Date.now()+Math.random().toString(36).slice(2,5),
      name:'TBD#'+nextNum,
      function:'',seniority:'',country:'United States',
      businessUnit:'US001',businessLine:'',
      baseSalary:0,bonusPct:0,benefitsPct:0,
      startMonth:new Date().getMonth(),
      isNewHire:false,_isTBD:true,allocations:[],_colorTag:''
    });
  }
  saveState();renderEmployees();renderFteSparkline();
}

const adjPlus=document.getElementById('fteAdjPlus');
const adjMinus=document.getElementById('fteAdjMinus');
if(adjPlus)adjPlus.addEventListener('click',()=>applyFteAdj(1));
if(adjMinus)adjMinus.addEventListener('click',()=>applyFteAdj(-1));

// Render sparkline after employees render
const _origRender=renderEmployees;
renderEmployees=function(){_origRender();try{renderFteSparkline()}catch(e){}};
window.renderEmployees=renderEmployees;
window.openMassChange = openMassChange;
window.closeMassChange = closeMassChange;
window.applyMassChange = applyMassChange;
