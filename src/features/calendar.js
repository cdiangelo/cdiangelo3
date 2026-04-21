// ── Plan Calendar ── sidebar calendar with milestones + per-day notes
import { state, saveState } from '../lib/state.js';

// Map CSS var colors or empty to hex fallbacks
const COLOR_MAP={'var(--accent)':'#3a7d44','var(--success)':'#3a7d44','var(--warning)':'#d97706','var(--danger)':'#dc2626','':'#3a7d44'};
function resolveColor(c){if(!c||COLOR_MAP[c])return COLOR_MAP[c||''];return c.startsWith('#')?c:'#3a7d44'}

(function(){
  const grid=document.getElementById('calGrid');
  const label=document.getElementById('calMonthLabel');
  const itemsEl=document.getElementById('calItems');
  const prevBtn=document.getElementById('calPrev');
  const nextBtn=document.getElementById('calNext');
  const addBtn=document.getElementById('calAddBtn');
  const newInput=document.getElementById('calNewItem');
  const colorSel=document.getElementById('calNewColor');
  const calEl=document.getElementById('planCalendar');
  const toggleBtn=document.getElementById('calToggleBtn');
  const notesEl=document.getElementById('calNotes');
  const summaryList=document.getElementById('calSummaryList');
  const calendarView=document.getElementById('calCalendarView');
  const summaryView=document.getElementById('calSummaryView');
  if(!grid||!label)return;

  let viewYear=new Date().getFullYear();
  let viewMonth=new Date().getMonth();
  let selectedDate=null;

  function getItems(){
    if(!state||typeof state!=='object')return {};
    if(!state.calendarItems)state.calendarItems={};
    return state.calendarItems;
  }
  function getDayNotes(){
    if(!state||typeof state!=='object')return {};
    if(!state.calendarDayNotes)state.calendarDayNotes={};
    return state.calendarDayNotes;
  }
  function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  function esc(s){return s.replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  function render(){
    const now=new Date();
    const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent=MONTHS[viewMonth]+' '+viewYear;

    const first=new Date(viewYear,viewMonth,1);
    const startDay=first.getDay();
    const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
    const daysInPrev=new Date(viewYear,viewMonth,0).getDate();
    const items=getItems();
    const notes=getDayNotes();

    let html='';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{html+=`<div class="cal-head">${d}</div>`});

    for(let i=startDay-1;i>=0;i--){
      html+=`<div class="cal-day other-month">${daysInPrev-i}</div>`;
    }
    for(let d=1;d<=daysInMonth;d++){
      const key=dateKey(viewYear,viewMonth,d);
      const isToday=d===now.getDate()&&viewMonth===now.getMonth()&&viewYear===now.getFullYear();
      const dayItems=items[key]||[];
      const itemCount=dayItems.length+(notes[key]?1:0);
      const isSelected=selectedDate===key;
      let cls='cal-day';
      if(isToday)cls+=' today';
      if(itemCount===1)cls+=' has-single';
      else if(itemCount>1)cls+=' has-multi';
      if(notes[key])cls+=' has-note';
      if(isSelected)cls+=' selected';
      // Color tint from first milestone's color
      let inlineStyle='';
      if(dayItems.length>0){
        const c=resolveColor(dayItems[0].color);
        const cr=parseInt(c.slice(1,3),16),cg=parseInt(c.slice(3,5),16),cb=parseInt(c.slice(5,7),16);
        inlineStyle=`background:rgba(${cr},${cg},${cb},0.35)`;
      }
      const tipText=notes[key]?esc(notes[key].length>60?notes[key].slice(0,60)+'…':notes[key]):'';
      html+=`<div class="${cls}" data-date="${key}" style="${inlineStyle}" ${tipText?'title="'+tipText+'"':''}>${d}</div>`;
    }
    const totalCells=startDay+daysInMonth;
    const remaining=totalCells%7===0?0:7-(totalCells%7);
    for(let i=1;i<=remaining;i++){
      html+=`<div class="cal-day other-month">${i}</div>`;
    }
    grid.innerHTML=html;

    grid.querySelectorAll('.cal-day:not(.other-month)').forEach(el=>{
      el.addEventListener('click',()=>{
        selectedDate=el.dataset.date;
        render();
      });
    });

    renderItems();
    renderSummary();
  }

  function renderItems(){
    if(!selectedDate){itemsEl.innerHTML='<div style="font-size:.72rem;color:var(--tertiary);padding:4px">Select a day</div>';return}
    const items=getItems();
    const notes=getDayNotes();
    const dayItems=items[selectedDate]||[];
    const dayNote=notes[selectedDate]||'';

    let html='';

    // Milestones
    if(dayItems.length){
      html+=dayItems.map((item,i)=>{
        const c=resolveColor(item.color);
        const cr=parseInt(c.slice(1,3),16),cg=parseInt(c.slice(3,5),16),cb=parseInt(c.slice(5,7),16);
        return `<div class="cal-item" style="background:rgba(${cr},${cg},${cb},0.12)">
          <span class="cal-dot" style="background:${c}"></span>
          <span class="cal-item-text">${esc(item.text)}</span>
          <button class="cal-item-del" data-idx="${i}">×</button>
        </div>`;
      }).join('');
    }

    // Day note
    html+=`<div style="margin-top:6px">
      <textarea id="calDayNote" placeholder="Add a note for this day..." style="width:100%;min-height:40px;padding:6px 8px;font-size:.76rem;border:1px solid var(--border-light);border-radius:6px;background:transparent;color:var(--text);font-family:inherit;resize:vertical;outline:none;transition:border-color .15s,background .15s;line-height:1.4">${esc(dayNote)}</textarea>
    </div>`;

    if(!dayItems.length&&!dayNote){
      html='<div style="font-size:.72rem;color:var(--tertiary);padding:4px">No items</div>'+html;
    }

    itemsEl.innerHTML=html;

    // Wire delete buttons
    itemsEl.querySelectorAll('.cal-item-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        dayItems.splice(+btn.dataset.idx,1);
        if(!dayItems.length)delete items[selectedDate];
        saveState();render();
      });
    });

    // Wire note textarea
    const noteTA=document.getElementById('calDayNote');
    if(noteTA){
      noteTA.addEventListener('focus',()=>{noteTA.style.borderColor='var(--accent)';noteTA.style.background='var(--bg-elevated)'});
      noteTA.addEventListener('blur',()=>{
        noteTA.style.borderColor='var(--border-light)';noteTA.style.background='transparent';
        const val=noteTA.value.trim();
        const dayNotes=getDayNotes();
        if(val){dayNotes[selectedDate]=val}else{delete dayNotes[selectedDate]}
        saveState();render();
      });
    }
  }

  function renderSummary(){
    if(!summaryList)return;
    const items=getItems();
    const notes=getDayNotes();
    const allDates=new Set([...Object.keys(items).filter(k=>items[k]&&items[k].length),...Object.keys(notes).filter(k=>notes[k])]);
    const sorted=[...allDates].sort();
    if(!sorted.length){
      summaryList.innerHTML='<div style="font-size:.78rem;color:var(--tertiary);padding:8px;text-align:center">No milestones or notes yet</div>';
      return;
    }
    summaryList.innerHTML=sorted.map(date=>{
      const dateObj=new Date(date+'T00:00:00');
      const dateLabel=dateObj.toLocaleDateString(undefined,{month:'short',day:'numeric'}).toUpperCase();
      const dateItems=items[date]||[];
      const dateNote=notes[date]||'';
      // Get primary color from first item for card accent
      const primaryColor=resolveColor(dateItems.length?dateItems[0].color:'');
      let rows='';
      if(dateItems.length){
        rows+=dateItems.map(item=>`
          <div style="display:flex;align-items:center;gap:6px;padding:3px 0">
            <span style="font-size:.78rem;color:var(--text)">${esc(item.text)}</span>
          </div>`).join('');
      }
      if(dateNote){
        const preview=dateNote.length>60?dateNote.slice(0,60)+'…':dateNote;
        rows+=`<div style="font-size:.72rem;color:var(--text-dim);padding:3px 0 0 0;font-style:italic;cursor:default" title="${esc(dateNote)}">${esc(preview)}</div>`;
      }
      // Tint matching day cell color
      const pr=parseInt(primaryColor.slice(1,3),16),pg=parseInt(primaryColor.slice(3,5),16),pb=parseInt(primaryColor.slice(5,7),16);
      const cardBg=`rgba(${pr},${pg},${pb},0.30)`;
      const cardBorder=`rgba(${pr},${pg},${pb},0.45)`;
      return `<div style="padding:10px 14px;border-radius:8px;background:${cardBg};border:1px solid ${cardBorder};margin-bottom:6px">
        <div style="font-size:.65rem;font-weight:600;color:var(--text);letter-spacing:.08em;margin-bottom:4px;opacity:.7">${dateLabel}</div>
        ${rows}
      </div>`;
    }).join('');
  }

  // View toggle
  document.querySelectorAll('.cal-view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.cal-view-btn').forEach(b=>{b.classList.remove('active');b.style.background='var(--panel)';b.style.color='var(--text-dim)'});
      btn.classList.add('active');btn.style.background='var(--accent-soft)';btn.style.color='var(--accent)';
      const v=btn.dataset.calview;
      if(calendarView)calendarView.style.display=v==='calendar'?'':'none';
      if(summaryView)summaryView.style.display=v==='summary'?'':'none';
      if(v==='summary')renderSummary();
    });
  });

  prevBtn.addEventListener('click',()=>{viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--}render()});
  nextBtn.addEventListener('click',()=>{viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++}render()});

  addBtn.addEventListener('click',()=>{
    if(!selectedDate||!newInput.value.trim())return;
    const items=getItems();
    if(!items[selectedDate])items[selectedDate]=[];
    items[selectedDate].push({text:newInput.value.trim(),color:colorSel.value});
    newInput.value='';
    saveState();render();
  });
  newInput.addEventListener('keydown',e=>{if(e.key==='Enter')addBtn.click()});

  // Toggle show/hide
  if(toggleBtn){
    toggleBtn.addEventListener('click',()=>{
      const showing=calEl.style.display!=='none';
      calEl.style.display=showing?'none':'flex';
      toggleBtn.textContent=showing?'Show Calendar':'Hide Calendar';
    });
  }

  window._showCalendar=function(){
    if(calEl)calEl.style.display='flex';
    if(toggleBtn){toggleBtn.style.display='';toggleBtn.textContent='Hide Calendar'}
    try{render()}catch(e){console.error('Calendar render error:',e)}
  };
  window._hideCalendar=function(){
    if(calEl)calEl.style.display='none';
    if(toggleBtn)toggleBtn.style.display='none';
  };
})();

