import {
  createSoundEffects,
  type SoundEffect,
  type SoundEffectAdapter,
  type SoundEffects,
  type SoundEffectsStorage,
} from "./sound-effects";

type SoundEffectNote = {
  frequency: number;
  duration: number;
  delay: number;
  gain: number;
  type: OscillatorType;
};

const NOTE = {
  c3: 130.81,
  c4: 261.63,
  e4: 329.63,
  c5: 523.25,
  e5: 659.25,
  g5: 783.99,
} as const;

const MOVE_GAIN = 0.1;
const ACCENT_GAIN = 0.12;
const MIN_GAIN = 0.001;
const ATTACK = 0.006;

let audioContext: AudioContext | null = null;

export function createBrowserSoundEffects(): SoundEffects {
  return createSoundEffects({
    adapter: createWebAudioSoundEffectAdapter(),
    storage: getBrowserStorage(),
  });
}

function createWebAudioSoundEffectAdapter(): SoundEffectAdapter {
  return {
    async play(effect, shouldPlay) {
      if (!shouldPlay()) {
        return;
      }

      const nextAudioContext = await getAudioContext();
      if (nextAudioContext === null || !shouldPlay()) {
        return;
      }

      triggerSoundEffect(nextAudioContext, effect);
    },
  };
}

async function getAudioContext(): Promise<AudioContext | null> {
  if (audioContext === null) {
    if (
      typeof window === "undefined" ||
      typeof window.AudioContext !== "function"
    ) {
      return null;
    }

    audioContext = new window.AudioContext();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function triggerSoundEffect(
  audioContext: AudioContext,
  effect: SoundEffect,
): void {
  const now = audioContext.currentTime;

  if (effect === "piece-drop") {
    playSoundEffectNotes(
      audioContext,
      [createNote("triangle", NOTE.c4, 0.08, 0, MOVE_GAIN)],
      now,
    );
    return;
  }

  if (effect === "column-full") {
    playSoundEffectNotes(
      audioContext,
      [createNote("triangle", NOTE.c3, 0.12, 0, MOVE_GAIN)],
      now,
    );
    return;
  }

  if (effect === "draw") {
    playSoundEffectNotes(
      audioContext,
      [
        createNote("sine", NOTE.e4, 0.1, 0, ACCENT_GAIN),
        createNote("sine", NOTE.c4, 0.16, 0.14, ACCENT_GAIN),
      ],
      now,
    );
    return;
  }

  playSoundEffectNotes(
    audioContext,
    [
      createNote("sine", NOTE.c5, 0.1, 0, ACCENT_GAIN),
      createNote("sine", NOTE.e5, 0.1, 0.13, ACCENT_GAIN),
      createNote("sine", NOTE.g5, 0.22, 0.28, ACCENT_GAIN),
    ],
    now,
  );
}

function createNote(
  type: OscillatorType,
  frequency: number,
  duration: number,
  delay: number,
  gain: number,
): SoundEffectNote {
  return { type, frequency, duration, delay, gain };
}

function playSoundEffectNotes(
  audioContext: AudioContext,
  notes: SoundEffectNote[],
  startTime: number,
): void {
  for (const note of notes) {
    playNote(audioContext, note, startTime + note.delay);
  }
}

function playNote(
  audioContext: AudioContext,
  note: SoundEffectNote,
  startTime: number,
): void {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const stopTime = startTime + note.duration;

  oscillator.type = note.type;
  oscillator.frequency.setValueAtTime(note.frequency, startTime);
  gain.gain.setValueAtTime(MIN_GAIN, startTime);
  gain.gain.linearRampToValueAtTime(note.gain, startTime + ATTACK);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, stopTime);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(stopTime + 0.02);
  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );
}

function getBrowserStorage(): SoundEffectsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
