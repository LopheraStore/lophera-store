/* Lophera Studio V7.7 — avaliações */
(function(){
  const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function ensure(){
    if($('tab-reviews'))return;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');if(!side||!main)return;
    const rel=[...side.querySelectorAll('.v3-side-title')].find(x=>x.textContent==='RELACIONAMENTO');
    const btn=document.createElement('button');btn.className='side-link';btn.textContent='★ Avaliações';btn.onclick=()=>{showTab('reviews',btn);loadAdminReviews()};
    if(rel&&rel.nextSibling) side.insertBefore(btn,rel.nextSibling); else side.appendChild(btn);
    main.insertAdjacentHTML('beforeend',`<section id="tab-reviews" class="admin-tab" style="display:none"><div class="v3-pagebar"><div><div class="small">PROVA SOCIAL</div><h2>Avaliações de produtos</h2><p>Somente clientes com pedido entregue conseguem avaliar.</p></div><button class="btn" onclick="loadAdminReviews()">↻ Atualizar</button></div><div id="reviewsAdminList" class="category-list"></div></section>`);
  }
  window.loadAdminReviews=async function(){
    ensure();const box=$('reviewsAdminList');box.innerHTML='<div class="empty">Carregando avaliações…</div>';
    const {data,error}=await supabaseClient.rpc('get_admin_reviews');if(error){box.innerHTML='<div class="empty">Erro: '+safe(error.message)+'</div>';return}
    const list=Array.isArray(data)?data:[];
    box.innerHTML=list.length?list.map(r=>`<div class="category-row"><div><b>${'★'.repeat(Number(r.rating||0))}${'☆'.repeat(5-Number(r.rating||0))} · ${safe(r.product_name)}</b><span>${safe(r.customer_name||'Cliente')} · Pedido #${r.order_id} · ${new Date(r.created_at).toLocaleDateString('pt-BR')} · ${r.status}</span><span>${safe(r.title||'')}${r.comment?' — '+safe(r.comment):''}</span></div><button class="btn" onclick="setReviewStatus(${r.id},'${r.status==='hidden'?'approved':'hidden'}')">${r.status==='hidden'?'Publicar':'Ocultar'}</button></div>`).join(''):'<div class="empty">Nenhuma avaliação recebida ainda.</div>';
  };
  window.setReviewStatus=async function(id,status){const {error}=await supabaseClient.rpc('admin_set_review_status',{p_review_id:id,p_status:status});if(error)return alert(error.message);loadAdminReviews()};
  document.addEventListener('DOMContentLoaded',ensure);
})();