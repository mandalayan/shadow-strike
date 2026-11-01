(() => {
  'use strict';
  const socket=io(), canvas=document.querySelector('#arena'), ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height,FLOOR=420,keys=new Set();
  const status=document.querySelector('#status'),join=document.querySelector('#join');
  const controls=[{left:'a',right:'d',jump:'w',punch:'f',kick:'g',block:'h'},{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',punch:'k',kick:'l',block:';'}];
  let playerNo=null,roomId=null,started=false,state=null,clock=99;
  join.addEventListener('click',()=>{if(!socket.connected){status.textContent='Connecting to server…';return;}join.disabled=true;status.textContent='Finding an opponent…';socket.emit('match:join');});
  addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());keys.add(e.key);if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault();});
  addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());keys.delete(e.key);});
  addEventListener('blur',()=>keys.clear());
  socket.on('connect',()=>{status.textContent='Connected. Press Find Match to play.';});
  socket.on('connect_error',()=>{status.textContent='Could not connect. Check that the Node server is running.';join.disabled=false;});
  socket.on('disconnect',()=>{started=false;status.textContent='Disconnected from server. Refresh to reconnect.';join.disabled=false;});
  socket.on('match:assigned',d=>{roomId=d.roomId;playerNo=d.playerNo;status.textContent=`Room ${roomId} · Player ${playerNo} · Waiting for opponent`;});
  socket.on('match:players',d=>{if(d.count===1)status.textContent='Waiting for another fighter to join…';});
  socket.on('match:start',()=>{started=true;status.textContent='FIGHT!';join.textContent='MATCH IN PROGRESS';});
  socket.on('game:state',s=>{state=s;clock=s.time;});
  function resetForQueue(message){started=false;state=null;playerNo=null;roomId=null;join.disabled=false;join.textContent='FIND MATCH';status.textContent=message;}
  socket.on('game:over',d=>{status.textContent=d.message;socket.emit('match:leave');resetForQueue(d.message+' — Find another match.');});
  socket.on('match:opponent-left',()=>{socket.emit('match:leave');resetForQueue('Opponent disconnected. Find another match.');});
  setInterval(()=>{if(!started||!playerNo||!socket.connected)return;const c=controls[playerNo-1];const down=k=>keys.has(k)||keys.has(k.toLowerCase());socket.emit('fighter:input',{left:down(c.left),right:down(c.right),jump:down(c.jump),punch:down(c.punch),kick:down(c.kick),block:down(c.block)});},33);
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#101c32');g.addColorStop(1,'#27344a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<16;i++){const x=i*66;rect(x,220+(i%4)*22,48,200,'#17263b');for(let j=0;j<3;j++)rect(x+8+j*12,238+(i%4)*22,5,8,'#3a5974');}rect(0,FLOOR+4,W,H-FLOOR,'#121b2b');rect(0,FLOOR,W,4,'#65d8ef');ctx.fillStyle='#dceeff';ctx.font='bold 12px Rajdhani, sans-serif';ctx.fillText('SHADOW DISTRICT // FIGHT NIGHT',18,25);}
  function drawFighter(p){ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.face||1,1);ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,2,38,9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;const bob=p.grounded?Math.sin(p.walk||0)*2:0;rect(-20,-58+bob,18,54,p.color);rect(3,-58-bob,17,54,p.color);rect(-24,-112,49,57,p.color);rect(-28,-119,57,9,'#eaf5ff');ctx.fillStyle='#f0c6a1';ctx.beginPath();ctx.arc(0,-135,23,0,Math.PI*2);ctx.fill();rect(-23,-151,46,13,'#172033');rect(8,-139,5,4,'#111827');rect(17,-105,18,43,p.color);rect(22+(p.attack==='punch'?30:0),-100,15,34,p.color);if(p.attack==='kick'){rect(3,-30,64,16,p.color);rect(61,-32,18,13,'#f0c6a1');}if(p.blocking){rect(28,-133,14,43,p.color);rect(29,-143,19,13,'#f0c6a1');}ctx.restore();ctx.fillStyle='#dcecff';ctx.font='bold 13px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText('P'+p.playerNo,p.x,p.y-180);}
  function render(){drawBackground();if(state){state.fighters.forEach(p=>drawFighter({...p,color:p.playerNo===1?'#42d9ff':'#ff5578'}));document.querySelector('#hp1').style.width=state.fighters[0].hp+'%';document.querySelector('#hp2').style.width=state.fighters[1].hp+'%';document.querySelector('#clock').textContent=state.time;}else document.querySelector('#clock').textContent=clock;requestAnimationFrame(render);}
  requestAnimationFrame(render);
})();