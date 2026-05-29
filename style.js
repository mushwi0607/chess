// ════════════════════════════════════════
// CONSTANTS & DATA
// ════════════════════════════════════════

(function () {
    const container = document.getElementById('petals-container');
    if (!container) return;

    function createPetal() {
        const petal = document.createElement('div');
        petal.className = 'petal';

        const size = Math.random() * 6 + 6;
        const duration = Math.random() * 3 + 4;

        petal.style.left = Math.random() * 100 + '%';
        petal.style.width = petal.style.height = size + 'px';
        petal.style.animationDuration = duration + 's';
        petal.style.opacity = Math.random() * 0.4 + 0.4;

        container.appendChild(petal);

        setTimeout(() => petal.remove(), (duration + 1) * 1000);
    }

    setInterval(createPetal, 220);

    for (let i = 0; i < 12; i++) {
        setTimeout(createPetal, i * 120);
    }
})();


const MASCOTS=[
  {id:'melody',name:'My Melody',url:'giphy (6).gif',emoji:''},
  {id:'cinna',name:'Cinnamoroll',url:'giphy (2).gif',emoji:''},
  {id:'kitty',name:'Hello Kitty',url:'hellokitty.gif',emoji:''},
  {id:'kuromi',name:'Kuromi',url:'heart wow GIF.gif',emoji:''},
  {id:'pompom',name:'Pompompurin',url:'Cute GIF by jamfactory.gif',emoji:''},
];

const LS_USERS='kc_users2',LS_CUR='kc_cur2',LS_MATCHES='kc_matches2',LS_ROOMS='kc_rooms2',LS_CHATS='kc_chats2',LS_ONLINE='kc_online2';

// ════════════════════════════════════════
// CLOUD STORAGE — Firebase Realtime DB (dữ liệu vĩnh viễn, đồng bộ mọi thiết bị)
// ════════════════════════════════════════
// 👉 Thay URL này bằng Firebase project của bạn (miễn phí tại firebase.google.com)
const FIREBASE_URL='https://yn-chess-default-rtdb.firebaseio.com';

let _cloudUsers=null; // cache trong bộ nhớ
let _saveUsersTimer=null;
let _saveMatchesTimer=null;

function showSyncStatus(msg){
  let el=document.getElementById('sync-status');
  if(!el){
    el=document.createElement('div');el.id='sync-status';
    el.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;padding:7px 20px;border-radius:20px;font-size:12px;font-weight:700;z-index:9999;pointer-events:none;transition:opacity .4s;box-shadow:0 4px 15px rgba(233,30,140,.4)';
    document.body.appendChild(el);
  }
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(el._to);
  if(msg.includes('✅')||msg.includes('💾'))el._to=setTimeout(()=>{el.style.opacity='0';},2000);
}

// Đọc toàn bộ users từ Firebase
async function cloudReadUsers(){
  try{
    const r=await fetch(`${FIREBASE_URL}/users.json`);
    if(!r.ok)return null;
    return await r.json()||{};
  }catch{return null;}
}

// Ghi toàn bộ users lên Firebase (debounce)
async function cloudWriteUsers(users){
  try{
    await fetch(`${FIREBASE_URL}/users.json`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(users)
    });
    return true;
  }catch{return false;}
}

// Đọc matches
async function cloudReadMatches(){
  try{
    const r=await fetch(`${FIREBASE_URL}/matches.json`);
    if(!r.ok)return null;
    return await r.json()||[];
  }catch{return null;}
}

// Ghi matches
async function cloudWriteMatches(matches){
  try{
    await fetch(`${FIREBASE_URL}/matches.json`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(matches)
    });
  }catch{}
}

// Ghi log tài khoản mới — chỉ dùng nội bộ, người dùng không thấy
async function cloudLogNewAccount(userObj){
  try{
    // Lưu vào node /account_log/{tên} — admin đọc tại trang admin.html
    await fetch(`${FIREBASE_URL}/account_log/${encodeURIComponent(userObj.name)}.json`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:userObj.name,
        phone:userObj.phone,
        elo:userObj.elo,
        mascId:userObj.mascId,
        regDate:userObj.regDate
      })
    });
  }catch{}
}

// Khởi tạo: tải users từ cloud, merge với local
async function initCloud(){
  showSyncStatus('🔄 Đang tải dữ liệu...');
  const cloudData=await cloudReadUsers();
  if(cloudData){
    // Merge: cloud là chủ đạo, local bổ sung nếu cloud chưa có
    const local=getLocalUsers();
    const merged={...local,...cloudData};
    localStorage.setItem(LS_USERS,JSON.stringify(merged));
    _cloudUsers=merged;
    showSyncStatus('✅ Đồng bộ xong!');
  } else {
    // Không kết nối được cloud → dùng local, đẩy lên cloud
    _cloudUsers=getLocalUsers();
    if(Object.keys(_cloudUsers).length>0)cloudWriteUsers(_cloudUsers);
    showSyncStatus('⚠️ Dùng dữ liệu local (không có mạng)');
  }
  // Tải matches
  const cloudMatches=await cloudReadMatches();
  if(cloudMatches&&Array.isArray(cloudMatches)){
    localStorage.setItem(LS_MATCHES,JSON.stringify(cloudMatches));
  }
  refreshRankings();refreshProfile();refreshFriends();updateAuthUI();
}

// ── Các hàm get/save dùng trong toàn bộ code ──
function getLocalUsers(){try{return JSON.parse(localStorage.getItem(LS_USERS))||{};}catch{return{};}}
function getLocalMatches(){try{return JSON.parse(localStorage.getItem(LS_MATCHES))||[];}catch{return[];}}

function getUsers(){return _cloudUsers||getLocalUsers();}
function saveUsers(u){
  _cloudUsers=u;
  localStorage.setItem(LS_USERS,JSON.stringify(u));
  clearTimeout(_saveUsersTimer);
  _saveUsersTimer=setTimeout(async()=>{
    showSyncStatus('💾 Đang lưu...');
    const ok=await cloudWriteUsers(u);
    showSyncStatus(ok?'✅ Đã lưu!':'⚠️ Lưu cloud thất bại');
  },1200);
}
function getMatches(){try{return JSON.parse(localStorage.getItem(LS_MATCHES))||[];}catch{return[];}}
function saveMatches(m){
  localStorage.setItem(LS_MATCHES,JSON.stringify(m));
  clearTimeout(_saveMatchesTimer);
  _saveMatchesTimer=setTimeout(()=>cloudWriteMatches(m),2000);
}
function getCurUser(){try{return JSON.parse(localStorage.getItem(LS_CUR))||null;}catch{return null;}}
function saveCurUser(u){localStorage.setItem(LS_CUR,JSON.stringify(u));}
function getRooms(){try{return JSON.parse(localStorage.getItem(LS_ROOMS))||{};}catch{return{};}}
function saveRooms(r){localStorage.setItem(LS_ROOMS,JSON.stringify(r));}
function getChats(){try{return JSON.parse(localStorage.getItem(LS_CHATS))||{};}catch{return{};}}
function saveChats(c){localStorage.setItem(LS_CHATS,JSON.stringify(c));}
function getOnline(){try{return JSON.parse(localStorage.getItem(LS_ONLINE))||{};}catch{return{};}}
function saveOnline(o){localStorage.setItem(LS_ONLINE,JSON.stringify(o));}

let curUser=getCurUser();

// ════════════════════════════════════════
// ONLINE PRESENCE
// ════════════════════════════════════════
function pingOnline(){
  if(!curUser)return;
  const o=getOnline();
  o[curUser.name]=Date.now();
  saveOnline(o);
}
function isOnline(name){
  const o=getOnline();
  return o[name]&&(Date.now()-o[name]<90000); // 90s
}
setInterval(pingOnline,30000);
pingOnline();

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function doLogin(){
  const u=document.getElementById('li-user').value.trim();
  const p=document.getElementById('li-pass').value;
  const err=document.getElementById('li-err');
  const users=getUsers();
  if(!users[u]){err.textContent='Tài khoản không tồn tại!';err.style.display='block';return;}
  if(users[u].pass!==p){err.textContent='Mật khẩu sai!';err.style.display='block';return;}
  err.style.display='none';
  curUser=users[u];saveCurUser(curUser);pingOnline();
  closeMod('login');updateAuthUI();
  toast('Đăng nhập thành công! 🎀');
  refreshProfile();refreshRankings();refreshResults();refreshFriends();
}

function doRegister(){
  const u=document.getElementById('reg-user').value.trim();
  const p=document.getElementById('reg-pass').value;
  const phone=document.getElementById('reg-phone').value.trim();
  const err=document.getElementById('reg-err');

  // Validate tên
  if(!u||u.length<3){err.textContent='Tên ít nhất 3 ký tự!';err.style.display='block';return;}
  // Validate mật khẩu
  if(!p||p.length<4){err.textContent='Mật khẩu ít nhất 4 ký tự!';err.style.display='block';return;}
  // Validate SĐT
  if(!phone){err.textContent='Vui lòng nhập số điện thoại! 📱';err.style.display='block';return;}
  if(!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone)){
    err.textContent='SĐT không hợp lệ! (VD: 0912345678)';err.style.display='block';return;
  }
  const users=getUsers();
  // Kiểm tra tên trùng
  if(users[u]){err.textContent='Tên đã được dùng!';err.style.display='block';return;}
  // Kiểm tra SĐT trùng
  const phoneUsed=Object.values(users).some(acc=>acc.phone===phone);
  if(phoneUsed){err.textContent='Số điện thoại này đã được đăng ký! 📵';err.style.display='block';return;}

  err.style.display='none';
  const sel=document.querySelector('#reg-masc-row .mmasc.sel');
  const mascId=sel?sel.dataset.id:'kitty';
  users[u]={name:u,pass:p,phone,elo:1200,mascId,wins:0,losses:0,draws:0,games:0,rankWins:0,rankLosses:0,rankGames:0,friends:[],friendReqs:[],sentReqs:[],regDate:new Date().toLocaleString('vi-VN')};
  saveUsers(users);
  // Ghi log tài khoản mới lên Firebase (chỉ admin thấy)
  cloudLogNewAccount(users[u]);
  curUser=users[u];saveCurUser(curUser);pingOnline();
  closeMod('register');updateAuthUI();
  toast('Đăng ký thành công! 🌸 Chào '+u+'!');
  refreshProfile();refreshRankings();
}

