(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandBotAI=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function plan(C,s,p,actors,dt,projectileSpeed=1100){
 const now=s.time||0,random=s.random||Math.random,b=p.botBrain||(p.botBrain={nextScan:now+random()*.15,targetId:null,readyAt:0,strafe:random()<.5?-1:1,nextStrafe:0,wander:random()*Math.PI*2,wanderUntil:0,avoidUntil:0,avoidSign:1});
 if(now>=b.nextScan){b.nextScan=now+.15;let best=null,score=Infinity;for(const a of actors){if(a===p||a.hp<=0||a.phase&&a.phase!=='ground')continue;const d=C.hyp(a,p),cost=d*(a.id===b.targetId ? .8 : 1);if(d<=950&&cost<score&&C.canSee(s,p,a)){best=a;score=cost}}if(best){if(b.targetId!==best.id)b.readyAt=now+.22+random()*.18;const elapsed=now-(b.seenAt??now);b.vx=elapsed>0&&b.targetId===best.id?C.clamp((best.x-b.seenX)/elapsed,-360,360):0;b.vy=elapsed>0&&b.targetId===best.id?C.clamp((best.y-b.seenY)/elapsed,-360,360):0;b.targetId=best.id;b.seenX=best.x;b.seenY=best.y;b.seenAt=now}else if(now-(b.seenAt??-10)>1.5)b.targetId=null}
 const target=actors.find(a=>a.id===b.targetId&&a.hp>0),visible=target&&C.hyp(target,p)<950&&C.canSee(s,p,target),zone=s.zone.current,unsafe=C.hyp(p,zone)>Math.max(0,zone.r-160);let dx=0,dy=0,fire=false;
 if(visible){const d=C.hyp(target,p),lead=Math.min(.3,d/projectileSpeed)*.65,aim=Math.atan2(target.y+(b.vy||0)*lead-p.y,target.x+(b.vx||0)*lead-p.x),error=Math.sin(now*2.7+(p.skin||0)*1.7)*.045;const delta=Math.atan2(Math.sin(aim+error-p.angle),Math.cos(aim+error-p.angle));p.angle+=C.clamp(delta,-7*dt,7*dt);if(now>=b.nextStrafe){b.nextStrafe=now+1+random()*1.1;b.strafe*=-1}const forward=d>360?1:d<190?-.8:0,angle=Math.atan2(target.y-p.y,target.x-p.x);dx=Math.cos(angle)*forward-Math.sin(angle)*b.strafe*.65;dy=Math.sin(angle)*forward+Math.cos(angle)*b.strafe*.65;fire=!unsafe&&now>=b.readyAt&&d<760&&Math.abs(delta)<.2&&!C.raycast(s,p.x,p.y,target.x,target.y,1)}
 else if(b.targetId&&now-(b.seenAt??-10)<1.5){dx=b.seenX-p.x;dy=b.seenY-p.y}
 else{if(now>=b.wanderUntil){b.wander=random()*Math.PI*2;b.wanderUntil=now+1.5+random()*2}dx=Math.cos(b.wander);dy=Math.sin(b.wander);const turn=Math.atan2(Math.sin(b.wander-p.angle),Math.cos(b.wander-p.angle));p.angle+=C.clamp(turn,-7*dt,7*dt)}
 if(unsafe){dx=zone.x-p.x;dy=zone.y-p.y;fire=false}
 const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
 // Probe several candidate headings so a tree or wall doesn't pin a bot in place.
 if(C.raycast(s,p.x,p.y,p.x+dx*90,p.y+dy*90,20)){if(now>=b.avoidUntil){b.avoidSign=random()<.5?-1:1;b.avoidUntil=now+.7}const base=Math.atan2(dy,dx);let found=false;for(const turn of [.65,1.15,1.65,2.2,Math.PI]){for(const sign of [b.avoidSign,-b.avoidSign]){const a=base+turn*sign,ax=Math.cos(a),ay=Math.sin(a);if(!C.raycast(s,p.x,p.y,p.x+ax*90,p.y+ay*90,20)){dx=ax;dy=ay;found=true;break}}if(found)break}if(!found){dx=0;dy=0}}
 // Ease changes in steering so target scans and obstacle avoidance do not snap movement.
 const blend=1-Math.exp(-dt*14);
 b.moveX=(b.moveX??dx)+(dx-(b.moveX??dx))*blend;
 b.moveY=(b.moveY??dy)+(dy-(b.moveY??dy))*blend;
 return{dx:b.moveX,dy:b.moveY,fire,visible:!!visible,unsafe};
}
return{plan};
});
