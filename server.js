// بلياردو 8 - Discord Activity في ملف واحد (بدون أي مكتبات)
// المتغيرات: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SECRET
const http = require('http'), crypto = require('crypto');
const { DISCORD_CLIENT_ID: CID = '', DISCORD_CLIENT_SECRET: CSEC = '', SECRET = 'change-me' } = process.env;

const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const mk = o => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + sign(b); };
function chk(t) {
  if (!t) return null;
  const [b, s] = t.split('.'); if (!b || !s) return null;
  const a = Buffer.from(sign(b)), c = Buffer.from(s);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return null;
  try { return JSON.parse(Buffer.from(b, 'base64url')); } catch { return null; }
}
const body = req => new Promise(r => {
  let d = ''; req.on('data', c => { d += c; if (d.length > 3e5) req.destroy(); });
  req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } });
});
const json = (res, o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
const rooms = {};

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/api/token' && req.method === 'POST') {
      const { code } = await body(req);
      const tr = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CID, client_secret: CSEC, grant_type: 'authorization_code', code })
      }).then(r => r.json());
      if (!tr.access_token) return json(res, { error: 'auth' }, 400);
      const d = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tr.access_token } }).then(r => r.json());
      return json(res, { session: mk({ id: d.id, name: d.global_name || d.username, av: d.avatar }) });
    }
    if (u.pathname === '/api/sync' && req.method === 'POST') {
      const m = await body(req), me = chk(m.s);
      if (!me || !m.room) return json(res, { error: 'auth' }, 401);
      const R = rooms[m.room] || (rooms[m.room] = { seats: [null, null], ev: [], c: 0, last: null, li: 0 });
      const fx = /^(\d{5,25})-(\d{5,25})$/.exec(m.room);
      let seat;
      if (fx) { seat = [fx[1], fx[2]].indexOf(me.id); if (seat >= 0) R.seats[seat] = me; }
      else {
        seat = R.seats.findIndex(x => x && x.id === me.id);
        if (seat < 0) { seat = R.seats.findIndex(x => !x); if (seat >= 0) R.seats[seat] = me; }
      }
      if (m.msg && seat >= 0) {
        R.ev.push({ i: ++R.c, f: seat, m: m.msg });
        if (R.ev.length > 200) R.ev.shift();
        if (m.msg.t === 'settle') { R.last = m.msg; R.li = R.c; }
      }
      const since = typeof m.since === 'number' ? m.since : -1, first = since < 0;
      const ev = R.ev.filter(e => e.i > (first ? R.li : since) && e.f !== seat);
      return json(res, {
        seat: seat + 1, n: R.c, ev, last: first ? R.last : null,
        players: R.seats.map(x => x && { id: x.id, name: x.name, av: x.av })
      });
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML.replace('__CID__', CID));
  } catch (e) { json(res, { error: 'server' }, 500); }
}).listen(process.env.PORT || 3000, () => console.log('pool up'));

