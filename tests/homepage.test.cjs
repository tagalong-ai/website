const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../homepage.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

function setup(reduce = false) {
 const events = () => ({ handlers: {}, addEventListener(name, fn) { (this.handlers[name] ??= []).push(fn); }, fire(name, event = {}) { for (const fn of this.handlers[name] ?? []) fn({ target: this, preventDefault() {}, ...event }); } });
 let focused;
 const node = () => Object.assign(events(), { attrs: {}, dataset: {}, hidden: false, textContent: '', setAttribute(k,v) { this.attrs[k]=v; }, getAttribute(k) { return this.attrs[k]; }, focus() { focused=this; tour.fire('focusin',{target:this}); }, classList: { add() {}, remove() {}, toggle() {} } });
 const videos = Array.from({length:8}, (_,i) => i < 3 ? Object.assign(node(), { currentTime:0, duration:8, paused:true, rejection:null, play() { this.paused=false; return this.rejection ? Promise.reject(this.rejection) : Promise.resolve(); }, pause() { this.paused=true; } }) : null);
 const tabs = Array.from({length:8}, (_,i) => Object.assign(node(), {id:`tab-${i}`}));
 const panels = videos.map(video => Object.assign(node(), {querySelector:()=>video}));
 const play=node(), replay=node(), count=node(), status=node(), tablist=node(), controls=node();
 const tour=Object.assign(node(), {querySelectorAll:s=>s==='[data-tour-step]'?tabs:panels,querySelector:s=>({'[data-tour-play]':play,'[data-tour-replay]':replay,'[data-tour-count]':count,'[data-tour-status]':status,'[role="tablist"]':tablist,'.native-tour-controls':controls}[s])});
 const ids=Object.fromEntries(['gallery-dialog','gallery-dialog-image','gallery-close','gallery-dialog-title'].map(id=>[id,node()]));
 const document=Object.assign(events(),{hidden:false,getElementById:id=>ids[id]||null,querySelector:()=>tour,querySelectorAll:()=>[]});
 const reduced=Object.assign(events(),{matches:reduce});
 let tick=0,observer;
 const timers=new Map();
 const window=Object.assign(events(),{matchMedia:()=>reduced,setTimeout(fn,delay){timers.set(++tick,{fn,delay});return tick;},clearTimeout:id=>timers.delete(id),IntersectionObserver:true});
 vm.runInNewContext(source,{document,window,IntersectionObserver:class {constructor(fn){observer=fn;}observe(){}}});
 const advance=()=>{const next=timers.entries().next().value;if(next){timers.delete(next[0]);next[1].fn();}};
 return {tabs,panels,videos,play,replay,count,status,tour,document,reduced,window,timers,active:()=>panels.findIndex(p=>!p.hidden),advance,visible:value=>observer([{isIntersecting:value}]),focused:()=>focused};
}

