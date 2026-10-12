const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'../instaQ.html'),'utf8');
const code=app.slice(app.indexOf('const RX='),app.indexOf('const nxt='));
function setup(get){const c=vm.createContext({get});vm.runInContext(code+'\nglobalThis.links={parse,tiktokVideoId,resolveTikTokShort,scan:text=>(text.match(RX)||[]).map(parse)}',c);return c.links}
test('vt and vm short links are preserved by chat scanning',()=>{
 const api=setup();for(const host of ['vt','vm']){
 const url=`https://${host}.tiktok.com/ZSbKPchr7/`;
 const result=api.scan(`watch this ${url}`);assert.equal(result.length,1);
 assert.equal(result[0].platform,'tiktok');assert.equal(result[0].c,'ZSbKPchr7');assert.equal(result[0].u,url);
 }
 assert.equal(api.parse('vt.tiktok.com/ZSbKPchr7/').platform,'tiktok');
 assert.equal(api.parse('https://www.tiktok.com/@user/video/123456789').c,'123456789');
});
test('short links resolve via oEmbed, with page metadata as a fallback',async()=>{
 let calls=[];
 const api=setup(async(url,ok)=>{calls.push(url);if(url.includes('/oembed'))throw Error('unavailable');const html='<link rel="canonical" href="https://www.tiktok.com/@user/video/123456789">';assert.equal(ok(html),true);return html});
 const item={u:'https://vt.tiktok.com/ZSbKPchr7/',c:'ZSbKPchr7'};
 await api.resolveTikTokShort(item,new AbortController().signal);assert.equal(item.c,'123456789');assert.equal(calls[1],item.u);
 const primary=setup(async(url,ok)=>{const json='{"video_id":"987654321"}';assert.equal(ok(json),true);return json});
 const item2={u:item.u,c:'ZSbKPchr7'};await primary.resolveTikTokShort(item2);assert.equal(item2.c,'987654321');
});
test('short-link resolution respects cancellation and rejects unrelated IDs',async()=>{
 const ac=new AbortController();ac.abort();let count=0;
 const api=setup(async()=>{count++;throw Error('aborted')});
 await assert.rejects(api.resolveTikTokShort({u:'https://vt.tiktok.com/test/',c:'test'},ac.signal));assert.equal(count,1);
 assert.equal(api.tiktokVideoId('{"id":"123456"}'),null);
});
