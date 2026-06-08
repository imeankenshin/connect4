export type SoundEffect = "piece-drop" | "win" | "draw" | "column-full";

export type SoundEffects = {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => boolean;
  toggle: () => boolean;
  play: (effect: SoundEffect) => void;
};

export type SoundEffectAdapter = {
  play: (
    effect: SoundEffect,
    shouldPlay: () => boolean,
  ) => void | Promise<void>;
};

export type SoundEffectsStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type SoundEffectsOptions = {
  adapter: SoundEffectAdapter;
  storage?: SoundEffectsStorage | null;
};

const SOUND_EFFECTS_STORAGE_KEY = "connect-four:sound-effects";

export function createSoundEffects({
  adapter,
  storage = null,
}: SoundEffectsOptions): SoundEffects {
  let enabled = loadSoundEffectsEnabled(storage);

  return {
    isEnabled: () => enabled,
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      saveSoundEffectsEnabled(storage, enabled);

      return enabled;
    },
    toggle() {
      enabled = !enabled;
      saveSoundEffectsEnabled(storage, enabled);

      return enabled;
    },
    async play(effect) {
      if (!enabled) {
        return;
      }

      await adapter.play(effect, () => enabled);
    },
  };
}

function loadSoundEffectsEnabled(storage: SoundEffectsStorage | null): boolean {
  if (storage === null) {
    return true;
  }

  try {
    return storage.getItem(SOUND_EFFECTS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveSoundEffectsEnabled(
  storage: SoundEffectsStorage | null,
  enabled: boolean,
): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(SOUND_EFFECTS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // 効果音の設定保存に失敗しても、ゲーム進行は止めない。
  }
}
