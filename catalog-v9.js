/* Lophera V9 — catálogo robusto: renderiza produtos primeiro e busca variações somente ao abrir */
async function lopheraBaseCatalog(){
  const {data:base,error:pe}=await supabaseClient.from('products').select('*').eq('active',true);
  if(pe) throw pe;
  if(!base?.length) return [];
  const ids=base.map(p=>p.id);
  const [{data:cats,error:ce},{data:imgs,error:ie}]=await Promise.all([
    supabaseClient.from('categories').select('*'),
    supabaseClient.from('product_images').select('*').in('product_id',ids)
  ]);
  if(ce) console.warn('Categorias:',ce);
  if(ie) console.warn('Imagens:',ie);
  return base.map(p=>{
    const photos=(imgs||[]).filter(x=>String(x.product_id)===String(p.id)).sort((a,b)=>(a.position||0)-(b.position||0)).map(x=>x.image_url).filter(Boolean);
    return {...p,id:String(p.id),category:(cats||[]).find(c=>String(c.id)===String(p.category_id))?.name||'Outros',image:photos[0]||'assets/hero.svg',images:photos,variants:[],colors:[],sizes:[],stock:null};
  }).sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)));
}

boot=async function(){
  try{
    products=await lopheraBaseCatalog();
    if(!products.length) showDataNotice('Nenhum produto ativo encontrado.');
  }catch(e){
    console.error('LOPHERA V9 catálogo:',e);
    showDataNotice('Não foi possível carregar o catálogo agora. Atualize a página em instantes.');
    products=[];
  }
  renderProducts();
  updateCart();
};

openProduct=async function(id){
  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;
  if(!p.variants?.length){
    try{
      const {data,error}=await supabaseClient.from('product_variants').select('*').eq('product_id',id).eq('active',true);
      if(error)throw error;
      p.variants=data||[];
      p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];
      p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];
      p.stock=p.variants.reduce((a,v)=>a+(Number(v.stock)||0),0);
    }catch(e){console.error('LOPHERA V9 variações:',e);toast('Não foi possível carregar as opções deste produto.');return;}
  }
  const colors=p.colors||[],sizes=p.sizes||[];
  document.querySelector('#modal')?.classList.add('open');
  document.querySelector('#modalBody').innerHTML=`<button class="modal-close" onclick="closeModal()">×</button><div class="modal-img"><img src="${esc(p.image)}" onerror="this.src='assets/hero.svg'"></div><div class="modal-content"><div class="tag">${esc(p.category)}</div><h2>${esc(shortName(p.name))}</h2><div class="price" style="font-size:20px">${p.promotional_price?`<span class="old-price">${money(p.price)}</span>`:''}${money(p.promotional_price||p.price)}</div><p class="desc">${esc(p.description||'Uma peça Lophera pensada para unir estilo, conforto e personalidade.')}</p><div class="options">${colors.length?`<label>Cor</label><div class="option-row" data-kind="color">${colors.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pickVariant(this,'${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}${sizes.length?`<label>Tamanho</label><div class="option-row" data-kind="size">${sizes.map((x,i)=>`<button class="option ${i===0?'selected':''}" onclick="pickVariant(this,'${p.id}')">${esc(x)}</button>`).join('')}</div>`:''}</div><div id="variantStock" class="tag" style="margin-bottom:12px"></div><div style="display:flex;gap:10px;align-items:center"><div class="qty"><button onclick="changeQty(-1)">−</button><span id="q">1</span><button onclick="changeQty(1)">+</button></div><button id="addCartBtn" class="btn solid" onclick="addCart('${p.id}')">Adicionar ao carrinho</button></div></div>`;
  refreshVariantState(p);
  const firstValid=document.querySelector('[data-kind="size"] .option:not(:disabled)');
  if(firstValid&&!firstValid.classList.contains('selected')){document.querySelectorAll('[data-kind="size"] .option').forEach(x=>x.classList.remove('selected'));firstValid.classList.add('selected');refreshVariantState(p);}
};
window.boot=boot;window.openProduct=openProduct;