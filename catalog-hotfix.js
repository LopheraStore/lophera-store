/* Lophera Store — hotfix de catálogo V7
   Renderiza produtos sem esperar as 1000 variações e carrega variações ao abrir o produto. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const normalizeProduct=(p,categories,images)=>{
    const imgs=images.filter(x=>String(x.product_id)===String(p.id)).sort((a,b)=>(a.position||0)-(b.position||0)).map(x=>x.image_url).filter(Boolean);
    return {...p,id:String(p.id),category:categories.find(c=>String(c.id)===String(p.category_id))?.name||'Outros',image:imgs[0]||'assets/hero.svg',images:imgs,variants:[],colors:[],sizes:[],stock:0,_variantsLoaded:false};
  };
  async function rescueCatalog(){
    const grid=document.getElementById('productGrid');
    if(!grid||typeof supabaseClient==='undefined')return;
    await sleep(900);
    if(grid.children.length && !grid.querySelector('.empty'))return;
    try{
      const [pr,cr,ir]=await Promise.all([
        supabaseClient.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),
        supabaseClient.from('categories').select('*'),
        supabaseClient.from('product_images').select('*').order('position')
      ]);
      if(pr.error)throw pr.error;if(cr.error)throw cr.error;if(ir.error)throw ir.error;
      products=(pr.data||[]).map(p=>normalizeProduct(p,cr.data||[],ir.data||[]));
      if(typeof renderProducts==='function')renderProducts();
      if(typeof updateCart==='function')updateCart();
      const n=document.getElementById('dataNotice');if(n)n.style.display='none';
    }catch(e){
      console.error('Lophera catalog rescue:',e);
      try{
        const seed=await (await fetch('assets/products.json?v=7')).json();
        products=seed||[];
        if(typeof renderProducts==='function')renderProducts();
        if(typeof showDataNotice==='function')showDataNotice('Catálogo temporário carregado enquanto reconectamos a loja.');
      }catch(seedError){
        console.error('Lophera seed rescue:',seedError);
        grid.innerHTML='<div class="empty">Não foi possível carregar os produtos agora. Atualize a página em alguns instantes.</div>';
      }
    }
  }
  const originalOpen=window.openProduct;
  window.openProduct=async function(id){
    const p=products.find(x=>String(x.id)===String(id));
    if(p&&!p._variantsLoaded&&typeof supabaseClient!=='undefined'){
      try{
        const {data,error}=await supabaseClient.from('product_variants').select('*').eq('product_id',p.id).eq('active',true).order('id');
        if(error)throw error;
        p.variants=data||[];p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];p.stock=p.variants.reduce((a,v)=>a+(Number(v.stock)||0),0);p._variantsLoaded=true;
      }catch(e){console.error('Erro ao carregar variações do produto:',e);}
    }
    return originalOpen?originalOpen(id):undefined;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rescueCatalog);else rescueCatalog();
})();