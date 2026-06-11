import { describe, expect, it } from 'vitest'
import {
  createSoundEffects,
  type SoundEffect,
  type SoundEffectAdapter,
  type SoundEffectsStorage,
} from './sound-effects'

describe('sound effects', () => {
  it('plays effects while enabled', () => {
    const played: SoundEffect[] = []
    const soundEffects = createSoundEffects({
      adapter: {
        play: (effect) => {
          played.push(effect)
        },
      },
      storage: null,
    })

    soundEffects.play('piece-drop')
    soundEffects.play('win')

    expect(played).toEqual(['piece-drop', 'win'])
  })

  it('does not play effects while disabled', () => {
    const played: SoundEffect[] = []
    const soundEffects = createSoundEffects({
      adapter: {
        play: (effect) => {
          played.push(effect)
        },
      },
      storage: null,
    })

    soundEffects.setEnabled(false)
    soundEffects.play('column-full')

    expect(played).toEqual([])
  })

  it('persists the enabled setting through storage', () => {
    const storage = createMemoryStorage()

    createSoundEffects({ adapter: createNoopAdapter(), storage }).setEnabled(false)
    const reloaded = createSoundEffects({ adapter: createNoopAdapter(), storage })

    expect(reloaded.isEnabled()).toBe(false)
  })

  it('gives the adapter a live shouldPlay check for delayed playback', () => {
    let shouldPlay: () => boolean = () => {
      throw new Error('adapter was not called')
    }
    const soundEffects = createSoundEffects({
      adapter: {
        play: (_effect, nextShouldPlay) => {
          shouldPlay = nextShouldPlay
        },
      },
      storage: null,
    })

    soundEffects.play('draw')
    expect(shouldPlay?.()).toBe(true)

    soundEffects.setEnabled(false)
    expect(shouldPlay?.()).toBe(false)
  })

  it('absorbs adapter failures', async () => {
    const soundEffects = createSoundEffects({
      adapter: {
        play: () => Promise.reject(new Error('audio unavailable')),
      },
      storage: null,
    })

    await expect(soundEffects.play('win')).resolves.toBeUndefined()
  })
})

function createNoopAdapter(): SoundEffectAdapter {
  return { play: () => undefined }
}

function createMemoryStorage(): SoundEffectsStorage {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}
