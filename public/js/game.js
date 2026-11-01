(() => {
  'use strict';
  const socket=io(),canvas=document.querySelector('#arena'),ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height,FLOOR=420,keys=new Set();
  const status=document.querySelector('#status'),createBtn=document.querySelector('#create-room'),joinBtn=document.querySelector('#join-room'),codeInput=document.querySelector('#room-code'),roomInfo=document.querySelector('#room-info');
  const controls=[{left:'KeyA',right:'KeyD',jump:'KeyW',punch:'KeyF',kick:'KeyG',block:'KeyH'},{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',punch:'KeyK',kick:'KeyL',block:'Semicolon'}];
  let playerNo=null,roomId=null,started=false,state=null,clock=99;
  createBtn.addEventListener('click',()=>{if(!socket.connected){status.textContent='Connecting to server…';return;}createBtn.disabled=true;joinBtn.disabled=true;socket.emit('room:create');});
  joinBtn.addEventListener('click',()=>{const code=codeInput.value.trim().toUpperCase();if(!socket.connected){status.textContent='Connecting to server…';return;}if(!code){status.textContent='Enter a room code first.';return;}createBtn.disabled=true;joinBtn.disabled=true;socket.emit('room:join',code);});
  codeInput.addEventListener('input',()=>{codeInput.value=codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);});
  codeInput.addEventListener('keydown',e=>{if(e.key==='Enter')joinBtn.click();});
  addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;keys.add(e.code);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();});
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  socket.on('connect',()=>{status.textContent='Connected. Create a room or enter a room code.';});
  socket.on('connect_error',()=>{status.textContent='Could not connect. Check that the Node server is running.';createBtn.disabled=false;joinBtn.disabled=false;});
  socket.on('disconnect',()=>{started=false;keys.clear();status.textContent='Disconnected from server. Refresh to reconnect.';createBtn.disabled=false;joinBtn.disabled=false;});
  socket.on('room:created',d=>{roomInfo.textContent='Share this code with your opponent: '+d.roomId;roomInfo.classList.add('room-code-ready');});
  socket.on('room:error',d=>{createBtn.disabled=false;joinBtn.disabled=false;status.textContent=d.message;});
  socket.on('match:assigned',d=>{roomId=d.roomId;playerNo=d.playerNo;roomInfo.textContent='Room code: '+roomId+' · Player '+playerNo;status.textContent='Room '+roomId+' · Waiting for opponent';});
  socket.on('match:players',d=>{if(d.count===1)status.textContent='Waiting for another fighter to join…';});
  socket.on('match:start',()=>{started=true;status.textContent='FIGHT!';roomInfo.textContent='Room '+roomId+' · Match in progress';});
  socket.on('game:state',s=>{state=s;clock=s.time;});
  function resetForQueue(message){started=false;state=null;playerNo=null;roomId=null;keys.clear();createBtn.disabled=false;joinBtn.disabled=false;status.textContent=message;roomInfo.textContent='Create a room or join with a room code.';}
  socket.on('game:over',d=>{socket.emit('match:leave');resetForQueue(d.message+' — Create or join another room.');});
  socket.on('match:opponent-left',()=>{socket.emit('match:leave');resetForQueue('Opponent disconnected. Create or join a room.');});
  setInterval(()=>{if(!started||!playerNo||!socket.connected)return;const c=controls[playerNo-1],down=code=>keys.has(code);socket.emit('fighter:input',{left:down(c.left),right:down(c.right),jump:down(c.jump),punch:down(c.punch),kick:down(c.kick),block:down(c.block)});},1000/60);
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function line(x1,y1,x2,y2,color,width=9){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1326');g.addColorStop(.6,'#1b2b43');g.addColorStop(1,'#3a4250');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Distant skyline, hazy floodlights and arena rails.
    for(let i=0;i<16;i++){const x=i*66,h=95+(i*37%125);rect(x,330-h,48,h,'#111d30');for(let j=0;j<3;j++)rect(x+8+j*12,348-h,4,7,'#52647b');}
    const glow=ctx.createRadialGradient(480,230,10,480,230,430);glow.addColorStop(0,'#59728a22');glow.addColorStop(1,'#07101a00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    rect(0,FLOOR+2,W,H-FLOOR,'#101824');rect(0,FLOOR,W,3,'#75dff4');for(let i=0;i<10;i++)line(i*110,FLOOR+4,i*110+70,H,'#253449',1);
    ctx.fillStyle='#dceeff';ctx.font='bold 12px Rajdhani, sans-serif';ctx.fillText('SHADOW DISTRICT // FIGHT NIGHT',18,25);
  }
  function drawFighter(p){
    const color=p.color,skin='#d5a17f',dark='#111827',bob=p.grounded?Math.sin(p.walk||0)*2.5:0;
    const stride=p.grounded?Math.sin(p.walk||0)*13:0,attack=p.attack,guard=p.blocking;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.face||1,1);
    ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,2,38,9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Feet and legs use jointed strokes for a more readable fighting silhouette.
    line(-10,-37+bob, -13+stride*.45,-10, dark,15);line(-13+stride*.45,-10,-25+stride*.45,-3,color,12);
    line(10,-37-bob,13-stride*.45,-10,dark,15);line(13-stride*.45,-10,25-stride*.45,-3,color,12);
    // Torso, belt, shoulders.
    rect(-19,-100+bob,38,63,color);rect(-20,-44,40,8,'#d8dce4');rect(-18,-96,36,5,'#ffffff33');
    ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-119+bob,19,0,Math.PI*2);ctx.fill();
    rect(-20,-137+bob,40,9,dark);rect(-19,-126+bob,38,4,'#f3e5d7');rect(5,-122+bob,4,3,dark);
    // Arms pose differently for neutral, punch and guard.
    if(guard){line(-15,-88,-29,-116,color,13);line(-29,-116,-17,-132,skin,11);line(15,-88,28,-112,color,13);line(28,-112,17,-128,skin,11);}
    else if(attack==='punch'){line(-15,-88,-28,-72,color,13);line(-28,-72,-18,-62,skin,11);line(15,-88,37,-87,color,13);line(37,-87,64,-88,skin,12);}
    else {line(-15,-88,-28,-69,color,13);line(-28,-69,-22,-55,skin,11);line(15,-88,29,-68,color,13);line(29,-68,22,-54,skin,11);}
    if(attack==='kick'){line(10,-38,38,-30,color,15);line(38,-30,66,-30,skin,12);}
    ctx.restore();
    ctx.fillStyle='#dcecff';ctx.font='bold 13px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText('P'+p.playerNo,p.x,p.y-177);
    if(p.stun>0){ctx.fillStyle='#fff4b0';ctx.font='bold 20px sans-serif';ctx.fillText('✦',p.x+22,p.y-158);}
  }
  function render(){drawBackground();if(state){state.fighters.forEach(p=>drawFighter({...p,color:p.playerNo===1?'#42d9ff':'#ff5578'}));document.querySelector('#hp1').style.width=state.fighters[0].hp+'%';document.querySelector('#hp2').style.width=state.fighters[1].hp+'%';document.querySelector('#clock').textContent=state.time;}else document.querySelector('#clock').textContent=clock;requestAnimationFrame(render);}
  requestAnimationFrame(render);
})();