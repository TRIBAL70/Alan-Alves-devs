import {useEffect,useRef,useState} from 'react';
import {Radar,Crosshair,Layers3,MapPin,Orbit,Sun,Moon} from 'lucide-react';
import type {Config,Place} from './main';

// Native map styling keeps Google's labels and attribution crisp.
const NEON_STYLE=[
 {elementType:'geometry',stylers:[{color:'#081b30'}]},
 {elementType:'labels.text.fill',stylers:[{color:'#a3d7e9'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#061221'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#29617e'}]},
 {featureType:'landscape',elementType:'geometry',stylers:[{color:'#0c2239'}]},
 {featureType:'poi',elementType:'geometry',stylers:[{color:'#102e43'}]},
 {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#79c8dd'}]},
 {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#0c343e'}]},
 {featureType:'road',elementType:'geometry',stylers:[{color:'#174765'}]},
 {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#0d2d47'}]},
 {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#c7e9f5'}]},
 {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#168db2'}]},
 {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#21c4ef'}]},
 {featureType:'transit',elementType:'geometry',stylers:[{color:'#16425c'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#041020'}]},
 {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#4fa7c8'}]}
];
const PIN_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52"><path d="M22 49 7 30A20 20 0 1 1 37 30Z" fill="#061a30" stroke="#26dfff" stroke-width="2"/><circle cx="22" cy="21" r="12" fill="#0b3d59" stroke="#1694bd"/><path d="M22 12v18M13 21h18" stroke="#76efff" stroke-width="1.5"/><circle cx="22" cy="21" r="5" fill="#2ae6ff" stroke="#d3fdff" stroke-width="1.5"/></svg>';

// Share one script across dashboard, map view and place dialogs.
let loading:Promise<void>|undefined;
const authListeners=new Set<()=>void>();
function loadGoogle(key:string){
 const w=window as any;
 if(w.google?.maps?.Map)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=window.setTimeout(()=>fail(),20000);
  function fail(){window.clearTimeout(timer);script.remove();loading=undefined;reject(new Error('Google Maps não carregou. Verifique sua conexão e a chave de navegador.'));}
  w.neonGoogleReady=()=>{window.clearTimeout(timer);delete w.neonGoogleReady;resolve();};
  const previous=w.gm_authFailure;
  w.gm_authFailure=()=>{previous?.();authListeners.forEach(fn=>fn());};
  script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,v:'quarterly',loading:'async',callback:'neonGoogleReady',language:'pt-BR',region:'BR'});
  script.async=true;script.onerror=fail;document.head.appendChild(script);
 });
 return loading;
}
export function GoogleMapPanel({places,config,origin,onSelect,onAlternative}:{places:Place[];config:Config;origin:{lat:number;lng:number};onSelect:(p:Place)=>void;onAlternative:()=>void}){
 const div=useRef<HTMLDivElement>(null),map=useRef<any>(null),markers=useRef<any[]>([]);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[neon,setNeon]=useState(true);
 const neonRef=useRef(neon);neonRef.current=neon;
 useEffect(()=>{
  let active=true;
  const denied=()=>{if(active){setReady(false);setError('O Google recusou a chave do mapa. Verifique a Maps JavaScript API, o faturamento e a autorização deste domínio no Google Cloud.');}};
  authListeners.add(denied);
  if(!config.googleBrowserKey){setError('A chave de navegador do Google Maps não está configurada.');return()=>{authListeners.delete(denied);};}
  setError('');
  loadGoogle(config.googleBrowserKey).then(()=>{
   if(!active||!div.current)return;
   const gm=(window as any).google.maps;
   // Style only the basemap; leave native controls and attribution visible.
   map.current=new gm.Map(div.current,{center:origin,zoom:12,mapTypeId:'roadmap',styles:neonRef.current?NEON_STYLE:[],mapTypeControl:true,fullscreenControl:true,streetViewControl:true,zoomControl:true,gestureHandling:'cooperative'});
   setReady(true);
  }).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;authListeners.delete(denied);markers.current.forEach(m=>m.setMap(null));markers.current=[];map.current=null;};
 },[config.googleBrowserKey]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  const gm=(window as any).google.maps,m=map.current;
  markers.current.forEach(marker=>marker.setMap(null));markers.current=[];
  const bounds=new gm.LatLngBounds();
  places.forEach(p=>{
   if(p.lat==null||p.lng==null||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;
   const position={lat:p.lat,lng:p.lng};
   const marker=new gm.Marker({map:m,position,title:p.name,icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(PIN_SVG),scaledSize:new gm.Size(38,45),anchor:new gm.Point(19,44)}});
   marker.addListener('click',()=>onSelect(p));markers.current.push(marker);bounds.extend(position);
  });
  if(markers.current.length===1){m.setCenter(bounds.getCenter());m.setZoom(15);}
  else if(markers.current.length)m.fitBounds(bounds,35);
  else {m.setCenter(origin);m.setZoom(12);}
 },[places,origin,onSelect,ready]);
 useEffect(()=>{if(ready&&map.current)map.current.setOptions({styles:neon?NEON_STYLE:[]});},[neon,ready]);
 const center=()=>{if(!map.current)return;map.current.panTo(origin);map.current.setZoom(12);};
 return <div className={'map-stage google-map neon-map-shell '+(neon?'is-neon':'is-standard')}>
  <div className="neon-map-toolbar">
   <div className="neon-map-brand"><span className="neon-map-emblem"><Radar size={23}/></span><span><small>NEON RADAR</small><strong>Visão geográfica</strong></span></div>
   <div className="neon-map-actions"><span className="neon-map-badge"><Orbit size={13}/>{ready?'GOOGLE MAPS':error?'INDISPONÍVEL':'CONECTANDO'}</span><button type="button" onClick={center} disabled={!ready} title="Centralizar na região selecionada" aria-label="Centralizar mapa"><Crosshair size={18}/></button><button type="button" onClick={()=>setNeon(v=>!v)} aria-pressed={neon} title={neon?'Usar cores padrão':'Ativar visual neon'} aria-label={neon?'Usar cores padrão':'Ativar visual neon'}>{neon?<Sun size={18}/>:<Moon size={18}/>}</button></div>
  </div>
  <div className="neon-map-viewport"><div ref={div} className="map-native" aria-label={neon?'Google Maps com estilo azul neon':'Google Maps em visualização padrão'}/><div className="neon-map-corners" aria-hidden="true"><i/><i/><i/><i/></div>
   {!ready&&!error&&<div className="google-map-message" role="status"><Radar size={30}/>Carregando Google Maps...</div>}
   {error&&<div className="google-map-message" role="alert"><p>{error}</p><button className="outline-btn" onClick={onAlternative}>Abrir mapa alternativo</button></div>}
  </div>
  <div className="neon-map-footer"><span><Layers3 size={13}/>{neon?'VISUAL NEON':'VISUAL PADRÃO'}</span><span><MapPin size={13}/>{places.filter(p=>p.lat!=null&&p.lng!=null).length} pontos da busca</span>{places.length>0&&<small>Estabelecimentos: © OpenStreetMap</small>}</div>
 </div>;
}
