/* Lophera Studio: acompanhamento de produção (sem alterar pagamentos ou status do pedido). */
const productionLabels={aguardando_producao:'Aguardando produção',em_producao:'Em produção',pronto_envio:'Pronto para envio',enviado:'Enviado',concluido:'Concluído',cancelado:'Cancelado'};
const productionNext={aguardando_producao:'em_producao',em_producao:'pronto_envio',pronto_envio:'enviado',enviado:'concluido'};
async function loadProduction(){
 const root=document.getElementById('productionList');if(!root)return;
 root.textContent='Carregando pedidos...';
 const {data:orders,error}=await supabaseClient.from('orders').select('id,status,payment_status,created_at').order('created_at',{ascending:false}).limit(100);
 if(error){root.textContent='Erro ao carregar: '+error.message;return}
 const eligible=(orders||[]).filter(o=>o.status!=='cancelado'&&['aprovado','approved','pago'].includes(o.payment_status));
 if(!eligible.length){root.textContent='Nenhum pedido pago aguardando produção no momento.';return}
 const ids=eligible.map(o=>o.id);
 const [p,i]=await Promise.all([supabaseClient.from('order_production').select('*').in('order_id',ids),supabaseClient.from('order_items').select('order_id,product_name,color,size,quantity,customization_note').in('order_id',ids)]);
 if(p.error||i.error){root.textContent='Erro: '+(p.error||i.error).message;return}
 const records=new Map((p.data||[]).map(x=>[x.order_id,x]));
 root.replaceChildren();
 eligible.forEach(o=>{
  const record=records.get(o.id),status=record?.status||'aguardando_producao';
  const box=document.createElement('article');box.className='setting-card';box.style.marginBottom='16px';
  const title=document.createElement('h3');title.textContent='Pedido #'+o.id+' — '+(productionLabels[status]||status);box.append(title);
  (i.data||[]).filter(x=>x.order_id===o.id).forEach(item=>{const line=document.createElement('p');line.textContent=[item.quantity+'× '+item.product_name,item.color,item.size,item.customization_note].filter(Boolean).join(' · ');box.append(line)});
  const next=productionNext[status];
  if(next){const btn=document.createElement('button');btn.className='btn solid';btn.textContent='Avançar para: '+productionLabels[next];btn.onclick=()=>advanceProduction(o.id,status,next,!!record);box.append(btn)}
  root.append(box);
 });
}
async function advanceProduction(id,current,next,exists){
 if(!confirm('Atualizar produção do pedido #'+id+' para '+productionLabels[next]+'?'))return;
 const {data:{user}}=await supabaseClient.auth.getUser();
 const payload={order_id:id,status:next,updated_at:new Date().toISOString(),updated_by:user?.id||null};
 const q=exists?supabaseClient.from('order_production').update(payload).eq('order_id',id).eq('status',current):supabaseClient.from('order_production').insert(payload);
 const {error}=await q;
 if(error){alert('Não foi possível atualizar: '+error.message);return}
 await loadProduction();
}
function loadStudioAccess(){
 const el=document.getElementById('studioAccessInfo');if(!el)return;
 el.innerHTML='<p>Convide um colaborador para a equipe de produção. O acesso às demais funções do Estúdio continua restrito aos administradores.</p><form class="form" id="staffInviteForm"><label>E-mail do colaborador<input type="email" name="email" required autocomplete="off"></label><button class="btn solid" type="submit">Enviar convite</button><p class="form-msg" aria-live="polite"></p></form>';
 const form=document.getElementById('staffInviteForm');
 form.onsubmit=async e=>{
  e.preventDefault();const msg=form.querySelector('.form-msg');msg.textContent='Enviando convite...';
  const {data,error}=await supabaseClient.functions.invoke('studio-invite-staff',{body:{email:form.elements.email.value.trim(),role:'production'}});
  if(error||!data?.ok){msg.textContent='Não foi possível enviar o convite. Confira o e-mail e tente novamente.';return}
  msg.textContent='Convite enviado para '+data.email;form.reset();await listStudioStaff();
 };
}

async function listStudioStaff(){
 const root=document.getElementById('studioStaffList');if(!root)return;
 root.textContent='Carregando equipe...';
 const {data,error}=await supabaseClient.functions.invoke('studio-manage-staff',{body:{action:'list'}});
 if(error||!Array.isArray(data?.users)){root.textContent='Não foi possível consultar os acessos.';return}
 root.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Acessos da equipe';root.append(heading);
 if(!data.users.length){const p=document.createElement('p');p.textContent='Nenhum funcionário convidado ainda.';root.append(p);return}
 for(const u of data.users){
  const row=document.createElement('div');row.className='setting-card';row.style.marginBottom='12px';
  const label=document.createElement('p');label.textContent=u.email+' · '+(u.role==='production'?'Produção':u.role)+' · '+(u.active?'Ativo':'Desativado');row.append(label);
  if(u.role==='production'){
   const button=document.createElement('button');button.className='btn';button.textContent=u.active?'Desativar acesso':'Reativar acesso';
   button.onclick=async()=>{
    if(!confirm((u.active?'Desativar':'Reativar')+' o acesso de '+u.email+'?'))return;
    button.disabled=true;
    const {data:result,error:err}=await supabaseClient.functions.invoke('studio-manage-staff',{body:{action:'set_active',user_id:u.user_id,active:!u.active}});
    if(err||!result?.ok){alert('Não foi possível alterar o acesso.');button.disabled=false;return}
    await listStudioStaff();
   };
   row.append(button);
  }
  root.append(row);
 }
}
