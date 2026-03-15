// ── Universal Sticky Notes ──

export function initStickyNotes(){
  const btn=document.getElementById('stickyNoteBtn');
  const panel=document.getElementById('stickyNotePanel');
  const body=document.getElementById('stickyNoteBody');
  const title=document.getElementById('snTitle');
  const STORE_KEY='compPlanStickyNote';

  function saveNote(){localStorage.setItem(STORE_KEY,body.innerHTML);}
  function loadNote(){body.innerHTML=localStorage.getItem(STORE_KEY)||'';title.textContent='Notes';}

  // Load single notepad on init
  setTimeout(()=>loadNote(),100);

  btn.addEventListener('click',()=>{
    const opening=!panel.classList.contains('open');
    panel.classList.toggle('open');
    if(opening){body.focus();}
  });

  document.getElementById('snMinimize').addEventListener('click',()=>{
    saveNote();
    panel.classList.remove('open');
  });
  document.getElementById('snDelete').addEventListener('click',()=>{
    if(!confirm('Delete all notes?'))return;
    body.innerHTML='';
    localStorage.removeItem(STORE_KEY);
    panel.classList.remove('open');
  });

  // Toolbar commands
  panel.querySelectorAll('.sn-toolbar button[data-cmd]').forEach(b=>{
    b.addEventListener('click',e=>{
      e.preventDefault();
      document.execCommand(b.dataset.cmd,false,null);
      body.focus();saveNote();
    });
  });
  panel.querySelectorAll('.sn-toolbar select[data-cmd]').forEach(sel=>{
    sel.addEventListener('change',()=>{
      const cmd=sel.dataset.cmd;
      const val=sel.value;
      if(cmd==='formatBlock'&&val)document.execCommand(cmd,false,'<'+val+'>');
      else if(cmd==='fontSize')document.execCommand(cmd,false,val);
      else if(cmd==='fontName'&&val)document.execCommand(cmd,false,val);
      else if(cmd==='fontName'&&!val)document.execCommand('removeFormat',false,null);
      body.focus();saveNote();
    });
  });

  // Color swatches — adapt to color scheme
  function getSnColors(){
    const isDark=document.documentElement.classList.contains('dark');
    return isDark?TAG_COLORS_DARK.slice(0,8):TAG_COLORS_LIGHT.slice(0,8);
  }
  function getSnHighlights(){
    const isDark=document.documentElement.classList.contains('dark');
    const src=isDark?TAG_COLORS_DARK:TAG_COLORS_LIGHT;
    return src.slice(1,7).map(c=>hexToRgba(c,0.22));
  }
  function renderSnColorSwatches(){
    const textGroup=document.getElementById('snTextColors');
    const hlGroup=document.getElementById('snHighlightColors');
    // Keep the label spans
    const tLabel=textGroup.querySelector('span');
    const hLabel=hlGroup.querySelector('span');
    textGroup.innerHTML='';hlGroup.innerHTML='';
    textGroup.appendChild(tLabel);hlGroup.appendChild(hLabel);
    // Text colors: reset (black/white) + scheme colors
    const isDark=document.documentElement.classList.contains('dark');
    const resetColor=isDark?'#ffffff':'#333333';
    const resetSwatch=document.createElement('span');
    resetSwatch.className='sn-color-swatch';
    resetSwatch.style.background=resetColor;
    resetSwatch.title='Default';
    resetSwatch.addEventListener('click',()=>{document.execCommand('foreColor',false,resetColor);body.focus();saveNote()});
    textGroup.appendChild(resetSwatch);
    getSnColors().forEach(c=>{
      const s=document.createElement('span');
      s.className='sn-color-swatch';s.style.background=c;s.title=c;
      s.addEventListener('click',()=>{document.execCommand('foreColor',false,c);body.focus();saveNote()});
      textGroup.appendChild(s);
    });
    // Highlight colors: clear + scheme tints
    const clearSwatch=document.createElement('span');
    clearSwatch.className='sn-color-swatch';
    clearSwatch.style.background='transparent';clearSwatch.style.border='1px dashed var(--border)';
    clearSwatch.title='Clear highlight';
    clearSwatch.addEventListener('click',()=>{document.execCommand('hiliteColor',false,'transparent');body.focus();saveNote()});
    hlGroup.appendChild(clearSwatch);
    getSnHighlights().forEach((c,i)=>{
      const s=document.createElement('span');
      s.className='sn-color-swatch';s.style.background=c;s.title='Highlight';
      s.addEventListener('click',()=>{document.execCommand('hiliteColor',false,c);body.focus();saveNote()});
      hlGroup.appendChild(s);
    });
  }
  renderSnColorSwatches();
  // Re-render swatches when color scheme changes
  if(typeof colorSchemeCallbacks!=='undefined')colorSchemeCallbacks.push(renderSnColorSwatches);

  body.addEventListener('input',saveNote);
  body.addEventListener('blur',saveNote);
}
