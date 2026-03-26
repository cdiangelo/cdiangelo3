// ── data-panel.js — ES module extracted from index.html lines 11346–11698 ──
import { state, saveState, ensureStateFields, replaceState } from '../lib/state.js';
import { esc } from '../lib/constants.js';

/* ── globals accessed via window (not yet modularised) ── */
const renderAll              = (...a) => window.renderAll(...a);
const renderWorkspaceList    = (...a) => window.renderWorkspaceList(...a);
const renderForecastProjection = (...a) => window.renderForecastProjection(...a);
const saveWorkspaceAs        = (...a) => window.saveWorkspaceAs(...a);
const getWorkspaceIndex      = (...a) => window.getWorkspaceIndex(...a);
const loadWorkspace          = (...a) => window.loadWorkspace(...a);
const deleteWorkspace        = (...a) => window.deleteWorkspace(...a);
const readExcelFile          = (...a) => window.readExcelFile(...a);
const showToast              = (...a) => window.showToast(...a);
const toggleWsMergeMode      = (...a) => window.toggleWsMergeMode(...a);
const toggleWsMergeSelect    = (...a) => window.toggleWsMergeSelect(...a);
const executeVersionMerge    = (...a) => window.executeVersionMerge(...a);
const executeWsMerge         = (...a) => window.executeWsMerge(...a);
const loadVersionFromServer  = (...a) => window.loadVersionFromServer(...a);
const deleteVersionFromServer= (...a) => window.deleteVersionFromServer(...a);

/* ── CDN globals (loaded externally, accessed via window) ── */
const XLSX = window.XLSX;

// ── DATA MANAGEMENT PANEL ──
function closeAllSidePanels(){
  const panels=[
    {panel:'guideSlidePanel',btn:'guideToggleBtn',cls:'guide-open'},
    {panel:'dataSlidePanel',btn:'dataToggleBtn',cls:'data-open'},
    {panel:'scenarioSlidePanel',btn:'scenarioToggleBtn',cls:'scenario-open'}
  ];
  panels.forEach(p=>{
    const el=document.getElementById(p.panel);
    const bt=document.getElementById(p.btn);
    if(el&&el.classList.contains('open')){el.classList.remove('open');document.body.classList.remove(p.cls);if(bt)bt.querySelector('.arrow').innerHTML='&#9654;'}
  });
}

