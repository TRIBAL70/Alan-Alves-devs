import {useEffect,useRef,useState} from 'react';
import type {Config,Place} from './main';

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
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const denied=()=>{if(active){setReady(false);setError('O Google recusou a chave do mapa. Verifique a Maps JavaScript API, o faturamento e a autorização deste domínio no Google Cloud.');}};
  authListeners.add(denied);
  if(!config.googleBrowserKey){setError('A chave de navegador do Google Maps não está configurada.');return()=>{authListeners.delete(denied);};}
  setError('');
  loadGoogle(config.googleBrowserKey).then(()=>{
   if(!active||!div.current)return;
   const gm=(window as any).google.maps;
   // Roadmap uses Google's original colors and built-in controls.
   map.current=new gm.Map(div.current,{center:origin,zoom:12,mapTypeId:'roadmap',mapTypeControl:true,fullscreenControl:true,streetViewControl:true,zoomControl:true,gestureHandling:'cooperative'});
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
   const marker=new gm.Marker({map:m,position,title:p.name});
   marker.addListener('click',()=>onSelect(p));markers.current.push(marker);bounds.extend(position);
  });
  if(markers.current.length===1){m.setCenter(bounds.getCenter());m.setZoom(15);}
  else if(markers.current.length)m.fitBounds(bounds,35);
  else {m.setCenter(origin);m.setZoom(12);}
 },[places,origin,onSelect,ready]);
 return <div className="map-stage google-map"><div ref={div} className="map-native" aria-label="Google Maps em visualização padrão"/>{!ready&&!error&&<div className="google-map-message" role="status">Carregando Google Maps...</div>}{error&&<div className="google-map-message" role="alert"><p>{error}</p><button className="outline-btn" onClick={onAlternative}>Abrir mapa alternativo</button></div>}{ready&&places.length>0&&<span className="google-map-source">Estabelecimentos: © colaboradores OpenStreetMap</span>}</div>;
}
