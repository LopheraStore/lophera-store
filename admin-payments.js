/* Lophera Studio — integração Mercado Pago */
(function(){
  function inject(){
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');
    if(!side||!main||document.getElementById('tab-payments'))return;
    const title=document.createElement('div');title.className='v3-side-title';title.textContent='PAGAMENTOS';side.appendChild(title);
    const btn=document.createElement('button');btn.className='side-link';btn.innerHTML='💳 Mercado Pago';btn.onclick=()=>{showTab('payments',btn);loadPaymentStatus()};side.appendChild(btn);
    main.insertAdjacentHTML('beforeend',`<section id="tab-payments" class="admin-tab" style="display:none"><div class="v3-pagebar"><div><div class="small">CHECKOUT</div><h2>Mercado Pago</h2><p>Pix, cartão e boleto com checkout seguro.</p></div><button class="btn" onclick="loadPaymentStatus()">↻ Atualizar</button></div><div class="settings-grid"><div class="setting-card"><h3>Status da integração</h3><div id="mpStatus" class="v4-diagnostic">Verificando...</div><button class="btn" style="margin-top:12px" onclick="testMercadoPago()">Testar conexão</button></div><div class="setting-card"><h3>Conectar conta</h3><p>Cole aqui o <b>Access Token de produção</b> do Mercado Pago. Ele será guardado criptografado no Vault do Supabase e nunca será exibido novamente.</p><input id="mpAccessToken" type="password" autocomplete="new-password" placeholder="APP_USR-..."><button class="btn solid" style="margin-top:12px" onclick="saveMercadoPagoToken()">Salvar e conectar</button><div id="mpSaveMsg" class="form-msg"></div></div><div class="setting-card"><h3>Como obter</h3><p>Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção → Access Token.</p><p class="muted">Não use a Public Key neste campo.</p></div><div class="setting-card"><h3>Checkout da Lophera</h3><p>Ao finalizar o carrinho, o cliente será levado ao Mercado Pago para escolher Pix, cartão ou boleto e depois volta para a Lophera.</p><p class="muted">Os pedidos ficam com status de pagamento atualizado automaticamente pelo webhook.</p></div></div></section>`);
  }
  async function loadPaymentStatus(){
    const el=document.getElementById('mpStatus');if(!el)return;
    el.textContent='Verificando...';
    const {data,error}=await supabaseClient.rpc('get_payment_integration_status');
    if(error){el.textContent='Erro: '+error.message;return}
    el.innerHTML=data?.configured?'<b>✓ Credencial salva</b><br>Checkout Pro preparado. Clique em “Testar conexão”.':'<b>○ Ainda não conectado</b><br>Cole o Access Token de produção ao lado.';
  }
  async function saveMercadoPagoToken(){
    const input=document.getElementById('mpAccessToken'),msg=document.getElementById('mpSaveMsg');
    const token=input?.value?.trim();if(!token){msg.textContent='Cole o Access Token primeiro.';return}
    msg.textContent='Salvando com segurança...';
    const {error}=await supabaseClient.rpc('set_mercadopago_access_token',{p_token:token});
    if(error){msg.textContent='Erro: '+error.message;return}
    input.value='';msg.textContent='Credencial salva com segurança ♡';await loadPaymentStatus();await testMercadoPago();
  }
  async function testMercadoPago(){
    const el=document.getElementById('mpStatus');if(el)el.textContent='Testando conexão com o Mercado Pago...';
    const {data,error}=await supabaseClient.functions.invoke('mercadopago-admin-test',{body:{}});
    if(error){if(el)el.textContent='Falha no teste: '+error.message;return}
    if(data?.ok){if(el)el.innerHTML=`<b>✓ Mercado Pago conectado</b><br>Conta reconhecida${data.nickname?' como '+data.nickname:''}.`}
    else if(el)el.textContent='Falha: '+(data?.error||'credencial recusada');
  }
  window.loadPaymentStatus=loadPaymentStatus;
  window.saveMercadoPagoToken=saveMercadoPagoToken;
  window.testMercadoPago=testMercadoPago;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,100));
})();
