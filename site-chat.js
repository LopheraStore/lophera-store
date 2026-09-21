/* Lophera Store — chat de atendimento */
(function(){
  if(window.__lopheraChatLoaded)return;
  window.__lopheraChatLoaded=true;
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const META_KEY='lophera_chat_meta';
  let meta=null,poll=null,busy=false,opened=false;

  function readMeta(){
    try{
      const m=JSON.parse(localStorage.getItem(META_KEY)||'null');
      if(m?.id&&m?.token)return m;
    }catch(_){}
    const m={id:crypto.randomUUID(),token:crypto.randomUUID(),name:'',email:''};
    localStorage.setItem(META_KEY,JSON.stringify(m));
    return m;
  }
  function saveMeta(){localStorage.setItem(META_KEY,JSON.stringify(meta))}
  function time(iso){
    try{return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}catch(_){return''}
  }
  function css(){
    if($('lophera-chat-style'))return;
    const s=document.createElement('style');s.id='lophera-chat-style';s.textContent=`
      .lp-chat-launch{position:fixed;right:22px;bottom:22px;z-index:990;width:58px;height:58px;border:0;border-radius:50%;background:#6c3f7d;color:#fff;box-shadow:0 12px 35px #3b244c42;cursor:pointer;font-size:23px;display:grid;place-items:center;transition:.2s}
      .lp-chat-launch:hover{transform:translateY(-2px) scale(1.03);background:#593267}
      .lp-chat-panel{position:fixed;right:22px;bottom:92px;z-index:991;width:min(370px,calc(100vw - 28px));height:min(570px,calc(100vh - 120px));background:#fff;border:1px solid #dccfe1;border-radius:18px;box-shadow:0 24px 70px #28152f38;display:none;overflow:hidden;font-family:Montserrat,Arial,sans-serif}
      .lp-chat-panel.open{display:grid;grid-template-rows:auto 1fr auto}
      .lp-chat-head{background:#302333;color:#fff;padding:17px 18px;display:flex;align-items:center;gap:12px}
      .lp-chat-brand{width:38px;height:38px;border-radius:50%;background:#f3e8f6;color:#5f3970;display:grid;place-items:center;font:600 18px 'Cormorant Garamond',serif}
      .lp-chat-head b{display:block;font:600 18px 'Cormorant Garamond',serif;letter-spacing:.4px}.lp-chat-head small{display:block;font-size:9px;opacity:.72;margin-top:2px}
      .lp-chat-close{margin-left:auto;border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      .lp-chat-body{overflow:auto;padding:15px;background:#fbf8fc}
      .lp-chat-welcome{height:100%;display:grid;place-items:center;text-align:center;padding:18px}.lp-chat-welcome-inner{max-width:280px}
      .lp-chat-heart{font:44px 'Cormorant Garamond',serif;color:#7b4a8a}.lp-chat-welcome h3{font:500 25px 'Cormorant Garamond',serif;margin:3px 0 8px;color:#4b3153}.lp-chat-welcome p{font-size:10px;line-height:1.7;color:#746778;margin:0 0 14px}
      .lp-chat-welcome input{width:100%;padding:11px 12px;border:1px solid #d9cbdc;background:#fff;margin:5px 0;font-size:11px;border-radius:8px}
      .lp-chat-welcome .btn{width:100%;margin-top:8px;border-radius:8px}.lp-chat-note{font-size:8px!important;color:#998c9c!important;margin-top:8px!important}
      .lp-chat-msgs{display:flex;flex-direction:column;gap:9px}.lp-chat-msg{max-width:82%;padding:9px 11px;border-radius:13px;font-size:11px;line-height:1.55;word-break:break-word}
      .lp-chat-msg.customer{align-self:flex-end;background:#6c3f7d;color:#fff;border-bottom-right-radius:4px}.lp-chat-msg.admin{align-self:flex-start;background:#fff;border:1px solid #e1d7e4;color:#3f3342;border-bottom-left-radius:4px}
      .lp-chat-msg small{display:block;font-size:7px;opacity:.62;margin-top:4px;text-align:right}.lp-chat-empty{text-align:center;color:#8a7b8f;font-size:10px;padding:36px 15px}
      .lp-chat-compose{border-top:1px solid #eadfec;background:#fff;padding:10px}.lp-chat-compose-row{display:flex;gap:7px}.lp-chat-compose textarea{flex:1;resize:none;min-height:42px;max-height:95px;border:1px solid #d9cbdc;border-radius:10px;padding:10px;font:11px Montserrat,Arial,sans-serif;outline:none}.lp-chat-compose textarea:focus{border-color:#9b78a8}
      .lp-chat-send{width:44px;border:0;border-radius:10px;background:#6c3f7d;color:#fff;cursor:pointer;font-size:17px}.lp-chat-send:disabled{opacity:.45}
      .lp-chat-footnote{text-align:center;font-size:7px;color:#9a8d9d;margin-top:6px}.lp-chat-error{color:#9b3d57;font-size:9px;margin-top:6px;min-height:12px}
      @media(max-width:560px){.lp-chat-launch{right:14px;bottom:14px}.lp-chat-panel{right:14px;bottom:82px;height:min(560px,calc(100vh - 105px))}}
    `;document.head.appendChild(s);
  }
  function shell(){
    if($('lopheraChatPanel'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <button class="lp-chat-launch" id="lopheraChatLaunch" aria-label="Abrir atendimento" title="Fale com a Lophera">💬</button>
      <section class="lp-chat-panel" id="lopheraChatPanel" aria-label="Atendimento Lophera">
        <div class="lp-chat-head"><div class="lp-chat-brand">L</div><div><b>Lophera ♡</b><small>Fale com a gente</small></div><button class="lp-chat-close" id="lopheraChatClose" aria-label="Fechar">×</button></div>
        <div class="lp-chat-body" id="lopheraChatBody"><div class="lp-chat-empty">Abrindo atendimento…</div></div>
        <div class="lp-chat-compose" id="lopheraChatCompose" style="display:none">
          <div class="lp-chat-compose-row"><textarea id="lopheraChatInput" maxlength="1500" placeholder="Digite sua mensagem…"></textarea><button class="lp-chat-send" id="lopheraChatSend" aria-label="Enviar">➤</button></div>
          <div class="lp-chat-footnote">Respondemos por aqui pelo Lophera Studio.</div><div class="lp-chat-error" id="lopheraChatError"></div>
        </div>
      </section>`);
    $('lopheraChatLaunch').onclick=toggle;
    $('lopheraChatClose').onclick=()=>toggle(false);
    $('lopheraChatSend').onclick=send;
    $('lopheraChatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
  }
  async function accountInfo(){
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session)return {};
      const {data:p}=await supabaseClient.from('customer_profiles').select('full_name').eq('user_id',session.user.id).maybeSingle();
      return {name:p?.full_name||session.user.user_metadata?.full_name||'',email:session.user.email||''};
    }catch(_){return{}}
  }
  async function ensureThread(force=false){
    meta=meta||readMeta();
    const acct=await accountInfo();
    if(acct.name&&!meta.name)meta.name=acct.name;
    if(acct.email&&!meta.email)meta.email=acct.email;
    saveMeta();
    if(!force&&!meta.name&&!meta.email)return false;
    const {data,error}=await supabaseClient.rpc('open_chat_thread',{p_thread_id:meta.id,p_client_token:meta.token,p_name:meta.name||null,p_email:meta.email||null});
    if(error)throw error;
    return !!data?.id;
  }
  function welcome(){
    $('lopheraChatCompose').style.display='none';
    $('lopheraChatBody').innerHTML=`<div class="lp-chat-welcome"><div class="lp-chat-welcome-inner"><div class="lp-chat-heart">♡</div><h3>Oii! Como podemos ajudar?</h3><p>Deixe seu primeiro nome para começar. O e-mail é opcional, mas ajuda caso você feche a página.</p><input id="lpChatName" maxlength="80" placeholder="Seu nome"><input id="lpChatEmail" maxlength="160" type="email" placeholder="Seu e-mail (opcional)"><button class="btn solid" id="lpChatStart">Começar conversa</button><div class="lp-chat-error" id="lpChatStartError"></div><p class="lp-chat-note">As mensagens ficam salvas para o atendimento da sua solicitação.</p></div></div>`;
    $('lpChatName').value=meta?.name||'';$('lpChatEmail').value=meta?.email||'';
    $('lpChatStart').onclick=start;
  }
  async function start(){
    const name=$('lpChatName').value.trim(),email=$('lpChatEmail').value.trim(),err=$('lpChatStartError');
    if(!name){err.textContent='Conta seu primeiro nome pra gente ♡';return}
    if(email&&!/^\S+@\S+\.\S+$/.test(email)){err.textContent='Confira o e-mail informado.';return}
    meta.name=name;meta.email=email;saveMeta();err.textContent='';
    $('lpChatStart').disabled=true;
    try{await ensureThread(true);await loadMessages();startPoll()}catch(e){err.textContent=e?.message||'Não foi possível abrir o chat.';$('lpChatStart').disabled=false}
  }
  async function loadMessages(){
    if(!meta?.id||!meta?.token)return;
    const {data,error}=await supabaseClient.rpc('get_chat_messages',{p_thread_id:meta.id,p_client_token:meta.token});
    if(error)throw error;
    const rows=Array.isArray(data)?data:[];
    $('lopheraChatCompose').style.display='block';
    $('lopheraChatBody').innerHTML=rows.length?'<div class="lp-chat-msgs">'+rows.map(m=>'<div class="lp-chat-msg '+(m.sender==='admin'?'admin':'customer')+'">'+safe(m.body)+'<small>'+time(m.created_at)+'</small></div>').join('')+'</div>':'<div class="lp-chat-empty">Pode mandar sua mensagem 💜<br>Vamos responder por aqui.</div>';
    const body=$('lopheraChatBody');body.scrollTop=body.scrollHeight;
  }
  async function send(){
    if(busy)return;
    const input=$('lopheraChatInput'),err=$('lopheraChatError'),body=input?.value.trim();
    if(!body)return;
    busy=true;$('lopheraChatSend').disabled=true;err.textContent='';
    try{
      await ensureThread(true);
      const {data,error}=await supabaseClient.rpc('send_chat_message',{p_thread_id:meta.id,p_client_token:meta.token,p_body:body});
      if(error)throw error;if(!data?.ok)throw new Error('Não foi possível enviar.');
      input.value='';await loadMessages();
    }catch(e){err.textContent=e?.message||'Não foi possível enviar a mensagem.'}
    finally{busy=false;$('lopheraChatSend').disabled=false;input?.focus()}
  }
  function startPoll(){clearInterval(poll);poll=setInterval(()=>{if(opened)loadMessages().catch(()=>{})},5000)}
  async function toggle(force){
    const panel=$('lopheraChatPanel');opened=typeof force==='boolean'?force:!panel.classList.contains('open');
    panel.classList.toggle('open',opened);if(!opened){clearInterval(poll);return}
    meta=readMeta();
    try{
      const ok=await ensureThread(false);
      if(ok){await loadMessages();startPoll()}else welcome();
    }catch(_){welcome()}
  }
  function init(){if(typeof supabaseClient==='undefined')return;css();shell();meta=readMeta()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();