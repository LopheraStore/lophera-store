/* Lophera — analytics próprio e respeitoso */
(function(){
  const THIRTY_MIN=30*60*1000;
  function device(){
    const w=Math.min(window.innerWidth||screen.width||0,screen.width||9999);
    if(w<=700)return 'Celular';
    if(w<=1100)return 'Tablet';
    return 'Desktop';
  }
  function meta(){
    try{
      const old=JSON.parse(localStorage.getItem('lophera_visit_meta')||'null');
      if(old?.id&&old?.token&&Date.now()-Number(old.last||0)<THIRTY_MIN){
        old.last=Date.now();localStorage.setItem('lophera_visit_meta',JSON.stringify(old));return old;
      }
    }catch(_){}
    const m={id:crypto.randomUUID(),token:crypto.randomUUID(),last:Date.now()};
    localStorage.setItem('lophera_visit_meta',JSON.stringify(m));return m;
  }
  async function track(){
    if(typeof supabaseClient==='undefined')return;
    const m=meta();
    try{
      await supabaseClient.rpc('track_visitor_session',{
        p_session_id:m.id,
        p_visitor_token:m.token,
        p_path:location.pathname+location.search,
        p_title:document.title||null,
        p_referrer:document.referrer||null,
        p_device_type:device()
      });
    }catch(_){}
  }
  async function identify(){
    if(typeof supabaseClient==='undefined')return;
    const m=meta();
    try{await supabaseClient.rpc('identify_visitor_session',{p_session_id:m.id,p_visitor_token:m.token})}catch(_){}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    track();
    try{supabaseClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)identify()})}catch(_){}
  },{once:true});
})();
/* Carrega o atendimento em todas as páginas públicas que usam analytics. */
(function(){
  function loadLopheraChat(){
    if(document.querySelector('script[data-lophera-chat]'))return;
    const s=document.createElement('script');s.src='site-chat.js?v=2';s.dataset.lopheraChat='1';document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadLopheraChat,{once:true});else loadLopheraChat();
})();
