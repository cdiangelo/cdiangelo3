// ── PROJECTS ──
import { state, saveState } from '../lib/state.js';

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}

function initProjects(){
  document.getElementById('btnAddProject').addEventListener('click',()=>{
    const code=document.getElementById('projCode').value.trim();
    const marketCode=document.getElementById('projMarket').value;
    const product=document.getElementById('projProduct').value.trim();
    const category=document.getElementById('projCategory').value.trim();
    const description=document.getElementById('projDesc').value.trim();
    if(!code||!product||!category){alert('Please fill project code, product, and category');return}
    if(state.projects.some(p=>p.code===code)){alert('Project code already exists');return}
    state.projects.push({id:uid(),code,marketCode,bizLineCode:'',product,category,description});
    saveState();
    ['projCode','projProduct','projCategory','projDesc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('projMarket').value='';
    renderProjects();window.refreshProjectFilters();window.refreshProjectDropdown();
  });
}
initProjects();

function deleteProject(id){
  if(confirm('Delete this project? Employee allocations referencing it will be removed.')){
    state.employees.forEach(e=>{
      if(e.allocations)e.allocations=e.allocations.filter(a=>a.projId!==id);
      // projectId no longer used — allocations only
    });
    state.projects=state.projects.filter(p=>p.id!==id);
    saveState();renderProjects();window.refreshProjectFilters();window.refreshProjectDropdown();
  }
}
window.deleteProject = deleteProject;

function toggleAllocOverride(empId){
  if(state.allocOverrides[empId])delete state.allocOverrides[empId];
  else state.allocOverrides[empId]=true;
  saveState();renderProjects();renderEmployees();
}
window.toggleAllocOverride = toggleAllocOverride;

function renderProjects(){
  const ptbody=document.querySelector('#projectsTable tbody');
  ptbody.innerHTML=state.projects.map(p=>{
    // Compute allocated FTE and cost from employee-level allocations
    let allocFTE=0,allocCost=0;
    state.employees.forEach(e=>{
      if(!e.allocations)return;
      e.allocations.forEach(a=>{
        if(a.projId===p.id){
          allocFTE+=a.pct/100*getAnnualFactor(e);
          allocCost+=getProratedComp(e)*a.pct/100;
        }
      });
    });
    const marketOpts=state.markets.map(m=>`<option value="${m.code}"${m.code===p.marketCode?' selected':''}>${m.code} — ${m.name}</option>`).join('');
    const bizLineOpts=state.bizLines.map(b=>`<option value="${b.code}"${b.code===p.bizLineCode?' selected':''}>${b.code} — ${b.name}</option>`).join('');
    return `<tr>
      <td style="font-weight:600;color:var(--accent)">${p.code}</td>
      <td><select onchange="updateProjectMarket('${p.id}',this.value)" style="padding:4px 6px;font-size:.82rem"><option value="">—</option>${marketOpts}</select></td>
      <td><select onchange="updateProjectBizLine('${p.id}',this.value)" style="padding:4px 6px;font-size:.82rem"><option value="">—</option>${bizLineOpts}</select></td>
      <td><input value="${p.product}" onchange="updateProjectField('${p.id}','product',this.value)" style="padding:4px 6px;font-size:.82rem;width:120px"></td>
      <td><input value="${p.category}" onchange="updateProjectField('${p.id}','category',this.value)" style="padding:4px 6px;font-size:.82rem;width:120px"></td>
      <td><input value="${p.description||''}" onchange="updateProjectField('${p.id}','description',this.value)" style="padding:4px 6px;font-size:.82rem;width:160px"></td>
      <td>${allocFTE.toFixed(1)} FTE</td><td>${fmt(allocCost)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">Del</button></td>
    </tr>`;
  }).join('');
}
window.renderProjects = renderProjects;

function updateProjectMarket(projId,marketCode){
  const p=state.projects.find(x=>x.id===projId);
  if(p){p.marketCode=marketCode;saveState()}
}
window.updateProjectMarket = updateProjectMarket;

function updateProjectBizLine(projId,bizLineCode){
  const p=state.projects.find(x=>x.id===projId);
  if(p){p.bizLineCode=bizLineCode;saveState()}
}
window.updateProjectBizLine = updateProjectBizLine;

function updateProjectField(projId,field,value){
  const p=state.projects.find(x=>x.id===projId);
  if(p){p[field]=value;saveState()}
}
window.updateProjectField = updateProjectField;

export { renderProjects, initProjects };
