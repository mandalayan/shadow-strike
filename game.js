(() => {
const canvas=document.querySelector('#arena'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,FLOOR=420,keys=new Set();
const status=document.querySelector('#status');
let time=99,ended=false,last=performance.now(),tick=0;
const make=(x,color,controls,face)=>({x,y:FLOOR,vx:0,vy:0,color,face,hp:100,ground:true,block:false,attack:null,attackT:0,stun:0,controls,walk:0});
let p1,p2;
function reset(){p1=make(260,'#42d9ff',{left:'a',right:'d',jump:'w',punch:'f',kick:'g',block:'h'},1);p2=make(700,'#ff5578',{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',punch:'k',kick:'l',block:';'},-1);time=99;ended=false;last=performance.now();status.textContent='FIGHT! First to empty the opponent\'s health bar wins.'}
addEventListener('keydown',e=>{keys.add(e.key);if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault()});
addEventListener('keyup',e=>keys.delete(e.key));document.querySelector('#reset').onclick=reset;
function hit(a,b,kind){if(a.attack||a.stun||ended)return;a.attack=kind;a.attackT=kind==='kick'?23:17;
 const reach=kind==='kick'?94:74,dist=Math.abs(a.x-b.x),facing=(b.x-a.x)*a.face>0;
 if(dist<reach&&facing&&Math.abs(a.y-b.y)<90){const damage=b.block?2:(kind==='kick'?13:8);b.hp=Math.max(0,b.hp-damage);b.stun=b.block?5:12;b.vx=a.face*(b.block?2:kind==='kick'?7:4);if(b.hp===0){ended=true;status.textContent=(a===p1?'PLAYER 1':'PLAYER 2')+' WINS! Press restart to fight again.'}}
}
function update(p,o,dt){if(ended)return;const c=p.controls;p.block=keys.has(c.block)&&p.ground&&!p.attack;
 if(p.stun>0){p.stun-=dt;p.vx*=.9}else if(!p.attack){p.vx=(keys.has(c.left)?-1:0)+(keys.has(c.right)?1:0);p.vx*=3.8;if(p.vx)p.face=p.x<o.x?1:-1;p.walk+=Math.abs(p.vx)*dt*.12;
 if(keys.has(c.jump)&&p.ground){p.vy=-12.5;p.ground=false}
 if(keys.has(c.punch))hit(p,o,'punch');else if(keys.has(c.kick))hit(p,o,'kick')}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.55*dt;if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.ground=true}
 p.x=Math.max(45,Math.min(W-45,p.x));if(p.attackT>0){p.attackT-=dt;if(p.attackT<=0)p.attack=null}
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function drawFighter(p,n){const x=p.x,y=p.y,face=p.face,active=p.attack!==null;
 ctx.save();ctx.translate(x,y);ctx.scale(face,1);
 // shadow
 ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,2,38,9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const bob=p.ground&&Math.abs(p.vx)>0.2?Math.sin(p.walk)*4:0;
 // legs and torso
 rect(-20,-58+bob,18,54,p.color);rect(3,-58-bob,17,54,p.color);
 rect(-24,-112,49,57,p.color);rect(-28,-119,57,9,'#eaf5ff');
 // head and hair
 ctx.fillStyle='#f0c6a1';ctx.beginPath();ctx.arc(0,-135,23,0,Math.PI*2);ctx.fill();rect(-23,-151,46,13,'#172033');
 // eyes
 rect(8,-139,5,4,'#111827');
 // arms
 const reach=active?(p.attack==='kick'?10:42):p.block?12:Math.sin(p.walk)*5;
 rect(17,-105,18,43,p.color);rect(22+reach,-100,15,34,p.color);
 if(active&&p.attack==='punch'){rect(30+reach,-97,24,16,'#f0c6a1')}
 if(active&&p.attack==='kick'){rect(3,-30,64,16,p.color);rect(61,-32,18,13,'#f0c6a1')}
 if(p.block){rect(28,-133,14,43,p.color);rect(29,-143,19,13,'#f0c6a1')}
 // number marker
 ctx.scale(face,1);ctx.fillStyle='#dcecff';ctx.font='bold 13px Rajdhani';ctx.textAlign='center';ctx.fillText('P'+n,0,-180);
 ctx.restore();
}
function background(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#101c32');g.addColorStop(1,'#27344a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // city silhouettes
 for(let i=0;i<16;i++){let bx=i*66;rect(bx,220+(i%4)*22,48,200,'#17263b');for(let j=0;j<3;j++)rect(bx+8+j*12,238+(i%4)*22,5,8,'#3a5974')}
 rect(0,FLOOR+4,W,H-FLOOR,'#121b2b');rect(0,FLOOR,W,4,'#65d8ef');for(let i=0;i<W;i+=55)rect(i,FLOOR+30,24,2,'#34465e');
 ctx.fillStyle='#dceeff';ctx.font='bold 12px Rajdhani';ctx.fillText('SHADOW DISTRICT  //  FIGHT NIGHT',18,25);
}
function frame(now){let dt=Math.min((now-last)/16.67,2);last=now;tick+=dt;if(!ended){if(tick>60){time--;tick=0;if(time<=0){ended=true;status.textContent=p1.hp===p2.hp?'DRAW!':(p1.hp>p2.hp?'PLAYER 1':'PLAYER 2')+' WINS ON TIME!'}}update(p1,p2,dt);update(p2,p1,dt)}
 background();drawFighter(p1,1);drawFighter(p2,2);
 document.querySelector('#hp1').style.width=p1.hp+'%';document.querySelector('#hp2').style.width=p2.hp+'%';document.querySelector('#clock').textContent=time;
 // impact sparks
 if(p1.stun>0||p2.stun>0){ctx.strokeStyle='#fff2a6';ctx.lineWidth=3;let x=(p1.x+p2.x)/2,y=(p1.y+p2.y)/2-90;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.random()*30-15,y+Math.random()*30-15);ctx.stroke()}}
 requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);
})();