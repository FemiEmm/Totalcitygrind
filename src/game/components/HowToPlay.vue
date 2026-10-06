<script setup>
import { ref } from 'vue';
const dialog = ref(null);
const sections = [
  { title: 'Start your life', lines: ['Choose Play Online Game for the shared city or Play Offline for a local game.', 'Pick an available home and pay the first rent. Park at home to sleep. Keep money for rent, fuel and food.'] },
  { title: 'Drive your car', lines: ['Press START (key icon) to start the engine. It changes to STOP. Throttle does not start the engine.', 'PC: W = throttle, S = brake / reverse, A / D = steer, I = engine, H = horn. Manual cars: E = gear up, Q = gear down.', 'Mobile: hold the steering and pedal buttons. Play with your phone sideways. Automatic cars change gears for you.', 'Use Pause or Esc to open the pause menu.'] },
  { title: 'Earn with a danfo', lines: ['Choose a route, follow the next-stop guide and stop at bus stops. Wait for the passenger pickup indicator to finish.', 'Stops share 1,000 NPCs. Only passengers whose destination is ahead on your route board, one at a time while you wait. Leaving ends boarding. Drop-offs rest before another journey.', 'Earn fares from passengers; there is no route-completion bonus. Agbero charges: ₦1,000 for the first pickup of the day, then ₦300 at later pickups.'] },
  { title: 'Study and get a job', lines: ['Park at Sango Otta School and choose a course. Complete 5 or 10 classes, depending on the career.', 'Each class takes 6 in-game hours. Leave early and that class does not count. See courses and certificates in the Me phone app.', 'With your certificate, park at the workplace and apply. Jobs have limited vacancies. Quit your current job before taking another.', 'Start at the workplace’s shift time. A shift lasts 6 in-game hours; ordinary jobs pay for hours worked if you leave early. Listed weekly pay is based on five full shifts.'] },
  { title: 'Police, LASTMA and LAWMA', lines: ['Starting a service shift gives you its work vehicle.', 'Police and LASTMA can stop nearby online players. Police check crime; LASTMA check unpaid traffic fines.', 'LAWMA: stop the waste truck beside a pile and wait for the pickup indicator. Earn ₦1,500 per collection, not for waiting. Piles return 5 in-game days after removal.'] },
  { title: 'Homes and rent', lines: ['Open Housing to buy a home, move into a vacant house you own, or rent another online player’s listing. Owners choose their own weekly rent.', 'Mainland Terrace and Alimosho residences cost ₦5 million. Lagoon View costs ₦10 million. Each owned home has ₦30,000 NEPA and ₦15,000 waste bills per game week; no property tax.', 'Sleeping at home gives one robbery check per game week: Sango Otta rooms 15%, ordinary larger homes 5%, Lagoon View 0%. Robbery takes 10–75% of carried cash. Bank savings stay safe.', 'Larger homes restore energy faster. Look in Housing for your parking coordinates.'] },
  { title: 'Tax and government', lines: ['Tax is charged on income earned each in-game week. It starts at 15%; the governor can change it.', 'Government funds pay public workers. If funds run out, unpaid wages remain owed.', 'Elections follow real-world weeks. Buy a ₦10 million nomination form at the governor’s house. Vote through your phone on Sunday, Lagos time.', 'The governor can also adjust mainland single-room rents.'] },
  { title: 'Look after yourself', lines: ['Tap your emoji to show health, energy, fuel and damage. The Me app also shows your status.', 'Eat and sleep to recover energy. Use hospitals for health, petrol stations for fuel and mechanics for repairs.', 'Alcohol makes steering drift. More intoxication means more frequent drift; sleeping clears it faster.', 'Traffic offences and collisions increase crime. High crime can lead to arrest at police hotspots: pay a bribe or serve time at the station.'] },
  { title: 'Mr-Wire bank job', lines: ['Open Mr-Wire in Messages and accept the job. Stop at the bank parking bay to collect ₦10 million per game hour, up to ₦100 million.', 'Leave when ready and drive to your home parking. Crossing a police hotspot costs all carried cash and 24 game hours in jail. Savings stay safe.', 'Reach home to receive half the loot. Your crime stays at 100% for 14 game days. The bank then needs two game days before another robbery.'] },
  { title: 'Use your phone', lines: ['Messages holds family requests and the stock adviser subscription. Subscriptions renew until cancelled.', 'Use banking and stocks to manage money. Stock prices can rise or fall with business activity.', 'CUSTOMIZE sells vehicle colours, roof stickers and phone styles. Big People Club shows wealth rankings.', 'Use Save Game in the pause menu for offline progress. Online progress needs a working city connection.'] },
];
function open() { dialog.value?.showModal(); }
defineExpose({ open });
</script>

<template>
  <dialog ref="dialog" class="how-to" aria-labelledby="how-to-title" @keydown.stop @click="event => { if (event.target === dialog) dialog.close(); }">
    <header class="how-to__header">
      <h2 id="how-to-title">How to Play</h2>
      <button type="button" autofocus aria-label="Close manual" @click="dialog.close()"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
    </header>
    <div class="how-to__body">
      <p class="how-to__intro">Drive, earn, learn and build your life. Tap a topic below.</p>
      <details v-for="(section, index) in sections" :key="section.title" :open="index === 1">
        <summary>{{ section.title }}</summary>
        <ul><li v-for="line in section.lines" :key="line">{{ line }}</li></ul>
      </details>
    </div>
  </dialog>
</template>

<style scoped>
.how-to { box-sizing:border-box; width:min(640px, calc(100vw - 24px)); max-height:calc(100dvh - 24px); padding:0; border:1px solid #d9d0b3; border-radius:20px; color:#17213a; background:#fff7dc; font-family:inherit; overflow:hidden; }
.how-to[open] { display:flex; flex-direction:column; }
.how-to::backdrop { background:rgb(10 18 33 / 72%); }
.how-to__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-bottom:1px solid #e1d7b9; flex-shrink:0; }
.how-to__header h2 { margin:0; font-size:22px; }
.how-to__header button { min-width:44px; min-height:44px; border:0; border-radius:12px; background:#ffdb3b; color:#17213a; font-size:22px; cursor:pointer; }
.how-to__body { padding:12px 18px 18px; overflow-y:auto; overscroll-behavior:contain; min-height:0; font-size:15px; line-height:1.5; }
.how-to__intro { margin:0 0 12px; }
.how-to details { background:#fffdf5; border:1px solid #e1d7b9; border-radius:12px; margin-top:8px; overflow-wrap:anywhere; }
.how-to summary { padding:12px; cursor:pointer; font-weight:700; min-height:24px; }
.how-to ul { margin:0; padding:0 18px 14px 32px; }
.how-to li + li { margin-top:8px; }
.how-to button:focus-visible, .how-to summary:focus-visible { outline:3px solid #287be8; outline-offset:-3px; }
</style>