// ── Targets — compact inline metric vs target table with sparkline markers ──
(function(){
  const METRICS=[
    {key:'totinv',label:'Tot Inv'},
    {key:'hc',label:'HC'},
    {key:'cb',label:'C&B'},
    {key:'oao',label:'OAO'},
    {key:'revenue',label:'Revenue'},
    {key:'ctr',label:'CTR'},
    {key:'te',label:'T&E'},
  ];
  function getActual(key){
    if(!state)return 0;
    const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const sumMo=(rows)=>(rows||[]).reduce((s,r)=>s+MO.reduce((ms,m)=>ms+(parseFloat(r[m])||0),0),0);
    if(key==='hc')return (state.employees||[]).length;
    if(key==='cb')return (state.employees||[]).reduce((s,e)=>s+((e.salary||e.baseSalary||0)),0);
    if(key==='oao')return window.getVendorOaoTotal?window.getVendorOaoTotal():0;
    if(key==='revenue')return window.getRevenueTotal?window.getRevenueTotal():0;
    if(key==='ctr')return sumMo(state.contractorRows);
    if(key==='te')return sumMo(state.teRows);
    if(key==='totinv'){const cb=getActual('cb');const oao=getActual('oao');const te=getActual('te');const ctr=getActual('ctr');return cb+oao+te+ctr}
    return 0;
  }
  function getTargets(){return state?.targets||[]}
  function setTargets(t){if(!state)return;state.targets=t;saveState()}
  const list=document.getElementById('targetList');
  const addBtn=document.getElementById('targetAddBtn');
  if(!list||!addBtn)return;

  function fmtM(v){if(Math.abs(v)>=1e6)return (v/1e6).toFixed(1)+'M';if(Math.abs(v)>=1e3)return (v/1e3).toFixed(0)+'K';return v.toLocaleString()}

  function sparkSvg(actual,target){
    const max=Math.max(actual,target,1);
    const aPct=Math.min(actual/max,1)*100;
    const tPct=Math.min(target/max,1)*100;
    return `<svg viewBox="0 0 60 12" width="60" height="12" style="flex-shrink:0"><line x1="2" y1="6" x2="58" y2="6" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round"/><circle cx="${2+tPct*.56}" cy="6" r="3" fill="none" stroke="var(--text-dim)" stroke-width="1" opacity=".6"/><circle cx="${2+aPct*.56}" cy="6" r="2.5" fill="var(--accent)"/></svg>`;
  }

  function render(){
    const targets=getTargets();
    if(!targets.length){list.innerHTML='<div style="font-size:.68rem;color:var(--text-dim);padding:2px 0;text-align:center">No targets</div>';return}
    let h='<table style="width:100%;font-size:.64rem;border-collapse:collapse">';
    h+='<tr style="color:var(--text-dim)"><td></td><td style="text-align:right;padding:1px 3px">Actual</td><td style="text-align:right;padding:1px 3px">Target</td><td style="text-align:right;padding:1px 3px">%</td><td></td><td></td></tr>';
    targets.forEach((t,i)=>{
      const actual=getActual(t.metric);
      const target=parseFloat(t.value)||0;
      const pct=target?Math.round((actual/target)*100):0;
      const color=pct>=90&&pct<=110?'var(--accent)':pct>110?'var(--danger)':'var(--warning)';
      const label=t.name||METRICS.find(m=>m.key===t.metric)?.label||t.metric;
      const isHC=t.metric==='hc';
      h+=`<tr style="border-bottom:1px solid var(--border-light)">
        <td style="font-weight:600;padding:2px 3px;white-space:nowrap">${label}</td>
        <td style="text-align:right;padding:2px 3px">${isHC?actual:'$'+fmtM(actual)}</td>
        <td style="text-align:right;padding:2px 3px;color:var(--text-dim)">${isHC?target:'$'+fmtM(target)}</td>
        <td style="text-align:right;padding:2px 3px;font-weight:600;color:${color}">${pct}%</td>
        <td style="padding:2px 2px">${sparkSvg(actual,target)}</td>
        <td style="padding:2px 0"><button class="target-del" data-ti="${i}" style="font-size:.56rem;color:var(--text-dim);background:none;border:none;cursor:pointer;opacity:.3">&times;</button></td>
      </tr>`;
    });
    h+='</table>';
    list.innerHTML=h;
    list.querySelectorAll('.target-del').forEach(btn=>{
      btn.addEventListener('click',()=>{const ts=getTargets();ts.splice(+btn.dataset.ti,1);setTargets(ts);render()});
    });
  }

  addBtn.addEventListener('click',()=>{
    const metricOpts=METRICS.map(m=>`<option value="${m.key}">${m.label}</option>`).join('');
    const d=document.createElement('div');
    d.style.cssText='display:flex;gap:4px;align-items:center;padding:4px 0';
    d.innerHTML=`<select class="t-metric" style="padding:2px 4px;font-size:.66rem;border:1px solid var(--border);border-radius:3px;background:var(--bg-input);color:var(--text)">${metricOpts}</select>
      <input class="t-value" type="number" placeholder="$M" style="width:55px;padding:2px 4px;font-size:.66rem;border:1px solid var(--border);border-radius:3px;background:var(--bg-input);color:var(--text)">
      <input class="t-name" placeholder="Label" style="width:50px;padding:2px 4px;font-size:.66rem;border:1px solid var(--border);border-radius:3px;background:var(--bg-input);color:var(--text)">
      <button class="btn btn-sm t-save" style="padding:1px 6px;font-size:.62rem">&#10003;</button>`;
    list.prepend(d);
    d.querySelector('.t-save').addEventListener('click',()=>{
      const metric=d.querySelector('.t-metric').value;
      const raw=parseFloat(d.querySelector('.t-value').value)||0;
      const value=raw*1e6;
      const name=d.querySelector('.t-name').value.trim();
      if(!raw){d.remove();return}
      const ts=getTargets();ts.push({metric,value,name});setTargets(ts);render();
    });
  });

  // Don't render at load time — state isn't populated yet.
  // Render is called via window._renderTargets after plan loads.
  window._renderTargets=render;
})();
