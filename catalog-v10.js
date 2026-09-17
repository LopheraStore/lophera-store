/* Lophera Store V10 — catálogo resiliente
   1) mostra imediatamente o catálogo local de segurança
   2) atualiza com dados vivos do Supabase
   3) carrega as variações apenas ao abrir o produto
   Assim a vitrine não fica vazia se CDN/API/uma consulta falhar. */
(function(){
  let started=false;
  const appOpenProduct=window.openProduct;

  const normalizeSeed=p=>({
    ...p,
    id:String(p.id),
    category:p.category||'Outros',
    image:p.image||(Array.isArray(p.images)&&p.images[0])||'assets/hero.svg',
    images:Array.isArray(p.images)?p.images.filter(Boolean):[p.image].filter(Boolean),
    variants:[],
    colors:Array.isArray(p.colors)?p.colors.filter(Boolean):[],
    sizes:Array.isArray(p.sizes)?p.sizes.filter(Boolean):[],
    _source:'fallback'
  });

  const normalizeLive=(p,categories,images)=>{
    const photos=(images||[])
      .filter(x=>String(x.product_id)===String(p.id))
      .sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0))
      .map(x=>x.image_url).filter(Boolean);
    return {
      ...p,
      id:String(p.id),
      category:(categories||[]).find(c=>String(c.id)===String(p.category_id))?.name||'Outros',
      image:photos[0]||'assets/hero.svg',
      images:photos,
      variants:[],colors:[],sizes:[],stock:null,
      _source:'supabase',_variantsLoaded:false
    };
  };

  function notice(message){
    const el=document.getElementById('dataNotice');
    if(!el)return;
    if(message){el.textContent=message;el.style.display='block'}
    else el.style.display='none';
  }

  async function loadFallback(){
    const r=await fetch('assets/products.json?v=10',{cache:'no-store'});
    if(!r.ok)throw new Error('Fallback HTTP '+r.status);
    const data=await r.json();
    if(!Array.isArray(data)||!data.length)throw new Error('Fallback vazio');
    return data.map(normalizeSeed);
  }

  async function loadLive(){
    if(typeof supabaseClient==='undefined')throw new Error('Supabase client não carregou');
    const [pr,cr,ir]=await Promise.all([
      supabaseClient.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),
      supabaseClient.from('categories').select('*'),
      supabaseClient.from('product_images').select('*').order('position',{ascending:true})
    ]);
    if(pr.error)throw pr.error;
    if(cr.error)throw cr.error;
    if(ir.error)throw ir.error;
    if(!pr.data?.length)throw new Error('Supabase retornou zero produtos ativos');
    return pr.data.map(p=>normalizeLive(p,cr.data||[],ir.data||[]));
  }

  async function bootV10(){
    if(started)return;
    started=true;

    /* Primeiro: nunca deixar a vitrine em branco. */
    try{
      products=await loadFallback();
      renderProducts();
      updateCart();
    }catch(e){
      console.error('[Lophera V10] fallback falhou:',e);
    }

    /* Depois: trocar silenciosamente pelos dados oficiais do Supabase. */
    try{
      const live=await loadLive();
      products=live;
      renderProducts();
      updateCart();
      notice('');
      console.info('[Lophera V10] catálogo vivo carregado:',live.length,'produtos');
    }catch(e){
      console.error('[Lophera V10] Supabase falhou:',e);
      if(products?.length){
        notice('Catálogo carregado em modo de segurança. Os produtos estão visíveis enquanto reconectamos os dados ao vivo.');
      }else{
        notice('Não foi possível carregar o catálogo.');
        const grid=document.getElementById('productGrid');
        if(grid)grid.innerHTML='<div class="empty">Não foi possível carregar os produtos agora.</div>';
      }
    }
  }

  window.openProduct=async function(id){
    const p=products.find(x=>String(x.id)===String(id));
    if(!p)return;

    if(!p._variantsLoaded && typeof supabaseClient!=='undefined'){
      try{
        const {data,error}=await supabaseClient
          .from('product_variants').select('*')
          .eq('product_id',id).eq('active',true).order('id',{ascending:true});
        if(error)throw error;
        p.variants=data||[];
        p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];
        p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];
        p.stock=p.variants.reduce((sum,v)=>sum+(Number(v.stock)||0),0);
        p._variantsLoaded=true;
      }catch(e){
        console.error('[Lophera V10] variações falharam:',e);
      }
    }

    if(appOpenProduct)return appOpenProduct(id);
  };

  window.boot=bootV10;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootV10,{once:true});
  else bootV10();
})();
