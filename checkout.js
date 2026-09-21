const $=id=>document.getElementById(id);
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
let currentUser=null,selectedShipping=null,shippingQuotes=[],appliedCoupon=null;

function renderSummary(){
  const box=$('checkoutItems');
  if(!cart.length){box.innerHTML='<div class="empty">Seu carrinho está vazio.</div>';return}
  box.innerHTML=cart.map(x=>'<div class="checkout-item"><img src="'+safe(x.image||'assets/hero.svg')+'"><div><b>'+safe(x.name)+'</b><small>'+safe([x.color,x.size].filter(Boolean).join(' · '))+' · Qtd. '+Number(x.qty||1)+(x.customization_path?'<br>🎨 Arte: '+safe(x.customization_filename||'imagem anexada')+(x.customization_note?'<br>Obs.: '+safe(x.customization_note):''):'')+'</small></div><strong>'+money(Number(x.price||0)*Number(x.qty||1))+'</strong></div>').join('');
  const subtotal=cart.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||1),0);
  $('checkoutSubtotal').textContent=money(subtotal);updateTotals();
}

async function loadProfile(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){location.href='conta.html';return}
  currentUser=session.user;$('co_email').value=session.user.email||'';
  const {data}=await supabaseClient.from('customer_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
  if(!data)return;
  $('co_name').value=data.full_name||'';$('co_phone').value=data.phone||'';$('co_cpf').value=data.cpf||'';$('co_zip').value=data.zip_code||'';$('co_state').value=data.state||'';$('co_city').value=data.city||'';$('co_neighborhood').value=data.neighborhood||'';$('co_address').value=data.address||'';$('co_number').value=data.address_number||'';$('co_complement').value=data.complement||'';$('co_reference').value=data.reference_point||'';
}

