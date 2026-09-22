/* Lophera Studio — Chat V5 */
(function(){
  const $ = id => document.getElementById(id);
  const safe = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let threads=[], selected=null, msgTimer=null, listTimer=null;

  function ago(iso){
    if(!iso) return '—';
    const m=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));
    if(m<1) return 'agora';
    if(m<60) return 'há '+m+' min';
    if(m<1440) return 'há '+Math.floor(m/60)+'h';
    return 'há '+Math.floor(m/1440)+'d';
  }
  function time(iso){
    try{return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return ''}
  }

  function ensure(){
    if($('tab-chat')) return true;
    const side=document.querySelector('.v3-sidebar'), main=document.querySelector('.v3-main');
    if(!side||!main) return false;

    const btn=document.createElement('button');
    btn.className='side-link'; btn.id='chatSideBtn';
    btn.innerHTML='💬 Chat <span id="chatUnreadBadge"></span>';
    btn.onclick=function(){ document.body.classList.add('lophera-chat-admin-mode'); showTab('chat',btn); loadChatThreads(true); };

    const visitor=[...side.querySelectorAll('.side-link')].find(x=>x.textContent.includes('Visitantes'));
    const rel=[...side.querySelectorAll('.v3-side-title')].find(x=>x.textContent==='RELACIONAMENTO');
    if(visitor) visitor.insertAdjacentElement('afterend',btn);
    else if(rel) rel.insertAdjacentElement('afterend',btn);
    else side.appendChild(btn);

    if(!side.dataset.chatModeBound){
      side.dataset.chatModeBound='1';
      side.addEventListener('click',function(e){
        const link=e.target.closest('.side-link');
        if(link && link.id!=='chatSideBtn') document.body.classList.remove('lophera-chat-admin-mode');
      });
    }

    main.insertAdjacentHTML('beforeend',
      '<section id="tab-chat" class="admin-tab" style="display:none">'+
      '<div class="v3-pagebar"><div><div class="small">RELACIONAMENTO</div><h2>Chat</h2><p>Converse, envie fotos e veja produtos/carrinhos compartilhados.</p></div>'+
      '<button class="btn" onclick="loadChatThreads(true)">↻ Atualizar</button></div>'+
      '<div class="admin-chat-shell"><div class="admin-chat-list" id="adminChatList"></div>'+
      '<div class="admin-chat-convo" id="adminChatConvo"><div class="admin-chat-placeholder">Selecione uma conversa ♡</div></div></div></section>'
    );

    const s=document.createElement('style');
    s.id='admin-chat-v5-style';
    s.textContent=
      '#chatUnreadBadge:not(:empty),.admin-chat-unread{background:#8e4c9f;color:#fff;border-radius:99px;padding:2px 5px;font-size:8px}'+
      '.v3-sidebar{overflow-y:auto!important;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable}'+
      'body.lophera-chat-admin-mode{overflow:hidden}'+
      'body.lophera-chat-admin-mode .v3-shell{height:calc(100vh - 72px);min-height:0!important;overflow:hidden}'+
      'body.lophera-chat-admin-mode .v3-main{height:calc(100vh - 72px);min-height:0;overflow:hidden;display:block}'+
      'body.lophera-chat-admin-mode #tab-chat{height:100%;min-height:0;display:flex!important;flex-direction:column;overflow:hidden}'+
      'body.lophera-chat-admin-mode #tab-chat>.v3-pagebar{flex:0 0 auto;margin-bottom:12px}'+
      '.admin-chat-shell{display:grid;grid-template-columns:340px minmax(0,1fr);grid-template-rows:minmax(0,1fr);height:min(68vh,720px);min-height:420px;border:1px solid #e1d6e4;border-radius:12px;overflow:hidden;background:#fff}body.lophera-chat-admin-mode .admin-chat-shell{flex:1 1 auto;height:auto;min-height:0;max-height:none}'+
      '.admin-chat-list{min-height:0;max-height:100%;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;border-right:1px solid #e8dfe9;background:#faf7fb}.admin-chat-card{padding:14px 15px;border:0;border-bottom:1px solid #ebe3ed;background:transparent;width:100%;text-align:left;cursor:pointer}.admin-chat-card.active,.admin-chat-card:hover{background:#efe5f2}'+
      '.admin-chat-card b{font-size:12px}.admin-chat-card small,.admin-chat-preview{font-size:8px;color:#7d7081}.admin-chat-preview{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.admin-chat-convo{display:grid;grid-template-rows:auto minmax(0,1fr) auto;min-width:0;min-height:0;overflow:hidden}.admin-chat-placeholder{display:grid;place-items:center;grid-row:1/-1;color:#8b7c8f;font:500 26px "Cormorant Garamond",serif}'+
      '.admin-chat-head{padding:14px 17px;border-bottom:1px solid #e9e0eb;display:flex;justify-content:space-between;gap:12px}.admin-chat-head h3{font:500 24px "Cormorant Garamond",serif;margin:0}.admin-chat-head p{font-size:9px;color:#7d7081;margin:3px 0 0}'+
      '.admin-chat-messages{min-height:0;max-height:100%;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding:17px;background:#fcfafc;display:flex;flex-direction:column;gap:9px}.admin-chat-msg{width:max-content;max-width:80%;padding:9px 11px;border-radius:12px;font-size:11px;line-height:1.55;word-break:break-word}.admin-chat-msg.from-customer{align-self:flex-start;background:#fff;border:1px solid #e1d7e4}.admin-chat-msg.from-admin{align-self:flex-end;background:#6c3f7d;color:#fff}'+
      '.admin-chat-msg small{display:block;font-size:7px;opacity:.62;margin-top:4px}.admin-chat-img{display:block;max-width:280px;max-height:260px;border-radius:9px;object-fit:cover;margin-bottom:5px}.admin-context{width:280px;max-width:100%;background:#fff;color:#3f3342;border:1px solid #ddd0e1;border-radius:9px;overflow:hidden;margin-bottom:5px}.admin-context img{width:100%;height:130px;object-fit:cover}.admin-context>div{padding:9px}.admin-context span{font-size:9px;color:#796b7d;display:block}.admin-cart-row{font-size:9px;padding:4px 0;border-bottom:1px solid #eee}'+
      '.admin-chat-compose{padding:10px;border-top:1px solid #e9e0eb}.admin-compose-row{display:grid;grid-template-columns:42px 1fr 100px;gap:8px}.admin-compose-row textarea{min-height:48px;resize:none;padding:9px;border:1px solid #d9cbdc}.admin-attach{border:1px solid #d9cbdc;background:#f3eaf5;border-radius:7px;cursor:pointer}.admin-chat-status{font-size:8px;color:#795f80;margin-top:5px;min-height:12px}'+
      '@media(max-width:1000px){.v3-sidebar{display:flex;flex-wrap:nowrap;width:100%;max-width:100vw;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;scrollbar-gutter:auto}.v3-sidebar .side-link{flex:0 0 auto;width:auto;white-space:nowrap}}'+\n      '@media(max-width:900px){body.lophera-chat-admin-mode{overflow:auto}body.lophera-chat-admin-mode .v3-shell,body.lophera-chat-admin-mode .v3-main{height:auto;overflow:visible}body.lophera-chat-admin-mode #tab-chat{height:auto;overflow:visible}.admin-chat-shell{grid-template-columns:1fr;height:auto;min-height:0}.admin-chat-list{max-height:240px}.admin-chat-convo{height:570px;min-height:0}}';
    document.head.appendChild(s);
    startListPoll();
    return true;
  }

  function renderList(){
    const root=$('adminChatList'); if(!root) return;
    root.innerHTML=threads.length ? threads.map(function(t){
      const unread=Number(t.unread_count||0);
      return '<button class="admin-chat-card '+(selected===t.id?'active':'')+'" onclick="openAdminChat(\''+t.id+'\')">'+
        '<b>'+safe(t.customer_name||t.customer_email||'Visitante')+'</b> '+(unread?'<span class="admin-chat-unread">'+unread+'</span>':'')+
        '<br><small>'+safe(t.customer_email||'Sem e-mail')+' · '+ago(t.last_message_at)+'</small>'+
        '<div class="admin-chat-preview">'+safe(t.last_message||'Conversa iniciada')+'</div></button>';
    }).join('') : '<div class="empty">Nenhuma conversa ainda.</div>';
    const total=threads.reduce((a,t)=>a+Number(t.unread_count||0),0);
    const badge=$('chatUnreadBadge'); if(badge) badge.textContent=total?String(total):'';
  }

  window.loadChatThreads=async function(){
    if(!ensure()) return;
    const {data,error}=await supabaseClient.rpc('get_admin_chat_threads');
    if(error) return;
    threads=Array.isArray(data)?data:[];
    renderList();
  };

  window.openAdminChat=async function(id){
    selected=id; renderList(); clearInterval(msgTimer);
    await loadMessages(true);
    msgTimer=setInterval(function(){ if(selected) loadMessages(false); },5000);
  };

  async function signedUrls(rows){
    const paths=[...new Set(rows.map(x=>x.attachment_path).filter(Boolean))];
    if(!paths.length) return {};
    const {data}=await supabaseClient.functions.invoke('chat-media',{body:{action:'view',thread_id:selected,paths:paths}});
    return data&&data.urls?data.urls:{};
  }

  function contextHtml(m){
    const p=m.context_payload||{};
    if(m.context_type==='product'){
      return '<div class="admin-context">'+
        (p.image?'<img src="'+safe(p.image)+'" alt="">':'')+
        '<div><b>'+safe(p.name||'Produto')+'</b><span>'+safe([p.color,p.size].filter(Boolean).join(' · '))+' · '+money(p.price)+'</span>'+
        (p.url?'<a href="'+safe(p.url)+'" target="_blank">Ver produto ↗</a>':'')+'</div></div>';
    }
    if(m.context_type==='cart'){
      const items=Array.isArray(p.items)?p.items:[];
      return '<div class="admin-context"><div><b>🛒 Carrinho compartilhado</b>'+
        items.slice(0,8).map(function(i){return '<div class="admin-cart-row">'+safe(i.name)+' · '+safe([i.color,i.size].filter(Boolean).join(' · '))+' · '+Number(i.qty||1)+' un.</div>';}).join('')+
        '<span><b>Total '+money(p.total)+'</b></span></div></div>';
    }
    return '';
  }

  async function loadMessages(markRead){
    const t=threads.find(x=>x.id===selected), root=$('adminChatConvo');
    if(!t||!root) return;
    const {data,error}=await supabaseClient.rpc('get_admin_chat_messages',{p_thread_id:selected});
    if(error) return;
    const rows=Array.isArray(data)?data:[];
    const urls=await signedUrls(rows);
    if(markRead){ await supabaseClient.rpc('admin_mark_chat_read',{p_thread_id:selected}); t.unread_count=0; renderList(); }

    const messages=rows.map(function(m){
      const image=(m.attachment_path&&urls[m.attachment_path])?'<a href="'+safe(urls[m.attachment_path])+'" target="_blank"><img class="admin-chat-img" src="'+safe(urls[m.attachment_path])+'" alt="'+safe(m.attachment_name||'Imagem')+'"></a>':'';
      return '<div class="admin-chat-msg '+(m.sender==='admin'?'from-admin':'from-customer')+'">'+contextHtml(m)+image+(m.body?safe(m.body):'')+'<small>'+time(m.created_at)+'</small></div>';
    }).join('');

    root.innerHTML=
      '<div class="admin-chat-head"><div><h3>'+safe(t.customer_name||'Visitante')+'</h3><p>'+safe(t.customer_email||'Sem e-mail')+'</p></div>'+
      '<button class="btn" onclick="toggleAdminChatStatus(\''+t.id+'\',\''+(t.status==='closed'?'open':'closed')+'\')">'+(t.status==='closed'?'Reabrir':'Encerrar')+'</button></div>'+
      '<div class="admin-chat-messages" id="adminChatMessages">'+(messages||'<div class="empty">Nenhuma mensagem.</div>')+'</div>'+
      '<div class="admin-chat-compose"><div class="admin-chat-status" id="adminChatStatus"></div><div class="admin-compose-row">'+
      '<button class="admin-attach" onclick="document.getElementById(\'adminChatFile\').click()">📎</button>'+
      '<input id="adminChatFile" type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="sendAdminImage(this)">'+
      '<textarea id="adminChatInput" maxlength="1500" placeholder="Responder cliente…"></textarea>'+
      '<button class="btn solid" onclick="sendAdminChat()">Enviar</button></div></div>';
    const box=$('adminChatMessages'); if(box) box.scrollTop=box.scrollHeight;
  }

  window.sendAdminChat=async function(){
    const input=$('adminChatInput'), body=input&&input.value.trim();
    if(!body) return;
    const status=$('adminChatStatus'); if(status) status.textContent='Enviando…';
    const {data,error}=await supabaseClient.rpc('admin_send_chat_message_v2',{
      p_thread_id:selected,p_body:body,p_attachment_path:null,p_attachment_name:null,p_attachment_mime:null,p_context_type:null,p_context_payload:null
    });
    if(error||!data||!data.ok){ if(status) status.textContent=(error&&error.message)||'Erro ao enviar.'; return; }
    input.value=''; if(status) status.textContent='';
    await loadMessages(false); await loadChatThreads();
  };

  window.sendAdminImage=async function(input){
    const file=input&&input.files&&input.files[0], status=$('adminChatStatus');
    if(!file) return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){ if(status) status.textContent='Use PNG, JPG ou WEBP.'; return; }
    if(file.size>8*1024*1024){ if(status) status.textContent='Imagem de até 8 MB.'; return; }
    try{
      if(status) status.textContent='Enviando imagem…';
      const {data,error}=await supabaseClient.functions.invoke('chat-media',{body:{action:'upload',thread_id:selected,content_type:file.type}});
      if(error||!data||!data.ok) throw new Error((data&&data.error)||(error&&error.message)||'Falha no upload');
      const up=await supabaseClient.storage.from('chat-media').uploadToSignedUrl(data.path,data.token,file,{contentType:file.type});
      if(up.error) throw up.error;
      const sent=await supabaseClient.rpc('admin_send_chat_message_v2',{
        p_thread_id:selected,p_body:'',p_attachment_path:data.path,p_attachment_name:file.name,p_attachment_mime:file.type,p_context_type:null,p_context_payload:null
      });
      if(sent.error) throw sent.error;
      input.value=''; if(status) status.textContent='';
      await loadMessages(false); await loadChatThreads();
    }catch(e){ if(status) status.textContent=e&&e.message?e.message:'Erro ao enviar imagem.'; }
  };

  window.toggleAdminChatStatus=async function(id,status){
    const {error}=await supabaseClient.rpc('admin_set_chat_status',{p_thread_id:id,p_status:status});
    if(error) return alert(error.message);
    const t=threads.find(x=>x.id===id); if(t) t.status=status;
    await loadMessages(false); renderList();
  };

  function startListPoll(){ clearInterval(listTimer); listTimer=setInterval(function(){loadChatThreads();},10000); }
  let tries=0;
  const boot=setInterval(function(){ tries++; if(ensure()||tries>60) clearInterval(boot); },100);
})();