import { describe, expect, it } from 'vitest'
import { COLUMNS, ROWS, createGameState, dropDisc, type GameState } from './game'
import { createGameView } from './game-view'

function playMoves(columns: number[]): GameState {
  let state = createGameState()

  for (const column of columns) {
    state = dropDisc(state, column).state
  }

  return state
}

describe('connect four game view model', () => {
  it('creates columns and status text from the current game state', () => {
    const view = createGameView(createGameState(), null)

    expect(view.statusText).toBe('赤の手番です。')
    expect(view.canUndo).toBe(false)
    expect(view.columns).toHaveLength(COLUMNS)
    expect(view.columns.every((column) => column.cells.length === ROWS)).toBe(true)
    expect(view.columns[3]).toMatchObject({
      column: 3,
      label: '4列目に赤を置く。上から 空、空、空、空、空、空',
      full: false,
      disabled: false,
    })
  })

  it('marks the preview cell without exposing board traversal to callers', () => {
    const afterFirstMove = dropDisc(createGameState(), 3).state
    const view = createGameView(afterFirstMove, 3)

    expect(view.statusText).toBe('黄の手番です。')
    expect(view.canUndo).toBe(true)
    expect(view.columns[3].cells[4]).toMatchObject({
      row: 4,
      column: 3,
      state: 'empty',
      previewPlayer: 'yellow',
    })
    expect(view.columns[3].cells[5]).toMatchObject({
      row: 5,
      column: 3,
      state: 'red',
      isLastMove: true,
    })
  })

  it('marks full columns through the column view', () => {
    const state = playMoves([0, 0, 0, 0, 0, 0])
    const view = createGameView(state, 0)

    expect(view.columns[0]).toMatchObject({
      full: true,
      disabled: false,
      label: '1列目は満杯です。上から 黄、赤、黄、赤、黄、赤',
    })
    expect(view.columns[0].cells.every((cell) => cell.previewPlayer === null)).toBe(true)
  })

  it('marks winning cells and disables columns after the game ends', () => {
    const state = playMoves([0, 1, 0, 1, 0, 1, 0])
    const view = createGameView(state, 0)

    expect(view.statusText).toBe('赤の勝ちです！')
    expect(view.canUndo).toBe(false)
    expect(view.columns.every((column) => column.disabled)).toBe(true)
    expect(
      view.columns[0].cells
        .filter((cell) => cell.isWinning)
        .map((cell) => cell.row),
    ).toEqual([2, 3, 4, 5])
    expect(view.columns[0].cells[2]).toMatchObject({
      isLastMove: true,
      previewPlayer: null,
    })
  })
})
