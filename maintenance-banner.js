(async()=>{
 if(typeof supabaseClient==='undefined')return;
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').maybeSingle();
 const settings=data?.content?.maintenance;
 if(error||settings?.enabled!==true)return;
 const {data:auth}=await supabaseClient.auth.getUser();
 if(auth?.user?.email?.toLowerCase()==='lopherastore@gmail.com'){
  const {data:admin}=await supabaseClient.rpc('is_admin');
  if(admin===true)return;
 }
 const overlay=document.createElement('div');
 overlay.id='lopheraMaintenanceNotice';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:radial-gradient(ellipse at 50% 15%,#45225d 0%,#1c102a 50%,#0f0b17 100%);color:#f8f1ff;display:grid;place-items:center;padding:24px;text-align:center;overflow:auto;font-family:Georgia,serif';
 const card=document.createElement('main');card.style.cssText='width:min(760px,100%);padding:clamp(28px,6vw,64px);border:1px solid rgba(215,183,244,.35);border-radius:28px;background:rgba(20,12,31,.7);box-shadow:0 30px 90px rgba(0,0,0,.3)';
 const brand=document.createElement('div');brand.textContent='✦ L O P H E R A  S T O R E ✦';brand.style.cssText='letter-spacing:3px;font-size:clamp(12px,2vw,18px);color:#e0c3f5;margin-bottom:26px';
 card.append(brand);
 if(settings.image_url){
  const img=document.createElement('img');img.src=settings.image_url;img.alt='Imagem da Lophera Store durante manutenção';img.style.cssText='display:block;width:auto;max-width:100%;max-height:350px;object-fit:contain;margin:0 auto 24px;border-radius:18px';card.append(img);
 }
 const heading=document.createElement('h1');heading.textContent=settings.title||'Estamos preparando algo especial';heading.style.cssText='font-size:clamp(30px,6vw,54px);font-weight:400;line-height:1.15;margin:0 0 20px';
 const note=document.createElement('p');note.textContent=settings.message||'Voltamos em breve com novidades! 💜';note.style.cssText='font-family:Arial,sans-serif;font-size:clamp(15px,2.6vw,19px);line-height:1.7;color:#e6d5ef';
 const footer=document.createElement('div');footer.textContent='Feito com carinho para você ♡';footer.style.cssText='margin-top:35px;color:#c7a7df;font-size:14px;letter-spacing:1px';
 card.append(heading,note,footer);overlay.append(card);document.body.append(overlay);document.body.style.overflow='hidden';
})();
