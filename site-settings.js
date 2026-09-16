
async function applyStoreSettings(){
 try{
  const {data:s}=await supabaseClient.from('store_settings').select('*').eq('id','main').maybeSingle();
  if(!s)return;
  document.querySelectorAll('.brand img,.admin-head img').forEach(img=>{if(s.logo_url)img.src=s.logo_url});
  const top=document.querySelector('.topbar'); if(top&&s.topbar_text)top.textContent=s.topbar_text;
  const hero=document.querySelector('.hero');
  if(hero&&s.hero_image_url)hero.style.backgroundImage=`url("${s.hero_image_url}")`;
  const ig=document.querySelector('.instagram-grid');
  if(ig&&Array.isArray(s.instagram_items)&&s.instagram_items.length){
    ig.innerHTML=s.instagram_items.slice(0,6).map(x=>`<a href="${x.link||s.instagram_url||'#'}" target="_blank" rel="noopener"><img src="${x.image_url}" alt="Lophera no Instagram"></a>`).join('');
  }
  document.querySelectorAll('[data-instagram-link]').forEach(a=>{a.href=s.instagram_url||a.href;if(a.dataset.keepText!=='true')a.textContent=s.instagram_handle||'@lopherastore'});
  document.querySelectorAll('[data-facebook-link]').forEach(a=>a.href=s.facebook_url||a.href);
  document.querySelectorAll('[data-linktree-link]').forEach(a=>a.href=s.linktree_url||a.href);
 }catch(e){console.warn('Configurações da loja:',e)}
}
applyStoreSettings();
