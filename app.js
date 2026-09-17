const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let products=[];
let cart=JSON.parse(localStorage.getItem('lophera_cart')||'[]');
let favorites=JSON.parse(localStorage.getItem('lophera_favs')||'[]');
let currentFilter='Todos',searchTerm='';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const shortName=n=>String(n||'').replace(/\s+(Unissex|Masculina|Feminina|Casual|Confortável|Premium|Estampada|100% Algodão).*$/i,'').replace(/\s{2,}/g,' ').trim();
function saveLocal(){localStorage.setItem('lophera_cart',JSON.stringify(cart));localStorage.setItem('lophera_favs',JSON.stringify(favorites))}
function showDataNotice(m,isError=false){const e=document.getElementById('dataNotice');if(!e)return;if(!m){e.style.display='none';e.textContent='';return}e.textContent=m;e.style.display='block';e.style.background=isError?'#fff0f1':'#f0e6f4';e.style.color=isError?'#8d3f54':'#5a3c63'}

async function boot(){
  try{
    showDataNotice('Carregando catálogo…');
    const pr=await supabaseClient.from('products').select('id,name,description,category_id,price,promotional_price,featured,created_at').eq('active',true).order('created_at',{ascending:false});
    if(pr.error)throw pr.error;
    products=(pr.data||[]).map(p=>({...p,id:String(p.id),category:'Outros',image:'assets/hero.svg',images:[],variants:[],colors:[],sizes:[],_variantsLoaded:false}));
    renderProducts();updateCart();
    showDataNotice(`${products.length} produtos carregados. Buscando fotos e categorias…`);

    const [cr,ir]=await Promise.all([
      supabaseClient.from('categories').select('id,name'),
      supabaseClient.from('product_images').select('id,product_id,image_url,position').order('position',{ascending:true})
    ]);
    const categories=cr.error?[]:(cr.data||[]);
    const images=ir.error?[]:(ir.data||[]);
    products=products.map(p=>{
      const photos=images.filter(i=>String(i.product_id)===p.id).sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0)).map(i=>i.image_url).filter(Boolean);
      return {...p,category:categories.find(c=>String(c.id)===String(p.category_id))?.name||'Outros',image:photos[0]||'assets/hero.svg',images:photos};
    });
    renderProducts();
    const warnings=[];if(cr.error)warnings.push('categorias');if(ir.error)warnings.push('imagens');
    showDataNotice(warnings.length?`${products.length} produtos carregados; falha apenas em ${warnings.join(' e ')}.`:'');
  }catch(e){
    console.error('[Lophera V11] catálogo:',e);
    products=[];
    renderProducts();
    showDataNotice('Não foi possível carregar os produtos do banco: '+(e?.message||'erro desconhecido'),true);
  }
}

function visibleProducts(){
  let list=products.filter(p=>(currentFilter==='Todos'||p.category===currentFilter)&&String(p.name).toLowerCase().includes(searchTerm.toLowerCase()));
  const path=(location.pathname||'').toLowerCase();
  const isHome=path.endsWith('/')||path.endsWith('/index.html');
  if(isHome){const featured=list.filter(p=>p.featured);list=(featured.length?featured:list).slice(0,8)}
  return list;
}
function renderProducts(){const g=document.getElementById('productGrid');if(!g)return;g.innerHTML=visibleProducts().map(card).join('')||'<div class="empty">Nenhum produto encontrado.</div>'}
function card(p){const fav=favorites.includes(String(p.id)),price=Number(p.promotional_price||p.price),old=p.promotional_price?`<span class="old-price">${money(p.price)}</span>`:'';return`<article class="card"><button class="heart" onclick="toggleFav('${p.id}');event.stopPropagation()">${fav?'♥':'♡'}</button><div class="card-img" onclick="openProduct('${p.id}')"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='assets/hero.svg'"></div><div class="card-info" onclick="openProduct('${p.id}')"><div class="tag">${esc(p.category)}</div><h3>${esc(shortName(p.name))}</h3><div class="price">${old}${money(price)}</div></div></article>`}
function toggleFav(id){favorites=favorites.includes(String(id))?favorites.filter(x=>x!==String(id)):[...favorites,String(id)];saveLocal();renderProducts()}
function setFilter(f,b){currentFilter=f;document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b?.classList.add('active');renderProducts()}

