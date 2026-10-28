const API='https://places.googleapis.com/v1';
export const safeWeb=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function normalizeGoogle(p){
 return {id:'gmap_'+p.id,name:p.displayName?.text||'Estabelecimento',category:p.primaryTypeDisplayName?.text||'Estabelecimento',address:p.formattedAddress||null,lat:p.location?.latitude??null,lng:p.location?.longitude??null,rating:p.rating??null,reviews:p.userRatingCount??null,website:safeWeb(p.websiteUri),phone:p.internationalPhoneNumber||p.nationalPhoneNumber||null,email:null,whatsapp:null,instagram:null,open:null,hours:p.regularOpeningHours?.weekdayDescriptions||null,status:p.businessStatus||null,mapsUri:safeWeb(p.googleMapsUri),photos:[],source:'google',contactsStatus:'checked',contactSource:'Google Places'};
}
async function request(url,key,fetcher,options={}){
 const r=await fetcher(url,{...options,headers:{...options.headers,'X-Goog-Api-Key':key},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Object.assign(new Error(r.status===403||r.status===400?'O Google não autorizou fotos e contatos. Verifique a chave do servidor e a Places API no Google Cloud.':'Fotos e contatos do Google estão temporariamente indisponíveis.'),{code:'GOOGLE_UNAVAILABLE'});
 return r.json();
}
export async function googlePreview(input,key,fetcher=fetch){
 if(!key)throw new Error('A integração de fotos e contatos do Google ainda não está configurada.');
 let id;
 if(input.id.startsWith('gmap_')||input.googlePlaceId){id=input.googlePlaceId||input.id.slice(5);if(!/^[A-Za-z0-9_-]{8,200}$/.test(id))throw new Error('Identificador Google inválido.');}
 else {
  if(!Number.isFinite(input.lat)||!Number.isFinite(input.lng))return null;
  const found=await request(API+'/places:searchText',key,fetcher,{method:'POST',headers:{'Content-Type':'application/json','X-Goog-FieldMask':'places.id,places.displayName,places.location'},body:JSON.stringify({textQuery:[input.name,input.address].filter(Boolean).join(' ').slice(0,400),languageCode:'pt-BR',maxResultCount:3,locationBias:{circle:{center:{latitude:input.lat,longitude:input.lng},radius:200}}})});
  const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  // Never attach a photo based on proximity alone: require the same name too.
  const match=found.places?.find(p=>fold(p.displayName?.text||'')===fold(input.name)&&Math.hypot((p.location?.latitude-input.lat)*111320,(p.location?.longitude-input.lng)*111320*Math.cos(input.lat*Math.PI/180))<=200);
  if(!match)return null;id=match.id;
 }
 const raw=await request(API+'/places/'+encodeURIComponent(id)+'?languageCode=pt-BR',key,fetcher,{headers:{'X-Goog-FieldMask':'id,displayName,formattedAddress,location,primaryTypeDisplayName,internationalPhoneNumber,nationalPhoneNumber,websiteUri,googleMapsUri,regularOpeningHours,businessStatus,photos'}});
 const place=normalizeGoogle(raw);
 // Resolve fresh media URLs; a broken first photo must not hide the other photos.
 const candidates=(raw.photos||[]).filter(photo=>typeof photo.name==='string'&&photo.name.startsWith(`places/${id}/photos/`)&&/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9._~=-]+$/.test(photo.name)).slice(0,3);
 for(const photo of candidates){
  try{
   const media=await request(API+'/'+photo.name+'/media?maxWidthPx=900&skipHttpRedirect=true',key,fetcher);
   // Google may return a scheme-relative photoUri. Use HTTPS in that case.
   const uri=safeWeb(typeof media.photoUri==='string'&&media.photoUri.startsWith('//')?'https:'+media.photoUri:media.photoUri);
   if(!uri)throw new Error('PHOTO_URL');
   place.photos.push({url:uri,source:'Google Maps',authors:(photo.authorAttributions||[]).map(a=>({name:String(a.displayName||'Autor da foto'),url:safeWeb(a.uri)}))});
  }catch{place.photoNote='Não foi possível carregar as fotos do Google. Tente atualizar a prévia. Se persistir, confira a autorização da Places API para fotos.';}
 }
 if(place.photos.length)delete place.photoNote;
 else if(!place.photoNote)place.photoNote=raw.photos?.length?'O Google não retornou um endereço de foto válido para este local.':'O Google não retornou fotos para este estabelecimento nesta consulta.';
 return place;
}
