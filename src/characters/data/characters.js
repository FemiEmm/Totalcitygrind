import bankRepresentativePortrait from "../../assets/characters/bank-representative.png";
import carOwnerPortrait from "../../assets/characters/car-owner.png";
import doctorPortrait from "../../assets/characters/doctor.png";
import estateAgentPortrait from "../../assets/characters/estate-agent.png";
import landlordPortrait from "../../assets/characters/landlord.png";
import mechanicPortrait from "../../assets/characters/mechanic.png";
import mutiuPortrait from "../../assets/characters/mutiu.png";
import policeOfficerPortrait from "../../assets/characters/police-officer.png";
import sisterPortrait from "../../assets/characters/sister.png";

export const CHARACTER_DEFINITIONS = Object.freeze({
  mutiu: Object.freeze({
    id: "mutiu",
    name: "Mutiu Illegal",
    role: "Underground race organiser",
    portraitUrl: mutiuPortrait,
  }),
  landlord: Object.freeze({
    id: "landlord",
    name: "Mr. Adebayo",
    role: "Your landlord",
    portraitUrl: landlordPortrait,
  }),
  carOwner: Object.freeze({
    id: "car-owner",
    name: "Car Owner",
    role: "Danfo owner and route dispatcher",
    portraitUrl: carOwnerPortrait,
  }),
  policeOfficer: Object.freeze({
    id: "police-officer",
    name: "Officer Balogun",
    role: "Lagos traffic police",
    portraitUrl: policeOfficerPortrait,
  }),
  sister: Object.freeze({
    id: "sister",
    name: "Your Sister",
    role: "Family back home",
    portraitUrl: sisterPortrait,
  }),
  mechanic: Object.freeze({
    id: "mechanic",
    name: "Kunle",
    role: "Mechanic and vehicle recovery",
    portraitUrl: mechanicPortrait,
  }),
  doctor: Object.freeze({
    id: "doctor",
    name: "Dr. Amaka",
    role: "Private mobile doctor",
    portraitUrl: doctorPortrait,
  }),
  bankRepresentative: Object.freeze({
    id: "bank-representative",
    name: "Mr. Okafor",
    role: "MegaPay loan officer",
    portraitUrl: bankRepresentativePortrait,
  }),
  estateAgent: Object.freeze({
    id: "estate-agent",
    name: "Adaeze",
    role: "Keystone estate agent",
    portraitUrl: estateAgentPortrait,
  }),
});

export function getCharacterDefinition(characterId) {
  return (
    Object.values(CHARACTER_DEFINITIONS).find(
      (character) => character.id === characterId,
    ) ?? null
  );
}
