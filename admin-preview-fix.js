/* Lophera Studio — preview da nova loja */
(function(){
  const testBase='teste-lophera/';
  const normalizePage=(page)=>{
    const clean=String(page||'index.html').replace(/^\.\//,'');
    if(clean.startsWith(testBase)) return clean;
    if(['index.html','loja.html','sobre.html'].includes(clean)) return testBase+clean;
    return clean;
  };
  window.previewPage=function(page,b){
    const target=normalizePage(page);
    const frame=document.getElementById('sitePreview');
    if(frame) frame.src=target+'?adminPreview=1&t='+Date.now();
    const label=document.getElementById('previewUrl');
    if(label) label.textContent='lophera.com.br/'+target.replace(/^teste-lophera\//,'');
    document.querySelectorAll('.v3-pagebuttons .chip').forEach(x=>x.classList.remove('active'));
    b?.classList.add('active');
  };
  window.reloadPreviewFresh=function(){
    const frame=document.getElementById('sitePreview');
    if(!frame)return;
    const raw=frame.getAttribute('src')||testBase+'index.html?adminPreview=1';
    const u=new URL(raw,location.href);
    u.searchParams.set('adminPreview','1');
    u.searchParams.set('refresh',Date.now());
    let rel=u.pathname;
    const marker='/lophera-store/';
    if(rel.includes(marker)) rel=rel.split(marker)[1];
    else rel=rel.replace(/^\//,'');
    frame.src=rel+u.search;
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const frame=document.getElementById('sitePreview');
    if(frame && !String(frame.getAttribute('src')||'').startsWith(testBase)){
      frame.src=testBase+'index.html?adminPreview=1&t='+Date.now();
    }
    const view=document.querySelector('.v3-top-actions a.btn');
    if(view){view.href=testBase+'index.html';view.textContent='Ver loja ↗';}
    const label=document.getElementById('previewUrl');
    if(label)label.textContent='lophera.com.br/';
  });
})();