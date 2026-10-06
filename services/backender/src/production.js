// Fail closed on Render: never create an ephemeral file database for live accounts.
if(process.env.RENDER||process.env.NODE_ENV==='production'){
 if(process.env.STORAGE_DRIVER!=='postgres')throw new Error('Production requires STORAGE_DRIVER=postgres');
 for(const name of ['DATABASE_URL','ANON_KEY','SERVICE_ROLE_KEY','JWT_SECRET','CLIENT_ORIGINS'])if(!process.env[name]?.trim())throw new Error(name+' is required in production');
 for(const name of ['SERVICE_ROLE_KEY','JWT_SECRET'])if(process.env[name].length<32||/replace-|copy-|keep-the-/i.test(process.env[name]))throw new Error(name+' must be a private random value of at least 32 characters');
 if(process.env.SERVICE_ROLE_KEY===process.env.JWT_SECRET)throw new Error('Use separate secrets for the API key and JWT signing');
 if(process.env.CLIENT_ORIGINS.split(',').some(origin=>{try{return new URL(origin.trim()).protocol!=='https:';}catch{return true;}}))throw new Error('Production CLIENT_ORIGINS must contain HTTPS origins');
}
