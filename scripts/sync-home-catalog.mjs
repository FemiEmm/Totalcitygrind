import { writeFile } from 'node:fs/promises';
import { STARTER_HOMES } from '../src/property/data/starterHomes.js';
const destination = new URL('../services/backender/data-catalog/homes.json', import.meta.url);
await writeFile(destination, JSON.stringify(STARTER_HOMES, null, 2) + '\n');
console.log('Updated Backender home catalogue. Restart Backender to use it.');
