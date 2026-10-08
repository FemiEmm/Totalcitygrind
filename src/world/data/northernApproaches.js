import {GRID_SIZE,gridRect} from './mapConstants.js';
const road=(id,x,y,w,h)=>({id:'northern-approach-'+id,...gridRect(x,y,w,h),type:'main',surface:'mud',districtId:'northern-woodland'});
export const northernApproachRoads=[
 road('west-edge',2,-71,2,57),road('west-turn',2,-16,8,2),road('west-lower',8,-16,2,16),
 road('clinic-link',8,-2,11,2),road('estate-top-link',2,-69,24,2),
 road('east-edge',60,-71,2,61),road('east-turn',58,-12,4,2),road('east-lower',58,-12,2,13),
 road('east-city-link',45,-2,15,2),road('office-link',45,-2,2,3),
];
// Every segment is axis-aligned; these same corners drive the AI paths.
export const westInbound=[[2.45,-71],[2.45,-14.45],[8.45,-14.45],[8.45,-0.45],[18.5,-0.45]];
export const eastInbound=[[60.45,-71],[60.45,-11.55],[58.45,-11.55],[58.45,-1.55]];
export const eastOutbound=[[59.55,-0.45],[59.55,-10.45],[61.55,-10.45],[61.55,-71]];
export const approachPoints=coordinates=>coordinates.map(([x,y],i)=>{
 const next=coordinates[i+1]||coordinates[i],dx=next[0]-x,dy=next[1]-y;
 return {x:x*GRID_SIZE,y:y*GRID_SIZE,noSmooth:true,...(dx||dy?{direction:dx>0?'east':dx<0?'west':dy>0?'south':'north'}:{})};
});
