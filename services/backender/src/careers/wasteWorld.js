import { createWasteLifecycle, advanceWaste } from './wasteLifecycle.js';
// Shared online time: one real second is one game minute, independent of personal sleep.
export function updateWorldWaste(db,now=Date.now()){
 if(db.wasteWorld?.version!==1){db.wasteWorld={...createWasteLifecycle(),epoch:now};delete db.wasteCollections;}
 const world=db.wasteWorld,minute=Math.max(0,(now-world.epoch)/1000);
 const staffed=Object.values(db.careers||{}).some(s=>s.job?.courseId==='lawma');
 advanceWaste(world,minute,staffed);
 return {world,minute,takenWaste:Object.keys(world.removed)};
}
