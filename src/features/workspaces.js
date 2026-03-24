// ── WORKSPACES (localStorage) ── ES Module
// Extracted from index.html lines 8011–8558

import { state, saveState, ensureStateFields } from '../lib/state.js';
import { uid } from '../lib/constants.js';

export let currentWorkspaceName='Default';

// Workspace helpers — plain localStorage
const WS_INDEX_KEY='compPlanWorkspaces';
function getWorkspaceIndex(){
  const raw=localStorage.getItem(WS_INDEX_KEY);
  return raw?JSON.parse(raw):[];
}
function saveWorkspaceIndex(idx){
  localStorage.setItem(WS_INDEX_KEY,JSON.stringify(idx));
}

function updateWsDisplay(){
  if(window.persistenceMode==='session'&&window.sessionContext){window.updateSessionUI();return}
  const el=document.getElementById('wsNameDisplay');
  if(el)el.textContent=currentWorkspaceName;
}

// ── LOCAL workspace functions (template mode) ──
function saveWorkspaceAsLocal(name){
  if(!name||!name.trim())return;
  name=name.trim();
  const idx=getWorkspaceIndex();
  const key='ws_'+name.replace(/[^a-zA-Z0-9_-]/g,'_');
  const existing=idx.find(w=>w.key===key);
  const meta={key,name,savedAt:new Date().toISOString(),employees:state.employees.length,projects:state.projects.length};
  if(existing){Object.assign(existing,meta)}else{idx.push(meta)}
  localStorage.setItem(key,JSON.stringify(state));
  saveWorkspaceIndex(idx);
  currentWorkspaceName=name;
  localStorage.setItem('compPlanActiveWS',name);
  saveState();
  updateWsDisplay();
  renderWorkspaceList();
}
function loadWorkspaceLocal(key,name){
  if(!confirm(`Load workspace "${name}"? Any unsaved changes to "${currentWorkspaceName}" will be lost.`))return;
  const raw=localStorage.getItem(key);
  if(!raw){alert('Workspace data not found');return}
  Object.assign(state,JSON.parse(raw));ensureStateFields();
  currentWorkspaceName=name;localStorage.setItem('compPlanActiveWS',name);
  saveState();updateWsDisplay();window.initDropdowns();window.renderAll();
}
function deleteWorkspaceLocal(key,name){
  if(!confirm(`Delete workspace "${name}"? This cannot be undone.`))return;
  localStorage.removeItem(key);
  let idx=getWorkspaceIndex();idx=idx.filter(w=>w.key!==key);saveWorkspaceIndex(idx);renderWorkspaceList();
}
function renameWorkspaceLocal(key,oldName){
  const newName=prompt('Rename workspace:',oldName);
  if(!newName||!newName.trim()||newName.trim()===oldName)return;
  const trimmed=newName.trim();
  const newKey='ws_'+trimmed.replace(/[^a-zA-Z0-9_-]/g,'_');
  const idx=getWorkspaceIndex();
  if(newKey!==key&&idx.find(w=>w.key===newKey)){alert('A workspace with that name already exists');return}
  const entry=idx.find(w=>w.key===key);if(!entry)return;
  if(newKey!==key){const data=localStorage.getItem(key);localStorage.setItem(newKey,data);localStorage.removeItem(key);entry.key=newKey}
  entry.name=trimmed;saveWorkspaceIndex(idx);
  if(currentWorkspaceName===oldName){currentWorkspaceName=trimmed;localStorage.setItem('compPlanActiveWS',trimmed);updateWsDisplay()}
  renderWorkspaceList();
}
function duplicateWorkspaceLocal(key,name){
  const newName=prompt('Name for the copy:',name+' (Copy)');
  if(!newName||!newName.trim())return;
  const newKey='ws_'+newName.trim().replace(/[^a-zA-Z0-9_-]/g,'_');
  const idx=getWorkspaceIndex();
  if(idx.find(w=>w.key===newKey)){alert('A workspace with that name already exists');return}
  const data=localStorage.getItem(key);localStorage.setItem(newKey,data);
  const parsed=data?JSON.parse(data):null;
  idx.push({key:newKey,name:newName.trim(),savedAt:new Date().toISOString(),employees:parsed?.employees?.length||0,projects:parsed?.projects?.length||0});
  saveWorkspaceIndex(idx);renderWorkspaceList();
}

