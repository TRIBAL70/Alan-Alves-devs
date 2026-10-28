import {useEffect,useRef,useState} from 'react';
import {Radar,Layers3,MapPin,Orbit} from 'lucide-react';
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

type AlienSymbol='target'|'energy'|'map'|'satellite'|'expand'|'eye'|'plus'|'minus';
function AlienGlyph({symbol}:{symbol:AlienSymbol}){
 const paths:Record<AlienSymbol,React.ReactNode>={
  target:<><path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/><circle cx="12" cy="12" r="3"/></>,
  energy:<><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m13 5-6 8h5l-1 6 6-9h-5Z"/></>,
  map:<><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Z"/><path d="M9 3v15m6-12v15M4 11l4-2m8 5 4-2"/></>,
  satellite:<><path d="m9 7 8 8-4 4-8-8Zm-6-4 5 5m8 8 5 5M2 8l6-6 3 3-6 6Zm11 11 6-6 3 3-6 6Z"/><path d="M14 3a7 7 0 0 1 7 7m-7-3a3 3 0 0 1 3 3"/></>,
  expand:<><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l5 5m13-5-5 5M3 21l5-5m13 5-5-5"/></>,
  eye:<><path d="M2 6c4-4 16-4 20 0l-2 10-8 6-8-6Z"/><path d="m5 8 5 3-1 4-4-3Zm14 0-5 3 1 4 4-3ZM11 18h2"/></>,
  plus:<><path d="m8 2-6 6v8l6 6m8-20 6 6v8l-6 6M12 6v12M6 12h12"/></>,
  minus:<><path d="m8 2-6 6v8l6 6m8-20 6 6v8l-6 6M6 12h12"/></>
 };
 return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[symbol]}</svg>;
}

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
 const shell=useRef<HTMLDivElement>(null),div=useRef<HTMLDivElement>(null),map=useRef<any>(null),markers=useRef<any[]>([]);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[neon,setNeon]=useState(true),[mapType,setMapType]=useState<'roadmap'|'hybrid'>('roadmap'),[expanded,setExpanded]=useState(false);
 const selectRef=useRef(onSelect);selectRef.current=onSelect;
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
   // Custom controls replace default UI; Google attribution remains untouched.
   map.current=new gm.Map(div.current,{center:origin,zoom:12,mapTypeId:'roadmap',styles:neonRef.current?NEON_STYLE:[],disableDefaultUI:true,keyboardShortcuts:true,gestureHandling:'cooperative'});
   map.current.addListener('click',(event:any)=>{
    if(!event.placeId||!event.latLng)return;
    event.stop();const lat=event.latLng.lat(),lng=event.latLng.lng();
    const mapsUri='https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:`${lat},${lng}`,query_place_id:event.placeId});
    selectRef.current({id:'gmap_'+event.placeId,name:'Estabelecimento no Google Maps',category:'Carregando informações do local',address:null,lat,lng,rating:null,reviews:null,website:null,phone:null,open:null,hours:null,status:null,mapsUri,source:'google'});
   });
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
 useEffect(()=>{if(ready&&map.current)map.current.setMapTypeId(mapType);},[mapType,ready]);
 useEffect(()=>{const sync=()=>setExpanded(document.fullscreenElement===shell.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 const fullscreen=async()=>{
  if(document.fullscreenElement===shell.current){await document.exitFullscreen();return;}
  if(expanded){setExpanded(false);return;}
  if(shell.current?.requestFullscreen){try{await shell.current.requestFullscreen();return;}catch{/* Use a responsive expanded panel when fullscreen is unavailable. */}}
  setExpanded(true);
 };
 const streetView=()=>{
  const position=map.current?.getCenter();if(!position)return;
  const url=new URL('https://www.google.com/maps/@');
  url.search=new URLSearchParams({api:'1',map_action:'pano',viewpoint:`${position.lat()},${position.lng()}`}).toString();
  window.open(url.toString(),'_blank','noopener,noreferrer');
 };
 const zoom=(step:number)=>{const m=map.current;if(m)m.setZoom(Math.max(0,Math.min(21,(m.getZoom()??12)+step)));};
 const center=()=>{if(!map.current)return;map.current.panTo(origin);map.current.setZoom(12);};
 return <div ref={shell} className={'map-stage google-map neon-map-shell '+(neon?'is-neon':'is-standard')+(expanded?' alien-expanded':'')}>
  <div className="neon-map-toolbar">
   <div className="neon-map-brand"><span className="neon-map-emblem"><Radar size={23}/></span><span><small>NEON RADAR</small><strong>Visão geográfica</strong></span></div>
   <div className="neon-map-actions"><span className="neon-map-badge"><Orbit size={13}/>{ready?'GOOGLE MAPS':error?'INDISPONÍVEL':'CONECTANDO'}</span><button type="button" onClick={center} disabled={!ready} title="Centralizar na região selecionada" aria-label="Centralizar mapa"><AlienGlyph symbol="target"/></button><button type="button" onClick={()=>setNeon(v=>!v)} aria-pressed={neon} title={neon?'Usar cores padrão':'Ativar visual neon'} aria-label={neon?'Usar cores padrão':'Ativar visual neon'}><AlienGlyph symbol="energy"/></button></div>
  </div>
  <div className="neon-map-viewport"><div ref={div} className="map-native" aria-label={neon?'Google Maps com estilo azul neon':'Google Maps em visualização padrão'}/><div className="neon-map-corners" aria-hidden="true"><i/><i/><i/><i/></div>
   {ready&&<div className="alien-map-controls">
    <div className="alien-map-modes" role="group" aria-label="Tipo de mapa"><button type="button" className="alien-control alien-mode" aria-pressed={mapType==='roadmap'} onClick={()=>{map.current?.getStreetView().setVisible(false);setMapType('roadmap');}}><AlienGlyph symbol="map"/><span>Mapa</span></button><button type="button" className="alien-control alien-mode" aria-pressed={mapType==='hybrid'} onClick={()=>{map.current?.getStreetView().setVisible(false);setMapType('hybrid');}}><AlienGlyph symbol="satellite"/><span>Satélite</span></button></div>
    <button type="button" className="alien-control alien-fullscreen" aria-label={expanded?'Sair da tela cheia':'Expandir mapa'} aria-pressed={expanded} title={expanded?'Sair da tela cheia':'Expandir mapa'} onClick={fullscreen}><AlienGlyph symbol="expand"/></button>
    <div className="alien-navigation" role="group" aria-label="Navegação no mapa"><button type="button" className="alien-control alien-street" aria-label="Abrir Street View no Google Maps em nova aba" title="Street View · abre no Google Maps" onClick={streetView}><AlienGlyph symbol="eye"/></button><div className="alien-zoom"><button type="button" className="alien-control" aria-label="Aumentar zoom" onClick={()=>zoom(1)}><AlienGlyph symbol="plus"/></button><span aria-hidden="true"/><button type="button" className="alien-control" aria-label="Diminuir zoom" onClick={()=>zoom(-1)}><AlienGlyph symbol="minus"/></button></div></div>
   </div>}
   {!ready&&!error&&<div className="google-map-message" role="status"><Radar size={30}/>Carregando Google Maps...</div>}
   {error&&<div className="google-map-message" role="alert"><p>{error}</p><button className="outline-btn" onClick={onAlternative}>Abrir mapa alternativo</button></div>}
  </div>
  <div className="neon-map-footer"><span><Layers3 size={13}/>{neon?'VISUAL NEON':'VISUAL PADRÃO'}</span><span><MapPin size={13}/>{places.filter(p=>p.lat!=null&&p.lng!=null).length} pontos da busca</span>{places.length>0&&<small>Estabelecimentos: © OpenStreetMap</small>}</div>
 </div>;
}
