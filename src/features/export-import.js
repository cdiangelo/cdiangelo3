// ── EXPORT / MASS UPLOAD / Templates ── ES Module
// Extracted from index.html lines 7540–7926

import { state, saveState, ensureStateFields, getBonusPct, getBonusAmt, getBenefitsAmt, getTotalComp } from '../lib/state.js';
import {
  COUNTRIES, SENIORITY, FUNCTIONS, FUNC_SHORT, MONTHS,
  DEFAULT_BONUS, DEFAULT_BENEFITS, BENEFITS_COUNTRY_MULT,
  SENIORITY_BASE, FUNCTION_MULT, COUNTRY_MULT, COUNTRY_BU,
  fmt, uid, benchmark
} from '../lib/constants.js';
import {
  getOpEx, getCapEx, getCapPct
} from '../lib/proration.js';

// ── EXPORT ──
function downloadCSV(content,filename){
  const blob=new Blob([content],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
}
document.getElementById('btnPrint').addEventListener('click',()=>{
  const w=window.open('','_blank');
  let h='<html><head><title>Comp Plan Print</title><style>body{font-family:sans-serif;padding:20px;font-size:12px;color:#2d2d2d}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0;color:#8b2020}h1,h2{color:#8b2020}@media print{body{font-size:10px}}</style></head><body>';
  h+='<h1>Compensation Plan</h1>';
  h+='<h2>Employee Roster</h2><table><tr><th>Name</th><th>Country</th><th>Seniority</th><th>Function</th><th>Market</th><th>Biz Line</th><th>Bus Unit</th><th>Project</th><th>Product</th><th>Category</th><th>Base</th><th>Bonus%</th><th>Bonus</th><th>Benefits</th><th>Total</th><th>Cap%</th><th>OpEx</th><th>CapEx</th><th>Hire</th><th>Term</th></tr>';
  state.employees.forEach(e=>{const proj=window.getEmpProject(e);const mkts=window.getEmpMarkets(e).map(m=>m.code).join(', ');h+=`<tr><td>${e.name}</td><td>${e.country}</td><td>${e.seniority}</td><td>${e.function}</td><td>${mkts}</td><td>${window.getBizLineName(e.businessLine)}</td><td>${e.businessUnit||''}</td><td>${proj?proj.code:''}</td><td>${proj?proj.product:''}</td><td>${proj?proj.category:''}</td><td>${fmt(e.salary)}</td><td>${getBonusPct(e)}%</td><td>${fmt(getBonusAmt(e))}</td><td>${fmt(getBenefitsAmt(e))}</td><td>${fmt(getTotalComp(e))}</td><td>${getCapPct(e)}%</td><td>${fmt(getOpEx(e))}</td><td>${fmt(getCapEx(e))}</td><td>${e.hireDate||''}</td><td>${e.termDate||''}</td></tr>`});
  h+='</table>';
  h+='<h2>Bonus Matrix</h2><table><tr><th></th>';FUNCTIONS.forEach((f,i)=>h+=`<th>${FUNC_SHORT[i]}</th>`);h+='</tr>';
  SENIORITY.forEach(s=>{h+=`<tr><th>${s}</th>`;FUNCTIONS.forEach(f=>h+=`<td>${state.bonusMatrix[s]?.[f]??''}%</td>`);h+='</tr>'});
  h+='</table>';
  h+='<h2>Benefits Matrix</h2><table><tr><th></th>';FUNCTIONS.forEach((f,i)=>h+=`<th>${FUNC_SHORT[i]}</th>`);h+='</tr>';
  SENIORITY.forEach(s=>{h+=`<tr><th>${s}</th>`;FUNCTIONS.forEach(f=>h+=`<td>${state.benefitsMatrix[s]?.[f]??''}%</td>`);h+='</tr>'});
  h+='</table>';
  h+='<h2>Projects</h2><table><tr><th>Code</th><th>Market</th><th>Product</th><th>Category</th><th>Description</th></tr>';
  state.projects.forEach(p=>h+=`<tr><td>${p.code}</td><td>${p.marketCode||''}</td><td>${p.product}</td><td>${p.category}</td><td>${p.description||''}</td></tr>`);
  h+='</table>';
  h+='<h2>Monthly Spread</h2><table><tr><th>Month</th><th>Total</th></tr>';
  const tot=state.employees.reduce((a,e)=>a+getTotalComp(e),0);
  MONTHS.forEach(m=>h+=`<tr><td>${m}</td><td>${fmt(Math.round(tot/12))}</td></tr>`);
  h+=`<tr><th>Annual</th><th>${fmt(tot)}</th></tr></table>`;
  h+='</body></html>';
  w.document.write(h);w.document.close();w.print();
});
document.getElementById('btnExportJSON').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='comp-plan-backup.json';a.click();
});
document.getElementById('btnImportJSON').addEventListener('click',()=>document.getElementById('jsonFileInput').click());
document.getElementById('jsonFileInput').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{try{Object.assign(state,JSON.parse(ev.target.result));ensureStateFields();saveState();window.renderAll();alert('Import successful!')}catch(err){alert('Invalid JSON file')}};
  reader.readAsText(file);
});
document.getElementById('btnExportHTML').addEventListener('click',()=>{
  // Build a self-contained HTML file with current data embedded
  const html=document.documentElement.outerHTML;
  // Inject state data as a pre-load script right after the opening <script> tag
  const stateJSON=JSON.stringify(state);
  const embedScript=`<script>localStorage.setItem('compPlanState_v2',${JSON.stringify(stateJSON)});localStorage.setItem('compPlanActiveWS',${JSON.stringify(window.currentWorkspaceName)});<\/script>`;
  // Insert the embed script right before the closing </head>
  const modified=html.replace('</head>',embedScript+'</head>');
  const blob=new Blob(['<!DOCTYPE html>\n<html lang="en">'+modified.slice(modified.indexOf('<head'))],{type:'text/html'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const name=(window.currentWorkspaceName||'compplan').replace(/[^a-zA-Z0-9_-]/g,'_');
  a.download=`${name}_${new Date().toISOString().slice(0,10)}.html`;
  a.click();
});

// ── MASS UPLOAD (EXCEL) ──
export function showUploadResult(text){
  const box=document.getElementById('uploadResultBox');
  box.style.display='block';
  document.getElementById('uploadResultText').textContent=text;
  box.scrollIntoView({behavior:'smooth'});
}
export function parseExcelDate(val){
  if(!val)return '';
  if(typeof val==='number'){
    // Excel serial date
    const d=new Date((val-25569)*86400000);
    return d.toISOString().slice(0,10);
  }
  const s=val.toString().trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const d=new Date(s);
  return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}
export function readExcelFile(inputEl,callback){
  const file=inputEl.files[0];if(!file)return;
  inputEl.value='';
  if(typeof XLSX==='undefined'){alert('Excel library failed to load. Please check your connection and refresh.');return}
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const wb=XLSX.read(ev.target.result,{type:'array'});
      // Helper: skip Reference Values sheets when finding data sheet
      wb._dataSheets=wb.SheetNames.filter(n=>!n.toLowerCase().includes('reference'));
      callback(wb);
    }catch(err){alert('Could not parse file: '+err.message)}
  };
  reader.readAsArrayBuffer(file);
}
export function xlsxDownload(wb,filename){
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
}

