export const POLICE_POSTS = Object.freeze([
  [2,20,2,19], [22,15,22,16], [36,10,35,10],
  [57,28,58,28], [23,26,24,26], [44,9,45,9],
].map(([x,y,hotX,hotY], index) => ({ id: `police-post-${index + 1}`, x:(x+.5)*120, y:(y+.5)*120,
  tileX:x, tileY:y, hotX, hotY, rotation:Math.atan2(hotX-x, -(hotY-y)),
  width:hotX === x ? 52 : 114, height:hotX === x ? 114 : 52,
})));
export const POLICE_LOTS = POLICE_POSTS.map(post => ({ x:post.tileX*120, y:post.tileY*120, width:120, height:120 }));
export const POLICE_OBSTACLES = POLICE_POSTS.map(post => ({ id:post.id, x:post.x-post.width/2, y:post.y-post.height/2, width:post.width, height:post.height, blocksVehicles:true }));
export function createCrimeState() { return { score:0, heistCustody:false, status:'free', bribe:0, releaseMinute:0, bayId:null, fadeSeconds:0, lastHotspot:null }; }
export function restoreCrimeState(state, saved) {
  Object.assign(state, createCrimeState());
  if (!saved) return;
  state.score = Math.max(0, Math.floor(Number(saved.score) || 0));
  state.status = ['arrested','transfer','detained'].includes(saved.status) ? saved.status : 'free';
  state.bribe = Math.max(0, Number(saved.bribe) || 0);
  state.releaseMinute = Math.max(0, Number(saved.releaseMinute) || 0);
  state.bayId = typeof saved.bayId === 'string' ? saved.bayId : null;
  state.fadeSeconds = Math.max(0, Number(saved.fadeSeconds) || 0);
  state.lastHotspot = saved.lastHotspot || null;
  state.heistCustody=Boolean(saved.heistCustody);
}
export function addCrime(state, offence) {
  if (state.status !== 'free') return;
  state.score += ({ traffic:1, collision:2, racing:5 })[offence] || 0;
}
export function checkPoliceHotspot(state, player) {
  const x = Math.floor(player.x/120), y = Math.floor(player.y/120);
  const post = POLICE_POSTS.find(p => p.hotX === x && p.hotY === y);
  const entered = post && state.lastHotspot !== post.id;
  state.lastHotspot = post?.id || null;
  if (!entered || state.status !== 'free' || state.score < 50) return false;
  state.status = 'arrested'; state.bribe = state.score * 100; return true;
}
