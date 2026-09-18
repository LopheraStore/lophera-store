/* Lophera Studio V7.7 — ERP Hub */
(function(){
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function ensureTab(){
    if($('tab-erp'))return;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');if(!side||!main)return;
    const title=document.createElement('div');title.className='v3-side-title';title.textContent='INTEGRAÇÕES';side.appendChild(title);
    const btn=document.createElement('button');btn.className='side-link';btn.textContent='↔ ERP';btn.onclick=()=>{showTab('erp',btn);loadErpHub()};side.appendChild(btn);
    main.insertAdjacentHTML('beforeend',`
      <section id="tab-erp" class="admin-tab" style="display:none">
        <div class="v3-pagebar"><div><div class="small">INTEGRAÇÃO CENTRAL</div><h2>ERP Hub</h2><p>Produtos entram do ERP, pedidos saem para o ERP e nota/status voltam para a loja.</p></div><button class="btn" onclick="loadErpHub()">↻ Atualizar</button></div>
        <div id="erpStatus" class="v4-diagnostic">Carregando…</div>
        <div class="settings-grid" style="margin-top:18px">
          <div class="setting-card">
            <h3>Conexão do ERP</h3>
            <label>ERP / provedor
              <select id="erpProvider">
                <option value="">Escolha o ERP</option>
                <option value="bling">Bling</option>
                <option value="omie">Omie</option>
                <option value="olist_tiny">Olist Tiny</option>
                <option value="sige">SIGE</option>
                <option value="custom">API personalizada</option>
              </select>
            </label>
            <label>URL base da API<input id="erpBaseUrl" placeholder="https://..."></label>
            <label>Token / chave da API<input id="erpToken" type="password" autocomplete="new-password" placeholder="Só preencha para trocar/salvar"></label>
            <div class="checks"><label><input id="erpEnabled" type="checkbox"> Integração ativa</label></div>
            <button class="btn solid" onclick="saveErpSettings()">Salvar conexão</button>
          </div>
          <div class="setting-card">
            <h3>Automação</h3>
            <div class="checks"><label><input id="erpAutoOrders" type="checkbox"> Enviar pedidos pagos automaticamente</label><label><input id="erpAutoProducts" type="checkbox"> Sincronizar produtos automaticamente</label></div>
            <p class="muted">Deixe desligado enquanto estivermos na fase manual. A estrutura já aceita automação sem mudar os pedidos.</p>
            <button class="btn" onclick="queueAllPaidOrders()">Preparar pedidos pagos para o ERP</button>
          </div>
          <div class="setting-card">
            <h3>Retorno do ERP → Loja</h3>
            <p>Webhook preparado para receber emissão de NF-e, status de pedido, rastreio e atualização de produtos.</p>
            <label>Segredo do webhook<input id="erpWebhookSecret" type="password" placeholder="mínimo 12 caracteres"></label>
            <button class="btn" onclick="saveErpWebhookSecret()">Salvar segredo</button>
            <div class="v4-asset-note" style="margin-top:10px">Endpoint: <b>Supabase · erp-webhook</b>. O formato final será adaptado ao ERP escolhido.</div>
          </div>
          <div class="setting-card">
            <h3>Fluxo planejado</h3>
            <p><b>ERP → Produtos:</b> produto, preço, estoque, SKU e variações.</p>
            <p><b>Loja → ERP:</b> pedido pago com cliente, itens, SKU, endereço, frete e desconto.</p>
            <p><b>ERP → Loja:</b> nº/chave da nota, status, rastreio e entrega.</p>
          </div>
        </div>
        <div id="erpMsg" class="form-msg"></div>
      </section>`);
  }
  window.loadErpHub=async function(){
    ensureTab();
    const {data,error}=await supabaseClient.rpc('get_admin_erp_status');
    if(error){$('erpStatus').textContent='Erro: '+error.message;return}
    const i=data?.integration||{},s=i.settings||{};
    $('erpProvider').value=i.provider||'';$('erpBaseUrl').value=s.base_url||'';$('erpEnabled').checked=!!i.enabled;$('erpAutoOrders').checked=!!i.auto_export_paid_orders;$('erpAutoProducts').checked=!!i.auto_import_products;
    $('erpStatus').innerHTML='<b>Status ERP:</b> '+(i.enabled?'ativo':'aguardando conexão')+' · token '+(data?.token_saved?'salvo':'não salvo')+' · '+Number(data?.pending_orders||0)+' pedido(s) pagos aguardando · '+Number(data?.queued||0)+' na fila · '+Number(data?.imported_products||0)+' produto(s) vinculados ao ERP'+(data?.errors?' · '+data.errors+' erro(s)':'');
  };
  window.saveErpSettings=async function(){
    const msg=$('erpMsg');msg.textContent='Salvando…';
    const provider=$('erpProvider').value,settings={base_url:$('erpBaseUrl').value.trim()};
    const {error}=await supabaseClient.rpc('admin_save_erp_settings',{p_provider:provider,p_enabled:$('erpEnabled').checked,p_auto_export:$('erpAutoOrders').checked,p_auto_import:$('erpAutoProducts').checked,p_settings:settings});
    if(error){msg.textContent=error.message;return}
    const token=$('erpToken').value.trim();
    if(token){const t=await supabaseClient.rpc('set_erp_access_token',{p_token:token});if(t.error){msg.textContent=t.error.message;return}$('erpToken').value=''}
    msg.textContent='Configuração do ERP salva ♡';loadErpHub();
  };
  window.saveErpWebhookSecret=async function(){
    const secret=$('erpWebhookSecret').value.trim(),msg=$('erpMsg');
    const {error}=await supabaseClient.rpc('admin_set_erp_webhook_secret',{p_secret:secret});
    if(error){msg.textContent=error.message;return}
    $('erpWebhookSecret').value='';msg.textContent='Segredo do webhook salvo com segurança ♡';
  };
  window.queueAllPaidOrders=async function(){
    const msg=$('erpMsg');msg.textContent='Preparando pedidos…';
    const {data,error}=await supabaseClient.rpc('admin_queue_paid_orders_for_erp');
    msg.textContent=error?error.message:(Number(data||0)+' pedido(s) colocado(s) na fila do ERP.');loadErpHub();
  };
  document.addEventListener('DOMContentLoaded',ensureTab);
})();