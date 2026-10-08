// Procedural canvas ground: anchored in world coordinates, never restarted per map tile.
const PERIOD = 512;
const SAMPLE = 4;
const PAD = 32;
let grassTexture, mudTexture;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
function hash(x, y) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, scale, periodic = false) {
  const ix = Math.floor(x / scale), iy = Math.floor(y / scale);
  const tx = smooth(x / scale - ix), ty = smooth(y / scale - iy);
  const cells = PERIOD / scale;
  const h = (a, b) => hash(periodic ? (a % cells + cells) % cells : a, periodic ? (b % cells + cells) % cells : b);
  return (h(ix, iy) * (1-tx) + h(ix+1, iy) * tx) * (1-ty) + (h(ix, iy+1) * (1-tx) + h(ix+1, iy+1) * tx) * ty;
}
function makeTexture(mud) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PERIOD;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(PERIOD, PERIOD);
  const base = mud ? [157, 104, 58] : [91, 116, 39];
  for (let y=0; y<PERIOD; y++) for (let x=0; x<PERIOD; x++) {
    const broad = noise(x,y,128,true)-0.5;
    const medium = noise(x,y,32,true)-0.5;
    const detail = noise(x,y,4,true)-0.5;
    const grain = hash(x,y)-0.5;
    const variation = broad*15 + medium*12 + detail*18 + grain*(mud ? 13 : 22);
    const i=(y*PERIOD+x)*4;
    pixels.data[i]=base[0]+variation;
    pixels.data[i+1]=base[1]+variation;
    pixels.data[i+2]=base[2]+variation*.55;
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  return canvas;
}
function fillGround(ctx, bounds, mud) {
  grassTexture ||= makeTexture(false);
  if (mud) mudTexture ||= makeTexture(true);
  ctx.fillStyle=ctx.createPattern(mud ? mudTexture : grassTexture,'repeat');
  ctx.fillRect(bounds.x,bounds.y,bounds.width,bounds.height);
}
export function drawMainlandGrass(ctx, bounds) { fillGround(ctx,bounds,false); }
// Blur the union mask, not each rectangle, so adjoining strips and road turns have no internal seams.
function blur(source,width,height,radius) {
  const temp=new Float32Array(source.length), out=new Float32Array(source.length), count=radius*2+1;
  for(let y=0;y<height;y++) {
    let sum=0;
    for(let dx=-radius;dx<=radius;dx++) sum+=source[y*width+Math.max(0,Math.min(width-1,dx))];
    for(let x=0;x<width;x++) {
      temp[y*width+x]=sum/count;
      sum+=source[y*width+Math.min(width-1,x+radius+1)]-source[y*width+Math.max(0,x-radius)];
    }
  }
  for(let x=0;x<width;x++) {
    let sum=0;
    for(let dy=-radius;dy<=radius;dy++) sum+=temp[Math.max(0,Math.min(height-1,dy))*width+x];
    for(let y=0;y<height;y++) {
      out[y*width+x]=sum/count;
      sum+=temp[Math.min(height-1,y+radius+1)*width+x]-temp[Math.max(0,y-radius)*width+x];
    }
  }
  return out;
}
export function drawMainlandMud(ctx, tile, regions) {
  const x0=tile.x-PAD,y0=tile.y-PAD;
  const width=Math.ceil((tile.width+PAD*2)/SAMPLE),height=Math.ceil((tile.height+PAD*2)/SAMPLE);
  const nearby=regions.filter(r=>r.x<x0+width*SAMPLE&&r.x+r.width>x0&&r.y<y0+height*SAMPLE&&r.y+r.height>y0);
  if(!nearby.length)return;
  const mask=new Float32Array(width*height);
  for(const r of nearby){
    const left=Math.max(0,Math.ceil((r.x-x0)/SAMPLE)),right=Math.min(width,Math.ceil((r.x+r.width-x0)/SAMPLE));
    const top=Math.max(0,Math.ceil((r.y-y0)/SAMPLE)),bottom=Math.min(height,Math.ceil((r.y+r.height-y0)/SAMPLE));
    for(let y=top;y<bottom;y++) mask.fill(1,y*width+left,y*width+right);
  }
  const soft=blur(mask,width,height,3);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),pixels=context.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,a=soft[i];
    // Feathering is limited to the verge; the main road remains visibly solid mud.
    const edge=a>0&&a<1 ? smooth((a-.14+(noise(x0+x*SAMPLE,y0+y*SAMPLE,24)-.5)*.35)/.72) : a;
    pixels.data[i*4+3]=Math.round(edge*255);
  }
  context.putImageData(pixels,0,0);
  context.globalCompositeOperation='source-in';
  context.scale(1/SAMPLE,1/SAMPLE);context.translate(-x0,-y0);
  fillGround(context,{x:x0,y:y0,width:width*SAMPLE,height:height*SAMPLE},true);
  ctx.drawImage(canvas,x0,y0,width*SAMPLE,height*SAMPLE);
}
