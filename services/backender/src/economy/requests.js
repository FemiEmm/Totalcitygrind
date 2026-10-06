import {createHash} from 'node:crypto';
import {ApiError} from '../auth.js';
const proofFields=new Set(['serverPose','serverTarget','serverTruckBayBlocked']);
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
export function requestIdentity(input){
 if(!/^[a-zA-Z0-9-]{8,100}$/.test(input.requestId||'')||!Number.isFinite(input.requestTime)||Date.now()-input.requestTime>900000||input.requestTime>Date.now()+30000)throw new ApiError(400,'This request has expired. Reopen the action and try again.');
 const content=Object.fromEntries(Object.entries(input).filter(([key])=>!proofFields.has(key)));
 return {key:input.requestId,fingerprint:createHash('sha256').update(JSON.stringify(canonical(content))).digest('hex')};
}
