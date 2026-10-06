import { WASTE_LOCATIONS } from './wasteLocations.js';
export const WASTE_RESPAWN_MINUTES=5*1440;
const INTERVAL=WASTE_RESPAWN_MINUTES/WASTE_LOCATIONS.length;
export function createWasteLifecycle(){return {version:1,removed:{},nextCleanup:null,cursor:0,staffed:null};}
export function advanceWaste(w,minute,staffed){
 let changed=false;
 if(w.staffed!==staffed||w.nextCleanup===null){w.staffed=staffed;w.nextCleanup=minute+INTERVAL;changed=true;}
 if(!staffed){
  // Skip ancient complete cycles; only the last two can affect current availability.
  const due=Math.max(0,Math.floor((minute-w.nextCleanup)/INTERVAL)+1);
  const skip=Math.max(0,due-WASTE_LOCATIONS.length*2);
  if(skip){w.cursor=(w.cursor+skip)%WASTE_LOCATIONS.length;w.nextCleanup+=skip*INTERVAL;changed=true;}
  while(w.nextCleanup<=minute){
   const id=WASTE_LOCATIONS[w.cursor].id;
   // Let a pile respawn before a later cleanup visit instead of clearing it immediately.
   if(!(w.removed[id]>=w.nextCleanup-0.000001))w.removed[id]=w.nextCleanup+WASTE_RESPAWN_MINUTES;
   w.cursor=(w.cursor+1)%WASTE_LOCATIONS.length;w.nextCleanup+=INTERVAL;changed=true;
  }
 }
 for(const [id,until] of Object.entries(w.removed)){if(until<=minute){delete w.removed[id];changed=true;}}
 return changed;
}
