import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVerifiedContacts,mergeContactDetails} from '../shared/contact-data.mjs';
const base={id:'osm_node_42',name:'Atacadão',address:null,lat:-30.09263,lng:-51.07766,phone:null,website:null};
test('exact Atacadão Maps ID resolves the user-verified phone and website',()=>{
 const p=applyVerifiedContacts({...base,id:'gmap_ChIJTzDB6zafGZURwi4RQNYMepo',name:'Estabelecimento no Google Maps',lat:null,lng:null});
 assert.equal(p.phone,'+55 51 3492-0524');assert.equal(p.website,'https://www.atacadao.com.br/');assert.equal(p.name,'Atacadão');assert.ok(p.address.includes('4742'));assert.equal(p.contactsStatus,'verified');assert.equal(p.contactCheckedAt,'2026-10-28');
});
test('OSM listing for the same branch receives the correction',()=>{
 assert.equal(applyVerifiedContacts(base).phone,'+55 51 3492-0524');
 assert.equal(applyVerifiedContacts({...base,lat:null,lng:null,address:'Av. Sen. Salgado Filho, 4742 - Viamão RS'}).website,'https://www.atacadao.com.br/');
});
test('correction never leaks to another branch or a nearby different business',()=>{
 const other={...base,lat:-29.99,lng:-51.2};assert.equal(applyVerifiedContacts(other).phone,null);
 assert.equal(applyVerifiedContacts({...base,name:'Outra empresa'}).phone,null);
 assert.equal(applyVerifiedContacts({...base,id:'gmap_another_id',name:'Estabelecimento no Google Maps',lat:null,lng:null}).website,null);
});
test('successful Google lookup updates stale contacts and preserves the source record ID',()=>{
 const old={...base,id:'osm_node_99',name:'Empresa de teste',phone:'old',website:'https://old.example'};
 const p=mergeContactDetails(old,{id:'gmap_real_place_id',name:'Empresa de teste',phone:'+55 51 1234-5678',website:'https://new.example',mapsUri:'https://maps.google.com/test'});
 assert.equal(p.id,'osm_node_99');assert.equal(p.phone,'+55 51 1234-5678');assert.equal(p.website,'https://new.example');assert.equal(p.googlePlaceId,'real_place_id');assert.equal(p.contactsStatus,'checked');
});
test('partial Google responses never erase an existing phone or website',()=>{
 const p=mergeContactDetails({...base,name:'Teste',phone:'1234',website:'https://example.org'},{name:'Teste',phone:null,website:null});
 assert.equal(p.phone,'1234');assert.equal(p.website,'https://example.org');
});
