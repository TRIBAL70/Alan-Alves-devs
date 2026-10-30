import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,websitePhotoCandidates,officialWebsitePhotos} from './website-photos.mjs';
const resolver=async()=>[{address:'93.184.216.34',family:4}];
test('website fallback prioritizes real hero photos and excludes logos and executable URLs',()=>{
 const result=websitePhotoCandidates(`<meta property="og:image" content="/hotel.jpg?x=1&amp;y=2"><img src="/logo.png" width="140"><img src="javascript:bad" width="900"><img src="/pool.jpg" alt="Piscina" width="980" height="435">`,'https://hotel.example/');
 assert.deepEqual(result.map(x=>x.url),['https://hotel.example/hotel.jpg?x=1&y=2','https://hotel.example/pool.jpg']);
});
test('Wix lazy placeholder resolves to the original photo and never its logo',()=>{
 const photos=websitePhotoCandidates(`<img src="https://static.wixstatic.com/media/photo.jpg/v1/fill/w_98,h_65,blur_2/photo.jpg" width="980" height="435"><img src="/image001.png" alt="Logo Vila Ventura">`,'https://hotel.example/');
 assert.equal(photos.length,1);assert.equal(photos[0].url,'https://static.wixstatic.com/media/photo.jpg');
});
test('public DNS is pinned for reading and official source is credited',async()=>{
 const photos=await officialWebsitePhotos('https://hotel.example/',{resolver,reader:async(url,ips)=>{assert.equal(ips[0].address,'93.184.216.34');return {html:'<meta property="og:image" content="/hotel.jpg">'};}});
 assert.equal(photos[0].source,'Site oficial');assert.equal(photos[0].authors[0].url,'https://hotel.example/');
});
test('private hosts, mixed DNS answers and redirect to another site are refused',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.2','169.254.169.254','172.16.1.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fd00::1'])assert.equal(publicAddress(ip),false,ip);
 let reads=0;
 const photos=await officialWebsitePhotos('https://hotel.example/',{resolver:async()=>[{address:'127.0.0.1',family:4}],reader:async()=>{reads++;}});
 assert.deepEqual(photos,[]);assert.equal(reads,0);
 assert.deepEqual(await officialWebsitePhotos('https://hotel.example/',{resolver,reader:async()=>({redirect:'https://other.example/'})}),[]);
});
test('a private image URL found in official HTML is not returned to the browser',async()=>{
 assert.deepEqual(await officialWebsitePhotos('https://hotel.example/',{resolver,reader:async()=>({html:'<meta property="og:image" content="https://127.0.0.1/photo.jpg">'})}),[]);
});
