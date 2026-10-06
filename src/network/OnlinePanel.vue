<script setup>
import { ref, onMounted } from 'vue';
import { connection, checkConnections, signIn, signOut, retryWorldConnection, deleteOnlineAccount } from './connection.js';
const props = defineProps({ active: Boolean, busy: Boolean });
const emit = defineEmits(['close', 'enter', 'logout']);
const username = ref(''), identifier = ref(''), accepted = ref(false), showPassword = ref(false), legal = ref('');
const email = ref(''), password = ref(''), name = ref(''), signup = ref(false), waiting = ref(false), error = ref('');
async function login() {
  waiting.value = true; error.value = '';
  try { await signIn({ email: email.value, password: password.value, name: name.value, username: username.value, identifier: identifier.value, accepted: accepted.value, signup: signup.value }); password.value = ''; }
  catch (cause) { error.value = cause.message; }
  finally { waiting.value = false; }
}
async function logout() {
  waiting.value = true;
  try { await signOut(); } catch (cause) { error.value = cause.message; }
  finally { waiting.value = false; emit('logout'); }
}
const deleting = ref(false), deleteConfirmation = ref('');
async function removeAccount() {
  if (props.active || props.busy || waiting.value || deleteConfirmation.value !== 'DELETE') return;
  waiting.value = true; error.value = '';
  try {
    await deleteOnlineAccount(deleteConfirmation.value);
    deleting.value = false; deleteConfirmation.value = '';
    emit('logout');
  } catch (cause) { error.value = cause.message; }
  finally { waiting.value = false; }
}
onMounted(checkConnections);
</script>
<template>
  <section class="online" role="dialog" aria-modal="true" aria-labelledby="online-title" @keydown.stop @keyup.stop>
    <div class="online__panel">
      <header><h2 id="online-title">Online city</h2><button aria-label="Close" :disabled="busy || waiting" @click="emit('close')">✕</button></header>
      <button v-if="active && connection.presence !== 'In city'" @click="retryWorldConnection" :disabled="busy || waiting">Reconnect</button>
      <form v-if="!connection.user" @submit.prevent="login">
        <p class="alpha-notice">This is an alpha test. The game’s assets, visuals and overall experience will improve as development continues.</p>
        <label v-if="signup">Your name<input v-model="name" required maxlength="24" autocomplete="name" /><small>Your name is private. Your username is shown in the game.</small></label>
        <label v-if="signup">Username<input v-model="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="username" autocapitalize="none" spellcheck="false" /><small>3–24 letters, numbers or underscores. This is your in-game name.</small></label>
        <label v-else>Username or email<input v-model="identifier" required maxlength="254" autocomplete="username" autocapitalize="none" spellcheck="false" /></label>
        <label>Password<span class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" minlength="8" maxlength="128" required :autocomplete="signup ? 'new-password' : 'current-password'" /><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><i class="fa-solid" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true" /></button></span><small v-if="signup">At least 8 characters.</small></label>
        <label v-if="signup">Email (optional)<input v-model="email" type="email" maxlength="254" autocomplete="email" /><small>Password recovery is not available in this alpha yet. Without an email, email-based recovery will not be possible.</small></label>
        <div v-if="signup" class="agreement"><label><input v-model="accepted" type="checkbox" required /> I’m 18 or older and agree to the Terms and Privacy Policy.</label><span><button type="button" @click="legal = 'terms'">Terms and Conditions</button> · <button type="button" @click="legal = 'privacy'">Privacy Policy</button></span></div>
        <button :disabled="waiting || (signup && !accepted)">{{ waiting ? 'Connecting…' : signup ? 'Create account' : 'Sign in' }}</button>
        <button type="button" :disabled="waiting" @click="signup = !signup; error = ''; legal = ''">{{ signup ? 'I already have an account' : 'Create an account' }}</button>
      </form>
      <template v-else>
        <p>Signed in as <strong>{{ connection.user.user_metadata?.display_name || connection.user.email }}</strong></p>
        <button v-if="!active" :disabled="busy || waiting || deleting" @click="emit('enter')">{{ busy ? 'Loading account…' : 'Play online' }}</button>
        <button v-else :disabled="busy || waiting" @click="emit('close')">Back to game</button>
        <button v-if="!active" :disabled="waiting || busy || deleting" @click="logout">Sign out</button>
        <p v-else>Return to the main menu to sign out or delete your online account.</p>
        <button v-if="!active && !deleting" class="danger" :disabled="waiting || busy" @click="deleting = true; deleteConfirmation = ''">Delete online account</button>
        <form v-if="!active && deleting" class="delete-account" @submit.prevent="removeAccount">
          <strong>Permanently delete your online account?</strong>
          <p>This removes your login, online progress, purchases and ranking, and releases your rented home. This cannot be undone. Offline saves are kept.</p>
          <label>Type DELETE to confirm<input v-model="deleteConfirmation" autocomplete="off" autocapitalize="characters" :disabled="waiting" /></label>
          <button class="danger" :disabled="waiting || busy || deleteConfirmation !== 'DELETE'">{{ waiting ? 'Deleting…' : 'Permanently delete account' }}</button>
          <button type="button" :disabled="waiting" @click="deleting = false; deleteConfirmation = ''">Cancel</button>
        </form>
      </template>
      <section v-if="legal" class="legal-copy" aria-label="Account policies">
        <header><h3>{{ legal === 'terms' ? 'Terms and Conditions' : 'Privacy Policy' }}</h3><button type="button" @click="legal = ''">Close</button></header>
        <small>Alpha version · 5 October 2026</small>
        <template v-if="legal === 'terms'">
          <p>Total City Grind is an alpha game for players aged 18 or older. Features, assets and game balance may change. Bugs, downtime and progress resets may occur during development.</p>
          <p>Keep your password private. Do not cheat, exploit bugs, disrupt the service, harass other players or use offensive or impersonating usernames.</p>
          <p>Game currency, items and rewards are virtual gameplay features and have no cash redemption value. In-game crimes and activities are fictional.</p>
          <p>Use only content you have permission to share. Access may be restricted for abuse. You can delete your online account from the online menu.</p>
        </template>
        <template v-else>
          <p>We store your name, username, optional email, a salted password hash, sign-in sessions and your agreement confirmation. Your username is public; your name and email are not displayed to other players.</p>
          <p>The game stores online progress, housing, inventory, transactions and rankings to operate your account. Online players can see your in-game name, vehicle and location. The browser also stores sign-in tokens, settings and local saves.</p>
          <p>Visit totals and online-player counts are recorded for the menu. Temporary visit identifiers are retained for up to 24 hours to avoid counting retries. Hosting and network services process connection information to deliver the game.</p>
          <p>Delete online account removes your active account and online progress and releases your home. Offline saves remain on your device. Copies in existing backups may remain until those backups are replaced or removed.</p>
          <p>Email is optional. Password recovery is not currently available in this alpha.</p>
        </template>
      </section>
      <p class="error" v-if="error || connection.error" role="alert">{{ error || connection.error }}</p>
      <button v-if="error || connection.error" :disabled="busy || waiting" @click="checkConnections">Retry connection</button>
    </div>
  </section>
