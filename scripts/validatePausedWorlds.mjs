import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse} from '@babel/parser';
for (const file of ['src/world/components/WorldMap.vue', 'src/world2/components/WorldMap2.vue']) {
  const source = fs.readFileSync(file,'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1];
  const body = parse(source,{sourceType:'module'}).program.body;
  const loop = body.find(node=>node.type==='FunctionDeclaration' && node.id.name==='animationLoop');
  const watcher = body.find(node=>node.type==='ExpressionStatement' && node.expression.type==='CallExpression' && node.expression.callee.name==='watch' && source.slice(node.expression.arguments[0].start,node.expression.arguments[0].end).includes('props.paused')).expression.arguments[1];
  const test = new Function('assert', `
    let animationFrameId=123, simulationAccumulator=0, trafficSimulationAccumulator=0;
    let renderInterpolationAlpha=0, trafficRenderInterpolationAlpha=0, pausedFrameRendered=false, previousTimestamp=0;
    const MAX_FRAME_DELTA_SECONDS=.1, props={paused:true}, pressedKeys=new Set();
    const player={speed:0}, activeVehicleMaximumSpeed={value:100};
    let rendered=0, scheduled=0;
    const renderMap=()=>rendered++;
    const updatePlayerVehicleEngineSound=()=>{};
    const window={requestAnimationFrame:()=>++scheduled};
    ${source.slice(loop.start,loop.end)}
    const changed=${source.slice(watcher.start,watcher.end)};
    animationLoop(16);
    assert.equal(scheduled,0,'Paused world must not queue another frame');
    assert.equal(animationFrameId,null);
    assert.equal(rendered,1);
    props.paused=false;changed(false);
    assert.equal(scheduled,1,'Resuming must restart the loop');
    changed(false);assert.equal(scheduled,1,'Must not create duplicate loops');
    props.paused=true;changed(true);animationLoop(32);
    assert.equal(animationFrameId,null);assert.equal(scheduled,1);
  `);
  test(assert);
}
console.log('PASS: both paused worlds stop polling and resume with exactly one frame loop.');
