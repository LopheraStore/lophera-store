const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let products=[],categories=[],images=[],cart=JSON.parse(localStorage.getItem('lophera_test_cart')||'[]');
let currentFilter='Todos',searchTerm='';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const shortName=n=>String(n||'').replace(/\s+(Unissex|Masculina|Feminina|Casual|Confortável|Premium|Estampada|100% Algodão).*$/i,'').replace(/\s{2,}/g,' ').trim();
function setStatus(text,error=false){const el=document.getElementById('liveStatus');if(!el)return;el.textContent=text;el.style.background=error?'#fff0f1':'#f0e6f4';el.style.color=error?'#8d3f54':'#5a3c63'}
async function boot(){
  setStatus('Conectando ao catálogo ao vivo…');
  const pr=await supabaseClient.from('products').select('id,name,description,category_id,price,promotional_price,featured,created_at').eq('active',true).order('created_at',{ascending:false});
  if(pr.error){setStatus('Erro ao carregar produtos: '+pr.error.message,true);return}
  products=(pr.data||[]).map(p=>({...p,id:String(p.id),category:'Outros',image:'assets/hero.svg',images:[],variants:[]}));
  renderProducts();updateCart();
  setStatus(`${products.length} produtos carregados do Supabase. Buscando fotos e categorias…`);
  const [cr,ir]=await Promise.all([
    supabaseClient.from('categories').select('id,name'),
    supabaseClient.from('product_images').select('id,product_id,image_url,position').order('position',{ascending:true})
  ]);
  if(!cr.error) categories=cr.data||[];
  if(!ir.error) images=ir.data||[];
  products=products.map(p=>{const photos=images.filter(i=>String(i.product_id)===p.id).map(i=>i.image_url).filter(Boolean);return{...p,category:categories.find(c=>String(c.id)===String(p.category_id))?.name||'Outros',image:photos[0]||'assets/hero.svg',images:photos}});
  renderProducts();renderFilters();
  const warnings=[];if(cr.error)warnings.push('categorias');if(ir.error)warnings.push('imagens');
  setStatus(warnings.length?`${products.length} produtos ao vivo carregados; falha apenas em ${warnings.join(' e ')}.`:`${products.length} produtos ao vivo · ${images.length} imagens · conexão OK ♡`,warnings.length>0);
}
function renderFilters(){const box=document.getElementById('filters');if(!box)return;const names=['Todos',...new Set(products.map(p=>p.category).filter(Boolean))];box.innerHTML=names.map(n=>`<button class="filter ${n===currentFilter?'active':''}" onclick="setFilter('${esc(n)}',this)">${esc(n)}</button>`).join('')}
function setFilter(f,b){currentFilter=f;document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b?.classList.add('active');renderProducts()}
function renderProducts(){const g=document.getElementById('productGrid');if(!g)return;const list=products.filter(p=>(currentFilter==='Todos'||p.category===currentFilter)&&String(p.name).toLowerCase().includes(searchTerm.toLowerCase()));g.innerHTML=list.map(card).join('')||'<div class="empty">Nenhum produto encontrado.</div>'}
function card(p){const price=Number(p.promotional_price||p.price);const old=p.promotional_price?`<span class="old-price">${money(p.price)}</span>`:'';return`<article class="card"><div class="card-img" onclick="openProduct('${p.id}')"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='assets/hero.svg'"></div><div class="card-info" onclick="openProduct('${p.id}')"><div class="tag">${esc(p.category)}</div><h3>${esc(shortName(p.name))}</h3><div class="price">${old}${money(price)}</div></div></article>`}
async function openProduct(id){const p=products.find(x=>x.id===String(id));if(!p)return;const vr=await supabaseClient.from('product_variants').select('id,color,size,stock,sku').eq('product_id',id).eq('active',true).order('id');if(vr.error){alert('Erro ao carregar as opções deste produto: '+vr.error.message);return}p.variants=vr.data||[];p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];const modal=document.getElementById('modal');modal.classList.add('open');document.getElementById('modalBody').innerHTML=`<button class="modal-close" onclick="closeModal()">×</button><div class="modal-img"><img src="${esc(p.image)}" onerror="this.src='assets/hero.svg'"></div><div class="modal-content"><div class="tag">${esc(p.category)}</div><h2>${esc(shortName(p.name))}</h2><div class="price" style="font-size:20px">${p.promotional_price?`<span class="old-price">${money(p.price)}</span>`:''}${money(p.promotional_price||p.price)}</div><p class="desc">${esc(p.description||'Uma peça Lophera pensada para unir estilo, conforto e personalidade.')}</p>${p.colors.length?`<label>Cor</label><div class="option-row" data-kind="color">${p.colors.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pick(this,'color','${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}${p.sizes.length?`<label style="display:block;margin-top:14px">Tamanho</label><div class="option-row" data-kind="size">${p.sizes.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pick(this,'size','${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}<div id="stockState" class="tag" style="margin:14px 0"></div><button class="btn solid" id="addBtn" onclick="addCart('${p.id}')">Adicionar ao carrinho</button></div>`;refreshVariant(p)}
function selected(kind){return document.querySelector(`[data-kind="${kind}"] .selected`)?.textContent?.trim()||''}
function matchVariant(p){const c=selected('color'),s=selected('size');return p.variants.find(v=>(!c||v.color===c)&&(!s||v.size===s))}
function refreshVariant(p){const v=matchVariant(p),el=document.getElementById('stockState'),btn=document.getElementById('addBtn');if(el)el.textContent=v?(Number(v.stock)>0?'Disponível':'Indisponível'):'';if(btn)btn.disabled=!v||Number(v.stock)<=0}
function pick(el,kind,id){el.parentElement.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const p=products.find(x=>x.id===String(id));if(p)refreshVariant(p)}
function addCart(id){const p=products.find(x=>x.id===String(id));const v=matchVariant(p);if(!v||Number(v.stock)<=0)return;const key=`${id}|${v.id}`,found=cart.find(x=>x.key===key);if(found)found.qty++;else cart.push({key,id,variant_id:v.id,name:p.name,color:v.color||'',size:v.size||'',price:Number(p.promotional_price||p.price),qty:1,image:p.image});localStorage.setItem('lophera_test_cart',JSON.stringify(cart));updateCart();closeModal()}
function updateCart(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((a,x)=>a+x.qty,0))}
function showCart(){const modal=document.getElementById('cartModal');modal.classList.add('open');const total=cart.reduce((a,x)=>a+x.price*x.qty,0);document.getElementById('cartBody').innerHTML=cart.length?cart.map((x,i)=>`<div style="display:flex;gap:12px;border-bottom:1px solid #eee;padding:14px 0"><img src="${esc(x.image)}" style="width:70px;height:70px;object-fit:cover"><div style="flex:1"><b>${esc(shortName(x.name))}</b><div style="font-size:10px">${esc([x.color,x.size].filter(Boolean).join(' · '))}</div><div>${money(x.price*x.qty)}</div></div><button class="btn" onclick="removeCart(${i})">remover</button></div>`).join('')+`<div style="text-align:right;padding:18px 0;font-size:18px">Total: <b>${money(total)}</b></div>`:'<div class="empty">Seu carrinho está vazio ♡</div>'}
function removeCart(i){cart.splice(i,1);localStorage.setItem('lophera_test_cart',JSON.stringify(cart));updateCart();showCart()}
function closeModal(){document.getElementById('modal')?.classList.remove('open')}
function closeCart(){document.getElementById('cartModal')?.classList.remove('open')}
window.boot=boot;window.setFilter=setFilter;window.openProduct=openProduct;window.pick=pick;window.addCart=addCart;window.showCart=showCart;window.removeCart=removeCart;window.closeModal=closeModal;window.closeCart=closeCart;
document.addEventListener('DOMContentLoaded',boot,{once:true});
