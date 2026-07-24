// Procedural sound effects synthesized via the Web Audio API — no asset
// files needed. Kept separate from useAudio.ts (which owns the mute flag
// and the asset-based cues) so this stays pure DSP.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Unlock the audio context on a real user gesture (autoplay policy). */
export function unlockAudio() {
  getCtx();
}

function noiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const size = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, size, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function playGunshot(volume: number, big: boolean) {
  const context = getCtx();
  const now = context.currentTime;
  const dur = big ? 0.28 : 0.17;

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context, dur);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(big ? 2400 : 3400, now);
  filter.frequency.exponentialRampToValueAtTime(180, now + dur);
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(volume, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(context.destination);
  noise.start(now);
  noise.stop(now + dur + 0.02);

  const thump = context.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(big ? 85 : 150, now);
  thump.frequency.exponentialRampToValueAtTime(28, now + 0.12);
  const thumpGain = context.createGain();
  thumpGain.gain.setValueAtTime(volume * 0.8, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  thump.connect(thumpGain);
  thumpGain.connect(context.destination);
  thump.start(now);
  thump.stop(now + 0.16);
}

export function playDryFire(volume: number) {
  const context = getCtx();
  const now = context.currentTime;
  const osc = context.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1400, now);
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

export function playReloadClick(volume: number) {
  const context = getCtx();
  const now = context.currentTime;
  [0, 0.1].forEach((t) => {
    const osc = context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, now + t);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now + t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.05);
  });
}

export function playMeleeSwing(volume: number) {
  const context = getCtx();
  const now = context.currentTime;
  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context, 0.12);
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(1.2, now);
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + 0.13);
}

export function playFootstep(volume: number) {
  const context = getCtx();
  const now = context.currentTime;
  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context, 0.07);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450 + Math.random() * 200, now);
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + 0.08);
}

export function playGrowl(volume: number) {
  const context = getCtx();
  const now = context.currentTime;
  const osc = context.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(65 + Math.random() * 25, now);
  osc.frequency.linearRampToValueAtTime(42, now + 0.5);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, now);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.08);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.55);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}
