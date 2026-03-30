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
