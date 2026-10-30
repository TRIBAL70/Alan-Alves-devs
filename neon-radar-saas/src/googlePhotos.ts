import {loadGoogle} from './GoogleMapPanel';
import {samePhotoPlace} from '../shared/photo-match.mjs';
import type {Place} from './main';
// Only called after the detail endpoint has checked login and the lookup quota.
// Photo objects and media URIs are fetched afresh and never saved to storage.
export async function browserGooglePhotos(place:Place,key:string,signal?:AbortSignal):Promise<Place>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
 try{
  const result=await Promise.race([
   (async()=>{
    check();await loadGoogle(key);check();
    const {Place:GooglePlace}=await (window as any).google.maps.importLibrary('places');check();
    let id=place.googlePlaceId||(place.id.startsWith('gmap_')?place.id.slice(5):'');
    if(!id){
     if(place.lat==null||place.lng==null)return {...place,photos:[],photoNote:'Não foi possível identificar a ficha do Google para este local.'};
     const found=await GooglePlace.searchByText({textQuery:[place.name,place.address].filter(Boolean).join(' ').slice(0,400),fields:['id','displayName','location'],language:'pt-BR',maxResultCount:3,locationBias:{center:{lat:place.lat,lng:place.lng},radius:200}});check();
     const matches=(found.places||[]).filter((p:any)=>samePhotoPlace(place,{displayName:p.displayName,location:{lat:p.location?.lat(),lng:p.location?.lng()}}));
     if(matches.length!==1)return {...place,photos:[],photoNote:'Não foi possível confirmar a mesma unidade no Google. Nenhuma foto de outro local foi utilizada.'};
     id=matches[0].id;
    }
    const item=new GooglePlace({id});
    await item.fetchFields({fields:['displayName','formattedAddress','photos']});check();
    const photos=(item.photos||[]).slice(0,3).map((photo:any)=>({url:photo.getURI({maxWidth:900}),source:'Google Maps',authors:(photo.authorAttributions||[]).map((a:any)=>({name:a.displayName||'Autor da foto',url:a.uri||null}))}));
    return {...place,name:item.displayName||place.name,address:item.formattedAddress||place.address,googlePlaceId:id,photos,photoNote:photos.length?undefined:'O Google não disponibilizou fotos para este estabelecimento nesta consulta.'};
   })(),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);})
  ]);
  check();return result;
 }catch(e){
  check();
  const failure=e as Error&{code?:string};
  console.warn('[NEON PHOTO]',String(failure.name||'Error'),String(failure.code||''),String(failure.message||'').replace(/AIza[\w-]+/g,'[redacted]').replace(/https?:\/\/\S+/g,'[URL]'));
  return {...place,photos:[],photoNote:'Não foi possível atualizar a foto no Google agora. Confira a autorização da Places API para a chave do mapa.'};
 }finally{clearTimeout(timer);}
}
