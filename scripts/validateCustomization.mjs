import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STICKERS, PAINTS } from '../src/customization/catalogue.js';
import { createCustomizationState, restoreCustomizationState, applyCustomization } from '../src/customization/state.js';
import { tintPixel } from '../src/customization/rendering.js';
assert.equal(STICKERS.length,10);
assert.equal(PAINTS.length,10);
assert.equal(new Set([...STICKERS,...PAINTS].map(item=>item.id)).size,20);
for (const items of [STICKERS,PAINTS]) assert.equal(new Set(items.map(item=>item.price)).size,10);
let money=1000;
const state=createCustomizationState();
const buy=(vehicle,kind,id)=>{
 const result=applyCustomization(state,vehicle,kind,id,money);
 if(result.ok) money-=result.price;
 return result;
};
assert.equal(buy('starter-danfo','sticker','no-wahala').price,500);
assert.equal(money,500);
assert.equal(buy('starter-danfo','sticker','no-wahala').price,0);
assert.equal(buy('eko-compact','sticker','no-wahala').price,0);
assert.equal(buy('starter-danfo','paint','gold').ok,false);
assert.equal(state.vehicles['starter-danfo'].paint,null);
assert.equal(buy('starter-danfo','sticker','fake').ok,false);
assert.equal(buy('starter-danfo','unknown','no-wahala').ok,false);
assert.equal(buy('__proto__','sticker',null).ok,false);
assert.equal(state.owned.sticker.length,1);
assert.equal(buy('starter-danfo','sticker',null).price,0);
assert.equal(state.vehicles['eko-compact'].sticker,'no-wahala');
assert.equal(state.vehicles['starter-danfo'].sticker,null);
money=100000;
for (const [kind,items] of [['sticker',STICKERS],['paint',PAINTS]]) {
 for (const item of items) assert.equal(buy('starter-danfo',kind,item.id).ok,true);
}
const restored=createCustomizationState();
restoreCustomizationState(restored,JSON.parse(JSON.stringify(state)));
assert.deepEqual(restored,state);
restoreCustomizationState(restored,undefined);
assert.deepEqual(restored,createCustomizationState());
restoreCustomizationState(restored,{owned:{sticker:['fake','no-wahala','no-wahala'],paint:[]},vehicles:{'starter-danfo':{sticker:'fake',paint:'gold'}}});
assert.deepEqual(restored.owned.sticker,['no-wahala']);
assert.equal(restored.vehicles['starter-danfo'].paint,null);
assert.equal(applyCustomization(restored,'starter-danfo','paint',null,-100).ok,true);
assert.deepEqual(tintPixel(25,30,40,'starter-danfo','#239c55'),[25,30,40]);
assert.deepEqual(tintPixel(245,245,235,'starter-danfo','#239c55'),[245,245,235]);
assert.deepEqual(tintPixel(230,15,20,'starter-danfo','#239c55'),[230,15,20]);
const green=tintPixel(240,170,20,'starter-danfo','#239c55');
assert.ok(green[1]>green[0] && green[1]>green[2]);
for(const path of ['src/world/components/WorldMap.vue','src/world2/components/WorldMap2.vue']) {
 const source=fs.readFileSync(path,'utf8');
 const stockSnapshots=[...source.matchAll(/stockMarketState: JSON.parse/g)];
 const cosmeticSnapshots=[...source.matchAll(/customizationState: JSON.parse/g)];
 assert.equal(cosmeticSnapshots.length,stockSnapshots.length,path+' save and travel payloads');
 assert.ok(source.includes('restoreCustomizationState(customizationState, saveData.customizationState)'));
 assert.ok(source.includes('@customize-vehicle="handleCustomizeVehicle"'));
}
console.log('Customization: catalogue, purchases, free reapply/reset, independent vehicles, save restoration, tint masks and travel coverage passed.');
