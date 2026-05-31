import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/connect4/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
