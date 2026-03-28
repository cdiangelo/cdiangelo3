// ── Plan Calendar ── sidebar calendar with milestones saved to plan state
import { state, saveState } from '../lib/state.js';

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

  function getNotes(){
    if(!state||typeof state!=='object')return '';
    return state.calendarNotes||'';
  }

  function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}

  function render(){
    const now=new Date();
    const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent=MONTHS[viewMonth]+' '+viewYear;

    const first=new Date(viewYear,viewMonth,1);
    const startDay=first.getDay();
    const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
    const daysInPrev=new Date(viewYear,viewMonth,0).getDate();
    const items=getItems();

    let html='';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{html+=`<div class="cal-head">${d}</div>`});

    for(let i=startDay-1;i>=0;i--){
      html+=`<div class="cal-day other-month">${daysInPrev-i}</div>`;
    }
    for(let d=1;d<=daysInMonth;d++){
      const key=dateKey(viewYear,viewMonth,d);
      const isToday=d===now.getDate()&&viewMonth===now.getMonth()&&viewYear===now.getFullYear();
      const hasItems=items[key]&&items[key].length>0;
      const isSelected=selectedDate===key;
      let cls='cal-day';
      if(isToday)cls+=' today';
      if(hasItems)cls+=' has-items';
      if(isSelected)cls+=' selected';
      html+=`<div class="${cls}" data-date="${key}">${d}</div>`;
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
    const dayItems=items[selectedDate]||[];
    if(!dayItems.length){
      itemsEl.innerHTML='<div style="font-size:.72rem;color:var(--tertiary);padding:4px">No items</div>';
      return;
    }
    itemsEl.innerHTML=dayItems.map((item,i)=>`
      <div class="cal-item">
        <span class="cal-dot" style="background:${item.color||'var(--accent)'}"></span>
        <span class="cal-item-text">${item.text}</span>
        <button class="cal-item-del" data-idx="${i}">×</button>
      </div>
    `).join('');
    itemsEl.querySelectorAll('.cal-item-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        dayItems.splice(+btn.dataset.idx,1);
        if(!dayItems.length)delete items[selectedDate];
        saveState();render();
      });
    });
  }

  function renderSummary(){
    if(!summaryList)return;
    const items=getItems();
    const allDates=Object.keys(items).filter(k=>items[k]&&items[k].length).sort();
    if(!allDates.length){
      summaryList.innerHTML='<div style="font-size:.78rem;color:var(--tertiary);padding:8px;text-align:center">No milestones yet</div>';
      return;
    }
    summaryList.innerHTML=allDates.map(date=>{
      const dateObj=new Date(date+'T00:00:00');
      const label=dateObj.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
      return items[date].map(item=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:var(--bg-elevated)">
          <span style="width:6px;height:6px;border-radius:50%;background:${item.color||'var(--accent)'};flex-shrink:0"></span>
          <span style="flex:1;font-size:.78rem;color:var(--text)">${item.text}</span>
          <span style="font-size:.68rem;color:var(--tertiary);white-space:nowrap">${label}</span>
        </div>
      `).join('');
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

  // Notes — save on blur
  if(notesEl){
    notesEl.innerHTML=getNotes();
    notesEl.addEventListener('blur',()=>{
      if(state&&typeof state==='object'){
        state.calendarNotes=notesEl.innerHTML;
        saveState();
      }
    });
  }

  // Toggle show/hide — button is OUTSIDE the calendar
  if(toggleBtn){
    toggleBtn.addEventListener('click',()=>{
      const showing=calEl.style.display!=='none';
      calEl.style.display=showing?'none':'flex';
      toggleBtn.textContent=showing?'Show Calendar':'Hide Calendar';
      // When showing, position toggle inside top-right of calendar
      if(!showing){
        toggleBtn.style.right='24px';
        toggleBtn.style.top='56px';
      }
    });
  }

  // Show calendar when a plan is opened
  window._showCalendar=function(){
    if(calEl)calEl.style.display='flex';
    if(toggleBtn){toggleBtn.style.display='';toggleBtn.textContent='Hide Calendar'}
    render();
    if(notesEl)notesEl.innerHTML=getNotes();
  };
  window._hideCalendar=function(){
    if(calEl)calEl.style.display='none';
    if(toggleBtn)toggleBtn.style.display='none';
  };

  // Don't render on load — wait for plan open
})();
