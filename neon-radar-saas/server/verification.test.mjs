import test from 'node:test';
import assert from 'node:assert/strict';
import {verificationFor} from './verification.mjs';
const now='2026-10-28T12:00:00Z';
test('fresh successful Google lookup is confirmed with actual query time',()=>{
 assert.deepEqual(verificationFor({previewSource:'google',place:{contactsStatus:'verified'}},now),{status:'confirmed',checkedAt:now,source:'Google Places'});
});
test('Google error never upgrades an earlier correction to verified now',()=>{
 const result=verificationFor({previewNote:'Google refused',place:{contactsStatus:'verified',contactCheckedAt:'2026-10-28',contactSource:'Prior correction'}},now);
 assert.equal(result.status,'saved');assert.equal(result.checkedAt,'2026-10-28');assert.notEqual(result.checkedAt,now);
});
test('unavailable provider without known contacts does not claim successful verification',()=>{
 const result=verificationFor({previewNote:'unavailable',source:'google',place:{}},now);
 assert.equal(result.status,'unavailable');assert.equal(result.checkedAt,undefined);
});
test('OSM-only lookup is identified as partial rather than Google-confirmed',()=>{
 const result=verificationFor({source:'openstreetmap',place:{}},now);assert.equal(result.status,'partial');assert.equal(result.source,'openstreetmap');
});
