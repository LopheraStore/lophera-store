const $=id=>document.getElementById(id);
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
let currentUser=null;

function renderSummary(){
  const box=$('checkoutItems');
  if(!cart.length){box.innerHTML='<div class="empty">Seu carrinho está vazio.</div>';return}
  box.innerHTML=cart.map(x=>'<div class="checkout-item"><img src="'+safe(x.image||'assets/hero.svg')+'"><div><b>'+safe(x.name)+'</b><small>'+safe([x.color,x.size].filter(Boolean).join(' · '))+' · Qtd. '+Number(x.qty||1)+'</small></div><strong>'+money(Number(x.price||0)*Number(x.qty||1))+'</strong></div>').join('');
  const subtotal=cart.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||1),0);
  $('checkoutSubtotal').textContent=money(subtotal);$('checkoutTotal').textContent=money(subtotal);
}

async function loadProfile(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){location.href='conta.html';return}
  currentUser=session.user;$('co_email').value=session.user.email||'';
  const {data}=await supabaseClient.from('customer_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
  if(!data)return;
  $('co_name').value=data.full_name||'';$('co_phone').value=data.phone||'';$('co_cpf').value=data.cpf||'';$('co_zip').value=data.zip_code||'';$('co_state').value=data.state||'';$('co_city').value=data.city||'';$('co_neighborhood').value=data.neighborhood||'';$('co_address').value=data.address||'';$('co_number').value=data.address_number||'';$('co_complement').value=data.complement||'';$('co_reference').value=data.reference_point||'';
}

async function lookupCep(){
  const cep=$('co_zip').value.replace(/\D/g,'');
  if(cep.length!==8)return;
  try{
    const r=await fetch('https://viacep.com.br/ws/'+cep+'/json/');
    const d=await r.json();if(d.erro)return;
    if(!$('co_address').value)$('co_address').value=d.logradouro||'';
    if(!$('co_neighborhood').value)$('co_neighborhood').value=d.bairro||'';
    if(!$('co_city').value)$('co_city').value=d.localidade||'';
    if(!$('co_state').value)$('co_state').value=d.uf||'';
  }catch(_){}
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
    const items=cart.map(x=>({product_id:x.id,variant_id:x.variant_id,quantity:x.qty}));
    const {data,error}=await supabaseClient.functions.invoke('mercadopago-checkout',{body:{items,shipping_address:shippingPayload(),shipping_method:'Entrega padrão',shipping_price:0}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    if(!data?.checkout_url)throw new Error('O Mercado Pago não retornou o link de pagamento.');
    location.href=data.checkout_url;
  }catch(err){
    console.error(err);msg.textContent='Erro: '+(err?.message||'não foi possível continuar para o pagamento.');btn.disabled=false;btn.textContent='Continuar para pagamento';
  }
}

document.addEventListener('DOMContentLoaded',async()=>{renderSummary();await loadProfile();$('co_zip').addEventListener('blur',lookupCep);$('checkoutForm').addEventListener('submit',finalize)});
