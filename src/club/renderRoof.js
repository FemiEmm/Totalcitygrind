export function isClubLit(minute,events,now){return minute>=1080||minute<360||events.some(e=>now>=e.start&&now<e.until);}
// Cache Gaussian-profile circles once; avoid full-scene blur filters on mobile.
const LIGHT_COLOURS = ['255,55,175', '137,75,255', '40,175,255', '255,207,65'];
let lightSprites;
function getLightSprites() {
 if(lightSprites)return lightSprites;
 lightSprites=LIGHT_COLOURS.map(colour=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d');
  const gradient=context.createRadialGradient(128,128,0,128,128,128);
  for(let step=0;step<=16;step++){
   const distance=step/16;
   const alpha=step===16?0:Math.exp(-5*distance*distance);
   gradient.addColorStop(distance,'rgba('+colour+','+alpha+')');
  }
  context.fillStyle=gradient;context.fillRect(0,0,256,256);return canvas;
 });
 return lightSprites;
}
export function clubLightBounds(building){
 const spill=Math.max(building.width,building.height)*1.15;
 return {x:building.x-spill,y:building.y-spill,width:building.width+spill*2,height:building.height+spill*2};
}
function drawClubGlow(ctx,building,now,celebrating){
 const sprites=getLightSprites(),span=Math.max(building.width,building.height);
 const cx=building.x+building.width*.5,cy=building.y+building.height*.52;
 const time=(now%120000)/1000;
 const lights=[];
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6+time*(i%2?.14:-.11);
  const orbit=span*(.39+.07*Math.sin(time*.55+i));
  const pulse=.84+.16*Math.sin(time*1.3+i*1.7);
  lights.push({sprite:sprites[i%4],x:cx+Math.cos(angle)*orbit,y:cy+Math.sin(angle)*orbit,
   radius:span*(i%3===0?.77:.56)*pulse,alpha:pulse*(celebrating?1:.82)});
 }
 ctx.save();
 // Soft Light colours existing surfaces; Screen adds visible light to the dark night scene.
 for(const [mode,strength] of [['soft-light',.8],['screen',.48]]){
  ctx.globalCompositeOperation=mode;
  for(const light of lights){
   ctx.globalAlpha=light.alpha*strength;
   ctx.drawImage(light.sprite,light.x-light.radius,light.y-light.radius,light.radius*2,light.radius*2);
  }
 }
 ctx.restore();
}

// Draw after the night tint, independently of the static building cache.
export function drawClubRoof(ctx,building,minute,events,now){
 if(!building)return;
 const event=events.find(e=>now>=e.start&&now<e.until);
 if(!isClubLit(minute,events,now))return;
 drawClubGlow(ctx,building,now,!!event);
 const x=building.x+building.width*.232,y=building.y+building.height*.247,w=building.width*.55,h=building.height*.535;
 ctx.save();ctx.fillStyle='#091021';ctx.fillRect(x,y,w,h);ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=event?'#fff2b0':'#79f3ed';
 function line(text,cy,size){ctx.font='bold '+size+'px sans-serif';const measured=ctx.measureText(text).width;if(measured>w-10)ctx.font='bold '+Math.max(3,size*(w-10)/measured)+'px sans-serif';ctx.fillText(text,x+w/2,cy);}
 if(event){line(event.name,y+h*.35,17);line('is in the house.',y+h*.62,12);}else {line('NIGHT',y+h*.4,20);line('CLUB',y+h*.62,20);}
 ctx.restore();
 ctx.save();ctx.lineWidth=2;ctx.strokeStyle=event?'#f1c844':'#3ac8c8';ctx.strokeRect(x-5,y-5,w+10,h+10);
 if(event){const perimeter=2*(w+h+20),travel=((now-event.start)/1800%1)*perimeter;
  for(let i=0;i<32;i++){let d=i/32*perimeter,px,py;const width=w+10,height=h+10;
   if(d<width){px=x-5+d;py=y-5;}else if((d-=width)<height){px=x+w+5;py=y-5+d;}else if((d-=height)<width){px=x+w+5-d;py=y+h+5;}else{d-=width;px=x-5;py=y+h+5-d;}
   const tail=((travel-i/32*perimeter+perimeter)%perimeter)/perimeter;ctx.globalAlpha=tail<.28?1:.25;ctx.fillStyle=['#ff52ca','#45eaff','#ffdf48'][i%3];ctx.beginPath();ctx.arc(px,py,2.4,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}
