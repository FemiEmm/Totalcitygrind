import assert from 'node:assert/strict';
import fs from 'node:fs';
const storage=new Map([
 ['lagos-experience-manual-save-v1',JSON.stringify({version:1,economyState:{money:999999}})],
 ['total-city-grind-player-inventory-slot-1',JSON.stringify({food:99})],
]);
globalThis.document={removeEventListener(){}};
globalThis.window={removeEventListener(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
const slots=await import('../src/game/saveSlots.js');
const inventory=await import('../src/player/systems/playerInventory.js');
assert.ok(slots.getSaveSlots().every(s=>!s.exists),'Old saves must not appear');
assert.deepEqual(inventory.createPlayerInventoryState(),{items:{}},'Old inventory must not import');
const key=slots.getSaveStorageKey(1);
window.localStorage.setItem(key,JSON.stringify({version:1,economyState:{money:100}}));
assert.equal(slots.getSaveSlots()[0].money,100,'New saves must load');
window.localStorage.setItem(slots.getSaveStorageKey(2),JSON.stringify({version:1}));
slots.clearSaveSlot(1);
assert.equal(slots.getSaveSlots()[0].exists,false);
assert.equal(slots.getSaveSlots()[1].exists,true,'Clear must not affect another slot');
slots.setActiveSaveSlotId(2);
slots.clearSaveSlot();
assert.equal(slots.getSaveSlots()[1].exists,false,'Implicit clear uses the active slot');
assert.ok(![...storage.keys()].some(k=>k.includes('backup')),'Clear must not make recovery copies');

// New games receive food once; loading or changing worlds never refills it.
slots.setActiveSaveSlotId(1);
const starter = inventory.startNewPlayerInventory();
assert.deepEqual(starter.items, {bread:2, 'bottled-water':1});
assert.deepEqual(inventory.createPlayerInventoryState().items, starter.items);
inventory.consumeInventoryItem(starter, 'bread');
inventory.consumeInventoryItem(starter, 'bread');
inventory.consumeInventoryItem(starter, 'bottled-water');
assert.deepEqual(inventory.createPlayerInventoryState().items, {}, 'Empty inventory must stay empty after reload');
slots.setActiveSaveSlotId(2);
assert.deepEqual(inventory.createPlayerInventoryState().items, {}, 'Starter food must not leak into other slots');
slots.setActiveSaveSlotId(1);
slots.clearSaveSlot();
assert.deepEqual(inventory.startNewPlayerInventory().items, {bread:2, 'bottled-water':1}, 'A fresh game gets a fresh starter pack');

const source=fs.readFileSync(new URL('../src/game/components/TouchControls.vue',import.meta.url),'utf8');
const setup=source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*? from ".*?";/gm,'');
const events=[];const cleanup=[];
const tested=new Function('ref','defineEmits','onMounted','onBeforeUnmount','computed','isPlayerVehicleEngineStarted','defineProps',setup+'; return {press,release,releaseAll};')(
 value=>({value}),()=> (type,payload)=>events.push(payload),()=>{},fn=>cleanup.push(fn),getter=>({get value(){return getter();}}),()=>false,()=>({transmission:"automatic"})
);
const pointer=id=>({pointerId:id,pointerType:'touch',currentTarget:{setPointerCapture(){}}});
tested.press(pointer(1),'w');tested.press(pointer(2),'a');
assert.deepEqual(events,[{key:'w',down:true},{key:'a',down:true}],'Steer and accelerate simultaneously');
tested.release(pointer(2));assert.deepEqual(events.at(-1),{key:'a',down:false});
tested.releaseAll();assert.deepEqual(events.at(-1),{key:'w',down:false});
tested.press(pointer(3),'w');tested.press(pointer(4),'w');
const before=events.length;tested.release(pointer(3));assert.equal(events.length,before,'Second finger retains held input');
cleanup[0]();assert.deepEqual(events.at(-1),{key:'w',down:false},'Unmount releases input');
console.log('PASS: clean saves, inventory isolation, slot clearing, multitouch and release on teardown');
