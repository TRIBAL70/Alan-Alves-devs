import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchGooglePhotos} from '../shared/google-photo-rest.mjs';
const response=value=>({ok:true,json:async()=>value});
test('REST photo lookup requests photos explicitly and resolves credited image with no key in URL',async()=>{
 const calls=[];
 const result=await fetchGooglePhotos('ChIJfixture01','secret',{fetcher:async(url,options)=>{
  calls.push({url,options});return response(url.includes('/media?')?{photoUri:'//lh3.googleusercontent.com/image'}:{photos:[{name:'places/ChIJfixture01/photos/fresh',authorAttributions:[{displayName:'Autora',uri:'https://maps.google.com/profile'}]}]});
 }});
 assert.equal(result.photos[0].url,'https://lh3.googleusercontent.com/image');assert.equal(result.photos[0].authors[0].name,'Autora');assert.match(calls[0].url,/fields=id,displayName,photos/);
 assert.ok(calls.every(c=>!c.url.includes('secret')&&c.options.headers['X-Goog-Api-Key']==='secret'&&c.options.cache==='no-store'));
});
test('REST lookup refuses another business photo and unsafe media URLs',async()=>{
 let calls=0;const result=await fetchGooglePhotos('ChIJfixture01','key',{fetcher:async()=>{calls++;return response({photos:[{name:'places/another/photos/no'}]});}});
 assert.equal(calls,1);assert.deepEqual(result.photos,[]);
});
