// ── Mapping Rules + Dimension List helpers ──
import { state, saveState } from '../lib/state.js';

// ── Products & Categories list ──
function renderDimProductList(){
  const list=document.getElementById('dimProductList');
  if(!list)return;
  // Derive unique product+category combos from projects
  const combos=new Map();
  (state.projects||[]).forEach(p=>{
    if(p.product){
      const key=p.product+'|||'+p.category;
      if(!combos.has(key))combos.set(key,{product:p.product,category:p.category||''});
    }
  });
  if(!combos.size){
    list.innerHTML='<div style="font-size:.75rem;color:var(--tertiary);padding:4px">No products defined yet. Add via projects below.</div>';
    return;
  }
  list.innerHTML=[...combos.values()].map(c=>`
    <div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-elevated);font-size:.76rem">
      <span style="font-weight:500;color:var(--text);flex:1">${c.product}</span>
      <span style="color:var(--tertiary);font-size:.7rem">${c.category||'—'}</span>
    </div>`).join('');
}

// ── Mapping Rules ──
function getMappingRules(){
  if(!state.mappingRules)state.mappingRules=[];
  return state.mappingRules;
}

function renderMappingRules(){
  const list=document.getElementById('mappingRulesList');
  if(!list)return;
  const rules=getMappingRules();
  if(!rules.length){
    list.innerHTML='<div style="font-size:.78rem;color:var(--tertiary);padding:8px;text-align:center">No mapping rules defined. All dimensions must be selected manually.</div>';
    return;
  }
  list.innerHTML=rules.map((r,i)=>{
    const proj=r.projectCode||'Any';
    const parts=[];
    if(r.market)parts.push('Market: '+r.market);
    if(r.bizLine)parts.push('Biz Line: '+r.bizLine);
    if(r.product)parts.push('Product: '+r.product);
    if(r.category)parts.push('Category: '+r.category);
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:var(--bg-elevated);border-left:3px solid var(--accent)">
      <span style="font-size:.78rem;font-weight:500;color:var(--text);white-space:nowrap">Project ${proj}</span>
      <span style="font-size:.72rem;color:var(--tertiary)">→</span>
      <span style="font-size:.76rem;color:var(--text-dim);flex:1">${parts.join(' · ')||'No mappings'}</span>
      <button class="btn btn-sm" data-rule-idx="${i}" style="padding:2px 8px;font-size:.68rem;color:var(--danger)">×</button>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-rule-idx]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      rules.splice(+btn.dataset.ruleIdx,1);
      saveState();renderMappingRules();
    });
  });
}

function applyMappingRule(projectCode){
  const rules=getMappingRules();
  const rule=rules.find(r=>r.projectCode===projectCode);
  return rule||null;
}

// ── Init ──
function initMappingRules(){
  const addBtn=document.getElementById('btnAddRule');
  if(!addBtn)return;

  // Populate rule dropdowns
  function populateRuleDropdowns(){
    const projSel=document.getElementById('ruleProject');
    const mktSel=document.getElementById('ruleMarket');
    const blSel=document.getElementById('ruleBizLine');
    if(projSel){
      projSel.innerHTML='<option value="">Select project...</option>'+
        (state.projects||[]).filter(p=>p.code!=='GEN-000').map(p=>`<option value="${p.code}">${p.code} — ${p.product||''}</option>`).join('');
    }
    if(mktSel){
      mktSel.innerHTML='<option value="">—</option>'+
        (state.markets||[]).map(m=>`<option value="${m.code}">${m.code} — ${m.name}</option>`).join('');
    }
    if(blSel){
      blSel.innerHTML='<option value="">—</option>'+
        (state.bizLines||[]).map(b=>`<option value="${b.code}">${b.code} — ${b.name}</option>`).join('');
    }
  }

  addBtn.addEventListener('click',()=>{
    const projCode=document.getElementById('ruleProject').value;
    if(!projCode){alert('Select a project');return}
    const market=document.getElementById('ruleMarket').value;
    const bizLine=document.getElementById('ruleBizLine').value;
    const product=document.getElementById('ruleProduct').value.trim();
    const category=document.getElementById('ruleCategory').value.trim();
    if(!market&&!bizLine&&!product&&!category){alert('Set at least one mapping');return}
    const rules=getMappingRules();
    // Remove existing rule for same project
    const existing=rules.findIndex(r=>r.projectCode===projCode);
    if(existing>=0)rules.splice(existing,1);
    rules.push({projectCode:projCode,market,bizLine,product,category});
    saveState();
    renderMappingRules();
    // Clear inputs
    document.getElementById('ruleProduct').value='';
    document.getElementById('ruleCategory').value='';
  });

  // Also add product dimension button
  const addDimBtn=document.getElementById('btnAddDimProduct');
  if(addDimBtn){
    addDimBtn.addEventListener('click',()=>{
      const product=document.getElementById('dimProduct').value.trim();
      const category=document.getElementById('dimCategory').value.trim();
      if(!product){alert('Enter a product name');return}
      // Check if combo already exists in projects
      const exists=(state.projects||[]).some(p=>p.product===product&&p.category===category);
      if(exists){alert('This product/category already exists');return}
      // Create a placeholder project for this product
      // User can later create full projects with this product
      renderDimProductList();
      document.getElementById('dimProduct').value='';
      document.getElementById('dimCategory').value='';
    });
  }

  populateRuleDropdowns();
  renderMappingRules();
  renderDimProductList();

  // Re-render when projects tab is shown
  window._refreshDimMgmt=function(){
    populateRuleDropdowns();
    renderMappingRules();
    renderDimProductList();
  };
}

// Expose
window.applyMappingRule=applyMappingRule;
window.initMappingRules=initMappingRules;
window._refreshDimMgmt=function(){};

// Auto-init
try{initMappingRules()}catch(e){}