</template>
<style scoped>
.alpha-notice {padding:12px;border-radius:10px;background:#ffedac;line-height:1.4;}
.password-field {display:flex;gap:6px;min-width:0;} .password-field input {flex:1;width:0;}
.agreement label {display:flex;align-items:flex-start;gap:10px;} .agreement input {flex:none;margin-top:4px;}
.agreement button {background:none;text-decoration:underline;padding:4px;min-height:32px;}
.legal-copy {display:grid;gap:12px;padding:14px;border:1px solid #bac0c8;border-radius:12px;line-height:1.5;} .legal-copy h3 {margin:0;}
small {line-height:1.4;} form {min-width:0;}

.online { position:fixed; inset:0; z-index:10000020; background:#142039db; display:grid; place-items:center; padding:12px; color:#17213a; }
.online__panel { box-sizing:border-box; width:min(620px,100%); max-height:100%; overflow:auto; overscroll-behavior:contain; touch-action:pan-y; background:#fff8df; border-radius:22px; padding:20px; display:grid; gap:12px; }
header { display:flex; align-items:center; justify-content:space-between; gap:12px; } h2,p { margin:0; }
form,label { display:grid; gap:8px; } input { min-width:0; padding:10px; font:inherit; user-select:text; border:1px solid #bac0c8; border-radius:9px; }
button { min-height:42px; border:0; border-radius:10px; padding:9px 15px; font:inherit; color:#17213a; background:#ffdb3b; cursor:pointer; white-space:normal; } button:disabled { opacity:.5; }
.error { color:#a62027; overflow-wrap:anywhere; }
.danger { background:#b42332; color:#fff; }
.delete-account { padding:14px; border:1px solid #b42332; border-radius:12px; }
</style>
