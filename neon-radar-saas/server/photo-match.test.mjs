import test from 'node:test';
import assert from 'node:assert/strict';
import {samePhotoPlace} from '../shared/photo-match.mjs';
const input={name:'Farmácia São João',lat:-30.08,lng:-51.02};
test('photos match the same named branch and never a nearby competitor or distant branch',()=>{
 assert.equal(samePhotoPlace(input,{displayName:'Farmacia Sao Joao',location:{lat:-30.0801,lng:-51.0201}}),true);
 assert.equal(samePhotoPlace(input,{displayName:'Farmácia Popular',location:{lat:-30.08,lng:-51.02}}),false);
 assert.equal(samePhotoPlace(input,{displayName:input.name,location:{lat:-30.1,lng:-51.02}}),false);
 assert.equal(samePhotoPlace(input,{displayName:input.name}),false);
 assert.equal(samePhotoPlace({...input,lat:null},{displayName:input.name,location:{lat:-30.08,lng:-51.02}}),false);
});
