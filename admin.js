
let adminProducts=[], categories=[];
const $=id=>document.getElementById(id);
const escA=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

async function init(){
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(session) await openAdmin(session); else showLogin();
 supabaseClient.auth.onAuthStateChange(async(_,session)=>{ if(session) await openAdmin(session); else showLogin(); });
}
function showLogin(){
 $('loginView').style.display='grid'; $('adminView').style.display='none'; $('logoutBtn').style.display='none'; $('adminEmail').textContent='';
}
async function login(e){
 e.preventDefault(); $('loginMsg').textContent='Entrando...';
 const {error}=await supabaseClient.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
 $('loginMsg').textContent=error?'Não foi possível entrar: '+error.message:'';
}
async function logout(){await supabaseClient.auth.signOut()}
async function openAdmin(session){
 const {data:isAdmin,error}=await supabaseClient.rpc('is_admin');
 if(error||!isAdmin){ await supabaseClient.auth.signOut(); $('loginMsg').textContent='Esta conta não tem permissão de administradora.'; return; }
 $('loginView').style.display='none'; $('adminView').style.display='block'; $('logoutBtn').style.display='inline-block'; $('adminEmail').textContent=session.user.email||'';
 await loadCategories(); await loadAdminProducts(); newProduct();
}
async function loadCategories(){
 const {data,error}=await supabaseClient.from('categories').select('*').order('name');
 if(error) return msg('Erro ao carregar categorias: '+error.message);
 categories=data||[];
 $('c').innerHTML=categories.map(x=>`<option value="${x.id}">${escA(x.name)}</option>`).join('');
}
async function loadAdminProducts(){
 const {data,error}=await supabaseClient.from('products').select('*,categories(name),product_images(*),product_variants(*)').order('created_at',{ascending:false});
 if(error) return msg('Erro ao carregar produtos: '+error.message);
 adminProducts=data||[]; renderAdminList();
}
function renderAdminList(){
 const q=($('adminSearch')?.value||'').toLowerCase();
 const list=adminProducts.filter(p=>p.name.toLowerCase().includes(q));
 $('adminList').innerHTML=list.map(p=>{
   const img=(p.product_images||[]).sort((a,b)=>(a.position||0)-(b.position||0))[0]?.image_url||'assets/hero.svg';
   const stock=(p.product_variants||[]).reduce((a,v)=>a+(Number(v.stock)||0),0);
   return `<div class="admin-product"><img src="${escA(img)}" onerror="this.src='assets/hero.svg'"><div class="admin-product-info"><b>${escA(p.name)}</b><span>${escA(p.categories?.name||'Sem categoria')} · ${Number(p.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · estoque ${stock}</span><span>${p.active?'Publicado':'Oculto'}${p.featured?' · Destaque':''}</span></div><div class="admin-product-actions"><button onclick="editProduct('${p.id}')">Editar</button><button class="danger" onclick="deleteProduct('${p.id}')">Excluir</button></div></div>`;
 }).join('')||'<div class="empty">Nenhum produto encontrado.</div>';
}
function newProduct(){
 $('productForm').reset(); $('editId').value=''; $('active').checked=true; $('stock').value=0; $('formTitle').textContent='Novo produto'; $('currentImage').innerHTML=''; $('formMsg').textContent='';
}
function editProduct(id){
 const p=adminProducts.find(x=>String(x.id)===String(id)); if(!p)return;
 $('editId').value=p.id; $('n').value=p.name||''; $('p').value=p.price||0; $('pp').value=p.promotional_price||''; $('c').value=p.category_id||'';
 $('d').value=p.description||''; $('active').checked=!!p.active; $('featured').checked=!!p.featured;
 const vars=p.product_variants||[]; $('co').value=[...new Set(vars.map(v=>v.color).filter(Boolean))].join(', '); $('s').value=[...new Set(vars.map(v=>v.size).filter(Boolean))].join(', ');
 $('stock').value=vars[0]?.stock??0;
 const img=(p.product_images||[]).sort((a,b)=>(a.position||0)-(b.position||0))[0]?.image_url;
 $('currentImage').innerHTML=img?`<div class="current-photo"><img src="${escA(img)}"><span>Foto atual</span></div>`:'';
 $('formTitle').textContent='Editar produto'; window.scrollTo({top:0,behavior:'smooth'});
}
async function ensureCategory(){
 if($('c').value) return Number($('c').value);
 const name='Outros', slug='outros';
 let existing=categories.find(x=>x.slug===slug); if(existing)return existing.id;
 const {data,error}=await supabaseClient.from('categories').insert({name,slug}).select().single();
 if(error) throw error; categories.push(data); return data.id;
}
async function uploadPhoto(productId,file){
 if(!file)return null;
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
 const path=`${productId}/${Date.now()}.${ext}`;
 const {error}=await supabaseClient.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type||undefined});
 if(error) throw error;
 return supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
async function saveProduct(e){
 e.preventDefault(); msg('Salvando...');
 try{
   const category_id=await ensureCategory(), id=$('editId').value;
   const payload={name:$('n').value.trim(),slug:slugify($('n').value)+(id?'-'+id:'-'+Date.now()),description:$('d').value.trim(),category_id,price:Number($('p').value||0),promotional_price:$('pp').value?Number($('pp').value):null,active:$('active').checked,featured:$('featured').checked};
   let product;
   if(id){
     delete payload.slug;
     const {data,error}=await supabaseClient.from('products').update(payload).eq('id',id).select().single(); if(error)throw error; product=data;
   }else{
     const {data,error}=await supabaseClient.from('products').insert(payload).select().single(); if(error)throw error; product=data;
   }
   const photo=$('photo').files[0];
   if(photo){
     const url=await uploadPhoto(product.id,photo);
     const {error}=await supabaseClient.from('product_images').insert({product_id:product.id,image_url:url,position:0}); if(error)throw error;
   }
   const colors=$('co').value.split(',').map(x=>x.trim()).filter(Boolean), sizes=$('s').value.split(',').map(x=>x.trim()).filter(Boolean);
   const cs=colors.length?colors:['']; const ss=sizes.length?sizes:[''];
   await supabaseClient.from('product_variants').delete().eq('product_id',product.id);
   const variants=[]; for(const color of cs)for(const size of ss)variants.push({product_id:product.id,color:color||null,size:size||null,stock:Number($('stock').value||0),active:true});
   if(variants.length){const {error}=await supabaseClient.from('product_variants').insert(variants);if(error)throw error}
   msg('Produto salvo com sucesso ♡'); await loadAdminProducts(); editProduct(product.id);
 }catch(err){console.error(err);msg('Erro ao salvar: '+err.message)}
}
async function deleteProduct(id){
 if(!confirm('Excluir este produto? Essa ação remove também as variações e referências de imagens.'))return;
 const {error}=await supabaseClient.from('products').delete().eq('id',id);
 if(error)return msg('Erro ao excluir: '+error.message);
 await loadAdminProducts(); newProduct(); msg('Produto excluído.');
}
function msg(t){$('formMsg').textContent=t}
window.login=login;window.logout=logout;window.newProduct=newProduct;window.saveProduct=saveProduct;window.editProduct=editProduct;window.deleteProduct=deleteProduct;window.renderAdminList=renderAdminList;
init();
