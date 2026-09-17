/* Lophera + Mercado Pago — checkout seguro via Supabase Edge Function */
(function(){
  async function checkoutMercadoPago(){
    const btn=document.getElementById('mpCheckoutBtn');
    try{
      if(btn){btn.disabled=true;btn.textContent='Preparando pagamento…'}
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){
        alert('Entre ou crie sua conta antes de finalizar a compra ♡');
        location.href='conta.html';
        return;
      }
      const cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
      if(!cart.length) throw new Error('Seu carrinho está vazio.');
      const items=cart.map(x=>({product_id:x.id,variant_id:x.variant_id,quantity:x.qty}));
      const {data,error}=await supabaseClient.functions.invoke('mercadopago-checkout',{body:{items}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      if(!data?.checkout_url) throw new Error('O Mercado Pago não retornou o link de pagamento.');
      location.href=data.checkout_url;
    }catch(e){
      console.error(e);
      alert('Não foi possível iniciar o pagamento: '+(e?.message||'erro inesperado'));
      if(btn){btn.disabled=false;btn.textContent='Pagar com Mercado Pago'}
    }
  }

  const originalShowCart=window.showCart;
  window.showCart=function(){
    originalShowCart?.();
    const cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
    const body=document.getElementById('cartBody');
    if(!body||!cart.length||document.getElementById('mpCheckoutBtn'))return;
    const box=document.createElement('div');
    box.style.marginTop='18px';
    box.innerHTML=`<button id="mpCheckoutBtn" class="btn solid" style="width:100%" onclick="checkoutMercadoPago()">Pagar com Mercado Pago</button><div style="text-align:center;font-size:10px;margin-top:9px;color:#76677a">Pix · cartão · boleto · pagamento processado com segurança pelo Mercado Pago</div>`;
    body.appendChild(box);
  };
  window.checkoutMercadoPago=checkoutMercadoPago;
})();
