import {randomBytes,randomUUID,scrypt,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {read,transaction} from './store.js';
const derive=promisify(scrypt);
const secret=process.env.JWT_SECRET;
if (!secret || secret.length<32) throw new Error('JWT_SECRET must contain at least 32 characters');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export class ApiError extends Error { constructor(status,message,code='invalid_request'){super(message);this.status=status;this.code=code;} }
export function publicUser(user) {
  return {id:user.id,aud:'authenticated',role:'authenticated',email:user.email,email_confirmed_at:null,created_at:user.created_at,updated_at:user.created_at,app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:user.display_name,username:user.username||null},identities:[],is_anonymous:false};
}
function jwt(user,expires) {
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const content=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,iss:(process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||'http://127.0.0.1:3001')+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:expires,jti:randomUUID()});
  return content+'.'+createHmac('sha256',secret).update(content).digest('base64url');
}
function issue(db,user) {
  const now=Date.now();
  for(const [key,session] of Object.entries(db.sessions)) if(session.refreshExpires<=now) delete db.sessions[key];
  const userSessions=Object.entries(db.sessions).filter(([,s])=>s.userId===user.id).sort((a,b)=>a[1].created-b[1].created);
  while(userSessions.length>=10) { const oldest=userSessions.shift();delete db.sessions[oldest[0]]; }
  const expires=Math.floor(now/1000)+3600;
  const access=jwt(user,expires),refresh=randomBytes(40).toString('base64url');
  db.sessions[digest(access)]={userId:user.id,accessExpires:expires*1000,refreshHash:digest(refresh),refreshExpires:now+30*86400_000,created:now};
  return {access_token:access,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:refresh,user:publicUser(user)};
}
function credentials(body) {
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>128) throw new ApiError(400,'Password must be 8–128 characters');
  return {password:body.password};
}
function normaliseUsername(value) {
  if(typeof value!=='string'||!/^@?[a-zA-Z0-9_]{3,24}$/.test(value.trim())) throw new ApiError(400,'Username must be 3–24 letters, numbers or underscores');
  return value.trim().replace(/^@/,'');
}
export function displayName(input) {
  if(typeof input!=='string'||input.trim().length<1||input.trim().length>24||/[<>\p{Cc}\p{Cf}]/u.test(input)) throw new ApiError(400,'Display name must be 1–24 plain-text characters');
  return input.trim();
}
export async function signup(body) {
  const {password}=credentials(body);
  const username=normaliseUsername(body.data?.username);
  const fullName=displayName(body.data?.full_name);
  const name=username;
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email&&(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)) throw new ApiError(400,'Provide a valid email or leave it empty');
  if(body.data?.age_confirmed!==true||body.data?.terms_accepted!==true||body.data?.terms_version!=='2026-10-05') throw new ApiError(400,'Confirm you are 18 or older and accept the Terms and Privacy Policy');
  const salt=randomBytes(16).toString('hex');
  const hash=Buffer.from(await derive(password,salt,64)).toString('hex');
  return transaction(db=>{
    if(email&&Object.values(db.users).some(user=>user.email===email)) throw new ApiError(422,'An account already exists for this email','user_already_exists');
    if(Object.values(db.users).some(user=>(user.username||'').toLowerCase()===username.toLowerCase())) throw new ApiError(422,'That username is taken','username_taken');
    const id=randomUUID(),created_at=new Date().toISOString();
    const user={id,email:email||null,username,full_name:fullName,display_name:name,salt,passwordHash:hash,created_at,agreement:{version:body.data.terms_version,accepted_at:created_at,age_confirmed:true}};
    db.users[id]=user;
    db.profiles[id]={id,display_name:name,money:0,owned_vehicle_ids:['starter-danfo'],inventory:{},customization:{owned:{sticker:[],paint:[],phone:[]},vehicles:{},phone:null},progression:{},created_at,updated_at:created_at};
    return issue(db,user);
  });
}
export async function login(body) {
  const {password}=credentials(body);
  const identifier=String(body.identifier??body.email??'').trim().toLowerCase();
  if(!identifier||identifier.length>254) throw new ApiError(400,'Enter your username or email');
  const user=Object.values(read('users')).find(user=>identifier.includes('@')&&!identifier.startsWith('@')?user.email===identifier:(user.username||'').toLowerCase()===identifier.replace(/^@/,''));
  const hash=Buffer.from(await derive(password,user?.salt??'unknown-account',64));
  if(!user||!timingSafeEqual(hash,Buffer.from(user.passwordHash,'hex'))) throw new ApiError(400,'Invalid login credentials','invalid_credentials');
  return transaction(db=>issue(db,db.users[user.id]));
}
export function refresh(body) {
  if(typeof body.refresh_token!=='string') throw new ApiError(400,'Refresh token required');
  const hash=digest(body.refresh_token);
  return transaction(db=>{
    const entry=Object.entries(db.sessions).find(([,s])=>s.refreshHash===hash&&s.refreshExpires>Date.now());
    if(!entry) throw new ApiError(400,'Refresh token expired or already used','refresh_token_not_found');
    const [key,session]=entry;delete db.sessions[key];
    return issue(db,db.users[session.userId]);
  });
}
export function authenticate(token) {
  if(!token||token.length>4096) throw new ApiError(401,'Access token required');
  const session=read('sessions',digest(token));
  const user=session ? read('users',session.userId) : null;
  if(!session||session.accessExpires<=Date.now()||!user) throw new ApiError(401,'Invalid or expired access token');
  return user;
}
export function logout(token,scope='global') {
  const user=authenticate(token);
  if(!['global','local','others'].includes(scope)) throw new ApiError(400,'Invalid logout scope');
  transaction(db=>{for(const [key,s] of Object.entries(db.sessions)) {
    if(s.userId===user.id&&(scope==='global'||(scope==='local'?key===digest(token):key!==digest(token)))) delete db.sessions[key];
  }});
}
