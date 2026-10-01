import fs from "node:fs";

const path = "src/phone/components/GamePhone.vue";
let source = fs.readFileSync(path, "utf8");

const marker = "const emit = defineEmits([";
const weekdayCode = `const weekdayLabel = computed(() => {
  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const day = Math.max(1, Math.floor(Number(props.currentDay) || 1));
  return weekdays[(day - 1) % weekdays.length];
});

`;

if (!source.includes("const weekdayLabel = computed")) {
  if (!source.includes(marker)) throw new Error("Could not find emit marker");
  source = source.replace(marker, weekdayCode + marker);
}

const oldLabel = "Day {{ currentDay }} · {{ trafficPeriod }}";
const newLabel = "{{ weekdayLabel }} · DAY {{ currentDay }}";
if (!source.includes(newLabel)) {
  if (!source.includes(oldLabel)) throw new Error("Could not find phone day label");
  source = source.replace(oldLabel, newLabel);
}

fs.writeFileSync(path, source);
