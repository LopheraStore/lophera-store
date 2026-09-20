/* Lophera Studio V8.1 — visitantes */
(function(){
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let cache=[];
  function ago(iso){
    if(!iso)return '—';
    const m=Math.floor(Math.max(0,Date.now()-new Date(iso).getTime())/60000);
    if(m<1)return 'agora';
    if(m<60)return 'há '+m+' min';
    const h=Math.floor(m/60);if(h<24)return 'há '+h+'h';
    const d=Math.floor(h/24);return 'há '+d+' dia'+(d===1?'':'s');
  }
  function duration(a,b){
    if(!a||!b)return '—';
    const m=Math.max(0,Math.floor((new Date(b)-new Date(a))/60000));
    if(m<1)return '< 1 min'; if(m<60)return m+' min'; return Math.floor(m/60)+'h '+m%60+'min';
  }
  function host(r){
    if(!r)return 'Direto / desconhecido';
    try{return new URL(r).hostname.replace(/^www\./,'')}catch(_){return r}
  }
  function ensure(){
    if($('tab-visitors'))return true;
    const side=document.querySelector('.v3-sidebar'),main=document.querySelector('.v3-main');if(!side||!main)return false;
    const relTitle=[...side.querySelectorAll('.v3-side-title')].find(x=>x.textContent==='RELACIONAMENTO');
    const b=document.createElement('button');b.className='side-link';b.textContent='◉ Visitantes';b.onclick=()=>{showTab('visitors',b);loadVisitors()};
    if(relTitle)relTitle.insertAdjacentElement('afterend',b);else side.appendChild(b);
    main.insertAdjacentHTML('beforeend',`
      <section id="tab-visitors" class="admin-tab" style="display:none">
        <div class="v3-pagebar"><div><div class="small">RELACIONAMENTO</div><h2>Visitantes</h2><p>Veja sessões do site. A identidade só aparece quando a pessoa entra na conta da Lophera.</p></div><button class="btn" onclick="loadVisitors()">↻ Atualizar</button></div>
        <div id="visitorsAdminList"><div class="empty">Carregando visitantes…</div></div>
      </section>`);
    if(!$('visitor-style')){
      const s=document.createElement('style');s.id='visitor-style';s.textContent=`
        .visitor-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
        .visitor-kpi,.visitor-card{background:#fff;border:1px solid #e3d7e6;border-radius:10px;padding:16px}
        .visitor-kpi span{display:block;font-size:9px;color:#857287;text-transform:uppercase;letter-spacing:1px}.visitor-kpi b{display:block;font:500 28px "Cormorant Garamond",serif;color:#4d3157;margin-top:5px}
        .visitor-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.visitor-tools input,.visitor-tools select{padding:10px;border:1px solid #d9cbdc;background:#fff}.visitor-tools input{flex:1;min-width:220px}
        .visitor-card{margin-bottom:12px}.visitor-head{display:flex;justify-content:space-between;gap:12px}.visitor-head h3{font:500 25px "Cormorant Garamond",serif;margin:2px 0}.visitor-meta{font-size:10px;color:#776a7b;line-height:1.7}.visitor-badge{font-size:9px;padding:6px 9px;border-radius:999px;height:max-content;background:#eee6f5;color:#634274}.visitor-badge.online{background:#e7f4ea;color:#3f744a}.visitor-pages{margin-top:12px;border-top:1px solid #eee5f0;padding-top:10px}.visitor-page{display:flex;justify-content:space-between;gap:10px;padding:6px 0;font-size:10px}.visitor-page span{color:#85778a}
        @media(max-width:700px){.visitor-kpis{grid-template-columns:1fr 1fr}.visitor-head{flex-direction:column}}
      `;document.head.appendChild(s);
    }
    return true;
  }
  function render(stats){
    const root=$('visitorsAdminList');if(!root)return;
    const q=($('visitorSearch')?.value||'').toLowerCase();
    const f=$('visitorFilter')?.value||'all';
    const list=cache.filter(v=>{
      const blob=[v.customer_name,v.customer_email,v.last_page,v.landing_page,v.device_type].join(' ').toLowerCase();
      return(!q||blob.includes(q))&&(f==='all'||(f==='online'&&v.online)||(f==='identified'&&v.customer_email)||(f==='anonymous'&&!v.customer_email));
    });
    const k='<div class="visitor-kpis"><div class="visitor-kpi"><span>Online agora</span><b>'+Number(stats.online_now||0)+'</b></div><div class="visitor-kpi"><span>Hoje</span><b>'+Number(stats.today||0)+'</b></div><div class="visitor-kpi"><span>Identificados (7d)</span><b>'+Number(stats.identified||0)+'</b></div><div class="visitor-kpi"><span>Anônimos (7d)</span><b>'+Number(stats.anonymous||0)+'</b></div></div>';
    const tools='<div class="visitor-tools"><input id="visitorSearch" placeholder="Buscar nome, e-mail ou página..." value="'+safe($('visitorSearch')?.value||'')+'" oninput="renderVisitors()"><select id="visitorFilter" onchange="renderVisitors()"><option value="all">Todos</option><option value="online" '+(f==='online'?'selected':'')+'>Online agora</option><option value="identified" '+(f==='identified'?'selected':'')+'>Identificados</option><option value="anonymous" '+(f==='anonymous'?'selected':'')+'>Anônimos</option></select></div>';
    const cards=list.map(v=>'<article class="visitor-card"><div class="visitor-head"><div><div class="small">'+(v.customer_email?'CLIENTE IDENTIFICADO':'VISITANTE')+'</div><h3>'+safe(v.customer_name||'Visitante anônimo')+'</h3><div class="visitor-meta">'+safe(v.customer_email||'Sem conta identificada')+' · '+safe(v.device_type||'Dispositivo não identificado')+'<br>Entrou '+ago(v.started_at)+' · visto '+ago(v.last_seen_at)+' · sessão '+duration(v.started_at,v.last_seen_at)+' · '+Number(v.page_count||0)+' página(s)<br>Origem: '+safe(host(v.referrer))+' · entrada: '+safe(v.landing_page||'/')+' · última página: '+safe(v.last_page||'/')+'</div></div><span class="visitor-badge '+(v.online?'online':'')+'">'+(v.online?'● Online':'Offline')+'</span></div><div class="visitor-pages">'+((v.pages||[]).slice(0,8).map(p=>'<div class="visitor-page"><b>'+safe(p.title||p.path)+'</b><span>'+ago(p.viewed_at)+'</span></div>').join('')||'<div class="visitor-meta">Sem páginas registradas.</div>')+'</div></article>').join('');
    root.innerHTML=k+tools+(cards||'<div class="empty">Nenhum visitante encontrado.</div>');
  }
  let lastStats={};
  window.renderVisitors=()=>render(lastStats);
  window.loadVisitors=async()=>{
    if(!ensure())return;
    const root=$('visitorsAdminList');root.innerHTML='<div class="empty">Carregando visitantes…</div>';
    const {data,error}=await supabaseClient.rpc('get_admin_visitors',{p_days:7});
    if(error){root.innerHTML='<div class="empty">Erro: '+safe(error.message)+'</div>';return}
    lastStats=data||{};cache=Array.isArray(data?.sessions)?data.sessions:[];render(lastStats);
  };
  let n=0,t=setInterval(()=>{n++;if(ensure()||n>60)clearInterval(t)},100);
})();