test('muted inline motion begins when visible; only the active video plays',()=>{
 const x=setup();assert.equal(x.timers.size,0);assert.ok(x.videos.filter(Boolean).every(v=>v.paused));
 x.visible(true);assert.equal(x.videos[0].paused,false);assert.equal(x.videos[0].muted,true);assert.equal(x.videos[0].hidden,false);assert.equal(x.videos[1].paused,true);assert.equal(x.timers.size,1);
 assert.equal(x.panels.filter(p=>!p.hidden).length,1);assert.equal(x.tabs.filter(t=>t.tabIndex===0).length,1);
});
test('clicking an above-preview chapter keeps autoplay running and starts its motion',()=>{
 const x=setup();x.visible(true);x.tabs[2].focus();x.tabs[2].fire('click');
 assert.equal(x.active(),2);assert.equal(x.videos[2].paused,false);assert.equal(x.videos[0].paused,true);assert.equal(x.timers.size,1);assert.match(x.status.textContent,/Auto-playing/);
});
test('pause freezes the current video; resume preserves its position',()=>{
 const x=setup();x.visible(true);x.videos[0].currentTime=3.2;x.play.focus();x.play.fire('click');
 assert.equal(x.timers.size,0);assert.equal(x.videos[0].paused,true);assert.equal(x.videos[0].currentTime,3.2);
 x.play.fire('click');assert.equal(x.videos[0].paused,false);assert.equal(x.videos[0].currentTime,3.2);
});
test('chapter selection respects an explicit pause and shows a complete poster',()=>{
 const x=setup();x.visible(true);x.play.fire('click');x.tabs[2].fire('click');
 assert.equal(x.active(),2);assert.equal(x.videos[2].hidden,true);assert.equal(x.timers.size,0);
});
test('video completion advances chapters; the tour loops across all eight',()=>{
 const x=setup();x.visible(true);x.videos[0].fire('ended');assert.equal(x.active(),1);assert.equal(x.timers.size,1);
 for(let i=0;i<7;i++)x.advance();assert.equal(x.active(),0);assert.equal(x.timers.size,1);
});
test('keyboard navigation pauses, wraps, supports Home/End and preserves focus',()=>{
 const x=setup();x.visible(true);x.tabs[0].fire('keydown',{key:'ArrowLeft'});assert.equal(x.active(),7);assert.equal(x.focused(),x.tabs[7]);assert.equal(x.timers.size,0);
 x.tabs[7].fire('keydown',{key:'Home'});assert.equal(x.active(),0);
 x.tabs[0].fire('keydown',{key:'End'});assert.equal(x.active(),7);
 x.tabs[7].fire('keydown',{key:'ArrowRight'});assert.equal(x.active(),0);
});
test('replay restarts the native clip and creates exactly one cycle timer',()=>{
 const x=setup();x.visible(true);x.videos[0].currentTime=4;x.replay.fire('click');assert.equal(x.videos[0].currentTime,0);assert.equal(x.timers.size,1);assert.equal(x.videos[0].paused,false);
});
test('reduced motion never autoplays videos; Next step and chapters remain usable',()=>{
 const x=setup(true);x.visible(true);assert.equal(x.timers.size,0);assert.equal(x.videos[0].hidden,true);assert.equal(x.play.textContent,'Next step');x.play.fire('click');assert.equal(x.active(),1);
 x.reduced.matches=false;x.reduced.fire('change');assert.equal(x.timers.size,0);
 x.play.fire('click');x.reduced.matches=true;x.reduced.fire('change');assert.equal(x.videos[1].paused,true);assert.equal(x.videos[1].hidden,true);
});
test('offscreen, background and page departure pause media and cancel timers',()=>{
 const x=setup();x.visible(true);x.visible(false);assert.equal(x.videos[0].paused,true);assert.equal(x.timers.size,0);
 x.visible(true);x.document.hidden=true;x.document.fire('visibilitychange');assert.equal(x.timers.size,0);assert.equal(x.videos[0].paused,true);
 x.document.hidden=false;x.document.fire('visibilitychange');assert.equal(x.timers.size,1);
 x.window.fire('pagehide');assert.equal(x.videos[0].paused,true);assert.equal(x.timers.size,0);x.window.fire('pageshow');assert.equal(x.timers.size,1);
 x.panels[0].focus();assert.equal(x.timers.size,0);
});
test('buffering has a bounded timeout and resumes at the actual video position',()=>{
 const x=setup();x.visible(true);x.videos[0].fire('waiting');assert.equal(x.timers.size,1);assert.equal([...x.timers.values()][0].delay,15000);
 x.videos[0].currentTime=2;x.videos[0].fire('playing');assert.equal(x.timers.size,1);assert.ok([...x.timers.values()][0].delay<=6250);
});
test('failed media falls back to the poster and continues cycling',()=>{
 const x=setup();x.visible(true);x.videos[0].fire('error');assert.equal(x.videos[0].hidden,true);assert.equal(x.videos[0].paused,true);x.advance();assert.equal(x.active(),1);
});
test('autoplay rejection offers explicit Play without an unhandled rejection',async()=>{
 const x=setup();x.videos[0].rejection={name:'NotAllowedError'};x.visible(true);await Promise.resolve();assert.equal(x.videos[0].hidden,true);assert.equal(x.timers.size,0);assert.equal(x.play.textContent,'Play animation');
});
test('an interrupted play request does not permanently turn off automatic cycling',async()=>{
 const x=setup();x.videos[0].rejection={name:'AbortError'};x.visible(true);await Promise.resolve();assert.equal(x.timers.size,1);assert.match(x.status.textContent,/Auto-playing/);
});
test('controls precede the app; three real motion clips have accessible static fallbacks',()=>{
 assert.ok(html.indexOf('class="native-tour-controls"')<html.indexOf('class="native-tour-stage"'));
 assert.equal((html.match(/data-tour-video/g)||[]).length,3);assert.equal((html.match(/data-tour-panel/g)||[]).length,8);
 assert.doesNotMatch(html,/data-tour-panel[^>]*\bhidden\b/);assert.match(html,/<noscript>/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const [,anchor] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(anchor));
 for(const [,asset] of html.matchAll(/(?:src|poster|href)="(assets\/[^"#]+)"/g))assert.ok(fs.existsSync(path.join(__dirname,'..',asset)),`Missing ${asset}`);
});
test('brand classes remain isolated; Free pricing and release boundaries are preserved',()=>{
 const shared=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
 const classes=new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/)));
 const legacy=new Set([...shared.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m=>m[1]));assert.deepEqual([...classes].filter(c=>legacy.has(c)),[]);
 for(const text of ['<h3>Free</h3>','$0','5 meetings per month','$9.99','$199','support@tagalongai.com','Public release · v3.4.1','ChatGPT · setup kit'])assert.ok(html.includes(text),`Missing ${text}`);
 assert.doesNotMatch(html,/@gmail\.com/);
});
