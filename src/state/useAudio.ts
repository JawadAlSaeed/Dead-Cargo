import { create } from "zustand";
import * as sfx from "../game/sfx";

interface AudioState {
  muted: boolean;
  toggleMuted: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playGunshot: (big: boolean) => void;
  playDryFire: () => void;
  playMeleeSwing: () => void;
  playReloadClick: () => void;
  playFootstep: () => void;
  playGrowl: () => void;
  startMusic: () => void;
  stopMusic: () => void;
}

const music = new Audio("/sounds/background.mp3");
music.loop = true;
music.volume = 0.35;

function playOneShot(src: string, volume: number) {
  const a = new Audio(src);
  a.volume = volume;
  a.play().catch(() => {});
}

export const useAudio = create<AudioState>((set, get) => ({
  muted: false,
  toggleMuted: () => {
    const muted = !get().muted;
    music.muted = muted;
    set({ muted });
  },
  playHit: () => {
    if (!get().muted) playOneShot("/sounds/hit.mp3", 0.5);
  },
  playSuccess: () => {
    if (!get().muted) playOneShot("/sounds/success.mp3", 0.6);
  },
  playGunshot: (big) => {
    if (!get().muted) sfx.playGunshot(0.35, big);
  },
  playDryFire: () => {
    if (!get().muted) sfx.playDryFire(0.3);
  },
  playMeleeSwing: () => {
    if (!get().muted) sfx.playMeleeSwing(0.28);
  },
  playReloadClick: () => {
    if (!get().muted) sfx.playReloadClick(0.25);
  },
  playFootstep: () => {
    if (!get().muted) sfx.playFootstep(0.18);
  },
  playGrowl: () => {
    if (!get().muted) sfx.playGrowl(0.3);
  },
  startMusic: () => {
    sfx.unlockAudio();
    music.currentTime = 0;
    music.play().catch(() => {});
  },
  stopMusic: () => music.pause()
}));
