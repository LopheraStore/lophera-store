/* Lophera Studio — Melhor Envio */
(function(){
  const $=id=>document.getElementById(id);
  function inject(){
    const tab=$('tab-shipping');if(!tab||$('meIntegrationCard'))return;
    const card=document.createElement('div');card.id='meIntegrationCard';card.className='setting-card';card.style.marginTop='24px';
    card.innerHTML='<div class="small">FRETE AUTOMÁTICO</div><h3>Melhor Envio</h3><p>Conecte sua conta para calcular transportadoras, preço e prazo automaticamente no checkout.</p><div id="meStatus" class="v4-diagnostic">Verificando...</div><div class="form-two" style="margin-top:14px"><label>Ambiente<select id="meEnvironment"><option value="sandbox">Sandbox · testes</option><option value="production">Produção · fretes reais</option></select></label><label>Access Token OAuth<input id="meAccessToken" type="password" autocomplete="new-password" placeholder="Cole o token do Melhor Envio"></label></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn solid" type="button" onclick="saveMelhorEnvioIntegration()">Salvar integração</button><button class="btn" type="button" onclick="loadMelhorEnvioStatus()">↻ Atualizar status</button></div><div id="meMsg" class="form-msg"></div><p class="muted" style="margin-top:14px">O token fica criptografado no Vault do Supabase e nunca é colocado no código público. Para cotar, mantenha também o CEP de origem e as medidas padrão preenchidos acima.</p>';
    tab.appendChild(card);loadMelhorEnvioStatus();
  }
  window.loadMelhorEnvioStatus=async function(){
    const el=$('meStatus');if(!el)return;el.textContent='Verificando...';
    const [{data:status,error},{data:settings}]=await Promise.all([
      supabaseClient.rpc('get_melhor_envio_integration_status'),
      supabaseClient.from('store_settings').select('shipping_settings,content').eq('id','main').maybeSingle()
    ]);
    const shipping=settings?.shipping_settings||settings?.content?.shipping||{};
    if($('meEnvironment'))$('meEnvironment').value=shipping?.melhor_envio_environment==='production'?'production':'sandbox';
    if(error){el.textContent='Erro: '+error.message;return}
    const origin=String(shipping?.origin_zip||'').replace(/\D/g,'');
    el.innerHTML=(status?.configured?'<b>✓ Token salvo com segurança</b>':'<b>○ Token ainda não configurado</b>')+'<br>Ambiente: '+(($('meEnvironment')?.value||'sandbox')==='production'?'Produção':'Sandbox')+' · CEP de origem: '+(origin||'não informado');
  };
  window.saveMelhorEnvioIntegration=async function(){
    const msg=$('meMsg'),token=$('meAccessToken')?.value?.trim(),env=$('meEnvironment')?.value||'sandbox';
    msg.textContent='Salvando...';
    try{
      if(token){
        const {error}=await supabaseClient.rpc('set_melhor_envio_access_token',{p_token:token});
        if(error)throw error;
      }
      const {data:row,error:readError}=await supabaseClient.from('store_settings').select('shipping_settings,content').eq('id','main').single();
      if(readError)throw readError;
      const shipping={...(row.shipping_settings||row.content?.shipping||{}),melhor_envio_environment:env};
      const content={...(row.content||{}),shipping};
      const {error:updateError}=await supabaseClient.from('store_settings').update({shipping_settings:shipping,content,updated_at:new Date().toISOString()}).eq('id','main');
      if(updateError)throw updateError;
      if($('meAccessToken'))$('meAccessToken').value='';
      msg.textContent='Integração do Melhor Envio salva ♡';
      await loadMelhorEnvioStatus();
    }catch(e){msg.textContent='Erro: '+(e?.message||'não foi possível salvar')}
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,450));
})();