// ── SERVER version functions (session mode) ──
async function saveVersionToServer(name){
  if(!window.sessionContext)return;
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:name.trim(),stateData:JSON.stringify(state),userId:window.sessionContext.userId})
    });
    if(!resp.ok){const d=await resp.json();alert(d.error||'Error saving version');return}
    const v=await resp.json();
    window.sessionContext.versionId=v.id;window.sessionContext.versionName=v.name;
    localStorage.setItem('compPlanSession',JSON.stringify(window.sessionContext));
    window.updateSessionUI();renderWorkspaceList();
    if(window.ws&&window.ws.readyState===1)window.ws.send(JSON.stringify({type:'switch_version',versionId:v.id}));
    window.showToast('Version saved: '+v.name);
  }catch(e){alert('Error saving version')}
}
async function loadVersionFromServer(versionId,name){
  if(!window.sessionContext)return;
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${versionId}`);
    if(!resp.ok){alert('Version not found');return}
    const v=await resp.json();
    Object.assign(state,JSON.parse(v.state_data));ensureStateFields();
    window.sessionContext.versionId=v.id;window.sessionContext.versionName=v.name;
    localStorage.setItem('compPlanSession',JSON.stringify(window.sessionContext));
    window.execFilterProduct='';window.execFilterCategory='';
    window.updateSessionUI();window.initDropdowns();
    try{window.renderAll()}catch(re){console.error('Render error after load:',re)}
    if(window.ws&&window.ws.readyState===1)window.ws.send(JSON.stringify({type:'switch_version',versionId:v.id}));
    window.showToast('Loaded: '+v.name);
  }catch(e){console.error('Error loading version:',e);alert('Error loading version: '+e.message)}
}
async function deleteVersionFromServer(versionId,name){
  if(!confirm(`Delete version "${name}"? This cannot be undone.`))return;
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${versionId}`,{method:'DELETE'});
    if(!resp.ok){const d=await resp.json();alert(d.error||'Error');return}
    renderWorkspaceList();
  }catch(e){alert('Error deleting version')}
}
async function renameVersionOnServer(versionId,oldName){
  const newName=prompt('Rename version:',oldName);
  if(!newName||!newName.trim()||newName.trim()===oldName)return;
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${versionId}/rename`,{
      method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newName.trim()})
    });
    if(!resp.ok){const d=await resp.json();alert(d.error||'Error');return}
    if(window.sessionContext.versionId===versionId){window.sessionContext.versionName=newName.trim();localStorage.setItem('compPlanSession',JSON.stringify(window.sessionContext));window.updateSessionUI()}
    renderWorkspaceList();
  }catch(e){alert('Error renaming version')}
}
async function duplicateVersionOnServer(versionId,name){
  const newName=prompt('Name for the copy:',name+' (Copy)');
  if(!newName||!newName.trim())return;
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${versionId}/duplicate`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:newName.trim(),userId:window.sessionContext.userId})
    });
    if(!resp.ok){const d=await resp.json();alert(d.error||'Error');return}
    renderWorkspaceList();window.showToast('Version duplicated');
  }catch(e){alert('Error duplicating version')}
}

// ── Unified workspace/version wrapper functions ──
function saveWorkspaceAs(name){
  if(window.persistenceMode==='session'){saveVersionToServer(name)}else{saveWorkspaceAsLocal(name)}
}
function loadWorkspace(keyOrId,name){
  if(window.persistenceMode==='session'){loadVersionFromServer(keyOrId,name)}else{loadWorkspaceLocal(keyOrId,name)}
}
function deleteWorkspace(keyOrId,name){
  if(window.persistenceMode==='session'){deleteVersionFromServer(keyOrId,name)}else{deleteWorkspaceLocal(keyOrId,name)}
}
function renameWorkspace(keyOrId,name){
  if(window.persistenceMode==='session'){renameVersionOnServer(keyOrId,name)}else{renameWorkspaceLocal(keyOrId,name)}
}
function duplicateWorkspace(keyOrId,name){
  if(window.persistenceMode==='session'){duplicateVersionOnServer(keyOrId,name)}else{duplicateWorkspaceLocal(keyOrId,name)}
}

