import { create } from "zustand";

interface AudioState {
  muted: boolean;
  toggleMuted: () => void;
  playHit: () => void;
  playSuccess: () => void;
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
  startMusic: () => {
    music.currentTime = 0;
    music.play().catch(() => {});
  },
  stopMusic: () => music.pause()
}));
