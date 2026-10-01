import "./game/browserDisplay.js";
import { createApp } from "vue";
import App from "./App.vue";
import { installGameUiSounds } from "./audio/gameAudio.js";
import "./styles/global.css";
import "./styles/mobile.css";

installGameUiSounds();
createApp(App).mount("#app");
