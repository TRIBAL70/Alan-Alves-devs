import {loadGoogle} from './GoogleMapPanel';
import type {Place} from './main';
// Only called after the authenticated detail endpoint has allowed the lookup.
export async function browserGooglePhotos(place:Place,key:string):Promise<Place>{
 const id=place.googlePlaceId||(place.id.startsWith('gmap_')?place.id.slice(5):'');
 if(!id||place.photos?.length)return place;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const photos=await Promise.race([
   (async()=>{
    await loadGoogle(key);
    const {Place:GooglePlace}=await (window as any).google.maps.importLibrary('places');
    const item=new GooglePlace({id});
    await item.fetchFields({fields:['photos']});
    return (item.photos||[]).slice(0,3).map((photo:any)=>({url:photo.getURI({maxWidth:900}),source:'Google Maps',authors:(photo.authorAttributions||[]).map((a:any)=>({name:a.displayName||'Autor da foto',url:a.uri||null}))}));
   })(),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),15000);})
  ]);
  return photos.length?{...place,photos,photoNote:undefined}:{...place,photoNote:'O Google não disponibilizou fotos desta ficha nas duas consultas. Abra a fonte original para conferir.'};
 }catch{return {...place,photoNote:'A busca alternativa de fotos do Google não ficou disponível. Confira se a Places API está autorizada para a chave do mapa.'};}
 finally{clearTimeout(timer);}
}
