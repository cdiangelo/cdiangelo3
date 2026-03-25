/* ── Milestones Feature ── */
// Up to 3 rows of milestones/goals with text labels.
// Each bubble cycles through 4 states on click:
//   blank -> not-started (red) -> partial (yellow) -> complete (green) -> blank

const STATUS_CYCLE=['blank','not-started','partial','complete'];

export function initMilestones(){
  const KEY='milestones_data_v2';
  let rows=[];
  let editIndex=null; // {row,col}
  let tooltipTimer=null;
  let activeTooltip=null;

  function load(){
    try{const d=localStorage.getItem(KEY);if(d)rows=JSON.parse(d);}catch(e){rows=[];}
    // Migrate from v1 if needed
    if(!rows.length){
      try{
        const old=localStorage.getItem('milestones_data');
        if(old){
          const oldMs=JSON.parse(old);
          if(Array.isArray(oldMs)&&oldMs.length){
            rows=[{label:'Goals',items:oldMs.map(m=>({goal:m.goal||'',date:m.date||'',status:m.done?'complete':'blank'}))}];
          }
        }
      }catch(e){}
    }
    if(!rows.length){
      rows=[{label:'Goals',items:[
        {goal:'',date:'',status:'blank'},
        {goal:'',date:'',status:'blank'},
        {goal:'',date:'',status:'blank'}
      ]}];
      save();
    }
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(rows));}

  function daysRemaining(dateStr){
    if(!dateStr)return null;
    const target=new Date(dateStr+'T00:00:00');
    const now=new Date();now.setHours(0,0,0,0);
    return Math.ceil((target-now)/(1000*60*60*24));
  }

  function formatDate(dateStr){
    if(!dateStr)return 'No date set';
    const d=new Date(dateStr+'T00:00:00');
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  function removeTooltip(){
    if(activeTooltip){activeTooltip.remove();activeTooltip=null;}
    if(tooltipTimer){clearTimeout(tooltipTimer);tooltipTimer=null;}
  }

  function showTooltip(bubble,ms){
    removeTooltip();
    const tip=document.createElement('div');
    tip.className='ms-tooltip';
    const goalText=ms.goal||'(No goal set \u2014 right-click to edit)';
    let html='<div class="ms-tt-goal">'+goalText.replace(/</g,'&lt;')+'</div>';
    html+='<div class="ms-tt-date">'+formatDate(ms.date)+'</div>';
    const statusLabels={blank:'Not set','not-started':'Not Started',partial:'In Progress',complete:'Complete'};
    html+='<div class="ms-tt-status status-'+ms.status+'">'+(statusLabels[ms.status]||'Not set')+'</div>';
    if(ms.date&&ms.status!=='complete'){
      const days=daysRemaining(ms.date);
      if(days<0){
        html+='<div class="ms-tt-days overdue">'+Math.abs(days)+' day'+(Math.abs(days)!==1?'s':'')+' overdue</div>';
      }else if(days===0){
        html+='<div class="ms-tt-days overdue">Due today</div>';
      }else{
        html+='<div class="ms-tt-days upcoming">'+days+' day'+(days!==1?'s':'')+' remaining</div>';
      }
    }
    tip.innerHTML=html;
    document.body.appendChild(tip);
    requestAnimationFrame(()=>{
      const br=bubble.getBoundingClientRect();
      const tw=tip.offsetWidth;
      let left=br.left+br.width/2-tw/2;
      if(left<4)left=4;
      if(left+tw>window.innerWidth-4)left=window.innerWidth-4-tw;
      tip.style.left=left+'px';
      tip.style.top=(br.bottom+8)+'px';
      tip.classList.add('visible');
    });
    activeTooltip=tip;
  }

  function getStatusClass(status){
    if(status==='not-started')return 'status-red';
    if(status==='partial')return 'status-yellow';
    if(status==='complete')return 'status-green';
    return '';
  }

  function makeIcon(status){
    if(status==='complete'){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','ms-icon');svg.setAttribute('viewBox','0 0 16 16');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M3.5 8.5 L6.5 11.5 L12.5 4.5');
      svg.appendChild(path);return svg;
    }
    if(status==='partial'){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','ms-icon');svg.setAttribute('viewBox','0 0 16 16');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M4 8 H12');
      svg.appendChild(path);return svg;
    }
    if(status==='not-started'){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','ms-icon');svg.setAttribute('viewBox','0 0 16 16');
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx','8');c.setAttribute('cy','8');c.setAttribute('r','3');c.setAttribute('fill','currentColor');
      svg.appendChild(c);return svg;
    }
    return null;
  }

  function render(){
    const container=document.getElementById('milestoneRows');
    if(!container)return;
    container.innerHTML='';

    rows.forEach((row,ri)=>{
      const rowEl=document.createElement('div');
      rowEl.className='ms-row';

      // Editable label
      const label=document.createElement('span');
      label.className='ms-row-label';
      label.textContent=row.label||'Row '+(ri+1);
      label.title='Click to rename';
      label.addEventListener('click',()=>{
        const val=prompt('Row label:',row.label||'');
        if(val!==null){row.label=val.trim()||'Row '+(ri+1);save();render();}
      });
      rowEl.appendChild(label);

      // Bubbles
      const bubblesWrap=document.createElement('div');
      bubblesWrap.className='ms-bubbles';

      row.items.forEach((ms,ci)=>{
        const b=document.createElement('div');
        b.className='ms-bubble '+getStatusClass(ms.status);
        const icon=makeIcon(ms.status);
        if(icon)b.appendChild(icon);

        // Hover tooltip
        b.addEventListener('mouseenter',()=>{tooltipTimer=setTimeout(()=>showTooltip(b,ms),250)});
        b.addEventListener('mouseleave',()=>removeTooltip());

        // Click to cycle status
        b.addEventListener('click',(e)=>{
          e.stopPropagation();removeTooltip();
          const idx=STATUS_CYCLE.indexOf(ms.status);
          ms.status=STATUS_CYCLE[(idx+1)%STATUS_CYCLE.length];
          save();render();
        });

        // Right-click to edit
        b.addEventListener('contextmenu',(e)=>{
          e.preventDefault();e.stopPropagation();removeTooltip();openModal(ri,ci);
        });
        // Double-click to edit
        b.addEventListener('dblclick',(e)=>{e.stopPropagation();removeTooltip();openModal(ri,ci)});

        bubblesWrap.appendChild(b);
      });

      // Add bubble button (inline, visible on hover)
      const addBubble=document.createElement('div');
      addBubble.className='ms-bubble-add';
      addBubble.textContent='+';
      addBubble.title='Add milestone to this row';
      addBubble.addEventListener('click',(e)=>{
        e.stopPropagation();
        row.items.push({goal:'',date:'',status:'blank'});
        save();render();openModal(ri,row.items.length-1);
      });
      bubblesWrap.appendChild(addBubble);
      rowEl.appendChild(bubblesWrap);

      // Delete row button (visible on hover)
      if(rows.length>1){
        const delRow=document.createElement('span');
        delRow.className='ms-row-delete';
        delRow.textContent='\u00d7';
        delRow.title='Remove this row';
        delRow.addEventListener('click',()=>{rows.splice(ri,1);save();render()});
        rowEl.appendChild(delRow);
      }

      container.appendChild(rowEl);
    });

    // Add row button (if < 3 rows)
    if(rows.length<3){
      const addRow=document.createElement('button');
      addRow.className='btn btn-sm ms-add-row';
      addRow.textContent='+ Add Row';
      addRow.addEventListener('click',()=>{
        rows.push({label:'Row '+(rows.length+1),items:[{goal:'',date:'',status:'blank'},{goal:'',date:'',status:'blank'},{goal:'',date:'',status:'blank'}]});
        save();render();
      });
      container.appendChild(addRow);
    }
  }

  function openModal(rowIdx,colIdx){
    editIndex={row:rowIdx,col:colIdx};
    const overlay=document.getElementById('msModalOverlay');
    const titleEl=document.getElementById('msModalTitle');
    const goalInput=document.getElementById('msGoalInput');
    const dateInput=document.getElementById('msDateInput');
    const delBtn=document.getElementById('msDeleteBtn');

    const ms=rows[rowIdx].items[colIdx];
    titleEl.textContent=(ms.goal||ms.date)?'Edit Milestone':'Add Milestone';
    delBtn.style.display=rows[rowIdx].items.length>1?'inline-block':'none';
    goalInput.value=ms.goal||'';
    dateInput.value=ms.date||'';
    overlay.classList.add('show');
    setTimeout(()=>goalInput.focus(),100);
  }

  function closeModal(){
    document.getElementById('msModalOverlay').classList.remove('show');
    editIndex=null;
  }

  // Modal events
  document.getElementById('msCancelBtn').addEventListener('click',closeModal);
  document.getElementById('msModalOverlay').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeModal()});

  document.getElementById('msSaveBtn').addEventListener('click',()=>{
    if(!editIndex)return;
    const ms=rows[editIndex.row].items[editIndex.col];
    ms.goal=document.getElementById('msGoalInput').value.trim();
    ms.date=document.getElementById('msDateInput').value;
    save();closeModal();render();
  });

  document.getElementById('msDeleteBtn').addEventListener('click',()=>{
    if(!editIndex)return;
    const row=rows[editIndex.row];
    if(row.items.length<=1)return;
    row.items.splice(editIndex.col,1);
    save();closeModal();render();
  });

  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&document.getElementById('msModalOverlay').classList.contains('show'))closeModal();
  });

  load();render();
}
initMilestones();
