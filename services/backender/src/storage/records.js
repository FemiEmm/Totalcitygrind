import {isDeepStrictEqual} from 'node:util';
import {mapTables,arrayTables,recordTables} from './layout.js';
const get=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
function put(object,path,value){const keys=path.split('.');let cursor=object;for(const key of keys.slice(0,-1))cursor=cursor[key] ||= {};cursor[keys.at(-1)]=value;}
function remove(object,path){const keys=path.split('.'),parent=keys.length===1?object:get(object,keys.slice(0,-1).join('.'));if(parent)delete parent[keys.at(-1)];}
export function encodeRecords(state){
 const remaining=structuredClone(state),rows=new Map(recordTables.map(name=>[name,new Map()]));
 const ledger=[];
 for(const [name,path] of mapTables){
  for(const [key,payload] of Object.entries(get(remaining,path)||{})){
   if(name==='wallets'){
    for(const [component,value] of Object.entries(payload.state||{}))rows.get('wallet_components').set(key+':'+component,{playerId:key,key:component,value});
    for(const [request,receipt] of Object.entries(payload.requests||{}))rows.get('processed_requests').set(key+':'+request,{playerId:key,key:request,receipt});
    for(const entry of payload.ledger||[])ledger.push({record_key:key+':'+entry.id,payload:{playerId:key,entry}});
    delete payload.state;delete payload.requests;delete payload.ledger;
   }
   rows.get(name).set(key,payload);
  }
  remove(remaining,path);
 }
 for(const [name,path] of arrayTables){const values=get(remaining,path);if(values)values.forEach((payload,index)=>rows.get(name).set(String(index),payload));remove(remaining,path);}
 for(const [key,payload] of Object.entries(remaining))rows.get('shared_state').set(key,payload);
 return {rows,ledger};
}
export async function loadRecords(client){
 const rows=new Map(recordTables.map(table=>[table,new Map()]));
 // One read round trip; historical ledger and expired retry payloads are not hydrated.
 const query=recordTables.map(table=>"select '"+table+"' as table_name,record_key,payload from tcg_private."+table+(table==='processed_requests'?" where updated_at > now() - interval '15 minutes'":'')).join(' union all ');
 for(const row of (await client.query(query)).rows)rows.get(row.table_name).set(row.record_key,row.payload);
 // Capture detached data before hydration. JSONB object key order is not significant.
 const before=new Map([...rows].map(([table,values])=>[table,new Map([...values].map(([key,value])=>[key,structuredClone(value)]))]));
 const state={version:1,users:{},profiles:{},sessions:{},...Object.fromEntries(rows.get('shared_state'))};
 for(const [name,path] of mapTables){const values=rows.get(name);if(values.size||!path.includes('.'))put(state,path,Object.fromEntries(values));else if(get(state,path.split('.')[0]))put(state,path,{});}
 for(const [name,path] of arrayTables){const values=rows.get(name);if(values.size||get(state,path.split('.')[0]))put(state,path,[...values].sort((a,b)=>Number(a[0])-Number(b[0])).map(([,value])=>value));}
 for(const wallet of Object.values(state.wallets||{})){wallet.state={};wallet.requests={};wallet.ledger=[];}
 for(const payload of rows.get('wallet_components').values()){const wallet=state.wallets[payload.playerId];if(!wallet)throw Error('Orphan wallet component');wallet.state[payload.key]=payload.value;}
 for(const payload of rows.get('processed_requests').values()){const wallet=state.wallets[payload.playerId];if(!wallet)throw Error('Orphan transaction receipt');wallet.requests[payload.key]=payload.receipt;}
 return {state,before};
}
export async function persistRecords(client,state,before){
 const {rows,ledger}=encodeRecords(state),writes=[],writeParameters=[];
 for(const table of recordTables){
  const values=rows.get(table),previous=before.get(table),updates=[];
  for(const [key,payload] of values)if(!previous.has(key)||!isDeepStrictEqual(previous.get(key),payload)){
   if(table==='processed_requests'&&previous.has(key)){
    const error=new Error('Committed request receipt changed');error.code='IMMUTABLE_RECEIPT_CHANGED';throw error;
   }
   updates.push({record_key:key,payload});
  }
  if(updates.length){
   // Unique immutable receipts deliberately abort the entire transaction on replay.
   const conflict=table==='processed_requests'?'':' on conflict(record_key) do update set payload=excluded.payload,updated_at=now()';
   writeParameters.push(JSON.stringify(updates));
   writes.push('write_'+table+' as (insert into tcg_private.'+table+'(record_key,payload) select record_key,payload from jsonb_to_recordset($'+writeParameters.length+'::jsonb) as x(record_key text,payload jsonb)'+conflict+' returning 1)');
  }
 }
 if(ledger.length){
  writeParameters.push(JSON.stringify(ledger));
  writes.push('write_ledger as (insert into tcg_private.wallet_ledger(record_key,payload) select record_key,payload from jsonb_to_recordset($'+writeParameters.length+'::jsonb) as x(record_key text,payload jsonb) returning 1)');
 }
 // Batch per-table writes to avoid one network round trip per table.
 if(writes.length)await client.query('with '+writes.join(',')+' select 1',writeParameters);
 const deletes=[],deleteParameters=[];
 for(const table of [...recordTables].reverse()){
  if(table==='processed_requests')continue;
  const removed=[...before.get(table).keys()].filter(key=>!rows.get(table).has(key));
  if(removed.length){deleteParameters.push(removed);deletes.push('delete_'+table+' as (delete from tcg_private.'+table+' where record_key=any($'+deleteParameters.length+'::text[]) returning 1)');}
 }
 // Account foreign keys cascade historical receipts on deliberate account deletion.
 if(deletes.length)await client.query('with '+deletes.join(',')+' select 1',deleteParameters);
 if(writes.length||deletes.length)await client.query('update tcg_private.store_meta set revision=revision+1,updated_at=now() where id=1');
}
