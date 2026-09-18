/* Lophera Studio V7.8 — alertas de estoque */
(function(){
  const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function ensure(){
    if($('tab-stock')) return;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');if(!side||!main)return;
    const productsBtn=[...side.querySelectorAll('.side-link')].find(x=>x.textContent.includes('Produtos'));
    const btn=document.createElement('button');btn.className='side-link';btn.textContent='◫ Estoque';btn.onclick=()=>{showTab('stock',btn);loadStockAlerts()};
    if(productsBtn&&productsBtn.nextSibling)side.insertBefore(btn,productsBtn.nextSibling);else side.appendChild(btn);
    main.insertAdjacentHTML('beforeend',`
      <section id="tab-stock" class="admin-tab" style="display:none">
        <div class="v3-pagebar"><div><div class="small">CATÁLOGO</div><h2>Alertas de estoque</h2><p>Variações zeradas ou com poucas unidades.</p></div><button class="btn" onclick="loadStockAlerts()">↻ Atualizar</button></div>
        <div id="stockKpis" class="sales-kpis"></div>
        <div id="stockAlertList" class="category-list"></div>
      </section>`);
  }
  window.loadStockAlerts=async function(){
    ensure();
    const box=$('stockAlertList');box.innerHTML='<div class="empty">Carregando estoque…</div>';
    const {data,error}=await supabaseClient.rpc('get_admin_stock_alerts',{p_threshold:2});
    if(error){box.innerHTML='<div class="empty">Erro: '+safe(error.message)+'</div>';return}
    $('stockKpis').innerHTML='<div class="sales-kpi"><span>Sem estoque</span><b>'+Number(data?.out_of_stock||0)+'</b></div><div class="sales-kpi"><span>Estoque baixo ≤ 2</span><b>'+Number(data?.low_stock||0)+'</b></div>';
    const items=Array.isArray(data?.items)?data.items:[];
    box.innerHTML=items.length?items.map(i=>'<div class="category-row"><div><b>'+safe(i.product_name)+'</b><span>SKU: '+safe(i.sku||'sem SKU')+' · '+safe([i.color,i.size].filter(Boolean).join(' · '))+'</span></div><strong>'+Number(i.stock||0)+' un.</strong></div>').join(''):'<div class="empty">Nenhuma variação com estoque baixo ♡</div>';
  };
  document.addEventListener('DOMContentLoaded',ensure);
})();