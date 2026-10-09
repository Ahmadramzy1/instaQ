const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../instaQ.html'),'utf8');
const playerCode=app.slice(app.indexOf('let ytAPI='),app.indexOf('function play(i,soft)'));
function harness(platform){
 const elements=new Map(),messages=[],listeners=new Map();let events;
 const element=()=>({disabled:false,style:{},classList:{add(){}},append(){},setAttribute(){}});
 const frame={contentWindow:{postMessage:(...args)=>messages.push(args)}};
 const it={platform,c:'123',u:platform==='youtube'?'https://youtube.com/watch?v=123':'https://www.tiktok.com/@test/video/123',src:platform==='youtube'?'https://www.youtube-nocookie.com/embed/123':'https://www.tiktok.com/player/v1/123'};
 const calls=[];
 const p={getPlayerState:()=>1,getCurrentTime:()=>12,getDuration:()=>90,setVolume:v=>calls.push(['volume',v]),seekTo:v=>calls.push(['seek',v]),mute:()=>calls.push(['mute']),unMute:()=>{},setPlaybackRate:()=>{},playVideo:()=>calls.push(['play']),pauseVideo:()=>calls.push(['pause'])};
 const ctx=vm.createContext({URL,location:{origin:'https://example.com'},window:{YT:{Player:function(f,o){events=o.events;return p}}},document:{createElement:element},$:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)},fetch:()=>Promise.reject(Error('offline')),Q:[it],cur:0,V:null,E:null,LANG:'en',volume:.4,muted:false,rate:1,loop:false,auto:false,esc:String,fitEmb(){},render(){},nxt:()=>-1,play(){},toast(){},addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener(){}});
 vm.runInContext(playerCode,ctx);
 ctx.mountEmbed(it,{querySelector:()=>frame},0);
 return{ctx,it,p,calls,messages,listeners,ready:()=>events.onReady({target:p})};
}
test('YouTube controls call the official player API and expose timeline state',async()=>{
 const h=harness('youtube');await Promise.resolve();h.ready();
 assert.equal(h.ctx.V.duration,90);assert.equal(h.ctx.V.currentTime,12);
 h.ctx.V.currentTime=45;h.ctx.V.volume=.7;h.ctx.V.pause();
 assert.deepEqual(h.calls.slice(-3),[['seek',45],['volume',70],['pause']]);
});
test('TikTok controls use its own protocol and reject messages from other frames',()=>{
 const h=harness('tiktok');h.ctx.V.currentTime=25;h.ctx.V.pause();
 assert.equal(h.messages[0][0].type,'seekTo');assert.equal(h.messages[0][0].value,25);
 assert.equal(h.messages[0][1],'https://www.tiktok.com');
 const receive=h.listeners.get('message');const frameSource=h.ctx.E.contentWindow;
 receive({origin:'https://www.tiktok.com',source:{},data:{'x-tiktok-player':true,type:'onCurrentTime',value:{currentTime:99,duration:100}}});
 assert.equal(h.ctx.V.currentTime,0);
 receive({origin:'https://www.tiktok.com',source:frameSource,data:{'x-tiktok-player':true,type:'onCurrentTime',value:{currentTime:10,duration:50}}});
 assert.equal(h.ctx.V.currentTime,10);assert.equal(h.ctx.V.duration,50);
});
test('paused or unobservable embedded players never count as finished',()=>{
 const code=app.slice(app.indexOf('function idle(){'),app.indexOf('\n',app.indexOf('function idle(){')));
 const ctx=vm.createContext({cur:0,Q:[{st:'embed',seen:true}],V:null,loop:false});vm.runInContext(code,ctx);
 assert.equal(ctx.idle(),false);
 ctx.V={paused:true,ended:false};assert.equal(ctx.idle(),false);
 ctx.V.ended=true;assert.equal(ctx.idle(),true);
 ctx.loop=true;assert.equal(ctx.idle(),false);
});
test('TikTok pause and buffering events do not mark the queue item finished',()=>{
 const h=harness('tiktok'),receive=h.listeners.get('message');
 for(const value of [2,3])receive({source:h.ctx.E.contentWindow,origin:'https://www.tiktok.com',data:{'x-tiktok-player':true,type:'onStateChange',value}});
 assert.equal(h.it.seen,undefined);
 receive({source:h.ctx.E.contentWindow,origin:'https://www.tiktok.com',data:{'x-tiktok-player':true,type:'onStateChange',value:0}});
 assert.equal(h.it.seen,true);
});
