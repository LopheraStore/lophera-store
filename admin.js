
let adminProducts=[],categories=[],storeSettings={id:'main',content:{},instagram_items:[],size_guides:{}},activeEdit=null;
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k]!==undefined?a[k]:undefined,o);
const setPath=(o,p,v)=>{let a=o,ks=p.split('.');ks.slice(0,-1).forEach(k=>a=a[k]??=( {}));a[ks.at(-1)]=v;return o};

async function init(){const {data:{session}}=await supabaseClient.auth.getSession();if(session)await openAdmin(session);else showLogin();supabaseClient.auth.onAuthStateChange(async(_,s)=>s?await openAdmin(s):showLogin())}
function showLogin(){$('loginView').style.display='grid';$('adminView').style.display='none';$('logoutBtn').style.display='none'}
async function login(e){e.preventDefault();$('loginMsg').textContent='Entrando...';const {error}=await supabaseClient.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});$('loginMsg').textContent=error?'Erro: '+error.message:''}
async function logout(){await supabaseClient.auth.signOut()}
async function openAdmin(s){const {data,error}=await supabaseClient.rpc('is_admin');if(error||!data){await supabaseClient.auth.signOut();return}$('loginView').style.display='none';$('adminView').style.display='grid';$('logoutBtn').style.display='inline-block';$('adminEmail').textContent=s.user.email||'';await loadCategories();await loadAdminProducts();await loadSettings()}
function showTab(n,b){document.querySelectorAll('.admin-tab').forEach(x=>x.style.display='none');$('tab-'+n).style.display='block';document.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));b?.classList.add('active')}
function previewPage(page,b){$('sitePreview').src=page+'?adminPreview=1&t='+Date.now();$('previewUrl').textContent='lophera.com.br/'+(page==='index.html'?'':page);document.querySelectorAll('.v3-pagebuttons .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active')}

async function loadSettings(){const {data,error}=await supabaseClient.from('store_settings').select('*').eq('id','main').maybeSingle();if(error)return alert(error.message);storeSettings=data||storeSettings;storeSettings.content=storeSettings.content||{};storeSettings.size_guides=storeSettings.size_guides||{};$('settingTopbar').value=storeSettings.topbar_text||'';$('settingInstagram').value=storeSettings.instagram_handle||'';$('settingInstagramUrl').value=storeSettings.instagram_url||'';$('settingFacebookUrl').value=storeSettings.facebook_url||'';$('settingLinktreeUrl').value=storeSettings.linktree_url||'';$('settingWhatsapp').value=storeSettings.whatsapp||'';$('logoPreview').innerHTML=`<img class="setting-main-preview" src="${esc(storeSettings.logo_url||'assets/logo-lophera.png')}">`;$('heroPreview').innerHTML=`<img class="setting-main-preview hero-setting-preview" src="${esc(storeSettings.hero_image_url||'assets/hero.svg')}">`;renderInstagramRows();applyGuidePreviews()}
async function upsertSettings(patch){
  const payload={...patch,updated_at:new Date().toISOString()};
  const {data,error}=await supabaseClient.from('store_settings').update(payload).eq('id','main').select().single();
  if(error)throw error;
  if(!data)throw new Error('A configuração não foi encontrada no banco.');
  storeSettings={...storeSettings,...data};
  return data;
}
async function uploadSetting(file,folder){if(!file)return null;const ext=(file.name.split('.').pop()||'png').replace(/[^a-z0-9]/gi,'').toLowerCase();const path=`site/${folder}-${Date.now()}.${ext}`;const {error}=await supabaseClient.storage.from('product-images').upload(path,file,{contentType:file.type||undefined});if(error)throw error;return supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl}

