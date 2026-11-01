# Shadow Strike — Node.js + EJS

A browser-based 2D fighting game with an Express server, EJS-rendered frontend, and Socket.IO matchmaking / realtime opponent-state relay.

## Requirements
- Node.js 18 or newer
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000 in two browser tabs or on two devices on the same network. Click **Find Match** in each tab. The server pairs players into a room.

## Controls
| Action | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Punch | F | K |
| Kick | G | L |
| Block | H | ; |

## Project structure
- `server.js` — Express app, routes, Socket.IO room matchmaking
- `views/index.ejs` — EJS page template
- `public/css/style.css` — responsive styling
- `public/js/game.js` — canvas game and Socket.IO client

## Deploy
Run on a Node.js host with a persistent WebSocket-capable service. Set `PORT` if required by your host.

> Prototype note: this is a playable networking foundation. Client movement and combat are currently client-simulated and relayed; for competitive play, move physics, hit validation, health, and match results to an authoritative server.
