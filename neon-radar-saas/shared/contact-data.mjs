// Explicit correction supplied by the user and checked against the exact Maps listing.
// A correction is scoped to an exact Google ID or a matching name and branch location.
const ATACADAO={googleId:'ChIJTzDB6zafGZURwi4RQNYMepo',name:'Atacadão',lat:-30.0926294,lng:-51.0776617,address:'Av. Sen. Salgado Filho, 4742 - São Lucas, Viamão - RS, 94470-000',phone:'+55 51 3492-0524',website:'https://www.atacadao.com.br/',checkedAt:'2026-10-28'};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function applyVerifiedContacts(place){
 const name=fold(place.name),address=fold(place.address);
 const byId=place.id==='gmap_'+ATACADAO.googleId||place.googlePlaceId===ATACADAO.googleId;
 const byAddress=name.startsWith('atacadao')&&address.includes('4742')&&address.includes('viamao')&&address.includes('salgadofilho');
 const byLocation=name.startsWith('atacadao')&&typeof place.lat==='number'&&typeof place.lng==='number'&&Math.hypot((place.lat-ATACADAO.lat)*111320,(place.lng-ATACADAO.lng)*96200)<250;
 if(!byId&&!byAddress&&!byLocation)return place;
 const googleMapsUri='https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:ATACADAO.address,query_place_id:ATACADAO.googleId});
 return {...place,name:ATACADAO.name,category:'Atacadista',address:place.address||ATACADAO.address,lat:ATACADAO.lat,lng:ATACADAO.lng,phone:place.phone||ATACADAO.phone,website:place.website||ATACADAO.website,googlePlaceId:ATACADAO.googleId,googleMapsUri,contactsStatus:'verified',contactSource:'Google Maps · contato conferido',contactCheckedAt:ATACADAO.checkedAt};
}
export function mergeContactDetails(original,extra){
 return applyVerifiedContacts({...original,name:extra.name||original.name,address:extra.address||original.address,phone:extra.phone||original.phone,website:extra.website||original.website,hours:extra.hours||original.hours,photos:extra.photos?.length?extra.photos:original.photos,googlePlaceId:extra.id?.startsWith('gmap_')?extra.id.slice(5):original.googlePlaceId,googleMapsUri:extra.googleMapsUri||extra.mapsUri||original.googleMapsUri,contactsStatus:'checked',contactSource:'Google Places'});
}
