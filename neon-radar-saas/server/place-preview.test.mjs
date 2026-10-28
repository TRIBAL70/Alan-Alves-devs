import test from 'node:test';
import assert from 'node:assert/strict';
import {googlePreview,normalizeGoogle,safeWeb} from './place-preview.mjs';
import {normalizeOSM} from './osm.mjs';
const response=value=>({ok:true,json:async()=>value});

test('OSM preview preserves real contact and photo tags and rejects executable URLs',()=>{
 const p=normalizeOSM({type:'node',id:1,lat:-30,lon:-51,tags:{name:'Loja',image:'https://example.org/facade.jpg','contact:email':'loja@example.org','contact:phone':'+55 51 99999-0000','contact:whatsapp':'+55 51 99999-0000','contact:instagram':'@loja'}});
 assert.equal(p.photos[0].url,'https://example.org/facade.jpg');assert.equal(p.email,'loja@example.org');assert.equal(p.phone,'+55 51 99999-0000');assert.equal(p.instagram,'https://www.instagram.com/@loja'.replace('@',''));
 const unsafe=normalizeOSM({type:'node',id:2,tags:{image:'javascript:alert(1)','contact:email':'bad\r\n@example.org'}});
 assert.deepEqual(unsafe.photos,[]);assert.equal(unsafe.email,null);assert.equal(safeWeb('javascript:alert(1)'),null);assert.equal(safeWeb('https://user:pass@example.org'),null);
});
test('Google preview fetches place photo with credits, keeps credentials only in request headers',async()=>{
 const calls=[];
 const result=await googlePreview({id:'gmap_ChIJfixture01'},'test-secret',async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/media?'))return response({photoUri:'https://lh3.googleusercontent.com/photo'});
  return response({id:'ChIJfixture01',displayName:{text:'Loja'},location:{latitude:-30,longitude:-51},internationalPhoneNumber:'+55 51 3333-0000',photos:[{name:'places/ChIJfixture01/photos/fixturePhoto',authorAttributions:[{displayName:'Fotógrafo',uri:'https://maps.google.com/profile'}]}]});
 });
 assert.equal(result.name,'Loja');assert.equal(result.photos[0].authors[0].name,'Fotógrafo');assert.equal(result.photos[0].url,'https://lh3.googleusercontent.com/photo');assert.equal(calls.length,2);
 for(const c of calls){assert.ok(!c.url.includes('test-secret'));assert.equal(c.options.headers['X-Goog-Api-Key'],'test-secret');}
 assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('Google enrichment never attaches photos to a different nearby business',async()=>{
 let calls=0;
 const result=await googlePreview({id:'osm_node_1',name:'Loja A',lat:-30,lng:-51},'key',async()=>{calls++;return response({places:[{id:'different',displayName:{text:'Loja B'},location:{latitude:-30,longitude:-51}}]});});
 assert.equal(result,null);assert.equal(calls,1);
});
test('Google enrichment rejects same name outside the exact location',async()=>{
 const result=await googlePreview({id:'osm_node_1',name:'Loja A',lat:-30,lng:-51},'key',async()=>response({places:[{id:'far',displayName:{text:'Loja A'},location:{latitude:-29,longitude:-51}}]}));
 assert.equal(result,null);
});
test('Google photo failure preserves the business contacts and does not invent an image',async()=>{
 const p=await googlePreview({id:'gmap_ChIJfixture01'},'key',async(url)=>url.includes('/media?')?{ok:false,status:403}:response({id:'ChIJfixture01',displayName:{text:'Loja'},nationalPhoneNumber:'3333-0000',photos:[{name:'places/ChIJfixture01/photos/photo'}]}));
 assert.deepEqual(p.photos,[]);assert.equal(p.phone,'3333-0000');assert.ok(p.photoNote);
 assert.equal(normalizeGoogle({id:'id',websiteUri:'javascript:alert(1)'}).website,null);
});
