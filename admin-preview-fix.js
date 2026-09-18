/* Lophera Studio — preview do site oficial na raiz */
(function(){
  const normalizePage=(page)=>{
    const clean=String(page||'index.html').replace(/^\.\//,'').replace(/^teste-lophera\//,'');
    return ['index.html','loja.html','sobre.html'].includes(clean)?clean:'index.html';
  };
  window.previewPage=function(page,b){
    const target=normalizePage(page);
    const frame=document.getElementById('sitePreview');
    if(frame) frame.src=target+'?adminPreview=1&t='+Date.now();
    const label=document.getElementById('previewUrl');
    if(label) label.textContent='lopherastore.com.br/'+(target==='index.html'?'':target);
    document.querySelectorAll('.v3-pagebuttons .chip').forEach(x=>x.classList.remove('active'));
    b?.classList.add('active');
  };
  window.reloadPreviewFresh=function(){
    const frame=document.getElementById('sitePreview');
    if(!frame)return;
    const raw=frame.getAttribute('src')||'index.html?adminPreview=1';
    const u=new URL(raw,location.href);
    u.searchParams.set('adminPreview','1');
    u.searchParams.set('refresh',Date.now());
    frame.src=(u.pathname.split('/').pop()||'index.html')+u.search;
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const frame=document.getElementById('sitePreview');
    if(frame) frame.src='index.html?adminPreview=1&t='+Date.now();
    const view=document.querySelector('.v3-top-actions a.btn');
    if(view){view.href='index.html';view.textContent='Ver loja ↗';}
    const label=document.getElementById('previewUrl');
    if(label)label.textContent='lopherastore.com.br/';
  });
})();