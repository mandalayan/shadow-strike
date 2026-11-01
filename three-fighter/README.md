# Shadow Strike — Three.js Multiplayer

A 3D browser-based hand-to-hand combat prototype. Uses Three.js for the arena and fighters, Express to serve the client, and Socket.IO for room-based multiplayer.

## Run locally
Requires Node.js 18+.
```bash
cd three-fighter
npm install
npm start
``
Open http://localhost:3001 in two browsers. One player creates a room and shares the 6-character code; the other joins with that code.

## Controls
- Move: A/D or Left/Right
- Jump: W, Space, or Up
- Punch: J
- Kick: K
- Block: L

## Notes
Prototype uses server-side room management and simple hit validation. For public production, add authoritative physics, rate limiting, reconnect handling, matchmaking protections, and deployment with WebSocket support.
