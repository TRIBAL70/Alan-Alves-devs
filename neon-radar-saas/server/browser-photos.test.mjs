import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/googlePhotos.ts',import.meta.url),'utf8');
let compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
compiled=compiled.replace(/import \{ loadGoogle \} from '.\/GoogleMapPanel';/, 'const loadGoogle=async()=>{};').replace("'../shared/photo-match.mjs'",JSON.stringify(new URL('../shared/photo-match.mjs',import.meta.url).href)).replace("'../shared/google-photo-rest.mjs'",JSON.stringify(new URL('../shared/google-photo-rest.mjs',import.meta.url).href));
const {browserGooglePhotos}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const base={id:'gmap_ChIJfixture01',name:'Loja',lat:-30,lng:-51,photos:[],phone:'123'};
const photo={getURI:()=> 'https://example.org/new-photo',authorAttributions:[{displayName:'Autora',uri:'https://example.org/author'}]};
function sdk(Place){global.fetch=async()=>({ok:true,json:async()=>({photos:[]})});global.window={google:{maps:{importLibrary:async()=>({Place})}}};}
test('uses the fresh Place returned by fetchFields and preserves credits and contacts',async()=>{
 sdk(class{constructor({id}){this.id=id;}async fetchFields(){return {place:{id:this.id,displayName:'Loja',photos:[photo]}};}});
 const result=await browserGooglePhotos(base,'test');assert.equal(result.photos[0].url,'https://example.org/new-photo');assert.equal(result.photos[0].authors[0].name,'Autora');assert.equal(result.phone,'123');
});
test('empty details retry a fresh search only for the exact named branch',async()=>{
 let searches=0;
 sdk(class{async fetchFields(){return {place:{id:'ChIJfixture01',photos:[]}};}static async searchByText(){searches++;return {places:[{id:'ChIJfresh123',displayName:'Loja',location:{lat:()=>-30,lng:()=>-51},photos:[photo]}]};}});
 const result=await browserGooglePhotos(base,'test');assert.equal(result.photos.length,1);assert.equal(result.googlePlaceId,'ChIJfresh123');assert.equal(searches,1);
});
test('a nearby competitor photo is never used and requests stay bounded',async()=>{
 let searches=0;
 sdk(class{async fetchFields(){return {place:{photos:[]}};}static async searchByText(){searches++;return {places:[{id:'other',displayName:'Other',location:{lat:()=>-30,lng:()=>-51},photos:[photo]}]};}});
 const result=await browserGooglePhotos(base,'test');assert.deepEqual(result.photos,[]);assert.equal(searches,1);
});
test('closing the preview cancels before any paid browser call starts',async()=>{
 let calls=0;sdk(class{async fetchFields(){calls++;}});
 const controller=new AbortController();controller.abort();await assert.rejects(browserGooglePhotos(base,'test',controller.signal),{name:'AbortError'});assert.equal(calls,0);
});
