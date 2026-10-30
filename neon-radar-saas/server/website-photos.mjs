import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function publicAddress(address){
 if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===198&&(b===18||b===19)));}
 return isIP(address)===6&&/^[23][\da-f]{3}:/i.test(address)&&!/^2001:db8:/i.test(address);
}
function validUrl(value,base){const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hostname==='localhost'||u.hostname.endsWith('.localhost')||u.hostname.endsWith('.local'))throw new Error('Unsafe website');return u;}
async function resolvePublic(url,resolver){const host=url.hostname.replace(/^\[|\]$/g,'');const ips=isIP(host)?[{address:host,family:isIP(host)}]:await resolver(host,{all:true});if(!ips.length||ips.some(ip=>!publicAddress(ip.address)))throw new Error('Private website');return ips;}
function getHtml(url,ips,signal){return new Promise((resolve,reject)=>{
 const req=https.get(url,{signal,headers:{Accept:'text/html','User-Agent':'NeonRadar/1.0 (official website photo preview)','Accept-Encoding':'identity'},lookup:(_host,options,callback)=>options.all?callback(null,ips):callback(null,ips[0].address,ips[0].family)},response=>{
  if(response.statusCode>=300&&response.statusCode<400){response.resume();return resolve({redirect:response.headers.location});}
  if(response.statusCode!==200||!String(response.headers['content-type']||'').includes('text/html')){response.resume();return reject(new Error('Website unavailable'));}
  let size=0;const chunks=[];
  response.on('data',chunk=>{size+=chunk.length;if(size>600000){chunks.push(chunk.subarray(0,Math.max(0,600000-(size-chunk.length))));resolve({html:Buffer.concat(chunks).toString('utf8')});response.destroy();return;}chunks.push(chunk);});
  response.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8')}));response.on('error',reject);
 });req.on('error',reject);
});}
const decode=value=>String(value||'').replace(/&(?:amp|quot|apos|lt|gt|#39|#(\d+)|#x([\da-f]+));/gi,(s,n,h)=>n||h?String.fromCodePoint(Math.min(0x10ffff,parseInt(n||h,n?10:16))):({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"}[s.toLowerCase()]||s));
function attrs(tag){const result={};for(const m of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g))result[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);return result;}
export function websitePhotoCandidates(html,website){
 const candidates=[];
 for(const tag of html.match(/<meta\b[^>]{0,4096}>/gi)||[]){const a=attrs(tag);if(['og:image','og:image:url','og:image:secure_url','twitter:image','twitter:image:src'].includes((a.property||a.name||'').toLowerCase()))candidates.push({url:a.content,label:'Foto publicada no site oficial'});}
 for(const tag of html.match(/<img\b[^>]{0,8192}>/gi)||[]){const a=attrs(tag);if((a.width&&Number(a.width)<200)||(a.height&&Number(a.height)<120)||/logo|icon|instagram|facebook|whatsapp|avatar|pixel|placeholder/i.test(a.alt||''))continue;const src=a['data-src']||a['data-lazy-src']||a.src;if(src){const thumbnail=/[\/_]w_(\d+),h_(\d+)/.exec(src);if(!a.width&&!a.alt&&thumbnail&&Number(thumbnail[1])<200&&Number(thumbnail[2])<120)continue;candidates.push({url:src,label:a.alt||'Foto publicada no site oficial'});}}
 const unique=new Set();return candidates.flatMap(item=>{try{
  const u=validUrl(item.url,website);if(/(?:logo|favicon|placeholder|spacer|pixel)|\.svg(?:$|\?)/i.test(u.pathname))return [];
  // Wix serves blurred tiny placeholders in server HTML; the same media asset has an original URL.
  if(u.hostname==='static.wixstatic.com'&&/^\/media\/[^/]+\.(?:jpe?g|png|webp)\/v1\//i.test(u.pathname))u.pathname=u.pathname.split('/v1/')[0];
  u.hash='';if(unique.has(u.href))return [];unique.add(u.href);return [{url:u.href,label:item.label}];
 }catch{return [];}}).slice(0,8);
}
export async function officialWebsitePhotos(website,{resolver=lookup,reader=getHtml,signal=AbortSignal.timeout(6500)}={}){
 try{
  const first=validUrl(website);let current=first,html;
  for(let i=0;i<3;i++){
   signal.throwIfAborted();const ips=await resolvePublic(current,resolver);signal.throwIfAborted();
   const result=await reader(current,ips,signal);
   if(result.redirect){const next=validUrl(result.redirect,current);if(next.hostname.replace(/^www\./,'')!==first.hostname.replace(/^www\./,''))return [];current=next;continue;}
   html=result.html;break;
  }
  if(!html)return [];
  const photos=[];
  for(const candidate of websitePhotoCandidates(html,current)){
   signal.throwIfAborted();const image=validUrl(candidate.url);await resolvePublic(image,resolver);
   photos.push({url:image.href,source:'Site oficial',authors:[{name:current.hostname,url:current.href}]});if(photos.length===3)break;
  }
  return photos;
 }catch{return [];}
}