function logout(){
  curUser=null;localStorage.removeItem(LS_CUR);
  updateAuthUI();refreshProfile();refreshFriends();toast('Đã đăng xuất 👋');
}

function updateAuthUI(){
  const li=document.getElementById('btn-login');
  const rg=document.getElementById('btn-reg');
  const lo=document.getElementById('btn-logout');
  const ne=document.getElementById('nav-elo');
  if(curUser){
    li.style.display='none';rg.style.display='none';lo.style.display='';
    ne.style.display='';ne.textContent='⭐ '+curUser.name+' · '+curUser.elo;
  } else {
    li.style.display='';rg.style.display='';lo.style.display='none';ne.style.display='none';
  }
}

// ════════════════════════════════════════
// ELO & MATCH SAVING
// ════════════════════════════════════════
function updateElo(outcome,isRank){
  if(!curUser||!isRank)return 0;
  const base=Math.floor(Math.random()*16)+5; // 5–20 random
  let change=outcome==='win'?+base:outcome==='loss'?-base:0;
  const users=getUsers();
  if(!users[curUser.name])return 0;
  const u=users[curUser.name];
  u.elo=Math.max(100,(u.elo||1200)+change);
  if(outcome==='win'){u.wins=(u.wins||0)+1;u.rankWins=(u.rankWins||0)+1;}
  else if(outcome==='loss'){u.losses=(u.losses||0)+1;u.rankLosses=(u.rankLosses||0)+1;}
  else u.draws=(u.draws||0)+1;
  u.games=(u.games||0)+1;
  u.rankGames=(u.rankGames||0)+1;
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);updateAuthUI();
  return change;
}

function updateNormalStats(outcome){
  if(!curUser)return;
  const users=getUsers();
  if(!users[curUser.name])return;
  const u=users[curUser.name];
  if(outcome==='win')u.wins=(u.wins||0)+1;
  else if(outcome==='loss')u.losses=(u.losses||0)+1;
  else u.draws=(u.draws||0)+1;
  u.games=(u.games||0)+1;
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);updateAuthUI();
}

function saveMatch(opponent,result,moves,duration,isRank,eloChange,boardSnap){
  const matches=getMatches();
  const entry={
    user:curUser?curUser.name:'Khách',
    opponent,result,moves,duration,isRank:!!isRank,eloChange:eloChange||0,
    date:new Date().toLocaleString('vi-VN'),
    elo:curUser?curUser.elo:1200,
    boardSnap:boardSnap||null,
    id:'m'+Date.now()
  };
  matches.unshift(entry);
  if(matches.length>200)matches.pop();
  saveMatches(matches);
  refreshResults();
}

function getRank(elo){
  if(elo>=2000)return'Grandmaster 👑';
  if(elo>=1700)return'Master 💎';
  if(elo>=1400)return'Expert ⭐';
  if(elo>=1200)return'Intermediate 🌸';
  return'Beginner 🌱';
}

// ════════════════════════════════════════
// FRIENDS SYSTEM
// ════════════════════════════════════════
function sendFriendReq(toName){
  if(!curUser){toast('Hãy đăng nhập trước! 🌸');return;}
  if(toName===curUser.name){toast('Không thể kết bạn với chính mình 😅');return;}
  const users=getUsers();
  const me=users[curUser.name];
  const them=users[toName];
  if(!them){toast('Người dùng không tồn tại!');return;}
  if((me.friends||[]).includes(toName)){toast('Đã là bạn bè rồi! 💕');return;}
  if((me.sentReqs||[]).includes(toName)){toast('Đã gửi lời mời rồi!');return;}
  // Add req
  if(!them.friendReqs)them.friendReqs=[];
  if(!me.sentReqs)me.sentReqs=[];
  if(!them.friendReqs.includes(curUser.name))them.friendReqs.push(curUser.name);
  if(!me.sentReqs.includes(toName))me.sentReqs.push(toName);
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);
  toast('Đã gửi lời mời kết bạn đến '+toName+' 💌');
  refreshFriends();
}

function acceptFriend(fromName){
  if(!curUser)return;
  const users=getUsers();
  const me=users[curUser.name];
  const them=users[fromName];
  if(!me||!them)return;
  if(!me.friends)me.friends=[];
  if(!them.friends)them.friends=[];
  if(!me.friends.includes(fromName))me.friends.push(fromName);
  if(!them.friends.includes(curUser.name))them.friends.push(curUser.name);
  me.friendReqs=(me.friendReqs||[]).filter(n=>n!==fromName);
  if(them.sentReqs)them.sentReqs=them.sentReqs.filter(n=>n!==curUser.name);
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);
  toast('Đã kết bạn với '+fromName+' 🎉');
  refreshFriends();
}

function declineFriend(fromName){
  if(!curUser)return;
  const users=getUsers();
  const me=users[curUser.name];
  if(!me)return;
  me.friendReqs=(me.friendReqs||[]).filter(n=>n!==fromName);
  const them=users[fromName];
  if(them&&them.sentReqs)them.sentReqs=them.sentReqs.filter(n=>n!==curUser.name);
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);
  refreshFriends();
}

function removeFriend(name){
  if(!curUser)return;
  const users=getUsers();
  const me=users[curUser.name];
  const them=users[name];
  if(me&&me.friends)me.friends=me.friends.filter(n=>n!==name);
  if(them&&them.friends)them.friends=them.friends.filter(n=>n!==curUser.name);
  saveUsers(users);
  curUser=users[curUser.name];saveCurUser(curUser);
  toast('Đã xóa bạn bè');
  refreshFriends();
}