async function ensureVariants(p){
  if(p._variantsLoaded)return;
  const vr=await supabaseClient.from('product_variants').select('id,color,size,stock,sku').eq('product_id',p.id).eq('active',true).order('id');
  if(vr.error)throw vr.error;
  p.variants=vr.data||[];
  p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];
  p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];
  p._variantsLoaded=true;
}
async function openProduct(id){
  const p=products.find(x=>x.id===String(id));if(!p)return;
  try{await ensureVariants(p)}catch(e){alert('Erro ao carregar as opções deste produto: '+e.message);return}
  const colors=p.colors||[],sizes=p.sizes||[];
  document.getElementById('modal').classList.add('open');
  document.getElementById('modalBody').innerHTML=`<button class="modal-close" onclick="closeModal()">×</button><div class="modal-img"><img src="${esc(p.image)}" onerror="this.src='assets/hero.svg'"></div><div class="modal-content"><div class="tag">${esc(p.category)}</div><h2>${esc(shortName(p.name))}</h2><div class="price" style="font-size:20px">${p.promotional_price?`<span class="old-price">${money(p.price)}</span>`:''}${money(p.promotional_price||p.price)}</div><p class="desc">${esc(p.description||'Uma peça Lophera pensada para unir estilo, conforto e personalidade.')}</p><div class="options">${colors.length?`<label>Cor</label><div class="option-row" data-kind="color">${colors.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pickVariant(this,'${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}${sizes.length?`<label>Tamanho</label><div class="option-row" data-kind="size">${sizes.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pickVariant(this,'${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}</div><div id="variantStock" class="tag" style="margin-bottom:12px"></div><div style="display:flex;gap:10px;align-items:center"><div class="qty"><button onclick="changeQty(-1)">−</button><span id="q">1</span><button onclick="changeQty(1)">+</button></div><button id="addCartBtn" class="btn solid" onclick="addCart('${p.id}')">Adicionar ao carrinho</button></div></div>`;
  refreshVariantState(p);
  const firstEnabled=[...document.querySelectorAll('[data-kind="size"] .option')].find(x=>!x.disabled);if(firstEnabled&&!firstEnabled.classList.contains('selected')){document.querySelectorAll('[data-kind="size"] .option').forEach(x=>x.classList.remove('selected'));firstEnabled.classList.add('selected');refreshVariantState(p)}
}
function selected(kind){return document.querySelector(`[data-kind="${kind}"] .selected`)?.textContent?.trim()||''}
function matchingVariant(p){const c=selected('color'),s=selected('size');return p.variants.find(v=>(!c||v.color===c)&&(!s||v.size===s))}
function refreshVariantState(p){const c=selected('color');document.querySelectorAll('[data-kind="size"] .option').forEach(b=>{const ok=p.variants.some(v=>(!c||v.color===c)&&v.size===b.textContent.trim()&&Number(v.stock)>0);b.disabled=!ok;b.classList.toggle('unavailable',!ok)});const chosen=matchingVariant(p),stock=document.getElementById('variantStock'),btn=document.getElementById('addCartBtn');if(stock)stock.textContent=chosen?(Number(chosen.stock)>0?'Disponível':'Indisponível'):'';if(btn)btn.disabled=!chosen||Number(chosen.stock)<=0}
function pickVariant(el,id){if(el.disabled)return;el.parentElement.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const p=products.find(x=>x.id===String(id));if(p)refreshVariantState(p)}
function changeQty(n){const q=document.getElementById('q');if(q)q.textContent=Math.max(1,Number(q.textContent)+n)}
function addCart(id){const p=products.find(x=>x.id===String(id)),q=Number(document.getElementById('q')?.textContent||1),color=selected('color'),size=selected('size'),variant=matchingVariant(p);if(!variant||Number(variant.stock)<q)return toast('Essa combinação não está disponível ♡');const key=id+'|'+color+'|'+size,price=Number(p.promotional_price||p.price),item=cart.find(x=>x.key===key);if(item)item.qty+=q;else cart.push({key,id,variant_id:variant.id,name:p.name,price,qty:q,color,size,image:p.image});saveLocal();updateCart();closeModal();toast('Produto adicionado ao carrinho ♡')}
function updateCart(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((a,x)=>a+x.qty,0))}
function closeModal(){document.getElementById('modal')?.classList.remove('open')}
function toast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showCart(){document.getElementById('cartModal').classList.add('open');const total=cart.reduce((a,x)=>a+x.price*x.qty,0);document.getElementById('cartBody').innerHTML=cart.length?cart.map((x,i)=>`<div style="display:flex;gap:12px;border-bottom:1px solid #eee;padding:14px 0"><img src="${esc(x.image)}" style="width:70px;height:70px;object-fit:cover"><div style="flex:1"><b>${esc(shortName(x.name))}</b><div style="font-size:10px;margin-top:4px">${esc(x.color)} ${x.color&&x.size?'·':''} ${esc(x.size)} · ${x.qty}x</div><div style="margin-top:8px">${money(x.price*x.qty)}</div></div><button class="btn" onclick="removeCart(${i})">remover</button></div>`).join('')+`<div style="text-align:right;padding:18px 0;font-size:18px">Total: <b>${money(total)}</b></div><button class="btn solid" style="width:100%" onclick="checkoutWhatsApp()">Finalizar pelo WhatsApp</button><div style="text-align:center;margin-top:10px;font-size:10px">Entre na sua conta para o pedido aparecer em “Meus pedidos”.</div>`:'<div class="empty">Seu carrinho está vazio ♡</div>'}
function removeCart(i){cart.splice(i,1);saveLocal();updateCart();showCart()}
async function checkoutWhatsApp(){if(!cart.length)return;let orderId=null;try{const{data:{user}}=await supabaseClient.auth.getUser();if(user){const total=cart.reduce((a,x)=>a+x.price*x.qty,0);const{data:o,error}=await supabaseClient.from('orders').insert({customer_id:user.id,total,status:'aguardando_atendimento'}).select().single();if(error)throw error;orderId=o.id;const items=cart.map(x=>({order_id:o.id,product_id:Number(x.id),variant_id:x.variant_id||null,product_name:x.name,color:x.color||null,size:x.size||null,quantity:x.qty,unit_price:x.price,image_url:x.image}));const{error:ie}=await supabaseClient.from('order_items').insert(items);if(ie)throw ie}}}catch(e){console.error('Pedido não registrado:',e)}const lines=cart.map(x=>`• ${shortName(x.name)} | ${[x.color,x.size].filter(Boolean).join(' | ')} | ${x.qty}x | ${money(x.price*x.qty)}`).join('\n'),total=cart.reduce((a,x)=>a+x.price*x.qty,0),msg=`Olá, Lophera! Quero fazer um pedido${orderId?' #'+orderId:''}:\n\n${lines}\n\nTotal: ${money(total)}\n\nGostaria de receber as instruções para pagamento e entrega.`;window.open('https://wa.me/5516920088623?text='+encodeURIComponent(msg),'_blank')}
function closeCart(){document.getElementById('cartModal')?.classList.remove('open')}
window.boot=boot;window.renderProducts=renderProducts;window.setFilter=setFilter;window.openProduct=openProduct;window.toggleFav=toggleFav;window.closeModal=closeModal;window.addCart=addCart;window.pickVariant=pickVariant;window.changeQty=changeQty;window.showCart=showCart;window.removeCart=removeCart;window.closeCart=closeCart;window.checkoutWhatsApp=checkoutWhatsApp;
document.addEventListener('DOMContentLoaded',boot,{once:true});