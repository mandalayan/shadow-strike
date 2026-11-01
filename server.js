const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => res.render('index', { title: 'Shadow Strike' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const rooms = new Map();
const makeRoom = () => ({ players: [], started: false });

io.on('connection', socket => {
  let roomId = null;
  let playerNo = null;

  socket.on('match:join', () => {
    if (roomId) return;
    let roomEntry = [...rooms.entries()].find(([, room]) => room.players.length === 1 && !room.started);
    if (!roomEntry) {
      roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
      rooms.set(roomId, makeRoom());
    } else roomId = roomEntry[0];

    const room = rooms.get(roomId);
    playerNo = room.players.length + 1;
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit('match:assigned', { roomId, playerNo });
    io.to(roomId).emit('match:players', { count: room.players.length });
    if (room.players.length === 2) {
      room.started = true;
      io.to(roomId).emit('match:start', { roomId });
    }
  });

  socket.on('fighter:input', input => {
    if (!roomId || !playerNo || !input) return;
    socket.to(roomId).emit('fighter:remote', { playerNo, input });
  });

  socket.on('match:leave', leaveRoom);
  socket.on('disconnect', leaveRoom);

  function leaveRoom() {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(id => id !== socket.id);
      room.started = false;
      if (!room.players.length) rooms.delete(roomId);
      else io.to(roomId).emit('match:opponent-left');
    }
    socket.leave(roomId);
    roomId = null;
    playerNo = null;
  }
});

server.listen(PORT, () => console.log(`Shadow Strike listening on http://localhost:${PORT}`));