window.addEventListener('message',e=>{if(e.data?.type!=='lophera-edit')return;activeEdit=e.data;$('editLabel').textContent=e.data.label;$('editSize').textContent=e.data.size||'';const current=getPath(storeSettings.content,e.data.key)??e.data.value??'';if(['image','background'].includes(e.data.editType)){$('editField').innerHTML=`<label class="upload-drop">Escolher nova imagem<input id="quickFile" type="file" accept="image/*"></label><div class="quick-help">A imagem será enviada para o armazenamento da Lophera.</div>`}else{$('editField').innerHTML=e.data.editType==='textarea'||e.data.editType==='html'?`<textarea id="quickValue" rows="7">${esc(String(current).replace(/<br\s*\/?>/gi,'\n'))}</textarea>`:`<input id="quickValue" value="${esc(current)}">`}$('editModal').style.display='grid';$('editMsg').textContent=''})
function closeEditModal(){$('editModal').style.display='none';activeEdit=null}
function applyEditToPreview(edit,value){
  const frame=$('sitePreview');
  const doc=frame?.contentDocument;
  if(!doc)return;
  doc.querySelectorAll(`[data-edit-key="${edit.key}"]`).forEach(el=>{
    if(edit.editType==='image' && el.tagName==='IMG') el.src=value;
    else if(edit.editType==='background') el.style.backgroundImage=`url("${value}")`;
    else if(edit.editType==='html') el.innerHTML=value;
    else el.textContent=value;
  });
  if(edit.key==='logo_url') doc.querySelectorAll('.logo, footer img').forEach(img=>img.src=value);
  if(edit.key==='hero_image_url'){
    const hero=doc.querySelector('.hero');
    if(hero) hero.style.backgroundImage=`url("${value}")`;
  }
  if(edit.key==='topbar_text') doc.querySelectorAll('.topbar').forEach(el=>el.textContent=value);
}
function reloadPreviewFresh(){
  const frame=$('sitePreview');
  if(!frame)return;
  const raw=frame.getAttribute('src')||'index.html?adminPreview=1';
  const u=new URL(raw,location.href);
  u.searchParams.set('adminPreview','1');
  u.searchParams.set('refresh',Date.now());
  frame.src=u.pathname.split('/').pop()+u.search;
}
async function saveVisualEdit(){
  if(!activeEdit)return;
  $('editMsg').textContent='Salvando...';
  try{
    let value;
    if(['image','background'].includes(activeEdit.editType)){
      const f=$('quickFile').files[0];
      if(!f)throw new Error('Escolha uma imagem.');
      value=await uploadSetting(f,'visual-'+activeEdit.key.replace(/\./g,'-'));
      if(activeEdit.key==='logo_url') await upsertSettings({logo_url:value});
      else if(activeEdit.key==='hero_image_url') await upsertSettings({hero_image_url:value});
      else{
        const c=structuredClone(storeSettings.content||{});
        setPath(c,activeEdit.key,value);
        await upsertSettings({content:c});
      }
    }else{
      value=$('quickValue').value;
      if(activeEdit.editType==='html') value=esc(value).replace(/\n/g,'<br>');
      if(activeEdit.key==='topbar_text') await upsertSettings({topbar_text:value});
      else{
        const c=structuredClone(storeSettings.content||{});
        setPath(c,activeEdit.key,value);
        await upsertSettings({content:c});
      }
    }

    // Confere o que realmente ficou gravado antes de dizer "Salvo".
    const {data:check,error:checkError}=await supabaseClient.from('store_settings').select('*').eq('id','main').single();
    if(checkError)throw checkError;
    storeSettings=check;
    let persisted;
    if(activeEdit.key==='logo_url') persisted=check.logo_url;
    else if(activeEdit.key==='hero_image_url') persisted=check.hero_image_url;
    else if(activeEdit.key==='topbar_text') persisted=check.topbar_text;
    else persisted=getPath(check.content||{},activeEdit.key);
    if(String(persisted??'')!==String(value??'')) throw new Error('O Supabase não confirmou a alteração.');

    applyEditToPreview(activeEdit,value);
    $('editMsg').textContent='Salvo ♡';
    setTimeout(()=>{closeEditModal();reloadPreviewFresh()},500);
  }catch(err){
    $('editMsg').textContent='Erro: '+err.message;
  }
}

