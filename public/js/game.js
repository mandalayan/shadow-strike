(() => {
  const socket = io();
  const canvas = document.querySelector('#arena'), ctx = canvas.getContext('2d');
  const W=canvas.width,H=canvas.height,FLOOR=420,keys=new Set();
  const status=document.querySelector('#status'),join=document.querySelector('#join');
  let playerNo=null,roomId=null,playing=false,started=false,time=99,last=performance.now(),tick=0;
  const fighter=(x,color,face)=>({x,y:FLOOR,vx:0,vy:0,color,face,hp:100,ground:true,block:false,attack:null,attackT:0,stun:0,walk:0});
  const fighters=[fighter(260,'#42d9ff',1),fighter(700,'#ff5578',-1)];
  const controls=[{left:'a',right:'d',jump:'w',punch:'f',kick:'g',block:'h'},{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',punch:'k',kick:'l',block:';'}];
  const local=()=>fighters[(playerNo||1)-1],remote=()=>fighters[playerNo===1?1:0];
  join.onclick=()=>{join.disabled=true;status.textContent='Looking for an opponent…';socket.emit('match:join')};
  addEventListener('keydown',e=>{keys.add(e.key);if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault()});
  addEventListener('keyup',e=>keys.delete(e.key));
  socket.on('match:assigned',d=>{roomId=d.roomId;playerNo=d.playerNo;status.textContent='Room '+roomId+' · You are Player '+playerNo+'. Waiting for opponent…'});
  socket.on('match:players',d=>{if(d.count===1)status.textContent='Waiting for another fighter to join…'});
  socket.on('match:start',()=>{started=true;playing=true;time=99;status.textContent='FIGHT!';});
  socket.on('fighter:remote',d=>applyRemote(d.input));
  socket.on('match:opponent-left',()=>{started=false;playing=false;status.textContent='Opponent left the match. Find a new match.';join.disabled=false});
  function send(type){if(started)socket.emit('fighter:input',type)}
  function applyRemote(input){const p=remote();if(input.type==='move'){p.x=input.x;p.y=input.y;p.face=input.face;p.block=input.block;p.attack=input.attack;p.walk=input.walk}}
  function update(p,o,c,dt,isLocal){
    if(p.stun>0){p.stun-=dt;p.vx*=.9}else if(!p.attack){
      p.vx=((keys.has(c.left)?-1:0)+(keys.has(c.right)?1:0))*3.8;
      if(p.vx)p.face=p.x<o.x?1:-1;
      p.walk+=Math.abs(p.vx)*dt*.12;
      if(keys.has(c.jump)&&p.ground){p.vy=-12.5;p.ground=false}
      p.block=keys.has(c.block)&&p.ground;
      const action=keys.has(c.punch)?'punch':keys.has(c.kick)?'kick':null;
      if(action){p.attack=action;p.attackT=action==='kick'?23:17;const reach=action==='kick'?94:74;if(Math.abs(p.x-o.x)<reach&&(o.x-p.x)*p.face>0&&Math.abs(p.y-o.y)<90){o.hp=Math.max(0,o.hp-(o.block?2:action==='kick'?13:8));o.stun=o.block?5:12;o.vx=p.face*(o.block?2:action==='kick'?7:4)}}
    }
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.55*dt;if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.ground=true}p.x=Math.max(45,Math.min(W-45,p.x));if(p.attackT>0){p.attackT-=dt;if(p.attackT<=0)p.attack=null}
    if(isLocal)send({type:'move',x:p.x,y:p.y,face:p.face,block:p.block,attack:p.attack,walk:p.walk});
  }
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
  function drawFighter(p,n){ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.face,1);ctx.globalAlpha=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,2,38,9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;const bob=p.ground&&Math.abs(p.vx)>.2?Math.sin(p.walk)*4:0;rect(-20,-58+bob,18,54,p.color);rect(3,-58-bob,17,54,p.color);rect(-24,-112,49,57,p.color);rect(-28,-119,57,9,'#eaf5ff');ctx.fillStyle='#f0c6a1';ctx.beginPath();ctx.arc(0,-135,23,0,Math.PI*2);ctx.fill();rect(-23,-151,46,13,'#172033');rect(8,-139,5,4,'#111827');rect(17,-105,18,43,p.color);rect(22+(p.attack?38:0),-100,15,34,p.color);if(p.attack==='kick'){rect(3,-30,64,16,p.color);rect(61,-32,18,13,'#f0c6a1')}if(p.block){rect(28,-133,14,43,p.color);rect(29,-143,19,13,'#f0c6a1')}ctx.restore();ctx.fillStyle='#dcecff';ctx.font='bold 13px Rajdhani';ctx.textAlign='center';ctx.fillText('P'+n,p.x,p.y-180)}
  function background(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#101c32');g.addColorStop(1,'#27344a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<16;i++){const x=i*66;rect(x,220+(i%4)*22,48,200,'#17263b');for(let j=0;j<3;j++)rect(x+8+j*12,238+(i%4)*22,5,8,'#3a5974')}rect(0,FLOOR+4,W,H-FLOOR,'#121b2b');rect(0,FLOOR,W,4,'#65d8ef');ctx.fillStyle='#dceeff';ctx.font='bold 12px Rajdhani';ctx.fillText('SHADOW DISTRICT // FIGHT NIGHT',18,25)}
  function frame(now){const dt=Math.min((now-last)/16.67,2);last=now;tick+=dt;if(started&&playing){update(local(),remote(),controls[playerNo-1],dt,true);if(tick>60){time--;tick=0;if(time<=0){playing=false;status.textContent='TIME! Match over.'}}}background();drawFighter(fighters[0],1);drawFighter(fighters[1],2);document.querySelector('#hp1').style.width=fighters[0].hp+'%';document.querySelector('#hp2').style.width=fighters[1].hp+'%';document.querySelector('#clock').textContent=time;requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();