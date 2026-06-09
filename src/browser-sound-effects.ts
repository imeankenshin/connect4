import * as Tone from "tone";
import {
  createSoundEffects,
  type SoundEffect,
  type SoundEffectAdapter,
  type SoundEffects,
  type SoundEffectsStorage,
} from "./sound-effects";
import * as Result from "./utils/result";

type SoundEffectSynths = ReturnType<typeof createSoundEffectSynths>;

let synths: SoundEffectSynths | null = null;
let initPromise: Result.ResultAsync<SoundEffectSynths, Error> | null = null;

export function createBrowserSoundEffects(): SoundEffects {
  return createSoundEffects({
    adapter: createToneSoundEffectAdapter(),
    storage: getBrowserStorage(),
  });
}

function createToneSoundEffectAdapter(): SoundEffectAdapter {
  const prepareSoundEffects = async (): Result.ResultAsync<
    SoundEffectSynths,
    Error
  > => {
    if (synths !== null) {
      return Result.ok(synths);
    }

    if (initPromise !== null) {
      return initPromise;
    }

    initPromise = (async () => {
      const [, error] = await Result.fromPromise(Tone.start(), () => new Error());
      if (error) return Result.err(error);
      synths = createSoundEffectSynths();
      return Result.ok(synths);
    })();

    try {
      return await initPromise;
    } finally {
      initPromise = null;
    }
  };

  return {
    async play(effect, shouldPlay) {
      if (!shouldPlay()) {
        return;
      }

      const [nextSynths, error] = await prepareSoundEffects();
      if (error) return;
      triggerSoundEffect(nextSynths, effect);
    },
  };
}

function createSoundEffectSynths() {
  const moveSynth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.05 },
  }).toDestination();
  const accentSynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.006, decay: 0.08, sustain: 0, release: 0.12 },
  }).toDestination();

  moveSynth.volume.value = -18;
  accentSynth.volume.value = -16;

  return { moveSynth, accentSynth };
}

function triggerSoundEffect(
  synths: SoundEffectSynths,
  effect: SoundEffect,
): void {
  const now = Tone.now();

  if (effect === "piece-drop") {
    synths.moveSynth.triggerAttackRelease("C4", 0.08, now);
    return;
  }

  if (effect === "column-full") {
    synths.moveSynth.triggerAttackRelease("C3", 0.12, now);
    return;
  }

  if (effect === "draw") {
    synths.accentSynth.triggerAttackRelease("E4", 0.1, now);
    synths.accentSynth.triggerAttackRelease("C4", 0.16, now + 0.14);
    return;
  }

  synths.accentSynth.triggerAttackRelease("C5", 0.1, now);
  synths.accentSynth.triggerAttackRelease("E5", 0.1, now + 0.13);
  synths.accentSynth.triggerAttackRelease("G5", 0.22, now + 0.28);
}

function getBrowserStorage(): SoundEffectsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