async function saveIdentity(which){try{const f=$(which==='logo'?'settingLogo':'settingHero').files[0];if(!f)throw new Error('Escolha uma imagem primeiro.');const url=await uploadSetting(f,which);await upsertSettings(which==='logo'?{logo_url:url}:{hero_image_url:url});$('identityMsg').textContent='Alteração salva ♡';await loadSettings();$('sitePreview').contentWindow.location.reload()}catch(e){$('identityMsg').textContent='Erro: '+e.message}}
async function saveInfo(e){e.preventDefault();try{await upsertSettings({topbar_text:$('settingTopbar').value,instagram_handle:$('settingInstagram').value,instagram_url:$('settingInstagramUrl').value,facebook_url:$('settingFacebookUrl').value,linktree_url:$('settingLinktreeUrl').value,whatsapp:$('settingWhatsapp').value.replace(/\D/g,'')});$('infoMsg').textContent='Informações salvas ♡'}catch(e){$('infoMsg').textContent='Erro: '+e.message}}

function renderInstagramRows(){const items=Array.isArray(storeSettings.instagram_items)?storeSettings.instagram_items:[];$('instaRows').innerHTML='';items.slice(0,6).forEach(addInstagramRow)}
function addInstagramRow(item={}){if(document.querySelectorAll('.insta-row').length>=6)return;const d=document.createElement('div');d.className='insta-row';d.dataset.url=item.image_url||'';d.innerHTML=`<div class="insta-thumb">${item.image_url?`<img src="${esc(item.image_url)}">`:'1080 × 1080'}</div><input class="insta-file" type="file" accept="image/*"><input class="insta-link" type="url" value="${esc(item.link||'')}" placeholder="Link do post"><button class="mini-danger" onclick="this.parentElement.remove()">×</button>`;$('instaRows').appendChild(d)}
async function saveInstagram(){try{const items=[];for(const [i,r] of [...document.querySelectorAll('.insta-row')].entries()){const f=r.querySelector('.insta-file').files[0],url=f?await uploadSetting(f,'instagram-'+i):r.dataset.url;if(url)items.push({image_url:url,link:r.querySelector('.insta-link').value.trim()})}await upsertSettings({instagram_items:items});$('instagramMsg').textContent='Vitrine salva ♡';await loadSettings()}catch(e){$('instagramMsg').textContent='Erro: '+e.message}}

async function loadCategories(){const {data,error}=await supabaseClient.from('categories').select('*').order('name');if(error)return;categories=data||[];renderCategories()}
function renderCategories(){const el=$('categoryList');if(!el)return;el.innerHTML=categories.map(c=>`<div class="category-row"><div><b>${esc(c.name)}</b><span>${esc(c.slug)}</span></div><div><button class="btn" onclick="editCategory('${c.id}')">Editar</button><button class="mini-danger text" onclick="deleteCategory('${c.id}')">Excluir</button></div></div>`).join('')}
async function newCategory(){const name=prompt('Nome da nova categoria:');if(!name)return;const {error}=await supabaseClient.from('categories').insert({name,slug:slugify(name)});if(error)return alert(error.message);await loadCategories()}
async function editCategory(id){const c=categories.find(x=>String(x.id)===String(id)),name=prompt('Nome da categoria:',c.name);if(!name)return;const {error}=await supabaseClient.from('categories').update({name,slug:slugify(name)}).eq('id',id);if(error)return alert(error.message);await loadCategories();await loadAdminProducts()}
async function deleteCategory(id){if(!confirm('Excluir esta categoria? Os produtos ficarão sem categoria.'))return;const {error}=await supabaseClient.from('categories').delete().eq('id',id);if(error)return alert(error.message);await loadCategories();await loadAdminProducts()}

