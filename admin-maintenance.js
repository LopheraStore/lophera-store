let maintenanceConfig={enabled:false,title:'Estamos preparando algo especial',message:'Voltamos em breve com novidades! 💜',image_url:''};
let maintenanceBusy=false;
function maintenanceStatus(message){document.getElementById('maintenanceStatus').textContent=message}
function renderMaintenanceControls(){
 document.getElementById('maintenanceState').textContent=maintenanceConfig.enabled?'● Loja em manutenção':'○ Loja aberta';
 const btn=document.getElementById('maintenanceToggle');
 btn.textContent=maintenanceConfig.enabled?'Desativar manutenção':'Ativar manutenção';
 btn.disabled=maintenanceBusy;
}
async function loadMaintenanceSettings(){
 maintenanceStatus('Carregando configurações...');
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').single();
 if(error){maintenanceStatus('Erro: '+error.message);return}
 maintenanceConfig={...maintenanceConfig,...(data.content?.maintenance||{})};
 document.getElementById('maintenanceTitle').value=maintenanceConfig.title;
 document.getElementById('maintenanceMessage').value=maintenanceConfig.message;
 document.getElementById('maintenanceRemoveImage').checked=false;
 document.getElementById('maintenanceImageFile').value='';
 renderMaintenanceControls();previewMaintenanceImage();maintenanceStatus('');
}
function previewMaintenanceImage(){
 const input=document.getElementById('maintenanceImageFile'),preview=document.getElementById('maintenanceImagePreview');
 if(preview.dataset.objectUrl){URL.revokeObjectURL(preview.dataset.objectUrl);delete preview.dataset.objectUrl}
 const file=input.files?.[0],remove=document.getElementById('maintenanceRemoveImage').checked;
 const src=file&&!remove?URL.createObjectURL(file):(!remove?maintenanceConfig.image_url:'');
 if(file&&!remove)preview.dataset.objectUrl=src;
 preview.style.display=src?'block':'none';if(src)preview.src=src;else preview.removeAttribute('src');
}
async function persistMaintenance(next){
 const {data:admin,error:authError}=await supabaseClient.rpc('is_admin');
 if(authError||admin!==true)throw new Error('Somente administradores podem alterar a manutenção.');
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').single();
 if(error)throw error;
 const content={...(data.content||{}),maintenance:{...(data.content?.maintenance||{}),...next}};
 const saved=await supabaseClient.from('store_settings').update({content}).eq('id','main').select('id').single();
 if(saved.error)throw saved.error;
 maintenanceConfig={...maintenanceConfig,...next};renderMaintenanceControls();
}
async function toggleMaintenance(){
 if(maintenanceBusy)return;
 const enabled=!maintenanceConfig.enabled;
 if(!confirm(enabled?'Ativar manutenção para os visitantes da loja?':'Desativar manutenção e reabrir a loja para visitantes?'))return;
 maintenanceBusy=true;renderMaintenanceControls();maintenanceStatus('Atualizando estado...');
 try{await persistMaintenance({enabled});maintenanceStatus(enabled?'Manutenção ativada!':'Manutenção desativada. Loja aberta!')}
 catch(e){maintenanceStatus('Erro: '+e.message)}
 finally{maintenanceBusy=false;renderMaintenanceControls()}
}
async function saveMaintenanceSettings(){
 if(maintenanceBusy)return;
 maintenanceBusy=true;renderMaintenanceControls();maintenanceStatus('Salvando aparência...');
 try{
  const title=document.getElementById('maintenanceTitle').value.trim().slice(0,80)||'Estamos preparando algo especial';
  const message=document.getElementById('maintenanceMessage').value.trim().slice(0,300)||'Voltamos em breve! 💜';
  const file=document.getElementById('maintenanceImageFile').files?.[0];
  let image_url=document.getElementById('maintenanceRemoveImage').checked?'':maintenanceConfig.image_url;
  if(file&&!document.getElementById('maintenanceRemoveImage').checked){
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Escolha PNG, JPG ou WebP com até 5 MB.');
   image_url=await uploadSetting(file,'maintenance-banner');
  }
  await persistMaintenance({title,message,image_url});
  document.getElementById('maintenanceImageFile').value='';document.getElementById('maintenanceRemoveImage').checked=false;
  previewMaintenanceImage();maintenanceStatus('Aparência salva com sucesso!');
 }catch(e){maintenanceStatus('Erro: '+e.message)}
 finally{maintenanceBusy=false;renderMaintenanceControls()}
}
function openMaintenancePreview(){
 const title=document.getElementById('maintenanceTitle').value.trim(),message=document.getElementById('maintenanceMessage').value.trim();
 const file=document.getElementById('maintenanceImageFile').files?.[0];
 const image=file&&!document.getElementById('maintenanceRemoveImage').checked?URL.createObjectURL(file):document.getElementById('maintenanceRemoveImage').checked?'':maintenanceConfig.image_url;
 const modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:999999;background:#110b1b;color:white;display:grid;place-items:center;padding:24px;text-align:center;overflow:auto';
 const card=document.createElement('div');card.style.cssText='max-width:740px;width:100%;padding:32px;border:1px solid #70558a;border-radius:24px;background:radial-gradient(circle at top,#38204e,#150d21 75%)';
 const close=document.createElement('button');close.textContent='✕ Fechar prévia';close.className='btn';close.onclick=()=>{if(file&&image)URL.revokeObjectURL(image);modal.remove()};
 const logo=document.createElement('h2');logo.textContent='✦ LOPHERA STORE ✦';
 const heading=document.createElement('h1');heading.textContent=title||maintenanceConfig.title;
 const p=document.createElement('p');p.textContent=message||maintenanceConfig.message;
 card.append(close,logo);
 if(image){const img=document.createElement('img');img.src=image;img.alt='Imagem da manutenção';img.style.cssText='max-width:100%;max-height:340px;object-fit:contain;border-radius:18px;margin:18px auto';card.append(img)}
 card.append(heading,p);modal.append(card);document.body.append(modal);
}
