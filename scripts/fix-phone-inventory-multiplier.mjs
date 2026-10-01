import fs from "node:fs";

const path = "src/phone/components/GamePhone.vue";
const before = fs.readFileSync(path, "utf8");
const after = before.replace("Ã—{{ item.quantity }}", "×{{ item.quantity }}");

if (after === before) {
  throw new Error("Broken My Stuff quantity multiplier was not found.");
}

fs.writeFileSync(path, after);
