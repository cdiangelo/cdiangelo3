// ── Teams Quick-Join ──
export function initTeamsLinks(){
  const btn=document.getElementById('teamsBtn');
  const panel=document.getElementById('teamsPanel');
  const bodyEl=document.getElementById('teamsBody');
  const urlInput=document.getElementById('teamsLinkUrl');
  const nameInput=document.getElementById('teamsLinkName');
  const addBtn=document.getElementById('teamsAddBtn');
  const detectedEl=document.getElementById('teamsLinkDetected');
  const STORE_KEY='compPlanTeamsLinks';

  // Teams URL patterns
  const TEAMS_PATTERNS=[
    {re:/teams\.microsoft\.com\/l\/meetup-join\//i, type:'meeting', label:'Teams Meeting'},
    {re:/teams\.microsoft\.com\/meet\//i, type:'meeting', label:'Teams Meeting'},
    {re:/teams\.live\.com/i, type:'meeting', label:'Teams Meeting'},
    {re:/teams\.microsoft\.com\/l\/channel\//i, type:'channel', label:'Teams Channel'},
    {re:/teams\.microsoft\.com\/.*\/channel\//i, type:'channel', label:'Teams Channel'},
    {re:/teams\.microsoft\.com\/l\/chat\//i, type:'chat', label:'Teams Chat'},
    {re:/teams\.microsoft\.com\/l\/call\//i, type:'call', label:'Teams Call'},
    {re:/teams\.microsoft\.com/i, type:'general', label:'Teams Link'}
  ];

  function detectTeamsUrl(raw){
    const s=raw.trim();
    if(!s)return null;
    // Try to normalise — add https if missing
    let url=s;
    if(!/^https?:\/\//i.test(url)&&/teams/i.test(url))url='https://'+url;
    for(const p of TEAMS_PATTERNS){
      if(p.re.test(url))return{url,type:p.type,label:p.label};
    }
    return null;
  }

  function autoName(det){
    // Try to extract a readable name from the URL
    try{
      const u=new URL(det.url);
      const ctx=u.searchParams.get('context');
      if(ctx){const j=JSON.parse(decodeURIComponent(ctx));if(j.Tid)return det.label;}
      // Channel name from path
      const chMatch=det.url.match(/\/channel\/[^/]+\/([^?/]+)/);
      if(chMatch)return decodeURIComponent(chMatch[1]).replace(/\+/g,' ');
    }catch(e){/* ignore */}
    return det.label;
  }

  let currentDetection=null;

  function validateUrl(){
    const raw=urlInput.value;
    const det=detectTeamsUrl(raw);
    currentDetection=det;
    urlInput.classList.remove('tp-url-valid','tp-url-invalid');
    if(!raw.trim()){
      detectedEl.style.display='none';
      addBtn.disabled=true;addBtn.style.opacity='.5';
      addBtn.textContent='Paste a Teams link above';
      return;
    }
    if(det){
      urlInput.classList.add('tp-url-valid');
      detectedEl.style.display='block';
      detectedEl.innerHTML='\u2705 Detected: <strong>'+det.label+'</strong>';
      if(!nameInput.value.trim()){nameInput.placeholder=autoName(det)+' (auto)';}
      addBtn.disabled=false;addBtn.style.opacity='1';
      addBtn.textContent='Add '+det.label;
    }else{
      urlInput.classList.add('tp-url-invalid');
      detectedEl.style.display='block';
      detectedEl.innerHTML='\u26A0 Not recognized as a Teams link';
      addBtn.disabled=true;addBtn.style.opacity='.5';
      addBtn.textContent='Paste a Teams link above';
    }
  }

  urlInput.addEventListener('input',validateUrl);
  urlInput.addEventListener('paste',()=>setTimeout(validateUrl,0));

  function loadLinks(){return JSON.parse(localStorage.getItem(STORE_KEY)||'[]');}
  function saveLinks(links){localStorage.setItem(STORE_KEY,JSON.stringify(links));}

  function renderLinks(){
    const links=loadLinks();
    if(!links.length){
      bodyEl.innerHTML='<div class="teams-empty">No Teams links yet.<br>Paste a Teams meeting or channel link below to save it for quick-join.</div>';
      return;
    }
    bodyEl.innerHTML='';
    links.forEach((lnk,i)=>{
      const item=document.createElement('div');
      item.className='teams-link-item';
      const iconChar=lnk.type==='channel'?'#':lnk.type==='chat'?'\u{1F4AC}':'\u{1F4F9}';
      const typeLabel=lnk.type==='channel'?'Channel':lnk.type==='chat'?'Chat':'Meeting / Call';
      item.innerHTML='<div class="tl-icon">'+iconChar+'</div>'
        +'<div class="tl-info"><div class="tl-name">'+escHtml(lnk.name)+'</div>'
        +'<div class="tl-desc">'+typeLabel+'</div></div>'
        +'<button class="tl-join">Join</button>'
        +'<button class="tl-remove" title="Remove">&times;</button>';
      item.querySelector('.tl-join').addEventListener('click',()=>{
        window.open(lnk.url,'_teams_popup','width=520,height=720,menubar=no,toolbar=no,location=no,status=no');
      });
      item.querySelector('.tl-remove').addEventListener('click',(e)=>{
        e.stopPropagation();
        const all=loadLinks();all.splice(i,1);saveLinks(all);renderLinks();
      });
      bodyEl.appendChild(item);
    });
  }

  function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  btn.addEventListener('click',()=>{
    const opening=!panel.classList.contains('open');
    panel.classList.toggle('open');
    if(opening)renderLinks();
  });

  document.getElementById('teamsMinimize').addEventListener('click',()=>{
    panel.classList.remove('open');
  });

  addBtn.addEventListener('click',()=>{
    if(!currentDetection)return;
    const name=nameInput.value.trim()||autoName(currentDetection);
    const links=loadLinks();
    links.push({name,url:currentDetection.url,type:currentDetection.type});
    saveLinks(links);
    nameInput.value='';urlInput.value='';nameInput.placeholder='Name (optional \u2014 auto-detected)';
    currentDetection=null;
    detectedEl.style.display='none';
    addBtn.disabled=true;addBtn.style.opacity='.5';
    addBtn.textContent='Paste a Teams link above';
    renderLinks();
  });

  // Allow Enter key to add
  urlInput.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){e.preventDefault();addBtn.click();}
  });
  nameInput.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){e.preventDefault();addBtn.click();}
  });

  renderLinks();
}
