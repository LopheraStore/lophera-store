/* Lophera Studio V7.8 — e-mails transacionais */
(function(){
  const $=id=>document.getElementById(id);
  function ensure(){
    if($('tab-email')) return;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main'); if(!side||!main) return;
    const title=[...side.querySelectorAll('.v3-side-title')].find(x=>x.textContent==='INTEGRAÇÕES');
    const btn=document.createElement('button');btn.className='side-link';btn.textContent='✉ E-mails';btn.onclick=()=>{showTab('email',btn);loadEmailSettings()};
    if(title&&title.nextSibling) side.insertBefore(btn,title.nextSibling); else side.appendChild(btn);
    main.insertAdjacentHTML('beforeend',`
      <section id="tab-email" class="admin-tab" style="display:none">
        <div class="v3-pagebar"><div><div class="small">COMUNICAÇÃO</div><h2>E-mails de pedido</h2><p>Envie atualizações profissionais diretamente pelo Studio.</p></div><button class="btn" onclick="loadEmailSettings()">↻ Atualizar</button></div>
        <div id="emailStatus" class="v4-diagnostic">Carregando…</div>
        <div class="settings-grid" style="margin-top:18px">
          <div class="setting-card">
            <h3>Remetente</h3>
            <label>Provedor<select id="emailProvider"><option value="gmail">Gmail</option><option value="resend">Resend</option></select></label>
            <label>Nome<input id="emailFromName" placeholder="Lophera Store"></label>
            <label>E-mail remetente<input id="emailFromEmail" type="email" placeholder="pedidos@lopherastore.com.br"></label>
            <label>Responder para<input id="emailReplyTo" type="email" placeholder="lopherastore@gmail.com"></label>
            <div class="checks"><label><input id="emailEnabled" type="checkbox"> Habilitar envios</label></div>
            <button class="btn solid" onclick="saveEmailSettings()">Salvar configurações</button>
          </div>
          <div class="setting-card">
            <h3>Credenciais protegidas</h3>
            <p>Para enviar diretamente de <b>lopherastore@gmail.com</b>, use Gmail com uma senha de app. Ela fica protegida no Vault do Supabase.</p>
            <label>Senha de app do Gmail<input id="gmailAppPassword" type="password" autocomplete="new-password" placeholder="xxxx xxxx xxxx xxxx"></label>
            <button class="btn solid" onclick="saveGmailPassword()">Salvar Gmail</button>
            <hr style="border:0;border-top:1px solid #eee;margin:18px 0">
            <p class="muted">Alternativa: Resend</p>
            <label>Resend API Key<input id="resendApiKey" type="password" autocomplete="new-password" placeholder="re_..."></label>
            <button class="btn" onclick="saveResendKey()">Salvar Resend</button>
            <p class="muted">Nenhuma credencial fica no código público.</p>
          </div>
          <div class="setting-card">
            <h3>Como usar</h3>
            <p>Em <b>VENDAS → Pedidos e vendas</b>, cada pedido tem o botão <b>✉ Enviar atualização</b>.</p>
            <p>O e-mail inclui status, itens, subtotal, desconto, frete, total, nota fiscal e rastreio quando disponíveis.</p>
          </div>
        </div>
        <div id="emailMsg" class="form-msg"></div>
      </section>`);
  }
  window.loadEmailSettings=async function(){
    ensure();
    const {data,error}=await supabaseClient.rpc('get_admin_email_status');
    if(error){$('emailStatus').textContent='Erro: '+error.message;return}
    const s=data?.settings||{};
    $('emailProvider').value=s.provider||'gmail';
    $('emailFromName').value=s.from_name||'Lophera Store';
    $('emailFromEmail').value=s.from_email||'';
    $('emailReplyTo').value=s.reply_to||'';
    $('emailEnabled').checked=!!s.enabled;
    $('emailStatus').innerHTML='<b>Status:</b> '+(s.enabled?'ativo':'desativado')+' · provedor '+(s.provider==='gmail'?'Gmail':'Resend')+' · credencial '+(data?.api_key_saved?'salva':'não configurada')+' · enviados '+Number(data?.sent_count||0)+' · falhas '+Number(data?.failed_count||0);
  };
  window.saveEmailSettings=async function(){
    const msg=$('emailMsg');msg.textContent='Salvando…';
    const {error}=await supabaseClient.rpc('admin_save_email_settings_v2',{
      p_enabled:$('emailEnabled').checked,
      p_provider:$('emailProvider').value,
      p_from_email:$('emailFromEmail').value.trim(),
      p_from_name:$('emailFromName').value.trim(),
      p_reply_to:$('emailReplyTo').value.trim()
    });
    msg.textContent=error?error.message:'Configurações de e-mail salvas ♡';
    if(!error) loadEmailSettings();
  };
  window.saveGmailPassword=async function(){
    const key=$('gmailAppPassword').value.trim(),msg=$('emailMsg');
    if(!key){msg.textContent='Cole a senha de app do Gmail.';return}
    const {error}=await supabaseClient.rpc('set_gmail_app_password',{p_key:key});
    msg.textContent=error?error.message:'Gmail conectado com segurança ♡';
    if(!error){$('gmailAppPassword').value='';loadEmailSettings()}
  };
  window.saveResendKey=async function(){
    const key=$('resendApiKey').value.trim(),msg=$('emailMsg');
    if(!key){msg.textContent='Cole a chave da Resend.';return}
    const {error}=await supabaseClient.rpc('set_resend_api_key',{p_key:key});
    msg.textContent=error?error.message:'Chave salva com segurança ♡';
    if(!error){$('resendApiKey').value='';loadEmailSettings()}
  };
  window.sendOrderUpdateEmail=async function(orderId){
    const message=prompt('Mensagem opcional para o cliente:\n\nEx.: Oi! Seu pedido já foi preparado e logo seguirá para transporte. ♡\n\nPode deixar vazio para enviar apenas o status atual.');
    if(message===null)return;
    const {data,error}=await supabaseClient.functions.invoke('send-order-email',{body:{order_id:orderId,message}});
    if(error)return alert(error.message);
    if(!data?.ok)return alert(data?.error||'Não foi possível enviar o e-mail.');
    alert('E-mail enviado para '+data.recipient+' ♡');
  };
  document.addEventListener('DOMContentLoaded',ensure);
})();