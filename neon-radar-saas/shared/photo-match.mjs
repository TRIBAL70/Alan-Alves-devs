const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function samePhotoPlace(input,candidate){
 const lat=candidate.location?.lat,lng=candidate.location?.lng;
 return !!fold(input.name)&&fold(input.name)===fold(candidate.displayName)&&
  Number.isFinite(input.lat)&&Number.isFinite(input.lng)&&Number.isFinite(lat)&&Number.isFinite(lng)&&
  Math.hypot((lat-input.lat)*111320,(lng-input.lng)*111320*Math.cos(input.lat*Math.PI/180))<=200;
}
