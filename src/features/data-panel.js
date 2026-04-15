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
    {panel:'dimsSlidePanel',btn:'dimsToggleBtn',cls:'dims-open'},
    {panel:'scenarioSlidePanel',btn:'scenarioToggleBtn',cls:'scenario-open'},
    {panel:'settingsSlidePanel'},
    {panel:'validationSlidePanel'}
  ];
  panels.forEach(p=>{
    const el=document.getElementById(p.panel);
    if(!el)return;
    el.classList.remove('open');
    el.style.transform='translateX(100%)';
    if(p.cls)document.body.classList.remove(p.cls);
    if(p.btn){const bt=document.getElementById(p.btn);if(bt){const ar=bt.querySelector('.arrow');if(ar)ar.innerHTML='&#9654;'}}
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
      guidePanel.style.transform='translateX(0)';
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
      dataPanel.style.transform='translateX(0)';
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

  // ── Historicals ──
  const histToggle=document.getElementById('historicalsToggle');
  const histUploadBtn=document.getElementById('historicalsUploadBtn');
  const histFile=document.getElementById('historicalsFile');
  const histDlBtn=document.getElementById('historicalsDlTemplate');
  if(histDlBtn){
    histDlBtn.addEventListener('click',()=>{
      if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
      const wb=XLSX.utils.book_new();
      const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const accounts=['C&B','Vendor Spend','Contractors','T&E','D&A','CapEx','Revenue'];
      // Monthly detail sheet with chartfield dimensions
      const moRows=[['Year','Month','Account','Function','Business Unit','Business Line','Market','Project','Amount','HC']];
      [2023,2024,2025].forEach(yr=>MO.forEach(mo=>accounts.forEach(a=>moRows.push([yr,mo,a,'','','','','',0,a==='C&B'?0:'']))));
      const ws1=XLSX.utils.aoa_to_sheet(moRows);
      ws1['!cols']=[{wch:6},{wch:5},{wch:16},{wch:14},{wch:14},{wch:14},{wch:10},{wch:10},{wch:12},{wch:5}];
      XLSX.utils.book_append_sheet(wb,ws1,'Monthly Detail');
      // Annual summary sheet
      const annRows=[['Year','Account','Function','Business Unit','Business Line','Market','Project','Amount','HC']];
      [2023,2024,2025].forEach(yr=>accounts.forEach(a=>annRows.push([yr,a,'','','','','',0,a==='C&B'?0:''])));
      const ws2=XLSX.utils.aoa_to_sheet(annRows);
      ws2['!cols']=[{wch:6},{wch:16},{wch:14},{wch:14},{wch:14},{wch:10},{wch:10},{wch:12},{wch:5}];
      XLSX.utils.book_append_sheet(wb,ws2,'Annual Summary');
      // Reference values sheet
      const fns=window.FUNCTIONS||[];
      const countries=window.COUNTRIES||[];
      const bus=state.bizLines||[];
      const mkts=state.markets||[];
      const projs=state.projects||[];
      const vTypes=window.VENDOR_TYPES||['Software & Licenses','Professional Services','Data & Analytics','Infrastructure','Other OpEx'];
      const eTypes=['T&E','Meals','Travel','Events','Training','Subscriptions','Other'];
      const refRows=[['Functions','Countries','Business Lines','Markets','Projects','Vendor Types','Expense Types','Accounts']];
      const acctList=['C&B','Vendor Spend','Contractors','T&E','D&A','CapEx','Revenue'];
      const maxR=Math.max(fns.length,countries.length,bus.length,mkts.length,projs.length,vTypes.length,eTypes.length,acctList.length);
      for(let i=0;i<maxR;i++){
        refRows.push([fns[i]||'',countries[i]||'',bus[i]?bus[i].code+' — '+bus[i].name:'',mkts[i]?mkts[i].code+' — '+mkts[i].name:'',projs[i]?projs[i].code:'',vTypes[i]||'',eTypes[i]||'',acctList[i]||'']);
      }
      const wsRef=XLSX.utils.aoa_to_sheet(refRows);
      wsRef['!cols']=[{wch:28},{wch:18},{wch:32},{wch:24},{wch:12},{wch:22},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(wb,wsRef,'Reference Values');
      XLSX.writeFile(wb,'historicals_template.xlsx');
    });
  }
  if(histToggle){
    if(!state.historicals)state.historicals={enabled:false,years:{}};
    histToggle.checked=!!state.historicals.enabled;
    histToggle.addEventListener('change',()=>{
      if(!state.historicals)state.historicals={enabled:false,years:{}};
      state.historicals.enabled=histToggle.checked;
      if(window.saveState)window.saveState();
      renderHistoricalsList();
      try{if(window.ltfUpdateYearRange)window.ltfUpdateYearRange()}catch(e){}
      try{if(window.renderLtfChart)window.renderLtfChart()}catch(e){}
      try{if(window.buildExecTrendYearToggle)window.buildExecTrendYearToggle()}catch(e){}
      try{if(window.renderExecView)window.renderExecView()}catch(e){}
      try{if(window.renderPnlWalk)window.renderPnlWalk()}catch(e){}
      try{if(window.renderLandingCharts)window.renderLandingCharts()}catch(e){}
    });
  }
  if(histUploadBtn&&histFile){
    histUploadBtn.addEventListener('click',()=>histFile.click());
    histFile.addEventListener('change',function(){
      const file=this.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=function(e){
        try{
          if(!state.historicals)state.historicals={enabled:false,years:{}};
          if(typeof XLSX!=='undefined'){
            const MO_MAP={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
              january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
            const wb=XLSX.read(e.target.result,{type:'array'});
            // Try Monthly Detail sheet first, fall back to first non-reference sheet
            const dataSheets=wb.SheetNames.filter(n=>!n.toLowerCase().includes('reference'));
            const wsName=dataSheets.find(n=>n.toLowerCase().includes('monthly'))||dataSheets[0];
            const ws=wb.Sheets[wsName];
            const rows=XLSX.utils.sheet_to_json(ws);
            const hasMonth=rows.some(r=>r.Month||r.month);
            function mapAcct(a){
              const l=a.toLowerCase();
              if(l==='hc'||l==='headcount')return 'hc';
              if(l==='cb'||l==='c&b'||l==='comp')return 'cb';
              if(l==='vendor spend'||l==='oao'||l==='vendor')return 'oao';
              if(l==='contractors'||l==='ctr'||l==='contractor')return 'ctr';
              if(l==='t&e'||l==='te'||l==='travel')return 'te';
              if(l==='da'||l==='d&a'||l==='depreciation')return 'da';
              if(l==='capex')return 'capex';
              if(l==='revenue')return 'revenue';
              return null;
            }
            function ensureYr(yr){
              if(!state.historicals.years[yr])state.historicals.years[yr]={hc:0,cb:0,oao:0,ctr:0,te:0,da:0,capex:0,revenue:0,monthly:{},rows:[]};
              if(!state.historicals.years[yr].monthly)state.historicals.years[yr].monthly={};
              if(!state.historicals.years[yr].rows)state.historicals.years[yr].rows=[];
              return state.historicals.years[yr];
            }
            rows.forEach(r=>{
              const yr=String(r.Year||r.year||'').trim();
              const acctRaw=(r.Account||r.account||'').trim();
              const acct=mapAcct(acctRaw);
              const amt=parseFloat(r.Amount||r.amount||0);
              const hcVal=parseFloat(r.HC||r.hc||0);
              if(!yr||!acct)return;
              const yd=ensureYr(yr);
              // Capture chartfield dimensions
              const fn=(r.Function||r['function']||'').trim();
              const bu=(r['Business Unit']||r.businessUnit||r.BusinessUnit||'').trim();
              const bl=(r['Business Line']||r.bizLine||r.BusinessLine||'').trim();
              const mkt=(r.Market||r.market||'').trim();
              const proj=(r.Project||r.project||'').trim();
              // Store detail row for dimension-based analysis
              const detailRow={acct,amount:amt,hc:hcVal||0,function:fn,businessUnit:bu,bizLine:bl,market:mkt,project:proj};
              if(hasMonth){
                const mo=(r.Month||r.month||'').toString().trim().toLowerCase().slice(0,3);
                const mi=MO_MAP[mo]??parseInt(mo)-1;
                detailRow.month=mi;
                if(mi>=0&&mi<12){
                  if(!yd.monthly[mi])yd.monthly[mi]={hc:0,cb:0,oao:0,ctr:0,te:0,da:0,capex:0,revenue:0};
                  if(acct==='hc')yd.monthly[mi].hc+=hcVal||amt;
                  else yd.monthly[mi][acct]+=amt;
                }
                if(acct==='hc'){yd.hc=Math.max(yd.hc,hcVal||amt)}
                else yd[acct]+=amt;
              } else {
                if(acct==='hc')yd.hc+=hcVal||amt;
                else yd[acct]+=amt;
              }
              if(hcVal&&acct==='cb')yd.hc=Math.max(yd.hc,hcVal);
              yd.rows.push(detailRow);
            });
            state.historicals.enabled=true;
            if(histToggle)histToggle.checked=true;
            if(window.saveState)window.saveState();
            renderHistoricalsList();
            try{if(window.ltfUpdateYearRange)window.ltfUpdateYearRange()}catch(e){}
            try{if(window.renderLtfChart)window.renderLtfChart()}catch(e){}
            try{if(window.buildExecTrendYearToggle)window.buildExecTrendYearToggle()}catch(e){}
          }
        }catch(err){alert('Failed to parse file: '+err.message)}
      };
      reader.readAsArrayBuffer(file);
      this.value='';
    });
  }
  function renderHistoricalsList(){
    const list=document.getElementById('historicalsList');
    if(!list)return;
    const hist=state.historicals||{years:{}};
    const years=Object.keys(hist.years||{}).sort();
    if(!years.length){list.innerHTML='<div style="font-size:.74rem;color:var(--text-dim)">No historical data uploaded.</div>';return}
    const fv=v=>v>=1e6?'$'+(v/1e6).toFixed(1)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'K':v?String(Math.round(v)):'—';
    list.innerHTML=`<table style="width:100%;font-size:.7rem;border-collapse:collapse">
      <thead><tr style="color:var(--text-dim)"><th style="text-align:left;padding:3px 4px">Year</th><th>HC</th><th>C&B</th><th>OAO</th><th>CTR</th><th>T&E</th><th>D&A</th><th>CapEx</th><th style="text-align:right;padding:3px 4px">
        <span style="cursor:pointer;color:var(--danger);font-size:.6rem" title="Clear all historicals" id="histClearAll">clear</span></th></tr></thead>
      <tbody>${years.map(yr=>{const d=hist.years[yr];const hasMo=d.monthly&&Object.keys(d.monthly).length>0;return `<tr><td style="font-weight:600;padding:3px 4px">${yr}${hasMo?'<span style="color:var(--accent);font-size:.55rem;margin-left:2px" title="Monthly detail available">mo</span>':''}</td><td class="num">${d.hc||'—'}</td><td class="num">${fv(d.cb)}</td><td class="num">${fv(d.oao)}</td><td class="num">${fv(d.ctr||0)}</td><td class="num">${fv(d.te||0)}</td><td class="num">${fv(d.da)}</td><td class="num">${fv(d.capex)}</td><td style="text-align:right;padding:3px 4px"><button class="hist-del-yr" data-yr="${yr}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.6rem">×</button></td></tr>`}).join('')}</tbody>
    </table>`;
    list.querySelectorAll('.hist-del-yr').forEach(btn=>{
      btn.addEventListener('click',()=>{delete state.historicals.years[btn.dataset.yr];if(window.saveState)window.saveState();renderHistoricalsList()});
    });
    const clearBtn=list.querySelector('#histClearAll');
    if(clearBtn)clearBtn.addEventListener('click',()=>{if(confirm('Clear all historical data?')){state.historicals.years={};if(window.saveState)window.saveState();renderHistoricalsList()}});
  }
  renderHistoricalsList();

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
      const ws=wb.Sheets[(wb._dataSheets||wb.SheetNames)[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){alert('No data rows found.');return}
      const MO_NAMES=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const FIELD_MAP={};
      [['Expense Type','expenseType'],['Type','expenseType'],['Description','description'],['Business Unit','businessUnit'],['BU','businessUnit'],['Biz Line','bizLine'],['Business Line','bizLine'],['Market','market'],['Project','project'],['Project Code','project'],['Account Description','acctDesc'],['Account','acctDesc'],['Notes','notes']].forEach(([k,v])=>{FIELD_MAP[k]=v;FIELD_MAP[k.toLowerCase()]=v});
      MO_LABELS.forEach((m,i)=>{FIELD_MAP[m]=MO_NAMES[i];FIELD_MAP[m.toLowerCase()]=MO_NAMES[i]});
      let imported=0;
      const startIdx=state.teRows.length;
      rows.forEach(r=>{
        const row={expenseType:'',description:'',businessUnit:'',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0};
        Object.keys(r).forEach(k=>{const mapped=FIELD_MAP[k]||FIELD_MAP[k.trim().toLowerCase()];if(mapped)row[mapped]=MO_NAMES.includes(mapped)?parseFloat(r[k])||0:String(r[k])});
        if(row.project){const p=state.projects.find(pr=>pr.code===row.project||pr.id===row.project);if(p)row.project=p.id}
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
  // Export Roster
  document.getElementById('dataPanelRosterExport').addEventListener('click',()=>{
    document.getElementById('btnDlRosterTemplate').click();
  });
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
// ── Validation Checks ──
function initValidationPanel(){
  const panel=document.getElementById('validationSlidePanel');
  const btn=document.getElementById('btbValidation');
  if(btn&&panel){
    btn.addEventListener('click',()=>{
      const wasOpen=panel.classList.contains('open');
      closeAllSidePanels();
      if(!wasOpen){
        panel.classList.add('open');
        panel.style.transform='translateX(0)';
      }
    });
  }
  const runBtn=document.getElementById('runValidationBtn');
  if(runBtn)runBtn.addEventListener('click',runValidationChecks);
}

function runValidationChecks(){
  const results=[];
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const MO_LABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // 1. Employees with zero salary
  (state.employees||[]).forEach(e=>{
    if(!e.salary||e.salary===0)results.push({type:'warning',category:'C&B',msg:`${e.name||e.role||'Employee'} has $0 salary`});
  });

  // 2. Employees with no function/country
  (state.employees||[]).forEach(e=>{
    if(!e.function)results.push({type:'info',category:'C&B',msg:`${e.name||'Employee'} missing function`});
    if(!e.country)results.push({type:'info',category:'C&B',msg:`${e.name||'Employee'} missing country`});
  });

  // 3. Vendor rows with only one month of spend (anomaly)
  (state.vendorRows||[]).forEach(r=>{
    const nonZero=MO.filter(m=>(parseFloat(r[m])||0)!==0);
    if(nonZero.length===1)results.push({type:'warning',category:'Vendor',msg:`"${r.vendorName||'Unnamed'}" has spend in only ${MO_LABELS[MO.indexOf(nonZero[0])]}`});
  });

  // 4. Big monthly jumps in vendor (>200% M/M)
  (state.vendorRows||[]).forEach(r=>{
    for(let m=1;m<12;m++){
      const prev=Math.abs(parseFloat(r[MO[m-1]])||0);
      const curr=Math.abs(parseFloat(r[MO[m]])||0);
      if(prev>1000&&curr>1000){
        const ratio=curr/prev;
        if(ratio>3||ratio<0.33)results.push({type:'alert',category:'Vendor',msg:`"${r.vendorName||'Unnamed'}" ${MO_LABELS[m-1]}→${MO_LABELS[m]}: ${ratio>1?'+':''}${Math.round((ratio-1)*100)}% jump`});
      }
    }
  });

  // 5. T&E same checks
  (state.teRows||[]).forEach(r=>{
    const nonZero=MO.filter(m=>(parseFloat(r[m])||0)!==0);
    if(nonZero.length===1)results.push({type:'warning',category:'T&E',msg:`"${r.description||'Unnamed'}" has spend in only ${MO_LABELS[MO.indexOf(nonZero[0])]}`});
  });

  // 6. Projects with OAO but no HC
  const projHC={};
  (state.employees||[]).forEach(e=>{const p=e.project||'';if(p)projHC[p]=(projHC[p]||0)+1});
  const projOAO={};
  (state.vendorRows||[]).forEach(r=>{const p=r.project||'';if(p){const fy=MO.reduce((s,m)=>s+(parseFloat(r[m])||0),0);if(fy)projOAO[p]=(projOAO[p]||0)+fy}});
  Object.keys(projOAO).forEach(p=>{
    if(!projHC[p])results.push({type:'info',category:'Allocation',msg:`Project "${p}" has OAO spend but no headcount`});
  });

  // 7. Forecast assumptions with zeros
  const fa=state.forecastAssumptions;
  if(fa){
    ['attrition','hires','merit'].forEach(key=>{
      if(fa[key]&&fa[key].every(v=>v===0))results.push({type:'info',category:'Forecast',msg:`${key} assumptions are all zero — forecasts may be flat`});
    });
  }

  // 8. Duplicate vendor names
  const vNames={};
  (state.vendorRows||[]).forEach(r=>{const n=(r.vendorName||'').toLowerCase().trim();if(n)vNames[n]=(vNames[n]||0)+1});
  Object.entries(vNames).forEach(([n,c])=>{if(c>3)results.push({type:'info',category:'Vendor',msg:`"${n}" appears ${c} times — consider consolidating`})});

  // Render results
  const container=document.getElementById('validationResults');
  if(!container)return;
  if(!results.length){container.innerHTML='<div style="text-align:center;padding:20px;color:var(--success);font-size:.88rem;font-weight:600">✓ All checks passed</div>';return}

  const icons={alert:'⚠️',warning:'⚡',info:'ℹ️'};
  const colors={alert:'var(--danger)',warning:'var(--warning, #d97706)',info:'var(--text-dim)'};
  container.innerHTML=`<div style="font-size:.76rem;color:var(--text-dim);margin-bottom:8px">${results.length} item${results.length!==1?'s':''} found</div>`+
    results.map(r=>`<div style="display:flex;gap:8px;padding:8px 10px;background:var(--bg-elevated);border-radius:6px;border-left:3px solid ${colors[r.type]};font-size:.76rem">
      <span>${icons[r.type]||''}</span>
      <div><span style="font-weight:600;color:var(--text-dim);font-size:.65rem;text-transform:uppercase">${r.category}</span><div style="color:var(--text)">${esc(r.msg)}</div></div>
    </div>`).join('');
}

// ── DIMENSIONS SLIDE PANEL ──
function initDimensionsPanel(){
  const dimsPanel=document.getElementById('dimsSlidePanel');
  const dimsBtn=document.getElementById('dimsToggleBtn');
  if(!dimsPanel||!dimsBtn)return;
  const dimsArrow=dimsBtn.querySelector('.arrow');
  dimsBtn.addEventListener('click',()=>{
    const wasOpen=dimsPanel.classList.contains('open');
    closeAllSidePanels();
    if(!wasOpen){
      dimsPanel.classList.add('open');
      dimsPanel.style.transform='translateX(0)';
      document.body.classList.add('dims-open');
      if(dimsArrow)dimsArrow.innerHTML='&#9664;';
      renderDimsPanel();
    }
  });

  // ── Markets ──
  function renderDimMarkets(){
    const body=document.getElementById('dimMarketsBody');
    if(!body)return;
    body.innerHTML=(state.markets||[]).map(m=>`<tr>
      <td><input class="dm-code dim-edit-input" data-code="${esc(m.code)}" value="${esc(m.code)}" style="font-weight:600;color:var(--accent);width:70px"></td>
      <td><input class="dm-name dim-edit-input" data-code="${esc(m.code)}" value="${esc(m.name)}" style="width:140px"></td>
      <td><button class="btn btn-sm btn-danger dm-del" data-code="${esc(m.code)}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
    </tr>`).join('');
    body.querySelectorAll('.dm-code').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const oldCode=inp.dataset.code;const newCode=inp.value.trim().toUpperCase();
        if(!newCode||state.markets.some(x=>x.code!==oldCode&&x.code===newCode)){inp.value=oldCode;return}
        const m=state.markets.find(x=>x.code===oldCode);
        if(m){state.projects.forEach(p=>{if(p.marketCode===oldCode)p.marketCode=newCode});m.code=newCode;saveState();renderDimsPanel();syncAllDimViews()}
      });
    });
    body.querySelectorAll('.dm-name').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const m=state.markets.find(x=>x.code===inp.dataset.code);
        if(m){m.name=inp.value;saveState();syncAllDimViews()}
      });
    });
    body.querySelectorAll('.dm-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(!confirm('Delete market '+btn.dataset.code+'?'))return;
        state.markets=state.markets.filter(m=>m.code!==btn.dataset.code);
        saveState();renderDimsPanel();syncAllDimViews();
      });
    });
  }

  document.getElementById('dimBtnAddMarket').addEventListener('click',()=>{
    const code=document.getElementById('dimMktCode').value.trim().toUpperCase();
    const name=document.getElementById('dimMktName').value.trim();
    if(!code||!name){alert('Fill code and name');return}
    if(!/^[A-Z]{2}\d{4}$/.test(code)){alert('Market code must be 2 letters + 4 digits (e.g. JP0011)');return}
    if(state.markets.some(m=>m.code===code)){alert('Market code already exists');return}
    state.markets.push({code,name});
    saveState();renderDimsPanel();syncAllDimViews();
    document.getElementById('dimMktCode').value='';document.getElementById('dimMktName').value='';
  });

  // ── Business Lines ──
  function renderDimBizLines(){
    const body=document.getElementById('dimBizBody');
    if(!body)return;
    body.innerHTML=(state.bizLines||[]).map(b=>`<tr>
      <td><input class="db-code dim-edit-input" data-code="${esc(b.code)}" value="${esc(b.code)}" style="font-weight:600;color:var(--accent);width:60px"></td>
      <td><input class="db-name dim-edit-input" data-code="${esc(b.code)}" value="${esc(b.name)}" style="width:140px"></td>
      <td><button class="btn btn-sm btn-danger db-del" data-code="${esc(b.code)}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
    </tr>`).join('');
    body.querySelectorAll('.db-code').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const oldCode=inp.dataset.code;const newCode=inp.value.trim();
        if(!newCode||state.bizLines.some(x=>x.code!==oldCode&&x.code===newCode)){inp.value=oldCode;return}
        const b=state.bizLines.find(x=>x.code===oldCode);
        if(b){
          (state.employees||[]).forEach(e=>{if(e.businessLine===oldCode)e.businessLine=newCode});
          (state.vendorRows||[]).forEach(r=>{if(r.bizLine===oldCode)r.bizLine=newCode});
          (state.teRows||[]).forEach(r=>{if(r.bizLine===oldCode)r.bizLine=newCode});
          b.code=newCode;saveState();renderDimsPanel();syncAllDimViews();
        }
      });
    });
    body.querySelectorAll('.db-name').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const b=state.bizLines.find(x=>x.code===inp.dataset.code);
        if(b){b.name=inp.value;saveState();syncAllDimViews()}
      });
    });
    body.querySelectorAll('.db-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(!confirm('Delete business line '+btn.dataset.code+'?'))return;
        state.bizLines=state.bizLines.filter(b=>b.code!==btn.dataset.code);
        saveState();renderDimsPanel();syncAllDimViews();
      });
    });
  }

  document.getElementById('dimBtnAddBizLine').addEventListener('click',()=>{
    const code=document.getElementById('dimBizCode').value.trim();
    const name=document.getElementById('dimBizName').value.trim();
    if(!code||!name){alert('Fill code and name');return}
    if(!/^\d+$/.test(code)){alert('Code must be numeric');return}
    if(state.bizLines.some(b=>b.code===code)){alert('Code already exists');return}
    state.bizLines.push({code,name});
    saveState();renderDimsPanel();syncAllDimViews();
    document.getElementById('dimBizCode').value='';document.getElementById('dimBizName').value='';
  });

  // ── Projects ──
  function renderDimProjects(){
    const body=document.getElementById('dimProjectsBody');
    if(!body)return;
    body.innerHTML=(state.projects||[]).map(p=>{
      const mkt=state.markets.find(m=>m.code===p.marketCode);
      return `<tr>
        <td style="font-weight:600;color:var(--accent)">${esc(p.code)}</td>
        <td>${esc(p.product||'')}</td><td>${esc(p.category||'')}</td>
        <td style="font-size:.78rem">${mkt?esc(mkt.code+' — '+mkt.name):'—'}</td>
        <td><button class="btn btn-sm btn-danger dp-del" data-pid="${p.id}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
      </tr>`;
    }).join('');
    body.querySelectorAll('.dp-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const pid=btn.dataset.pid;
        const p=state.projects.find(x=>x.id===pid);
        if(!confirm('Delete project '+(p?p.code:pid)+'?'))return;
        state.projects=state.projects.filter(x=>x.id!==pid);
        (state.employees||[]).forEach(e=>{if(e.allocations)e.allocations=e.allocations.filter(a=>a.projId!==pid)});
        saveState();renderDimsPanel();syncAllDimViews();
      });
    });
    // Populate market select
    const mktSel=document.getElementById('dimProjMarket');
    if(mktSel){
      const cur=mktSel.value;
      mktSel.innerHTML='<option value="">—</option>'+(state.markets||[]).map(m=>`<option value="${esc(m.code)}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
      if(cur)mktSel.value=cur;
    }
  }

  document.getElementById('dimBtnAddProject').addEventListener('click',()=>{
    const code=document.getElementById('dimProjCode').value.trim();
    const product=document.getElementById('dimProjProduct').value.trim();
    const category=document.getElementById('dimProjCategory').value.trim();
    const marketCode=document.getElementById('dimProjMarket').value;
    if(!code||!product||!category){alert('Fill code, product, and category');return}
    if(state.projects.some(p=>p.code===code)){alert('Project code already exists');return}
    const uid=()=>'p'+Date.now()+Math.random().toString(36).slice(2,6);
    state.projects.push({id:uid(),code,product,category,marketCode,description:''});
    saveState();renderDimsPanel();syncAllDimViews();
    document.getElementById('dimProjCode').value='';document.getElementById('dimProjProduct').value='';document.getElementById('dimProjCategory').value='';document.getElementById('dimProjMarket').value='';
  });

  // ── Accounts ──
  function renderDimAccounts(){
    const body=document.getElementById('dimAcctBody');
    if(!body)return;
    body.innerHTML=(state.accounts||[]).map((a,i)=>`<tr>
      <td style="font-weight:600;color:var(--accent)">${esc(a.code)}</td>
      <td>${esc(a.description)}</td>
      <td style="font-size:.72rem">${esc(a.category||'')}</td>
      <td style="font-size:.72rem">${esc(a.group||'')}</td>
      <td><button class="btn btn-sm btn-danger da-del" data-idx="${i}" style="padding:2px 6px;font-size:.7rem">Del</button></td>
    </tr>`).join('');
    body.querySelectorAll('.da-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=parseInt(btn.dataset.idx);
        if(!confirm('Delete account '+(state.accounts[idx]?.code||'(blank)')+'?'))return;
        state.accounts.splice(idx,1);
        saveState();renderDimsPanel();syncAllDimViews();
      });
    });
  }

  document.getElementById('dimBtnAddAcct').addEventListener('click',()=>{
    const code=document.getElementById('dimAcctCode').value.trim();
    const desc=document.getElementById('dimAcctDesc').value.trim();
    const cat=document.getElementById('dimAcctCategory').value;
    const grp=document.getElementById('dimAcctGroup').value;
    if(!code||!desc){alert('Please fill account code and description');return}
    if(state.accounts.some(a=>a.code===code)){alert('Account code already exists');return}
    state.accounts.push({code,description:desc,category:cat,group:grp});
    saveState();renderDimsPanel();syncAllDimViews();
    document.getElementById('dimAcctCode').value='';document.getElementById('dimAcctDesc').value='';document.getElementById('dimAcctCategory').value='';
  });

  // ── Functions & Seniority (read-only reference) ──
  function renderDimFuncSeniority(){
    const fList=document.getElementById('dimFunctionsList');
    const sList=document.getElementById('dimSeniorityList');
    const FUNCTIONS=window.FUNCTIONS||[];
    const SENIORITY=window.SENIORITY||[];
    if(fList)fList.innerHTML=FUNCTIONS.map(f=>`<div style="padding:3px 8px;font-size:.76rem;background:var(--bg-elevated);border-radius:4px">${esc(f)}</div>`).join('');
    if(sList)sList.innerHTML=SENIORITY.map(s=>`<div style="padding:3px 8px;font-size:.76rem;background:var(--bg-elevated);border-radius:4px">${esc(s)}</div>`).join('');
  }

  // ── Functional Pillars ──
  function renderPillarTypes(){
    const list=document.getElementById('dimPillarTypesList');
    if(!list)return;
    if(!state.pillarTypes)state.pillarTypes=['Pillar 1','Pillar 2','Pillar 3'];
    list.innerHTML=state.pillarTypes.map((p,i)=>`<span style="display:inline-flex;align-items:center;gap:2px;padding:2px 8px;background:var(--bg-elevated);border-radius:4px;font-size:.74rem;border:1px solid var(--border-light)"><input class="dpt-name" data-idx="${i}" value="${esc(p)}" style="border:none;background:transparent;font-size:.74rem;width:${Math.max(50,p.length*8)}px;padding:0;color:var(--text)"><button class="dpt-del" data-idx="${i}" style="border:none;background:transparent;cursor:pointer;color:var(--danger);font-size:.7rem;padding:0 2px" title="Remove">×</button></span>`).join('');
    list.querySelectorAll('.dpt-name').forEach(inp=>{
      inp.addEventListener('change',()=>{
        const oldName=state.pillarTypes[+inp.dataset.idx];
        const newName=inp.value.trim();
        if(!newName){inp.value=oldName;return}
        state.pillarTypes[+inp.dataset.idx]=newName;
        // Rename in assignments
        Object.keys(state.functionalPillars||{}).forEach(fn=>{
          if(state.functionalPillars[fn]===oldName)state.functionalPillars[fn]=newName;
        });
        saveState();renderDimPillars();
      });
    });
    list.querySelectorAll('.dpt-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const name=state.pillarTypes[+btn.dataset.idx];
        state.pillarTypes.splice(+btn.dataset.idx,1);
        // Clear assignments using deleted pillar
        Object.keys(state.functionalPillars||{}).forEach(fn=>{
          if(state.functionalPillars[fn]===name)state.functionalPillars[fn]='';
        });
        saveState();renderPillarTypes();renderDimPillars();
      });
    });
  }

  document.getElementById('dimBtnAddPillar').addEventListener('click',()=>{
    const inp=document.getElementById('dimNewPillarName');
    const name=inp.value.trim();
    if(!name){return}
    if(!state.pillarTypes)state.pillarTypes=[];
    if(state.pillarTypes.includes(name)){alert('Pillar already exists');return}
    state.pillarTypes.push(name);
    saveState();renderPillarTypes();renderDimPillars();
    inp.value='';
  });

  function renderDimPillars(){
    renderPillarTypes();
    const body=document.getElementById('dimPillarsBody');
    if(!body)return;
    const FUNCTIONS=window.FUNCTIONS||[];
    const pillars=state.functionalPillars||{};
    const types=state.pillarTypes||[];
    const allFuncs=[...new Set([...FUNCTIONS,...Object.keys(pillars)])];
    body.innerHTML=allFuncs.map(f=>{
      const cur=pillars[f]||'';
      const opts=types.map(t=>`<option value="${esc(t)}"${cur===t?' selected':''}>${esc(t)}</option>`).join('');
      return `<tr>
        <td style="font-size:.78rem">${esc(f)}</td>
        <td><select class="dp-pillar" data-func="${esc(f)}" style="padding:2px 6px;font-size:.76rem;border:1px solid var(--border);border-radius:4px">
          <option value="">—</option>${opts}
        </select></td>
      </tr>`;
    }).join('');
    body.querySelectorAll('.dp-pillar').forEach(sel=>{
      sel.addEventListener('change',()=>{
        if(!state.functionalPillars)state.functionalPillars={};
        state.functionalPillars[sel.dataset.func]=sel.value;
        saveState();
      });
    });
  }

  // ── Mapping Rules ──
  function renderDimMappingRules(){
    const list=document.getElementById('dimMappingRulesList');
    if(!list)return;
    const rules=state.mappingRules||[];
    if(!rules.length){
      list.innerHTML='<div style="font-size:.78rem;color:var(--tertiary);padding:8px;text-align:center">No mapping rules defined.</div>';
      return;
    }
    list.innerHTML=rules.map((r,i)=>{
      const parts=[];
      if(r.market)parts.push('Market: '+r.market);
      if(r.bizLine)parts.push('Biz Line: '+r.bizLine);
      if(r.product)parts.push('Product: '+r.product);
      if(r.category)parts.push('Category: '+r.category);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:var(--bg-elevated);border-left:3px solid var(--accent)">
        <span style="font-size:.76rem;font-weight:500">Project ${esc(r.projectCode||'Any')}</span>
        <span style="font-size:.72rem;color:var(--tertiary)">→</span>
        <span style="font-size:.74rem;color:var(--text-dim);flex:1">${parts.join(' · ')||'No mappings'}</span>
        <button class="btn btn-sm dmr-del" data-idx="${i}" style="padding:2px 6px;font-size:.68rem;color:var(--danger)">×</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.dmr-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        rules.splice(+btn.dataset.idx,1);
        saveState();renderDimMappingRules();
      });
    });
    // Populate rule dropdowns
    populateRuleDropdowns();
  }

  function populateRuleDropdowns(){
    const projSel=document.getElementById('dimRuleProject');
    const mktSel=document.getElementById('dimRuleMarket');
    const blSel=document.getElementById('dimRuleBizLine');
    if(projSel)projSel.innerHTML='<option value="">Select...</option>'+(state.projects||[]).filter(p=>p.code!=='GEN-000').map(p=>`<option value="${esc(p.code)}">${esc(p.code)} — ${esc(p.product||'')}</option>`).join('');
    if(mktSel)mktSel.innerHTML='<option value="">—</option>'+(state.markets||[]).map(m=>`<option value="${esc(m.code)}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
    if(blSel)blSel.innerHTML='<option value="">—</option>'+(state.bizLines||[]).map(b=>`<option value="${esc(b.code)}">${esc(b.code)} — ${esc(b.name)}</option>`).join('');
  }

  document.getElementById('dimBtnAddRule').addEventListener('click',()=>{
    const projCode=document.getElementById('dimRuleProject').value;
    if(!projCode){alert('Select a project');return}
    const market=document.getElementById('dimRuleMarket').value;
    const bizLine=document.getElementById('dimRuleBizLine').value;
    const product=document.getElementById('dimRuleProduct').value.trim();
    const category=document.getElementById('dimRuleCategory').value.trim();
    if(!market&&!bizLine&&!product&&!category){alert('Set at least one mapping');return}
    if(!state.mappingRules)state.mappingRules=[];
    state.mappingRules.push({projectCode:projCode,market,bizLine,product,category});
    saveState();renderDimMappingRules();
    document.getElementById('dimRuleProject').value='';document.getElementById('dimRuleMarket').value='';document.getElementById('dimRuleBizLine').value='';
    document.getElementById('dimRuleProduct').value='';document.getElementById('dimRuleCategory').value='';
  });

  // ── Master render ──
  function renderDimsPanel(){
    renderDimMarkets();
    renderDimBizLines();
    renderDimProjects();
    renderDimAccounts();
    renderDimFuncSeniority();
    renderDimPillars();
    renderDimMappingRules();
    populateRuleDropdowns();
  }

  // Sync other views when dims change
  function syncAllDimViews(){
    if(typeof window.refreshAllDropdowns==='function')window.refreshAllDropdowns();
    if(typeof window.renderMarkets==='function')window.renderMarkets();
    if(typeof window.renderBizLines==='function')window.renderBizLines();
    if(typeof window.renderProjects==='function')window.renderProjects();
    if(typeof window.renderVendorGrid==='function')window.renderVendorGrid();
    if(typeof window.renderTeGrid==='function')window.renderTeGrid();
    if(typeof window.refreshProjectDropdown==='function')window.refreshProjectDropdown();
    if(typeof window.renderMappingRules==='function')window.renderMappingRules();
    if(typeof window.renderDimProductList==='function')window.renderDimProductList();
  }
}

window.initValidationPanel=initValidationPanel;
window.initDataPanel = initDataPanel;
window.initDimensionsPanel = initDimensionsPanel;
window.closeAllSidePanels = closeAllSidePanels;

/* ── named exports ── */
export { initDataPanel, initDimensionsPanel, renderDataPanelWsList };
