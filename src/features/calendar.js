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
  const hideBtn=document.getElementById('calHideBtn');
  const calEl=document.getElementById('planCalendar');
  if(!grid||!label)return;

  let viewYear=new Date().getFullYear();
  let viewMonth=new Date().getMonth();
  let selectedDate=null;

  function getItems(){
    if(!state.calendarItems)state.calendarItems={};
    return state.calendarItems;
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

    // Previous month days
    for(let i=startDay-1;i>=0;i--){
      html+=`<div class="cal-day other-month">${daysInPrev-i}</div>`;
    }
    // Current month days
    for(let d=1;d<=daysInMonth;d++){
      const key=dateKey(viewYear,viewMonth,d);
      const isToday=d===now.getDate()&&viewMonth===now.getMonth()&&viewYear===now.getFullYear();
      const hasItems=items[key]&&items[key].length>0;
      const isSelected=selectedDate===key;
      let cls='cal-day';
      if(isToday)cls+=' today';
      if(hasItems)cls+=' has-items';
      if(isSelected)cls+=' selected';
      html+=`<div class="${cls}" data-date="${key}" data-day="${d}">${d}</div>`;
    }
    // Next month fill
    const totalCells=startDay+daysInMonth;
    const remaining=totalCells%7===0?0:7-(totalCells%7);
    for(let i=1;i<=remaining;i++){
      html+=`<div class="cal-day other-month">${i}</div>`;
    }
    grid.innerHTML=html;

    // Click handlers
    grid.querySelectorAll('.cal-day:not(.other-month)').forEach(el=>{
      el.addEventListener('click',()=>{
        selectedDate=el.dataset.date;
        render();
        renderItems();
      });
    });

    renderItems();
  }

  function renderItems(){
    if(!selectedDate){itemsEl.innerHTML='<div style="font-size:.72rem;color:var(--tertiary);padding:4px">Select a day to view milestones</div>';return}
    const items=getItems();
    const dayItems=items[selectedDate]||[];
    if(!dayItems.length){
      itemsEl.innerHTML='<div style="font-size:.72rem;color:var(--tertiary);padding:4px">No items for this day</div>';
      return;
    }
    itemsEl.innerHTML=dayItems.map((item,i)=>`
      <div class="cal-item">
        <span class="cal-dot" style="background:${item.color||'var(--accent)'}"></span>
        <span class="cal-item-text">${item.text}</span>
        <button class="cal-item-del" data-idx="${i}" title="Remove">×</button>
      </div>
    `).join('');
    itemsEl.querySelectorAll('.cal-item-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx=+btn.dataset.idx;
        dayItems.splice(idx,1);
        if(!dayItems.length)delete items[selectedDate];
        saveState();
        render();
      });
    });
  }

  prevBtn.addEventListener('click',()=>{viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--}render()});
  nextBtn.addEventListener('click',()=>{viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++}render()});

  addBtn.addEventListener('click',()=>{
    if(!selectedDate||!newInput.value.trim())return;
    const items=getItems();
    if(!items[selectedDate])items[selectedDate]=[];
    items[selectedDate].push({text:newInput.value.trim(),color:colorSel.value});
    newInput.value='';
    saveState();
    render();
  });
  newInput.addEventListener('keydown',e=>{if(e.key==='Enter')addBtn.click()});

  hideBtn.addEventListener('click',()=>{
    calEl.style.display=calEl.style.display==='none'?'':'none';
    hideBtn.textContent=calEl.style.display==='none'?'Show Calendar':'Hide Calendar';
  });

  render();
})();
