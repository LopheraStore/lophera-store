/* Lophera Studio V4.1 — alternância de prévia PC/Celular */
(function(){
 window.setPreviewDevice=function(device,btn){
  const frame=document.getElementById('sitePreview'),wrap=document.querySelector('.browser-frame');
  if(!frame||!wrap)return;
  document.querySelectorAll('.device-switch .chip').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');
  wrap.classList.toggle('preview-mobile',device==='mobile');
  wrap.classList.toggle('preview-desktop',device!=='mobile');
  const note=document.getElementById('deviceNote');
  if(note)note.textContent=device==='mobile'?'Prévia Celular · 390 px — mesmo site, proporções mobile':'Prévia PC · largura completa';
  try{installVisualEditor()}catch(e){}
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const bar=document.querySelector('#tab-editor .v3-pagebar');if(!bar||document.querySelector('.device-switch'))return;
  const d=document.createElement('div');d.className='device-switch';d.innerHTML='<span id="deviceNote">Prévia PC · largura completa</span><div><button class="chip active" onclick="setPreviewDevice(\'desktop\',this)">▣ PC</button><button class="chip" onclick="setPreviewDevice(\'mobile\',this)">▯ Celular</button></div>';
  bar.insertAdjacentElement('afterend',d);
  document.querySelector('.browser-frame')?.classList.add('preview-desktop');
 });
})();