
const money = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const loadSeed = async()=> JSON.parse(await (await fetch('assets/products.json')).text());
let products = JSON.parse(localStorage.getItem('lophera_products')||'null');
let cart = JSON.parse(localStorage.getItem('lophera_cart')||'[]');
let favorites = JSON.parse(localStorage.getItem('lophera_favs')||'[]');
let currentFilter='Todos', searchTerm='';

function save(){localStorage.setItem('lophera_products',JSON.stringify(products));localStorage.setItem('lophera_cart',JSON.stringify(cart));localStorage.setItem('lophera_favs',JSON.stringify(favorites))}
async function boot(){
 if(!products){products=await loadSeed();save();}
 renderProducts();
 updateCart();
}
function renderProducts(){
 const grid=document.querySelector('#productGrid'); if(!grid)return;
 let list=products.filter(p=>(currentFilter==='Todos'||p.category===currentFilter)&&p.name.toLowerCase().includes(searchTerm.toLowerCase()));
 grid.innerHTML=list.map(p=>card(p)).join('')||'<div class="empty">Nenhum produto encontrado.</div>';
}
function card(p){
 const fav=favorites.includes(p.id);
 return `<article class="card"><button class="heart" onclick="toggleFav('${p.id}');event.stopPropagation()">${fav?'♥':'♡'}</button><div class="card-img" onclick="openProduct('${p.id}')"><img src="${p.image||'assets/hero.svg'}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='assets/hero.svg'"></div><div class="card-info" onclick="openProduct('${p.id}')"><div class="tag">${p.category}</div><h3>${esc(shortName(p.name))}</h3><div class="price">${money(p.price)}</div></div></article>`;
}
function shortName(n){return n.replace(/\s+(Unissex|Masculina|Feminina|Casual|Confortável|Premium|Estampada|100% Algodão).*$/i,'').replace(/\s{2,}/g,' ').trim()}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toggleFav(id){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save();renderProducts()}
function openProduct(id){
 const p=products.find(x=>x.id===id); if(!p)return;
 document.querySelector('#modal').classList.add('open');
 document.querySelector('#modalBody').innerHTML=`<button class="modal-close" onclick="closeModal()">×</button><div class="modal-img"><img src="${p.image||'assets/hero.svg'}" onerror="this.src='assets/hero.svg'"></div><div class="modal-content"><div class="tag">${p.category}</div><h2>${esc(shortName(p.name))}</h2><div class="price" style="font-size:20px">${money(p.price)}</div><p class="desc">${esc(p.description||'Uma peça Lophera pensada para unir estilo, conforto e personalidade.')}</p><div class="options"><label>Cor</label><div class="option-row">${(p.colors.length?p.colors:['Não especificada']).map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pick(this)">${esc(x)}</button>`).join('')}</div><label>Tamanho</label><div class="option-row">${(p.sizes.length?p.sizes:['Único']).map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pick(this)">${esc(x)}</button>`).join('')}</div></div><div style="display:flex;gap:10px;align-items:center"><div class="qty"><button onclick="changeQty(-1)">−</button><span id="q">1</span><button onclick="changeQty(1)">+</button></div><button class="btn solid" onclick="addCart('${p.id}')">Adicionar ao carrinho</button></div></div>`;
}
function pick(el){el.parentElement.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}
function changeQty(n){const q=document.querySelector('#q');q.textContent=Math.max(1,Number(q.textContent)+n)}
function addCart(id){
 const p=products.find(x=>x.id===id), q=Number(document.querySelector('#q')?.textContent||1);
 const color=document.querySelector('.option-row .selected')?.textContent||'';
 const size=document.querySelectorAll('.option-row')[1]?.querySelector('.selected')?.textContent||'';
 const key=id+'|'+color+'|'+size;
 const item=cart.find(x=>x.key===key);
 if(item)item.qty+=q; else cart.push({key,id,name:p.name,price:p.price,qty:q,color,size,image:p.image});
 save();updateCart();closeModal();toast('Produto adicionado ao carrinho ♡');
}
function updateCart(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((a,x)=>a+x.qty,0))}
function closeModal(){document.querySelector('#modal')?.classList.remove('open')}
function toast(msg){const t=document.querySelector('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showCart(){
 document.querySelector('#cartModal').classList.add('open');
 const total=cart.reduce((a,x)=>a+x.price*x.qty,0);
 document.querySelector('#cartBody').innerHTML=cart.length?cart.map((x,i)=>`<div style="display:flex;gap:12px;border-bottom:1px solid #eee;padding:14px 0"><img src="${x.image}" style="width:70px;height:70px;object-fit:cover"><div style="flex:1"><b>${esc(shortName(x.name))}</b><div style="font-size:10px;margin-top:4px">${esc(x.color)} · ${esc(x.size)} · ${x.qty}x</div><div style="margin-top:8px">${money(x.price*x.qty)}</div></div><button class="btn" onclick="removeCart(${i})">remover</button></div>`).join('')+`<div style="text-align:right;padding:18px 0;font-size:18px">Total: <b>${money(total)}</b></div><button class="btn solid" style="width:100%" onclick="checkoutWhatsApp()">Finalizar pelo WhatsApp</button>`:'<div class="empty">Seu carrinho está vazio ♡</div>';
}
function removeCart(i){cart.splice(i,1);save();updateCart();showCart()}
function checkoutWhatsApp(){
 if(!cart.length)return;
 const lines=cart.map(x=>`• ${shortName(x.name)} | ${x.color} | ${x.size} | ${x.qty}x | ${money(x.price*x.qty)}`).join('%0A');
 const total=cart.reduce((a,x)=>a+x.price*x.qty,0);
 const msg=`Olá, Lophera! Quero fazer um pedido:%0A%0A${lines}%0A%0ATotal: ${money(total)}%0A%0AGostaria de receber as instruções para pagamento e entrega.`;
 window.open('https://wa.me/5516920088623?text='+encodeURIComponent(decodeURIComponent(msg)),'_blank');
}
function closeCart(){document.querySelector('#cartModal').classList.remove('open')}
window.boot=boot;window.openProduct=openProduct;window.toggleFav=toggleFav;window.closeModal=closeModal;window.addCart=addCart;window.changeQty=changeQty;window.showCart=showCart;window.removeCart=removeCart;window.closeCart=closeCart;window.checkoutWhatsApp=checkoutWhatsApp;
