// One-time conversion preserves relative deadlines when joining shared city time.
export function rebaseCityDates(value,dayDelta,minuteDelta){
 if(!value||typeof value!=='object')return;
 const minutes=new Set(['effectsLastMinute','dryGinCrashAtGameMinute','lockUntil','releaseMinute','endsAt']);
 for(const [key,item] of Object.entries(value)){
  if(key==='ginDoses'&&Array.isArray(item)){value[key]=item.map(n=>n+minuteDelta);continue;}
  if(Number.isFinite(item)){
   if((key==='day'||/^(last|next|requested|deadline|completed|officePurchased|purchased|started|current|created|accepted|due).*Day$/.test(key))&&item>0)value[key]=Math.max(1,item+dayDelta);
   else if(minutes.has(key)&&item>0&&item<1e9)value[key]=Math.max(0,item+minuteDelta);
  }else if(item&&typeof item==='object')rebaseCityDates(item,dayDelta,minuteDelta);
 }
}
