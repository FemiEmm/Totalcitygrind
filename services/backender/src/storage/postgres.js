import fs from 'node:fs';
import pg from 'pg';
let pool;
export function databasePool() {
  if(pool) return pool;
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL storage');
  const url=new URL(process.env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  // SSL settings in the URI must not silently override certificate verification.
  for(const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name);
  const ca=process.env.DATABASE_CA_FILE ? fs.readFileSync(process.env.DATABASE_CA_FILE,'utf8') : undefined;
  pool=new pg.Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})}});
  pool.on('error',()=>console.error('Database connection lost; the next request will reconnect.'));
  return pool;
}
export async function checkDatabase() {
  const result=await databasePool().query('select schema_version from tcg_private.store_meta where id=1');
  if(result.rows[0]?.schema_version!==2) throw new Error('Apply the Total City Grind Supabase migration before starting Backender');
}
export async function closeDatabase(){if(pool)await pool.end();}