function cartSubtotal(){return cart.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||1),0)}
function updateTotals(){
  const subtotal=cartSubtotal(),discount=Number(appliedCoupon?.discount_amount||0),freight=selectedShipping?Number(selectedShipping.customer_price||0):0;
  $('checkoutSubtotal').textContent=money(subtotal);
  $('checkoutShipping').textContent=selectedShipping?(selectedShipping.free_shipping?'Grátis':money(freight)):'A calcular';
  $('checkoutTotal').textContent=money(Math.max(0,subtotal-discount)+freight);
  const line=$('discountLine');
  if(appliedCoupon){
    line.style.display='flex';
    $('checkoutDiscount').textContent='- '+money(discount);
    $('discountCode').textContent='('+appliedCoupon.code+')';
  }else{
    line.style.display='none';
    $('checkoutDiscount').textContent='- R$ 0,00';
    $('discountCode').textContent='';
  }
}
function renderShippingOptions(){
  const box=$('shippingOptions');
  if(!shippingQuotes.length){box.innerHTML='';return}
  box.innerHTML=shippingQuotes.map(q=>'<label class="shipping-option '+(selectedShipping?.service_id===q.service_id?'selected':'')+'"><input type="radio" name="shipping" value="'+safe(q.service_id)+'" '+(selectedShipping?.service_id===q.service_id?'checked':'')+'><div><b>'+safe(q.company)+' · '+safe(q.name)+'</b><span>'+(q.delivery_time?('Prazo estimado: '+q.delivery_time+' dia'+(q.delivery_time===1?'':'s')+' útil'+(q.delivery_time===1?'':'e')+'s'):'Prazo informado pela transportadora')+'</span></div><strong>'+(q.free_shipping?'GRÁTIS':money(q.customer_price))+'</strong></label>').join('');
  box.querySelectorAll('input[name="shipping"]').forEach(r=>r.addEventListener('change',()=>{selectedShipping=shippingQuotes.find(q=>q.service_id===r.value)||null;renderShippingOptions();updateTotals()}));
}
async function applyCoupon(){
  const input=$('couponCode'),btn=$('applyCouponBtn'),msg=$('couponMsg');
  const code=input.value.trim().toUpperCase();
  if(!code){msg.textContent='Digite um cupom.';msg.className='coupon-msg error';return}
  btn.disabled=true;btn.textContent='Aplicando...';msg.textContent='';
  try{
    const items=cart.map(x=>({product_id:x.id,variant_id:x.variant_id,quantity:x.qty}));
    const {data,error}=await supabaseClient.functions.invoke('validate-coupon',{body:{code,items}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||'Cupom inválido.');
    appliedCoupon=data;
    input.value=data.code;
    input.disabled=true;
    btn.textContent='Remover';
    btn.onclick=removeCoupon;
    msg.textContent='Cupom aplicado ♡ Você economizou '+money(data.discount_amount)+'.';
    msg.className='coupon-msg success';
    updateTotals();
  }catch(err){
    appliedCoupon=null;
    msg.textContent=err?.message||'Não foi possível aplicar o cupom.';
    msg.className='coupon-msg error';
    updateTotals();
  }finally{
    btn.disabled=false;
    if(!appliedCoupon){btn.textContent='Aplicar';btn.onclick=applyCoupon}
  }
}
function removeCoupon(){
  appliedCoupon=null;
  const input=$('couponCode'),btn=$('applyCouponBtn'),msg=$('couponMsg');
  input.disabled=false;input.value='';
  btn.textContent='Aplicar';btn.onclick=applyCoupon;
  msg.textContent='Cupom removido.';msg.className='coupon-msg';
  updateTotals();
}
window.applyCoupon=applyCoupon;
window.removeCoupon=removeCoupon;

async function quoteShipping(){
  const cep=$('co_zip').value.replace(/\D/g,'');
  selectedShipping=null;shippingQuotes=[];renderShippingOptions();updateTotals();
  if(cep.length!==8){
    $('shippingStatus').innerHTML='<div><b>Informe um CEP válido</b><span>Precisamos de 8 números para calcular o envio.</span></div><strong>A calcular</strong>';
    return;
  }
  $('shippingStatus').innerHTML='<div><b>Calculando frete…</b><span>Consultando as transportadoras disponíveis.</span></div><strong>...</strong>';
  const items=cart.map(x=>({product_id:x.id,variant_id:x.variant_id,quantity:x.qty}));
  const {data,error}=await supabaseClient.functions.invoke('melhorenvio-quote',{body:{postal_code:cep,items}});
  if(error||data?.error){
    const msg=data?.error||error?.message||'Não foi possível calcular o frete.';
    $('shippingStatus').innerHTML='<div><b>Frete indisponível</b><span>'+safe(msg)+'</span></div><strong>—</strong>';
    return;
  }
  shippingQuotes=Array.isArray(data?.quotes)?data.quotes:[];
  if(!shippingQuotes.length){
    $('shippingStatus').innerHTML='<div><b>Nenhuma opção encontrada</b><span>Confira o CEP e tente novamente.</span></div><strong>—</strong>';return;
  }
  selectedShipping=shippingQuotes[0];
  $('shippingStatus').innerHTML='<div><b>'+shippingQuotes.length+' opção'+(shippingQuotes.length>1?'ões':'')+' de entrega</b><span>Escolha abaixo a que preferir.'+(data?.free_shipping?' Seu pedido ganhou frete grátis ♡':'')+'</span></div><strong>Melhor Envio</strong>';
  renderShippingOptions();updateTotals();
}
async function lookupCep(){
  const cep=$('co_zip').value.replace(/\D/g,'');
  if(cep.length!==8){await quoteShipping();return}
  try{
    const r=await fetch('https://viacep.com.br/ws/'+cep+'/json/');
    const d=await r.json();if(!d.erro){
      if(!$('co_address').value)$('co_address').value=d.logradouro||'';
      if(!$('co_neighborhood').value)$('co_neighborhood').value=d.bairro||'';
      if(!$('co_city').value)$('co_city').value=d.localidade||'';
      if(!$('co_state').value)$('co_state').value=d.uf||'';
    }
  }catch(_){}
  await quoteShipping();
}

function profilePayload(){
  const v=id=>$(id).value.trim();
  return {user_id:currentUser.id,full_name:v('co_name'),phone:v('co_phone'),cpf:v('co_cpf'),zip_code:v('co_zip'),address:v('co_address'),address_number:v('co_number'),complement:v('co_complement')||null,neighborhood:v('co_neighborhood'),city:v('co_city'),state:v('co_state').toUpperCase(),reference_point:v('co_reference')||null,updated_at:new Date().toISOString()};
}
function shippingPayload(){
  const p=profilePayload();
  return {full_name:p.full_name,phone:p.phone,cpf:p.cpf,email:currentUser.email||'',zip_code:p.zip_code,address:p.address,address_number:p.address_number,complement:p.complement,neighborhood:p.neighborhood,city:p.city,state:p.state,reference_point:p.reference_point};
}

async function finalize(e){
  e.preventDefault();
  const btn=$('payContinueBtn'),msg=$('checkoutMsg');
  if(!cart.length){msg.textContent='Seu carrinho está vazio.';return}
  btn.disabled=true;btn.textContent='Preparando pagamento...';msg.textContent='';
  try{
    const profile=profilePayload();
    const {error:pe}=await supabaseClient.from('customer_profiles').upsert(profile,{onConflict:'user_id'});
    if(pe)throw pe;
    if(!selectedShipping)throw new Error('Escolha uma opção de frete antes de continuar.');
    const items=cart.map(x=>({product_id:x.id,variant_id:x.variant_id,quantity:x.qty,customization_path:x.customization_path||null,customization_filename:x.customization_filename||null,customization_note:x.customization_note||null}));
    let cartId=null;
    try{
      const meta=JSON.parse(localStorage.getItem('lophera_cart_meta')||'null');
      if(meta?.id&&meta?.token){
        const mark=await supabaseClient.rpc('mark_cart_checkout_started',{p_cart_id:meta.id,p_client_token:meta.token});
        if(!mark.error)cartId=meta.id;
      }
    }catch(_){}
    const {data,error}=await supabaseClient.functions.invoke('mercadopago-checkout',{body:{items,shipping_address:shippingPayload(),shipping_service_id:selectedShipping.service_id,coupon_code:appliedCoupon?.code||null,cart_id:cartId}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    if(!data?.checkout_url)throw new Error('O Mercado Pago não retornou o link de pagamento.');
    location.href=data.checkout_url;
  }catch(err){
    console.error(err);msg.textContent='Erro: '+(err?.message||'não foi possível continuar para o pagamento.');btn.disabled=false;btn.textContent='Continuar para pagamento';
  }
}

document.addEventListener('DOMContentLoaded',async()=>{renderSummary();await loadProfile();$('co_zip').addEventListener('blur',lookupCep);$('co_zip').addEventListener('change',lookupCep);$('checkoutForm').addEventListener('submit',finalize);if($('co_zip').value.replace(/\D/g,'').length===8)await quoteShipping()});
