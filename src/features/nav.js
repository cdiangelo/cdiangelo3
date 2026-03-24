// ── NAV ──

document.querySelectorAll('#mainNav button').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('#mainNav button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='dashboard')window.renderDashboard();
    if(b.dataset.tab==='employees')window.renderEmployees();
    if(b.dataset.tab==='projects')window.renderProjects();
    if(b.dataset.tab==='benchmarks')window.renderBenchmarkTables();
    if(b.dataset.tab==='monthly')window.renderMonthly();
    if(b.dataset.tab==='forecast')window.renderForecast();
    if(b.dataset.tab==='exec'){window.renderExecView();if(!window._scenInited){window.initScenarioPane();window._scenInited=true}}
    if(b.dataset.tab==='scratch')window.initScratchPad();
  });
});
