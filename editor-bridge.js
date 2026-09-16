
(()=>{
 const qs=new URLSearchParams(location.search); if(qs.get('adminPreview')!=='1')return;
 document.documentElement.classList.add('admin-preview-mode');
 const style=document.createElement('style');
 style.textContent=`[data-edit-key]{outline:1px dashed transparent;outline-offset:4px;transition:.15s}
 [data-edit-key]:hover{outline-color:#8d5ca0}
 .v3-pencil{position:absolute;z-index:99999;width:31px;height:31px;border:0;border-radius:50%;background:#6c3f7d;color:#fff;box-shadow:0 3px 12px #0004;cursor:pointer;font-size:15px}
 .v3-pencil:hover{transform:scale(1.08)} body{padding-bottom:70px!important}`;
 document.head.appendChild(style);
 function place(){
   document.querySelectorAll('.v3-pencil').forEach(x=>x.remove());
   document.querySelectorAll('[data-edit-key]').forEach(el=>{
     const r=el.getBoundingClientRect(); if(r.width<4||r.height<4)return;
     const b=document.createElement('button');b.className='v3-pencil';b.textContent='✎';b.title='Editar '+(el.dataset.editLabel||'item');
     b.style.left=(scrollX+r.right-24)+'px';b.style.top=(scrollY+r.top+7)+'px';
     b.onclick=e=>{e.preventDefault();e.stopPropagation();parent.postMessage({type:'lophera-edit',key:el.dataset.editKey,editType:el.dataset.editType||'text',label:el.dataset.editLabel||el.dataset.editKey,size:el.dataset.editSize||'',value:(el.dataset.editType==='background'?'':(el.dataset.editType==='html'?el.innerHTML:el.textContent))},'*')};
     document.body.appendChild(b);
   });
 }
 addEventListener('load',()=>setTimeout(place,500)); addEventListener('resize',place);
 setTimeout(place,1200);
})();
