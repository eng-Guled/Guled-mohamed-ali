const $=document.getElementById('app');
let token=localStorage.getItem('sg_token'),me=localStorage.getItem('sg_user');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
  const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});
  const d=await r.json();if(r.status===401&&token&&path!=='/login'){logout();}
  if(!r.ok)throw new Error(d.error||'Something went wrong');return d;
}
function logout(){localStorage.clear();token=me=null;location.hash='';render()}
function auth(mode){
  const reg=mode==='register';
  $.innerHTML=`<div class="auth"><h1 class="logo">Sirmaalgram</h1><p class="tag">Share your moments with friends.</p>
  <form class="box" id="f">${reg?'<input name="name" placeholder="Full name" required>':''}
  <input name="username" placeholder="Username" required autocomplete="username"><input name="password" type="password" placeholder="Password" required autocomplete="${reg?'new-password':'current-password'}">
  <p class="err" id="e"></p><button class="btn">${reg?'Create account':'Log in'}</button></form>
  <p style="margin-top:16px">${reg?'Have an account?':'New here?'} <a id="sw">${reg?'Log in':'Create an account'}</a></p>
  ${reg?'':'<p style="margin-top:10px;opacity:.6;font-size:.9rem">Demo account: guuled / 123456</p>'}</div>`;
  document.getElementById('sw').onclick=()=>auth(reg?'login':'register');
  document.getElementById('f').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    try{const d=await api(reg?'/register':'/login',f);token=d.token;me=d.username;localStorage.setItem('sg_token',token);localStorage.setItem('sg_user',me);location.hash='#/';render()}
    catch(x){document.getElementById('e').textContent=x.message}};
}
const shell=h=>$.innerHTML=`<div class="top"><span class="logo" onclick="location.hash='#/'">Sirmaalgram</span><nav><button onclick="location.hash='#/'">Home</button><button onclick="location.hash='#/stories'">Stories</button><button onclick="location.hash='#/reels'">Reels</button><button onclick="location.hash='#/new'">New post</button><button onclick="location.hash='#/u/${me}'">Profile</button><button onclick="logout()">Log out</button></nav></div><main>${h}</main>`;
const postHTML=p=>`<article class="card" id="p${p.id}"><header onclick="location.hash='#/u/${p.username}'"><span class="avatar">${esc(p.username[0].toUpperCase())}</span>${esc(p.username)}</header>
<img src="${p.image}" alt="Photo by ${esc(p.username)}" loading="lazy" ondblclick="like('${p.id}')">
<div class="bar"><button class="${p.liked?'liked':''}" aria-label="Like" onclick="like('${p.id}')">${p.liked?'♥':'♡'}</button></div>
<p><b>${p.likes} like${p.likes==1?'':'s'}</b></p><p><b>${esc(p.username)}</b> ${esc(p.caption)}</p>
${p.comments.map(c=>`<p class="cm"><b>${esc(c.username)}</b> ${esc(c.text)}</p>`).join('')}
<form class="add" onsubmit="comment(event,'${p.id}')"><input placeholder="Add a comment" maxlength="200"><button>Post</button></form></article>`;
const swap=p=>{const el=document.getElementById('p'+p.id);if(el)el.outerHTML=postHTML(p)};
async function like(i){try{swap(await api(`/posts/${i}/like`,{}))}catch(e){alert(e.message)}}
async function comment(e,i){e.preventDefault();const t=e.target[0].value;if(!t.trim())return;try{swap(await api(`/posts/${i}/comments`,{text:t}))}catch(x){alert(x.message)}}
async function feed(){shell('<p class="empty">Loading…</p>');const ps=await api('/feed');shell(ps.length?ps.map(postHTML).join(''):'<p class="empty">No posts yet. Share the first photo.</p>')}
async function profile(u){
  try{const d=await api('/users/'+u);
  shell(`<div class="prof"><span class="avatar">${esc(d.username[0].toUpperCase())}</span><div><h2>${esc(d.name)}</h2><p>@${esc(d.username)}</p>
  <div class="stats"><span><b>${d.posts.length}</b> posts</span><span><b>${d.followers}</b> followers</span><span><b>${d.following}</b> following</span></div>
  <p>${esc(d.bio)}</p>${d.me?'':`<button class="btn ${d.isFollowing?'alt':''}" onclick="follow('${d.username}')">${d.isFollowing?'Following':'Follow'}</button>`}</div></div>
  ${d.posts.length?`<div class="grid">${d.posts.map(p=>`<img src="${p.image}" alt="${esc(p.caption)}" onclick="location.hash='#/p/${p.id}'">`).join('')}</div>`:'<p class="empty">No posts yet.</p>'}`);
  }catch(e){shell(`<p class="empty">${esc(e.message)}</p>`)}
}
async function postDetail(i){
  try{const p=(await api('/feed')).find(x=>x.id===i);if(!p)return shell('<p class="empty">Post not found.</p>');
    shell(`<button class="back" onclick="location.hash='#/u/${p.username}'">Back to @${esc(p.username)}</button>${postHTML(p)}`)
  }catch(e){shell(`<p class="empty">${esc(e.message)}</p>`)}
}
async function stories(){
  shell('<p class="empty">Loading stories…</p>');
  try{
    const statuses=await api('/statuses'),groups=[];
    statuses.forEach(s=>{let group=groups.find(x=>x.username===s.username);if(!group){group={username:s.username,name:s.name,items:[]};groups.push(group)}group.items.push(s)});
    shell(`<section class="stories-head"><h2>Stories</h2><button class="btn" onclick="location.hash='#/new-story'">Add story</button></section>
      ${groups.length?`<div class="story-list">${groups.map(g=>`<button class="story-item" onclick="location.hash='#/stories/${g.username}'"><span class="story-ring"><img src="${g.items[g.items.length-1].image}" alt=""></span><span>${esc(g.username===me?'Your story':g.username)}</span></button>`).join('')}</div>`:'<p class="empty">No stories yet. Add one to share a moment.</p>'}`)
  }catch(e){shell(`<p class="empty">${esc(e.message)}</p>`)}
}
async function storyViewer(u,index=0){
  try{
    const items=(await api('/statuses')).filter(s=>s.username===u);
    if(!items.length){location.hash='#/stories';return}
    index=Math.max(0,Math.min(index,items.length-1));const item=items[index];
    shell(`<div class="story-viewer"><header class="story-toolbar"><b>@${esc(item.username)}</b><span>${index+1} / ${items.length}</span><button class="btn alt" onclick="location.hash='#/stories'">Close</button></header>
      <div class="story-stage"><img src="${item.image}" alt="Story by ${esc(item.username)}">${item.caption?`<p>${esc(item.caption)}</p>`:''}</div>
      <div class="story-controls"><button class="btn alt" ${index===0?'disabled':''} onclick="location.hash='#/stories/${u}/${index-1}'">Previous</button><button class="btn alt" ${index===items.length-1?'disabled':''} onclick="location.hash='#/stories/${u}/${index+1}'">Next</button></div></div>`)
  }catch(e){shell(`<p class="empty">${esc(e.message)}</p>`)}
}
function imageData(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read this photo'));
    reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error('Could not load this photo'));image.onload=()=>{
      const scale=Math.min(1,1080/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=image.width*scale;canvas.height=image.height*scale;
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.85))
    };image.src=reader.result};reader.readAsDataURL(file)
  })
}
function newStory(){
  shell(`<form class="box" id="story-form"><h2>New story</h2><input type="file" id="story-file" accept="image/*" required><img id="preview" hidden alt="Preview">
    <input id="story-caption" maxlength="200" placeholder="Add a caption"><p class="err" id="e"></p><button class="btn">Share story</button></form>`);
  let image='';const file=document.getElementById('story-file');
  file.onchange=async()=>{if(!file.files[0])return;try{image=await imageData(file.files[0]);const preview=document.getElementById('preview');preview.src=image;preview.hidden=false}catch(e){document.getElementById('e').textContent=e.message}};
  document.getElementById('story-form').onsubmit=async e=>{e.preventDefault();try{await api('/statuses',{image,caption:document.getElementById('story-caption').value});location.hash='#/stories'}catch(x){document.getElementById('e').textContent=x.message}};
}
async function reels(){
  shell('<p class="empty">Loading reels…</p>');
  try{
    const items=await api('/reels');
    shell(`<section class="stories-head"><h2>Reels</h2><button class="btn" onclick="location.hash='#/new-reel'">Create reel</button></section>
      ${items.length?`<div class="reel-list">${items.map(r=>`<article class="reel"><video src="${r.video}" controls playsinline preload="metadata"></video><div class="reel-caption"><b onclick="location.hash='#/u/${r.username}'">${esc(r.username)}</b>${r.caption?`<p>${esc(r.caption)}</p>`:''}</div></article>`).join('')}</div>`:'<p class="empty">No reels yet. Share a short video.</p>'}`)
  }catch(e){shell(`<p class="empty">${esc(e.message)}</p>`)}
}
function newReel(){
  shell(`<form class="box" id="reel-form"><h2>New reel</h2><input type="file" id="reel-file" accept="video/mp4,video/webm" required><video id="video-preview" controls playsinline hidden></video>
    <textarea id="reel-caption" rows="3" maxlength="300" placeholder="Write a caption"></textarea><p class="err" id="e"></p><button class="btn">Share reel</button></form>`);
  const file=document.getElementById('reel-file');let previewUrl='';
  file.onchange=()=>{const f=file.files[0],error=document.getElementById('e');if(!f)return;if(f.size>25*1024*1024){error.textContent='Videos must be 25 MB or smaller';file.value='';return}
    error.textContent='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(f);const preview=document.getElementById('video-preview');preview.src=previewUrl;preview.hidden=false};
  document.getElementById('reel-form').onsubmit=async e=>{e.preventDefault();const f=file.files[0],error=document.getElementById('e');if(!f||f.size>25*1024*1024)return;
    try{const video=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this video'));reader.readAsDataURL(f)});
      await api('/reels',{video,caption:document.getElementById('reel-caption').value});location.hash='#/reels'
    }catch(x){error.textContent=x.message}
  };
}
async function follow(u){await api(`/users/${u}/follow`,{});profile(u)}
function newPost(){
  shell(`<form class="box" id="np"><h2>New post</h2><input type="file" id="file" accept="image/*" required><img id="preview" hidden alt="Preview">
  <textarea id="cap" rows="3" maxlength="300" placeholder="Write a caption"></textarea><p class="err" id="e"></p><button class="btn">Share</button></form>`);
  let data='';const file=document.getElementById('file');
  file.onchange=()=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1080/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);data=c.toDataURL('image/jpeg',.85);const pv=document.getElementById('preview');pv.src=data;pv.hidden=false};im.src=r.result};r.readAsDataURL(file.files[0])};
  document.getElementById('np').onsubmit=async e=>{e.preventDefault();try{await api('/posts',{image:data,caption:document.getElementById('cap').value});location.hash='#/'}catch(x){document.getElementById('e').textContent=x.message}};
}
function render(){
  if(!token)return auth('login');
  const parts=location.hash.split('/');
  if(location.hash==='#/stories')stories();else if(parts[1]==='stories')storyViewer(parts[2],Number(parts[3]||0));
  else if(location.hash==='#/reels')reels();else if(location.hash==='#/new-story')newStory();else if(location.hash==='#/new-reel')newReel();
  else if(parts[1]==='new')newPost();else if(parts[1]==='u')profile(parts[2]);else if(parts[1]==='p')postDetail(parts[2]);else feed();
}
window.addEventListener('hashchange',render);render();
