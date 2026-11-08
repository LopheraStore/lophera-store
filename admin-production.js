/* Lophera Studio: acompanhamento de produção (sem alterar pagamentos ou status do pedido). */
const productionLabels={aguardando_producao:'Aguardando produção',em_producao:'Em produção',pronto_envio:'Pronto para envio',enviado:'Enviado',concluido:'Concluído',cancelado:'Cancelado'};
const productionNext={aguardando_producao:'em_producao',em_producao:'pronto_envio',pronto_envio:'enviado',enviado:'concluido'};
async function loadProduction(){
 const root=document.getElementById('productionList');if(!root)return;
 root.textContent='Carregando pedidos de produção...';
 const {data,error}=await supabaseClient.functions.invoke('studio-production-staff',{body:{action:'list'}});
 if(error||!Array.isArray(data?.orders)){root.textContent='Não foi possível carregar a produção.';return}
 root.replaceChildren();
 if(!data.orders.length){root.textContent='Nenhum pedido pago disponível para produção.';return}
 for(const order of data.orders){
  const state=order.production_status;
  const card=document.createElement('article');card.className='setting-card';card.style.marginBottom='16px';
  const title=document.createElement('h3');title.textContent='Pedido #'+order.id+' — '+(productionLabels[state]||state);card.append(title);
  for(const item of order.items){
   const line=document.createElement('p');line.textContent=[item.quantity+'× '+item.product_name,item.color,item.size,item.customization_filename?'Arte: '+item.customization_filename:'',item.customization_note?'Obs.: '+item.customization_note:''].filter(Boolean).join(' · ');card.append(line);
  }
  const next=productionNext[state];
  if(next){
   const button=document.createElement('button');button.className='btn solid';button.textContent='Avançar para: '+productionLabels[next];
   button.onclick=async()=>{if(!confirm('Avançar pedido #'+order.id+' para '+productionLabels[next]+'?'))return;button.disabled=true;const result=await supabaseClient.functions.invoke('studio-production-staff',{body:{action:'advance',order_id:order.id,current:state,next}});if(result.error||!result.data?.ok){alert(result.data?.error||'Não foi possível atualizar o pedido.');button.disabled=false;return}await loadProduction()};
   card.append(button);
  }
  root.append(card);
 }
}
function loadStudioAccess(){
 const el=document.getElementById('studioAccessInfo');if(!el)return;
 el.innerHTML='<p>Convide um colaborador para a equipe de produção. O acesso às demais funções do Estúdio continua restrito aos administradores.</p><form class="form" id="staffInviteForm"><label>E-mail do colaborador<input type="email" name="email" required autocomplete="off"></label><button class="btn solid" type="submit">Enviar convite</button><p class="form-msg" aria-live="polite"></p></form>';
 const list=document.createElement('div');list.id='studioStaffList';el.append(list);listStudioStaff();
 const form=document.getElementById('staffInviteForm');
 form.onsubmit=async e=>{
  e.preventDefault();const msg=form.querySelector('.form-msg');msg.textContent='Enviando convite...';
  const {data,error}=await supabaseClient.functions.invoke('studio-invite-staff',{body:{email:form.elements.email.value.trim(),role:'production'}});
  if(error||!data?.ok){const detail=data?.error||data?.message||error?.context?.message||error?.message||'Falha desconhecida';msg.textContent='Convite não enviado: '+detail+'. Se o e-mail já tem conta, pode ser necessário conceder acesso à conta existente.';return}
  msg.textContent=data.existing_account?'Acesso à produção liberado para a conta existente: '+data.email:'Convite enviado para '+data.email;form.reset();await listStudioStaff();
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
