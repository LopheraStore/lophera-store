/* Lophera Studio — atendimento por chat */
(function(){
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let threads=[],selected=null,msgTimer=null,listTimer=null;
  function ago(iso){
    if(!iso)return '—';const m=Math.max(0,Math.floor((Date.now()-new Date(iso))/60000));
    if(m<1)return'agora';if(m<60)return'há '+m+' min';const h=Math.floor(m/60);if(h<24)return'há '+h+'h';return'há '+Math.floor(h/24)+'d';
  }
  function time(iso){try{return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return''}}
  function ensure(){
    if($('tab-chat'))return true;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');if(!side||!main)return false;
    const b=document.createElement('button');b.className='side-link';b.id='chatSideBtn';b.innerHTML='💬 Chat <span id="chatUnreadBadge"></span>';b.onclick=()=>{showTab('chat',b);loadChatThreads(true)};
    const visitor=[...side.querySelectorAll('.side-link')].find(x=>x.textContent.includes('Visitantes'));
    const rel=[...side.querySelectorAll('.v3-side-title')].find(x=>x.textContent==='RELACIONAMENTO');
    if(visitor)visitor.insertAdjacentElement('afterend',b);else if(rel)rel.insertAdjacentElement('afterend',b);else side.appendChild(b);
    main.insertAdjacentHTML('beforeend',`
      <section id="tab-chat" class="admin-tab" style="display:none">
        <div class="v3-pagebar"><div><div class="small">RELACIONAMENTO</div><h2>Chat</h2><p>Converse com clientes e visitantes direto pelo Lophera Studio.</p></div><button class="btn" onclick="loadChatThreads(true)">↻ Atualizar</button></div>
        <div class="admin-chat-shell"><div class="admin-chat-list" id="adminChatList"><div class="empty">Carregando conversas…</div></div><div class="admin-chat-convo" id="adminChatConvo"><div class="admin-chat-placeholder">Selecione uma conversa ♡</div></div></div>
      </section>`);
    const s=document.createElement('style');s.id='admin-chat-style';s.textContent=`
      #chatUnreadBadge:not(:empty){display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:5px;border-radius:99px;background:#8e4c9f;color:#fff;font-size:8px}
      .admin-chat-shell{display:grid;grid-template-columns:340px minmax(0,1fr);height:68vh;min-height:520px;border:1px solid #e1d6e4;border-radius:12px;overflow:hidden;background:#fff}
      .admin-chat-list{overflow:auto;border-right:1px solid #e8dfe9;background:#faf7fb}.admin-chat-card{padding:14px 15px;border:0;border-bottom:1px solid #ebe3ed;background:transparent;width:100%;text-align:left;cursor:pointer;color:#3d3140}.admin-chat-card:hover,.admin-chat-card.active{background:#efe5f2}.admin-chat-card-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.admin-chat-card b{font-size:12px}.admin-chat-card small{font-size:8px;color:#8a7c8e}.admin-chat-preview{font-size:9px;color:#756879;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px}.admin-chat-unread{background:#6c3f7d;color:#fff;border-radius:99px;padding:3px 6px;font-size:8px}
      .admin-chat-convo{display:grid;grid-template-rows:auto 1fr auto;min-width:0}.admin-chat-placeholder{display:grid;place-items:center;height:100%;grid-row:1/-1;color:#8b7c8f;font:500 26px 'Cormorant Garamond',serif}
      .admin-chat-head{padding:14px 17px;border-bottom:1px solid #e9e0eb;display:flex;justify-content:space-between;align-items:center;gap:12px}.admin-chat-head h3{font:500 24px 'Cormorant Garamond',serif;margin:0}.admin-chat-head p{font-size:9px;color:#7d7081;margin:3px 0 0}.admin-chat-head-actions{display:flex;gap:7px}
      .admin-chat-messages{overflow:auto;padding:17px;background:#fcfafc;display:flex;flex-direction:column;gap:9px}.admin-chat-msg{max-width:78%;padding:9px 11px;border-radius:12px;font-size:11px;line-height:1.55}.admin-chat-msg.customer{align-self:flex-start;background:#fff;border:1px solid #e1d7e4;border-bottom-left-radius:4px}.admin-chat-msg.admin{align-self:flex-end;background:#6c3f7d;color:#fff;border-bottom-right-radius:4px}.admin-chat-msg small{display:block;font-size:7px;opacity:.62;margin-top:4px}
      .admin-chat-compose{padding:11px;border-top:1px solid #e9e0eb;background:#fff}.admin-chat-compose-row{display:flex;gap:8px}.admin-chat-compose textarea{flex:1;min-height:50px;max-height:100px;resize:none;padding:10px;border:1px solid #d9cbdc}.admin-chat-compose .btn{min-width:110px}.admin-chat-status{font-size:8px;color:#8a7d8e;margin-top:5px;min-height:12px}
      @media(max-width:900px){.admin-chat-shell{grid-template-columns:1fr;height:auto;min-height:0}.admin-chat-list{max-height:260px;border-right:0;border-bottom:1px solid #e8dfe9}.admin-chat-convo{height:570px}}
    `;document.head.appendChild(s);
    startListPoll();return true;
  }
  function renderList(){
    const root=$('adminChatList');if(!root)return;
    root.innerHTML=threads.length?threads.map(t=>'<button class="admin-chat-card '+(selected===t.id?'active':'')+'" onclick="openAdminChat(\''+t.id+'\')"><div class="admin-chat-card-top"><b>'+safe(t.customer_name||t.customer_email||'Visitante')+'</b><span>'+(Number(t.unread_count||0)?'<i class="admin-chat-unread">'+Number(t.unread_count)+'</i>':'')+'</span></div><small>'+safe(t.customer_email||'Sem e-mail')+' · '+ago(t.last_message_at)+' · '+(t.status==='closed'?'Encerrado':'Aberto')+'</small><div class="admin-chat-preview">'+safe(t.last_message||'Conversa iniciada')+'</div></button>').join(''):'<div class="empty">Nenhuma conversa ainda.</div>';
    const n=threads.reduce((a,t)=>a+Number(t.unread_count||0),0),badge=$('chatUnreadBadge');if(badge)badge.textContent=n?String(n):'';
  }
  window.loadChatThreads=async function(render=true){
    if(!ensure())return;
    const {data,error}=await supabaseClient.rpc('get_admin_chat_threads');
    if(error){if(render&&$('adminChatList'))$('adminChatList').innerHTML='<div class="empty">Erro: '+safe(error.message)+'</div>';return}
    threads=Array.isArray(data)?data:[];renderList();
  };
  window.openAdminChat=async function(id){
    selected=id;renderList();clearInterval(msgTimer);await loadAdminMessages();
    msgTimer=setInterval(()=>{if(selected)loadAdminMessages(false)},4000);
  };
  async function loadAdminMessages(mark=true){
    const t=threads.find(x=>x.id===selected),root=$('adminChatConvo');if(!t||!root)return;
    const {data,error}=await supabaseClient.rpc('get_admin_chat_messages',{p_thread_id:selected});
    if(error){root.innerHTML='<div class="admin-chat-placeholder">Erro: '+safe(error.message)+'</div>';return}
    if(mark){await supabaseClient.rpc('admin_mark_chat_read',{p_thread_id:selected});t.unread_count=0;renderList()}
    const rows=Array.isArray(data)?data:[];
    root.innerHTML='<div class="admin-chat-head"><div><h3>'+safe(t.customer_name||'Visitante')+'</h3><p>'+safe(t.customer_email||'Sem e-mail informado')+' · conversa '+(t.status==='closed'?'encerrada':'aberta')+'</p></div><div class="admin-chat-head-actions"><button class="btn" onclick="toggleAdminChatStatus(\''+t.id+'\',\''+(t.status==='closed'?'open':'closed')+'\')">'+(t.status==='closed'?'Reabrir':'Encerrar')+'</button></div></div><div class="admin-chat-messages" id="adminChatMessages">'+(rows.length?rows.map(m=>'<div class="admin-chat-msg '+(m.sender==='admin'?'admin':'customer')+'">'+safe(m.body)+'<small>'+time(m.created_at)+'</small></div>').join(''):'<div class="empty">Nenhuma mensagem.</div>')+'</div><div class="admin-chat-compose"><div class="admin-chat-compose-row"><textarea id="adminChatInput" maxlength="1500" placeholder="Responder cliente…"></textarea><button class="btn solid" onclick="sendAdminChat()">Enviar</button></div><div class="admin-chat-status" id="adminChatStatus"></div></div>';
    const box=$('adminChatMessages');if(box)box.scrollTop=box.scrollHeight;
    const inp=$('adminChatInput');inp?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAdminChat()}});
  }
  window.sendAdminChat=async function(){
    if(!selected)return;const inp=$('adminChatInput'),status=$('adminChatStatus'),body=inp?.value.trim();if(!body)return;
    status.textContent='Enviando…';
    const {data,error}=await supabaseClient.rpc('admin_send_chat_message',{p_thread_id:selected,p_body:body});
    if(error||!data?.ok){status.textContent=error?.message||'Não foi possível enviar.';return}
    inp.value='';status.textContent='';await loadAdminMessages(false);await loadChatThreads(false);
  };
  window.toggleAdminChatStatus=async function(id,status){
    const {error}=await supabaseClient.rpc('admin_set_chat_status',{p_thread_id:id,p_status:status});if(error)return alert(error.message);
    const t=threads.find(x=>x.id===id);if(t)t.status=status;await loadAdminMessages(false);renderList();
  };
  function startListPoll(){clearInterval(listTimer);listTimer=setInterval(()=>loadChatThreads(false),10000)}
  let n=0,t=setInterval(()=>{n++;if(ensure()||n>60)clearInterval(t)},100);
})();