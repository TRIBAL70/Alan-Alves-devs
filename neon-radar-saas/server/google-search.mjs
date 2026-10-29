import {normalizeGoogle} from './place-preview.mjs';

const API='https://places.googleapis.com/v1/places:searchText';
const MAX_RESULTS=20;
const city=/\b(?:em|no|na)\s+(.+)$/i;

export async function searchGoogle(data,key,fetcher=fetch){
 if(!key)throw Object.assign(new Error('Chave Google Places não configurada no servidor.'),{status:503,code:'GOOGLE_NOT_CONFIGURED'});
 const query=String(data?.query||'').trim().slice(0,160);
 if(query.length<2)throw Object.assign(new Error('Digite o nome ou a categoria do estabelecimento.'),{status:400,code:'QUERY'});
 const radius=Math.min(20000,Math.max(1000,Number(data.radiusKm||10)*1000));
 const lat=Number(data.center?.lat),lng=Number(data.center?.lng);
 const hasCenter=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
 const isCityQuery=city.test(query);
 const payload={textQuery:query,languageCode:'pt-BR',regionCode:'BR',maxResultCount:MAX_RESULTS,...(!isCityQuery&&hasCenter?{locationBias:{circle:{center:{latitude:lat,longitude:lng},radius}}}:{})};
 let response;
 try{
  response=await fetcher(API,{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.businessStatus,places.regularOpeningHours'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 }catch(e){throw Object.assign(new Error('A pesquisa do Google está indisponível. Verifique a conexão de saída da hospedagem.'),{status:503,code:'GOOGLE_NETWORK',cause:e});}
 if(!response.ok){
  const detail=await response.json().catch(()=>({}));
  console.warn('[NEON GOOGLE] Places search status:',response.status,detail.error?.status||'');
  throw Object.assign(new Error(response.status===403?'Google Places recusou a chave. Confira faturamento, Places API (New) e restrições do servidor.':'A pesquisa no Google Places não pôde ser concluída.'),{status:response.status===429?429:503,code:'GOOGLE_PLACES_ERROR'});
 }
 const body=await response.json();
 const places=(body.places||[]).filter(p=>p.id&&p.location).map(normalizeGoogle);
 return {places,nextPageToken:null,source:'google',center:hasCenter?{lat,lng}:null,region:city.exec(query)?.[1]||null,disclaimer:'Dados © Google. Disponibilidade e atributos dependem da ficha de cada estabelecimento.'};
}
