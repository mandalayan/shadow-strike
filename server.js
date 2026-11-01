const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });
const PORT = process.env.PORT || 3000;
const WIDTH = 960, FLOOR = 420, TICK_MS = 1000 / 30;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => res.render('index', { title: 'Shadow Strike' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const rooms = new Map();
const createFighter = (x, face, playerNo) => ({
  playerNo, x, y: FLOOR, vx: 0, vy: 0, face, hp: 100, grounded: true,
  blocking: false, attack: null, attackTicks: 0, cooldown: 0, stun: 0,
  input: { left: false, right: false, jump: false, punch: false, kick: false, block: false },
  previous: { jump: false, punch: false, kick: false }, walk: 0
});
function createRoom(id) {
  return { id, players: [], fighters: [createFighter(260, 1, 1), createFighter(700, -1, 2)], started: false, time: 99, tick: 0, over: false };
}
function publicState(room) {
  return { roomId: room.id, started: room.started, time: room.time, over: room.over,
    fighters: room.fighters.map(({ playerNo,x,y,face,hp,grounded,blocking,attack,walk }) =>
      ({ playerNo,x,y,face,hp,grounded,blocking,attack,walk })) };
}
function broadcast(room) { io.to(room.id).emit('game:state', publicState(room)); }
function finish(room, winner) {
  room.over = true; room.started = false;
  io.to(room.id).emit('game:over', { winner, message: winner ? `Player ${winner} wins!` : 'Draw!' });
}
function applyAttack(attacker, defender, kind) {
  if (attacker.attack || attacker.cooldown > 0 || attacker.stun > 0 || !roomCanFight(attacker)) return;
  attacker.attack = kind; attacker.attackTicks = kind === 'kick' ? 12 : 9; attacker.cooldown = kind === 'kick' ? 25 : 18;
  const reach = kind === 'kick' ? 94 : 74;
  if (Math.abs(attacker.x - defender.x) <= reach && (defender.x - attacker.x) * attacker.face > 0 && Math.abs(attacker.y - defender.y) < 90) {
    const damage = defender.blocking ? 2 : kind === 'kick' ? 13 : 8;
    defender.hp = Math.max(0, defender.hp - damage);
    defender.stun = defender.blocking ? 4 : 10;
    defender.vx = attacker.face * (defender.blocking ? 1.8 : kind === 'kick' ? 6.5 : 4);
    if (defender.hp === 0) return defender.playerNo === 1 ? 2 : 1;
  }
  return null;
}
function roomCanFight(f) { return f.hp > 0; }
function step(room) {
  if (!room.started || room.over) return;
  room.tick++;
  if (room.tick % 30 === 0) { room.time--; if (room.time <= 0) { finish(room, room.fighters[0].hp === room.fighters[1].hp ? null : room.fighters[0].hp > room.fighters[1].hp ? 1 : 2); return; } }
  for (let i = 0; i < 2; i++) {
    const p = room.fighters[i], o = room.fighters[1-i], input = p.input;
    p.face = p.x <= o.x ? 1 : -1;
    p.blocking = input.block && p.grounded && !p.attack;
    if (p.cooldown > 0) p.cooldown--;
    if (p.attackTicks > 0 && --p.attackTicks === 0) p.attack = null;
    if (p.stun > 0) { p.stun--; p.vx *= .88; }
    else if (!p.attack) {
      p.vx = (Number(input.right) - Number(input.left)) * 3.8;
      if (input.jump && !p.previous.jump && p.grounded) { p.vy = -12.5; p.grounded = false; }
      if (input.punch && !p.previous.punch) { const winner = applyAttack(p,o,'punch'); if (winner) { finish(room,winner); return; } }
      else if (input.kick && !p.previous.kick) { const winner = applyAttack(p,o,'kick'); if (winner) { finish(room,winner); return; } }
      p.walk += Math.abs(p.vx) * .12;
    }
    p.previous = { ...input };
    p.x = Math.max(45, Math.min(WIDTH-45, p.x + p.vx));
    p.y += p.vy; p.vy += .55;
    if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; p.grounded = true; }
  }
  broadcast(room);
}
setInterval(() => { for (const room of rooms.values()) step(room); }, TICK_MS);

io.on('connection', socket => {
  let roomId = null, playerNo = null;
  socket.on('match:join', () => {
    if (roomId) return;
    let room = [...rooms.values()].find(r => !r.started && !r.over && r.players.length === 1);
    if (!room) { roomId = Math.random().toString(36).slice(2,8).toUpperCase(); room = createRoom(roomId); rooms.set(roomId, room); }
    else roomId = room.id;
    playerNo = room.players.length + 1;
    room.players.push(socket.id); socket.join(roomId);
    socket.emit('match:assigned', { roomId, playerNo });
    io.to(roomId).emit('match:players', { count: room.players.length });
    if (room.players.length === 2) { room.started = true; room.time = 99; room.tick = 0; io.to(roomId).emit('match:start', { roomId }); broadcast(room); }
  });
  socket.on('fighter:input', input => {
    if (!roomId || !playerNo || !input || typeof input !== 'object') return;
    const f = rooms.get(roomId)?.fighters[playerNo-1]; if (!f) return;
    for (const key of ['left','right','jump','punch','kick','block']) f.input[key] = input[key] === true;
  });
  socket.on('match:leave', leaveRoom);
  socket.on('disconnect', leaveRoom);
  function leaveRoom() {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(id => id !== socket.id);
      if (room.players.length === 0) rooms.delete(roomId);
      else { room.started = false; room.over = false; room.players.forEach(id => io.to(id).emit('match:opponent-left')); }
    }
    socket.leave(roomId); roomId = null; playerNo = null;
  }
});

server.listen(PORT, () => console.log(`Shadow Strike running at http://localhost:${PORT}`));
