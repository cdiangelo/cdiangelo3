// ── NAV ──

export function initNav(){
  document.querySelectorAll('#mainNav button').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#mainNav button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
      document.getElementById('tab-'+b.dataset.tab).classList.add('active');
      if(b.dataset.tab==='dashboard')renderDashboard();
      if(b.dataset.tab==='employees')renderEmployees();
      if(b.dataset.tab==='projects')renderProjects();
      if(b.dataset.tab==='benchmarks')renderBenchmarkTables();
      if(b.dataset.tab==='monthly')renderMonthly();
      if(b.dataset.tab==='forecast')renderForecast();
      if(b.dataset.tab==='exec'){renderExecView();if(!window._scenInited){initScenarioPane();window._scenInited=true}}
      if(b.dataset.tab==='scratch')initScratchPad();
    });
  });
}
