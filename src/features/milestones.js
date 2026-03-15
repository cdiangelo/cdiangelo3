/* ── Milestones Feature ── */

export function initMilestones(){
  const KEY='milestones_data';
  let milestones=[];
  let editIndex=-1;
  let tooltipTimer=null;
  let activeTooltip=null;

  function load(){
    try{const d=localStorage.getItem(KEY);if(d)milestones=JSON.parse(d);}catch(e){milestones=[];}
    if(!milestones.length){
      milestones=[
        {goal:'',date:'',done:false},
        {goal:'',date:'',done:false},
        {goal:'',date:'',done:false}
      ];
      save();
    }
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(milestones));}

  function daysRemaining(dateStr){
    if(!dateStr)return null;
    const target=new Date(dateStr+'T00:00:00');
    const now=new Date();
    now.setHours(0,0,0,0);
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
    const goalText=ms.goal||'(No goal set — click to edit)';
    let html='<div class="ms-tt-goal">'+goalText.replace(/</g,'&lt;')+'</div>';
    html+='<div class="ms-tt-date">'+formatDate(ms.date)+'</div>';
    if(ms.done){
      html+='<div class="ms-tt-done">Completed</div>';
    }else if(ms.date){
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
    bubble.style.position='relative';
    bubble.appendChild(tip);
    requestAnimationFrame(()=>{
      const rect=tip.getBoundingClientRect();
      if(rect.top<0){
        tip.classList.add('below');
      }
      if(rect.left<0){
        tip.style.left='0';tip.style.transform='translateX(0)';
      }else if(rect.right>window.innerWidth){
        tip.style.left='auto';tip.style.right='0';tip.style.transform='translateX(0)';
      }
      tip.classList.add('visible');
    });
    activeTooltip=tip;
  }

  function makeCheckSvg(){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','ms-check');
    svg.setAttribute('viewBox','0 0 16 16');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M3.5 8.5 L6.5 11.5 L12.5 4.5');
    svg.appendChild(path);
    return svg;
  }

  function render(){
    const container=document.getElementById('milestonesBubbles');
    if(!container)return;
    container.innerHTML='';

    milestones.forEach((ms,i)=>{
      const b=document.createElement('div');
      b.className='ms-bubble'+(ms.done?' done':'');
      b.appendChild(makeCheckSvg());

      // Hover tooltip
      b.addEventListener('mouseenter',()=>{
        tooltipTimer=setTimeout(()=>showTooltip(b,ms),250);
      });
      b.addEventListener('mouseleave',()=>{removeTooltip();});

      // Click to toggle done
      b.addEventListener('click',(e)=>{
        e.stopPropagation();
        removeTooltip();
        ms.done=!ms.done;
        save();
        render();
      });

      // Right-click to edit
      b.addEventListener('contextmenu',(e)=>{
        e.preventDefault();
        e.stopPropagation();
        removeTooltip();
        openModal(i);
      });

      // Double-click to edit
      b.addEventListener('dblclick',(e)=>{
        e.stopPropagation();
        removeTooltip();
        openModal(i);
      });

      container.appendChild(b);
    });

    // Add button (always present but only visible on hover via CSS)
    const addBtn=document.createElement('div');
    addBtn.className='ms-bubble-add';
    addBtn.textContent='+';
    addBtn.title='Add milestone';
    addBtn.addEventListener('click',(e)=>{
      e.stopPropagation();
      milestones.push({goal:'',date:'',done:false});
      save();
      render();
      openModal(milestones.length-1);
    });
    container.appendChild(addBtn);
  }

  function openModal(index){
    editIndex=index;
    const overlay=document.getElementById('msModalOverlay');
    const titleEl=document.getElementById('msModalTitle');
    const goalInput=document.getElementById('msGoalInput');
    const dateInput=document.getElementById('msDateInput');
    const delBtn=document.getElementById('msDeleteBtn');

    const ms=milestones[index];
    if(ms.goal||ms.date){
      titleEl.textContent='Edit Milestone';
      delBtn.style.display='inline-block';
    }else{
      titleEl.textContent='Add Milestone';
      delBtn.style.display=milestones.length>1?'inline-block':'none';
    }
    goalInput.value=ms.goal||'';
    dateInput.value=ms.date||'';
    overlay.classList.add('show');
    setTimeout(()=>goalInput.focus(),100);
  }

  function closeModal(){
    document.getElementById('msModalOverlay').classList.remove('show');
    editIndex=-1;
  }

  // Modal events
  document.getElementById('msCancelBtn').addEventListener('click',closeModal);
  document.getElementById('msModalOverlay').addEventListener('click',(e)=>{
    if(e.target===e.currentTarget)closeModal();
  });

  document.getElementById('msSaveBtn').addEventListener('click',()=>{
    if(editIndex<0||editIndex>=milestones.length)return;
    milestones[editIndex].goal=document.getElementById('msGoalInput').value.trim();
    milestones[editIndex].date=document.getElementById('msDateInput').value;
    save();
    closeModal();
    render();
  });

  document.getElementById('msDeleteBtn').addEventListener('click',()=>{
    if(editIndex<0||editIndex>=milestones.length)return;
    if(milestones.length<=1)return;
    milestones.splice(editIndex,1);
    save();
    closeModal();
    render();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&document.getElementById('msModalOverlay').classList.contains('show')){
      closeModal();
    }
  });

  // Init
  load();
  render();
}
