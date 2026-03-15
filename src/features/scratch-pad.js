// ── SCRATCH PAD (Spreadsheet + Whiteboard) ── ES Module
// Extracted from index.html lines 6257–6823

function createScratchPad(cfg){
  let sRows=8,sCols=6;
  const sData=[];
  const sColHeaders=[];
  const sRowNames=[];
  for(let r=0;r<sRows;r++){sData.push(Array(sCols).fill(''));sRowNames.push('')}
  for(let c=0;c<sCols;c++){sColHeaders.push('')}
  const grid=document.getElementById(cfg.grid);

  function colLabel(c){let s='';c++;while(c>0){c--;s=String.fromCharCode(65+c%26)+s;c=Math.floor(c/26)}return s}
  function parseRef(ref){const m=ref.match(/^([A-Z]+)(\d+)$/);if(!m)return null;let c=0;for(const ch of m[1])c=c*26+(ch.charCodeAt(0)-64);return{r:parseInt(m[2])-1,c:c-1}}

  function evalCell(r,c,visited){
    const raw=(sData[r]&&sData[r][c])||'';
    if(!raw.startsWith('='))return isNaN(raw)||raw===''?raw:parseFloat(raw);
    const key=r+','+c;
    if(visited.has(key))return '#REF!';
    visited.add(key);
    try{
      const expr=raw.slice(1).toUpperCase().replace(/[A-Z]+\d+/g,ref=>{
        const p=parseRef(ref);
        if(!p||p.r<0||p.r>=sRows||p.c<0||p.c>=sCols)return '0';
        const v=evalCell(p.r,p.c,new Set(visited));
        return typeof v==='number'?v:'0';
      });
      // Only allow numbers and basic ops
      if(/^[\d+\-*/().\s]+$/.test(expr)){return Function('"use strict";return ('+expr+')')()}
      return raw;
    }catch(e){return '#ERR!'}
  }

  let showFormulas=false;
  function renderGrid(){
    let h='<table class="comp-table" style="font-size:.8rem"><thead><tr><th style="width:30px"></th><th style="width:90px;background:var(--panel)"></th>';
    for(let c=0;c<sCols;c++){
      const hdr=sColHeaders[c]||colLabel(c);
      h+=`<th class="scratch-col-hdr" data-c="${c}" style="min-width:80px;text-align:center;cursor:text;font-weight:600;color:${sColHeaders[c]?'var(--text-dark)':'var(--text-dim)'}">${hdr}</th>`;
    }
    h+='</tr></thead><tbody>';
    for(let r=0;r<sRows;r++){
      const rName=sRowNames[r]||String(r+1);
      h+=`<tr><td style="font-weight:600;color:var(--text-dim);text-align:center;background:var(--panel);font-size:.7rem">${r+1}</td>`;
      h+=`<td class="scratch-row-name" data-r="${r}" style="cursor:text;background:var(--panel);font-weight:600;font-size:.75rem;padding:2px 6px;color:${sRowNames[r]?'var(--text-dark)':'var(--text-dim)'};white-space:nowrap">${sRowNames[r]||'Row '+(r+1)}</td>`;
      for(let c=0;c<sCols;c++){
        const val=evalCell(r,c,new Set());
        const display=typeof val==='number'?Math.round(val*100)/100:val;
        const raw=sData[r][c]||'';
        const formulaHtml=showFormulas&&raw.startsWith('=')?`<div style="font-size:.65rem;color:var(--text-dim);opacity:.6;margin-top:1px">${raw}</div>`:'';
        h+=`<td class="scratch-cell" data-r="${r}" data-c="${c}" style="cursor:text;min-width:80px;padding:2px 6px">${display}${formulaHtml}</td>`;
      }
      h+='</tr>';
    }
    h+='</tbody></table>';
    grid.innerHTML=h;
    // Editable column headers
    grid.querySelectorAll('.scratch-col-hdr').forEach(th=>{
      th.addEventListener('dblclick',()=>{
        const c=+th.dataset.c;
        const inp=document.createElement('input');
        inp.type='text';inp.value=sColHeaders[c]||'';inp.placeholder=colLabel(c);
        inp.style.cssText='width:100%;border:none;outline:2px solid var(--accent);background:var(--bg);color:var(--text-dark);font-size:.8rem;padding:2px 4px;box-sizing:border-box;text-align:center;font-weight:600';
        th.textContent='';th.appendChild(inp);inp.focus();inp.select();
        const finish=()=>{sColHeaders[c]=inp.value;renderGrid()};
        inp.addEventListener('blur',finish);
        inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish()}if(e.key==='Escape'){inp.value=sColHeaders[c];finish()}});
      });
    });
    // Editable row names
    grid.querySelectorAll('.scratch-row-name').forEach(td=>{
      td.addEventListener('dblclick',()=>{
        const r=+td.dataset.r;
        const inp=document.createElement('input');
        inp.type='text';inp.value=sRowNames[r]||'';inp.placeholder='Row '+(r+1);
        inp.style.cssText='width:100%;border:none;outline:2px solid var(--accent);background:var(--bg);color:var(--text-dark);font-size:.75rem;padding:2px 4px;box-sizing:border-box;font-weight:600';
        td.textContent='';td.appendChild(inp);inp.focus();inp.select();
        const finish=()=>{sRowNames[r]=inp.value;renderGrid()};
        inp.addEventListener('blur',finish);
        inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish()}if(e.key==='Escape'){inp.value=sRowNames[r];finish()}});
      });
    });
    // Editable cells
    grid.querySelectorAll('.scratch-cell').forEach(td=>{
      td.addEventListener('dblclick',()=>{
        const r=+td.dataset.r,c=+td.dataset.c;
        const inp=document.createElement('input');
        inp.type='text';inp.value=sData[r][c]||'';
        inp.style.cssText='width:100%;border:none;outline:2px solid var(--accent);background:var(--bg);color:var(--text-dark);font-size:.8rem;padding:2px 4px;box-sizing:border-box';
        td.textContent='';td.appendChild(inp);inp.focus();inp.select();
        const finish=()=>{sData[r][c]=inp.value;renderGrid()};
        inp.addEventListener('blur',finish);
        inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish()}if(e.key==='Escape'){inp.value=sData[r][c];finish()}
          if(e.key==='Tab'){e.preventDefault();finish();const nc=e.shiftKey?c-1:c+1;if(nc>=0&&nc<sCols){const next=grid.querySelector(`[data-r="${r}"][data-c="${nc}"]`);if(next)next.dispatchEvent(new Event('dblclick'))}}
        });
      });
    });
  }
  renderGrid();
  document.getElementById(cfg.addRow).addEventListener('click',()=>{sRows++;sData.push(Array(sCols).fill(''));sRowNames.push('');renderGrid()});
  document.getElementById(cfg.addCol).addEventListener('click',()=>{sCols++;sData.forEach(r=>r.push(''));sColHeaders.push('');renderGrid()});
  document.getElementById(cfg.clear).addEventListener('click',()=>{sData.forEach(r=>r.fill(''));renderGrid()});
  document.getElementById(cfg.showFormulas).addEventListener('click',()=>{showFormulas=!showFormulas;document.getElementById(cfg.showFormulas).classList.toggle('active',showFormulas);renderGrid()});

  // ── Whiteboard ──
  const canvas=document.getElementById(cfg.canvas);
  const ctx=canvas.getContext('2d');
  function getWbColors(){
    const isDark=document.documentElement.classList.contains('dark');
    return isDark?window.TAG_COLORS_DARK.slice():window.TAG_COLORS_LIGHT.slice();
  }
  let wbColor=getWbColors()[0],wbOpacity=1,wbSize=3,wbShowGrid=false,wbDrawing=false;
  let wbHistory=[],wbShapeStart=null,wbSelection=null,wbSelImg=null,wbSelOffset=null;
  const swatches=document.getElementById(cfg.wbColorSwatchesId);
  function renderWbSwatches(){
    swatches.innerHTML='';
    const colors=getWbColors();
    if(colors.indexOf(wbColor)===-1)wbColor=colors[0];
    colors.forEach(c=>{
      const s=document.createElement('span');
      s.style.cssText=`width:18px;height:18px;border-radius:3px;cursor:pointer;border:2px solid ${c===wbColor?'var(--accent)':'transparent'};background:${c};display:inline-block`;
      s.addEventListener('click',()=>{wbColor=c;swatches.querySelectorAll('span').forEach(x=>x.style.borderColor='transparent');s.style.borderColor='var(--accent)'});
      swatches.appendChild(s);
    });
  }
  renderWbSwatches();

  function resizeWbCanvas(){
    const rect=canvas.parentElement.getBoundingClientRect();
    const h=Math.max(300,rect.height-canvas.offsetTop+canvas.parentElement.offsetTop-8);
    if(canvas.width!==Math.floor(rect.width-32)||canvas.height!==Math.floor(h)){
      const imgData=canvas.width>0&&canvas.height>0?ctx.getImageData(0,0,canvas.width,canvas.height):null;
      canvas.width=Math.floor(rect.width-32);canvas.height=Math.floor(h);
      if(imgData)ctx.putImageData(imgData,0,0);
      if(wbShowGrid)drawGrid();
    }
  }
  resizeWbCanvas();

  function captureClean(){
    // Get image data without grid lines
    if(wbShowGrid){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(wbHistory.length)ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
      // Re-draw current strokes on top (they're already composited)
    }
    const data=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(wbShowGrid)drawGrid();
    return data;
  }
  function saveState(){
    wbHistory.push(captureClean());
    if(wbHistory.length>50)wbHistory.shift();
  }
  function updateLastState(){
    wbHistory[wbHistory.length-1]=captureClean();
  }

  function drawGrid(){
    ctx.save();ctx.strokeStyle='rgba(200,200,200,0.3)';ctx.lineWidth=0.5;
    for(let x=0;x<canvas.width;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}
    for(let y=0;y<canvas.height;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
    ctx.restore();
  }

  function redraw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(wbHistory.length)ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
    if(wbShowGrid)drawGrid();
  }

  function getPos(e){const t=e.touches?e.touches[0]||e.changedTouches[0]:e;const r=canvas.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}}
  const shapeSelect=document.getElementById(cfg.wbShapeId);

  // Find bounding box of connected non-transparent pixels at a point
  function findObjectAt(startX,startY){
    if(startX<0||startX>=canvas.width||startY<0||startY>=canvas.height)return null;
    const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
    const d=imgData.data;const w=canvas.width;const h=canvas.height;
    const idx=(startY*w+startX)*4;
    if(d[idx+3]<10)return null;// clicked on empty area
    // Flood-fill to find all connected non-transparent pixels
    const visited=new Uint8Array(w*h);
    const stack=[[startX,startY]];
    let minX=startX,maxX=startX,minY=startY,maxY=startY;
    while(stack.length){
      const [cx,cy]=stack.pop();
      const ci=cy*w+cx;
      if(visited[ci])continue;
      const pi=ci*4;
      if(d[pi+3]<10){visited[ci]=1;continue}// transparent
      visited[ci]=1;
      if(cx<minX)minX=cx;if(cx>maxX)maxX=cx;
      if(cy<minY)minY=cy;if(cy>maxY)maxY=cy;
      if(cx>0)stack.push([cx-1,cy]);
      if(cx<w-1)stack.push([cx+1,cy]);
      if(cy>0)stack.push([cx,cy-1]);
      if(cy<h-1)stack.push([cx,cy+1]);
    }
    // Add small padding
    const pad=3;
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    return{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
  }

  function stampSelection(){
    if(!wbSelImg||!wbSelection)return;
    // Draw selection onto the current background and save to history
    ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
    ctx.drawImage(wbSelCanvas,wbSelection.x,wbSelection.y);
    updateLastState();
  }

  function drawSelBorder(){
    if(!wbSelection)return;
    ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='#2980b9';ctx.lineWidth=1;
    ctx.strokeRect(wbSelection.x,wbSelection.y,wbSelection.w,wbSelection.h);ctx.restore();
  }

  function redrawGridRegion(x,y,w,h){
    ctx.save();ctx.strokeStyle='rgba(200,200,200,0.3)';ctx.lineWidth=0.5;
    for(let gx=Math.floor(x/20)*20;gx<x+w;gx+=20){ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke()}
    for(let gy=Math.floor(y/20)*20;gy<y+h;gy+=20){ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke()}
    ctx.restore();
  }

  let eraserOverlay=null;
  function setCursorForTool(){
    const v=shapeSelect.value;
    if(v==='eraser'){
      canvas.style.cursor='none';
      if(!eraserOverlay){
        eraserOverlay=document.createElement('div');
        eraserOverlay.style.cssText='position:absolute;pointer-events:none;border:2px solid rgba(139,32,32,0.6);border-radius:50%;z-index:10;display:none;box-sizing:border-box;background:rgba(139,32,32,0.08)';
        canvas.parentElement.style.position='relative';
        canvas.parentElement.appendChild(eraserOverlay);
      }
    } else {
      canvas.style.cursor=v==='hand'?'grab':v==='text'?'crosshair':'crosshair';
      if(eraserOverlay){eraserOverlay.style.display='none'}
    }
  }
  shapeSelect.addEventListener('change',()=>{
    // Stamp any floating selection when switching tools
    if(wbSelImg&&wbSelection){stampSelection();wbSelImg=null;wbSelection=null;wbSelOffset=null}
    setCursorForTool();
  });
  // Escape to stamp/deselect
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&wbSelImg&&wbSelection){stampSelection();wbSelImg=null;wbSelection=null;wbSelOffset=null;setCursorForTool()}
  });

  canvas.addEventListener('mousedown',e=>{
    const pos=getPos(e);wbDrawing=true;
    const op=parseFloat(document.getElementById(cfg.wbOpacityId).value)/100;
    wbSize=parseInt(document.getElementById(cfg.wbSizeId).value);
    wbOpacity=op;
    const tool=shapeSelect.value;

    if(tool==='hand'){
      // If we already have a floating selection, start dragging it
      if(wbSelImg&&wbSelection){
        // Check if click is inside current selection
        const s=wbSelection;
        if(pos.x>=s.x&&pos.x<=s.x+s.w&&pos.y>=s.y&&pos.y<=s.y+s.h){
          wbSelOffset={x:pos.x-s.x,y:pos.y-s.y};
          canvas.style.cursor='grabbing';
          return;
        }
        // Click outside: stamp selection permanently into history
        stampSelection();
        wbSelImg=null;wbSelection=null;wbSelOffset=null;
      }
      // Try to auto-select an object at click point
      const found=findObjectAt(Math.round(pos.x),Math.round(pos.y));
      if(found){
        saveState();
        // Cut the found region into floating selection
        wbSelCanvas.width=found.w;wbSelCanvas.height=found.h;
        const selCtx=wbSelCanvas.getContext('2d');
        selCtx.clearRect(0,0,found.w,found.h);
        selCtx.drawImage(canvas,found.x,found.y,found.w,found.h,0,0,found.w,found.h);
        wbSelImg=true;
        wbSelection={x:found.x,y:found.y,w:found.w,h:found.h};
        // Clear from background
        ctx.clearRect(found.x,found.y,found.w,found.h);
        if(wbShowGrid)redrawGridRegion(found.x,found.y,found.w,found.h);
        // Save cleaned background as current history state
        updateLastState();
        // Draw floating selection + border
        ctx.drawImage(wbSelCanvas,found.x,found.y);
        drawSelBorder();
        wbSelOffset={x:pos.x-found.x,y:pos.y-found.y};
        canvas.style.cursor='grabbing';
        wbDrawing=true;
        return;
      }
      // No object found — start manual selection rectangle
      saveState();wbShapeStart=pos;
      canvas.style.cursor='crosshair';
    } else if(tool==='dot'){
      saveState();
      const r=parseInt(wbColor.slice(1,3),16),g=parseInt(wbColor.slice(3,5),16),b=parseInt(wbColor.slice(5,7),16);
      ctx.fillStyle=`rgba(${r},${g},${b},${wbOpacity})`;
      ctx.beginPath();
      ctx.arc(pos.x,pos.y,Math.max(2,wbSize),0,Math.PI*2);
      ctx.fill();
      updateLastState();
      wbDrawing=false;
    } else if(tool==='text'){
      // Start drawing a text box
      saveState();wbShapeStart=pos;
    } else if(tool==='eraser'){
      saveState();
      // Brush eraser: clear circle at cursor
      brushErase(pos.x,pos.y);
      wbDrawing=true;
    } else if(tool){
      saveState();wbShapeStart=pos;
    } else {
      saveState();
      ctx.beginPath();ctx.moveTo(pos.x,pos.y);
      const r=parseInt(wbColor.slice(1,3),16),g=parseInt(wbColor.slice(3,5),16),b=parseInt(wbColor.slice(5,7),16);
      ctx.strokeStyle=`rgba(${r},${g},${b},${wbOpacity})`;
      ctx.lineWidth=wbSize;ctx.lineCap='round';ctx.lineJoin='round';
    }
  });

  // Off-screen canvas for floating selection
  let wbSelCanvas=document.createElement('canvas');

  canvas.addEventListener('mousemove',e=>{
    if(!wbDrawing)return;
    const pos=getPos(e);
    const tool=shapeSelect.value;

    if(tool==='hand'&&wbSelImg&&wbSelOffset){
      wbSelection.x=pos.x-wbSelOffset.x;
      wbSelection.y=pos.y-wbSelOffset.y;
      ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
      if(wbShowGrid)drawGrid();
      ctx.drawImage(wbSelCanvas,wbSelection.x,wbSelection.y);
      drawSelBorder();
      return;
    }

    if(tool==='hand'&&wbShapeStart){
      // Drawing selection rectangle
      if(wbHistory.length)ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
      else ctx.clearRect(0,0,canvas.width,canvas.height);
      if(wbShowGrid)drawGrid();
      ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='#2980b9';ctx.lineWidth=1;
      ctx.strokeRect(wbShapeStart.x,wbShapeStart.y,pos.x-wbShapeStart.x,pos.y-wbShapeStart.y);ctx.restore();
      return;
    }

    if(tool==='eraser'){
      if(wbDrawing)brushErase(pos.x,pos.y);
      return;
    }

    if(tool&&wbShapeStart){
      // Preview shape or text box
      if(wbHistory.length)ctx.putImageData(wbHistory[wbHistory.length-1],0,0);
      else ctx.clearRect(0,0,canvas.width,canvas.height);
      if(wbShowGrid)drawGrid();
      const r=parseInt(wbColor.slice(1,3),16),g=parseInt(wbColor.slice(3,5),16),b=parseInt(wbColor.slice(5,7),16);
      ctx.strokeStyle=`rgba(${r},${g},${b},${wbOpacity})`;ctx.lineWidth=wbSize;
      const s=wbShapeStart;
      if(tool==='text'){
        ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='var(--accent,#8b2020)';ctx.lineWidth=1;
        ctx.strokeRect(s.x,s.y,pos.x-s.x,pos.y-s.y);ctx.restore();
      } else if(tool==='rect'){ctx.strokeRect(s.x,s.y,pos.x-s.x,pos.y-s.y)}
      else if(tool==='circle'){const rx=Math.abs(pos.x-s.x)/2,ry=Math.abs(pos.y-s.y)/2;ctx.beginPath();ctx.ellipse(s.x+((pos.x-s.x)/2),s.y+((pos.y-s.y)/2),rx,ry,0,0,Math.PI*2);ctx.stroke()}
      else if(tool==='line'){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(pos.x,pos.y);ctx.stroke()}
    } else if(!tool){
      ctx.lineTo(pos.x,pos.y);ctx.stroke();
    }
  });

  canvas.addEventListener('mouseup',e=>{
    if(!wbDrawing)return;
    wbDrawing=false;
    const pos=getPos(e);
    const tool=shapeSelect.value;

    if(tool==='hand'&&wbSelOffset){
      // Finished dragging — keep floating, user clicks outside to stamp
      wbSelOffset=null;
      canvas.style.cursor='grab';
      return;
    }

    if(tool==='hand'&&wbShapeStart){
      // Finished drawing selection rect — cut selected region
      const x=Math.min(wbShapeStart.x,pos.x),y=Math.min(wbShapeStart.y,pos.y);
      const w=Math.abs(pos.x-wbShapeStart.x),h=Math.abs(pos.y-wbShapeStart.y);
      wbShapeStart=null;
      if(w<4||h<4){canvas.style.cursor='grab';return}// too small
      // Capture selection into offscreen canvas
      wbSelCanvas.width=w;wbSelCanvas.height=h;
      const selCtx=wbSelCanvas.getContext('2d');
      selCtx.clearRect(0,0,w,h);
      selCtx.drawImage(canvas,x,y,w,h,0,0,w,h);
      wbSelImg=true;
      wbSelection={x,y,w,h};
      // Clear the selected area from the background
      ctx.clearRect(x,y,w,h);
      if(wbShowGrid)redrawGridRegion(x,y,w,h);
      // Save cleaned background as history state
      updateLastState();
      // Draw floating selection + border on top
      ctx.drawImage(wbSelCanvas,x,y);
      drawSelBorder();
      canvas.style.cursor='grab';
      return;
    }

    if(tool==='eraser'){
      updateLastState();
      return;
    }

    if(tool==='text'&&wbShapeStart){
      // Finished drawing text box — place textarea
      const x=Math.min(wbShapeStart.x,pos.x),y=Math.min(wbShapeStart.y,pos.y);
      const w=Math.max(60,Math.abs(pos.x-wbShapeStart.x)),h=Math.max(24,Math.abs(pos.y-wbShapeStart.y));
      wbShapeStart=null;
      // Restore canvas (remove preview dashes)
      redraw();
      canvas.parentElement.style.position='relative';
      const canvasRect=canvas.getBoundingClientRect();
      const parentRect=canvas.parentElement.getBoundingClientRect();
      const fontSize=Math.max(12,Math.min(h*0.6,wbSize*4));
      const ta=document.createElement('textarea');
      ta.placeholder='Type here\u2026';
      ta.style.cssText=`position:absolute;left:${canvasRect.left-parentRect.left+x}px;top:${canvasRect.top-parentRect.top+y}px;width:${w}px;height:${h}px;font-size:${fontSize}px;border:2px solid var(--accent,#8b2020);background:rgba(255,255,255,0.95);color:${wbColor};outline:none;padding:4px 6px;z-index:10;font-family:sans-serif;border-radius:3px;resize:both;overflow:hidden;line-height:1.3;box-sizing:border-box;caret-color:var(--accent,#8b2020)`;
      canvas.parentElement.appendChild(ta);
      ta.focus();
      let committed=false;
      const commitText=()=>{
        if(committed)return;
        committed=true;
        const text=ta.value.trim();
        if(text){
          const cr=parseInt(wbColor.slice(1,3),16),cg=parseInt(wbColor.slice(3,5),16),cb=parseInt(wbColor.slice(5,7),16);
          ctx.fillStyle=`rgba(${cr},${cg},${cb},${wbOpacity})`;
          ctx.font=`${fontSize}px sans-serif`;
          const lines=text.split('\n');
          const lineH=fontSize*1.3;
          lines.forEach((line,li)=>{ctx.fillText(line,x+4,y+fontSize+li*lineH)});
          updateLastState();
        }
        ta.remove();
      };
      ta.addEventListener('blur',commitText);
      ta.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();commitText()}});
      return;
    }

    if(tool&&tool!=='hand'&&tool!=='eraser'&&wbShapeStart){
      updateLastState();
      wbShapeStart=null;
    } else if(!tool){
      ctx.closePath();
      updateLastState();
    }
  });
  canvas.addEventListener('mouseleave',()=>{
    if(wbDrawing){wbDrawing=false;const tool=shapeSelect.value;if(!tool)ctx.closePath();if(tool==='eraser'&&wbHistory.length)updateLastState();else if(wbHistory.length)updateLastState()}
    if(eraserOverlay)eraserOverlay.style.display='none';
  });
  // Track eraser circle overlay on all mouse movement
  canvas.addEventListener('mousemove',e=>{
    if(shapeSelect.value==='eraser'&&eraserOverlay){
      const canvasRect=canvas.getBoundingClientRect();
      const parentRect=canvas.parentElement.getBoundingClientRect();
      const radius=Math.max(8,wbSize*3);
      const diameter=radius*2;
      eraserOverlay.style.width=diameter+'px';
      eraserOverlay.style.height=diameter+'px';
      eraserOverlay.style.left=(canvasRect.left-parentRect.left+e.clientX-canvasRect.left-radius)+'px';
      eraserOverlay.style.top=(canvasRect.top-parentRect.top+e.clientY-canvasRect.top-radius)+'px';
      eraserOverlay.style.display='block';
    }
  });

  // Touch support for mobile
  canvas.addEventListener('touchstart',e=>{e.preventDefault();const me=new MouseEvent('mousedown',{clientX:(e.touches[0]||e.changedTouches[0]).clientX,clientY:(e.touches[0]||e.changedTouches[0]).clientY});canvas.dispatchEvent(me)},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();const me=new MouseEvent('mousemove',{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});canvas.dispatchEvent(me)},{passive:false});
  canvas.addEventListener('touchend',e=>{e.preventDefault();const t=e.changedTouches[0];const me=new MouseEvent('mouseup',{clientX:t.clientX,clientY:t.clientY});canvas.dispatchEvent(me)},{passive:false});

  // Brush eraser: clear circle area at position
  function brushErase(cx,cy){
    const radius=Math.max(8,wbSize*3);
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath();
    ctx.arc(cx,cy,radius,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
    // Redraw grid in erased area if grid is on
    if(wbShowGrid)redrawGridRegion(cx-radius,cy-radius,radius*2,radius*2);
  }

  document.getElementById(cfg.wbUndoId).addEventListener('click',()=>{
    if(wbHistory.length){wbHistory.pop();ctx.clearRect(0,0,canvas.width,canvas.height);if(wbHistory.length)ctx.putImageData(wbHistory[wbHistory.length-1],0,0);if(wbShowGrid)drawGrid()}
  });
  document.getElementById(cfg.wbClearId).addEventListener('click',()=>{wbHistory=[];ctx.clearRect(0,0,canvas.width,canvas.height);if(wbShowGrid)drawGrid()});
  document.getElementById(cfg.wbGridId).addEventListener('click',()=>{
    wbShowGrid=!wbShowGrid;
    document.getElementById(cfg.wbGridId).classList.toggle('active',wbShowGrid);
    redraw();
  });
  window.addEventListener('resize',resizeWbCanvas);

  // Export scratch sheet to Excel
  function exportToExcel(){
    if(typeof XLSX==='undefined'){alert('XLSX library not loaded');return}
    const colLbl=c=>{let s='';c++;while(c>0){c--;s=String.fromCharCode(65+c%26)+s;c=Math.floor(c/26)}return s};
    const rows=[];
    // Header row: blank + column headers
    const headerRow=[''];
    for(let c=0;c<sCols;c++)headerRow.push(sColHeaders[c]||colLbl(c));
    rows.push(headerRow);
    // Data rows
    for(let r=0;r<sRows;r++){
      const row=[sRowNames[r]||'Row '+(r+1)];
      for(let c=0;c<sCols;c++){
        const val=evalCell(r,c,new Set());
        row.push(typeof val==='number'?val:(val||''));
      }
      rows.push(row);
    }
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:14},...Array(sCols).fill({wch:14})];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Scratch Sheet');
    window.xlsxDownload(wb,(cfg.exportName||'scratch_sheet')+'.xlsx');
  }
  if(cfg.exportBtn){
    document.getElementById(cfg.exportBtn).addEventListener('click',exportToExcel);
  }

  if(typeof window.colorSchemeCallbacks!=='undefined')window.colorSchemeCallbacks.push(renderWbSwatches);

  return {resizeWbCanvas,exportToExcel,renderWbSwatches};
}

