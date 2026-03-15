// ── UNDO DELETE ──
import { saveState } from '../lib/state.js';

let _undoDeleteData=null;
let _undoDeleteTimer=null;
function showUndoToast(label,arr,idx,item,restoreFn){
  _undoDeleteData={arr:arr,idx:idx,item:item,restoreFn:restoreFn};
  const msg=document.getElementById('undoToastMsg');
  const toast=document.getElementById('undoToast');
  msg.textContent='Deleted '+label;
  toast.classList.add('show');
  if(_undoDeleteTimer)clearTimeout(_undoDeleteTimer);
  _undoDeleteTimer=setTimeout(function(){toast.classList.remove('show');_undoDeleteData=null},8000);
}

window.showUndoToast = showUndoToast;

export { showUndoToast };

export function initUndo(){
  document.getElementById('undoToastBtn').addEventListener('click',function(){
    if(!_undoDeleteData)return;
    const d=_undoDeleteData;
    d.arr.splice(d.idx,0,d.item);
    saveState();
    if(d.restoreFn)d.restoreFn();
    document.getElementById('undoToast').classList.remove('show');
    if(_undoDeleteTimer)clearTimeout(_undoDeleteTimer);
    _undoDeleteData=null;
  });
}
