import {useEffect,useRef,useState} from 'react';
import {Building2,Camera,ExternalLink,Globe2,Mail,MessageCircle,Navigation,Phone,Instagram,LoaderCircle,ShieldCheck,LockKeyhole,RefreshCw,AlertCircle} from 'lucide-react';
import type {Place} from './main';
const safe=(value:string|null|undefined)=>{try{const u=new URL(value||'');return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
export type Verification={status:'idle'|'checking'|'confirmed'|'partial'|'saved'|'login_required'|'unavailable';checkedAt?:string;source?:string};
export function PlacePreview({place,loading,note,onLogin,verification,onRetry}:{place:Place;loading:boolean;note:string;onLogin?:()=>void;verification:Verification;onRetry:()=>void}){
 const [photoIndex,setPhotoIndex]=useState(0);
 const retriedPhoto=useRef(false);
 useEffect(()=>{retriedPhoto.current=false;},[place.id]);
 const photoKey=JSON.stringify((place.photos||[]).map(p=>p.url));
 useEffect(()=>setPhotoIndex(0),[place.id,photoKey,loading]);
 const photos=(place.photos||[]).filter(p=>safe(p.url));
 const photo=photos[photoIndex],image=safe(photo?.url),site=safe(place.website),instagram=safe(place.instagram);
 const photoError=photoIndex>=photos.length&&photos.length>0;
 // Expired media links trigger one fresh lookup, never an endless billing loop.
 useEffect(()=>{if(photoError&&!loading&&!onLogin&&!retriedPhoto.current){retriedPhoto.current=true;onRetry();}},[photoError,loading,onLogin,onRetry]);
 const photoMessage=photoError?'A imagem não abriu. Atualize a prévia para buscar uma foto novamente.':place.photoNote||note||'Este estabelecimento não retornou fotos nesta consulta.';
 const missing=loading?'Consultando...':onLogin?'Entre para consultar':note||place.contactsStatus==='unavailable'?'Não foi possível confirmar agora':'Não localizado na fonte consultada';
 const phone=place.phone?.replace(/[^\d+]/g,'');
 const rawWhats=place.whatsapp?.replace(/\D/g,'')||'';
 const whatsapp=/^(?:55)?\d{10,11}$/.test(rawWhats)?(rawWhats.startsWith('55')&&rawWhats.length>11?rawWhats:'55'+rawWhats):/^\d{12,15}$/.test(rawWhats)?rawWhats:null;
 const email=place.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(place.email)?place.email:null;
 const street=place.lat!=null&&place.lng!=null?'https://www.google.com/maps/@?'+new URLSearchParams({api:'1',map_action:'pano',viewpoint:`${place.lat},${place.lng}`}):null;
 const verificationLabel=({idle:'Consulta pronta',checking:'Verificando dados automaticamente',confirmed:'Consulta concluída no Google',partial:'Consulta concluída · dados parciais',saved:'Contatos anteriores preservados',login_required:'Entre para concluir a verificação',unavailable:'Não foi possível concluir a verificação'} as const)[verification.status];
 return <section className="place-preview" aria-label="Fotos e contatos do estabelecimento">
  <div className={'place-verification verification-'+verification.status} role="status" aria-live="polite" aria-atomic="true">
   {loading?<LoaderCircle size={20} className="verification-spinner"/>:verification.status==='confirmed'?<ShieldCheck size={20}/>:verification.status==='login_required'?<LockKeyhole size={20}/>:<AlertCircle size={20}/>}
   <span><strong>{verificationLabel}</strong><small>{loading?'Conferindo foto, telefone e site nesta tela.':verification.checkedAt?verification.status==='saved'?'Conferência anterior: '+verification.checkedAt.slice(0,10).split('-').reverse().join('/'):'Consultado em '+new Date(verification.checkedAt).toLocaleString('pt-BR'):'A consulta acontece aqui, sem precisar abrir o Maps.'}</small></span>
   {!loading&&!onLogin&&<button type="button" onClick={onRetry} aria-label="Verificar dados novamente" title="Verificar novamente"><RefreshCw size={17}/></button>}
  </div>
  <div className="place-photo">
   {image?<img key={image} src={image} alt={`Foto de ${place.name}`} onError={()=>setPhotoIndex(index=>index+1)}/>:<div className="place-photo-empty"><Camera size={36}/><strong>{loading?'Buscando foto do estabelecimento...':onLogin?'Entre para consultar a foto':photoError?'Não foi possível abrir a foto':place.photoNote||note?'Foto indisponível nesta consulta':'Nenhuma foto retornada'}</strong><span>{loading?'Aguarde enquanto consultamos a fonte.':photoMessage}</span></div>}
   {!loading&&!onLogin&&!image&&<button className="outline-btn" type="button" onClick={onRetry}><RefreshCw size={15}/> Atualizar foto</button>}
   <span className="place-photo-label"><Camera size={13}/> PRÉVIA DO LOCAL</span>
  </div>
  {image&&<div className="place-photo-credit">Foto: {photo?.source||'fonte do estabelecimento'}{photo?.authors?.map((a,i)=><span key={i}> · {safe(a.url)?<a href={safe(a.url)!} target="_blank" rel="noopener noreferrer">{a.name}</a>:a.name}</span>)}<small>A foto cadastrada pode mostrar a fachada ou outro ambiente do local.</small></div>}
  <details className="place-source-links"><summary>Fontes e opções adicionais</summary><div className="place-preview-actions">{street&&<a href={street} target="_blank" rel="noopener noreferrer"><Navigation size={16}/> Street View <ExternalLink size={12}/></a>}{safe(place.googleMapsUri||place.mapsUri)&&<a href={safe(place.googleMapsUri||place.mapsUri)!} target="_blank" rel="noopener noreferrer"><Building2 size={16}/> Abrir fonte original <ExternalLink size={12}/></a>}</div></details>
  <div className="place-contact-panel"><h3>Contatos do estabelecimento</h3><div className="place-contact-grid">
   {phone?<a href={'tel:'+phone}><Phone size={18}/><span><small>TELEFONE</small>{place.phone}</span></a>:<div><Phone size={18}/><span><small>TELEFONE</small>{missing}</span></div>}
   {site?<a href={site} target="_blank" rel="noopener noreferrer"><Globe2 size={18}/><span><small>WEBSITE</small>{new URL(site).hostname}</span><ExternalLink size={12}/></a>:<div><Globe2 size={18}/><span><small>WEBSITE</small>{missing}</span></div>}
   {whatsapp&&<a href={'https://wa.me/'+whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/><span><small>WHATSAPP CADASTRADO</small>Abrir conversa</span></a>}
   {email&&<a href={'mailto:'+email}><Mail size={18}/><span><small>E-MAIL</small>{email}</span></a>}
   {instagram&&<a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/><span><small>INSTAGRAM</small>Abrir perfil</span></a>}
  </div><p>{place.contactSource?`Fonte dos contatos: ${place.contactSource}${place.contactCheckedAt?' · conferido em '+place.contactCheckedAt.split('-').reverse().join('/'):''}`:'Dados não encontrados nesta consulta podem estar disponíveis no Google Maps.'}</p></div>
  {onLogin&&<button className="solid-btn full-btn" onClick={onLogin}>Entrar e continuar nesta prévia</button>}
  {loading&&<p className="place-preview-note" role="status">Consultando foto e contatos disponíveis...</p>}{note&&<p className="place-preview-note" role="status">{note}</p>}
 </section>;
}
