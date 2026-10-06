if(process.env.RENDER||process.env.NODE_ENV==='production'){
 if(process.env.REQUIRE_AUTH!=='true')throw new Error('Production requires REQUIRE_AUTH=true');
 if(process.env.BACKEND_PROVIDER!=='backender')throw new Error('Use Backender with Supabase persistence as the backend provider');
 for(const name of ['BACKEND_URL','BACKEND_ANON_KEY','BACKEND_SERVICE_ROLE_KEY','CLIENT_ORIGINS'])if(!process.env[name]?.trim())throw new Error(name+' is required in production');
 if(new URL(process.env.BACKEND_URL!).protocol!=='https:')throw new Error('BACKEND_URL must use HTTPS');
 const key=process.env.BACKEND_SERVICE_ROLE_KEY!;
 if(key.length<32||/replace-|copy-|keep-the-/i.test(key))throw new Error('Configure the private Backender service key');
 if(key===process.env.BACKEND_ANON_KEY)throw new Error('Public and private backend keys must differ');
 if(process.env.ALLOW_NULL_ORIGIN==='true')throw new Error('File origins are disabled in production');
 if(process.env.CLIENT_ORIGINS!.split(',').some(origin=>{try{return new URL(origin.trim()).protocol!=='https:';}catch{return true;}}))throw new Error('Production CLIENT_ORIGINS must contain HTTPS origins');
}
export {};
