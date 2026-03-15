// ── BONUS / BENEFITS (managed via data panel uploads) ──
// ── COMP BENCHMARKS ──
import { state, saveState } from '../lib/state.js';
import { fmt, esc, COUNTRIES, SENIORITY, FUNCTIONS, SENIORITY_BASE, FUNCTION_MULT, COUNTRY_MULT, benchmark } from '../lib/constants.js';

function renderBonusMatrix(){/* no-op: managed via upload */}
function renderBenefitsMatrix(){/* no-op: managed via upload */}

function renderBenchmarkTables(){
  // Seniority base rates table
  const senTbl=document.getElementById('bmSeniorityTable');
  let sh='<thead><tr><th>Seniority</th><th style="text-align:right">Base Rate (USD)</th></tr></thead><tbody>';
  SENIORITY.forEach(s=>{sh+=`<tr><td>${s}</td><td style="text-align:right"><input class="bm-sen-rate dim-edit-input" data-s="${s}" type="number" value="${SENIORITY_BASE[s]}" style="width:110px;text-align:right"></td></tr>`});
  sh+='</tbody>';
  senTbl.innerHTML=sh;
  senTbl.querySelectorAll('.bm-sen-rate').forEach(inp=>{
    inp.addEventListener('change',()=>{SENIORITY_BASE[inp.dataset.s]=parseFloat(inp.value)||0;renderBenchmarkTables()});
  });
  // Function multiplier table
  const fnTbl=document.getElementById('bmFunctionTable');
  let fh='<thead><tr><th>Function</th><th style="text-align:right">Multiplier</th><th style="text-align:right">Example (Senior, US)</th></tr></thead><tbody>';
  FUNCTIONS.forEach(f=>{fh+=`<tr><td>${esc(f)}</td><td style="text-align:right"><input class="bm-fn-mult dim-edit-input" data-f="${esc(f)}" type="number" step="0.01" value="${FUNCTION_MULT[f]}" style="width:80px;text-align:right"></td><td style="text-align:right;color:var(--text-dim)">${fmt(Math.round(SENIORITY_BASE['Senior']*FUNCTION_MULT[f]))}</td></tr>`});
  fh+='</tbody>';
  fnTbl.innerHTML=fh;
  fnTbl.querySelectorAll('.bm-fn-mult').forEach(inp=>{
    inp.addEventListener('change',()=>{FUNCTION_MULT[inp.dataset.f]=parseFloat(inp.value)||0;renderBenchmarkTables()});
  });
  // Country multiplier table
  const cTbl=document.getElementById('bmCountryTable');
  let ch='<thead><tr><th>Country</th><th style="text-align:right">Multiplier</th><th style="text-align:right">Sr. SWE Mkt Avg</th><th style="text-align:right">Sr. SWE Top Talent</th></tr></thead><tbody>';
  COUNTRIES.forEach(c=>{
    const mkt=benchmark('Senior','Software Engineering',c);
    ch+=`<tr><td>${c}</td><td style="text-align:right"><input class="bm-co-mult dim-edit-input" data-c="${c}" type="number" step="0.01" value="${COUNTRY_MULT[c]}" style="width:80px;text-align:right"></td><td style="text-align:right;color:var(--text-dim)">${fmt(mkt)}</td><td style="text-align:right;color:var(--text-dim)">${fmt(Math.round(mkt*1.25))}</td></tr>`;
  });
  ch+='</tbody>';
  cTbl.innerHTML=ch;
  cTbl.querySelectorAll('.bm-co-mult').forEach(inp=>{
    inp.addEventListener('change',()=>{COUNTRY_MULT[inp.dataset.c]=parseFloat(inp.value)||0;renderBenchmarkTables()});
  });
  // Custom rates table
  renderCustomRates();
}
function renderCustomRates(){
  const tbody=document.getElementById('customRatesTbody');
  if(!state.customRates.length){tbody.innerHTML='<tr><td colspan="6" style="color:var(--text-dim);text-align:center;padding:16px">No custom rates defined. Click "+ Add Custom Rate" to create one.</td></tr>';return}
  tbody.innerHTML=state.customRates.map((cr,i)=>{
    const mkt=benchmark(cr.seniority,cr.function,cr.country);
    const pctDiff=mkt?Math.round((cr.rate/mkt-1)*100):0;
    const diffColor=pctDiff>0?'var(--danger)':pctDiff<0?'var(--success)':'var(--text-dim)';
    return `<tr>
      <td><select class="cr-field dim-edit-select" data-i="${i}" data-f="country">${COUNTRIES.map(c=>`<option${c===cr.country?' selected':''}>${c}</option>`).join('')}</select></td>
      <td><select class="cr-field dim-edit-select" data-i="${i}" data-f="seniority">${SENIORITY.map(s=>`<option${s===cr.seniority?' selected':''}>${s}</option>`).join('')}</select></td>
      <td><select class="cr-field dim-edit-select" data-i="${i}" data-f="function">${FUNCTIONS.map(f=>`<option${f===cr.function?' selected':''}>${esc(f)}</option>`).join('')}</select></td>
      <td><input class="cr-field dim-edit-input" data-i="${i}" data-f="rate" type="number" value="${cr.rate}" style="width:110px;text-align:right"></td>
      <td style="color:${diffColor};font-size:.82rem">${pctDiff>0?'+':''}${pctDiff}% vs ${fmt(mkt)}</td>
      <td><button class="btn btn-sm btn-danger cr-del" data-i="${i}" style="padding:2px 8px">Del</button></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.cr-field').forEach(el=>{
    const ev=el.tagName==='SELECT'?'change':'input';
    el.addEventListener(ev,()=>{
      const i=+el.dataset.i,f=el.dataset.f;
      state.customRates[i][f]=f==='rate'?parseFloat(el.value)||0:el.value;
      saveState();renderCustomRates();
    });
  });
  tbody.querySelectorAll('.cr-del').forEach(btn=>{
    btn.addEventListener('click',()=>{state.customRates.splice(+btn.dataset.i,1);saveState();renderCustomRates()});
  });
}
document.getElementById('btnAddCustomRate').addEventListener('click',()=>{
  state.customRates.push({country:COUNTRIES[0],seniority:'Mid-Level',function:'Software Engineering',rate:100000});
  saveState();renderCustomRates();
});
document.getElementById('btnClearCustomRates').addEventListener('click',()=>{
  if(!state.customRates.length)return;
  if(confirm('Clear all custom rates?')){state.customRates=[];saveState();renderCustomRates()}
});

export { renderBonusMatrix, renderBenefitsMatrix, renderBenchmarkTables, renderCustomRates };

window.renderBonusMatrix = renderBonusMatrix;
window.renderBenefitsMatrix = renderBenefitsMatrix;
window.renderBenchmarkTables = renderBenchmarkTables;
window.renderCustomRates = renderCustomRates;
