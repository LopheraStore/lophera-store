async function loadMaintenanceSettings(){
 const status=document.getElementById('maintenanceStatus');status.textContent='Carregando...';
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').single();
 if(error){status.textContent='Erro: '+error.message;return}
 document.getElementById('maintenanceEnabled').checked=data.content?.maintenance?.enabled===true;
 document.getElementById('maintenanceMessage').value=data.content?.maintenance?.message||'Estamos preparando novidades para você! Voltamos em breve. 💜';
 status.textContent='';
}
async function saveMaintenanceSettings(){
 const status=document.getElementById('maintenanceStatus');status.textContent='Salvando...';
 const {data:admin,error:authError}=await supabaseClient.rpc('is_admin');
 if(authError||admin!==true){status.textContent='Apenas administradores podem alterar esta opção.';return}
 const {data,error}=await supabaseClient.from('store_settings').select('content').eq('id','main').single();
 if(error){status.textContent='Erro ao ler configurações: '+error.message;return}
 const content={...(data.content||{}),maintenance:{enabled:document.getElementById('maintenanceEnabled').checked,message:document.getElementById('maintenanceMessage').value.trim().slice(0,300)||'Estamos preparando novidades para você!'}};
 const result=await supabaseClient.from('store_settings').update({content}).eq('id','main').select('id').single();
 status.textContent=result.error?'Erro: '+result.error.message:'Configuração salva! O aviso será aplicado aos visitantes.';
}