// ── Roster Template & Upload ──
document.getElementById('btnDlRosterTemplate').addEventListener('click',()=>{
  const headers=['Name','Country','Seniority','Function','Base Salary','Capitalization %','Business Line Code','Hire Date','Term Date','Notes','Project Code','Allocation %'];
  const rows=[headers];
  // Pre-fill with current employees for easy update
  state.employees.forEach(e=>{
    if(e.allocations&&e.allocations.length>0){
      e.allocations.forEach((a,i)=>{
        const p=window.getProjectById(a.projId);
        rows.push([i===0?e.name:'',i===0?e.country:'',i===0?e.seniority:'',i===0?e.function:'',i===0?e.salary:'',i===0?(e.capPct||0):'',i===0?(e.businessLine||''):'',i===0?(e.hireDate||''):'',i===0?(e.termDate||''):'',i===0?(e.notes||''):'',p?p.code:'',a.pct]);
      });
    } else {
      rows.push([e.name,e.country,e.seniority,e.function,e.salary,e.capPct||0,e.businessLine||'',e.hireDate||'',e.termDate||'',e.notes||'','','']);
    }
  });
  // Add blank rows for new entries
  for(let i=0;i<10;i++)rows.push(['','','','','','','','','','','','']);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  // Set column widths
  ws['!cols']=[{wch:22},{wch:16},{wch:12},{wch:28},{wch:14},{wch:14},{wch:18},{wch:12},{wch:12},{wch:20},{wch:14},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Roster');
  // Add reference sheet with valid values
  const refRows=[['Valid Countries','Valid Seniority Levels','Valid Functions','Valid Business Line Codes','Valid Project Codes']];
  const maxRef=Math.max(COUNTRIES.length,SENIORITY.length,FUNCTIONS.length,state.bizLines.length,state.projects.length);
  for(let i=0;i<maxRef;i++){
    refRows.push([COUNTRIES[i]||'',SENIORITY[i]||'',FUNCTIONS[i]||'',state.bizLines[i]?`${state.bizLines[i].code} \u2014 ${state.bizLines[i].name}`:'',state.projects[i]?state.projects[i].code:'']);
  }
  const refWs=XLSX.utils.aoa_to_sheet(refRows);
  refWs['!cols']=[{wch:18},{wch:20},{wch:32},{wch:36},{wch:16}];
  XLSX.utils.book_append_sheet(wb,refWs,'Reference Values');
  xlsxDownload(wb,'roster-template.xlsx');
});

document.getElementById('btnUploadRoster').addEventListener('click',()=>document.getElementById('rosterFileInput').click());
document.getElementById('rosterFileInput').addEventListener('change',function(){
  readExcelFile(this,wb=>{
    const ws=wb.Sheets[wb._dataSheets[0]||wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    let added=0,updated=0,skipped=0,errors=[];
    let currentEmp=null;
    let pendingAllocs=[];

    function flushEmp(){
      if(!currentEmp)return;
      currentEmp.allocations=pendingAllocs.filter(a=>a.projId).map(a=>({projId:a.projId,pct:a.pct,primary:false}));
      const flushTotal=currentEmp.allocations.reduce((s,a)=>s+a.pct,0);
      if(flushTotal>100){
        errors.push(`"${currentEmp.name}": allocation total is ${flushTotal}% (exceeds 100%) \u2014 skipped`);
        state.employees=state.employees.filter(e=>e.id!==currentEmp.id);
        skipped++;pendingAllocs=[];currentEmp=null;return;
      }
      if(currentEmp.allocations.length){currentEmp.allocations[0].primary=true}
      else {
        // Auto-assign default coding string (GEN-000) when no project provided
        const genProj=state.projects.find(p=>p.code==='GEN-000');
        if(genProj)currentEmp.allocations=[{projId:genProj.id,pct:100,primary:true}];
      }
      pendingAllocs=[];
      currentEmp=null;
    }

    rows.forEach((r,ri)=>{
      const name=(r['Name']||'').toString().trim();
      const projCode=(r['Project Code']||'').toString().trim();
      const allocPct=parseFloat(r['Allocation %'])||100;

      // Continuation row (blank name, has project) — belongs to previous employee
      if(!name&&projCode&&currentEmp){
        const proj=state.projects.find(p=>p.code===projCode);
        if(proj)pendingAllocs.push({projId:proj.id,pct:allocPct});
        return;
      }

      // Flush previous employee
      flushEmp();

      if(!name)return; // skip empty rows
      const country=(r['Country']||'').toString().trim();
      const seniority=(r['Seniority']||'').toString().trim();
      const func=(r['Function']||'').toString().trim();

      if(!country||!seniority||!func){
        errors.push(`Row ${ri+2}: "${name}" missing required fields (Country/Seniority/Function)`);
        skipped++;return;
      }
      if(!COUNTRIES.includes(country)){errors.push(`Row ${ri+2}: Unknown country "${country}"`);skipped++;return}
      if(!SENIORITY.includes(seniority)){errors.push(`Row ${ri+2}: Unknown seniority "${seniority}"`);skipped++;return}
      if(!FUNCTIONS.includes(func)){errors.push(`Row ${ri+2}: Unknown function "${func}"`);skipped++;return}

      const rawSalary=parseFloat(r['Base Salary'])||0;
      const salary=rawSalary>0?rawSalary:benchmark(seniority,func,country);
      const capPct=parseFloat(r['Capitalization %'])||0;
      const bizLine=(r['Business Line Code']||'').toString().trim().split(' ')[0]; // handle "100 — Platform Engineering"
      const hireDate=parseExcelDate(r['Hire Date']);
      const termDate=parseExcelDate(r['Term Date']);
      const notes=(r['Notes']||'').toString().trim();
      const businessUnit=COUNTRY_BU[country]||'';

      // Find existing employee by name
      let emp=state.employees.find(e=>e.name.toLowerCase()===name.toLowerCase());
      if(emp){
        Object.assign(emp,{name,country,seniority,function:func,salary:salary||emp.salary,capPct,businessLine:bizLine||emp.businessLine||state.bizLines[0]?.code||'',businessUnit,notes:notes||emp.notes,hireDate:hireDate||emp.hireDate,termDate:termDate||emp.termDate});
        currentEmp=emp;updated++;
      } else {
        emp={id:uid(),name,country,seniority,function:func,salary,capPct,businessLine:bizLine||state.bizLines[0]?.code||'',businessUnit,notes,hireDate,termDate,allocations:[]};
        state.employees.push(emp);
        currentEmp=emp;added++;
      }
      // Start collecting allocations
      pendingAllocs=[];
      if(projCode){
        const proj=state.projects.find(p=>p.code===projCode);
        if(proj)pendingAllocs.push({projId:proj.id,pct:allocPct});
        else errors.push(`Row ${ri+2}: Unknown project code "${projCode}" (skipped allocation)`);
      }
    });
    flushEmp(); // flush last employee

    window.logAudit('Import Roster',added+' added, '+updated+' updated, '+skipped+' skipped');
    saveState();window.renderAll();
    // Reset scenario snapshots so they pick up the new roster
    window.budgetScenario=null;window.forecastScenario=null;window.budgetScenarioDirty=false;window.fcScenarioDirty=false;
    showUploadResult(`Roster Upload Complete\n${'\u2500'.repeat(30)}\nAdded: ${added}\nUpdated: ${updated}\nSkipped: ${skipped}\n${errors.length?'\nWarnings:\n'+errors.join('\n'):'\nNo warnings.'}`);
  });
});

// ── Bonus Matrix Template & Upload ──
document.getElementById('btnDlBonusTemplate').addEventListener('click',()=>{
  const rows=[['Seniority / Function',...FUNCTIONS]];
  SENIORITY.forEach(s=>{
    rows.push([s,...FUNCTIONS.map(f=>state.bonusMatrix[s]?.[f]??DEFAULT_BONUS[s])]);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:16},...FUNCTIONS.map(()=>({wch:14}))];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Bonus Matrix');
  xlsxDownload(wb,'bonus-matrix-template.xlsx');
});

document.getElementById('btnUploadBonus').addEventListener('click',()=>document.getElementById('bonusFileInput').click());
document.getElementById('bonusFileInput').addEventListener('change',function(){
  readExcelFile(this,wb=>{
    const ws=wb.Sheets[wb._dataSheets[0]||wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    let updated=0,errors=[];
    rows.forEach((r,ri)=>{
      const seniority=Object.values(r)[0]?.toString().trim();
      if(!seniority||!SENIORITY.includes(seniority)){
        if(seniority)errors.push(`Row ${ri+2}: Unknown seniority "${seniority}"`);
        return;
      }
      if(!state.bonusMatrix[seniority])state.bonusMatrix[seniority]={};
      FUNCTIONS.forEach(f=>{
        const val=r[f];
        if(val!==undefined&&val!==''){
          state.bonusMatrix[seniority][f]=parseFloat(val)||0;
          updated++;
        }
      });
    });
    saveState();window.renderBonusMatrix();
    showUploadResult(`Bonus Matrix Upload Complete\n${'\u2500'.repeat(30)}\nCells updated: ${updated}\n${errors.length?'\nWarnings:\n'+errors.join('\n'):'\nNo warnings.'}`);
  });
});

// ── Benefits Matrix Template & Upload ──
document.getElementById('btnDlBenefitsTemplate').addEventListener('click',()=>{
  // Sheet 1: Benefits matrix (seniority x function)
  const rows=[['Seniority / Function',...FUNCTIONS]];
  SENIORITY.forEach(s=>{
    rows.push([s,...FUNCTIONS.map(f=>state.benefitsMatrix[s]?.[f]??DEFAULT_BENEFITS[s])]);
  });
  const ws1=XLSX.utils.aoa_to_sheet(rows);
  ws1['!cols']=[{wch:16},...FUNCTIONS.map(()=>({wch:14}))];
  // Sheet 2: Country multipliers
  const cRows=[['Country','Multiplier']];
  COUNTRIES.forEach(c=>cRows.push([c,state.benefitsCountryMult[c]??BENEFITS_COUNTRY_MULT[c]??1.0]));
  const ws2=XLSX.utils.aoa_to_sheet(cRows);
  ws2['!cols']=[{wch:18},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws1,'Benefits Matrix');
  XLSX.utils.book_append_sheet(wb,ws2,'Country Multipliers');
  xlsxDownload(wb,'benefits-template.xlsx');
});

document.getElementById('btnUploadBenefits').addEventListener('click',()=>document.getElementById('benefitsFileInput').click());
document.getElementById('benefitsFileInput').addEventListener('change',function(){
  readExcelFile(this,wb=>{
    let matrixUpdated=0,countryUpdated=0,errors=[];
    // Sheet 1: Benefits matrix
    const ws1=wb.Sheets[wb._dataSheets[0]||wb.SheetNames[0]];
    const matrixRows=XLSX.utils.sheet_to_json(ws1,{defval:''});
    matrixRows.forEach((r,ri)=>{
      const seniority=Object.values(r)[0]?.toString().trim();
      if(!seniority||!SENIORITY.includes(seniority)){
        if(seniority)errors.push(`Benefits row ${ri+2}: Unknown seniority "${seniority}"`);
        return;
      }
      if(!state.benefitsMatrix[seniority])state.benefitsMatrix[seniority]={};
      FUNCTIONS.forEach(f=>{
        const val=r[f];
        if(val!==undefined&&val!==''){
          state.benefitsMatrix[seniority][f]=parseFloat(val)||0;
          matrixUpdated++;
        }
      });
    });
    // Sheet 2: Country multipliers (if present)
    if(wb._dataSheets.length>1){
      const ws2=wb.Sheets[wb._dataSheets[1]];
      const cRows=XLSX.utils.sheet_to_json(ws2,{defval:''});
      cRows.forEach((r,ri)=>{
        const country=(r['Country']||Object.values(r)[0]||'').toString().trim();
        const mult=parseFloat(r['Multiplier']||Object.values(r)[1]);
        if(!country||!COUNTRIES.includes(country)){
          if(country)errors.push(`Country row ${ri+2}: Unknown country "${country}"`);
          return;
        }
        if(!isNaN(mult)){
          state.benefitsCountryMult[country]=mult;
          countryUpdated++;
        }
      });
    }
    saveState();window.renderBenefitsMatrix();
    showUploadResult(`Benefits Upload Complete\n${'\u2500'.repeat(30)}\nMatrix cells updated: ${matrixUpdated}\nCountry multipliers updated: ${countryUpdated}\n${errors.length?'\nWarnings:\n'+errors.join('\n'):'\nNo warnings.'}`);
  });
});

// ── Base Comp Rates Template & Upload ──
document.getElementById('btnDlBaseCompTemplate').addEventListener('click',()=>{
  // Sheet 1: Seniority base salaries
  const sRows=[['Seniority','Base Salary (USD)']];
  SENIORITY.forEach(s=>sRows.push([s,SENIORITY_BASE[s]]));
  const ws1=XLSX.utils.aoa_to_sheet(sRows);
  ws1['!cols']=[{wch:14},{wch:18}];
  // Sheet 2: Function multipliers
  const fRows=[['Function','Multiplier']];
  FUNCTIONS.forEach(f=>fRows.push([f,FUNCTION_MULT[f]]));
  const ws2=XLSX.utils.aoa_to_sheet(fRows);
  ws2['!cols']=[{wch:32},{wch:12}];
  // Sheet 3: Country multipliers
  const cRows=[['Country','Multiplier']];
  COUNTRIES.forEach(c=>cRows.push([c,COUNTRY_MULT[c]]));
  const ws3=XLSX.utils.aoa_to_sheet(cRows);
  ws3['!cols']=[{wch:18},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws1,'Seniority Base Salaries');
  XLSX.utils.book_append_sheet(wb,ws2,'Function Multipliers');
  XLSX.utils.book_append_sheet(wb,ws3,'Country Multipliers');
  xlsxDownload(wb,'base-comp-rates-template.xlsx');
});

document.getElementById('btnUploadBaseComp').addEventListener('click',()=>document.getElementById('baseCompFileInput').click());
document.getElementById('baseCompFileInput').addEventListener('change',function(){
  readExcelFile(this,wb=>{
    let senUpdated=0,funcUpdated=0,countryUpdated=0,errors=[];
    // Sheet 1: Seniority base salaries
    if(wb.SheetNames.length>=1){
      const ws=wb.Sheets[wb._dataSheets[0]||wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      rows.forEach((r,ri)=>{
        const sen=(r['Seniority']||Object.values(r)[0]||'').toString().trim();
        const val=parseFloat(r['Base Salary (USD)']||Object.values(r)[1]);
        if(!sen||!SENIORITY.includes(sen)){if(sen)errors.push(`Seniority row ${ri+2}: Unknown "${sen}"`);return}
        if(!isNaN(val)&&val>0){SENIORITY_BASE[sen]=Math.round(val);senUpdated++}
      });
    }
    // Sheet 2: Function multipliers
    if(wb._dataSheets.length>=2){
      const ws=wb.Sheets[wb._dataSheets[1]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      rows.forEach((r,ri)=>{
        const func=(r['Function']||Object.values(r)[0]||'').toString().trim();
        const val=parseFloat(r['Multiplier']||Object.values(r)[1]);
        if(!func||!FUNCTIONS.includes(func)){if(func)errors.push(`Function row ${ri+2}: Unknown "${func}"`);return}
        if(!isNaN(val)){FUNCTION_MULT[func]=val;funcUpdated++}
      });
    }
    // Sheet 3: Country multipliers
    if(wb._dataSheets.length>=3){
      const ws=wb.Sheets[wb._dataSheets[2]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      rows.forEach((r,ri)=>{
        const country=(r['Country']||Object.values(r)[0]||'').toString().trim();
        const val=parseFloat(r['Multiplier']||Object.values(r)[1]);
        if(!country||!COUNTRIES.includes(country)){if(country)errors.push(`Country row ${ri+2}: Unknown "${country}"`);return}
        if(!isNaN(val)){COUNTRY_MULT[country]=val;countryUpdated++}
      });
    }
    // Re-render to reflect updated benchmarks
    window.renderAll();
    showUploadResult(`Base Comp Rates Upload Complete\n${'\u2500'.repeat(30)}\nSeniority base salaries updated: ${senUpdated}\nFunction multipliers updated: ${funcUpdated}\nCountry multipliers updated: ${countryUpdated}\n\nNote: These rates are used for benchmark calculations.\nBenchmark = Seniority Base \u00d7 Function Mult \u00d7 Country Mult\n${errors.length?'\nWarnings:\n'+errors.join('\n'):'\nNo warnings.'}`);
  });
});

// Expose to window for inline onclick usage
window.downloadCSV = downloadCSV;
window.showUploadResult = showUploadResult;
window.parseExcelDate = parseExcelDate;
window.readExcelFile = readExcelFile;
window.xlsxDownload = xlsxDownload;
