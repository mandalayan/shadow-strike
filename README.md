# Shadow Strike — Node.js, Express, EJS + Socket.IO

A 2D hand-to-hand fighting game with browser-rendered canvas graphics and server-authoritative multiplayer simulation.

## Requirements
- Node.js 18+
- npm

## Start
```bash
npm install
npm start
```
Visit http://localhost:3000 in two browser tabs (or two devices on the same network), then click **Find Match** in both. The server pairs players into a room.

## Controls
| Action | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Punch | F | K |
| Kick | G | L |
| Block | H | ; |

## Project layout
- `server.js`: Express routes, Socket.IO matchmaking, authoritative physics/combat/timer
- `views/index.ejs`: EJS page template
- `public/css/style.css`: responsive styling
- `public/js/game.js`: keyboard input, canvas rendering, Socket.IO client

## Deploy
Deploy to a Node.js host that supports persistent WebSocket connections. Set the `PORT` environment variable if needed. The `/health` endpoint returns a simple readiness status.

## Prototype notes
This is a working multiplayer foundation. It validates game movement and combat on the server. It does not yet include accounts, matchmaking queues across regions, ranked play, anti-cheat hardening, or lag compensation.