function initGuidePanel(){
  const guidePanel=document.getElementById('guideSlidePanel');
  const guideBtn=document.getElementById('guideToggleBtn');
  if(!guidePanel||!guideBtn)return;
  const guideArrow=guideBtn.querySelector('.arrow');
  guideBtn.addEventListener('click',()=>{
    const wasOpen=guidePanel.classList.contains('open');
    closeAllSidePanels();
    if(!wasOpen){
      guidePanel.classList.add('open');
      document.body.classList.add('guide-open');
      guideArrow.innerHTML='&#9664;';
    }
  });
  // Section toggles
  document.getElementById('guideBusinessToggle').addEventListener('click',function(){
    const body=document.getElementById('guideBusinessBody');
    const show=body.style.display==='none';
    body.style.display=show?'':'none';
    this.innerHTML=(show?'&#9660;':'&#9654;')+' Business / Ops';
  });
  document.getElementById('guideFinanceToggle').addEventListener('click',function(){
    const body=document.getElementById('guideFinanceBody');
    const show=body.style.display==='none';
    body.style.display=show?'':'none';
    this.innerHTML=(show?'&#9660;':'&#9654;')+' Finance';
  });
  // Sub-section toggles (Budget / Long Term Plan)
  document.querySelectorAll('.guide-sub-toggle').forEach(h5=>{
    h5.addEventListener('click',()=>{
      const body=h5.nextElementSibling;
      if(!body)return;
      const show=body.style.display==='none';
      body.style.display=show?'':'none';
      const label=h5.textContent.replace(/^[^\s]+\s/,'');
      h5.innerHTML=(show?'&#9660;':'&#9654;')+' '+label;
    });
  });

  // Tracking toggle — show/hide checkboxes and persist state
  const trackToggle=document.getElementById('guideTrackToggle');
  function getGuideChecked(){return state.guideChecked||{}}
  function setGuideChecked(obj){state.guideChecked=obj;saveState()}
  function syncGuideChecks(){
    const tracking=trackToggle.checked;
    const checked=getGuideChecked();
    document.querySelectorAll('.guide-check').forEach(cb=>{
      cb.style.display=tracking?'':'none';
      const task=cb.closest('.guide-task').dataset.task;
      if(task)cb.checked=!!checked[task];
    });
  }
  trackToggle.addEventListener('change',syncGuideChecks);
  // Checkbox change → save to state
  document.querySelectorAll('.guide-check').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const task=cb.closest('.guide-task').dataset.task;
      if(!task)return;
      const checked=getGuideChecked();
      if(cb.checked)checked[task]=true;else delete checked[task];
      setGuideChecked(checked);
    });
  });

  // Navigation links
  const navMap={
    'employees':()=>{if(window.showApp)window.showApp();document.querySelector('[data-tab="employees"]')?.click()},
    'vendor':()=>{if(window.showVendor)window.showVendor();document.querySelector('[data-vtab="vendor-grid"]')?.click()},
    'te':()=>{if(window.showVendor)window.showVendor();setTimeout(()=>document.querySelector('[data-vtab="vendor-te"]')?.click(),50)},
    'contractor':()=>{if(window.showVendor)window.showVendor();setTimeout(()=>document.querySelector('[data-vtab="vendor-contractors"]')?.click(),50)},
    'exec':()=>{if(window.showApp)window.showApp();document.querySelector('[data-tab="exec"]')?.click()},
    'ltf':()=>{if(window.showLtf)window.showLtf()},
    'depreciation':()=>{if(window.showDepreciation)window.showDepreciation()},
    'overview':()=>{if(window.showLanding)window.showLanding()},
    'scenario':()=>{document.getElementById('scenarioToggleBtn')?.click()},
    'data-import':()=>{document.getElementById('dataToggleBtn')?.click()},
    'data-comp':()=>{document.getElementById('dataToggleBtn')?.click()}
  };
  document.querySelectorAll('.task-link[data-guide-nav]').forEach(link=>{
    link.addEventListener('click',()=>{
      const nav=link.dataset.guideNav;
      if(navMap[nav]){
        // Close guide panel first
        document.getElementById('guideToggleBtn').click();
        setTimeout(()=>navMap[nav](),100);
      }
    });
  });

  syncGuideChecks();
}
window.initGuidePanel=initGuidePanel;

