import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

const CALL_VOICE_DIRECTORY = "./sounds/call%20voices";

function callVoice(fileName) {
  return `${CALL_VOICE_DIRECTORY}/${encodeURIComponent(fileName)}`;
}

function callDefinition({
  id,
  kind,
  characterId,
  message,
  fileName,
  autoAnswer = false,
}) {
  return Object.freeze({
    id,
    kind,
    character: CHARACTER_DEFINITIONS[characterId],
    message,
    audioUrl: callVoice(fileName),
    autoAnswer,
  });
}

export const PHONE_CALL_VOICES = Object.freeze({
  "bank-ad-general": callDefinition({
    id: "bank-ad-general",
    kind: "ambient",
    characterId: "bankRepresentative",
    message: "MegaPay has an offer for you.",
    fileName: "bank-rep-1-ad.mp3",
  }),
  "bank-loan-ad": callDefinition({
    id: "bank-loan-ad",
    kind: "bank-loan",
    characterId: "bankRepresentative",
    message: "A MegaPay loan officer is calling.",
    fileName: "bank-rep-2-loan-ad.mp3",
  }),
  "bank-car-property": callDefinition({
    id: "bank-car-property",
    kind: "ambient",
    characterId: "bankRepresentative",
    message: "MegaPay wants to discuss vehicle and property finance.",
    fileName: "bank-rep-2-loan-for-car-property-reminder.mp3",
  }),
  "bank-loan-reminder": callDefinition({
    id: "bank-loan-reminder",
    kind: "ambient",
    characterId: "bankRepresentative",
    message: "MegaPay is calling about your loan balance.",
    fileName: "bank-rep-2-loan-reminder.mp3",
  }),
  "car-owner-other-work": callDefinition({
    id: "car-owner-other-work",
    kind: "ambient",
    characterId: "carOwner",
    message: "The car owner is checking on your current work.",
    fileName:
      "car-owner-reminder-call-if-player-is-doing-brt-or-uber..mp3",
  }),
  "landlord-rent-paid": callDefinition({
    id: "landlord-rent-paid",
    kind: "ambient",
    characterId: "landlord",
    message: "Mr. Adebayo is confirming your rent payment.",
    fileName: "landlord-rent-paid-call.mp3",
  }),
  "landlord-rent-reminder": callDefinition({
    id: "landlord-rent-reminder",
    kind: "ambient",
    characterId: "landlord",
    message: "Mr. Adebayo is calling about the rent.",
    fileName: "landlord-rent-reminder.mp3",
  }),
  "landlord-rent-saturday": callDefinition({
    id: "landlord-rent-saturday",
    kind: "ambient",
    characterId: "landlord",
    message: "Mr. Adebayo has a weekend rent reminder.",
    fileName: "landlord-rent-reminder-saturday.mp3",
  }),
  "mechanic-damage-25": callDefinition({
    id: "mechanic-damage-25",
    kind: "ambient",
    characterId: "mechanic",
    message: "Kunle noticed that the vehicle needs attention.",
    fileName: "mechanic-25%-damage-call.mp3",
  }),
  "mechanic-damage-50": callDefinition({
    id: "mechanic-damage-50",
    kind: "ambient",
    characterId: "mechanic",
    message: "Kunle is calling about serious vehicle damage.",
    fileName: "mechanic-50%-damage-call.mp3",
  }),
  "mutiu-day-rejection": callDefinition({
    id: "mutiu-day-rejection",
    kind: "ambient",
    characterId: "mutiu",
    message: "Calling Mr-Wire...",
    fileName: "mutiu-if-called-in the-morning-rejection voice.mp3",
    autoAnswer: true,
  }),
  "mutiu-race-reminder": callDefinition({
    id: "mutiu-race-reminder",
    kind: "mutiu-race",
    characterId: "mutiu",
    message: "Mr-Wire has another nighttime race available.",
    fileName: "mutiu-race-reminder-call-voice.mp3",
  }),
  "sister-check-in-1": callDefinition({
    id: "sister-check-in-1",
    kind: "ambient",
    characterId: "sister",
    message: "Your sister is checking in.",
    fileName: "sister-check-in-1.mp3",
  }),
  "sister-check-in-2": callDefinition({
    id: "sister-check-in-2",
    kind: "ambient",
    characterId: "sister",
    message: "Your sister wants to hear from you.",
    fileName: "sister-check-in-2.mp3",
  }),
  "sister-check-in-reminder": callDefinition({
    id: "sister-check-in-reminder",
    kind: "ambient",
    characterId: "sister",
    message: "Your sister is calling again.",
    fileName: "sister-check-in-reminder.mp3",
  }),
});

export const SISTER_IDLE_CALL_IDS = Object.freeze([
  "sister-check-in-1",
  "sister-check-in-2",
  "sister-check-in-reminder",
]);

export const BANK_AD_CALL_IDS = Object.freeze([
  "bank-ad-general",
  "bank-car-property",
]);

export function getPhoneCallVoice(callId) {
  return PHONE_CALL_VOICES[callId] ?? null;
}
