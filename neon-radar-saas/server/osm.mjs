// OpenStreetMap read-only adapter. No Google keys or public Nominatim service.
const ENDPOINT=process.env.OSM_OVERPASS_URL||'https://overpass-api.de/api/interpreter';
const USER_AGENT='NeonRadar/1.1 (+https://neon-radar-saas-tribal70.onrender.com)';
const TTL=30*60*1000, MAX_CACHE=150, MAX_BYTES=1_500_000;
const cache=new Map();
let pending=Promise.resolve(),lastRequest=0,day='',requests=0,queued=0;
const CITIES=[['Porto Alegre',-30.0346,-51.2177],['Viamão',-30.0811,-51.025],['São Paulo',-23.5505,-46.6333],['Rio de Janeiro',-22.9068,-43.1729],['Curitiba',-25.4284,-49.2733],['Belo Horizonte',-19.9167,-43.9345],['Recife',-8.0476,-34.877]];
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const categories=[
 [/restaurante|restaurantes/,['amenity','restaurant'],'Restaurante'],
 [/lanch|hamburg|fast.?food|pizzaria/,['amenity','fast_food'],'Lanchonete'],
 [/cafeter|cafe/,['amenity','cafe'],'Cafeteria'],
 [/barbear|cabeleir|salao/,['shop','hairdresser'],'Salão / barbearia'],
 [/mercado|supermerc|mercearia/,['shop','supermarket|convenience'],'Mercado'],
 [/academia/,['leisure','fitness_centre'],'Academia'],
 [/clinica|consultorio|medic/,['amenity','clinic|doctors'],'Clínica'],
 [/farmacia/,['amenity','pharmacy'],'Farmácia'],
 [/oficina|mecanica/,['shop','car_repair'],'Oficina'],
 [/padaria/,['shop','bakery'],'Padaria'],
 [/bar\b|bares/,['amenity','bar|pub'],'Bar'],
 [/hotel|pousada/,['tourism','hotel|guest_house'],'Hospedagem'],
 [/dent|odont/,['amenity','dentist'],'Dentista'],
 [/pet.?shop/,['shop','pet'],'Pet shop']
];
const labels={restaurant:'Restaurante',fast_food:'Lanchonete',cafe:'Cafeteria',hairdresser:'Salão / barbearia',supermarket:'Mercado',convenience:'Mercado',fitness_centre:'Academia',clinic:'Clínica',doctors:'Consultório',pharmacy:'Farmácia',car_repair:'Oficina',bakery:'Padaria',bar:'Bar',pub:'Bar',dentist:'Dentista',pet:'Pet shop',hotel:'Hotel',guest_house:'Pousada'};
const fail=(message,status=503,code='OSM_UNAVAILABLE')=>Object.assign(new Error(message),{status,code});
const quoted=s=>JSON.stringify(s);
const literal=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const point=p=>p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
const safeText=s=>typeof s==='string'&&s.trim()?s.slice(0,500):null;
function website(value){if(!value||(/^[a-z][a-z0-9+.-]*:/i.test(value)&&!/^https?:\/\//i.test(value)))return null;try{const u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);return ['https:','http:'].includes(u.protocol)&&u.hostname.includes('.')&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function normalizeOSM(el){
 const t=el.tags||{},lat=el.lat??el.center?.lat,lng=el.lon??el.center?.lon;
 const key=t.amenity||t.shop||t.leisure||t.tourism;
 const address=t['addr:full']||[ [t['addr:street'],t['addr:housenumber']].filter(Boolean).join(', '),t['addr:suburb'],t['addr:city'],t['addr:state']].filter(Boolean).join(' · ');
 return {id:`osm_${el.type}_${el.id}`,name:safeText(t.name)||'Nome não informado',category:labels[key]||'Estabelecimento',address:safeText(address),lat:typeof lat==='number'?lat:null,lng:typeof lng==='number'?lng:null,rating:null,reviews:null,website:website(t.website||t['contact:website']),phone:safeText(t.phone||t['contact:phone']),open:t.opening_hours==='24/7'?true:null,hours:t.opening_hours?[safeText(t.opening_hours)]:null,status:null,mapsUri:`https://www.openstreetmap.org/${el.type}/${el.id}`,photoCount:0,source:'openstreetmap'};
}
export function buildSearch(data){
 const query=String(data.query||'').trim().slice(0,160);
 if(query.length<2)throw fail('Digite uma categoria ou nome de estabelecimento.',400,'QUERY');
 let term=query,location='';
 const split=/^(.+?)\s+(?:em|no|na)\s+(.+)$/i.exec(query);
 if(split){term=split[1];location=split[2].replace(/[,\s]+(?:rs|sp|rj|pr|mg|pe|brasil|br)$/i,'').trim();}
 const city=CITIES.find(([name])=>fold(location||query).includes(fold(name)));
 if(city&&!split)term=query.replace(new RegExp(literal(city[0]),'i'),'').replace(/\b(?:rs|sp|rj|pr|mg|pe)\b/gi,'').trim();
 const center=city?{lat:city[1],lng:city[2]}:point(data.center)?data.center:null;
 const category=categories.find(([re])=>re.test(fold(term)));
 const filter=category?(category[1][1].includes('|')?`[${quoted(category[1][0])}~${quoted('^('+category[1][1]+')$')}]`:`[${quoted(category[1][0])}=${quoted(category[1][1])}]`):'';
 const nameFilter=category?'':`["name"~${quoted(literal(term||query))},i]`;
 const radius=Math.max(1,Math.min(20,Number(data.radiusKm)||10))*1000;
 let scope,prefix='';
 if(location&&!city){
  prefix=`area["ISO3166-1"="BR"]["admin_level"="2"]->.country;rel(area.country)["boundary"="administrative"]["admin_level"="8"]["name"~${quoted('^'+literal(location)+'$')},i];map_to_area->.region;`;
  scope='area.region';
 }else if(center)scope=`around:${radius},${center.lat},${center.lng}`;
 else throw fail('Escolha uma região ou pesquise no formato “restaurantes em Porto Alegre”.',400,'REGION');
 const selectors=filter?[`nwr(${scope})${filter}["name"]`]:['amenity','shop','leisure','tourism','office','craft'].map(k=>`nwr(${scope})[${quoted(k)}]${nameFilter}`);
 return {query:`[out:json][timeout:20][maxsize:134217728];${prefix}(${selectors.map(s=>s+';').join('')});out body center 60;`,center,city:city?.[0]||location||null};
}
async function overpass(query){
 const found=cache.get(query);if(found&&found.until>Date.now())return found.data;
 const work=async()=>{
  const second=cache.get(query);if(second&&second.until>Date.now())return second.data;
  const today=new Date().toISOString().slice(0,10);if(today!==day){day=today;requests=0;}
  const max=Math.max(1,Math.min(20,Number(process.env.OSM_MAX_UPSTREAM_DAILY)||20));
  if(requests>=max)throw fail('Limite diário da fonte aberta atingido. Pesquisas em cache continuam disponíveis. Tente novamente amanhã.',429,'OSM_QUOTA');
  if(Date.now()-lastRequest<2000)await new Promise(r=>setTimeout(r,2000-(Date.now()-lastRequest)));
  // One bounded request at a time. No retries or harvesting across public instances.
  requests++;lastRequest=Date.now();
  try{
   const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':USER_AGENT},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(26000)});
   if(!res.ok)throw fail(res.status===429?'A fonte OpenStreetMap está ocupada. Aguarde e tente novamente.':'A fonte OpenStreetMap está temporariamente indisponível.',res.status===429?429:503);
   let size=0;const chunks=[];
   for await(const chunk of res.body){size+=chunk.length;if(size>MAX_BYTES)throw fail('A consulta retornou dados demais. Reduza o raio da pesquisa.',400,'OSM_SIZE');chunks.push(Buffer.from(chunk));}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(data.remark){console.warn('OSM provider remark:',String(data.remark).slice(0,220));throw fail('A fonte aberta não concluiu a consulta. Reduza o raio ou tente mais tarde.');}
   if(!Array.isArray(data.elements))throw fail('Resposta inválida da fonte aberta.');
   if(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);
   cache.set(query,{until:Date.now()+TTL,data});return data;
  }catch(e){console.warn('OSM transport:',e.name,e.cause?.code||e.code||'INVALID_RESPONSE');if(e.code?.startsWith?.('OSM_'))throw e;throw fail('Não foi possível consultar o OpenStreetMap agora. Tente novamente em instantes.');}
 };
 if(queued>=2)throw fail('Há uma consulta em andamento. Aguarde alguns segundos e tente novamente.',429,'OSM_BUSY');
 queued++;const next=pending.then(work,work).finally(()=>{queued--;});pending=next.catch(()=>{});return next;
}
export async function searchOSM(data){
 if(data.openNow===true)throw fail('A fonte aberta não informa “aberto agora” com segurança. Consulte o horário cadastrado nos detalhes.',400,'UNSUPPORTED_FILTER');
 const built=buildSearch(data),raw=await overpass(built.query);
 const seen=new Set();const places=raw.elements.map(normalizeOSM).filter(p=>{if(!p.name||p.lat===null||p.lng===null)return false;const k=fold(p.name)+':'+p.lat.toFixed(4)+':'+p.lng.toFixed(4);if(seen.has(k))return false;seen.add(k);return true;});
 return {places,nextPageToken:null,source:'openstreetmap',center:built.center,region:built.city,disclaimer:'© OpenStreetMap contributors · ODbL. Dados colaborativos: cobertura e contatos podem estar incompletos. Sem notas ou avaliações do Google.'};
}
export async function detailOSM(id){
 const match=/^osm_(node|way|relation)_(\d{1,15})$/.exec(id);
 if(!match)throw fail('Identificador OpenStreetMap inválido.',400,'ID');
 const raw=await overpass(`[out:json][timeout:20];${match[1]}(${match[2]});out body center 1;`);
 if(!raw.elements.length)throw fail('Estabelecimento não encontrado na fonte aberta.',404,'NOT_FOUND');
 return {place:normalizeOSM(raw.elements[0]),source:'openstreetmap'};
}