export function renderWorkspaceList(){
  if(window.persistenceMode==='session'){renderVersionList();return}
  const idx=getWorkspaceIndex();
  const container=document.getElementById('wsListContainer');
  if(!idx.length){
    container.innerHTML='<p style="color:var(--text-dim);font-size:.85rem">No saved workspaces yet. Use "Save As" above to create your first workspace.</p>';
    return;
  }
  // Merge mode header
  let html='';
  if(idx.length>=2){
    html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    html+=`<button class="btn btn-sm${wsMergeMode?' btn-danger':''}" onclick="toggleWsMergeMode()">${wsMergeMode?'Cancel Merge':'Merge Workspaces'}</button>`;
    if(wsMergeMode){
      html+=`<span style="color:var(--text-dim);font-size:.8rem">Select 2+ workspaces to combine</span>`;
      html+=`<button class="btn btn-sm btn-primary" onclick="executeWsMerge()" ${wsMergeSelected.size<2?'disabled':''}style="margin-left:auto">Merge Selected (${wsMergeSelected.size})</button>`;
    }
    html+=`</div>`;
  }
  html+='<ul class="ws-list">';
  idx.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt)).forEach(w=>{
    const isActive=w.name===currentWorkspaceName;
    const date=new Date(w.savedAt);
    const dateStr=date.toLocaleDateString()+' '+date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const esc=w.name.replace(/'/g,"\\'");
    const isChecked=wsMergeSelected.has(w.key);
    html+=`<li>`;
    if(wsMergeMode){
      html+=`<label style="display:flex;align-items:center;cursor:pointer;margin-right:8px"><input type="checkbox" ${isChecked?'checked':''} onchange="toggleWsMergeSelect('${w.key}')" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer"></label>`;
    }
    html+=`<div class="ws-info">
        <div class="ws-title">${w.name}${isActive?' <span class="ws-active">ACTIVE</span>':''}</div>
        <div class="ws-meta">${w.employees||0} employees, ${w.projects||0} projects \u2014 Saved ${dateStr}</div>
      </div>`;
    if(!wsMergeMode){
      html+=`<div style="display:flex;gap:4px;flex-shrink:0">
        ${!isActive?`<button class="btn btn-sm btn-primary" onclick="loadWorkspace('${w.key}','${esc}')">Load</button>`:''}
        <button class="btn btn-sm" onclick="renameWorkspace('${w.key}','${esc}')">Rename</button>
        <button class="btn btn-sm" onclick="duplicateWorkspace('${w.key}','${esc}')">Copy</button>
        <button class="btn btn-sm btn-danger" onclick="deleteWorkspace('${w.key}','${esc}')">Del</button>
      </div>`;
    }
    html+=`</li>`;
  });
  html+='</ul>';
  container.innerHTML=html;
}

