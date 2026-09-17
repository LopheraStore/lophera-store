/* Lophera Studio V4 — melhorias sobre o admin.js existente */
(function(){
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const msg=(id,text,bad=false)=>{const el=document.getElementById(id);if(el){el.textContent=text;el.classList.toggle('error',bad)}};

  // Sobrescreve o carregamento silencioso do V3: erros agora aparecem na tela.
  window.loadCategories=async function(){
    const {data,error}=await supabaseClient.from('categories').select('*').order('name');
    if(error){console.error(error);msg('categoryStatus','Não foi possível carregar as categorias: '+error.message,true);return}
    categories=data||[];
    window.renderCategories();
    msg('categoryStatus',`${categories.length} categoria${categories.length===1?'':'s'} cadastrada${categories.length===1?'':'s'}.`);
  };

  window.renderCategories=function(){
    const el=document.getElementById('categoryList'); if(!el)return;
    const counts={}; (adminProducts||[]).forEach(p=>counts[String(p.category_id)]=(counts[String(p.category_id)]||0)+1);
    el.innerHTML=(categories||[]).map(c=>`<div class="category-row"><div><b>${esc(c.name)}</b><span>${counts[String(c.id)]||0} produtos · /${esc(c.slug)}</span></div><div><button class="btn" onclick="editCategory('${c.id}')">Editar</button><button class="mini-danger text" onclick="deleteCategory('${c.id}')">Excluir</button></div></div>`).join('')||'<div class="empty">Nenhuma categoria cadastrada.</div>';
  };

  window.loadAdminProducts=async function(){
    msg('productStatus','Carregando catálogo...');
    const {data,error}=await supabaseClient.from('products').select('*').order('name');
    if(error){console.error(error);adminProducts=[];renderAdminList();msg('productStatus','Erro ao carregar produtos: '+error.message,true);return}
    adminProducts=data||[];
    const ids=adminProducts.map(p=>p.id);
    let images=[],variants=[];
    if(ids.length){
      const [ir,vr]=await Promise.all([
        supabaseClient.from('product_images').select('*').in('product_id',ids).order('position'),
        supabaseClient.from('product_variants').select('*').in('product_id',ids).order('id')
      ]);
      if(ir.error)console.error('product_images',ir.error); else images=ir.data||[];
      if(vr.error)console.error('product_variants',vr.error); else variants=vr.data||[];
    }
    adminProducts=adminProducts.map(p=>({...p,category:(categories||[]).find(c=>String(c.id)===String(p.category_id)),images:images.filter(i=>String(i.product_id)===String(p.id)),variants:variants.filter(v=>String(v.product_id)===String(p.id))}));
    renderAdminList(); renderCategories();
    msg('productStatus',`${adminProducts.length} produtos · ${images.length} imagens · ${variants.length} variações carregadas do Supabase.`);
  };

  window.renderAdminList=function(){
    const el=document.getElementById('adminList'); if(!el)return;
    const q=(document.getElementById('adminSearch')?.value||'').trim().toLowerCase();
    const status=document.getElementById('adminStatusFilter')?.value||'all';
    const cat=document.getElementById('adminCategoryFilter')?.value||'all';
    const arr=(adminProducts||[]).filter(p=>(!q||`${p.name} ${p.description||''}`.toLowerCase().includes(q))&&(status==='all'||(status==='online'?p.active:!p.active))&&(cat==='all'||String(p.category_id)===cat));
    el.innerHTML=arr.map(p=>{const stock=(p.variants||[]).reduce((s,v)=>s+Number(v.stock||0),0);return `<button class="product-card-admin" onclick="editProduct('${p.id}')"><img src="${esc(p.images?.[0]?.image_url||'assets/hero.svg')}" loading="lazy"><div><b>${esc(p.name)}</b><span>${esc(p.category?.name||'Sem categoria')} · ${(p.images||[]).length} foto(s) · estoque ${stock}</span><strong>${p.promotional_price?`<s>${money(p.price)}</s> ${money(p.promotional_price)}`:money(p.price)}</strong></div><i>${p.active?'● Online':'○ Oculto'}</i></button>`}).join('')||'<div class="empty">Nenhum produto encontrado.</div>';
    const counter=document.getElementById('productCounter'); if(counter)counter.textContent=`${arr.length} de ${(adminProducts||[]).length}`;
  };

  window.refreshCatalog=async function(){await loadCategories();await loadAdminProducts()};

  window.populateV4Filters=function(){
    const s=document.getElementById('adminCategoryFilter'); if(!s)return;
    const old=s.value;s.innerHTML='<option value="all">Todas as categorias</option>'+categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');s.value=[...s.options].some(o=>o.value===old)?old:'all';
  };

  const oldLoadProducts=window.loadAdminProducts;
  window.loadAdminProducts=async function(){await oldLoadProducts();populateV4Filters()};

  function getShipping(){return storeSettings?.content?.shipping||{free_shipping_from:199,production_days:3,local_delivery:false,local_fee:0,pickup:false,origin_zip:'',default_weight:0.3,default_width:20,default_height:5,default_length:30,notes:''}}
  window.loadShipping=function(){const s=getShipping();['free_shipping_from','production_days','local_fee','origin_zip','default_weight','default_width','default_height','default_length','notes'].forEach(k=>{const e=document.getElementById('ship_'+k);if(e)e.value=s[k]??''});['local_delivery','pickup'].forEach(k=>{const e=document.getElementById('ship_'+k);if(e)e.checked=!!s[k]})};
  window.saveShipping=async function(e){e?.preventDefault();try{const shipping={};['free_shipping_from','production_days','local_fee','default_weight','default_width','default_height','default_length'].forEach(k=>shipping[k]=Number(document.getElementById('ship_'+k).value||0));shipping.origin_zip=document.getElementById('ship_origin_zip').value.replace(/\D/g,'');shipping.notes=document.getElementById('ship_notes').value;shipping.local_delivery=document.getElementById('ship_local_delivery').checked;shipping.pickup=document.getElementById('ship_pickup').checked;const content=structuredClone(storeSettings.content||{});content.shipping=shipping;await upsertSettings({content});msg('shippingMsg','Configurações de frete salvas ♡');}catch(err){msg('shippingMsg','Erro: '+err.message,true)}};

  const oldLoadSettings=window.loadSettings;
  window.loadSettings=async function(){await oldLoadSettings();loadShipping()};

  // Diagnóstico rápido útil caso uma política RLS seja alterada no futuro.
  window.testDatabase=async function(){msg('diagnosticMsg','Testando...');const tests=await Promise.all(['products','categories','product_images','product_variants','store_settings'].map(async table=>{const {count,error}=await supabaseClient.from(table).select('*',{count:'exact',head:true});return {table,count,error:error?.message}}));const bad=tests.filter(x=>x.error);msg('diagnosticMsg',bad.length?bad.map(x=>`${x.table}: ${x.error}`).join(' | '):tests.map(x=>`${x.table}: ${x.count}`).join(' · '),!!bad.length)};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(document.getElementById('adminView')?.style.display!=='none'){populateV4Filters();loadShipping()}},600));
})();