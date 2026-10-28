import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {buildSearch,normalizeOSM} from './osm.mjs';

test('OSM query resolves a city in the text and escapes names',()=>{
 const query=buildSearch({query:'Lancheiras em Porto Alegre RS',center:{lat:0,lng:0},radiusKm:5});
 assert.deepEqual(query.center,{lat:-30.0346,lng:-51.2177});
 assert.ok(query.query.includes('["amenity"="fast_food"]'));
 assert.match(query.query,/around:5000,-30.0346,-51.2177/);
 assert.match(query.query,/out body center 60/);
 const named=buildSearch({query:'Loja "teste";out body;',center:{lat:1,lng:2}});
 assert.ok(named.query.includes('\\"teste\\"'));
 assert.throws(()=>buildSearch({query:'restaurantes'}),/região/);
});

test('OSM normalization preserves missing fields and rejects executable website URLs',()=>{
 const p=normalizeOSM({type:'way',id:123,center:{lat:-30,lon:-51},tags:{name:'Empresa de teste',amenity:'fast_food',website:'javascript:alert(1)',opening_hours:'Mo-Fr 09:00-18:00'}});
 assert.equal(p.id,'osm_way_123');assert.equal(p.source,'openstreetmap');
 assert.equal(p.rating,null);assert.equal(p.reviews,null);assert.equal(p.open,null);
 assert.equal(p.phone,null);assert.equal(p.address,null);assert.equal(p.website,null);
 assert.equal(p.mapsUri,'https://www.openstreetmap.org/way/123');
 assert.equal(p.category,'Lanchonete');
});

test('API searches OSM without Google credentials, caches upstream results and keeps AI protected',{timeout:20000},async()=>{
 let upstreamCalls=0,received='';
 const upstream=http.createServer(async(req,res)=>{upstreamCalls++;let text='';for await(const chunk of req)text+=chunk;received=new URLSearchParams(text).get('data');res.setHeader('content-type','application/json');res.end(JSON.stringify({elements:[{type:'node',id:42,lat:-30.02,lon:-51.2,tags:{name:'Fixture somente para testes',amenity:'restaurant','contact:phone':'+555100000000'}}]}));});
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,OSM_WARM_QUERY:'',PORT:'0',SUPABASE_URL:'',VITE_SUPABASE_URL:'',SUPABASE_ANON_KEY:'',VITE_SUPABASE_ANON_KEY:'',GOOGLE_MAPS_SERVER_KEY:'',VITE_GOOGLE_MAPS_BROWSER_KEY:'',REQUIRE_AUTH_FOR_PAID_APIS:'false',OSM_OVERPASS_URL:`http://127.0.0.1:${upstream.address().port}`},stdio:['ignore','pipe','pipe']});
 // PORT=0 permits the OS to pick an unused port. Read the actual bound port.
 let output='';
 try{
  const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server did not start')),5000);child.stdout.on('data',b=>{output+=b.toString();const m=/listening on (\d+)/.exec(output);if(m){clearTimeout(timeout);resolve(Number(m[1]));}});});
  const base=`http://127.0.0.1:${port}`;
  const config=await(await fetch(base+'/api/config')).json();
  assert.equal(config.provider,'openstreetmap');assert.equal(config.places,true);assert.equal(config.maps,true);assert.equal(config.google,false);assert.equal(config.googleBrowserKey,null);
  const search=()=>fetch(base+'/api/places/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'restaurantes em Porto Alegre',radiusKm:5})});
  for(let i=0;i<2;i++){const r=await search();assert.equal(r.status,200);const data=await r.json();assert.equal(data.source,'openstreetmap');assert.equal(data.places[0].id,'osm_node_42');assert.equal(data.places[0].rating,null);}
  assert.equal(upstreamCalls,1);assert.match(received,/restaurant/);
  const ai=await fetch(base+'/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Analise'})});assert.equal(ai.status,401);
  const invalid=await fetch(base+'/api/places/google_old_id');assert.equal(invalid.status,400);
  const suggestions=await fetch(base+'/api/places/autocomplete',{method:'POST',headers:{'content-type':'application/json'},body:'{"query":"rest"}'});assert.deepEqual((await suggestions.json()).suggestions,[]);assert.equal(upstreamCalls,1);
 }finally{child.kill('SIGTERM');await once(child,'exit').catch(()=>{});await new Promise(r=>upstream.close(r));}
});
