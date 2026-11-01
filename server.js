'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT) || 3000;
const WIDTH = 960, FLOOR = 420, TICK = 1000 / 30;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/', (_req, res) => res.render('index', { title: 'Shadow Strike' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const rooms = new Map();
const makeFighter = (playerNo, x) => ({
  playerNo, x, y: FLOOR, vx: 0, vy: 0, face: playerNo === 1 ? 1 : -1,
  hp: 100, grounded: true, blocking: false, attack: null, attackTicks: 0,
  hitDone: false, cooldown: 0, stun: 0, walk: 0,
  input: { left:false,right:false,jump:false,punch:false,kick:false,block:false },
  previous: { jump:false,punch:false,kick:false }
});
const makeRoom = id => ({ id, players: [], fighters:[makeFighter(1,260),makeFighter(2,700)], started:false, over:false, time:99, ticks:0 });
const snapshot = room => ({ roomId:room.id, started:room.started, over:room.over, time:room.time,
  fighters:room.fighters.map(({playerNo,x,y,face,hp,grounded,blocking,attack,walk})=>({playerNo,x,y,face,hp,grounded,blocking,attack,walk})) });
const sendState = room => io.to(room.id).emit('game:state', snapshot(room));
function finish(room, winner) {
  if (room.over) return;
  room.over = true; room.started = false;
  io.to(room.id).emit('game:over', { winner, message:winner ? `Player ${winner} wins!` : 'Draw!' });
}
function beginAttack(a, kind) {
  if (a.attack || a.cooldown || a.stun || a.hp <= 0) return;
  a.attack = kind; a.attackTicks = kind === 'kick' ? 14 : 11; a.hitDone = false;
  a.cooldown = kind === 'kick' ? 26 : 19;
}
function combatHit(room, a, d) {
  if (!a.attack || a.hitDone) return;
  const active = a.attackTicks <= (a.attack === 'kick' ? 10 : 8);
  if (!active) return;
  a.hitDone = true;
  const range = a.attack === 'kick' ? 112 : 88;
  if (Math.abs(a.x-d.x) > range || (d.x-a.x)*a.face <= 0 || Math.abs(a.y-d.y)>100) return;
  const damage = d.blocking ? 2 : a.attack === 'kick' ? 14 : 9;
  d.hp = Math.max(0,d.hp-damage); d.stun = d.blocking ? 5 : 11;
  d.vx = a.face * (d.blocking ? 1.5 : a.attack === 'kick' ? 6 : 4.5);
  if (!d.hp) finish(room, d.playerNo === 1 ? 2 : 1);
}
function update(room) {
  if (!room.started || room.over) return;
  room.ticks++;
  if (room.ticks % 30 === 0 && --room.time <= 0) {
    finish(room, room.fighters[0].hp === room.fighters[1].hp ? null : room.fighters[0].hp > room.fighters[1].hp ? 1 : 2); return;
  }
  for (let i=0;i<2;i++) {
    const p=room.fighters[i], opponent=room.fighters[1-i], input=p.input;
    p.face = p.x <= opponent.x ? 1 : -1;
    p.blocking = !!input.block && p.grounded && !p.attack && p.stun===0;
    if (p.cooldown>0) p.cooldown--;
    if (p.attackTicks>0) { p.attackTicks--; combatHit(room,p,opponent); if (p.attackTicks===0) p.attack=null; }
    if (room.over) return;
    if (p.stun>0) { p.stun--; p.vx*=0.86; }
    else if (!p.attack) {
      p.vx = p.blocking ? 0 : (Number(input.right)-Number(input.left))*3.8;
      if (input.jump && !p.previous.jump && p.grounded && !p.blocking) { p.vy=-12.5; p.grounded=false; }
      if (input.punch && !p.previous.punch) beginAttack(p,'punch');
      else if (input.kick && !p.previous.kick) beginAttack(p,'kick');
      p.walk += Math.abs(p.vx)*0.12;
    }
    p.previous={...input};
    p.x=Math.max(45,Math.min(WIDTH-45,p.x+p.vx));
    p.y+=p.vy; p.vy+=0.55;
    if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.grounded=true;}
  }
  sendState(room);
}
setInterval(()=>rooms.forEach(update),TICK);

io.on('connection', socket => {
  let roomId=null, playerNo=null;
  function leaveRoom(notify=true) {
    if(!roomId) return;
    const id=roomId, room=rooms.get(id);
    roomId=null; playerNo=null;
    if(!room) return;
    room.players=room.players.filter(pid=>pid!==socket.id);
    socket.leave(id);
    if(room.players.length===0) rooms.delete(id);
    else {
      room.started=false; room.over=false;
      room.players.forEach(pid=>{ if(notify) io.to(pid).emit('match:opponent-left'); });
    }
  }
  socket.on('match:join',()=>{
    if(roomId) return;
    let room=[...rooms.values()].find(r=>!r.started&&!r.over&&r.players.length===1);
    if(!room){let id;do{id=Math.random().toString(36).slice(2,8).toUpperCase()}while(rooms.has(id));room=makeRoom(id);rooms.set(id,room);}
    roomId=room.id; playerNo=room.players.length+1; room.players.push(socket.id); socket.join(roomId);
    socket.emit('match:assigned',{roomId,playerNo});
    io.to(roomId).emit('match:players',{count:room.players.length});
    if(room.players.length===2){room.started=true;room.over=false;room.time=99;room.ticks=0;room.fighters=[makeFighter(1,260),makeFighter(2,700)];io.to(roomId).emit('match:start',{roomId});sendState(room);}
  });
  socket.on('fighter:input',input=>{
    if(!roomId||!playerNo||!input||typeof input!=='object')return;
    const room=rooms.get(roomId); if(!room||!room.started)return;
    const fighter=room.fighters[playerNo-1]; if(!fighter)return;
    for(const key of ['left','right','jump','punch','kick','block'])fighter.input[key]=input[key]===true;
  });
  socket.on('match:leave',()=>leaveRoom());
  socket.on('disconnect',()=>leaveRoom());
});
server.listen(PORT,()=>console.log(`Shadow Strike listening on http://localhost:${PORT}`));
