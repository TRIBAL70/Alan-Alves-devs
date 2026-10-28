import {useEffect,useState} from 'react';
import {Building2,Camera,ExternalLink,Globe2,Mail,MessageCircle,Navigation,Phone,Instagram} from 'lucide-react';
import type {Place} from './main';
const safe=(value:string|null|undefined)=>{try{const u=new URL(value||'');return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
export function PlacePreview({place,loading,note,onLogin}:{place:Place;loading:boolean;note:string;onLogin?:()=>void}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[place.id,place.photos?.[0]?.url]);
 const photo=place.photos?.[0],image=safe(photo?.url),site=safe(place.website),instagram=safe(place.instagram);
 const missing=loading?'Consultando...':onLogin?'Entre para consultar':note||place.contactsStatus==='unavailable'?'Consulta indisponível · verificar no Maps':'Não localizado na fonte consultada';
 const phone=place.phone?.replace(/[^\d+]/g,'');
 const rawWhats=place.whatsapp?.replace(/\D/g,'')||'';
 const whatsapp=/^(?:55)?\d{10,11}$/.test(rawWhats)?(rawWhats.startsWith('55')&&rawWhats.length>11?rawWhats:'55'+rawWhats):/^\d{12,15}$/.test(rawWhats)?rawWhats:null;
 const email=place.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(place.email)?place.email:null;
 const street=place.lat!=null&&place.lng!=null?'https://www.google.com/maps/@?'+new URLSearchParams({api:'1',map_action:'pano',viewpoint:`${place.lat},${place.lng}`}):null;
 return <section className="place-preview" aria-label="Fotos e contatos do estabelecimento">
  <div className="place-photo">
   {image&&!failed?<img src={image} alt={`Foto de ${place.name}`} onError={()=>setFailed(true)}/>:<div className="place-photo-empty"><Camera size={36}/><strong>{loading?'Buscando foto do estabelecimento...':onLogin?'Entre para consultar a foto':note?'Não foi possível consultar a foto':'Foto não localizada na fonte'}</strong><span>A fachada pode ser consultada no Street View.</span></div>}
   <span className="place-photo-label"><Camera size={13}/> PRÉVIA DO LOCAL</span>
  </div>
  {image&&!failed&&<div className="place-photo-credit">Foto: {photo?.source||'fonte do estabelecimento'}{photo?.authors?.map((a,i)=><span key={i}> · {safe(a.url)?<a href={safe(a.url)!} target="_blank" rel="noopener noreferrer">{a.name}</a>:a.name}</span>)}<small>A foto cadastrada pode mostrar a fachada ou outro ambiente do local.</small></div>}
  <div className="place-preview-actions">{street&&<a href={street} target="_blank" rel="noopener noreferrer"><Navigation size={16}/> Ver fachada no Street View <ExternalLink size={12}/></a>}{safe(place.googleMapsUri||place.mapsUri)&&<a href={safe(place.googleMapsUri||place.mapsUri)!} target="_blank" rel="noopener noreferrer"><Building2 size={16}/> {place.source==='google'||place.googleMapsUri?'Fotos e contatos no Google Maps':'Ver na fonte'}</a>}</div>
  <div className="place-contact-panel"><h3>Contatos do estabelecimento</h3><div className="place-contact-grid">
   {phone?<a href={'tel:'+phone}><Phone size={18}/><span><small>TELEFONE</small>{place.phone}</span></a>:<div><Phone size={18}/><span><small>TELEFONE</small>{missing}</span></div>}
   {site?<a href={site} target="_blank" rel="noopener noreferrer"><Globe2 size={18}/><span><small>WEBSITE</small>{new URL(site).hostname}</span><ExternalLink size={12}/></a>:<div><Globe2 size={18}/><span><small>WEBSITE</small>{missing}</span></div>}
   {whatsapp&&<a href={'https://wa.me/'+whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/><span><small>WHATSAPP CADASTRADO</small>Abrir conversa</span></a>}
   {email&&<a href={'mailto:'+email}><Mail size={18}/><span><small>E-MAIL</small>{email}</span></a>}
   {instagram&&<a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/><span><small>INSTAGRAM</small>Abrir perfil</span></a>}
  </div><p>{place.contactSource?`Fonte dos contatos: ${place.contactSource}${place.contactCheckedAt?' · conferido em '+place.contactCheckedAt.split('-').reverse().join('/'):''}`:'Dados não encontrados nesta consulta podem estar disponíveis no Google Maps.'}</p></div>
  {onLogin&&<button className="solid-btn full-btn" onClick={onLogin}>Entrar para consultar foto e contatos</button>}
  {loading&&<p className="place-preview-note" role="status">Consultando foto e contatos disponíveis...</p>}{note&&<p className="place-preview-note" role="status">{note}</p>}
 </section>;
}
