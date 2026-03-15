// ── BUSINESS LINES MANAGEMENT ──
import { state, saveState } from '../lib/state.js';

function initBizLines(){
  document.getElementById('btnAddBizLine').addEventListener('click',()=>{
    const code=document.getElementById('bizCode').value.trim();
    const name=document.getElementById('bizName').value.trim();
    if(!code||!name){alert('Please fill line code and name');return}
    if(!/^\d+$/.test(code)){alert('Business line code must be numeric (e.g. 800000)');return}
    if(state.bizLines.some(b=>b.code===code)){alert('Business line code already exists');return}
    state.bizLines.push({code,name});
    saveState();
    document.getElementById('bizCode').value='';
    document.getElementById('bizName').value='';
    renderBizLines();refreshAllDropdowns();
  });
}

function deleteBizLine(code){
  const empCount=state.employees.filter(e=>e.businessLine===code).length;
  let msg=`Delete business line "${code}"?`;
  if(empCount)msg+=` It is assigned to ${empCount} employee(s) — their business line will be cleared.`;
  if(!confirm(msg))return;
  state.bizLines=state.bizLines.filter(b=>b.code!==code);
  state.employees.forEach(e=>{if(e.businessLine===code)e.businessLine=''});
  saveState();renderBizLines();renderEmployees();refreshAllDropdowns();
}
window.deleteBizLine = deleteBizLine;

function saveBizLineEdit(code){
  const row=document.querySelector(`tr[data-biz="${code}"]`);if(!row)return;
  const b=state.bizLines.find(x=>x.code===code);if(!b)return;
  b.name=row.querySelector('.biz-name').value.trim()||b.name;
  saveState();renderBizLines();refreshAllDropdowns();
}
window.saveBizLineEdit = saveBizLineEdit;

function renderBizLines(){
  const tbody=document.querySelector('#bizLinesTable tbody');
  tbody.innerHTML=state.bizLines.map(b=>{
    const empCount=state.employees.filter(e=>e.businessLine===b.code).length;
    return `<tr data-biz="${b.code}">
      <td style="font-weight:600;color:var(--accent)">${b.code}</td>
      <td><input class="biz-name" value="${b.name}" onchange="saveBizLineEdit('${b.code}')" style="padding:4px 6px;font-size:.85rem;border:1px solid var(--border-light);border-radius:4px"></td>
      <td style="font-size:.82rem;color:var(--text-dim)">${empCount}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteBizLine('${b.code}')">Del</button></td>
    </tr>`;
  }).join('');
}
window.renderBizLines = renderBizLines;

function refreshAllDropdowns(){
  populateBizLineSelect(document.getElementById('empBusinessLine'));
  populateMarketSelect(document.getElementById('projMarket'));
  // Sync vendor module dims if initialized
  if(vendorModuleInited&&typeof renderVendorGridPublic==='function'){renderVendorGridPublic()}
}
window.refreshAllDropdowns = refreshAllDropdowns;

export { renderBizLines, initBizLines };