const HTML = String.raw`<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>بلياردو 8</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#17181b;color:#eee;font-family:"Segoe UI",Tahoma,system-ui,sans-serif}
#app{max-width:1100px;margin:0 auto;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:100%;justify-content:center}
#row{display:flex;gap:8px;align-items:stretch}
#pbar{width:44px;flex:none;border-radius:22px;background:linear-gradient(#e33,#e9b21e 45%,#3c3);border:2px solid #555;position:relative;touch-action:none;cursor:ns-resize;overflow:hidden;opacity:.55}
#pbar.on{opacity:1}
#fill{position:absolute;inset:0 0 auto 0;height:0;background:rgba(10,10,10,.72)}
#cue{position:absolute;left:50%;top:0;width:8px;height:78%;margin-left:-4px;border-radius:4px;background:linear-gradient(90deg,#8a5a22,#f0c577,#8a5a22)}
#tw{position:relative;flex:1;min-width:0}
canvas{width:100%;height:auto;display:block;touch-action:none;border-radius:16px}
.pc{position:absolute;top:6px;display:flex;align-items:center;gap:8px;padding:5px 12px 5px 6px;border-radius:30px;background:rgba(0,0,0,.62);border:2px solid transparent;pointer-events:none;max-width:46%}
#c0{left:8px}#c1{right:8px;flex-direction:row-reverse;padding:5px 6px 5px 12px;text-align:left}
.pc.on{border-color:#ffd54a;box-shadow:0 0 14px #ffd54a99}
.pc img{width:42px;height:42px;border-radius:50%;background:#444;flex:none}
.pc b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc span{font-size:12px;color:#ccc}
#bot{display:flex;align-items:center;gap:8px}
#msg{flex:1;font-weight:600;font-size:15px;min-height:24px}
button{font:inherit;border:0;border-radius:10px;padding:8px 14px;background:#3a3d44;color:#fff;cursor:pointer;touch-action:none}
button:focus-visible{outline:3px solid #7aa2ff}
</style></head><body>
<div id="app">
<div id="row">
<div id="pbar" aria-label="قوة الضربة"><div id="fill"></div><div id="cue"></div></div>
<div id="tw"><canvas id="c"></canvas>
<div class="pc" id="c0"><img id="a0" alt=""><div><b id="n0">اللاعب 1</b><span id="s0"></span></div></div>
<div class="pc" id="c1"><img id="a1" alt=""><div><b id="n1">اللاعب 2</b><span id="s1"></span></div></div>
</div></div>
<div id="bot"><div id="msg" role="status"></div>
<button id="l" aria-label="تحريك العصا يسارا">◀</button><button id="r" aria-label="تحريك العصا يمينا">▶</button>
<button id="rs">إعادة</button></div>
</div>
<script>
const CID='__CID__';
const $=id=>document.getElementById(id);
const P=new URLSearchParams(location.search),FR=P.get('frame_id'),INST=P.get('custom_id')||P.get('instance_id')||'room',LOCAL=!FR;
const API=LOCAL?'/api':'/.proxy/api';
const cv=$('c'),ctx=cv.getContext('2d');
const W=900,H=450,M=46,R=13,PR=27,N=4;cv.width=W;cv.height=H;
const POCK=[[M-4,M-4],[W-M+4,M-4],[M-4,H-M+4],[W-M+4,H-M+4],[W/2,M-9],[W/2,H-M+9]];
const C=['','#f4c20d','#1f4fbf','#d62828','#5b2a86','#f57c1f','#1f8a3b','#7a1f1f','#15130f'];
const grp=n=>n===8?'8':n===0?'w':n<8?'s':'t';
let balls,turn,over,potted,shooting,remote,msg,G,inHand,first,seed,ang=0,pwr=0,me=0,players=[null,null],SESS=null,SINCE=-1,loaded=false;

/* ---------- Discord RPC (بدون SDK) ---------- */
const pend={};let readyRes;const ready=new Promise(r=>readyRes=r);
addEventListener('message',e=>{
  if(e.source!==parent||!Array.isArray(e.data))return;
  const op=e.data[0],d=e.data[1];
  if(op===1&&d){
    if(d.nonce&&pend[d.nonce]){const p=pend[d.nonce];delete pend[d.nonce];d.evt==='ERROR'?p.rej(d.data):p.res(d.data)}
    else if(d.evt==='READY')readyRes();
  }
});
const rpc=(cmd,args)=>new Promise((res,rej)=>{const nonce=crypto.randomUUID();pend[nonce]={res,rej};parent.postMessage([1,{cmd,args,nonce}],'*')});

/* ---------- اللعبة ---------- */
function rng(s){let a=0;for(const ch of String(s))a=(a*31+ch.charCodeAt(0))>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function setup(s){
  seed=s;const rn=rng(s),ids=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(rn()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  ids.splice(4,0,8);
  balls=[{n:0,x:230,y:H/2,vx:0,vy:0,out:false}];
  let k=0;
  for(let i=0;i<5;i++)for(let j=0;j<=i;j++)balls.push({n:ids[k++],x:600+i*R*1.74,y:H/2+(j-i/2)*R*2.03,vx:0,vy:0,out:false});
}
function reset(s){
  setup(s);turn=0;over=false;potted=[];shooting=false;remote=false;G=[null,null];inHand=false;first=null;
  msg='بدأت المباراة. الدور للاعب الأول.';
}
const cnt=g=>balls.filter(b=>!b.out&&grp(b.n)===g).length;
const gname=g=>g==='s'?'الملونة':'المخططة';
const who=i=>(players[i]&&players[i].name)||('اللاعب '+(i+1));
const waiting=()=>!LOCAL&&!(players[0]&&players[1]);
const canShoot=()=>!shooting&&!over&&!waiting()&&(LOCAL||me===turn+1);
function avUrl(p){return p&&p.av?'https://cdn.discordapp.com/avatars/'+p.id+'/'+p.av+'.png?size=64':'https://cdn.discordapp.com/embed/avatars/0.png'}
function ui(){
  for(const i of [0,1]){
    $('c'+i).classList.toggle('on',!over&&!waiting()&&turn===i);
    $('n'+i).textContent=who(i)+(!LOCAL&&me===i+1?' (أنت)':'');
    $('s'+i).textContent=G[i]?gname(G[i])+' · باقي '+cnt(G[i]):'لم تُحدد المجموعة';
    if(players[i])$('a'+i).src=avUrl(players[i]);
  }
  $('msg').textContent=waiting()?'بانتظار اللاعب الثاني... اطلب منه فتح اللعبة.':msg;
  $('pbar').classList.toggle('on',canShoot());
}
const snap=()=>balls.map(b=>[b.x,b.y,b.out?1:0]);
const apply=s=>s.forEach((v,i)=>{const b=balls[i];b.x=v[0];b.y=v[1];b.out=!!v[2];b.vx=b.vy=0});
function sub(){
  const dt=1/N;
  for(const b of balls){
    if(b.out)continue;
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<M+R){b.x=M+R;b.vx=Math.abs(b.vx)*.82}
    if(b.x>W-M-R){b.x=W-M-R;b.vx=-Math.abs(b.vx)*.82}
    if(b.y<M+R){b.y=M+R;b.vy=Math.abs(b.vy)*.82}
    if(b.y>H-M-R){b.y=H-M-R;b.vy=-Math.abs(b.vy)*.82}
  }
  for(let i=0;i<balls.length;i++){
    const a=balls[i];if(a.out)continue;
    for(let j=i+1;j<balls.length;j++){
      const c=balls[j];if(c.out)continue;
      const dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy);
      if(d<2*R&&d>0){
        if(first===null&&i===0)first=c.n;
        const nx=dx/d,ny=dy/d,o=(2*R-d)/2;
        a.x-=nx*o;a.y-=ny*o;c.x+=nx*o;c.y+=ny*o;
        const dv=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;
        if(dv>0){a.vx-=dv*nx;a.vy-=dv*ny;c.vx+=dv*nx;c.vy+=dv*ny}
      }
    }
  }
  for(const b of balls){
    if(b.out)continue;
    for(const p of POCK)if(Math.hypot(b.x-p[0],b.y-p[1])<PR){b.out=true;b.vx=b.vy=0;potted.push(b.n);break}
  }
}
function endShot(){
  const cue=balls[0],pl=potted.filter(n=>n>0),scratch=cue.out,mine=G[turn];
  const left=mine?cnt(mine)+pl.filter(n=>grp(n)===mine).length:15;
  let foul=scratch||first===null;
  if(!foul&&mine){if(first===8){if(left>0)foul=true}else if(grp(first)!==mine)foul=true}
  const a=who(turn),b=who(1-turn);
  if(pl.includes(8)){
    over=true;const win=!foul&&mine&&left===0;
    msg='انتهت المباراة. الفائز: '+(win?a:b)+(win?'':' (الكرة 8 دخلت بشكل غير صحيح)');
  }else{
    const open=pl.filter(n=>n!==8);
    if(!mine&&!foul&&open.length){G[turn]=grp(open[0]);G[1-turn]=G[turn]==='s'?'t':'s'}
    const keep=!foul&&G[turn]&&pl.some(n=>grp(n)===G[turn]);
    if(foul){
      if(scratch){cue.out=false;cue.x=230;cue.y=H/2}
      turn=1-turn;inHand=true;msg='خطأ من '+a+'. '+b+' يضع الكرة البيضاء بالنقر على الطاولة.';
    }else if(keep)msg=a+' أدخل كرة ويكمل دوره.';
    else{turn=1-turn;msg='لم تدخل كرة. الدور لـ'+b+'.'}
  }
  send({t:'settle',seed,balls:snap(),turn,G,inHand,over,msg});ui();
}
function frame(){
  if(shooting){
    for(let k=0;k<N;k++)sub();
    let mv=false;
    for(const b of balls){
      if(b.out)continue;
      b.vx*=.987;b.vy*=.987;
      if(Math.hypot(b.vx,b.vy)<.06)b.vx=b.vy=0;else mv=true;
    }
    if(!mv){shooting=false;if(remote)remote=false;else endShot();ui()}
  }
  draw();requestAnimationFrame(frame);
}
function fire(pw){
  if(!canShoot())return;
  const c=balls[0],v=pw*28;
  c.vx=Math.cos(ang)*v;c.vy=Math.sin(ang)*v;
  send({t:'shot',balls:snap(),vx:c.vx,vy:c.vy});
  potted=[];first=null;inHand=false;shooting=true;remote=false;ui();
}
function ray(){
  const c=balls[0],dx=Math.cos(ang),dy=Math.sin(ang);let x=c.x,y=c.y,hit=false;
  for(let i=0;i<340&&!hit;i++){
    x+=dx*3;y+=dy*3;
    if(x<M+R||x>W-M-R||y<M+R||y>H-M-R){x-=dx*3;y-=dy*3;break}
    for(let k=1;k<balls.length;k++){const b=balls[k];if(!b.out&&Math.hypot(b.x-x,b.y-y)<2*R){hit=b;break}}
  }
  return{x,y,hit};
}
function drawBall(b){
  const n=b.n,col=C[n>8?n-8:n];
  ctx.save();ctx.translate(b.x,b.y);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(2,4,R,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fillStyle=n===0||n>8?'#f4efe4':col;ctx.fill();
  if(n>8){ctx.save();ctx.clip();ctx.fillStyle=col;ctx.fillRect(-R,-R*.58,2*R,R*1.16);ctx.restore()}
  if(n>0){ctx.fillStyle='#f4efe4';ctx.beginPath();ctx.arc(0,0,R*.46,0,7);ctx.fill();ctx.fillStyle='#111';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,0,.5)}
  const g=ctx.createRadialGradient(-4,-5,1,0,0,R);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.35,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.28)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
  ctx.restore();
}
function diamond(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s*.7,y);ctx.lineTo(x,y+s);ctx.lineTo(x-s*.7,y);ctx.closePath();ctx.fill()}
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0c0c0d';ctx.beginPath();ctx.roundRect(0,0,W,H,26);ctx.fill();
  ctx.strokeStyle='#2c2c2f';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(5,5,W-10,H-10,22);ctx.stroke();
  for(let i=1;i<8;i++){if(i===4)continue;for(const y of [M/2,H-M/2]){ctx.fillStyle='#8c9097';ctx.beginPath();ctx.arc(W/8*i,y,3,0,7);ctx.fill()}}
  for(let i=1;i<4;i++)for(const x of [M/2,W-M/2]){ctx.fillStyle='#8c9097';ctx.beginPath();ctx.arc(x,H/4*i,3,0,7);ctx.fill()}
  for(const x of [W*.27,W*.73])for(const y of [M/2,H-M/2])diamond(x,y,6,'#b3171b');
  for(const y of [H*.33,H*.67])for(const x of [M/2,W-M/2])diamond(x,y,6,'#b3171b');
  const f=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,W*.55);f.addColorStop(0,'#d81414');f.addColorStop(1,'#5a0000');
  ctx.fillStyle=f;ctx.fillRect(M,M,W-2*M,H-2*M);
  ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(280,M);ctx.lineTo(280,H-M);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(600,H/2,3,0,7);ctx.fill();
  for(const p of POCK){ctx.fillStyle='#050505';ctx.beginPath();ctx.arc(p[0],p[1],PR,0,7);ctx.fill();ctx.strokeStyle='#6b6f76';ctx.lineWidth=4;ctx.stroke()}
  for(const b of balls)if(!b.out)drawBall(b);
  if(canShoot()){
    const c=balls[0];
    if(inHand){ctx.fillStyle='rgba(255,255,255,.92)';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('انقر على الطاولة لوضع الكرة البيضاء',W/2,H-M-12);return}
    const r=ray(),ux=Math.cos(ang),uy=Math.sin(ang);
    ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(r.x,r.y);ctx.stroke();
    ctx.beginPath();ctx.arc(r.x,r.y,R,0,7);ctx.stroke();
    if(r.hit){const dx=r.hit.x-r.x,dy=r.hit.y-r.y,d=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(r.hit.x,r.hit.y);ctx.lineTo(r.hit.x+dx/d*70,r.hit.y+dy/d*70);ctx.stroke()}
    const s=R+5+pwr*90;
    ctx.strokeStyle='#c98d3a';ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(c.x-ux*s,c.y-uy*s);ctx.lineTo(c.x-ux*(s+260),c.y-uy*(s+260));ctx.stroke();
    ctx.strokeStyle='#f3d79a';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(c.x-ux*(s+3),c.y-uy*(s+3));ctx.lineTo(c.x-ux*(s+260),c.y-uy*(s+260));ctx.stroke();
  }
}
/* ---------- التحكم ---------- */
const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
let dragging=false;
function setAng(e){const p=pt(e),c=balls[0];ang=Math.atan2(p.y-c.y,p.x-c.x)}
cv.addEventListener('pointerdown',e=>{
  if(!canShoot())return;
  const p=pt(e);
  if(inHand){
    const x=Math.min(W-M-R,Math.max(M+R,p.x)),y=Math.min(H-M-R,Math.max(M+R,p.y));
    if(!balls.some(b=>b.n&&!b.out&&Math.hypot(b.x-x,b.y-y)<2*R)){balls[0].x=x;balls[0].y=y;inHand=false;send({t:'place',x,y});msg='صوّب واسحب شريط القوة.';ui()}
    return;
  }
  dragging=true;cv.setPointerCapture(e.pointerId);setAng(e);
});
cv.addEventListener('pointermove',e=>{if(dragging)setAng(e)});
cv.addEventListener('pointerup',()=>{dragging=false});
const pb=$('pbar');
function showPw(){$('cue').style.top=(pwr*22)+'%';$('fill').style.height=(pwr*100)+'%'}
function movePw(e){if(!canShoot()||inHand)return;const r=pb.getBoundingClientRect();pwr=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));showPw()}
pb.addEventListener('pointerdown',e=>{pb.setPointerCapture(e.pointerId);movePw(e)});
pb.addEventListener('pointermove',e=>{if(e.buttons)movePw(e)});
pb.addEventListener('pointerup',()=>{const p=pwr;pwr=0;showPw();if(p>.05)fire(p)});
let nt;
function nudge(d){clearInterval(nt);ang+=d*.004;nt=setInterval(()=>{ang+=d*.004},30)}
$('l').addEventListener('pointerdown',()=>nudge(-1));$('r').addEventListener('pointerdown',()=>nudge(1));
addEventListener('pointerup',()=>clearInterval(nt));
$('rs').addEventListener('click',()=>{const s=String(Date.now());reset(s);send({t:'reset',seed:s});send({t:'settle',seed,balls:snap(),turn,G,inHand,over,msg});ui()});

/* ---------- الشبكة (استطلاع كل 0.7 ثانية) ---------- */
async function api(path,b){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return r.json()}
function send(m){if(SESS)sync(m).catch(()=>{})}
function load(m){if(m.seed!==seed)setup(m.seed);apply(m.balls);turn=m.turn;G=m.G;inHand=m.inHand;over=m.over;msg=m.msg}
function handle(m){
  if(m.t==='shot'){apply(m.balls);const c=balls[0];c.vx=m.vx;c.vy=m.vy;potted=[];first=null;inHand=false;shooting=true;remote=true}
  else if(m.t==='place'){balls[0].x=m.x;balls[0].y=m.y;inHand=false}
  else if(m.t==='reset'){reset(m.seed)}
  else if(m.t==='settle'){load(m);shooting=false;remote=false}
}
async function sync(m){
  const r=await api('/sync',{room:INST,s:SESS,since:SINCE,msg:m||null});
  if(r.error)return;
  me=r.seat;players=r.players;
  if(!loaded){loaded=true;if(r.last)load(r.last)}
  for(const e of r.ev)if(e.i>SINCE){SINCE=e.i;handle(e.m)}
  SINCE=Math.max(SINCE,r.n);ui();
}
async function loop(){try{await sync()}catch(e){}setTimeout(loop,700)}
async function boot(){
  if(LOCAL){reset('local');ui();return}
  reset(INST);msg='جارٍ الاتصال بديسكورد...';ui();
  try{
    parent.postMessage([0,{v:1,encoding:'json',client_id:CID,frame_id:FR}],'*');
    await Promise.race([ready,new Promise((_,j)=>setTimeout(()=>j('timeout'),10000))]);
    const a=await rpc('AUTHORIZE',{client_id:CID,response_type:'code',state:'',prompt:'none',scope:['identify']});
    const t=await api('/token',{code:a.code});
    if(!t.session)throw 'token';
    SESS=t.session;loop();
  }catch(e){msg='تعذر تسجيل الدخول عبر ديسكورد ('+(e&&e.message||e)+').';ui()}
}
boot();frame();
</script></body></html>`;
