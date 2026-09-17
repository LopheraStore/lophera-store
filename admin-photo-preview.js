/* Lophera Studio — prévia imediata das fotos selecionadas */
(function(){
  const objectUrls=[];
  function clearPending(){
    objectUrls.splice(0).forEach(u=>URL.revokeObjectURL(u));
    document.querySelectorAll('.gallery-item.pending-photo').forEach(el=>el.remove());
  }
  document.addEventListener('change',e=>{
    const input=e.target;
    if(!(input instanceof HTMLInputElement) || input.id!=='photos') return;
    const gallery=input.closest('.gallery-admin');
    if(!gallery) return;
    clearPending();
    const files=[...(input.files||[])];
    files.forEach((file,index)=>{
      if(!file.type.startsWith('image/')) return;
      const url=URL.createObjectURL(file); objectUrls.push(url);
      const item=document.createElement('div');
      item.className='gallery-item pending-photo';
      item.title='Prévia — será enviada ao salvar o produto';
      item.innerHTML=`<img src="${url}" alt="Prévia da foto"><span style="position:absolute;left:5px;bottom:5px;background:rgba(48,35,51,.85);color:#fff;padding:3px 6px;font-size:9px;border-radius:10px">prévia</span>`;
      gallery.insertBefore(item,input.closest('.add-photo'));
    });
    const label=input.closest('.add-photo');
    if(label){
      const small=label.querySelector('small');
      if(small) small.textContent=files.length?`${files.length} selecionada${files.length>1?'s':''}`:'Adicionar';
    }
  });
  document.addEventListener('submit',e=>{
    if(e.target?.querySelector?.('#photos')) setTimeout(clearPending,1500);
  });
})();
