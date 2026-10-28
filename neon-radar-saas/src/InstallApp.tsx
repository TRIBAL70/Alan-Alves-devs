import {useEffect,useRef,useState} from 'react';
import {Check,Download,Share,Smartphone,WifiOff,X} from 'lucide-react';
import './install-app.css';

type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone===true;

export function InstallApp(){
 const [installed,setInstalled]=useState(standalone);
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
 const [offline,setOffline]=useState(!navigator.onLine);
 const [busy,setBusy]=useState(false);
 const [note,setNote]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 useEffect(()=>{
  const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};
  const complete=()=>{setInstalled(true);setPrompt(null);dialog.current?.close()};
  const online=()=>setOffline(false),offline=()=>setOffline(true);
  const mode=window.matchMedia('(display-mode: standalone)');
  const modeChange=()=>setInstalled(standalone());
  window.addEventListener('beforeinstallprompt',capture);
  window.addEventListener('appinstalled',complete);
  window.addEventListener('online',online);window.addEventListener('offline',offline);
  mode.addEventListener('change',modeChange);
  return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',complete);window.removeEventListener('online',online);window.removeEventListener('offline',offline);mode.removeEventListener('change',modeChange)};
 },[]);
 async function install(){
  if(!prompt)return;
  setBusy(true);setNote('');
  try{await prompt.prompt();const {outcome}=await prompt.userChoice;setPrompt(null);if(outcome==='accepted')dialog.current?.close();else setNote('Você pode instalar quando quiser pelo menu do navegador.');}
  catch{setPrompt(null);setNote('Use o menu do navegador para adicionar o Neon Radar à tela inicial.');}
  finally{setBusy(false)}
 }
 return <>
  {offline&&<div className="app-offline" role="status"><WifiOff size={16}/> Sem conexão. Pesquisas, mapas, CRM e IA precisam de internet.</div>}
  {!installed&&<button className="app-install-launch" onClick={()=>dialog.current?.showModal()}><Smartphone size={18}/><span>Instalar aplicativo</span></button>}
  <dialog className="app-install-dialog" ref={dialog} aria-labelledby="app-install-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close()}}>
   <button className="app-install-close" aria-label="Fechar instruções de instalação" onClick={()=>dialog.current?.close()}><X size={21}/></button>
   <img src="/icons/icon-192.png" alt="" width="72" height="72"/>
   <small>SEU RADAR. SEMPRE POR PERTO.</small><h2 id="app-install-title">Leve o NEON RADAR<br/>para sua tela inicial.</h2>
   <p>Toda a plataforma em um aplicativo: pesquisas, mapas, oportunidades, favoritos, CRM e NEON AI.</p>
   <div className="app-install-benefits"><span><Check size={16}/> Ícone na tela inicial</span><span><Check size={16}/> Janela própria de aplicativo</span><span><Check size={16}/> Mesma conta e funcionalidades</span></div>
   {prompt?<button className="app-install-primary" disabled={busy} onClick={install}><Download size={18}/>{busy?'Abrindo instalação…':'Instalar NEON RADAR'}</button>:<div className="app-install-steps"><strong>{ios?<><Share size={17}/> No Safari do iPhone ou iPad</>:'No Chrome do Android'}</strong><ol>{ios?<><li>Toque em <b>Compartilhar</b>.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Ative <b>Abrir como App</b>, se aparecer, e toque em <b>Adicionar</b>.</li></>:<><li>Abra este endereço no <b>Chrome</b>.</li><li>Toque no menu <b>⋮</b> do navegador.</li><li>Escolha <b>Adicionar à tela inicial</b> e depois <b>Instalar</b>.</li></>}</ol><p>No computador, procure o ícone de instalação na barra de endereços. A opção depende do navegador.</p></div>}
   {note&&<p role="status">{note}</p>}
   <p className="app-install-footnote">Instalação pelo navegador. Internet necessária para os serviços da plataforma.</p>
  </dialog>
 </>;
}

if('serviceWorker' in navigator && import.meta.env.PROD){
 const register=()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{/* A plataforma continua disponível sem suporte offline. */});
 if(document.readyState==='complete')void register();else window.addEventListener('load',register,{once:true});
}
