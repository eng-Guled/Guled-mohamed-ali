// Sirmaalgram server. No packages to install: only Node.js 18+ is needed.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DB=path.join(__dirname,'data','db.json'),UP=path.join(__dirname,'uploads'),PUB=path.join(__dirname,'public');
fs.mkdirSync(path.dirname(DB),{recursive:true});fs.mkdirSync(UP,{recursive:true});
const hash=(p,s=crypto.randomBytes(8).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const check=(p,h)=>hash(p,h.split(':')[0])===h;
const id=()=>crypto.randomBytes(6).toString('hex');
let db;
function seed(){
  const U=[['guuled','Guuled','Food lover. Jigjiga, Ethiopia'],['hodan','Hodan Ali','Travel and tea'],['abdi','Abdi Warsame','Football and photography'],['sagal','Sagal Yusuf','Design, art, coffee']];
  db={users:U.map(([u,n,b])=>({id:id(),username:u,name:n,bio:b,pass:hash('123456')})),posts:[],follows:[],sessions:{}};
  const P=[['🍛','#F2A71B','#C8402B','Bariis iskukaris for lunch'],['🌅','#FF8A00','#6A1B9A','Sunset over the city'],['⚽','#2E7D4F','#0F3B3A','Saturday match day'],['🎨','#5B6CFF','#E1306C','New colors, new ideas'],['☕','#8D5A3B','#2B1B12','Shaah and good company'],['🏔️','#3A7BD5','#00D2FF','Weekend in the mountains']];
  P.forEach(([e,a,b,c],i)=>{
    const f=`seed${i}.svg`;
    fs.writeFileSync(path.join(UP,f),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><text x="300" y="360" font-size="220" text-anchor="middle">${e}</text></svg>`);
    const u=db.users[i%4];
    db.posts.push({id:id(),userId:u.id,image:'/uploads/'+f,caption:c,likes:db.users.filter((_,j)=>j!==i%4&&(i+j)%2==0).map(x=>x.id),comments:[{userId:db.users[(i+1)%4].id,text:'Mashallah, beautiful!',at:Date.now()}],at:Date.now()-i*36e5});
  });
  db.follows.push({from:db.users[0].id,to:db.users[1].id},{from:db.users[1].id,to:db.users[0].id});
  save();
}
const save=()=>fs.writeFileSync(DB,JSON.stringify(db,null,1));
db=fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):(seed(),db);
db.statuses ||= [];db.reels ||= [];
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const readBody=(req,limit=9e6)=>new Promise((ok,no)=>{let size=0,large=false,chunks=[];req.on('data',d=>{size+=d.length;if(size>limit){large=true;chunks=[]}else if(!large)chunks.push(d)});req.on('end',()=>{if(large){const e=new Error('Upload is too large');e.status=413;return no(e)}try{ok(JSON.parse(Buffer.concat(chunks).toString()||'{}'))}catch{ok({})}})});
const uname=uid=>db.users.find(u=>u.id===uid);
const view=(p,me)=>{const u=uname(p.userId);return{id:p.id,username:u.username,name:u.name,image:p.image,caption:p.caption,likes:p.likes.length,liked:p.likes.includes(me),at:p.at,comments:p.comments.map(c=>({username:uname(c.userId).username,text:c.text}))}};
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm'};
function serve(res,dir,rel){const f=path.join(dir,path.normalize(rel).replace(/^(\.\.[\/\\])+/,''));if(!f.startsWith(dir)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return send(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}

http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://x'),p=url.pathname;
  if(!p.startsWith('/api/')){return p.startsWith('/uploads/')?serve(res,UP,p.slice(9)):serve(res,PUB,p==='/'?'index.html':p.slice(1))}
  const tok=(req.headers.authorization||'').replace('Bearer ',''),me=db.sessions[tok];
  try{
    const b=req.method==='POST'?await readBody(req,p==='/api/reels'?36e6:9e6):{};
    let m;
    if(p==='/api/register'){
      const u=String(b.username||'').toLowerCase();
      if(!/^[a-z0-9_]{3,20}$/.test(u))return send(res,400,{error:'Username: 3 to 20 letters, numbers or _'});
      if((b.password||'').length<6)return send(res,400,{error:'Password must have at least 6 characters'});
      if(db.users.some(x=>x.username===u))return send(res,400,{error:'That username is taken'});
      const user={id:id(),username:u,name:String(b.name||u).slice(0,40),bio:'',pass:hash(b.password)};db.users.push(user);
      const t=crypto.randomBytes(24).toString('hex');db.sessions[t]=user.id;save();return send(res,200,{token:t,username:u});
    }
    if(p==='/api/login'){
      const user=db.users.find(x=>x.username===String(b.username||'').toLowerCase());
      if(!user||!check(String(b.password||''),user.pass))return send(res,401,{error:'Wrong username or password'});
      const t=crypto.randomBytes(24).toString('hex');db.sessions[t]=user.id;save();return send(res,200,{token:t,username:user.username});
    }
    if(!me)return send(res,401,{error:'Please log in'});
    if(p==='/api/statuses'&&req.method==='GET'){
      const since=Date.now()-24*60*60*1000;
      return send(res,200,db.statuses.filter(x=>x.at>=since).sort((a,c)=>a.at-c.at).map(x=>({id:x.id,username:uname(x.userId).username,name:uname(x.userId).name,image:x.image,caption:x.caption,at:x.at})));
    }
    if(p==='/api/statuses'&&req.method==='POST'){
      const mt=/^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(b.image||'');
      if(!mt)return send(res,400,{error:'Please choose a photo (PNG, JPG, WEBP or GIF)'});
      const f=id()+'.'+(mt[1]==='jpeg'?'jpg':mt[1]),status={id:id(),userId:me,image:'/uploads/'+f,caption:String(b.caption||'').slice(0,200),at:Date.now()};
      fs.writeFileSync(path.join(UP,f),Buffer.from(mt[2],'base64'));db.statuses.push(status);save();return send(res,200,{...status,username:uname(me).username});
    }
    if(p==='/api/reels'&&req.method==='GET')return send(res,200,db.reels.slice().sort((a,c)=>c.at-a.at).map(x=>({id:x.id,username:uname(x.userId).username,name:uname(x.userId).name,video:x.video,caption:x.caption,at:x.at})));
    if(p==='/api/reels'&&req.method==='POST'){
      const mt=/^data:video\/(mp4|webm);base64,(.+)$/.exec(b.video||'');
      if(!mt)return send(res,400,{error:'Choose an MP4 or WebM video'});
      const bytes=Buffer.from(mt[2],'base64');if(!bytes.length||bytes.length>25*1024*1024)return send(res,400,{error:'Videos must be 25 MB or smaller'});
      const f=id()+'.'+mt[1],reel={id:id(),userId:me,video:'/uploads/'+f,caption:String(b.caption||'').slice(0,300),at:Date.now()};
      fs.writeFileSync(path.join(UP,f),bytes);db.reels.push(reel);save();return send(res,200,{...reel,username:uname(me).username});
    }
    if(p==='/api/feed')return send(res,200,db.posts.slice().sort((a,c)=>c.at-a.at).map(x=>view(x,me)));
    if(p==='/api/posts'&&req.method==='POST'){
      const mt=/^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(b.image||'');
      if(!mt)return send(res,400,{error:'Please choose a photo (PNG, JPG, WEBP or GIF)'});
      const f=id()+'.'+(mt[1]==='jpeg'?'jpg':mt[1]);fs.writeFileSync(path.join(UP,f),Buffer.from(mt[2],'base64'));
      const post={id:id(),userId:me,image:'/uploads/'+f,caption:String(b.caption||'').slice(0,300),likes:[],comments:[],at:Date.now()};
      db.posts.push(post);save();return send(res,200,view(post,me));
    }
    if(m=/^\/api\/posts\/(\w+)\/like$/.exec(p)){
      const x=db.posts.find(q=>q.id===m[1]);if(!x)return send(res,404,{error:'Not found'});
      x.likes=x.likes.includes(me)?x.likes.filter(i=>i!==me):[...x.likes,me];save();return send(res,200,view(x,me));
    }
    if(m=/^\/api\/posts\/(\w+)\/comments$/.exec(p)){
      const x=db.posts.find(q=>q.id===m[1]),t=String(b.text||'').trim().slice(0,200);
      if(!x||!t)return send(res,400,{error:'Write a comment first'});
      x.comments.push({userId:me,text:t,at:Date.now()});save();return send(res,200,view(x,me));
    }
    if(m=/^\/api\/posts\/(\w+)\/delete$/.exec(p)){
      const x=db.posts.find(q=>q.id===m[1]);if(!x||x.userId!==me)return send(res,403,{error:'Not allowed'});
      db.posts=db.posts.filter(q=>q!==x);save();return send(res,200,{ok:true});
    }
    if(m=/^\/api\/users\/(\w+)$/.exec(p)){
      const u=db.users.find(x=>x.username===m[1]);if(!u)return send(res,404,{error:'User not found'});
      return send(res,200,{username:u.username,name:u.name,bio:u.bio,me:u.id===me,
        followers:db.follows.filter(f=>f.to===u.id).length,following:db.follows.filter(f=>f.from===u.id).length,
        isFollowing:db.follows.some(f=>f.from===me&&f.to===u.id),posts:db.posts.filter(x=>x.userId===u.id).sort((a,c)=>c.at-a.at).map(x=>view(x,me))});
    }
    if(m=/^\/api\/users\/(\w+)\/follow$/.exec(p)){
      const u=db.users.find(x=>x.username===m[1]);if(!u||u.id===me)return send(res,400,{error:'Cannot follow'});
      const i=db.follows.findIndex(f=>f.from===me&&f.to===u.id);i>=0?db.follows.splice(i,1):db.follows.push({from:me,to:u.id});save();return send(res,200,{ok:true});
    }
    send(res,404,{error:'Not found'});
  }catch(e){send(res,e.status||500,{error:e.status?e.message:'Server error'})}
}).listen(PORT,()=>console.log(`Sirmaalgram is running: http://localhost:${PORT}`));
