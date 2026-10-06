import { PLAYER_DANFO } from './playerDanfo.js';
import police from '../../assets/population/police-pickup.png';
import lastma from '../../assets/vehicles/lastma-van.png';
import lawma from '../../assets/vehicles/lawma-waste-truck.png';
const service=(id,name,spriteUrl,width,length,steeringSpeed)=>({...PLAYER_DANFO,id,name,spriteUrl,width,length,steeringSpeed,spriteRenderScale:1,transmission:'automatic',serviceVehicle:true,gears:PLAYER_DANFO.gears.map(g=>({...g,maxSpeed:g.maxSpeed*.55}))});
export const SERVICE_VEHICLES=[
 {...service('service-police','Police patrol',police,52,114,2.4),spriteCrop:{x:364,y:38,width:539,height:1178}},
 {...service('service-lastma','Traffic enforcement van',lastma,52,112,2.2),spriteCrop:{x:48,y:27,width:790,height:1720}},
 {...service('service-lawma','Waste collection truck',lawma,78,238,1.7),spriteCrop:{x:60,y:48,width:642,height:1960}},
];
