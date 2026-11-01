import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(), http=createServer(app), io=new Server(http);
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
app.get("/health",(_,res)=>res.json({ok:true}));
const rooms=new Map();
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const spawn=(index)=>({x:index?3:-3,z:0,y:0,yaw:index?Math.PI:0,hp:100,attack:null,block:false});
io.on("connection",socket=>{
 socket.on("room:create",({name}={})=>{
  let id=code();while(rooms.has(id))id=code();
  const room={id,players:new Map(),started:false};rooms.set(id,room);
  join(socket,room,name||"Fighter");
 });
 socket.on("room:join",({code:raw,name}={})=>{
  const room=rooms.get(String(raw||"").trim().toUpperCase());
  if(!room){socket.emit("room:error","Room code not found.");return;}
  if(room.players.size>=2){socket.emit("room:error","That room is full.");return;}
  join(socket,room,name||"Fighter");
 });
 function join(s,room,name){
  if(room.players.size>=2){s.emit("room:error","That room is full.");return;}
  const index=room.players.size;room.players.set(s.id,{id:s.id,name:String(name).slice(0,18),...spawn(index)});
  s.join(room.id);s.data.room=room.id;
  s.emit("room:joined",{code:room.id,playerId:s.id,index});
  io.to(room.id).emit("room:state",{players:[...room.players.values()],started:room.players.size===2});
  if(room.players.size===2){room.started=true;io.to(room.id).emit("match:start");}
 }
 socket.on("input",input=>{
  const room=rooms.get(socket.data.room),p=room?.players.get(socket.id);if(!p||!room.started)return;
  const dt=0.055,move=Math.max(-1,Math.min(1,Number(input.move)||0));
  p.x=Math.max(-5,Math.min(5,p.x+move*dt*5));
  if(input.jump&&p.y<=0.01)p.vy=5.4;
  p.vy=(p.vy||0)-9.8*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;
  p.block=!!input.block;p.yaw=move>0?0:move<0?Math.PI:p.yaw;
  if(input.attack&&(!p.cooldown||Date.now()>p.cooldown)){
   p.attack=input.attack;p.cooldown=Date.now()+550;
   const other=[...room.players.values()].find(q=>q.id!==p.id);
   if(other&&Math.abs(other.x-p.x)<2.15&&Math.abs(other.y-p.y)<1.25&&!other.block){
    other.hp=Math.max(0,other.hp-(input.attack==="kick"?15:10));
   }
   setTimeout(()=>{if(room.players.has(p.id)){p.attack=null;io.to(room.id).emit("room:state",{players:[...room.players.values()],started:room.started});}},220);
  }
  io.to(room.id).emit("room:state",{players:[...room.players.values()],started:room.started});
  if([...room.players.values()].some(q=>q.hp<=0)){room.started=false;io.to(room.id).emit("match:end",{winner:[...room.players.values()].find(q=>q.hp>0)?.name||"Draw"});}
 });
 socket.on("disconnect",()=>{
  const id=socket.data.room,room=rooms.get(id);if(!room)return;
  room.players.delete(socket.id);io.to(id).emit("room:state",{players:[...room.players.values()],started:false});
  if(!room.players.size)rooms.delete(id);else io.to(id).emit("room:error","Opponent disconnected.");
 });
});
const port=process.env.PORT||3001;http.listen(port,()=>console.log("Shadow Strike Three listening on "+port));
