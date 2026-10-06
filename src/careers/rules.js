import { createWasteLifecycle, WASTE_RESPAWN_MINUTES } from './wasteLifecycle.js';
import { PUBLIC_EMPLOYERS } from '../government/rules.js';
import { CLASS_MINUTES, SHIFT_MINUTES, WASTE_PAY, WASTE_LOCATIONS, WASTE_COLLECTION_RADIUS, getCourse, getWorkplace, atSchool, inBay, atWorkplace } from './catalogue.js';
export function createCareerState(){return {courses:{},certificates:[],lesson:null,job:null,shift:null,lastShift:null,waste:{},wasteLifecycle:createWasteLifecycle(),receipts:[],nextReceipt:1,message:''};}
export function restoreCareerState(saved){const s=createCareerState();if(saved&&typeof saved==='object')Object.assign(s,saved);s.courses||={};s.certificates||=[];s.waste||={};s.receipts||=[];if(s.wasteLifecycle?.version!==1)s.wasteLifecycle=createWasteLifecycle();return s;}
function receipt(s,amount,label){amount=Math.round(amount);if(amount>0)s.receipts.push({id:s.nextReceipt++,amount,label,publicEmployer:PUBLIC_EMPLOYERS.includes(s.job?.workplaceId)?s.job.workplaceId:null});}
export function finishShift(s){if(!s.shift)return;const c=getCourse(s.job?.courseId);if(c?.service!=='lawma')receipt(s,(c?.weeklyPay||0)*s.shift.worked/(5*SHIFT_MINUTES),'SHIFT · '+(c?.name||'Work'));s.shift=null;s.message='Shift ended. Wages recorded for time worked.';}
export function tickCareer(s,{minutes,pose,minute,blocked=false}){
 minutes=Math.max(0,Math.min(20,Number(minutes)||0));
 if(s.lesson){if(blocked||!atSchool(pose)){s.lesson=null;s.message='Class left early. No class credit.';}else{s.lesson.elapsed+=minutes;if(s.lesson.elapsed>=CLASS_MINUTES){const c=getCourse(s.lesson.courseId);if(c){s.courses[c.id]=Math.min(c.classes,(s.courses[c.id]||0)+1);if(s.courses[c.id]>=c.classes&&!s.certificates.includes(c.id))s.certificates.push(c.id);s.message=s.certificates.includes(c?.id)?'Certificate earned!':'Class completed.';}s.lesson=null;}}}
 if(s.shift){const c=getCourse(s.job?.courseId),w=getWorkplace(s.job?.workplaceId);if(!c||!w||blocked||(!c.service&&!atWorkplace(pose,w))){finishShift(s);return;}const remaining=Math.max(0,s.shift.endsAt-(minute-minutes));s.shift.worked+=Math.min(minutes,remaining);if(minute>=s.shift.endsAt)finishShift(s);}
}
export function careerAction(s,input,occupied={},wasteLifecycle=s.wasteLifecycle){
 const {op,pose,minute=0}=input;
 const c=getCourse(input.courseId),w=getWorkplace(input.workplaceId);
 if(!['status','tick'].includes(op))s.message='';
 if(op==='class'){
  if(!c||!atSchool(pose))throw Error('Park in a school bay first.');
  if(s.shift||s.lesson)throw Error('Finish your current class or shift first.');
  if(s.certificates.includes(c.id))throw Error('You already earned this certificate.');
  s.lesson={courseId:c.id,elapsed:0};s.message='Class started. Stay parked for six game hours.';
 }else if(op==='cancel-class'){s.lesson=null;s.message='Class cancelled. No class credit.';}
 else if(op==='hire'){
  if(!w||!c||!w.roles.includes(c.id)||!atWorkplace(pose,w))throw Error('Park at this workplace to apply.');
  if(s.job)throw Error('Quit your current job before taking another.');
  if(!s.certificates.includes(c.id))throw Error('Earn the required certificate at school first.');
  if((occupied[w.id+':'+c.id]||0)>=c.capacity)throw Error('No vacancies for this role.');
  s.job={workplaceId:w.id,courseId:c.id};s.message='Job accepted.';
 }else if(op==='quit'){finishShift(s);s.job=null;s.message='Job left. Your certificate is retained.';}
 else if(op==='shift'){
  const site=getWorkplace(s.job?.workplaceId),role=getCourse(s.job?.courseId);
  if(!site||!role||!atWorkplace(pose,site))throw Error('Park at your workplace first.');
  if(s.shift||s.lesson)throw Error('You already have a shift or class running.');
  const slot=Math.floor(((minute%1440)+1440)%1440/360),key=Math.floor(minute/360);
  if(slot!==site.slot)throw Error('Your shift starts at '+String(site.slot*6).padStart(2,'0')+':00.');
  if(s.lastShift===key)throw Error('You already worked this shift.');
  s.lastShift=key;s.shift={worked:0,endsAt:(key+1)*360};s.message='Shift started.';
 }else if(op==='end-shift'){finishShift(s);}
 else if(op==='collect'){
  if(!s.shift||minute>=s.shift.endsAt||getCourse(s.job?.courseId)?.service!=='lawma')throw Error('Start a LAWMA shift first.');
  const spot=WASTE_LOCATIONS.find(p=>p.id===input.wasteId);
  const wasteMinute=input.wasteMinute??minute;
  if(!spot||!pose||Math.hypot(pose.x-spot.x,pose.y-spot.y)>WASTE_COLLECTION_RADIUS||Math.abs(pose.speed||0)>=2)throw Error('Stop the waste truck beside the rubbish.');
  if(wasteLifecycle.removed[spot.id]>wasteMinute)throw Error('This pile has already been cleared.');
  wasteLifecycle.removed[spot.id]=wasteMinute+WASTE_RESPAWN_MINUTES;receipt(s,WASTE_PAY,'WASTE COLLECTED');s.message='Waste cleared. Earned ₦'+WASTE_PAY.toLocaleString()+'; treasury payment pending.';
 }else if(!['status','tick'].includes(op))throw Error('Unknown career action.');
 return s;
}
