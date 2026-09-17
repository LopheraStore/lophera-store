/* Lophera Store V10.1 — catálogo resiliente
   Produtos são a fonte principal. Categorias/imagens são enriquecimento opcional.
   A vitrine local aparece primeiro e o Supabase substitui assim que possível. */
(function(){
  let started=false;
  const appOpenProduct=window.openProduct;

  const normalizeSeed=p=>({
    ...p,id:String(p.id),category:p.category||'Outros',
    image:p.image||(Array.isArray(p.images)&&p.images[0])||'assets/hero.svg',
    images:Array.isArray(p.images)?p.images.filter(Boolean):[p.image].filter(Boolean),
    variants:[],colors:Array.isArray(p.colors)?p.colors.filter(Boolean):[],sizes:Array.isArray(p.sizes)?p.sizes.filter(Boolean):[],
    _source:'fallback',_variantsLoaded:false
  });

  function seedById(id){return (products||[]).find(x=>String(x.id)===String(id));}

  const normalizeLive=(p,categories,images)=>{
    const photos=(images||[]).filter(x=>String(x.product_id)===String(p.id))
      .sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0)).map(x=>x.image_url).filter(Boolean);
    const old=seedById(p.id);
    return {...p,id:String(p.id),
      category:(categories||[]).find(c=>String(c.id)===String(p.category_id))?.name||old?.category||'Outros',
      image:photos[0]||old?.image||'assets/hero.svg',images:photos.length?photos:(old?.images||[]),
      variants:[],colors:[],sizes:[],stock:null,_source:'supabase',_variantsLoaded:false};
  };

  function notice(message){const el=document.getElementById('dataNotice');if(!el)return;if(message){el.textContent=message;el.style.display='block'}else el.style.display='none';}

  async function loadFallback(){
    const r=await fetch('assets/products.json?v=10.1',{cache:'no-store'});
    if(!r.ok)throw new Error('Fallback HTTP '+r.status);
    const data=await r.json();
    if(!Array.isArray(data)||!data.length)throw new Error('Fallback vazio');
    return data.map(normalizeSeed);
  }

  async function loadLive(){
    if(typeof supabaseClient==='undefined')throw new Error('Supabase client não carregou');
    const pr=await supabaseClient.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false});
    if(pr.error)throw new Error('Produtos: '+pr.error.message);
    if(!pr.data?.length)throw new Error('Supabase retornou zero produtos ativos');

    let cats=[],imgs=[];
    const [cr,ir]=await Promise.all([
      supabaseClient.from('categories').select('*'),
      supabaseClient.from('product_images').select('*')
    ]);
    if(cr.error)console.warn('[Lophera] categorias indisponíveis:',cr.error); else cats=cr.data||[];
    if(ir.error)console.warn('[Lophera] imagens indisponíveis:',ir.error); else imgs=ir.data||[];

    return pr.data.map(p=>normalizeLive(p,cats,imgs));
  }

  async function bootV10(){
    if(started)return; started=true;
    try{products=await loadFallback();renderProducts();updateCart();}catch(e){console.error('[Lophera V10.1] fallback falhou:',e);}
    try{
      const live=await loadLive();products=live;renderProducts();updateCart();notice('');
      console.info('[Lophera V10.1] catálogo vivo carregado:',live.length,'produtos');
    }catch(e){
      console.error('[Lophera V10.1] Supabase falhou:',e);
      if(products?.length)notice('Catálogo carregado em modo de segurança. Os produtos estão visíveis enquanto reconectamos os dados ao vivo.');
      else{notice('Não foi possível carregar o catálogo.');const grid=document.getElementById('productGrid');if(grid)grid.innerHTML='<div class="empty">Não foi possível carregar os produtos agora.</div>';}
    }
  }

  window.openProduct=async function(id){
    const p=products.find(x=>String(x.id)===String(id));if(!p)return;
    if(!p._variantsLoaded&&typeof supabaseClient!=='undefined'){
      try{
        const {data,error}=await supabaseClient.from('product_variants').select('*').eq('product_id',id).eq('active',true).order('id',{ascending:true});
        if(error)throw error;
        p.variants=data||[];p.colors=[...new Set(p.variants.map(v=>v.color).filter(Boolean))];p.sizes=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];p.stock=p.variants.reduce((sum,v)=>sum+(Number(v.stock)||0),0);p._variantsLoaded=true;
      }catch(e){console.error('[Lophera V10.1] variações falharam:',e);}
    }
    if(appOpenProduct)return appOpenProduct(id);
  };

  window.boot=bootV10;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV10,{once:true});else bootV10();
})();
