import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';

async function randomPort(){
 const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}

test('NEON API: health, config, protective login and input errors', {timeout:15000},async()=>{
 const port=await randomPort();
 const processServer=spawn(process.execPath,['server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,OSM_WARM_QUERY:'',PORT:String(port),GOOGLE_MAPS_SERVER_KEY:'fake-test-key',OPENAI_API_KEY:'fake-test-key',REQUIRE_AUTH_FOR_PAID_APIS:'true'},
  stdio:'ignore'
 });
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   try{const result=await fetch(`http://127.0.0.1:${port}/api/health`);if(result.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,60));
  }
  assert.equal(ready,true,'server should start');
  const config=await (await fetch(`http://127.0.0.1:${port}/api/config`)).json();
  assert.equal(config.paidApiRequiresLogin,true);
  assert.equal(config.google,true);
  assert.ok(!JSON.stringify(config).includes("fake-test-key"));
  const blocked=await fetch(`http://127.0.0.1:${port}/api/places/search`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'barbearias Viamão'})});
  assert.equal(blocked.status,401);
  assert.equal((await blocked.json()).error,'AUTH');
  const blockedDetail=await fetch(`http://127.0.0.1:${port}/api/places/gmap_ChIJfixture01`);
  assert.equal(blockedDetail.status,401,'automatic preview must preserve authentication');
  const blockedAI=await fetch(`http://127.0.0.1:${port}/api/ai`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Quais negócios?'})});
  assert.equal(blockedAI.status,401);
  const blockedRoute=await fetch(`http://127.0.0.1:${port}/api/routes`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin:{lat:0,lng:0},destination:{lat:1,lng:1}})});
  assert.equal(blockedRoute.status,401);
  const missing=await fetch(`http://127.0.0.1:${port}/api/unknown`);
  assert.equal(missing.status,404);
 }finally{processServer.kill('SIGTERM');await once(processServer,'exit').catch(()=>{});}
});
test('browser photo fallback is authorized only after quota and stops at the daily limit',{timeout:15000},async()=>{
 const port=await randomPort();
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),OSM_WARM_QUERY:'',SUPABASE_URL:'',VITE_SUPABASE_URL:'',GOOGLE_MAPS_SERVER_KEY:'',GOOGLE_MAPS_BROWSER_KEY:'public-browser-test',REQUIRE_AUTH_FOR_PAID_APIS:'false'},stdio:'ignore'});
 try{
  for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${port}/api/health`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,60));}
  for(let i=0;i<3;i++){
   const response=await fetch(`http://127.0.0.1:${port}/api/places/gmap_ChIJfixture01`);
   assert.equal(response.status,200);
   const body=await response.json();assert.equal(body.browserPreviewAllowed,true);assert.deepEqual(body.place.photos,[]);
  }
  const denied=await fetch(`http://127.0.0.1:${port}/api/places/gmap_ChIJfixture01`);
  assert.equal(denied.status,429);assert.equal((await denied.json()).error,'QUOTA');
 }finally{child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}
});
