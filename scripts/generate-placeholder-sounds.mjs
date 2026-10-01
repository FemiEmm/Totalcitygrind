import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../public/sounds/", import.meta.url);
const sampleRate = 22050;
let noiseState = 0x41c64e6d;

function noise() {
  noiseState = (1664525 * noiseState + 1013904223) >>> 0;
  return (noiseState / 0xffffffff) * 2 - 1;
}

function tone(frequency, time, phase = 0) {
  return Math.sin(Math.PI * 2 * frequency * time + phase);
}

function pulse(time, interval, width = 0.5) {
  return time % interval < interval * width ? 1 : 0;
}

function envelope(time, duration, attack = 0.02, release = 0.16) {
  return Math.min(
    1,
    time / Math.max(attack, 0.001),
    (duration - time) / Math.max(release, 0.001),
  );
}

function wavBuffer(duration, peak, render) {
  const count = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(count);
  let measuredPeak = 0;

  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const value = Math.max(-1, Math.min(1, render(time, duration)));
    samples[index] = value;
    measuredPeak = Math.max(measuredPeak, Math.abs(value));
  }

  const scale = measuredPeak > 0 ? peak / measuredPeak : 0;
  const dataSize = count * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < count; index += 1) {
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[index] * scale)) * 32767),
      44 + index * 2,
    );
  }

  return buffer;
}

const sounds = [
  ["ui/button-click.wav", 0.09, 0.24, (t, d) => tone(620, t) * envelope(t, d, 0.004, 0.07)],
  ["ui/confirm.wav", 0.34, 0.28, (t, d) => tone(t < 0.15 ? 560 : 820, t) * envelope(t, d, 0.01, 0.12)],
  ["ui/error.wav", 0.38, 0.25, (t, d) => tone(t < 0.18 ? 260 : 190, t) * envelope(t, d, 0.01, 0.13)],
  ["ui/phone-ring.wav", 1.5, 0.3, (t, d) => (tone(440, t) + tone(520, t) * 0.55) * pulse(t, 0.42, 0.58) * envelope(t, d, 0.02, 0.1)],
  ["ui/notification.wav", 0.48, 0.27, (t, d) => (tone(980, t) + tone(1320, t) * 0.35) * envelope(t, d, 0.005, 0.34)],
  ["vehicle/engine-stop-placeholder.wav", 0.9, 0.38, (t, d) => (tone(145 - t * 85, t) + tone(72 - t * 25, t) * 0.45) * envelope(t, d, 0.01, 0.32)],
  ["vehicle/tyre-skid.wav", 0.72, 0.34, (t, d) => (noise() * 0.8 + tone(950 - t * 520, t) * 0.2) * envelope(t, d, 0.02, 0.2)],
  ["vehicle/damaged-engine-warning.wav", 1.1, 0.28, (t, d) => tone(310, t) * pulse(t, 0.28, 0.43) * envelope(t, d, 0.01, 0.08)],
  ["danfo/passenger-board.wav", 0.42, 0.24, (t, d) => tone(380 + t * 420, t) * envelope(t, d, 0.01, 0.12)],
  ["danfo/passenger-alight.wav", 0.42, 0.22, (t, d) => tone(780 - t * 520, t) * envelope(t, d, 0.01, 0.12)],
  ["danfo/fare-collected.wav", 0.38, 0.26, (t, d) => (tone(1180, t) + tone(1640, t) * 0.3) * envelope(t, d, 0.003, 0.26)],
  ["danfo/bus-stop-arrival.wav", 0.78, 0.27, (t, d) => tone([520, 660, 820][Math.min(2, Math.floor(t / 0.24))], t) * envelope(t, d, 0.01, 0.12)],
  ["danfo/route-complete.wav", 1.05, 0.3, (t, d) => tone([440, 560, 680, 880][Math.min(3, Math.floor(t / 0.24))], t) * envelope(t, d, 0.01, 0.15)],
  ["services/fuel-pump.wav", 2.1, 0.2, (t, d) => (tone(74, t) * 0.5 + noise() * 0.12 + (pulse(t, 0.33, 0.04) ? tone(900, t) * 0.22 : 0)) * envelope(t, d, 0.1, 0.1)],
  ["services/mechanic-repair.wav", 1.25, 0.28, (t, d) => (noise() * 0.17 + (pulse(t, 0.31, 0.08) ? tone(760 - t * 80, t) : 0)) * envelope(t, d, 0.01, 0.12)],
  ["services/eat-food.wav", 0.46, 0.21, (t, d) => noise() * pulse(t, 0.11, 0.42) * envelope(t, d, 0.005, 0.11)],
  ["services/drink.wav", 0.78, 0.2, (t, d) => (noise() * 0.16 + tone(210 + Math.sin(t * 28) * 38, t) * 0.3) * envelope(t, d, 0.02, 0.18)],
];

for (const [relativePath, duration, peak, render] of sounds) {
  const fileUrl = new URL(relativePath, root);
  const filePath = fileURLToPath(fileUrl);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, wavBuffer(duration, peak, render));
}

console.log(`Generated ${sounds.length} mastered placeholder sounds.`);
