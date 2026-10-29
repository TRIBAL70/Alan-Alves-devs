(() => {
  const message='Integração ainda não configurada nesta cópia. Conecte um banco de dados próprio para ativar o atendimento.';
  const dataset=fetch('/data.json').then(r=>r.json());
  function from(table){
    let filters=[],single=false;
    const q=new Proxy({}, {get(_,key){
      if(key==='then') return (resolve,reject)=>dataset.then(all=>{let rows=all[table]||[]; for(const [field,value] of filters)rows=rows.filter(r=>r[field]===value);return {data:single?(rows[0]||null):rows,error:null}}).then(resolve,reject);
      if(['insert','update','delete','upsert'].includes(key))return ()=>Promise.resolve({data:null,error:{message}});
      return (...args)=>{if(key==='eq')filters.push(args);if(key==='single'||key==='maybeSingle')single=true;return q;};
    }});return q;
  }
  window.__ALAN_COPY_CLIENT__={from,rpc:async()=>({data:null,error:{message}}),auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({data:null,error:{message}}),signUp:async()=>({data:null,error:{message}}),signOut:async()=>({error:null})}};
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const url=String(typeof input==='string'?input:input.url||input);
    if(url.includes('/_serverFn/'))return Promise.reject(new Error('O consultor de IA precisa ser conectado nesta cópia.'));
    if(url.includes('supabase.co')||url.includes('lovable.dev'))return Promise.reject(new Error(message));
    return originalFetch(input,init);
  };
  function notes(){
    const main=document.querySelector('main')||document.querySelector('form');
    if(!main||document.getElementById('copy-integration-note'))return;
    if(!/^\/(agendar|consultor|auth|admin)/.test(location.pathname))return;
    const p=document.createElement('p');p.id='copy-integration-note';p.setAttribute('role','note');p.textContent='Cópia independente: agendamentos, login e IA aguardam conexão com os serviços próprios.';p.style.cssText='font:12px/1.6 Inter,sans-serif;color:#a7abb4;padding:12px 16px;max-width:896px;margin:0 auto;text-align:center';main.append(p);
  }
  new MutationObserver(notes).observe(document.documentElement,{childList:true,subtree:true});
})();