function initDataPanel(){
  initGuidePanel();
  const dataPanel=document.getElementById('dataSlidePanel');
  const dataBtn=document.getElementById('dataToggleBtn');
  const dataArrow=dataBtn.querySelector('.arrow');
  dataBtn.addEventListener('click',()=>{
    const wasOpen=dataPanel.classList.contains('open');
    closeAllSidePanels();
    if(!wasOpen){
      dataPanel.classList.add('open');
      document.body.classList.add('data-open');
      dataArrow.innerHTML='&#9664;';
      renderDataPanelWsList();
    }
  });

  // Current Year selector — only changes header labels, no chart/table re-render
  document.getElementById('currentYearSelect').addEventListener('change',function(){
    DISPLAY_BASE_YEAR=parseInt(this.value);
    const dYears=getDisplayYears();
    document.getElementById('currentYearFcLabel').textContent='Forecast: '+dYears[0]+'–'+dYears[4];
    // Update trend year toggle button labels
    buildExecTrendYearToggle();
    // Update trend view header label
    const trendYrEl=document.getElementById('execTrendYearLabel');
    if(trendYrEl)trendYrEl.textContent=' — '+(execTrendYear==='current'?String(DISPLAY_BASE_YEAR):displayYear(execTrendYear));
    // Update forecast header label
    const fcLabel=document.getElementById('execFcViewLabel');
    if(fcLabel){const suffix=execFcView==='opex'?' — C&B OpEx':' — Total Investment';fcLabel.textContent=suffix}
    // Re-render charts that show year labels on axes (data unchanged, only labels update)
    try{renderForecastProjection()}catch(e){}
    try{renderLandingCharts()}catch(e){}
  });

  // Workspace: Save As
  document.getElementById('dataPanelWsSave').addEventListener('click',()=>{
    const name=document.getElementById('dataPanelWsSaveName').value.trim();
    if(!name){alert('Please enter a workspace name');return}
    saveWorkspaceAs(name);
    window.logAudit('Save Workspace',name);
    document.getElementById('dataPanelWsSaveName').value='';
    renderDataPanelWsList();renderWorkspaceList();
  });
  // Workspace: Quick Save — force save to current workspace
  document.getElementById('dataPanelQuickSave').addEventListener('click',()=>{
    if(window.saveState){window.saveState();window.logAudit('Quick Save','Force saved current state')}
    // Also trigger server save if in session mode
    if(window.debouncedServerSave)window.debouncedServerSave();
    const btn=document.getElementById('dataPanelQuickSave');
    btn.textContent='Saved!';setTimeout(()=>{btn.textContent='Quick Save'},1500);
  });

  // Download All Input Templates — single workbook with sheets for each import type + reference values
  document.getElementById('dataPanelDlAllTemplates').addEventListener('click',()=>{
    if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
    const wb=XLSX.utils.book_new();
    // Employee Roster template
    const rosterHeaders=['Name','Country','Seniority','Function','Salary','CapEx %','Hire Date','Term Date','Business Line','Business Unit','Market Code','Type (existing/hire)'];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([rosterHeaders,['Jane Doe','United States','Senior','Software Engineering',150000,20,'2024-01-15','','100000','Corp HQ','US0001','existing']]),'Employee Roster');
    // Vendor Spend template
    const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const vendorHeaders=['Parent Co','Vendor Name','Vendor Type','Notes','Business Unit','Biz Line','Market','Project Code','Account Description',...MO];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([vendorHeaders,['Acme Corp','Acme SaaS','Software & Licenses','Annual license','Corp HQ','100000','US0001','PRJ-001','Software License',5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,5000]]),'Vendor Spend');
    // T&E template
    const teHeaders=['Expense Type','Description','Notes','Business Unit','Biz Line','Market','Project Code','Account Description',...MO];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([teHeaders,['T&E','Team Travel','Q1 offsite','Corp HQ','100000','US0001','PRJ-001','Travel',2000,2000,2000,0,0,0,0,0,0,0,0,0]]),'T&E');
    // Contractor template
    const crHeaders=['Contractor Name','Vendor Name','Hourly Rate','Monthly Hours','CapEx %','Notes','Business Unit','Biz Line','Market','Project Code','Account Description',...MO];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([crHeaders,['John Smith','Consulting Co',150,160,25,'Backend dev','Corp HQ','100000','US0001','PRJ-001','Professional Services',24000,24000,24000,24000,24000,24000,24000,24000,24000,24000,24000,24000]]),'Contractors');
    // Bonus Matrix template
    const bonusHeaders=['Seniority \\ Function',...(window.FUNCTIONS||['Software Engineering','Data Engineering','Product Management','DevOps/SRE','Data Science','Design/UX','QA/Testing','IT/Support','Project Management','Other'])];
    const senLevels=window.SENIORITY||['Junior','Mid-Level','Senior','Staff','Director','VP'];
    const bonusData=[bonusHeaders,...senLevels.map(s=>[s,...bonusHeaders.slice(1).map(()=>10)])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(bonusData),'Bonus Matrix');
    // Benefits Matrix template
    const benData=[bonusHeaders,...senLevels.map(s=>[s,...bonusHeaders.slice(1).map(()=>20)])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(benData),'Benefits Matrix');
    // Reference Values
    const refData=[
      ['Reference Values',''],
      ['',''],
      ['Countries',...(window.COUNTRIES||['United States','India','United Kingdom','Canada','Germany'])],
      ['Seniority Levels',...senLevels],
      ['Functions',...(bonusHeaders.slice(1))],
      ['Vendor Types','Software & Licenses','Professional Services','Data & Analytics','Infrastructure','Other OpEx','Contractor'],
      ['Expense Types','T&E','Meals','Travel','Events','Training','Subscriptions','Other']
    ];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(refData),'Reference Values');
    XLSX.writeFile(wb,'budget_input_templates.xlsx');
  });
  // Employee Roster: Upload
  document.getElementById('dataPanelUploadRoster').addEventListener('click',()=>{
    document.getElementById('dataPanelRosterFile').click();
  });
  document.getElementById('dataPanelRosterFile').addEventListener('change',function(){
    // Delegate to the main roster file input handler
    const mainInput=document.getElementById('rosterFileInput');
    const dt=new DataTransfer();
    if(this.files[0])dt.items.add(this.files[0]);
    mainInput.files=dt.files;
    mainInput.dispatchEvent(new Event('change'));
    this.value='';
  });

  // Vendor Spend: Export (delegate to existing button)
  document.getElementById('dataPanelVendorExport').addEventListener('click',()=>{
    document.getElementById('vendorExportBtn').click();
  });
  // Vendor Spend: Import
  document.getElementById('dataPanelVendorImport').addEventListener('click',()=>{
    document.getElementById('dataPanelVendorFile').click();
  });
  document.getElementById('dataPanelVendorFile').addEventListener('change',function(){
    const mainInput=document.getElementById('vendorFileInput');
    const dt=new DataTransfer();
    if(this.files[0])dt.items.add(this.files[0]);
    mainInput.files=dt.files;
    mainInput.dispatchEvent(new Event('change'));
    this.value='';
  });

  // T&E: Export (delegate to existing button)
  document.getElementById('dataPanelTeExport').addEventListener('click',()=>{
    document.getElementById('teExportBtn').click();
  });
  // T&E: Import — use same vendor file handler pattern for T&E
  document.getElementById('dataPanelTeImport').addEventListener('click',()=>{
    document.getElementById('dataPanelTeFile').click();
  });
  document.getElementById('dataPanelTeFile').addEventListener('change',function(){
    // T&E import: reuse the readExcelFile pattern
    readExcelFile(this,wb=>{
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){alert('No data rows found.');return}
      const MO_NAMES=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const FIELD_MAP={};
      [['Expense Type','expenseType'],['Type','expenseType'],['Description','description'],['Business Unit','businessUnit'],['BU','businessUnit'],['Biz Line','bizLine'],['Business Line','bizLine'],['Market','market'],['Project','project'],['Account Description','acctDesc'],['Account','acctDesc'],['Notes','notes']].forEach(([k,v])=>{FIELD_MAP[k]=v;FIELD_MAP[k.toLowerCase()]=v});
      MO_LABELS.forEach((m,i)=>{FIELD_MAP[m]=MO_NAMES[i];FIELD_MAP[m.toLowerCase()]=MO_NAMES[i]});
      let imported=0;
      const startIdx=state.teRows.length;
      rows.forEach(r=>{
        const row={expenseType:'',description:'',businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
        Object.keys(r).forEach(k=>{const mapped=FIELD_MAP[k]||FIELD_MAP[k.trim().toLowerCase()];if(mapped)row[mapped]=MO_NAMES.includes(mapped)?parseFloat(r[k])||0:String(r[k])});
        state.teRows.push(row);imported++;
      });
      // Ask about scale of imported values
      const scale=prompt(`Imported ${imported} T&E rows.\n\nWere values loaded as:\n  1 = Singles (actual dollars)\n  2 = Thousands ($K)\n  3 = Millions ($M)\n\nEnter 1, 2, or 3:`,'1');
      const mult=scale==='2'?1000:scale==='3'?1000000:1;
      if(mult>1){
        const MO_K=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        for(let idx=startIdx;idx<state.teRows.length;idx++){
          MO_K.forEach(m=>{state.teRows[idx][m]=Math.round((state.teRows[idx][m]||0)*mult)});
        }
      }
      window.logAudit('Import T&E',imported+' rows');
      saveState();
    });
  });

  // Contractors: Export (delegate to existing button)
  document.getElementById('dataPanelContractorExport').addEventListener('click',()=>{
    document.getElementById('contractorExportBtn').click();
  });
  // Contractors: Import
  document.getElementById('dataPanelContractorImport').addEventListener('click',()=>{
    document.getElementById('dataPanelContractorFile').click();
  });
  document.getElementById('dataPanelContractorFile').addEventListener('change',function(){
    const mainInput=document.getElementById('contractorFileInput');
    const dt=new DataTransfer();
    if(this.files[0])dt.items.add(this.files[0]);
    mainInput.files=dt.files;
    mainInput.dispatchEvent(new Event('change'));
    this.value='';
  });

  // Backup: Export JSON
  document.getElementById('dataPanelExportJSON').addEventListener('click',()=>{
    document.getElementById('btnExportJSON').click();
  });
  // Backup: Import JSON
  document.getElementById('dataPanelImportJSON').addEventListener('click',()=>{
    document.getElementById('dataPanelJsonFile').click();
  });
  document.getElementById('dataPanelJsonFile').addEventListener('change',function(){
    const file=this.files[0];if(!file)return;
    this.value='';
    const reader=new FileReader();
    reader.onload=ev=>{try{replaceState(JSON.parse(ev.target.result));ensureStateFields();window.logAudit('Import JSON','Full state replaced from JSON');saveState();renderAll();alert('Import successful!')}catch(err){alert('Invalid JSON file')}};
    reader.readAsText(file);
  });
  // Backup: Share HTML
  document.getElementById('dataPanelExportHTML').addEventListener('click',()=>{
    document.getElementById('btnExportHTML').click();
  });
  // Print View
  document.getElementById('dataPanelPrint').addEventListener('click',()=>{
    document.getElementById('btnPrint').click();
  });

  // Full Data Export (Excel with all sheets)
  document.getElementById('dataPanelFullExport').addEventListener('click',()=>{
    if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
    const wb=XLSX.utils.book_new();
    const MO_NAMES=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Sheet 1: Employees
    const empRows=state.employees.map(e=>{
      const row={Name:e.name,Country:e.country,Seniority:e.seniority,Function:e.function,
        Salary:e.salary,'Bonus %':getBonusPct(e),'Bonus $':getBonusAmt(e),
        'Benefits %':getBenefitsPct(e),'Benefits $':getBenefitsAmt(e),
        'Total Comp':getTotalComp(e),'Cap %':e.capPct||0,
        'CapEx':Math.round(getTotalComp(e)*(e.capPct||0)/100),
        'OpEx':Math.round(getTotalComp(e)*(1-(e.capPct||0)/100)),
        'Hire Date':e.hireDate||'','Term Date':e.termDate||'',
        Market:e.marketCode||'','Business Line':e.businessLine||'',
        'Business Unit':e.businessUnit||'',Notes:e.notes||''};
      // Add allocation info
      if(e.allocations&&e.allocations.length){
        e.allocations.forEach((a,i)=>{
          const proj=state.projects.find(p=>p.id===a.projId);
          row[`Alloc ${i+1} Project`]=proj?proj.code:'';
          row[`Alloc ${i+1} %`]=a.pct;
        });
      }
      return row;
    });
    if(empRows.length){
      const ws1=XLSX.utils.json_to_sheet(empRows);
      XLSX.utils.book_append_sheet(wb,ws1,'Employees');
    }

    // Sheet 2: Projects
    const projRows=state.projects.map(p=>({Code:p.code,Name:p.name,Category:p.category||'',
      Product:p.product||'',Description:p.description||'',Market:p.marketCode||'','Cap %':p.capPct||0}));
    if(projRows.length){
      const ws2=XLSX.utils.json_to_sheet(projRows);
      XLSX.utils.book_append_sheet(wb,ws2,'Projects');
    }

    // Sheet 3: Vendor Spend
    if(state.vendorRows&&state.vendorRows.length){
      const vendorData=state.vendorRows.map(r=>{
        const row={'Parent Co':r.parentCo||'','Vendor Name':r.vendorName||'','Vendor Type':r.vendorType||'',
          'Business Unit':r.businessUnit||'','Biz Line':r.bizLine||'',Market:r.market||'',
          Project:r.project||'','Account Desc':r.acctDesc||'',Notes:r.notes||''};
        MO_NAMES.forEach((m,i)=>{row[MO_LABELS[i]]=r[m]||0});
        row['Full Year']=MO_NAMES.reduce((s,m)=>s+(r[m]||0),0);
        return row;
      });
      const ws3=XLSX.utils.json_to_sheet(vendorData);
      XLSX.utils.book_append_sheet(wb,ws3,'Vendor Spend');
    }

    // Sheet 4: T&E
    if(state.teRows&&state.teRows.length){
      const teData=state.teRows.map(r=>{
        const row={'Expense Type':r.expenseType||'',Description:r.description||'',
          'Business Unit':r.businessUnit||'','Biz Line':r.bizLine||'',Market:r.market||'',
          Project:r.project||'','Account Desc':r.acctDesc||'',Notes:r.notes||''};
        MO_NAMES.forEach((m,i)=>{row[MO_LABELS[i]]=r[m]||0});
        row['Full Year']=MO_NAMES.reduce((s,m)=>s+(r[m]||0),0);
        return row;
      });
      const ws4=XLSX.utils.json_to_sheet(teData);
      XLSX.utils.book_append_sheet(wb,ws4,'T&E');
    }

    // Sheet 4b: Contractors
    if(state.contractorRows&&state.contractorRows.length){
      const cData=state.contractorRows.map(r=>{
        const row={Name:r.name||'','Hourly Rate':r.hourlyRate||0,'Monthly Hours':r.monthlyHours||0,
          'CapEx %':r.capPct||0,'Business Unit':r.businessUnit||'','Biz Line':r.bizLine||'',
          Market:r.market||'',Project:r.project||'','Account Desc':r.acctDesc||'',Notes:r.notes||''};
        MO_NAMES.forEach((m,i)=>{row[MO_LABELS[i]]=r[m]||0});
        row['Full Year']=MO_NAMES.reduce((s,m)=>s+(r[m]||0),0);
        return row;
      });
      const wsC=XLSX.utils.json_to_sheet(cData);
      XLSX.utils.book_append_sheet(wb,wsC,'Contractors');
    }

    // Sheet 5: Bonus Matrix
    const bonusRows=[];
    Object.keys(state.bonusMatrix||{}).forEach(sen=>{
      const row={Seniority:sen};
      Object.keys(state.bonusMatrix[sen]||{}).forEach(fn=>{row[fn]=state.bonusMatrix[sen][fn]});
      bonusRows.push(row);
    });
    if(bonusRows.length){
      const ws5=XLSX.utils.json_to_sheet(bonusRows);
      XLSX.utils.book_append_sheet(wb,ws5,'Bonus Matrix');
    }

    // Sheet 6: Benefits Matrix
    const benRows=[];
    Object.keys(state.benefitsMatrix||{}).forEach(sen=>{
      const row={Seniority:sen};
      Object.keys(state.benefitsMatrix[sen]||{}).forEach(fn=>{row[fn]=state.benefitsMatrix[sen][fn]});
      benRows.push(row);
    });
    if(benRows.length){
      const ws6=XLSX.utils.json_to_sheet(benRows);
      XLSX.utils.book_append_sheet(wb,ws6,'Benefits Matrix');
    }

    // Sheet 7: Accounts
    if(state.accounts&&state.accounts.length){
      const acctRows=state.accounts.map(a=>({Code:a.code,Description:a.description,Category:a.category||'',Group:a.group||''}));
      const ws7=XLSX.utils.json_to_sheet(acctRows);
      XLSX.utils.book_append_sheet(wb,ws7,'Accounts');
    }

    const fileName=`CompPlan_FullExport_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb,fileName);
    showToast('Exported: '+fileName);
  });
}

function renderDataPanelWsList(){
  const container=document.getElementById('dataPanelWsList');
  if(!container)return;
  if(window.persistenceMode==='session'&&window.sessionContext){
    // Session mode: show versions
    container.innerHTML='<div style="color:var(--text-dim);font-size:.78rem;padding:4px">Loading versions...</div>';
    fetch(`/api/sessions/${window.sessionContext.code}/versions`).then(r=>r.json()).then(versions=>{
      if(!versions.length){container.innerHTML='<div style="color:var(--text-dim);font-size:.78rem;padding:4px">No versions</div>';return}
      let html='';
      if(versions.length>=2){
        html+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.78rem">`;
        html+=`<button class="btn btn-sm${wsMergeMode?' btn-danger':''}" style="padding:1px 6px;font-size:.68rem" onclick="toggleWsMergeMode();renderDataPanelWsList()">${wsMergeMode?'Cancel':'Merge'}</button>`;
        if(window.wsMergeMode&&window.wsMergeSelected.size>=2){
          html+=`<button class="btn btn-sm btn-primary" style="padding:1px 6px;font-size:.68rem" onclick="executeVersionMerge();renderDataPanelWsList()">Merge (${wsMergeSelected.size})</button>`;
        }
        html+=`</div>`;
      }
      versions.forEach(v=>{
        const isActive=v.id===window.sessionContext.versionId;
        const esc=v.name.replace(/'/g,"\\'");
        const vKey='v_'+v.id;
        const isChecked=window.wsMergeSelected.has(vKey);
        html+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.78rem">`;
        if(window.wsMergeMode){
          html+=`<input type="checkbox" ${isChecked?'checked':''} onchange="toggleWsMergeSelect('${vKey}');renderDataPanelWsList()" style="width:14px;height:14px;accent-color:var(--accent);cursor:pointer">`;
        }
        const vRaw=v.savedAt||v.updatedAt||v.createdAt||v.created_at||v.updated_at;
        const vTime=vRaw?new Date(vRaw).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
        html+=`<span style="flex:1;color:var(--text)">${v.name}${vTime?' <span style="color:var(--text-dim);font-size:.65rem;margin-left:4px">'+vTime+'</span>':''}${isActive?' <span style="color:var(--success);font-size:.65rem;font-weight:700">ACTIVE</span>':''}</span>`;
        if(!window.wsMergeMode){
          html+=`${!isActive?`<button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem" onclick="loadVersionFromServer(${v.id},'${esc}');renderDataPanelWsList()">Load</button>`:''}`;
          html+=`<button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem;color:var(--danger)" onclick="deleteVersionFromServer(${v.id},'${esc}');renderDataPanelWsList()">×</button>`;
        }
        html+=`</div>`;
      });
      container.innerHTML=html;
    }).catch(()=>{container.innerHTML='<div style="color:var(--danger);font-size:.78rem;padding:4px">Error</div>'});
    return;
  }
  let idx=getWorkspaceIndex();
  // Ensure active workspace always appears with a timestamp
  if(!idx.find(w=>w.name===window.currentWorkspaceName)){
    idx=[{key:'ws_'+window.currentWorkspaceName.replace(/[^a-zA-Z0-9_-]/g,'_'),name:window.currentWorkspaceName,savedAt:new Date().toISOString(),employees:(state.employees||[]).length,projects:(state.projects||[]).length},...idx];
  }
  if(!idx.length){container.innerHTML='<div style="color:var(--text-dim);font-size:.78rem;padding:4px">No saved workspaces</div>';return}
  let html='';
  if(idx.length>=2){
    html+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.78rem">`;
    html+=`<button class="btn btn-sm${wsMergeMode?' btn-danger':''}" style="padding:1px 6px;font-size:.68rem" onclick="toggleWsMergeMode();renderDataPanelWsList()">${wsMergeMode?'Cancel':'Merge'}</button>`;
    if(window.wsMergeMode&&window.wsMergeSelected.size>=2){
      html+=`<button class="btn btn-sm btn-primary" style="padding:1px 6px;font-size:.68rem" onclick="executeWsMerge();renderDataPanelWsList()">Merge (${wsMergeSelected.size})</button>`;
    }
    html+=`</div>`;
  }
  idx.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt)).forEach(w=>{
    const isActive=w.name===window.currentWorkspaceName;
    const esc=w.name.replace(/'/g,"\\'");
    const isChecked=window.wsMergeSelected.has(w.key);
    html+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:.78rem">`;
    if(window.wsMergeMode){
      html+=`<input type="checkbox" ${isChecked?'checked':''} onchange="toggleWsMergeSelect('${w.key}');renderDataPanelWsList()" style="width:14px;height:14px;accent-color:var(--accent);cursor:pointer">`;
    }
    const wTime=w.savedAt?new Date(w.savedAt).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'unsaved';
    html+=`<span style="flex:1;color:var(--text)">${w.name} <span style="color:var(--text-dim);font-size:.65rem;margin-left:4px">${wTime}</span>${isActive?' <span style="color:var(--success);font-size:.65rem;font-weight:700">ACTIVE</span>':''}</span>`;
    if(!window.wsMergeMode){
      html+=`${!isActive?`<button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem" onclick="loadWorkspace('${w.key}','${esc}');renderDataPanelWsList()">Load</button>`:''}`;
      html+=`<button class="btn btn-sm" style="padding:1px 6px;font-size:.68rem;color:var(--danger)" onclick="deleteWorkspace('${w.key}','${esc}');renderDataPanelWsList()">×</button>`;
    }
    html+=`</div>`;
  });
  container.innerHTML=html;
}


