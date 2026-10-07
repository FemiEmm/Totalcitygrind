<script setup>
import { ref, computed } from 'vue';
import { PUBLIC_EMPLOYERS } from '../government/rules.js';
import { CATEGORIES, COURSES, WORKPLACES, WASTE_PAY, getCourse, getWorkplace } from './catalogue.js';
const props=defineProps({state:Object,mode:{default:'me'},workplace:Object,bars:Object,homeAddress:{type:String,default:''},minute:Number,occupied:Object,busy:Boolean,error:String});
const emit=defineEmits(['action','close']);
const tab=ref('Education');
const courses=computed(()=>COURSES.filter(c=>c.category===tab.value));
const job=computed(()=>getWorkplace(props.state.job?.workplaceId));
const role=computed(()=>getCourse(props.state.job?.courseId));
const money=v=>'₦'+v.toLocaleString();
const vacancies=(w,c)=>Math.max(0,c.capacity-(props.occupied?.[w.id+':'+c.id]||0));
const act=(op,extra={})=>emit('action',{op,...extra});
const time=min=>Math.ceil(Math.max(0,min))+' game min';
</script>
<template><section class="career-panel">
 <header><h3>{{ mode==='school'?'Sango Otta School':mode==='work'?workplace?.name:'Me' }}</h3><button v-if="mode!=='me'" @click="$emit('close')" aria-label="Close">✕</button></header>
 <article v-if="mode==='me' && homeAddress" class="career-home"><strong>🏠 Home address</strong><p>{{ homeAddress }}</p></article>
 <p v-if="error" role="alert">{{ error }}</p><p v-else-if="state.message" role="status">{{ state.message }}</p>
 <template v-if="mode==='me'">
  <div class="career-bars">
  <article v-for="bar in [{key:'health',name:'Health',icon:'❤️'},{key:'energy',name:'Energy',icon:'⚡'},{key:'fuel',name:'Fuel',icon:'⛽'},{key:'damage',name:'Vehicle damage',icon:'🔧'}]" :key="bar.key" class="career-bar">
   <label :for="'me-'+bar.key">{{bar.icon}} {{bar.name}} <strong>{{Math.round(bars?.[bar.key]||0)}}%</strong></label><progress :id="'me-'+bar.key" :value="bars?.[bar.key]||0" max="100" />
  </article>

  </div>
  <article v-if="bars?.intoxication>0"><strong>🥴 Intoxicated</strong><p>Steering nudges become more frequent while intoxicated. Sleep clears the effect twice as fast.</p></article>
  <h4>Current courses</h4><p v-if="!Object.keys(state.courses).length && !state.lesson">Park at Sango Otta School to begin.</p>
  <article v-for="c in COURSES.filter(c=>(state.courses[c.id] || state.lesson?.courseId===c.id)&&!state.certificates.includes(c.id))" :key="c.id"><strong>{{c.name}}</strong><p>{{state.courses[c.id]||0}} / {{c.classes}} classes completed</p></article>
 </template>
 <article v-if="state.lesson"><strong>{{getCourse(state.lesson.courseId)?.name}} — class in progress</strong><progress :value="state.lesson.elapsed" max="360" /><p>{{time(360-state.lesson.elapsed)}} remaining. Stay parked; leaving cancels this class.</p><button :disabled="busy" @click="act('cancel-class')">Leave class</button></article>
 <template v-if="mode==='school'">
  <nav aria-label="Course categories"><button v-for="cat in CATEGORIES" :key="cat" :class="{selected:tab===cat}" @click="tab=cat">{{cat}}</button></nav>
  <article v-for="c in courses" :key="c.id"><strong>{{c.name}}</strong><p>{{c.classes}} classes · 6 hours each</p><p>{{state.courses[c.id]||0}} / {{c.classes}} completed · {{c.service==='lawma'?money(WASTE_PAY)+' per collection':money(c.weeklyPay)+' / 5 shifts'}}</p><button :disabled="busy||!!state.lesson||!!state.shift||state.certificates.includes(c.id)" @click="act('class',{courseId:c.id})">{{state.certificates.includes(c.id)?'Certified':'Begin next class'}}</button></article>
 </template>
 <template v-if="mode==='work' && workplace">
  <p v-if="PUBLIC_EMPLOYERS.includes(workplace.id)">Government-funded: wages depend on the treasury. Unpaid wages remain owed; see Government in Messages.</p>
  <p>Shift: {{String(workplace.slot*6).padStart(2,'0')}}:00–{{String((workplace.slot*6+6)%24).padStart(2,'0')}}:00. Five full shifts earn the weekly salary. Leaving early pays time worked.</p>
  <article v-for="id in workplace.roles" :key="id"><strong>{{getCourse(id)?.name}}</strong><p>{{getCourse(id)?.service==='lawma'?money(WASTE_PAY)+' per waste pickup':money(getCourse(id)?.weeklyPay||0)+' weekly'}}</p><p>{{vacancies(workplace,getCourse(id))}} / {{getCourse(id)?.capacity}} vacancies · {{getCourse(id)?.classes}} classes required</p><button :disabled="busy||!!state.job||!state.certificates.includes(id)||vacancies(workplace,getCourse(id))===0" @click="act('hire',{workplaceId:workplace.id,courseId:id})">{{state.certificates.includes(id)?'Apply':'Certificate required'}}</button></article>
 </template>
 <template v-if="mode==='me'"><h4>Certificates</h4><p v-if="!state.certificates.length">No certificates yet.</p><article v-for="id in state.certificates" :key="id">🎓 {{getCourse(id)?.name}}</article></template>
 <article v-if="job"><strong>{{role?.name}} · {{job.name}}</strong><p v-if="state.shift">On shift · {{time(state.shift.endsAt-minute)}} remaining</p><p v-else>Shift begins {{String(job.slot*6).padStart(2,'0')}}:00. Park at work to start.</p><button v-if="!state.shift && mode==='work' && workplace?.id===job.id" :disabled="busy" @click="act('shift')">Begin shift</button><button v-if="state.shift" :disabled="busy" @click="act('end-shift')">End shift</button><button :disabled="busy" @click="act('quit')">Quit job</button></article>
</section></template>
<style scoped>
.career-panel{color:#19253d;padding:14px;min-width:0;overflow:auto;max-height:100%;box-sizing:border-box}.career-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}.career-panel h3{margin:0;font-size:20px}.career-panel h4{margin:16px 0 8px}.career-panel article{background:#fffdf4;border:1px solid #d6d9dc;border-radius:14px;padding:12px;margin:10px 0;overflow-wrap:anywhere}.career-panel p{font-size:13px;line-height:1.5;margin:7px 0}.career-panel nav{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.career-panel button{border:0;border-radius:12px;background:#ffdd48;color:#19253d;padding:10px 13px;min-height:40px;white-space:normal;overflow-wrap:anywhere;font:inherit;font-size:13px;cursor:pointer;margin:3px}.career-panel button:disabled{opacity:.45;cursor:default}.career-panel nav button{background:#eae8df}.career-panel nav button.selected{background:#ffdd48}.career-panel progress{width:100%;height:12px;accent-color:#23b977}.career-bar label{display:flex;gap:8px;font-size:13px}.career-bar strong{margin-left:auto}
.career-bars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}.career-panel .career-bars .career-bar{margin:0;padding:8px;border-radius:10px}.career-bars .career-bar label{font-size:11px;gap:4px;align-items:center;flex-wrap:wrap}.career-bars progress{display:block;height:6px;margin-top:5px}.career-panel .career-home{margin-top:10px}.career-home p{margin-bottom:0}
</style>