const scratchPadCfg={grid:'scratchGrid',addRow:'scratchAddRow',addCol:'scratchAddCol',clear:'scratchClear',showFormulas:'scratchShowFormulas',exportBtn:'scratchExport',exportName:'scratch_sheet',canvas:'wbCanvas',wbSizeId:'wbSize',wbOpacityId:'wbOpacity',wbColorSwatchesId:'wbColorSwatches',wbGridId:'wbGrid',wbShapeId:'wbShape',wbUndoId:'wbUndo',wbClearId:'wbClearBtn'};
const vendorScratchCfg={grid:'vScratchGrid',addRow:'vScratchAddRow',addCol:'vScratchAddCol',clear:'vScratchClear',showFormulas:'vScratchShowFormulas',exportBtn:'vScratchExport',exportName:'vendor_scratch_sheet',canvas:'vWbCanvas',wbSizeId:'vWbSize',wbOpacityId:'vWbOpacity',wbColorSwatchesId:'vWbColorSwatches',wbGridId:'vWbGrid',wbShapeId:'vWbShape',wbUndoId:'vWbUndo',wbClearId:'vWbClearBtn'};
const depScratchCfg={grid:'dScratchGrid',addRow:'dScratchAddRow',addCol:'dScratchAddCol',clear:'dScratchClear',showFormulas:'dScratchShowFormulas',exportBtn:'dScratchExport',exportName:'depreciation_scratch_sheet',canvas:'dWbCanvas',wbSizeId:'dWbSize',wbOpacityId:'dWbOpacity',wbColorSwatchesId:'dWbColorSwatches',wbGridId:'dWbGrid',wbShapeId:'dWbShape',wbUndoId:'dWbUndo',wbClearId:'dWbClearBtn'};

let mainScratch=null,vendorScratch=null,depScratch=null;
export function initScratchPad(){
  if(!mainScratch)mainScratch=createScratchPad(scratchPadCfg);
  else mainScratch.resizeWbCanvas();
}
export function initVendorScratch(){
  if(!vendorScratch)vendorScratch=createScratchPad(vendorScratchCfg);
  else vendorScratch.resizeWbCanvas();
}
export function initDepScratch(){
  if(!depScratch)depScratch=createScratchPad(depScratchCfg);
  else depScratch.resizeWbCanvas();
}

window.initScratchPad = initScratchPad;
window.initVendorScratch = initVendorScratch;
window.initDepScratch = initDepScratch;