// ── AUDIT LOG ──
function renderAuditLog(){
  const container=document.getElementById('auditLogList');
  if(!container)return;
  const log=(state.auditLog||[]).slice().reverse();
  if(!log.length){container.innerHTML='<div style="color:var(--text-dim);padding:6px">No entries yet.</div>';return}
  let html='';
  log.forEach(entry=>{
    const ts=new Date(entry.ts);
    const time=ts.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const user=entry.user||'Unknown';
    html+=`<div style="padding:3px 0;border-bottom:1px solid var(--border-light);display:flex;gap:6px;align-items:baseline">`;
    html+=`<span style="color:var(--text-dim);font-size:.65rem;white-space:nowrap;min-width:90px">${time}</span>`;
    html+=`<span style="font-weight:600;color:var(--accent);font-size:.7rem;min-width:60px">${esc(user)}</span>`;
    html+=`<span style="font-weight:600;font-size:.7rem">${esc(entry.action)}</span>`;
    html+=`<span style="color:var(--text-dim);font-size:.68rem;flex:1">${esc(entry.detail||'')}</span>`;
    html+=`</div>`;
  });
  container.innerHTML=html;
}

// Toggle and clear
document.getElementById('auditLogToggle').addEventListener('click',function(){
  const wrap=document.getElementById('auditLogWrap');
  const show=wrap.style.display==='none';
  wrap.style.display=show?'':'none';
  this.innerHTML=(show?'&#9660;':'&#9654;')+' Audit Log';
  if(show)renderAuditLog();
});
document.getElementById('auditLogClear').addEventListener('click',()=>{
  if(!confirm('Clear the audit log?'))return;
  state.auditLog=[];window.state=state;saveState();renderAuditLog();
});

// Collapsible data groups
document.querySelectorAll('.data-group-toggle').forEach(h4=>{
  h4.addEventListener('click',()=>{
    const body=h4.nextElementSibling;
    if(!body)return;
    const show=body.style.display==='none';
    body.style.display=show?'':'none';
    h4.innerHTML=(show?'&#9660;':'&#9654;')+' '+h4.textContent.replace(/^[^\s]+\s/,'');
  });
});

/* ── window assignments for inline onclick handlers ── */
window.renderDataPanelWsList = renderDataPanelWsList;
window.renderAuditLog = renderAuditLog;
window.initDataPanel = initDataPanel;
window.closeAllSidePanels = closeAllSidePanels;

/* ── named exports ── */
export { initDataPanel, renderDataPanelWsList };
