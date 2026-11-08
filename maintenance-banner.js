(async()=>{
 if(typeof supabaseClient==='undefined')return;
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').maybeSingle();
 if(error||data?.content?.maintenance?.enabled!==true)return;
 // Apenas administradores autenticados podem visualizar a loja sem o aviso.
 const {data:auth}=await supabaseClient.auth.getUser();
 if(auth?.user){const {data:admin}=await supabaseClient.rpc('is_admin');if(admin===true)return}
 const overlay=document.createElement('div');overlay.id='lopheraMaintenanceNotice';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#17101f',color:'#fff',display:'grid',placeItems:'center',padding:'24px',textAlign:'center'});
 const inner=document.createElement('div');inner.style.maxWidth='560px';
 const title=document.createElement('h1');title.textContent='Lophera Store 💜';title.style.fontSize='clamp(30px,7vw,56px)';
 const sub=document.createElement('h2');sub.textContent='Loja em manutenção';sub.style.fontSize='clamp(22px,5vw,34px)';
 const note=document.createElement('p');note.textContent=data.content.maintenance.message||'Estamos preparando novidades para você!';note.style.fontSize='18px';
 inner.append(title,sub,note);overlay.append(inner);document.body.append(overlay);document.body.style.overflow='hidden';
})();
