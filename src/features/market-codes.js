// ── MARKET CODES MANAGEMENT ──
import { state, saveState } from '../lib/state.js';

function initMarketCodes(){
  document.getElementById('btnAddMarket').addEventListener('click',()=>{
    const code=document.getElementById('mktCode').value.trim().toUpperCase();
    const name=document.getElementById('mktName').value.trim();
    if(!code||!name){alert('Please fill market code and name');return}
    if(!/^[A-Z]{2}\d{4}$/.test(code)){alert('Market code must be 2 letters + 4 digits (e.g. JP0011)');return}
    if(state.markets.some(m=>m.code===code)){alert('Market code already exists');return}
    state.markets.push({code,name});
    saveState();
    document.getElementById('mktCode').value='';
    document.getElementById('mktName').value='';
    renderMarkets();refreshAllDropdowns();
  });
}

function deleteMarket(code){
  const projCount=state.projects.filter(p=>p.marketCode===code).length;
  let msg=`Delete market "${code}"?`;
  if(projCount)msg+=` It is referenced by ${projCount} project(s) — their market will be cleared.`;
  if(!confirm(msg))return;
  state.markets=state.markets.filter(m=>m.code!==code);
  state.projects.forEach(p=>{if(p.marketCode===code)p.marketCode=''});
  saveState();renderMarkets();renderProjects();renderEmployees();refreshAllDropdowns();
}
window.deleteMarket = deleteMarket;

function saveMarketEdit(code){
  const row=document.querySelector(`tr[data-mkt="${code}"]`);if(!row)return;
  const m=state.markets.find(x=>x.code===code);if(!m)return;
  m.name=row.querySelector('.mkt-name').value.trim()||m.name;
  saveState();renderMarkets();refreshAllDropdowns();
}
window.saveMarketEdit = saveMarketEdit;

function renderMarkets(){
  const tbody=document.querySelector('#marketsTable tbody');
  tbody.innerHTML=state.markets.map(m=>{
    const projCount=state.projects.filter(p=>p.marketCode===m.code).length;
    const empCount=state.employees.filter(e=>getEmpMarkets(e).some(em=>em.code===m.code)).length;
    return `<tr data-mkt="${m.code}">
      <td style="font-weight:600;color:var(--accent)">${m.code}</td>
      <td><input class="mkt-name" value="${m.name}" onchange="saveMarketEdit('${m.code}')" style="padding:4px 6px;font-size:.85rem;border:1px solid var(--border-light);border-radius:4px"></td>
      <td style="font-size:.82rem;color:var(--text-dim)">${projCount}</td>
      <td style="font-size:.82rem;color:var(--text-dim)">${empCount}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteMarket('${m.code}')">Del</button></td>
    </tr>`;
  }).join('');
}
window.renderMarkets = renderMarkets;

export { renderMarkets, initMarketCodes };
