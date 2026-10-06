// All effect durations use game minutes. Steering pulses use simulation seconds.
export function addIntoxication(status,amount){status.intoxication=Math.min(100,Math.max(0,Number(status.intoxication)||0)+amount);status.intoxicationRemainingMinutes=600;}
function decay(status,minutes){
 const remaining=Math.max(0,Number(status.intoxicationRemainingMinutes)||0),level=Math.max(0,Number(status.intoxication)||0);
 if(!remaining||minutes>=remaining){status.intoxication=0;status.intoxicationRemainingMinutes=0;return;}
 status.intoxication=level*(remaining-minutes)/remaining;status.intoxicationRemainingMinutes=remaining-minutes;
}
export function advanceIntoxication(status,absoluteMinute,{sleeping=false,crashEnergy=10}={}){
 if(!Number.isFinite(absoluteMinute))return;
 status.ginDoses ||= [];
 // Migrate the existing single gin timer without replaying consumed doses.
 if(!status.ginDoses.length&&Number.isFinite(status.dryGinCrashAtGameMinute))status.ginDoses.push(status.dryGinCrashAtGameMinute);
 let cursor=Number.isFinite(status.effectsLastMinute)?status.effectsLastMinute:absoluteMinute;
 const end=Math.max(cursor,absoluteMinute),rate=sleeping?2:1;
 status.ginDoses.sort((a,b)=>a-b);
 while(status.ginDoses.length&&status.ginDoses[0]<=end){
  const due=status.ginDoses.shift(),at=Math.max(cursor,due);decay(status,(at-cursor)*rate);cursor=at;
  status.energy=Math.min(status.energy,crashEnergy);addIntoxication(status,50);
 }
 decay(status,(end-cursor)*rate);status.effectsLastMinute=end;
 status.dryGinCrashAtGameMinute=status.ginDoses[0]??null;
}
const pulses=new WeakMap();
export function intoxicationSteering(vehicle,status,seconds){
 const level=Math.max(0,Math.min(100,Number(status.intoxication)||0));
 if(level<=0||Math.abs(vehicle.speed)<4){pulses.delete(vehicle);return 0;}
 let pulse=pulses.get(vehicle);if(!pulse){pulse={wait:1,remaining:0,direction:1};pulses.set(vehicle,pulse);}
 if(pulse.remaining>0){pulse.remaining=Math.max(0,pulse.remaining-seconds);return pulse.direction*0.1;}
 // Fixed 10% steering strength. Only the frequency rises with intoxication.
 pulse.wait-=seconds;if(pulse.wait<=0){pulse.direction=Math.random()<0.5?-1:1;pulse.remaining=0.7;pulse.wait=12-10*(level/100);return pulse.direction*0.1;}
 return 0;
}