async function loadAdminProducts(){const {data,error}=await supabaseClient.from('products').select('*').order('created_at',{ascending:false});if(error)return;adminProducts=data||[];const ids=adminProducts.map(x=>x.id);let images=[],variants=[];if(ids.length){const ir=await supabaseClient.from('product_images').select('*').in('product_id',ids).order('position');const vr=await supabaseClient.from('product_variants').select('*').in('product_id',ids);images=ir.data||[];variants=vr.data||[]}adminProducts=adminProducts.map(p=>({...p,category:categories.find(c=>String(c.id)===String(p.category_id)),images:images.filter(i=>String(i.product_id)===String(p.id)),variants:variants.filter(v=>String(v.product_id)===String(p.id))}));renderAdminList()}
function renderAdminList(){if(!$('adminList'))return;const q=($('adminSearch')?.value||'').toLowerCase();const arr=adminProducts.filter(p=>p.name.toLowerCase().includes(q));$('adminList').innerHTML=arr.map(p=>`<button class="product-card-admin" onclick="editProduct('${p.id}')"><img src="${esc(p.images[0]?.image_url||'assets/hero.svg')}"><div><b>${esc(p.name)}</b><span>${esc(p.category?.name||'Sem categoria')}</span><strong>${Number(p.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div><i>${p.active?'● Online':'○ Oculto'}</i></button>`).join('')||'<div class="empty">Nenhum produto.</div>'}
function productForm(p={}){const vars=p.variants||[], imgs=p.images||[];return `<div class="drawer-head"><div><div class="small">${p.id?'EDITAR PRODUTO':'NOVO PRODUTO'}</div><h2>${p.id?esc(p.name):'Adicionar produto'}</h2></div><button class="modal-x" onclick="$('productDrawer').innerHTML='<div class=drawer-empty>Selecione um produto.</div>'">×</button></div><form class="form" onsubmit="saveProduct(event)"><input id="editId" type="hidden" value="${p.id||''}"><label>Nome<input id="n" required value="${esc(p.name||'')}"></label><div class="form-two"><label>Preço<input id="p" type="number" step=".01" value="${p.price??''}" required></label><label>Preço promocional<input id="pp" type="number" step=".01" value="${p.promotional_price??''}"></label></div><label>Categoria<select id="c">${categories.map(c=>`<option value="${c.id}" ${String(c.id)===String(p.category_id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Descrição<textarea id="d" rows="6">${esc(p.description||'')}</textarea></label><div class="checks"><label><input id="active" type="checkbox" ${p.id?(p.active?'checked':''):'checked'}> Publicado</label><label><input id="featured" type="checkbox" ${p.featured?'checked':''}> Destaque</label></div><div class="subsection"><div class="sub-head"><h3>Fotos</h3><span>Quadrada recomendada: 1200 × 1200 px</span></div><div class="gallery-admin">${imgs.map(i=>`<div class="gallery-item"><img src="${esc(i.image_url)}"><button type="button" onclick="removeProductImage('${i.id}','${p.id}')">×</button></div>`).join('')}<label class="add-photo">+<small>Adicionar</small><input id="photos" type="file" accept="image/*" multiple></label></div></div><div class="subsection"><div class="sub-head"><h3>Variações e estoque</h3><button type="button" class="btn" onclick="addVariantRow()">+ Variação</button></div><div id="variantRows">${vars.map(variantRow).join('')}</div></div><div class="drawer-actions"><button class="btn solid">Salvar produto</button>${p.id?`<button type="button" class="mini-danger text" onclick="deleteProduct('${p.id}')">Excluir produto</button>`:''}</div><div id="formMsg" class="form-msg"></div></form>`}
function variantRow(v={}){return `<div class="variant-row"><input class="v-color" placeholder="Cor" value="${esc(v.color||'')}"><input class="v-size" placeholder="Tamanho" value="${esc(v.size||'')}"><input class="v-sku" placeholder="SKU" value="${esc(v.sku||'')}"><input class="v-stock" type="number" min="0" placeholder="Estoque" value="${v.stock??0}"><button type="button" class="mini-danger" onclick="this.parentElement.remove()">×</button></div>`}
function addVariantRow(){$('variantRows').insertAdjacentHTML('beforeend',variantRow())}
function newProduct(){$('productDrawer').innerHTML=productForm({variants:[{}]})}
function editProduct(id){const p=adminProducts.find(x=>String(x.id)===String(id));if(p)$('productDrawer').innerHTML=productForm(p)}
async function uploadProductPhoto(id,f,pos){const ext=(f.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'');const path=`${id}/${Date.now()}-${pos}.${ext}`;const {error}=await supabaseClient.storage.from('product-images').upload(path,f,{contentType:f.type||undefined});if(error)throw error;const url=supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl;const r=await supabaseClient.from('product_images').insert({product_id:id,image_url:url,position:pos});if(r.error)throw r.error}
async function saveProduct(e){e.preventDefault();$('formMsg').textContent='Salvando...';try{const id=$('editId').value,payload={name:$('n').value.trim(),description:$('d').value,category_id:$('c').value||null,price:Number($('p').value),promotional_price:$('pp').value?Number($('pp').value):null,active:$('active').checked,featured:$('featured').checked};let prod;if(id){const r=await supabaseClient.from('products').update(payload).eq('id',id).select().single();if(r.error)throw r.error;prod=r.data}else{payload.slug=slugify(payload.name)+'-'+Date.now();const r=await supabaseClient.from('products').insert(payload).select().single();if(r.error)throw r.error;prod=r.data}const files=[...($('photos')?.files||[])];for(let i=0;i<files.length;i++)await uploadProductPhoto(prod.id,files[i],(prod.images?.length||0)+i);await supabaseClient.from('product_variants').delete().eq('product_id',prod.id);const rows=[...document.querySelectorAll('.variant-row')].map(r=>({product_id:prod.id,color:r.querySelector('.v-color').value||null,size:r.querySelector('.v-size').value||null,sku:r.querySelector('.v-sku').value||null,stock:Number(r.querySelector('.v-stock').value||0),active:true}));if(rows.length){const rr=await supabaseClient.from('product_variants').insert(rows);if(rr.error)throw rr.error}$('formMsg').textContent='Produto salvo ♡';await loadAdminProducts();editProduct(prod.id)}catch(err){$('formMsg').textContent='Erro: '+err.message}}
async function removeProductImage(imgId,pid){if(!confirm('Remover esta foto do produto?'))return;const {error}=await supabaseClient.from('product_images').delete().eq('id',imgId);if(error)return alert(error.message);await loadAdminProducts();editProduct(pid)}
async function deleteProduct(id){if(!confirm('Excluir este produto?'))return;const {error}=await supabaseClient.from('products').delete().eq('id',id);if(error)return alert(error.message);await loadAdminProducts();$('productDrawer').innerHTML='<div class="drawer-empty">Produto excluído.</div>'}

function applyGuidePreviews(){const g=storeSettings.size_guides||{};const imgs=document.querySelectorAll('.guide-admin-img');if(g.oversized&&imgs[0])imgs[0].src=g.oversized;if(g.moletom&&imgs[1])imgs[1].src=g.moletom}
async function saveGuide(type){try{const input=$(type==='oversized'?'guideOversized':'guideMoletom'),f=input.files[0];if(!f)throw new Error('Escolha uma imagem.');const url=await uploadSetting(f,'guia-'+type),g={...(storeSettings.size_guides||{}),[type]:url};await upsertSettings({size_guides:g});$('guideMsg').textContent='Guia atualizado ♡';await loadSettings()}catch(e){$('guideMsg').textContent='Erro: '+e.message}}

Object.assign(window,{login,logout,showTab,previewPage,closeEditModal,saveVisualEdit,saveIdentity,saveInfo,addInstagramRow,saveInstagram,newCategory,editCategory,deleteCategory,newProduct,editProduct,addVariantRow,saveProduct,removeProductImage,deleteProduct,saveGuide,renderAdminList});

/* ===== V3.1 — EDITOR VISUAL ROBUSTO (controle pelo painel pai) ===== */
function installVisualEditor(){
  const frame=$('sitePreview');
  if(!frame)return;
  try{
    const doc=frame.contentDocument || frame.contentWindow.document;
    if(!doc || !doc.body)return;

    let st=doc.getElementById('lophera-v31-editor-style');
    if(!st){
      st=doc.createElement('style');
      st.id='lophera-v31-editor-style';
      st.textContent=`
        [data-edit-key]{position:relative!important;cursor:pointer!important;outline:1px dashed transparent;outline-offset:4px;transition:.15s}
        [data-edit-key]:hover{outline:2px dashed #7b4b8c!important;outline-offset:5px}
        [data-edit-key]::after{
          content:"✎";position:absolute;right:8px;top:8px;z-index:2147483647;
          width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:#633d70;color:white;font:700 16px Arial;box-shadow:0 3px 12px #0005;
          opacity:0;pointer-events:none
        }
        [data-edit-key]:hover::after{opacity:1}
      `;
      doc.head.appendChild(st);
    }

    doc.querySelectorAll('[data-edit-key]').forEach(el=>{
      if(el.dataset.v31Bound==='1')return;
      el.dataset.v31Bound='1';
      el.title='Clique para editar: '+(el.dataset.editLabel||el.dataset.editKey);
      el.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const type=el.dataset.editType||'text';
        let value='';
        if(type==='html') value=el.innerHTML;
        else if(type!=='image' && type!=='background') value=el.textContent.trim();
        openVisualEdit({
          key:el.dataset.editKey,
          editType:type,
          label:el.dataset.editLabel||el.dataset.editKey,
          size:el.dataset.editSize||'',
          value
        });
      },true);
    });
  }catch(err){
    console.error('Lophera editor:',err);
  }
}

function openVisualEdit(data){
  activeEdit=data;
  $('editLabel').textContent=data.label||'Editar';
  $('editSize').textContent=data.size||'';
  const current=getPath(storeSettings.content,data.key) ?? data.value ?? '';
  if(['image','background'].includes(data.editType)){
    $('editField').innerHTML=`<label class="upload-drop">Escolher nova imagem<input id="quickFile" type="file" accept="image/*"></label><div class="quick-help">${esc(data.size||'A proporção original da imagem será preservada.')}</div>`;
  }else{
    const val=String(current).replace(/<br\s*\/?>/gi,'\n');
    $('editField').innerHTML=(data.editType==='textarea'||data.editType==='html')
      ? `<textarea id="quickValue" rows="7">${esc(val)}</textarea>`
      : `<input id="quickValue" value="${esc(val)}">`;
  }
  $('editMsg').textContent='';
  $('editModal').style.display='grid';
}

function bindPreviewEditor(){
  const frame=$('sitePreview');
  if(!frame || frame.dataset.v31Listener==='1')return;
  frame.dataset.v31Listener='1';
  frame.addEventListener('load',()=>setTimeout(installVisualEditor,350));
  setTimeout(installVisualEditor,600);
}

const _openAdminV31=openAdmin;
openAdmin=async function(s){
  await _openAdminV31(s);
  bindPreviewEditor();
};

const _previewPageV31=previewPage;
previewPage=function(page,b){
  _previewPageV31(page,b);
  setTimeout(bindPreviewEditor,50);
};

window.openVisualEdit=openVisualEdit;
window.installVisualEditor=installVisualEditor;
window.previewPage=previewPage;

init();
