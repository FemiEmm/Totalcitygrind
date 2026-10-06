import { PAINTS, STICKERS } from './catalogue.js';

const paintedSprites = new Map();
const decalImages = new Map();
const imageLoads = new Map();
export function loadCosmeticImage(url) {
  if (!imageLoads.has(url)) imageLoads.set(url, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { imageLoads.delete(url); reject(new Error('Unable to load vehicle artwork')); };
    image.src = url;
  }));
  return imageLoads.get(url);
}

function hue(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  if (!d) return 0;
  const h = max === r ? (g-b)/d : max === g ? (b-r)/d+2 : (r-g)/d+4;
  return (h*60+360)%360;
}

// Mask by the original body hue; neutral trim and glass retain their pixels.
export function tintPixel(r, g, b, vehicleId, colour, roofPanel = false) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const saturation = max ? (max-min)/max : 0;
  const expected = { 'starter-danfo': 40, 'eko-compact': 26, 'mainland-hatch': 140, 'lagoon-sedan': 48, 'victoria-executive': 280, 'player-brt': 0 }[vehicleId];
  const h = hue(r,g,b);
  const distance = expected === undefined ? 360 : Math.min(Math.abs(h-expected), 360-Math.abs(h-expected));
  const whiteBody = vehicleId === 'island-cruiser' || roofPanel;
  if (whiteBody ? saturation > .16 || max < 135 : saturation < .4 || max < 65 || distance > 24) return [r,g,b];
  const target = Array.isArray(colour) ? colour : colour.match(/[a-f0-9]{2}/gi).map(value => parseInt(value,16));
  const light = max/255;
  // Keep highlights and dark panel seams from the source sprite.
  return target.map(channel => Math.round(Math.min(255, channel*(.32+.68*light) + Math.max(0, light-.92)*120)));
}

function getPaintedSprite(sprite, vehicle, paint) {
  const key = vehicle.id + ':' + paint.id;
  const cached = paintedSprites.get(key);
  if (cached?.source === sprite) return cached.canvas;
  const crop = vehicle.spriteCrop ?? { x: 0, y: 0, width: sprite.naturalWidth || sprite.width, height: sprite.naturalHeight || sprite.height };
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512/crop.height);
  canvas.width = Math.max(1, Math.round(crop.width*scale));
  canvas.height = Math.max(1, Math.round(crop.height*scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sprite, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
  const targetColour = paint.colour.match(/[a-f0-9]{2}/gi).map(value => parseInt(value,16));
  for (let i=0; i<pixels.data.length; i+=4) {
    if (!pixels.data[i+3]) continue;
    const y = Math.floor(i/4/canvas.width)/canvas.height;
    const x = (i/4%canvas.width)/canvas.width;
    // Recolour all body-coloured pixels, including nose, tail and side edges.
    // The cream Danfo roof is also paintable; glass and dark trim stay intact.
    const roofPanel = vehicle.id === 'starter-danfo' && x > .24 && x < .80 && y > .255 && y < .82
      && Math.max(pixels.data[i], pixels.data[i+1], pixels.data[i+2]) - Math.min(pixels.data[i], pixels.data[i+1], pixels.data[i+2]) < 38;
    // BRT lamps share the red body hue, so protect only their corner locations.
    if (vehicle.id === 'player-brt' && (x < .25 || x > .75) && (y < .045 || y > .94)) continue;
    const rgb = tintPixel(pixels.data[i],pixels.data[i+1],pixels.data[i+2],vehicle.id,targetColour,roofPanel);
    pixels.data.set(rgb,i);
  }
  ctx.putImageData(pixels,0,0);
  if (paintedSprites.size >= 12) paintedSprites.delete(paintedSprites.keys().next().value);
  paintedSprites.set(key, { source: sprite, canvas });
  return canvas;
}

export function drawCustomizedVehicle(ctx, sprite, vehicle, selection = {}, width, length) {
  const paint = PAINTS.find(item => item.id === selection.paint);
  const drawn = paint ? getPaintedSprite(sprite, vehicle, paint) : sprite;
  const crop = !paint && vehicle.spriteCrop;
  if (crop) ctx.drawImage(drawn, crop.x, crop.y, crop.width, crop.height, -width/2, -length/2, width, length);
  else ctx.drawImage(drawn, -width/2, -length/2, width, length);
  const sticker = STICKERS.find(item => item.id === selection.sticker);
  if (!sticker) return;
  if (!decalImages.has(sticker.id)) {
    decalImages.set(sticker.id, null);
    loadCosmeticImage(sticker.url).then(image => decalImages.set(sticker.id,image)).catch(() => decalImages.delete(sticker.id));
  }
  const image = decalImages.get(sticker.id);
  if (image) {
    const size = width * .55;
    const centreY = vehicle.id === 'player-brt' ? -length*.30 : length*.025;
    ctx.drawImage(image,-size/2,centreY-size/2,size,size);
  }
}

export async function prepareSticker(id) {
  const sticker = STICKERS.find(item => item.id === id);
  if (sticker) decalImages.set(id, await loadCosmeticImage(sticker.url));
}
