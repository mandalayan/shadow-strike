# Shadow Strike

A small 2D hand-to-hand fighting game made with HTML Canvas and vanilla JavaScript. It supports two players sharing one keyboard.

## Run it
Open `index.html` in a modern browser. No dependencies, build tools, or server are required.

## Controls
| Action | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | Left / Right |
| Jump | W | Up |
| Punch | F | K |
| Kick | G | L |
| Block | H | ; |

## Features
- Side-view arena with animated fighters
- Punches, kicks, jumping, blocking, hit stun and knockback
- Health bars, countdown timer, win and restart states
- Responsive layout

## GitHub Pages
After pushing the project to a GitHub repository, open **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/ (root)`, then save. The game will be hosted as a static site.

## Online multiplayer
This version is local multiplayer. Online matchmaking requires a server (for example, a Node.js WebSocket service) and is not included in this first build.
