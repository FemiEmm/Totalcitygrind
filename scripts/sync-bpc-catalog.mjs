import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { PROPERTY_CATALOGUE } from '../src/property/data/properties.js';
import { BUSINESS_CONFIG } from '../src/business/data/businessAssets.js';
import { STOCK_COMPANIES } from '../src/economy/data/stockMarket.js';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('src/player/data/purchasableCars.js', root), 'utf8');
const cars = [...source.matchAll(/car\(\s*"([^"]+)",\s*"[^"]+",\s*(\d+),/g)].map(match => [match[1], Number(match[2])]);
if (!cars.length) throw new Error('No vehicle prices found; update the catalogue exporter for the vehicle format.');
const catalogue = {
  properties: Object.fromEntries(PROPERTY_CATALOGUE.filter(p => p.tenure === 'ownership').map(p => [p.id, p.price])),
  vehicles: Object.fromEntries(cars), businessOffice: BUSINESS_CONFIG.officePrice,
  businesses: Object.fromEntries(BUSINESS_CONFIG.assets.map(a => [a.id, { price: a.purchasePrice, max: a.maximumOwned }])),
  stocks: Object.fromEntries(STOCK_COMPANIES.map(c => [c.id, c.openingPrice])),
};
await writeFile(new URL('src/wealth/catalogue.json', root), JSON.stringify(catalogue, null, 2) + '\n');
const backend = new URL('services/backender/src/wealth/', root);
await mkdir(backend, { recursive: true });
for (const file of ['netWorth.js', 'catalogue.json']) await copyFile(new URL('src/wealth/' + file, root), new URL(file, backend));
console.log('BPC valuation catalogue and calculator synchronized. Restart Backender.');
