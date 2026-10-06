import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
export const storageDriver=process.env.STORAGE_DRIVER||'file';
if(!['file','postgres'].includes(storageDriver))throw new Error('STORAGE_DRIVER must be file or postgres');
const cloud=storageDriver==='postgres';
const context=new AsyncLocalStorage();
const file=path.resolve(process.env.DATA_FILE||'./data/backender.json');
let state={version:1,users:{},profiles:{},sessions:{}};
if(!cloud){
  if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file,'utf8'));
  validate(state);
  fs.mkdirSync(path.dirname(file),{recursive:true});
}
function validate(value){if(value.version!==1||!value.users||!value.profiles||!value.sessions)throw new Error('Unsupported or incomplete game storage');}
let activeTransaction=null;
function source(){
  if(!cloud)return activeTransaction||state;
  const scope=context.getStore();
  if(!scope)throw new Error('PostgreSQL state must be accessed inside a request transaction');
  return scope.state;
}
export function read(section,key){const data=source();return structuredClone(section===undefined?data:key===undefined?data[section]:data[section]?.[key]);}
export function transaction(change){
  if(cloud){
    const scope=context.getStore();if(!scope)throw new Error('Missing database transaction');
    if(scope.failed)throw scope.failed;
    scope.dirty=true;
    try {
      const result=change(scope.state);
      if(result?.then)throw new Error('Game state mutation callbacks must be synchronous');
      return result;
    }catch(error){scope.failed=error;throw error;}
  }
  if(activeTransaction)return change(activeTransaction);
  const next=structuredClone(state);let result;activeTransaction=next;
  try{result=change(next);}finally{activeTransaction=null;}
  const temp=file+'.tmp',descriptor=fs.openSync(temp,'w',0o600);
  try{fs.writeFileSync(descriptor,JSON.stringify(next,null,2));fs.fsyncSync(descriptor);}finally{fs.closeSync(descriptor);}
  fs.renameSync(temp,file);state=next;return result;
}
// Shared wages, housing and passenger transfers currently use one world transaction.
// No request is acknowledged before COMMIT, and failures never fall back to local data.
export async function withStoreRequest(work){
  if(!cloud)return work();
  const {databasePool}=await import('./storage/postgres.js');
  const client=await databasePool().connect();
  try{
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '8s'");
    await client.query("set local idle_in_transaction_session_timeout = '10s'");
    const meta=await client.query('select schema_version from tcg_private.store_meta where id=1 for update');
    if(meta.rows[0]?.schema_version!==2)throw new Error('Apply game tables migration before starting Backender');
    const {loadRecords,persistRecords}=await import('./storage/records.js');
    const {state:data,before}=await loadRecords(client);validate(data);
    const scope={state:data,dirty:false,failed:null};
    const result=await context.run(scope,work);
    if(scope.failed)throw scope.failed;
    if(scope.dirty)await persistRecords(client,data,before);
    await client.query('commit');return result;
  }catch(error){await client.query('rollback').catch(()=>{});throw error;}
  finally{client.release();}
}
export async function initializeStore(){if(cloud){const {checkDatabase}=await import('./storage/postgres.js');await checkDatabase();}}
export async function closeStore(){if(cloud){const {closeDatabase}=await import('./storage/postgres.js');await closeDatabase();}}
