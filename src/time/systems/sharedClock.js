// A fixed epoch keeps the online city running even with no connected players.
const EPOCH=Date.UTC(2026,9,7,0,0,0);
let anchorWall=Date.now(),anchorMono=performance.now(),lastSync=0,pending=false;
export function sharedNow(){return anchorWall+performance.now()-anchorMono;}
export function syncSharedClock(clock,config){
 const minutes=Math.max(0,(sharedNow()-EPOCH)/1000)*config.gameMinutesPerRealSecond+360;
 clock.day=1+Math.floor(minutes/1440);clock.minuteOfDay=minutes%1440;
 if(!pending && (performance.now()-lastSync>60000 || !lastSync)){
  pending=true;lastSync=performance.now();
  const began=performance.now();
  const url=(import.meta.env.VITE_BACKEND_URL||'http://127.0.0.1:3001').replace(/\/$/,'');
  fetch(url+'/public/clock',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
   if(Number.isFinite(data.serverNow)){anchorWall=data.serverNow+(performance.now()-began)/2;anchorMono=performance.now();}
  }).catch(()=>{}).finally(()=>{pending=false;});
 }
}
