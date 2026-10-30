const API='https://places.googleapis.com/v1';
const safe=value=>{try{const u=new URL(value?.startsWith('//')?'https:'+value:value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
// Browser transport: public browser key, original website referrer, no persistent photo cache.
export async function fetchGooglePhotos(id,key,{signal,fetcher=fetch}={}){
 if(!/^[A-Za-z0-9_-]{8,200}$/.test(id))throw new Error('Invalid place identifier');
 async function request(url){
  const response=await fetcher(url,{headers:{'X-Goog-Api-Key':key},signal,cache:'no-store'});
  if(!response.ok)throw Object.assign(new Error('Google photo request failed'),{code:response.status===403?'PHOTO_PERMISSION_DENIED':'PHOTO_REQUEST_FAILED'});
  return response.json();
 }
 // Query field mask avoids relying on SDK photo deserialization or a custom mask header.
 const raw=await request(`${API}/places/${encodeURIComponent(id)}?fields=id,displayName,photos&languageCode=pt-BR`);
 const photos=[];
 for(const photo of (raw.photos||[]).slice(0,3)){
  if(typeof photo.name!=='string'||!photo.name.startsWith(`places/${id}/photos/`)||!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9._~=-]+$/.test(photo.name))continue;
  try{
   const media=await request(`${API}/${photo.name}/media?maxWidthPx=900&skipHttpRedirect=true`);
   const url=safe(media.photoUri);if(url)photos.push({url,source:'Google Maps',authors:(photo.authorAttributions||[]).map(a=>({name:String(a.displayName||'Autor da foto'),url:safe(a.uri)}))});
  }catch(error){if(signal?.aborted)throw error;}
 }
 return {photos,returnedPhotoCount:raw.photos?.length||0};
}
