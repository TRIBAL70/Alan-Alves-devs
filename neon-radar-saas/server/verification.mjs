// Only a successful fresh provider response can be marked as checked now.
export function verificationFor(result,checkedAt=new Date().toISOString()){
 if(result.previewSource==='google'&&!result.previewNote)return {status:'confirmed',checkedAt,source:'Google Places'};
 if(result.previewNote){
  if(result.place?.contactsStatus==='verified')return {status:'saved',checkedAt:result.place.contactCheckedAt,source:result.place.contactSource};
  return {status:'unavailable',source:result.source};
 }
 if(result.place?.contactsStatus==='verified')return {status:'saved',checkedAt:result.place.contactCheckedAt,source:result.place.contactSource};
 return {status:'partial',checkedAt,source:result.source||'openstreetmap'};
}
