
(async()=>{
 if(typeof supabaseClient==='undefined')return;
 const {data:s,error}=await supabaseClient.from('store_settings').select('*').eq('id','main').maybeSingle();
 if(error||!s)return;
 const content=s.content||{};
 const get=(obj,path)=>path.split('.').reduce((a,k)=>a&&a[k]!==undefined?a[k]:undefined,obj);
 document.querySelectorAll('.topbar').forEach(el=>{if(s.topbar_text)el.innerHTML=s.topbar_text});
 document.querySelectorAll('.logo').forEach(img=>{if(s.logo_url)img.src=s.logo_url});
 document.querySelectorAll('footer img').forEach(img=>{if(s.logo_url)img.src=s.logo_url});
 if(document.body && (location.pathname.endsWith('/')||location.pathname.endsWith('/index.html'))){
   const hero=document.querySelector('.hero'); if(hero&&s.hero_image_url)hero.style.backgroundImage=`url("${s.hero_image_url}")`;
 }
 document.querySelectorAll('[data-edit-key]').forEach(el=>{
   const key=el.dataset.editKey, type=el.dataset.editType, v=get(content,key);
   if(v===undefined||v===null||v==='')return;
   if(type==='background') el.style.backgroundImage=`url("${v}")`;
   else if(type==='image' && el.tagName==='IMG') el.src=v;
   else if(type==='html') el.innerHTML=v;
   else el.textContent=v;
 });
 document.querySelectorAll('[data-instagram-link]').forEach(a=>{a.href=s.instagram_url||a.href;if(a.dataset.keepText!=='true')a.textContent=s.instagram_handle||'@lopherastore'});
 document.querySelectorAll('[data-facebook-link]').forEach(a=>a.href=s.facebook_url||a.href);
 document.querySelectorAll('[data-linktree-link]').forEach(a=>a.href=s.linktree_url||a.href);
 const guides=s.size_guides||{};
 document.querySelectorAll('img[src*="tabela-tamanhos-oversized"]').forEach(i=>{if(guides.oversized)i.src=guides.oversized});
 document.querySelectorAll('img[src*="tabela-tamanhos-moletom"]').forEach(i=>{if(guides.moletom)i.src=guides.moletom});
 const grid=document.querySelector('.instagram-grid');
 if(grid && Array.isArray(s.instagram_items) && s.instagram_items.length){
   grid.innerHTML=s.instagram_items.slice(0,6).map(x=>`<a class="insta-box insta-photo" href="${x.link||s.instagram_url||'#'}" target="_blank" rel="noopener"><img src="${x.image_url}" alt="Lophera no Instagram"></a>`).join('');
 }
})();