// Render version list (session mode)
async function renderVersionList(){
  const container=document.getElementById('wsListContainer');
  if(!container||!window.sessionContext)return;
  container.innerHTML='<p style="color:var(--text-dim);font-size:.82rem">Loading versions...</p>';
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions`);
    const versions=await resp.json();
    if(!versions.length){container.innerHTML='<p style="color:var(--text-dim);font-size:.85rem">No versions yet.</p>';return}
    let html='';
    if(versions.length>=2){
      html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
      html+=`<button class="btn btn-sm${wsMergeMode?' btn-danger':''}" onclick="toggleWsMergeMode()">${wsMergeMode?'Cancel Merge':'Merge Versions'}</button>`;
      if(wsMergeMode){
        html+=`<span style="color:var(--text-dim);font-size:.8rem">Select 2+ versions to combine</span>`;
        html+=`<button class="btn btn-sm btn-primary" onclick="executeVersionMerge()" ${wsMergeSelected.size<2?'disabled':''}style="margin-left:auto">Merge Selected (${wsMergeSelected.size})</button>`;
      }
      html+=`</div>`;
    }
    html+='<ul class="ws-list">';
    versions.forEach(v=>{
      const isActive=v.id===window.sessionContext.versionId;
      const date=new Date(v.updated_at);
      const dateStr=date.toLocaleDateString()+' '+date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      const esc=v.name.replace(/'/g,"\\'");
      const vKey='v_'+v.id;
      const isChecked=wsMergeSelected.has(vKey);
      html+=`<li>`;
      if(wsMergeMode){
        html+=`<label style="display:flex;align-items:center;cursor:pointer;margin-right:8px"><input type="checkbox" ${isChecked?'checked':''} onchange="toggleWsMergeSelect('${vKey}')" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer"></label>`;
      }
      html+=`<div class="ws-info">
          <div class="ws-title">${v.name}${isActive?' <span class="ws-active">ACTIVE</span>':''}</div>
          <div class="ws-meta">${v.created_by_name?'by '+v.created_by_name+' \u2014 ':''}Updated ${dateStr}</div>
        </div>`;
      if(!wsMergeMode){
        html+=`<div style="display:flex;gap:4px;flex-shrink:0">
          ${!isActive?`<button class="btn btn-sm btn-primary" onclick="loadVersionFromServer(${v.id},'${esc}')">Load</button>`:''}
          <button class="btn btn-sm" onclick="renameVersionOnServer(${v.id},'${esc}')">Rename</button>
          <button class="btn btn-sm" onclick="duplicateVersionOnServer(${v.id},'${esc}')">Copy</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVersionFromServer(${v.id},'${esc}')">Del</button>
        </div>`;
      }
      html+=`</li>`;
    });
    html+='</ul>';
    container.innerHTML=html;
  }catch(e){container.innerHTML='<p style="color:var(--danger);font-size:.82rem">Error loading versions</p>'}
}