function searchUsers(q){
  const res=document.getElementById('friend-search-results');
  if(!q||q.length<2){res.style.display='none';return;}
  const users=getUsers();
  const matches=Object.values(users).filter(u=>u.name.toLowerCase().includes(q.toLowerCase())&&u.name!==(curUser?curUser.name:''));
  if(!matches.length){res.style.display='block';res.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px">Không tìm thấy người dùng</div>';return;}
  res.style.display='block';
  res.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:7px">Kết quả tìm kiếm:</div>'+
    matches.slice(0,5).map(u=>{
      const online=isOnline(u.name);
      const isFriend=curUser&&(curUser.friends||[]).includes(u.name);
      const sent=curUser&&(curUser.sentReqs||[]).includes(u.name);
      let btnHtml='';
      if(curUser){
        if(isFriend)btnHtml=`<button class="btn btn-o btn-sm" onclick="openPrivateChat('${u.name}')">💬 Nhắn tin</button>`;
        else if(sent)btnHtml=`<span style="font-size:11px;color:var(--text3)">Đã gửi lời mời</span>`;
        else btnHtml=`<button class="btn btn-p btn-sm" onclick="sendFriendReq('${u.name}')">+ Kết bạn</button>`;
      }
      return `<div class="fcard" style="cursor:default">
        <div class="fav">${getMascEmoji(u.mascId)}</div>
        <div class="finfo">
          <div class="fname" onclick="showUserPopup('${u.name}')" style="cursor:pointer">${u.name}</div>
          <div class="felo">ELO: ${u.elo} · ${getRank(u.elo)} · <span class="${online?'fo-yes':'fo-no'}">${online?'🟢 Online':'⚫ Offline'}</span></div>
        </div>
        <div class="fbtns">${btnHtml}</div>
      </div>`;
    }).join('');
}

function showFTab(tab,btn){
  ['friends','requests','sent'].forEach(t=>{
    document.getElementById('ftab-'+t).style.display=t===tab?'flex':'none';
  });
  document.querySelectorAll('.ftab').forEach(b=>b.classList.remove('act'));
  if(btn)btn.classList.add('act');
  document.getElementById('ftab-'+tab).style.display='flex';
  document.getElementById('ftab-'+tab).style.flexDirection='column';
}

function refreshFriends(){
  if(!curUser){
    ['friends','requests','sent'].forEach(t=>document.getElementById('ftab-'+t).innerHTML='<div class="empty-state">Đăng nhập để xem bạn bè 🌸</div>');
    return;
  }
  const users=getUsers();
  const me=users[curUser.name]||curUser;
  const friends=me.friends||[];
  const reqs=me.friendReqs||[];
  const sent=me.sentReqs||[];
  // Update req count
  const rc=document.getElementById('req-count');
  if(rc)rc.innerHTML=reqs.length?`<span style="background:var(--pk5);color:#fff;border-radius:8px;padding:1px 6px;font-size:10px;margin-left:3px">${reqs.length}</span>`:'';
  // Friend dot notif
  const fd=document.getElementById('friend-dot');
  if(fd)fd.style.display=reqs.length?'inline-block':'none';

  // Friends tab
  const fl=document.getElementById('ftab-friends');
  if(!friends.length){fl.innerHTML='<div class="empty-state"> Sói cô độc<br> <small>Tìm và kết bạn bên trên!</small></div>';}
  else{
    fl.innerHTML=friends.map(name=>{
      const u=users[name];if(!u)return'';
      const online=isOnline(name);
      return `<div class="fcard">
        <div class="fav">${getMascEmoji(u.mascId)}</div>
        <div class="finfo">
          <div class="fname" style="cursor:pointer" onclick="showUserPopup('${name}')">${name}</div>
          <div class="felo">ELO: ${u.elo} · ${getRank(u.elo)}</div>
          <div class="fonline ${online?'fo-yes':'fo-no'}">${online?'🟢 Đang trực tuyến':'⚫ Offline'}</div>
        </div>
        <div class="fbtns">
          <button class="btn btn-p btn-sm" onclick="openPrivateChat('${name}')">💬</button>
          <button class="btn btn-o btn-sm" onclick="removeFriend('${name}')">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  // Requests tab
  const rl=document.getElementById('ftab-requests');
  if(!reqs.length){rl.innerHTML='<div class="empty-state">Không có lời mời nào 💌</div>';}
  else{
    rl.innerHTML=reqs.map(name=>{
      const u=users[name];if(!u)return'';
      return `<div class="fcard">
        <div class="fav">${getMascEmoji(u.mascId)}</div>
        <div class="finfo">
          <div class="fname">${name}</div>
          <div class="felo">ELO: ${u.elo}</div>
        </div>
        <div class="fbtns">
          <button class="btn btn-p btn-sm" onclick="acceptFriend('${name}')">✓ Chấp nhận</button>
          <button class="btn btn-o btn-sm" onclick="declineFriend('${name}')">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  // Sent tab
  const sl=document.getElementById('ftab-sent');
  if(!sent.length){sl.innerHTML='<div class="empty-state">Chưa gửi lời mời nào</div>';}
  else{
    sl.innerHTML=sent.map(name=>{
      const u=users[name];
      return `<div class="fcard">
        <div class="fav">${u?getMascEmoji(u.mascId):'👤'}</div>
        <div class="finfo"><div class="fname">${name}</div><div class="felo">${u?'ELO: '+u.elo:'...'}</div></div>
        <div style="font-size:11px;color:var(--text3)">Đang chờ...</div>
      </div>`;
    }).join('');
  }
}

// ════════════════════════════════════════
// PRIVATE CHAT
// ════════════════════════════════════════
let pChatTarget=null;
function openPrivateChat(name){
  if(!curUser){toast('Hãy đăng nhập trước!');return;}
  pChatTarget=name;
  const users=getUsers();
  const them=users[name];
  document.getElementById('pchat-name').textContent='💬 '+name;
  document.getElementById('pchat-av').textContent=them?getMascEmoji(them.mascId):'👤';
  renderPChat();
  openMod('pchat');
  setTimeout(()=>{const msgs=document.getElementById('pchat-msgs');if(msgs)msgs.scrollTop=msgs.scrollHeight;},100);
}

function getChatKey(a,b){return [a,b].sort().join('__');}

function renderPChat(){
  if(!pChatTarget||!curUser)return;
  const key=getChatKey(curUser.name,pChatTarget);
  const chats=getChats();
  const msgs=chats[key]||[];
  const el=document.getElementById('pchat-msgs');
  if(!msgs.length){el.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">Bắt đầu trò chuyện! 💬</div>';return;}
  el.innerHTML=msgs.map(m=>{
    const isMe=m.from===curUser.name;
    return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
      <div class="pchat-nm">${m.from} · ${m.time}</div>
      <div class="pchat-bubble ${isMe?'pchat-me':'pchat-them'}">${m.text}</div>
    </div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}

function sendPChat(){
  if(!curUser||!pChatTarget)return;
  const inp=document.getElementById('pchat-input');
  const text=inp.value.trim();if(!text)return;
  const key=getChatKey(curUser.name,pChatTarget);
  const chats=getChats();
  if(!chats[key])chats[key]=[];
  chats[key].push({from:curUser.name,text,time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})});
  if(chats[key].length>500)chats[key]=chats[key].slice(-500);
  saveChats(chats);
  inp.value='';
  renderPChat();
}

// ════════════════════════════════════════
// USER POPUP
// ════════════════════════════════════════
function showUserPopup(name){
  const users=getUsers();
  const u=users[name];
  if(!u)return;
  document.getElementById('up-av-inner').textContent=getMascEmoji(u.mascId);
  document.getElementById('up-name').textContent=u.name;
  document.getElementById('up-elo').textContent=u.elo;
  document.getElementById('up-rank').textContent=getRank(u.elo);
  const online=isOnline(name);
  document.getElementById('up-online-dot').className='prof-online '+(online?'online':'offline');
  document.getElementById('up-online-txt').textContent=online?'Đang trực tuyến':'Offline';
  const acts=document.getElementById('up-actions');
  const isFriend=curUser&&(curUser.friends||[]).includes(name);
  const isMe=curUser&&curUser.name===name;
  const sent=curUser&&(curUser.sentReqs||[]).includes(name);
  acts.innerHTML='';
  if(curUser&&!isMe){
    if(isFriend){
      acts.innerHTML=`<button class="btn btn-p btn-sm" onclick="closeUserPopup();openPrivateChat('${name}')">💬 Nhắn tin</button>`;
    } else if(!sent){
      acts.innerHTML=`<button class="btn btn-p btn-sm" onclick="sendFriendReq('${name}');closeUserPopup()">+ Kết bạn</button>`;
    } else {
      acts.innerHTML=`<span style="font-size:11px;color:var(--text3)">Đã gửi lời mời</span>`;
    }
  }
  document.getElementById('user-popup-bg').style.display='block';
  document.getElementById('user-popup').style.display='block';
}
function closeUserPopup(){
  document.getElementById('user-popup-bg').style.display='none';
  document.getElementById('user-popup').style.display='none';
}

// ════════════════════════════════════════
// ROOM CODE SYSTEM
// ════════════════════════════════════════
let activeRoom=null;
let roomTimerInt=null;

function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c='';for(let i=0;i<6;i++)c+=chars[Math.floor(Math.random()*chars.length)];
  return c;
}

function createRoom(gameSettings){
  const code=genCode();
  const rooms=getRooms();
  // Clean old rooms
  const now=Date.now();
  Object.keys(rooms).forEach(k=>{if(now-rooms[k].created>300000)delete rooms[k];});
  rooms[code]={code,created:now,creator:curUser?curUser.name:'Khách',settings:gameSettings,joined:null};
  saveRooms(rooms);
  activeRoom={code,role:'creator',settings:gameSettings};
  return code;
}

function joinRoom(code){
  const rooms=getRooms();
  const room=rooms[code.toUpperCase()];
  if(!room){toast('Mã không hợp lệ hoặc đã hết hạn! ❌');return false;}
  if(Date.now()-room.created>300000){toast('Mã đã hết hiệu lực (5 phút)! ⏰');delete rooms[code];saveRooms(rooms);return false;}
  if(room.joined){toast('Ván đã có người vào rồi!');return false;}
  room.joined=curUser?curUser.name:'Khách';
  room.joinedAt=Date.now();
  saveRooms(rooms);
  activeRoom={code,role:'joiner',settings:room.settings,creator:room.creator};
  return room;
}

function startRoomTimer(code){
  let remaining=300;
  clearInterval(roomTimerInt);
  roomTimerInt=setInterval(()=>{
    remaining--;
    const mins=Math.floor(remaining/60);
    const secs=remaining%60;
    const el=document.getElementById('room-code-timer');
    if(el)el.textContent=`⏳ Còn ${mins}:${String(secs).padStart(2,'0')}`;
    if(remaining<=0){
      clearInterval(roomTimerInt);
      cancelRoom();
      closeMod('room');
      toast('Mã ván đã hết hiệu lực ⏰');
    }
    // Check if someone joined
    const rooms=getRooms();
    if(rooms[code]&&rooms[code].joined){
      clearInterval(roomTimerInt);
      closeMod('room');
      // Start game as creator (white)
      const s=rooms[code].settings||{};
      startGameFromRoom(s,rooms[code].joined);
      delete rooms[code];saveRooms(rooms);
    }
  },1000);
}

function cancelRoom(){
  if(!activeRoom)return;
  const rooms=getRooms();
  delete rooms[activeRoom.code];
  saveRooms(rooms);
  activeRoom=null;
  clearInterval(roomTimerInt);
}

function copyRoomCode(){
  const code=document.getElementById('room-code-val').textContent;
  navigator.clipboard.writeText(code).catch(()=>{});
  toast('Đã sao chép mã: '+code+' 📋');
}

function joinByCode(){
  const code=document.getElementById('join-code-input').value.trim().toUpperCase();
  if(code.length!==6){toast('Mã ván phải có 6 ký tự!');return;}
  const room=joinRoom(code);
  if(!room)return;
  document.getElementById('join-code-input').value='';
  // Start game as joiner (black)
  const s=room.settings||{};
  startGameFromRoom(s,room.creator,true);
  toast('Đã vào ván của '+room.creator+' 🎉');
}

function startGameFromRoom(settings,opponentName,isJoiner){
  const tcMap={'tc1':60,'tc3':180,'tc5':300,'tc10':600,'tc30':1800,'tc60':3600};
  const tcVal=tcMap[settings.tc]||300;
  wTime=tcVal;bTime=tcVal;
  gameMode='2p';aiMode=false;isRankMode=!!settings.isRank;
  humanColor=isJoiner?'b':'w';
  flipped=isJoiner;
  const users=getUsers();
  const opp=users[opponentName];
  p1MascId=curUser?curUser.mascId:'kitty';
  p2MascId=opp?opp.mascId:'kuromi';
  setAvatarEl('av-white-inner',isJoiner?p2MascId:p1MascId);
  setAvatarEl('av-black-inner',isJoiner?p1MascId:p2MascId);
  document.getElementById('pname-white').textContent=isJoiner?(opponentName||'Người chơi 1'):(curUser?curUser.name:'Người chơi 1');
  document.getElementById('pname-black').textContent=isJoiner?(curUser?curUser.name:'Người chơi 2'):(opponentName||'Người chơi 2');
  document.getElementById('prat-white').textContent='★ '+(isJoiner?(opp?opp.elo:1200):(curUser?curUser.elo:1200));
  document.getElementById('prat-black').textContent='★ '+(isJoiner?(curUser?curUser.elo:1200):(opp?opp.elo:1200));
  const badge=document.getElementById('game-mode-badge');
  badge.textContent=isRankMode?'⚔️ Chế độ Rank':'🎮 Chế độ thường';
  badge.className='game-mode-label '+(isRankMode?'gml-r':'gml-n');
  initBoardState();gameActive=true;
  document.getElementById('check-warn').classList.remove('show');
  document.getElementById('chat-msgs').innerHTML='';
  closeMod('newgame');goPage('game');
  renderBoard();updateStatusBar();updateMovePanel();updateCaptured();updateTimers();startTimer();
  toast('Ván cờ bắt đầu! '+( isRankMode?'⚔️ Rank':'🎮 Thường'));
}

// ════════════════════════════════════════
// CHESS ENGINE
// ════════════════════════════════════════
const EMPTY=0,wP=1,wN=2,wB=3,wR=4,wQ=5,wK=6,bP=7,bN=8,bB=9,bR=10,bQ=11,bK=12;
const SYM={0:'',1:'♙',2:'♘',3:'♗',4:'♖',5:'♕',6:'♔',7:'♟',8:'♞',9:'♝',10:'♜',11:'♛',12:'♚'};
const isW=p=>p>=1&&p<=6,isB=p=>p>=7&&p<=12,occ=p=>p!==EMPTY;
const enemy=(p,t)=>occ(p)&&((isW(p)&&isB(t))||(isB(p)&&isW(t)));
const ally=(p,t)=>occ(p)&&occ(t)&&((isW(p)&&isW(t))||(isB(p)&&isB(t)));

let board=[],turn='w',selSq=null,legalMoves=[],history=[],capW=[],capB=[];
let flipped=false,gameActive=false,aiMode=true,difficulty='medium';
let gameMode='ai',humanColor='w',isRankMode=false;
let wTime=300,bTime=300,timerInt=null;
let castleRights={wK:true,wQ:true,bK:true,bQ:true};
let enPassant=null,promoCallback=null;
let p1MascId='kitty',p2MascId='kuromi';

function initBoardState(){
  board=[[bR,bN,bB,bQ,bK,bB,bN,bR],[bP,bP,bP,bP,bP,bP,bP,bP],
    [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
    [wP,wP,wP,wP,wP,wP,wP,wP],[wR,wN,wB,wQ,wK,wB,wN,wR]];
  turn='w';selSq=null;legalMoves=[];history=[];capW=[];capB=[];
  castleRights={wK:true,wQ:true,bK:true,bQ:true};enPassant=null;
}

function rawMoves(brd,r,c,cr,ep){
  const p=brd[r][c];if(!occ(p))return[];
  const moves=[];
  const add=(tr,tc)=>{if(tr>=0&&tr<8&&tc>=0&&tc<8&&!ally(p,brd[tr][tc]))moves.push([tr,tc]);};
  const slide=(dr,dc)=>{let tr=r+dr,tc=c+dc;while(tr>=0&&tr<8&&tc>=0&&tc<8){if(ally(p,brd[tr][tc]))break;moves.push([tr,tc]);if(enemy(p,brd[tr][tc]))break;tr+=dr;tc+=dc;}};
  if(p===wP){
    if(r>0&&brd[r-1][c]===EMPTY){moves.push([r-1,c]);if(r===6&&brd[r-2][c]===EMPTY)moves.push([r-2,c]);}
    if(r>0&&c>0&&(isB(brd[r-1][c-1])||(ep&&ep[0]===r-1&&ep[1]===c-1)))moves.push([r-1,c-1]);
    if(r>0&&c<7&&(isB(brd[r-1][c+1])||(ep&&ep[0]===r-1&&ep[1]===c+1)))moves.push([r-1,c+1]);
  }else if(p===bP){
    if(r<7&&brd[r+1][c]===EMPTY){moves.push([r+1,c]);if(r===1&&brd[r+2][c]===EMPTY)moves.push([r+2,c]);}
    if(r<7&&c>0&&(isW(brd[r+1][c-1])||(ep&&ep[0]===r+1&&ep[1]===c-1)))moves.push([r+1,c-1]);
    if(r<7&&c<7&&(isW(brd[r+1][c+1])||(ep&&ep[0]===r+1&&ep[1]===c+1)))moves.push([r+1,c+1]);
  }else if(p===wN||p===bN){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  }else if(p===wB||p===bB){[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));
  }else if(p===wR||p===bR){[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
  }else if(p===wQ||p===bQ){[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
  }else if(p===wK||p===bK){
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    if(p===wK&&r===7&&c===4){
      if(cr.wK&&brd[7][5]===EMPTY&&brd[7][6]===EMPTY&&brd[7][7]===wR&&!sqAtt(brd,7,4,true)&&!sqAtt(brd,7,5,true)&&!sqAtt(brd,7,6,true))moves.push([7,6]);
      if(cr.wQ&&brd[7][3]===EMPTY&&brd[7][2]===EMPTY&&brd[7][1]===EMPTY&&brd[7][0]===wR&&!sqAtt(brd,7,4,true)&&!sqAtt(brd,7,3,true)&&!sqAtt(brd,7,2,true))moves.push([7,2]);
    }
    if(p===bK&&r===0&&c===4){
      if(cr.bK&&brd[0][5]===EMPTY&&brd[0][6]===EMPTY&&brd[0][7]===bR&&!sqAtt(brd,0,4,false)&&!sqAtt(brd,0,5,false)&&!sqAtt(brd,0,6,false))moves.push([0,6]);
      if(cr.bQ&&brd[0][3]===EMPTY&&brd[0][2]===EMPTY&&brd[0][1]===EMPTY&&brd[0][0]===bR&&!sqAtt(brd,0,4,false)&&!sqAtt(brd,0,3,false)&&!sqAtt(brd,0,2,false))moves.push([0,2]);
    }
  }
  return moves;
}

function sqAtt(brd,r,c,byBlack){
  for(let sr=0;sr<8;sr++)for(let sc=0;sc<8;sc++){
    const p=brd[sr][sc];if(!occ(p))continue;
    if(byBlack?!isB(p):!isW(p))continue;
    const raw=rawMoves(brd,sr,sc,{wK:false,wQ:false,bK:false,bQ:false},null);
    if(raw.some(([tr,tc])=>tr===r&&tc===c))return true;
  }return false;
}
function findKing(brd,white){const k=white?wK:bK;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(brd[r][c]===k)return[r,c];return null;}
function inCheck(brd,white){const kp=findKing(brd,white);if(!kp)return false;return sqAtt(brd,kp[0],kp[1],!white);}
function applyMove(brd,r,c,tr,tc,cr,ep){
  const nb=brd.map(row=>[...row]);const p=nb[r][c];const ncr={...cr};let nep=null;
  if((p===wP||p===bP)&&ep&&tr===ep[0]&&tc===ep[1]){if(p===wP)nb[tr+1][tc]=EMPTY;else nb[tr-1][tc]=EMPTY;}
  if(p===wK&&r===7&&c===4&&tc===6){nb[7][5]=wR;nb[7][7]=EMPTY;}
  if(p===wK&&r===7&&c===4&&tc===2){nb[7][3]=wR;nb[7][0]=EMPTY;}
  if(p===bK&&r===0&&c===4&&tc===6){nb[0][5]=bR;nb[0][7]=EMPTY;}
  if(p===bK&&r===0&&c===4&&tc===2){nb[0][3]=bR;nb[0][0]=EMPTY;}
  if(p===wP&&r===6&&tr===4)nep=[5,tc];if(p===bP&&r===1&&tr===3)nep=[2,tc];
  nb[tr][tc]=p;nb[r][c]=EMPTY;
  if(p===wK){ncr.wK=false;ncr.wQ=false;}if(p===bK){ncr.bK=false;ncr.bQ=false;}
  if(p===wR&&r===7&&c===7)ncr.wK=false;if(p===wR&&r===7&&c===0)ncr.wQ=false;
  if(p===bR&&r===0&&c===7)ncr.bK=false;if(p===bR&&r===0&&c===0)ncr.bQ=false;
  return{nb,ncr,nep};
}
function getLegal(brd,r,c,cr,ep){
  const p=brd[r][c];if(!occ(p))return[];
  const white=isW(p);
  return rawMoves(brd,r,c,cr,ep).filter(([tr,tc])=>{const{nb}=applyMove(brd,r,c,tr,tc,cr,ep);return!inCheck(nb,white);});
}
function getAllLegal(brd,white,cr,ep){
  const all=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=brd[r][c];if(!occ(p))continue;
    if(white?!isW(p):!isB(p))continue;
    getLegal(brd,r,c,cr,ep).forEach(([tr,tc])=>all.push({r,c,tr,tc}));
  }return all;
}

// ════════════════════════════════════════
// RENDER
// ════════════════════════════════════════



function renderBoard(){
  const grid=document.getElementById('board-grid');
  const ctop=document.getElementById('coord-top');
  const cleft=document.getElementById('coord-left');
  grid.innerHTML='';ctop.innerHTML='';cleft.innerHTML='';
  const cols=flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'];
  const rows=flipped?[0,1,2,3,4,5,6,7]:[7,6,5,4,3,2,1,0];
  ctop.innerHTML='<div class="coord-spacer"></div>'+cols.map(c=>`<div class="coord-c">${c}</div>`).join('');
  rows.forEach(r=>{const d=document.createElement('div');d.className='coord-r';d.textContent=r+1;cleft.appendChild(d);});
  const hintSet=new Set(legalMoves.map(([tr,tc])=>`${tr},${tc}`));
  const lastMv=history.length?history[history.length-1]:null;
  const wKpos=findKing(board,true),bKpos=findKing(board,false);
  const wChk=inCheck(board,true),bChk=inCheck(board,false);
  rows.forEach(r=>{
    (flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7]).forEach(c=>{
      const sq=document.createElement('div');
      sq.className='sq '+((r+c)%2===0?'dark':'light');
      sq.dataset.r=r;sq.dataset.c=c;
      if(lastMv&&((lastMv.r===r&&lastMv.c===c)||(lastMv.tr===r&&lastMv.tc===c)))sq.classList.add('lm');
      if(selSq&&selSq[0]===r&&selSq[1]===c)sq.classList.add('sel');
      if(hintSet.has(`${r},${c}`)){if(occ(board[r][c]))sq.classList.add('hint-cap');else sq.classList.add('hint');}
      if(wChk&&wKpos&&wKpos[0]===r&&wKpos[1]===c)sq.classList.add('in-check');
      if(bChk&&bKpos&&bKpos[0]===r&&bKpos[1]===c)sq.classList.add('in-check');
      const p=board[r][c];
      if(occ(p)){const sp=document.createElement('span');sp.className='pc '+(isW(p)?'white-piece':'black-piece');sp.textContent=SYM[p];sq.appendChild(sp);}
      sq.addEventListener('click',()=>handleSqClick(r,c));
      grid.appendChild(sq);
    });
  });
  const warn=document.getElementById('check-warn');
  const activeChk=(turn==='w'&&wChk)||(turn==='b'&&bChk);
  warn.classList.toggle('show',activeChk&&gameActive);
  const statusBar=document.getElementById('status-bar');
  statusBar.classList.toggle('chk',activeChk&&gameActive);
}

// ════════════════════════════════════════
// GAME LOGIC
// ════════════════════════════════════════
function handleSqClick(r,c){
  if(!gameActive||promoCallback)return;
  const white=(turn==='w');
  const p=board[r][c];

  // AI mode: only allow human's side
  if(gameMode==='ai'){
    if(humanColor==='w'&&turn!=='w')return;
    if(humanColor==='b'&&turn!=='b')return;
  }
  // 2P mode: no restriction — both players move freely (no auto-flip)

  if(selSq){
    const [sr,sc]=selSq;
    if(sr===r&&sc===c){selSq=null;legalMoves=[];renderBoard();return;}
    if(occ(p)&&(white?isW(p):isB(p))){selSq=[r,c];legalMoves=getLegal(board,r,c,castleRights,enPassant);renderBoard();return;}
    if(legalMoves.some(([tr,tc])=>tr===r&&tc===c)){executeMove(sr,sc,r,c);}
    else{selSq=null;legalMoves=[];renderBoard();}
  } else {
    if(occ(p)&&(white?isW(p):isB(p))){selSq=[r,c];legalMoves=getLegal(board,r,c,castleRights,enPassant);renderBoard();}
  }
}

function executeMove(r,c,tr,tc,promoChoice){
  const p=board[r][c];const cap=board[tr][tc];
  if((p===wP||p===bP)&&enPassant&&tr===enPassant[0]&&tc===enPassant[1]){
    const epr=p===wP?tr+1:tr-1;
    if(p===wP)capW.push(board[epr][tc]);else capB.push(board[epr][tc]);
  }
  if(occ(cap)){if(isW(p))capW.push(cap);else capB.push(cap);}
  const{nb,ncr,nep}=applyMove(board,r,c,tr,tc,castleRights,enPassant);
  const isPromo=(p===wP&&tr===0)||(p===bP&&tr===7);
  if(isPromo&&!promoChoice){
    board=nb;castleRights=ncr;enPassant=nep;
    showPromo(tr,tc,isW(p),(ch)=>{board[tr][tc]=ch;finishMove(r,c,tr,tc,p);});return;
  }
  if(isPromo&&promoChoice)nb[tr][tc]=promoChoice;
  board=nb;castleRights=ncr;enPassant=nep;
  finishMove(r,c,tr,tc,p);
}

function finishMove(r,c,tr,tc,p){
  const cols='abcdefgh';
  const mvStr=cols[c]+(r+1)+'→'+cols[tc]+(tr+1);
  history.push({r,c,tr,tc,mvStr,piece:p});
  selSq=null;legalMoves=[];
  turn=turn==='w'?'b':'w';
  updateStatusBar();updateMovePanel();updateCaptured();updateTimers();renderBoard();

  const wKing=findKing(board,true);const bKing=findKing(board,false);
  if(!wKing){endGame('black','capture');return;}
  if(!bKing){endGame('white','capture');return;}

  const white=(turn==='w');
  const all=getAllLegal(board,white,castleRights,enPassant);
  if(all.length===0){
    if(inCheck(board,white))endGame(white?'black':'white','checkmate');
    else endGame(null,'stalemate');
    return;
  }

  const sc=evalBoard(board);
  document.getElementById('eval-fill').style.width=(50+Math.max(-50,Math.min(50,sc/20)))+'%';

  // 2P: NO auto-flip board
  // AI: trigger AI move
  if(gameMode==='ai'){
    const aiTurn=(humanColor==='w')?'b':'w';
    if(turn===aiTurn)setTimeout(doAI,480);
  }
}

function endGame(winner,reason){
  gameActive=false;clearInterval(timerInt);
  const dur=formatDur(history.length);
  const opponent=gameMode==='ai'?'AI Sanrio':'Người chơi 2';
  let outcome='draw';
  if(gameMode==='2p'){
    outcome=winner?'win':'draw';
  } else {
    if(winner==='white')outcome=(humanColor==='w')?'win':'loss';
    else if(winner==='black')outcome=(humanColor==='b')?'win':'loss';
  }

  let eloChange=0;
  if(curUser&&isRankMode){
    eloChange=updateElo(outcome,true);
  } else if(curUser){
    updateNormalStats(outcome);
  }

  // Save board snapshot for replay
  const snap=board.map(r=>[...r]);
  if(curUser){saveMatch(opponent,outcome,history.length,dur,isRankMode,eloChange,{boardFinal:snap,moves:[...history]});}

  const em=winner==='white'?'🎀':winner==='black'?'💔':'🤝';
  const titles={white:'Trắng thắng! 🎀',black:'Đen thắng! 🖤',null:'Hòa cờ! 🤝'};
  const msgs={checkmate:'Chiếu hết! Xuất sắc! 🌸',capture:'Bắt được Vua! Chiến thắng! 👑',stalemate:'Không còn nước — hòa! 🌸',time:'Hết giờ! ⏰',resign:'Bỏ cuộc! 🏳️',draw:'Hòa thuận! 🤝'};
  document.getElementById('w-em').textContent=em;
  document.getElementById('w-title').textContent=titles[winner]||'Hòa!';
  document.getElementById('w-msg').textContent=msgs[reason]||'Ván cờ kết thúc';
  const ec=document.getElementById('elo-change-txt');
  if(eloChange!==0&&curUser&&isRankMode){
    ec.textContent=(eloChange>0?'▲ +':'▼ ')+Math.abs(eloChange)+' ELO';
    ec.className='elo-change '+(eloChange>0?'elo-up':'elo-dn');
  } else if(curUser&&isRankMode){
    ec.textContent='ELO không thay đổi (hòa)';ec.className='elo-change';
  } else if(!isRankMode){
    ec.textContent='Chế độ thường — không tính ELO';ec.className='elo-change';ec.style.color='var(--text3)';ec.style.fontSize='12px';
  } else ec.textContent='';
  setTimeout(()=>openMod('winner'),400);
  refreshRankings();refreshProfile();
}

function showPromo(tr,tc,white,cb){
  promoCallback=cb;
  const modal=document.getElementById('promo-modal');
  const opts=document.getElementById('promo-opts');
  const pcs=white?[wQ,wR,wB,wN]:[bQ,bR,bB,bN];
  opts.innerHTML='';
  pcs.forEach(pp=>{
    const btn=document.createElement('div');
    btn.className='promo-opt '+(isW(pp)?'white-piece':'black-piece');
    btn.textContent=SYM[pp];
    btn.addEventListener('click',()=>{modal.classList.remove('open');promoCallback=null;cb(pp);renderBoard();});
    opts.appendChild(btn);
  });
  modal.classList.add('open');
}

// ════════════════════════════════════════
// AI — Tiered by difficulty
// ════════════════════════════════════════
const PIE={1:100,2:320,3:330,4:500,5:900,6:20000,7:-100,8:-320,9:-330,10:-500,11:-900,12:-20000};
const PST_P=[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0];
const PST_N=[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const PST_B=[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const PST_R=[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
const PST_Q=[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const PST_K=[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];

function getPST(p,r,c){
  const wr=isW(p)?r:(7-r);const idx=wr*8+c;
  if(p===wP||p===bP)return PST_P[idx]*(isW(p)?1:-1);
  if(p===wN||p===bN)return PST_N[idx]*(isW(p)?1:-1);
  if(p===wB||p===bB)return PST_B[idx]*(isW(p)?1:-1);
  if(p===wR||p===bR)return PST_R[idx]*(isW(p)?1:-1);
  if(p===wQ||p===bQ)return PST_Q[idx]*(isW(p)?1:-1);
  if(p===wK||p===bK)return PST_K[idx]*(isW(p)?1:-1);
  return 0;
}
function evalBoard(brd){
  let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=brd[r][c];if(occ(p))s+=(PIE[p]||0)+getPST(p,r,c);}
  return s;
}

// Easy AI: mostly random, occasionally captures
function doAI_easy(aiWhite){
  const all=getAllLegal(board,aiWhite,castleRights,enPassant);
  if(!all.length)return;
  // 70% random, 30% greedy capture
  if(Math.random()<0.7){
    const mv=all[Math.floor(Math.random()*all.length)];
    executeMove(mv.r,mv.c,mv.tr,mv.tc);
  } else {
    // Pick best capture or random
    const caps=all.filter(mv=>occ(board[mv.tr][mv.tc]));
    if(caps.length){
      caps.sort((a,b)=>Math.abs(PIE[board[b.tr][b.tc]]||0)-Math.abs(PIE[board[a.tr][a.tc]]||0));
      executeMove(caps[0].r,caps[0].c,caps[0].tr,caps[0].tc);
    } else {
      const mv=all[Math.floor(Math.random()*all.length)];
      executeMove(mv.r,mv.c,mv.tr,mv.tc);
    }
  }
}

function minimax(brd,depth,alpha,beta,white,cr,ep){
  if(depth===0)return{score:evalBoard(brd)};
  const moves=getAllLegal(brd,white,cr,ep);
  if(moves.length===0)return{score:inCheck(brd,white)?(white?-99999:99999):0};
  moves.sort((a,b)=>(occ(brd[b.tr][b.tc])?Math.abs(PIE[brd[b.tr][b.tc]]||0):0)-(occ(brd[a.tr][a.tc])?Math.abs(PIE[brd[a.tr][a.tc]]||0):0));
  let best=white?{score:-999999}:{score:999999};
  for(const mv of moves){
    const{nb,ncr,nep}=applyMove(brd,mv.r,mv.c,mv.tr,mv.tc,cr,ep);
    const pp=nb[mv.tr][mv.tc];
    if(pp===wP&&mv.tr===0)nb[mv.tr][mv.tc]=wQ;
    if(pp===bP&&mv.tr===7)nb[mv.tr][mv.tc]=bQ;
    const res=minimax(nb,depth-1,alpha,beta,!white,ncr,nep);
    if(white){if(res.score>best.score){best={score:res.score,...mv};}alpha=Math.max(alpha,best.score);}
    else{if(res.score<best.score){best={score:res.score,...mv};}beta=Math.min(beta,best.score);}
    if(beta<=alpha)break;
  }
  return best;
}

function doAI(){
  if(!gameActive)return;
  const aiWhite=(humanColor==='b');
  if(turn!==(aiWhite?'w':'b'))return;
  if(difficulty==='easy'){doAI_easy(aiWhite);return;}
  const depth=difficulty==='hard'?4:3;
  const mv=minimax(board,depth,-999999,999999,aiWhite,castleRights,enPassant);
  if(mv&&mv.r!==undefined)executeMove(mv.r,mv.c,mv.tr,mv.tc);
}

// ════════════════════════════════════════
// UI UPDATES
// ════════════════════════════════════════
function updateStatusBar(){
  const bar=document.getElementById('status-bar');
  const nm=Math.ceil(history.length/2)||1;
  let who=turn==='w'?'Trắng ⬜':'Đen ⬛';
  bar.innerHTML=`Lượt: <strong>${who}</strong> · Nước <strong>${nm}</strong>`;
}
function updateMovePanel(){
  const ml=document.getElementById('move-list');
  if(!history.length){ml.innerHTML='<div style="text-align:center;color:var(--text3);font-size:11px;padding:14px 0">Chưa có nước đi</div>';return;}
  let html='';
  for(let i=0;i<history.length;i+=2){
    const n=Math.floor(i/2)+1;const w=history[i];const b=history[i+1];
    html+=`<div class="mv-row"><span class="mv-num">${n}.</span><span class="mv-cell${i===history.length-1?' cur':''}">${w.mvStr}</span>${b?`<span class="mv-cell${i+1===history.length-1?' cur':''}">${b.mvStr}</span>`:''}</div>`;
  }
  ml.innerHTML=html;ml.scrollTop=ml.scrollHeight;
}
function updateCaptured(){
  document.getElementById('cap-b').innerHTML=capB.map(p=>`<span class="cap-p">${SYM[p]}</span>`).join('');
  document.getElementById('cap-w').innerHTML=capW.map(p=>`<span class="cap-p">${SYM[p]}</span>`).join('');
}
function formatDur(moves){return moves+'n';}
function updateTimers(){
  const fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
  const we=document.getElementById('t-white'),be=document.getElementById('t-black');
  we.textContent=fmt(wTime);be.textContent=fmt(bTime);
  we.classList.toggle('low',wTime<=30&&turn==='w');
  be.classList.toggle('low',bTime<=30&&turn==='b');
  we.classList.toggle('active-t',turn==='w'&&wTime>30);
  be.classList.toggle('active-t',turn==='b'&&bTime>30);
}
function startTimer(){
  clearInterval(timerInt);
  timerInt=setInterval(()=>{
    if(!gameActive)return;
    if(turn==='w'){wTime--;if(wTime<=0){endGame('black','time');return;}}
    else{bTime--;if(bTime<=0){endGame('white','time');return;}}
    updateTimers();
  },1000);
}

// ════════════════════════════════════════
// CHAT (in-game)
// ════════════════════════════════════════
function sendChat(){
  const inp=document.getElementById('chat-input');
  const msg=inp.value.trim();if(!msg)return;
  const msgs=document.getElementById('chat-msgs');
  const isMe=true;
  const name=curUser?curUser.name:'Bạn';
  const d=document.createElement('div');
  d.className='chat-msg me';
  d.innerHTML=`<div><div class="chat-nm">${name}</div><div class="chat-bubble">${msg}</div></div>`;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
  inp.value='';
  if(gameMode==='ai'){
    const replies=['Hay lắm! 🌸','Hmm... 🤔','Kuromi sẽ không nhường đâu! 💪','Cố lên nào! 🎀','Thú vị đấy nhé 😏','Mình sẽ thắng thôi! 🖤'];
    setTimeout(()=>{
      const d2=document.createElement('div');d2.className='chat-msg';
      d2.innerHTML=`<div><div class="chat-nm">Kuromi AI</div><div class="chat-bubble">${replies[Math.floor(Math.random()*replies.length)]}</div></div>`;
      msgs.appendChild(d2);msgs.scrollTop=msgs.scrollHeight;
    },700+Math.random()*500);
  }
}

// ════════════════════════════════════════
// GAME FLOW
// ════════════════════════════════════════
let pendingGameMode='normal'; // 'normal' or 'rank'

function selGameMode(m,el){
  pendingGameMode=m;
  document.getElementById('ng-normal').classList.toggle('btn-p',m==='normal');
  document.getElementById('ng-normal').classList.toggle('btn-o',m!=='normal');
  document.getElementById('ng-rank').classList.toggle('btn-p',m==='rank');
  document.getElementById('ng-rank').classList.toggle('btn-o',m!=='rank');
}

function startRankGame(){
  if(!curUser){toast('Hãy đăng nhập để chơi rank! 🌸');openMod('login');return;}
  pendingGameMode='rank';
  openMod('newgame');
  setTimeout(()=>selGameMode('rank'),50);
}

function selOpt(el,mode){
  document.querySelectorAll('.gopt').forEach(o=>o.classList.remove('sel'));el.classList.add('sel');
  const isAI=mode==='ai';
  const is2P=mode==='2p';
  const isRoom=mode==='room';
  document.getElementById('diff-row').style.display=isAI?'flex':'none';
  document.getElementById('color-pick-wrap').style.display=isAI?'block':'none';
  document.getElementById('p2-masc-wrap').style.display=(is2P||isRoom)?'block':'none';
  document.getElementById('twop-note').classList.toggle('show',is2P);
}
function selColor(el){document.querySelectorAll('.cpick').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');}
function selDiff(el,d){document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');difficulty=d;}
function selTC(el){document.querySelectorAll('.tc-btn').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');}

function startGame(){
  const tcMap={'tc1':60,'tc3':180,'tc5':300,'tc10':600,'tc30':1800,'tc60':3600};
  const selTCbtn=document.querySelector('.tc-btn.sel');
  const tcVal=selTCbtn?tcMap[selTCbtn.id]||300:300;
  wTime=tcVal;bTime=tcVal;
  isRankMode=(pendingGameMode==='rank');

  const selMode=document.querySelector('.gopt.sel');
  const modeId=selMode?selMode.id:'gopt-ai';
  
  if(modeId==='gopt-room'){
    // Create a room
    if(!curUser){toast('Đăng nhập để tạo ván có mã!');return;}
    const tcId=selTCbtn?selTCbtn.id:'tc5';
    const roomSettings={tc:tcId,isRank:isRankMode};
    const code=createRoom(roomSettings);
    closeMod('newgame');
    document.getElementById('room-code-val').textContent=code;
    document.getElementById('room-code-timer').textContent='⏳ Còn 5:00';
    openMod('room');
    startRoomTimer(code);
    return;
  }

  gameMode=modeId==='gopt-2p'?'2p':'ai';
  aiMode=(gameMode==='ai');

  if(aiMode){
    const selC=document.querySelector('.cpick.sel');
    const cv=selC?selC.id.replace('cp-',''):'w';
    humanColor=cv==='r'?(Math.random()<.5?'w':'b'):cv;
    flipped=(humanColor==='b');
  } else {
    humanColor='w';flipped=false; // 2P: no flip
  }

  // Avatars
  p1MascId=curUser?curUser.mascId:'kitty';

  if(gameMode==='2p'){
    // 2P: người chơi 1 luôn là Trắng, người chơi 2 là Đen
    setAvatarEl('av-white-inner',p1MascId);
    document.getElementById('pname-white').textContent=curUser?curUser.name:'Người chơi 1';
    document.getElementById('prat-white').textContent='★ '+(curUser?curUser.elo:1200);
    const p2sel=document.querySelector('#p2-masc-row .mmasc.sel');
    p2MascId=p2sel?p2sel.dataset.id:'kuromi';
    setAvatarEl('av-black-inner',p2MascId);
    document.getElementById('pname-black').textContent='Người chơi 2';
    document.getElementById('prat-black').textContent='★ 1200';
  } else {
    // AI mode: đặt avatar đúng theo màu người chọn
    const aiRat='★ '+(difficulty==='easy'?'900':difficulty==='hard'?'1800':'1450');
    if(humanColor==='w'){
      // Người=Trắng, AI=Đen
      setAvatarEl('av-white-inner',p1MascId);
      document.getElementById('pname-white').textContent=curUser?curUser.name:'Bạn';
      document.getElementById('prat-white').textContent='★ '+(curUser?curUser.elo:1200);
      document.getElementById('av-black-inner').textContent='🖤';
      document.getElementById('pname-black').textContent='Kuromi AI';
      document.getElementById('prat-black').textContent=aiRat;
    } else {
      // Người=Đen, AI=Trắng
      document.getElementById('av-white-inner').textContent='🖤';
      document.getElementById('pname-white').textContent='Kuromi AI';
      document.getElementById('prat-white').textContent=aiRat;
      setAvatarEl('av-black-inner',p1MascId);
      document.getElementById('pname-black').textContent=curUser?curUser.name:'Bạn';
      document.getElementById('prat-black').textContent='★ '+(curUser?curUser.elo:1200);
    }
  }

  // Mode badge
  const badge=document.getElementById('game-mode-badge');
  badge.textContent=isRankMode?'⚔️ Chế độ Rank':'🎮 Chế độ thường';
  badge.className='game-mode-label '+(isRankMode?'gml-r':'gml-n');

  initBoardState();gameActive=true;
  document.getElementById('check-warn').classList.remove('show');
  document.getElementById('chat-msgs').innerHTML='';
  closeMod('newgame');goPage('game');
  renderBoard();updateStatusBar();updateMovePanel();updateCaptured();updateTimers();startTimer();

  const modeMsg=gameMode==='2p'?`${isRankMode?'⚔️ Rank':'🎮 Thường'} — 2 người luân phiên!`:`Bạn chơi quân ${humanColor==='w'?'Trắng ⬜':'Đen ⬛'} — ${isRankMode?'Rank ⚔️':'Thường 🎮'}`;
  toast(modeMsg);

  if(aiMode&&humanColor==='b'){
    setTimeout(()=>{doAI();},600);
  }
}

function resignGame(){closeMod('resign');gameActive=false;clearInterval(timerInt);const winner=(turn==='w')?'black':'white';endGame(winner,'resign');}
function offerDraw(){if(!gameActive)return;if(gameMode==='2p'||confirm('Xác nhận hòa cờ?')){endGame(null,'draw');}}
function undoMv(){
  if(!history.length||!gameActive)return;
  const count=aiMode?2:1;
  for(let i=0;i<count&&history.length>0;i++)history.pop();
  const snap=[...history];initBoardState();history=[];
  snap.forEach(h=>executeMove(h.r,h.c,h.tr,h.tc));
  toast('Đã hoàn tác ↩');renderBoard();updateMovePanel();updateCaptured();updateStatusBar();
}
function flipBrd(){
  const el=document.getElementById('board-outer');
  el.classList.add('flipping');
  setTimeout(()=>{flipped=!flipped;renderBoard();el.classList.remove('flipping');},275);
  toast(flipped?'Góc nhìn Đen ⬛':'Góc nhìn Trắng ⬜');
}

// ════════════════════════════════════════
// REPLAY SYSTEM
// ════════════════════════════════════════
let replayData=null,replayStep_idx=0;

function openReplay(matchId){
  const matches=getMatches();
  const match=matches.find(m=>m.id===matchId);
  if(!match||!match.boardSnap||!match.boardSnap.moves){toast('Không có dữ liệu replay cho ván này');return;}
  replayData=match;
  replayStep_idx=0;
  document.getElementById('rp-em').textContent=match.result==='win'?'🎀':match.result==='loss'?'💔':'🤝';
  document.getElementById('rp-title').textContent='Replay ván đấu';
  document.getElementById('rp-info').textContent=`vs ${match.opponent} · ${match.date} · ${match.moves} nước`;
  renderReplayBoard();
  openMod('replay');
}

function replayStep(dir){
  if(!replayData)return;
  const moves=replayData.boardSnap.moves;
  if(dir===-1)replayStep_idx=0;
  else if(dir===1)replayStep_idx=moves.length;
  else if(dir===-0.5)replayStep_idx=Math.max(0,replayStep_idx-1);
  else if(dir===0.5)replayStep_idx=Math.min(moves.length,replayStep_idx+1);
  renderReplayBoard();
}

function renderReplayBoard(){
  if(!replayData)return;
  // Rebuild board up to step
  let rb=[[bR,bN,bB,bQ,bK,bB,bN,bR],[bP,bP,bP,bP,bP,bP,bP,bP],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[wP,wP,wP,wP,wP,wP,wP,wP],[wR,wN,wB,wQ,wK,wB,wN,wR]];
  let rcr={wK:true,wQ:true,bK:true,bQ:true};let rep=null;
  const moves=replayData.boardSnap.moves;
  for(let i=0;i<replayStep_idx&&i<moves.length;i++){
    const h=moves[i];
    const res=applyMove(rb,h.r,h.c,h.tr,h.tc,rcr,rep);
    rb=res.nb;rcr=res.ncr;rep=res.nep;
    // Auto-promotion to queen
    const pp=rb[h.tr][h.tc];
    if(pp===wP&&h.tr===0)rb[h.tr][h.tc]=wQ;
    if(pp===bP&&h.tr===7)rb[h.tr][h.tc]=bQ;
  }
  // Render mini board
  const el=document.getElementById('rp-board');
  el.innerHTML='';
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(8,38px);grid-template-rows:repeat(8,38px);border:2px solid var(--pk3);border-radius:5px;overflow:hidden';
  for(let r=7;r>=0;r--){
    for(let c=0;c<8;c++){
      const sq=document.createElement('div');
      sq.style.cssText=`width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:${(r+c)%2===0?'#f09fbe':'#fff4f8'};font-size:22px`;
      const p=rb[r][c];
      if(occ(p)){const sp=document.createElement('span');sp.className=(isW(p)?'white-piece':'black-piece');sp.textContent=SYM[p];sq.appendChild(sp);}
      grid.appendChild(sq);
    }
  }
  el.appendChild(grid);
  const inf=document.getElementById('rp-move-info');
  if(replayStep_idx===0)inf.textContent='Vị trí ban đầu';
  else if(replayStep_idx>0&&replayStep_idx<=moves.length)inf.textContent=`Nước ${replayStep_idx}: ${moves[replayStep_idx-1].mvStr}`;
}

// ════════════════════════════════════════
// RESULTS PAGE
// ════════════════════════════════════════
function refreshResults(){
  const list=document.getElementById('res-list');if(!list)return;
  const matches=getMatches().filter(m=>!curUser||m.user===curUser.name);
  if(!matches.length){list.innerHTML='<div class="empty-state">Chưa có trận đấu nào 🌸<br><small>Hãy chơi ván cờ đầu tiên!</small></div>';return;}
  list.innerHTML=matches.map(m=>{
    const cls=m.result==='win'?'bw':m.result==='loss'?'bl':'bd';
    const em=m.result==='win'?'🎀':m.result==='loss'?'💔':'🌸';
    const oc=m.result==='win'?`<div class="ow">THẮNG</div>`:m.result==='loss'?`<div class="ol">THUA</div>`:`<div class="od">HÒA</div>`;
    const modeTag=m.isRank?`<span class="mode-tag mt-r">Rank ⚔️</span>`:`<span class="mode-tag mt-n">Thường</span>`;
    const eloTxt=m.isRank&&m.eloChange!==0?`<div class="rrat ${m.eloChange>0?'rup':'rdn'}">${m.eloChange>0?'▲+':'▼'}${Math.abs(m.eloChange)}</div>`:'';
    const hasReplay=m.boardSnap&&m.boardSnap.moves?'cursor:pointer':'cursor:default';
    return `<div class="rcard" style="${hasReplay}" onclick="${m.boardSnap&&m.boardSnap.moves?`openReplay('${m.id}')`:''}" title="${m.boardSnap&&m.boardSnap.moves?'Click để xem lại':''}">
      <div class="rbadge ${cls}">${em}</div>
      <div class="rinfo"><h4>vs ${m.opponent}${modeTag}</h4><div class="meta">${m.date} · ${m.moves} nước</div></div>
      <div class="rout">${oc}${eloTxt}<div class="rrat" style="color:var(--text3)">ELO: ${m.elo}</div></div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
// RANKINGS PAGE
// ════════════════════════════════════════
function refreshRankings(){
  const users=getUsers();
  const list=Object.values(users).sort((a,b)=>(b.elo||1200)-(a.elo||1200));
  const demos=[
    {name:'SakuraMaster',elo:1680,games:52,rankGames:52,mascId:'melody'},
    {name:'PinkQueenVN',elo:1540,games:38,rankGames:38,mascId:'kitty'},
    {name:'KawaiiKnight',elo:1420,games:29,rankGames:29,mascId:'cinna'},
  ];
  const combined=[...list,...demos.filter(d=>!list.find(u=>u.name===d.name))].sort((a,b)=>(b.elo||1200)-(a.elo||1200)).slice(0,20);
  const body=document.getElementById('rank-body');if(!body)return;
  body.innerHTML=combined.map((u,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'';
    const isMe=curUser&&u.name===curUser.name;
    const online=isOnline(u.name);
    return `<div class="rank-row${isMe?' me-row':''}" onclick="showUserPopup('${u.name}')">
      <div class="rank-num${i<3?' top':''}">${medal}</div>
      <div><div class="rank-av">${getMascEmoji(u.mascId||'kitty')}</div></div>
      <div class="rank-name">${u.name}${isMe?' 👈':''}<br><span style="font-size:9px;color:${online?'#27ae60':'var(--text3)'}">${online?'🟢':'⚫'}</span></div>
      <div class="rank-elo">${u.elo||1200}</div>
      <div class="rank-games">${u.rankGames||u.games||0}</div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
// PROFILE PAGE
// ════════════════════════════════════════
function refreshProfile(targetUser){
  const u=targetUser||curUser;
  if(!u){
    document.getElementById('prof-name-txt').textContent='Khách';
    document.getElementById('prof-elo-txt').textContent='1200';
    document.getElementById('prof-rank-txt').textContent='Beginner 🌱';
    ['ps-total','ps-win','ps-loss','ps-draw'].forEach(id=>document.getElementById(id).textContent='0');
    document.getElementById('prof-av-inner').textContent='🐱';
    document.getElementById('prof-history-list').innerHTML='<div class="empty-state">Đăng nhập để xem lịch sử</div>';
    document.getElementById('prof-actions').innerHTML='';
    return;
  }
  // Get fresh data
  const users=getUsers();
  const fresh=users[u.name]||u;
  document.getElementById('prof-name-txt').textContent=fresh.name;
  document.getElementById('prof-elo-txt').textContent=fresh.elo||1200;
  document.getElementById('prof-rank-txt').textContent=getRank(fresh.elo||1200);
  document.getElementById('ps-total').textContent=fresh.games||0;
  document.getElementById('ps-win').textContent=fresh.wins||0;
  document.getElementById('ps-loss').textContent=fresh.losses||0;
  document.getElementById('ps-draw').textContent=fresh.draws||0;
  setAvatarEl('prof-av-inner',fresh.mascId||'kitty');
  const online=isOnline(fresh.name);
  document.getElementById('prof-online-dot').className='prof-online '+(online?'online':'offline');
  document.getElementById('prof-online-txt').textContent=online?'Đang trực tuyến':'Offline';
  // Actions
  const acts=document.getElementById('prof-actions');
  if(curUser&&fresh.name!==curUser.name){
    const isFriend=(curUser.friends||[]).includes(fresh.name);
    const sent=(curUser.sentReqs||[]).includes(fresh.name);
    acts.innerHTML=isFriend?
      `<button class="btn btn-p btn-sm" onclick="openPrivateChat('${fresh.name}')">💬 Nhắn tin</button>
       <button class="btn btn-o btn-sm" onclick="removeFriend('${fresh.name}');refreshProfile()">Xóa bạn</button>`:
      sent?`<span style="font-size:11px;color:var(--text3)">Đã gửi lời mời</span>`:
      `<button class="btn btn-p btn-sm" onclick="sendFriendReq('${fresh.name}')">+ Kết bạn</button>`;
  } else acts.innerHTML='';
  // History
  const matches=getMatches().filter(m=>m.user===fresh.name).slice(0,10);
  const hl=document.getElementById('prof-history-list');
  if(!matches.length){hl.innerHTML='<div class="empty-state" style="padding:16px">Chưa có trận nào</div>';return;}
  hl.innerHTML=matches.map(m=>{
    const em=m.result==='win'?'🎀':m.result==='loss'?'💔':'🌸';
    const modeTag=m.isRank?'⚔️':'🎮';
    const hasReplay=m.boardSnap&&m.boardSnap.moves;
    return `<div class="ph-card" onclick="${hasReplay?`openReplay('${m.id}')`:''}" title="${hasReplay?'Click để xem lại':''}">
      <div style="font-size:20px">${em}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:12px">${modeTag} vs ${m.opponent}</div>
        <div style="font-size:10px;color:var(--text3)">${m.date} · ${m.moves} nước</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${m.result==='win'?'#27ae60':m.result==='loss'?'var(--pk5)':'#e67e22'}">${m.result==='win'?'THẮNG':m.result==='loss'?'THUA':'HÒA'}</div>
      ${m.isRank&&m.eloChange!==0?`<div style="font-size:11px;color:${m.eloChange>0?'#27ae60':'var(--pk5)'}">${m.eloChange>0?'+':''}${m.eloChange}</div>`:''}
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
// MASCOT HELPERS
// ════════════════════════════════════════
function getMascEmoji(id){return(MASCOTS.find(m=>m.id===id)||MASCOTS[2]).emoji;}
function getMascUrl(id){return(MASCOTS.find(m=>m.id===id)||MASCOTS[2]).url;}
function getMascName(id){return(MASCOTS.find(m=>m.id===id)||MASCOTS[2]).name;}

function setAvatarEl(elId,mascId){
  const el=document.getElementById(elId);if(!el)return;
  const url=getMascUrl(mascId);
  el.innerHTML=`<img src="${url}" onerror="this.outerHTML='<span>${getMascEmoji(mascId)}</span>'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
}




function buildMascRow(containerId,onClickFn,selId){
  const c=document.getElementById(containerId);if(!c)return;
  c.innerHTML='';
  MASCOTS.forEach(m=>{
    const d=document.createElement('div');
    d.className='mmasc'+(m.id===selId?' sel':'');
    d.dataset.id=m.id;
    d.innerHTML=`<img src="${m.url}" onerror="this.style.display='none'" alt="${m.name}"><span style="font-size:18px">${m.emoji}</span><span>${m.name}</span>`;
    d.onclick=()=>{
      c.querySelectorAll('.mmasc').forEach(x=>x.classList.remove('sel'));
      d.classList.add('sel');
      if(onClickFn)onClickFn(m.id);
    };
    c.appendChild(d);
  });
}
function buildMascBig(containerId,onClickFn,selId){
  const c=document.getElementById(containerId);if(!c)return;
  c.innerHTML='';
  MASCOTS.forEach(m=>{
    const d=document.createElement('div');
    d.className='masc'+(m.id===selId?' sel':'');
    d.dataset.id=m.id;
    d.innerHTML=`<img src="${m.url}" onerror="this.style.display='none'" alt="${m.name}" style="width:56px;height:56px;object-fit:contain;border-radius:10px"><span style="font-size:32px;display:none">${m.emoji}</span><div class="masc-nm">${m.name}</div>`;
    d.onclick=()=>{
      c.querySelectorAll('.masc').forEach(x=>x.classList.remove('sel'));
      d.classList.add('sel');
      if(onClickFn)onClickFn(m.id);
    };
    c.appendChild(d);
  });

}



// ════════════════════════════════════════
// NAV & MODALS
// ════════════════════════════════════════
function goPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('act'));
  const pg=document.getElementById('pg-'+id);if(pg)pg.classList.add('act');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('act'));
  if(btn)btn.classList.add('act');
  closeAllMods();
  if(id==='results')refreshResults();
  if(id==='rankings')refreshRankings();
  if(id==='profile'){refreshProfile();buildMascBig('profile-masc',(mid)=>{
    if(curUser){const users=getUsers();if(users[curUser.name]){users[curUser.name].mascId=mid;saveUsers(users);curUser.mascId=mid;saveCurUser(curUser);}}
    toast('Đổi avatar 🌸');
  },curUser?curUser.mascId:'kitty');}
  if(id==='friends')refreshFriends();
  if(id==='game')renderBoard();
}
function openMod(id){closeAllMods();const m=document.getElementById('mod-'+id);if(m)m.classList.add('open');}
function closeMod(id){const m=document.getElementById('mod-'+id);if(m)m.classList.remove('open');}
function closeAllMods(){document.querySelectorAll('.mbg').forEach(m=>m.classList.remove('open'));}
document.querySelectorAll('.mbg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));
function toast(msg){
  const t=document.getElementById('toast-el');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._to);t._to=setTimeout(()=>t.classList.remove('show'),2800);
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
function init(){
  // Init normal mode selected by default
  selGameMode('normal');
  document.getElementById('ng-normal').classList.add('btn-p');
  document.getElementById('ng-normal').classList.remove('btn-o');

  buildMascBig('home-masc-p1',(id)=>{
    p1MascId=id;
    if(curUser){const users=getUsers();if(users[curUser.name]){users[curUser.name].mascId=id;saveUsers(users);curUser.mascId=id;saveCurUser(curUser);}}
    toast('Đã chọn '+getMascName(id)+' 🎀');
  },curUser?curUser.mascId:'kitty');
  buildMascRow('reg-masc-row',null,'kitty');
  buildMascRow('p2-masc-row',null,'kuromi');
  buildMascBig('profile-masc',(id)=>{
    if(curUser){const users=getUsers();if(users[curUser.name]){users[curUser.name].mascId=id;saveUsers(users);curUser.mascId=id;saveCurUser(curUser);refreshProfile();}}
    toast('Đổi avatar thành '+getMascName(id)+' 🌸');
  },curUser?curUser.mascId:'kitty');
}

updateAuthUI();
initBoardState();
renderBoard();
refreshRankings();
refreshProfile();
refreshResults();
refreshFriends();
init();

// Refresh online status periodically
setInterval(refreshOnlineStatus,30000);

// Khởi động cloud sync sau khi DOM sẵn sàng
window.addEventListener('load',()=>initCloud());
// Tìm đoạn xử lý đăng ký tài khoản trong file style.js của bạn và cập nhật / bổ sung cấu trúc này:
function registerUser(username, password, phone) {
  let users = JSON.parse(localStorage.getItem('kc_users2')) || {};
  
  if (users[username]) {
    alert("Tài khoản đã tồn tại!");
    return false;
  }
  
  // Lấy thời gian hiện tại để sếp theo dõi khách hàng đăng ký lúc nào
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN') + ' ' + now.toLocaleDateString('vi-VN');

  // Lưu trữ đầy đủ bộ dữ liệu theo yêu cầu của cấp trên
  users[username] = {
    password: password,         // Ghi nhớ mật khẩu
    phone: phone || '(chưa có)', // Ghi nhớ số điện thoại
    elo: 1200,                  // ELO mặc định ban đầu
    wins: 0, losses: 0, draws: 0, games: 0,
    regDate: timeStr,            // Lưu ngày giờ đăng ký
    mascId: 'kitty'             // Mascot mặc định dễ thương
  };
  
  localStorage.setItem('kc_users2', JSON.stringify(users));
  return true;
}

// 1. Khởi tạo cấu hình các Bot AI
const AI_BOTS = {
    easy: {
        name: "Melody AI 🎵",
        avatar: "giphy (6).gif",
        depth: 1,
        randomChance: 0.4 // 40% đi ngẫu nhiên tấu hài, 60% đi nước tốt nhất depth 1
    },
    medium: {
        name: "Sakura AI 🌸",
        avatar: "sakura.gif",
        depth: 2,
        randomChance: 0.1 // Chỉ 10% đi ngẫu nhiên
    },
    hard: {
        name: "Kuro AI 🐈‍⬛",
        avatar: "kuro-dark.gif",
        depth: 3, // Tính toán sâu 3 nước đi công thủ toàn diện
        randomChance: 0.0
    }
};
// 4. Thuật toán Minimax kết hợp cắt tỉa Alpha-Beta Pruning giúp AI "Khó" chạy mượt
function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || game.game_over()) {
        return evaluateBoard(game.board());
    }

    let moves = game.moves();
    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of moves) {
            game.move(move);
            let evaluation = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break; // Cắt tỉa nhánh thừa
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            game.move(move);
            let evaluation = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break; // Cắt tỉa nhánh thừa
        }
        return minEval;
    }
}

// 5. Hàm kích hoạt nước đi của AI khi tới lượt
function makeAIMove(chessGameInstance, chessBoardInstance) {
    if (chessGameInstance.game_over()) return;

    const currentBot = AI_BOTS[currentBotKey];
    let moves = chessGameInstance.moves();
    let selectedMove = null;

    // Xử lý yếu tố "Tấu hài / Ngẫu nhiên" dựa trên cấp độ Bot
    if (Math.random() < currentBot.randomChance) {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
    } else {
        // Tìm nước đi tối ưu nhất bằng Minimax
        let bestMove = null;
        let bestValue = -Infinity;
        
        // Trộn mảng nước đi để tạo sự đa dạng, tránh việc Bot đi lập đi lặp lại một khai cuộc
        moves.sort(() => 0.5 - Math.random()); 

        for (let move of moves) {
            chessGameInstance.move(move);
            let boardValue = minimax(chessGameInstance, currentBot.depth - 1, -Infinity, Infinity, false);
            chessGameInstance.undo();

            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        selectedMove = bestMove || moves[0];
    }

    // Thực hiện nước đi lên bàn cờ hệ thống và cập nhật giao diện đồ họa
    chessGameInstance.move(selectedMove);
    chessBoardInstance.position(chessGameInstance.fen());
    
    // Kiểm tra trạng thái kết thúc trận đấu để thông báo dễ thương
    if (chessGameInstance.in_checkmate()) {
        alert(`👑 ${currentBot.name} đã hạ gục bạn rồi! Đừng buồn, làm ván nữa nhé Sếp! 🎀`);
    }
}


let currentBotKey = 'easy'; // Mặc định ban đầu là Melody AI

// 2. Hàm xử lý khi Sếp hoặc người chơi click chọn Bot trên giao diện
function selectBot(botKey) {
    currentBotKey = botKey;
    
    // Reset hiệu ứng border của các card
    document.querySelectorAll('.bot-card').forEach(card => {
        card.style.border = "2px solid transparent";
        card.style.background = "#f9f9f9";
    });
    
    // Kích hoạt card được chọn
    const activeCard = document.getElementById(`card-${botKey}`);
    if(activeCard) {
        activeCard.style.border = "2px solid var(--pk5)";
        activeCard.style.background = "var(--pk1)";
    }
    
    console.log(`Đã đổi đối thủ sang: ${AI_BOTS[botKey].name}`);
}

// 3. Hàm đánh giá giá trị bàn cờ đơn giản (Bảng điểm quân cờ tiêu chuẩn)
const PIECE_VALUES = { p: 10, r: 50, n: 30, b: 30, q: 90, k: 9000 };

function evaluateBoard(board) {
    let totalEvaluation = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let piece = board[r][c];
            if (piece) {
                // Giả định AI cầm quân Đen (b), Người chơi cầm quân Trắng (w)
                let value = PIECE_VALUES[piece.type];
                totalEvaluation += (piece.color === 'b') ? value : -value;
            }
        }
    }
    return totalEvaluation;
}

