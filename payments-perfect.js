/* Carrinho da Lophera — direciona para a finalização antes do pagamento */
(function(){
  async function goCheckout(){
    const btn=document.getElementById('mpCheckoutBtn');
    try{
      if(btn){btn.disabled=true;btn.textContent='Abrindo finalização…'}
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){
        alert('Entre ou crie sua conta antes de finalizar a compra ♡');
        location.href='conta.html';
        return;
      }
      const cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
      if(!cart.length) throw new Error('Seu carrinho está vazio.');
      location.href='checkout.html';
    }catch(e){
      console.error(e);
      alert('Não foi possível continuar: '+(e?.message||'erro inesperado'));
      if(btn){btn.disabled=false;btn.textContent='Finalizar compra'}
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
    box.innerHTML=`<button id="mpCheckoutBtn" class="btn solid" style="width:100%" onclick="goCheckout()">Finalizar compra</button><div style="text-align:center;font-size:10px;margin-top:9px;color:#76677a">Dados de envio · frete · resumo · pagamento seguro</div>`;
    body.appendChild(box);
  };
  window.goCheckout=goCheckout;
})();