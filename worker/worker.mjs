// instaQ public Kick chat gateway — Cloudflare Workers Free. No secrets or bindings.
async function readBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('content type');
  const reader=request.body?.getReader();if(!reader)throw Error('body');
  let size=0;const chunks=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw Error('body too large')}chunks.push(value);}}
  finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return JSON.parse(new TextDecoder().decode(bytes));
}
const chatRooms=new Map();
async function chatUpstream(path,body){
 const response=await fetch('https://web.kick.com/api/v1/realtime/'+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:'https://kick.com',Referer:'https://kick.com/','User-Agent':'Mozilla/5.0'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Kick realtime HTTP '+response.status);
 return (await response.json()).data;
}
async function publicChat(path,body){
 const clientId=body.clientId;
 if(typeof clientId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(clientId))throw Error('Invalid clientId');
 if(path==='/chat/token'){
  const data=await chatUpstream('auth/connection',{client_id:clientId});if(typeof data?.token!=='string')throw Error('Missing connection token');return {token:data.token};
 }
 const channel=String(body.channel||'').toLowerCase();
 if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(channel)||/^\d+$/.test(channel))throw Error('نام کانال Kick را وارد کن، نه شناسهٔ عددی چت.');
 let room=chatRooms.get(channel);
 if(!room||room.until<Date.now()){
  const response=await fetch('https://kick.com/api/v2/channels/'+encodeURIComponent(channel),{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0',Referer:'https://kick.com/'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Kick channel HTTP '+response.status);
  const data=await response.json(),channelId=Number(data?.id),roomId=Number(data?.chatroom?.id);
  if(!Number.isSafeInteger(channelId)||channelId<=0||!Number.isSafeInteger(roomId)||roomId<=0)throw Error('Channel or chatroom ID missing');
  room={channelId,roomId,until:Date.now()+300000};chatRooms.set(channel,room);if(chatRooms.size>100)chatRooms.delete(chatRooms.keys().next().value);
 }
 const descriptor=await chatUpstream('channels/'+room.channelId+'/chat/connection',{client:{id:clientId,type:'web'},capabilities:{accepted_providers:[{provider:'centrifugo'}]}});
 const url=descriptor?.connections?.find(c=>c.provider==='centrifugo')?.credentials?.url;
 const parsed=new URL(url);
 if(parsed.protocol!=='wss:'||!parsed.hostname.endsWith('.platform.kick.com')||parsed.username||parsed.password)throw Error('Unsupported Kick realtime provider');
 const auth=await chatUpstream('auth/connection',{client_id:clientId});if(typeof auth?.token!=='string')throw Error('Missing connection token');
 return {provider:'centrifugo',url:parsed.href,token:auth.token,channelId:room.channelId,roomId:room.roomId};
}
export default {
 async fetch(request,env){
  const headers={'Cache-Control':'no-store','Vary':'Origin','Content-Type':'application/json; charset=utf-8'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='GET'&&new URL(request.url).pathname==='/health')return reply(200,{ok:true,version:'centrifugo-1'});
  if(!env.SITE_ORIGIN||request.headers.get('Origin')!==env.SITE_ORIGIN)return reply(403,{error:'Origin not allowed'});
  headers['Access-Control-Allow-Origin']=env.SITE_ORIGIN;
  headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(new URL(request.url).pathname==='/chat/socket'){
   if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply(426,{error:'WebSocket upgrade required'});
   const host=new URL(request.url).searchParams.get('host');
   if(!/^realtime\.[a-z0-9-]+\.platform\.kick\.com$/.test(host||''))return reply(400,{error:'Invalid Kick realtime host'});
   try{
    const upstream=await fetch('https://'+host+'/connection/websocket',{headers:{Upgrade:'websocket',Origin:'https://kick.com','User-Agent':'Mozilla/5.0'}});
    if(!upstream.webSocket)return reply(502,{error:'Kick WebSocket upgrade failed'});
    // Return the upgrade directly: Cloudflare relays frames without per-message JS execution.
    return upstream;
   }catch{return reply(502,{error:'Kick WebSocket unavailable'});}
  }
  if(request.method!=='POST')return reply(405,{error:'Method not allowed'});
  const chatPath=new URL(request.url).pathname;
  if(['/chat/bootstrap','/chat/token'].includes(chatPath)){
   try{return reply(200,await publicChat(chatPath,await readBody(request)));}
   catch(error){return reply(502,{error:'اتصال چت Kick ناموفق بود: '+String(error.message||'upstream error').slice(0,150)});}
  }
  return reply(404,{error:'Not found'});
 }
};