export function openWorkspaceModal(){
  const modal=document.getElementById('wsModal');
  if(window.persistenceMode==='session'&&window.sessionContext){
    // Session mode: show versions
    let html='<p style="color:var(--text-dim);font-size:.85rem;margin-bottom:12px">Session: <strong style="color:var(--accent)">'+(window.sessionContext.sessionName||'Active')+'</strong> | Current: <strong style="color:var(--accent)">'+(window.sessionContext.versionName||'Default')+'</strong></p>';
    html+='<div id="wsModalVersionList"><p style="color:var(--text-dim);font-size:.82rem">Loading...</p></div>';
    document.getElementById('wsModalContent').innerHTML=html;
    modal.classList.add('show');
    // Load versions async
    fetch(`/api/sessions/${window.sessionContext.code}/versions`).then(r=>r.json()).then(versions=>{
      const listEl=document.getElementById('wsModalVersionList');
      if(!listEl)return;
      if(!versions.length){listEl.innerHTML='<p style="color:var(--text-dim);font-size:.82rem">No versions.</p>';return}
      let h='<ul class="ws-list" style="border:1px solid var(--border-light);border-radius:6px;max-height:300px;overflow-y:auto">';
      versions.forEach(v=>{
        const isActive=v.id===window.sessionContext.versionId;
        const esc=v.name.replace(/'/g,"\\'");
        const vd=new Date(v.updated_at);const vds=vd.toLocaleDateString()+' '+vd.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        h+=`<li><div class="ws-info"><div class="ws-title">${v.name}${isActive?' <span class="ws-active">ACTIVE</span>':''}</div>
          <div class="ws-meta">${v.created_by_name?v.created_by_name+' \u2014 ':''}Saved ${vds}</div></div>
          ${!isActive?`<button class="btn btn-sm btn-primary" onclick="loadVersionFromServer(${v.id},'${esc}');closeWorkspaceModal()">Load</button>`:''}</li>`;
      });
      h+='</ul>';
      listEl.innerHTML=h;
    }).catch(()=>{});
  }else{
    // Template mode: show local workspaces
    const idx=getWorkspaceIndex();
    let html='<p style="color:var(--text-dim);font-size:.85rem;margin-bottom:12px">Current: <strong style="color:var(--accent)">'+currentWorkspaceName+'</strong></p>';
    if(idx.length){
      html+='<ul class="ws-list" style="border:1px solid var(--border-light);border-radius:6px;max-height:300px;overflow-y:auto">';
      idx.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt)).forEach(w=>{
        const isActive=w.name===currentWorkspaceName;
        const esc=w.name.replace(/'/g,"\\'");
        const d=new Date(w.savedAt);const ds=d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        html+=`<li><div class="ws-info"><div class="ws-title">${w.name}${isActive?' <span class="ws-active">ACTIVE</span>':''}</div>
          <div class="ws-meta">${w.employees||0} employees, ${w.projects||0} projects \u2014 Saved ${ds}</div></div>
          ${!isActive?`<button class="btn btn-sm btn-primary" onclick="loadWorkspace('${w.key}','${esc}');closeWorkspaceModal()">Load</button>`:''}</li>`;
      });
      html+='</ul>';
    }else{
      html+='<p style="color:var(--text-dim);font-size:.85rem">No saved workspaces. Go to the Export tab to save one.</p>';
    }
    document.getElementById('wsModalContent').innerHTML=html;
    modal.classList.add('show');
  }
}
export function closeWorkspaceModal(){document.getElementById('wsModal').classList.remove('show')}
document.getElementById('wsModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeWorkspaceModal()});

// ── Workspace Merge ──
let wsMergeMode=false;
let wsMergeSelected=new Set();

function toggleWsMergeMode(){
  wsMergeMode=!wsMergeMode;
  wsMergeSelected.clear();
  renderWorkspaceList();
}

function toggleWsMergeSelect(key){
  if(wsMergeSelected.has(key))wsMergeSelected.delete(key);
  else wsMergeSelected.add(key);
  renderWorkspaceList();
}

function executeWsMerge(){
  if(wsMergeSelected.size<2){alert('Select at least 2 workspaces to merge.');return}
  const idx=getWorkspaceIndex();
  const selected=[...wsMergeSelected];
  // Load all selected workspace states
  const states=[];
  const names=[];
  for(const key of selected){
    const raw=localStorage.getItem(key);
    if(!raw){const ws=idx.find(w=>w.key===key);alert(`Could not load workspace "${ws?.name||key}".`);return}
    states.push(JSON.parse(raw));
    const ws=idx.find(w=>w.key===key);
    names.push(ws?.name||key);
  }
  // Merge: first workspace is the base, subsequent workspaces are merged in
  const merged=JSON.parse(JSON.stringify(states[0]));
  // Ensure arrays exist on base
  if(!merged.employees)merged.employees=[];
  if(!merged.projects)merged.projects=[];
  if(!merged.markets)merged.markets=[];
  if(!merged.bizLines)merged.bizLines=[];
  if(!merged.accounts)merged.accounts=[];
  if(!merged.vendorRows)merged.vendorRows=[];
  if(!merged.teRows)merged.teRows=[];
  if(!merged.customRates)merged.customRates=[];
  if(!merged.bonusMatrix)merged.bonusMatrix={};
  if(!merged.benefitsMatrix)merged.benefitsMatrix={};
  if(!merged.benefitsCountryMult)merged.benefitsCountryMult={};
  // Build dedup set from base employees
  const empKeys=new Set(merged.employees.map(e=>(e.name||'').toLowerCase()+'|'+(e.function||'')+'|'+(e.country||'')));
  // Track existing IDs to remap references
  for(let si=1;si<states.length;si++){
    const src=states[si];
    const projIdMap={};
    // Merge projects (dedupe by code)
    if(src.projects){
      src.projects.forEach(p=>{
        const existing=merged.projects.find(mp=>mp.code===p.code);
        if(existing){projIdMap[p.id]=existing.id}
        else{const newP=JSON.parse(JSON.stringify(p));newP.id=uid();projIdMap[p.id]=newP.id;merged.projects.push(newP)}
      });
    }
    // Merge employees (dedupe by name+function+country, keep one copy)
    if(src.employees){
      src.employees.forEach(e=>{
        const key=(e.name||'').toLowerCase()+'|'+(e.function||'')+'|'+(e.country||'');
        if(empKeys.has(key))return; // skip duplicate
        empKeys.add(key);
        const newE=JSON.parse(JSON.stringify(e));
        newE.id=uid();
        // Remap allocation project IDs
        if(newE.allocations){
          newE.allocations.forEach(a=>{if(projIdMap[a.projId])a.projId=projIdMap[a.projId]});
        }
        merged.employees.push(newE);
      });
    }
    // Merge markets (dedupe by code)
    if(src.markets){
      src.markets.forEach(m=>{if(!merged.markets.some(mm=>mm.code===m.code))merged.markets.push(JSON.parse(JSON.stringify(m)))});
    }
    // Merge bizLines (dedupe by code)
    if(src.bizLines){
      src.bizLines.forEach(b=>{if(!merged.bizLines.some(mb=>mb.code===b.code))merged.bizLines.push(JSON.parse(JSON.stringify(b)))});
    }
    // Merge accounts (dedupe by code)
    if(src.accounts){
      src.accounts.forEach(a=>{if(!merged.accounts.some(ma=>ma.code===a.code))merged.accounts.push(JSON.parse(JSON.stringify(a)))});
    }
    // Merge vendor rows (append all)
    if(src.vendorRows){
      src.vendorRows.forEach(r=>{const nr=JSON.parse(JSON.stringify(r));nr.id=uid();merged.vendorRows.push(nr)});
    }
    // Merge T&E rows (append all)
    if(src.teRows){
      src.teRows.forEach(r=>{const nr=JSON.parse(JSON.stringify(r));nr.id=uid();merged.teRows.push(nr)});
    }
    // Merge custom rates (dedupe by country+seniority+function)
    if(src.customRates){
      src.customRates.forEach(cr=>{
        if(!merged.customRates.some(mr=>mr.country===cr.country&&mr.seniority===cr.seniority&&mr.function===cr.function)){
          merged.customRates.push(JSON.parse(JSON.stringify(cr)));
        }
      });
    }
    // Merge bonus matrix (fill gaps only — don't overwrite base workspace values)
    if(src.bonusMatrix){
      for(const [sen,funcs] of Object.entries(src.bonusMatrix)){
        if(!merged.bonusMatrix[sen])merged.bonusMatrix[sen]={};
        for(const [func,val] of Object.entries(funcs)){
          if(merged.bonusMatrix[sen][func]==null)merged.bonusMatrix[sen][func]=val;
        }
      }
    }
    // Merge benefits matrix (fill gaps only)
    if(src.benefitsMatrix){
      for(const [sen,funcs] of Object.entries(src.benefitsMatrix)){
        if(!merged.benefitsMatrix[sen])merged.benefitsMatrix[sen]={};
        for(const [func,val] of Object.entries(funcs)){
          if(merged.benefitsMatrix[sen][func]==null)merged.benefitsMatrix[sen][func]=val;
        }
      }
    }
    // Merge benefits country multipliers (fill gaps only)
    if(src.benefitsCountryMult){
      for(const [c,v] of Object.entries(src.benefitsCountryMult)){
        if(merged.benefitsCountryMult[c]==null)merged.benefitsCountryMult[c]=v;
      }
    }
  }
  // Save as new workspace
  const mergeName='Merged \u2014 '+names.join(' + ');
  const promptName=prompt('Name for merged workspace:',mergeName);
  if(!promptName)return;
  // Store merged state
  const key='ws_'+promptName.replace(/[^a-zA-Z0-9_-]/g,'_');
  localStorage.setItem(key,JSON.stringify(merged));
  const wsIdx=getWorkspaceIndex();
  const existing=wsIdx.find(w=>w.key===key);
  const meta={key,name:promptName,savedAt:new Date().toISOString(),employees:merged.employees.length,projects:merged.projects.length};
  if(existing)Object.assign(existing,meta);else wsIdx.push(meta);
  saveWorkspaceIndex(wsIdx);
  wsMergeMode=false;wsMergeSelected.clear();
  renderWorkspaceList();
  alert(`Merged workspace "${promptName}" created with ${merged.employees.length} employees and ${merged.projects.length} projects. Use Load to switch to it.`);
}

export function mergeStates(states){
  const merged=JSON.parse(JSON.stringify(states[0]));
  // Ensure arrays exist on merged base
  if(!merged.employees)merged.employees=[];
  if(!merged.projects)merged.projects=[];
  if(!merged.markets)merged.markets=[];
  if(!merged.bizLines)merged.bizLines=[];
  if(!merged.accounts)merged.accounts=[];
  if(!merged.vendorRows)merged.vendorRows=[];
  if(!merged.teRows)merged.teRows=[];
  if(!merged.customRates)merged.customRates=[];
  if(!merged.bonusMatrix)merged.bonusMatrix={};
  if(!merged.benefitsMatrix)merged.benefitsMatrix={};
  if(!merged.benefitsCountryMult)merged.benefitsCountryMult={};
  // Build existing employee dedup set from base state
  const empKeys=new Set(merged.employees.map(e=>(e.name||'').toLowerCase()+'|'+(e.function||'')+'|'+(e.country||'')));
  for(let si=1;si<states.length;si++){
    const src=states[si];
    const projIdMap={};
    if(src.projects){src.projects.forEach(p=>{const existing=merged.projects.find(mp=>mp.code===p.code);if(existing){projIdMap[p.id]=existing.id}else{const newP=JSON.parse(JSON.stringify(p));newP.id=uid();projIdMap[p.id]=newP.id;merged.projects.push(newP)}})}
    if(src.employees){src.employees.forEach(e=>{
      const key=(e.name||'').toLowerCase()+'|'+(e.function||'')+'|'+(e.country||'');
      if(empKeys.has(key))return; // skip duplicate
      empKeys.add(key);
      const newE=JSON.parse(JSON.stringify(e));newE.id=uid();
      if(newE.allocations){newE.allocations.forEach(a=>{if(projIdMap[a.projId])a.projId=projIdMap[a.projId]})}
      merged.employees.push(newE);
    })}
    if(src.markets){src.markets.forEach(m=>{if(!merged.markets.some(mm=>mm.code===m.code))merged.markets.push(JSON.parse(JSON.stringify(m)))})}
    if(src.bizLines){src.bizLines.forEach(b=>{if(!merged.bizLines.some(mb=>mb.code===b.code))merged.bizLines.push(JSON.parse(JSON.stringify(b)))})}
    if(src.accounts){src.accounts.forEach(a=>{if(!merged.accounts.some(ma=>ma.code===a.code))merged.accounts.push(JSON.parse(JSON.stringify(a)))})}
    if(src.vendorRows){src.vendorRows.forEach(r=>{const nr=JSON.parse(JSON.stringify(r));nr.id=uid();merged.vendorRows.push(nr)})}
    if(src.teRows){src.teRows.forEach(r=>{const nr=JSON.parse(JSON.stringify(r));nr.id=uid();merged.teRows.push(nr)})}
    if(src.customRates){src.customRates.forEach(cr=>{if(!merged.customRates.some(mr=>mr.country===cr.country&&mr.seniority===cr.seniority&&mr.function===cr.function))merged.customRates.push(JSON.parse(JSON.stringify(cr)))})}
    if(src.bonusMatrix){for(const [sen,funcs] of Object.entries(src.bonusMatrix)){if(!merged.bonusMatrix[sen])merged.bonusMatrix[sen]={};for(const [func,val] of Object.entries(funcs)){if(merged.bonusMatrix[sen][func]==null)merged.bonusMatrix[sen][func]=val}}}
    if(src.benefitsMatrix){for(const [sen,funcs] of Object.entries(src.benefitsMatrix)){if(!merged.benefitsMatrix[sen])merged.benefitsMatrix[sen]={};for(const [func,val] of Object.entries(funcs)){if(merged.benefitsMatrix[sen][func]==null)merged.benefitsMatrix[sen][func]=val}}}
    if(src.benefitsCountryMult){for(const [c,v] of Object.entries(src.benefitsCountryMult)){if(merged.benefitsCountryMult[c]==null)merged.benefitsCountryMult[c]=v}}
  }
  return merged;
}

async function executeVersionMerge(){
  if(!window.sessionContext||wsMergeSelected.size<2){alert('Select at least 2 versions to merge.');return}
  const selected=[...wsMergeSelected];
  const versionIds=selected.map(k=>parseInt(k.replace('v_','')));
  const states=[];const names=[];
  try{
    for(const vid of versionIds){
      const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions/${vid}`);
      if(!resp.ok){alert(`Could not load version ${vid}`);return}
      const v=await resp.json();
      states.push(JSON.parse(v.state_data));
      names.push(v.name);
    }
  }catch(e){alert('Error loading versions for merge');return}
  const merged=mergeStates(states);
  const mergeName='Merged \u2014 '+names.join(' + ');
  const promptName=prompt('Name for merged version:',mergeName);
  if(!promptName)return;
  // Save as new version on server
  try{
    const resp=await fetch(`/api/sessions/${window.sessionContext.code}/versions`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:promptName,state_data:JSON.stringify(merged),created_by:window.sessionContext.userId,created_by_name:window.sessionContext.userName})
    });
    if(!resp.ok)throw new Error('Save failed');
    const saved=await resp.json();
    wsMergeMode=false;wsMergeSelected.clear();
    // Auto-load the merged version
    Object.assign(state,merged);ensureStateFields();
    window.execFilterProduct='';window.execFilterCategory='';
    if(saved.id){window.sessionContext.versionId=saved.id;window.sessionContext.versionName=promptName;localStorage.setItem('compPlanSession',JSON.stringify(window.sessionContext))}
    window.updateSessionUI();window.initDropdowns();
    try{window.renderAll()}catch(re){console.error('Render error after merge load:',re)}
    renderWorkspaceList();window.renderDataPanelWsList();
    window.showToast(`Merged "${promptName}" \u2014 ${merged.employees.length} employees, ${merged.projects.length} projects`);
  }catch(e){console.error('Merge save error:',e);alert('Error saving merged version: '+e.message)}
}

document.getElementById('btnWsSave').addEventListener('click',()=>{
  const name=document.getElementById('wsSaveName').value.trim();
  if(!name){alert('Please enter a name');return}
  saveWorkspaceAs(name);
  document.getElementById('wsSaveName').value='';
});
document.getElementById('btnWsQuickSave').addEventListener('click',()=>{
  if(window.persistenceMode==='session'&&window.sessionContext){
    saveWorkspaceAs(window.sessionContext.versionName||'Default');
  }else{
    saveWorkspaceAs(currentWorkspaceName);
  }
});

// Auto-save current workspace every 60 seconds (template mode only; session mode auto-saves on each change)
setInterval(()=>{
  if(window.persistenceMode==='template'&&state.employees&&state.employees.length>0&&currentWorkspaceName){
    saveWorkspaceAsLocal(currentWorkspaceName);
  }
},60000);

// Expose functions to window for inline onclick handlers
window.saveWorkspaceAs = saveWorkspaceAs;
window.loadWorkspace = loadWorkspace;
window.deleteWorkspace = deleteWorkspace;
window.renameWorkspace = renameWorkspace;
window.duplicateWorkspace = duplicateWorkspace;
window.openWorkspaceModal = openWorkspaceModal;
window.closeWorkspaceModal = closeWorkspaceModal;
window.toggleWsMergeMode = toggleWsMergeMode;
window.toggleWsMergeSelect = toggleWsMergeSelect;
window.executeWsMerge = executeWsMerge;
window.executeVersionMerge = executeVersionMerge;
window.loadVersionFromServer = loadVersionFromServer;
window.renameVersionOnServer = renameVersionOnServer;
window.duplicateVersionOnServer = duplicateVersionOnServer;
window.deleteVersionFromServer = deleteVersionFromServer;
window.saveWorkspaceAsLocal = saveWorkspaceAsLocal;
window.currentWorkspaceName = currentWorkspaceName;
window.renderWorkspaceList = renderWorkspaceList;
window.updateWsDisplay = updateWsDisplay;
