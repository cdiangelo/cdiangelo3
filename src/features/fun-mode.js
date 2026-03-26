// ── Fun Mode — Scenic Video PiP ──

export function initFunMode(){try{
  const DEFAULT_VIDEOS=[
    {id:'29XymHesxa0',label:'Scene 1'},
    {id:'cAbJtTxU56E',label:'Scene 2'},
    {id:'urVW36rIHYM',label:'Scene 3'},
    {id:'0xhzwDXfLds',label:'Scene 4'},
    {id:'vGMJZSfVW1M',label:'Scene 5'}
  ];
  let FUN_VIDEOS=JSON.parse(localStorage.getItem('funVideos')||'null')||JSON.parse(JSON.stringify(DEFAULT_VIDEOS));
  function saveFunVideos(){localStorage.setItem('funVideos',JSON.stringify(FUN_VIDEOS))}

  const AD_WAIT_MS=5000; // ms to show thumbnail overlay before allowing skip
  let funState=-1; // -1=off, 0..N-1=video index
  let funWrap=null;
  let isFullscreen=false;
  let savedOpacity=parseFloat(localStorage.getItem('funOpacity'))||1;
  let savedMuted=localStorage.getItem('funMuted')!=='false';
  let savedVolume=parseInt(localStorage.getItem('funVolume'),10);if(isNaN(savedVolume))savedVolume=50;
  let adTimer=null;
  let funPlayer=null;

  const isDark=()=>document.documentElement.classList.contains('dark');
  const dimC=()=>isDark()?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.10)';
  const hovC=()=>isDark()?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.25)';
  const bgC=()=>isDark()?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)';

  // Fun button
  const btn=document.createElement('button');
  btn.innerHTML='&#9654;';
  btn.title='Media';
  btn.style.cssText=`position:fixed;bottom:8px;right:8px;z-index:9999;background:${bgC()};border:1px solid ${dimC()};color:${dimC()};font-size:.6rem;padding:3px 6px;border-radius:4px;cursor:pointer;font-family:inherit;transition:color .3s,background .3s,border-color .3s,opacity .3s;-webkit-tap-highlight-color:transparent;width:24px;text-align:center;opacity:.35`;
  btn.addEventListener('mouseenter',()=>{btn.style.opacity='0.7';btn.style.color=hovC();btn.style.borderColor=hovC()});
  btn.addEventListener('mouseleave',()=>{if(funState<0){btn.style.opacity='0.35';btn.style.color=dimC();btn.style.borderColor=dimC()}});
  new MutationObserver(()=>{btn.style.background=bgC();btn.style.borderColor=dimC();if(funState<0){btn.style.color=dimC();btn.style.opacity='0.35'}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.body.appendChild(btn);

  // Editor button (gear icon above fun button)
  const editBtn=document.createElement('button');
  editBtn.innerHTML='&#9881;';
  editBtn.style.cssText=`position:fixed;bottom:28px;right:8px;z-index:9999;background:${bgC()};border:1px solid ${dimC()};color:${dimC()};font-size:.65rem;padding:2px 6px;border-radius:4px;cursor:pointer;font-family:inherit;transition:color .3s,background .3s,border-color .3s,opacity .3s;-webkit-tap-highlight-color:transparent;width:24px;text-align:center;opacity:.35`;
  editBtn.addEventListener('mouseenter',()=>{editBtn.style.opacity='0.7';editBtn.style.color=hovC();editBtn.style.borderColor=hovC()});
  editBtn.addEventListener('mouseleave',()=>{editBtn.style.opacity='0.35';editBtn.style.color=dimC();editBtn.style.borderColor=dimC()});
  new MutationObserver(()=>{editBtn.style.background=bgC();editBtn.style.color=dimC()}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.body.appendChild(editBtn);

  let editorPanel=null;

  function parseYoutubeId(input){
    input=input.trim();
    // Plain 11-char ID
    if(/^[A-Za-z0-9_-]{11}$/.test(input))return input;
    // URL patterns
    const m=input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m?m[1]:null;
  }

  function renderEditor(){
    if(editorPanel){editorPanel.remove();editorPanel=null;return;}
    editorPanel=document.createElement('div');
    editorPanel.style.cssText=`position:fixed;bottom:48px;right:8px;z-index:10000;background:${isDark()?'#1e1e2e':'#fff'};border:1px solid ${isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)'};border-radius:8px;padding:10px;width:260px;max-height:420px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,.25);font-size:.75rem;font-family:inherit`;

    // Title bar
    const titleBar=document.createElement('div');
    titleBar.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
    const title=document.createElement('span');
    title.textContent='Videos';
    title.style.cssText=`font-weight:600;color:${isDark()?'#cdd6f4':'#333'};font-size:.8rem`;
    const closeBtn=document.createElement('button');
    closeBtn.textContent='\u00d7';
    closeBtn.style.cssText=`background:none;border:none;color:${isDark()?'#cdd6f4':'#666'};font-size:1rem;cursor:pointer;padding:0 4px`;
    closeBtn.addEventListener('click',()=>{editorPanel.remove();editorPanel=null;});
    titleBar.appendChild(title);titleBar.appendChild(closeBtn);
    editorPanel.appendChild(titleBar);

    // Video list
    const list=document.createElement('div');
    list.style.cssText='display:flex;flex-direction:column;gap:4px;margin-bottom:8px';

    function buildRows(){
      list.innerHTML='';
      FUN_VIDEOS.forEach((v,i)=>{
        const row=document.createElement('div');
        row.dataset.idx=i;
        row.style.cssText=`display:flex;align-items:center;gap:6px;padding:4px;border-radius:4px;background:${isDark()?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)'};cursor:grab`;
        // Drag handle
        const handle=document.createElement('span');
        handle.textContent='\u2630';
        handle.style.cssText=`cursor:grab;color:${isDark()?'rgba(255,255,255,.3)':'rgba(0,0,0,.3)'};font-size:.7rem;flex-shrink:0`;
        // Thumbnail
        const thumb=document.createElement('img');
        thumb.src=`https://img.youtube.com/vi/${v.id}/default.jpg`;
        thumb.style.cssText='width:48px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0';
        // Label
        const lbl=document.createElement('span');
        lbl.textContent=v.label||v.id;
        lbl.style.cssText=`flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${isDark()?'#cdd6f4':'#333'};font-size:.7rem`;
        // Delete button
        const del=document.createElement('button');
        del.textContent='\u00d7';
        del.style.cssText=`background:none;border:none;color:${isDark()?'rgba(255,255,255,.4)':'rgba(0,0,0,.35)'};font-size:.85rem;cursor:pointer;padding:0 2px;flex-shrink:0`;
        del.addEventListener('click',()=>{
          FUN_VIDEOS.splice(i,1);saveFunVideos();
          if(funState>=FUN_VIDEOS.length)funState=FUN_VIDEOS.length-1;
          buildRows();
        });

        row.appendChild(handle);row.appendChild(thumb);row.appendChild(lbl);row.appendChild(del);

        // Drag-to-reorder
        let dragIdx=i;
        handle.addEventListener('mousedown',e=>{
          e.preventDefault();
          row.style.opacity='.5';
          document.body.style.cursor='grabbing';
          function onMove(ev){
            ev.preventDefault();
            const rows=Array.from(list.children);
            const curRow=rows[dragIdx];
            if(!curRow)return;
            const mouseY=ev.clientY;
            if(dragIdx>0){
              const prev=rows[dragIdx-1];
              const pr=prev.getBoundingClientRect();
              if(mouseY<pr.top+pr.height/2){
                [FUN_VIDEOS[dragIdx-1],FUN_VIDEOS[dragIdx]]=[FUN_VIDEOS[dragIdx],FUN_VIDEOS[dragIdx-1]];
                list.insertBefore(curRow,prev);
                curRow.dataset.idx=dragIdx-1;prev.dataset.idx=dragIdx;
                dragIdx--;saveFunVideos();return;
              }
            }
            if(dragIdx<rows.length-1){
              const next=rows[dragIdx+1];
              const nr=next.getBoundingClientRect();
              if(mouseY>nr.top+nr.height/2){
                [FUN_VIDEOS[dragIdx],FUN_VIDEOS[dragIdx+1]]=[FUN_VIDEOS[dragIdx+1],FUN_VIDEOS[dragIdx]];
                list.insertBefore(next,curRow);
                curRow.dataset.idx=dragIdx+1;next.dataset.idx=dragIdx;
                dragIdx++;saveFunVideos();return;
              }
            }
          }
          function onUp(){
            document.removeEventListener('mousemove',onMove);
            document.removeEventListener('mouseup',onUp);
            document.body.style.cursor='';
            row.style.opacity='1';
            buildRows();
          }
          document.addEventListener('mousemove',onMove);
          document.addEventListener('mouseup',onUp);
        });

        list.appendChild(row);
      });
    }
    buildRows();
    editorPanel.appendChild(list);

    // Add input
    const addRow=document.createElement('div');
    addRow.style.cssText='display:flex;gap:4px';
    const inp=document.createElement('input');
    inp.placeholder='YouTube URL or ID';
    inp.style.cssText=`flex:1;padding:4px 6px;border:1px solid ${isDark()?'rgba(255,255,255,.15)':'rgba(0,0,0,.15)'};border-radius:4px;background:${isDark()?'rgba(255,255,255,.06)':'#fff'};color:${isDark()?'#cdd6f4':'#333'};font-size:.7rem;font-family:inherit`;
    const addBtn=document.createElement('button');
    addBtn.textContent='+';
    addBtn.style.cssText=`padding:4px 8px;border:none;border-radius:4px;background:rgba(59,130,246,.6);color:#fff;cursor:pointer;font-size:.75rem;font-weight:600`;
    addBtn.addEventListener('click',()=>{
      const vid=parseYoutubeId(inp.value);
      if(!vid){inp.style.borderColor='red';return;}
      FUN_VIDEOS.push({id:vid,label:'Video '+(FUN_VIDEOS.length+1)});
      saveFunVideos();inp.value='';inp.style.borderColor='';
      buildRows();
    });
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')addBtn.click()});
    addRow.appendChild(inp);addRow.appendChild(addBtn);
    editorPanel.appendChild(addRow);

    // Volume controls
    const volSection=document.createElement('div');
    volSection.style.cssText=`margin-top:8px;padding:8px;border-radius:4px;background:${isDark()?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)'};display:flex;align-items:center;gap:8px`;
    const muteBtn=document.createElement('button');
    function updateMuteIcon(){muteBtn.innerHTML=savedMuted?'&#128263;':'&#128266;';muteBtn.title=savedMuted?'Unmute':'Mute'}
    updateMuteIcon();
    muteBtn.style.cssText=`background:none;border:none;font-size:1rem;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1`;
    muteBtn.addEventListener('click',()=>{
      savedMuted=!savedMuted;localStorage.setItem('funMuted',savedMuted);
      updateMuteIcon();applyVolumeToPlayer();
      volSlider.style.opacity=savedMuted?'.35':'1';
    });
    const volLabel=document.createElement('span');
    volLabel.textContent='Vol';
    volLabel.style.cssText=`font-size:.65rem;color:${isDark()?'rgba(255,255,255,.4)':'rgba(0,0,0,.35)'};flex-shrink:0`;
    const volSlider=document.createElement('input');
    volSlider.type='range';volSlider.min='0';volSlider.max='100';volSlider.step='1';volSlider.value=savedVolume;
    volSlider.style.cssText=`flex:1;height:3px;cursor:pointer;accent-color:${isDark()?'#89b4fa':'#3b82f6'};opacity:${savedMuted?'.35':'1'}`;
    volSlider.addEventListener('input',()=>{
      savedVolume=parseInt(volSlider.value,10);localStorage.setItem('funVolume',savedVolume);
      if(savedMuted){savedMuted=false;localStorage.setItem('funMuted',false);updateMuteIcon();volSlider.style.opacity='1'}
      applyVolumeToPlayer();
    });
    const volVal=document.createElement('span');
    volVal.textContent=savedVolume+'%';
    volVal.style.cssText=`font-size:.6rem;color:${isDark()?'rgba(255,255,255,.35)':'rgba(0,0,0,.3)'};min-width:24px;text-align:right;flex-shrink:0`;
    volSlider.addEventListener('input',()=>{volVal.textContent=volSlider.value+'%'});
    volSection.appendChild(muteBtn);volSection.appendChild(volLabel);volSection.appendChild(volSlider);volSection.appendChild(volVal);
    editorPanel.appendChild(volSection);

    // Reset button
    const resetBtn=document.createElement('button');
    resetBtn.textContent='Reset to defaults';
    resetBtn.style.cssText=`margin-top:8px;width:100%;padding:4px;border:1px solid ${isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};border-radius:4px;background:none;color:${isDark()?'rgba(255,255,255,.4)':'rgba(0,0,0,.35)'};cursor:pointer;font-size:.65rem;font-family:inherit`;
    resetBtn.addEventListener('click',()=>{
      FUN_VIDEOS.length=0;DEFAULT_VIDEOS.forEach(v=>FUN_VIDEOS.push(JSON.parse(JSON.stringify(v))));
      saveFunVideos();funState=-1;buildRows();
    });
    editorPanel.appendChild(resetBtn);

    document.body.appendChild(editorPanel);
  }

  editBtn.addEventListener('click',renderEditor);

  function buildIframeSrc(v){
    const s=v.start||0;
    const m=savedMuted?1:0;
    return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=${m}&loop=1&playlist=${v.id}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&start=${s}&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  }
  function sendYtCmd(iframe,func,args){
    try{iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:func,args:args||[]}),'*')}catch(e){}
  }
  function applyVolumeToPlayer(){
    const iframe=document.getElementById('funVideoFrame');
    if(!iframe)return;
    if(savedMuted){sendYtCmd(iframe,'mute')}else{sendYtCmd(iframe,'unMute');sendYtCmd(iframe,'setVolume',[savedVolume])}
  }

  function showVideo(idx){
    const v=FUN_VIDEOS[idx];
    // Remove old
    if(adTimer){clearTimeout(adTimer);adTimer=null;}
    if(funWrap){funWrap.remove();funWrap=null;}
    isFullscreen=false;

    funWrap=document.createElement('div');
    funWrap.id='funVideoWrap';
    applyPipStyle(funWrap);

    // Iframe
    const iframe=document.createElement('iframe');
    iframe.id='funVideoFrame';
    iframe.src=buildIframeSrc(v);
    iframe.style.cssText='width:100%;height:100%;border:none;pointer-events:auto;opacity:'+savedOpacity;
    iframe.allow='autoplay; encrypted-media';
    iframe.loading='lazy';
    // Apply volume once YouTube player is ready
    iframe.addEventListener('load',()=>{setTimeout(()=>applyVolumeToPlayer(),1500)});
    funWrap.appendChild(iframe);

    // Controls bar
    const controls=document.createElement('div');
    controls.style.cssText='position:absolute;top:6px;right:6px;display:flex;gap:6px;align-items:center;pointer-events:auto;z-index:2;opacity:.5;transition:opacity .2s';
    controls.addEventListener('mouseenter',()=>controls.style.opacity='1');
    controls.addEventListener('mouseleave',()=>controls.style.opacity='.5');

    // Opacity slider
    const slider=document.createElement('input');
    slider.type='range';slider.min='0.05';slider.max='1';slider.step='0.01';slider.value=savedOpacity;
    slider.style.cssText='width:80px;height:3px;cursor:pointer;accent-color:#fff';
    slider.addEventListener('input',()=>{
      savedOpacity=parseFloat(slider.value);
      iframe.style.opacity=savedOpacity;
      localStorage.setItem('funOpacity',savedOpacity);
    });
    controls.appendChild(slider);

    // Fullscreen toggle
    const fsBtn=document.createElement('button');
    fsBtn.innerHTML='&#x26F6;';
    fsBtn.title='Toggle fullscreen';
    fsBtn.style.cssText='background:rgba(0,0,0,.4);color:#fff;border:none;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center';
    fsBtn.addEventListener('click',toggleFullscreen);
    controls.appendChild(fsBtn);

    funWrap.appendChild(controls);

    // Label
    const lbl=document.createElement('div');
    lbl.textContent=v.label;
    lbl.style.cssText='position:absolute;bottom:6px;left:8px;font-size:.6rem;color:rgba(255,255,255,.7);text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;z-index:2;letter-spacing:.3px';
    funWrap.appendChild(lbl);

    // Thumbnail overlay to hide pre-roll ads
    const overlay=document.createElement('img');
    overlay.src=`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`;
    overlay.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;transition:opacity 1.5s ease;cursor:pointer;border-radius:12px;pointer-events:auto';
    const skipHint=document.createElement('div');
    skipHint.textContent='click to skip';
    skipHint.style.cssText='position:absolute;bottom:8px;right:8px;font-size:.55rem;color:rgba(255,255,255,.6);text-shadow:0 1px 3px rgba(0,0,0,.5);z-index:2;pointer-events:none;letter-spacing:.3px;transition:opacity 1.5s ease';
    funWrap.appendChild(overlay);
    funWrap.appendChild(skipHint);

    function dismissOverlay(){
      if(adTimer){clearTimeout(adTimer);adTimer=null;}
      overlay.style.opacity='0';
      skipHint.style.opacity='0';
      setTimeout(()=>{overlay.remove();skipHint.remove();},1500);
    }
    overlay.addEventListener('click',dismissOverlay);
    adTimer=setTimeout(dismissOverlay,AD_WAIT_MS);

    document.body.appendChild(funWrap);
  }

  function applyPipStyle(el){
    el.style.cssText='position:fixed;bottom:12px;left:12px;width:25vw;min-width:280px;aspect-ratio:16/9;z-index:9998;pointer-events:none;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:all .3s ease';
  }

  function applyFullscreenStyle(el){
    el.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;overflow:hidden;border-radius:0;box-shadow:none;transition:all .3s ease';
    // Oversize iframe to avoid black bars
    const iframe=el.querySelector('iframe');
    if(iframe){iframe.style.cssText='position:absolute;top:50%;left:50%;width:120vw;height:120vh;transform:translate(-50%,-50%);border:none;opacity:'+savedOpacity;}
  }

  function toggleFullscreen(){
    if(!funWrap)return;
    isFullscreen=!isFullscreen;
    if(isFullscreen){
      applyFullscreenStyle(funWrap);
    } else {
      applyPipStyle(funWrap);
      const iframe=funWrap.querySelector('iframe');
      if(iframe)iframe.style.cssText='width:100%;height:100%;border:none;opacity:'+savedOpacity;
    }
  }

  // Escape key exits fullscreen
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&isFullscreen&&funWrap){
      isFullscreen=false;
      applyPipStyle(funWrap);
      const iframe=funWrap.querySelector('iframe');
      if(iframe)iframe.style.cssText='width:100%;height:100%;border:none;opacity:'+savedOpacity;
    }
  });

  function funOff(){
    funState=-1;
    if(adTimer){clearTimeout(adTimer);adTimer=null;}
    if(funWrap){funWrap.remove();funWrap=null;}
    isFullscreen=false;
    btn.dataset.on='';
    btn.style.color=dimC();
  }

  // Left click: turn on / rotate to next video
  btn.addEventListener('click',()=>{
    funState++;
    if(funState>=FUN_VIDEOS.length) funState=0;
    showVideo(funState);
    btn.dataset.on='1';
    btn.style.color='rgba(59,130,246,0.5)';
  });

  // Right click: turn off
  btn.addEventListener('contextmenu',(e)=>{
    e.preventDefault();
    if(funState>=0) funOff();
  });
}catch(e){console.warn('Fun mode error:',e)}}
initFunMode();
