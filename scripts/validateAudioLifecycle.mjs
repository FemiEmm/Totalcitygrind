import assert from "node:assert/strict";
const documentEvents = new Map();
const windowEvents = new Map();
globalThis.document = { hidden:false, addEventListener:(name,fn)=>documentEvents.set(name,fn) };
globalThis.window = { addEventListener:(name,fn)=>windowEvents.set(name,fn) };
class FakeAudio {
  constructor() { this.paused = true; this.events = new Map(); this.pending = null; }
  addEventListener(name,fn) { this.events.set(name,fn); }
  play() { this.paused=false; this.events.get("play")?.(); return this.pending ?? Promise.resolve(); }
  pause() { this.paused=true; this.events.get("pause")?.(); }
}
globalThis.Audio = FakeAudio;
const {createManagedAudio,isAudioBlocked,audioGeneration,onAudioBackground} = await import("../src/audio/audioLifecycle.js");
let notifications=0;onAudioBackground(()=>notifications++);
const channels = Array.from({length:5},()=>createManagedAudio());
await Promise.all(channels.map(audio=>audio.play()));
document.hidden=true;documentEvents.get("visibilitychange")();
assert(channels.every(audio=>audio.paused),"All audio categories must pause on hide");
await assert.rejects(channels[0].play(),{name:"AbortError"});
windowEvents.get("focus")();assert(isAudioBlocked(),"Focus cannot unblock a hidden page");
document.hidden=false;documentEvents.get("visibilitychange")();
assert(channels.every(audio=>audio.paused),"Returning must not automatically restart sounds");
await channels[0].play();assert(!channels[0].paused,"Explicit foreground playback works");
for(const event of ["pagehide","blur"]){
 const generation=audioGeneration();windowEvents.get(event)();assert(channels[0].paused);assert(audioGeneration()>generation);await assert.rejects(channels[0].play());windowEvents.get("pageshow")();await channels[0].play();
}
documentEvents.get("freeze")();assert(channels[0].paused);documentEvents.get("resume")();
let finish;const late=createManagedAudio();late.pending=new Promise(resolve=>{finish=resolve;});
const pending=late.play();windowEvents.get("pagehide")();windowEvents.get("pageshow")();
late.paused=false;finish();await assert.rejects(pending,{name:"AbortError"});assert(late.paused,"Late play completion must not restart background audio");
assert(notifications>=4);
console.log("PASS: all audio pauses on hide/exit/blur/freeze, hidden playback is blocked, late playback is stopped, and foreground does not auto-resume.");
