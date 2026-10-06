import { createManagedAudio, isAudioBlocked, onAudioBackground } from '../audio/audioLifecycle.js';
import { getPlayerVehicleAudioSettings } from '../audio/vehicleAudio.js';

export function createClubAudio() {
 let audio=null, pending=false, disposed=false, retryAt=0, generation=0;
 function stop() {
  generation++;
  pending=false;
  if(audio){audio.pause();audio.currentTime=0;}
 }
 const unsubscribe=onAudioBackground(stop);
 function update(audible) {
  if(disposed)return;
  const settings=getPlayerVehicleAudioSettings();
  if(!audible||isAudioBlocked()||settings.muted||settings.volume<=0){
   if(audio&&(!audio.paused||pending||audio.currentTime))stop();
   return;
  }
  if(!audio){audio=createManagedAudio('./sounds/world/club_music_hype.mp3');audio.loop=true;audio.preload='none';}
  audio.volume=Math.min(.72,.4*settings.volume);
  if(!audio.paused||pending||Date.now()<retryAt)return;
  const attempt=++generation;
  pending=true;
  audio.play().catch(()=>{if(attempt===generation)retryAt=Date.now()+2000;}).finally(()=>{if(attempt===generation)pending=false;});
 }
 function dispose(){disposed=true;unsubscribe();stop();if(audio){audio.removeAttribute('src');audio.load();audio=null;}}
 return {update,stop,dispose};
}
