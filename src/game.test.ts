import { describe, expect, it } from 'vitest'
import {
  COLUMNS,
  ROWS,
  createEmptyBoard,
  createGameState,
  dropDisc,
  getGameStatus,
  undoLastMove,
  type Board,
  type Move,
} from './game'

describe('connect four game logic', () => {
  it('creates an empty 7x6 board with red to move first', () => {
    const state = createGameState()

    expect(state.board).toHaveLength(ROWS)
    expect(state.board.every((row) => row.length === COLUMNS)).toBe(true)
    expect(state.board.flat().every((cell) => cell === null)).toBe(true)
    expect(state.currentPlayer).toBe('red')
    expect(state.status.kind).toBe('playing')
  })

  it('drops discs to the lowest available row and alternates turns', () => {
    const firstMove = dropDisc(createGameState(), 3)
    const secondMove = dropDisc(firstMove.state, 3)

    expect(firstMove.error).toBeNull()
    expect(firstMove.state.board[5][3]).toBe('red')
    expect(firstMove.state.currentPlayer).toBe('yellow')
    expect(secondMove.error).toBeNull()
    expect(secondMove.state.board[4][3]).toBe('yellow')
    expect(secondMove.state.currentPlayer).toBe('red')
  })

  it('does not advance the turn when a column is full', () => {
    let state = createGameState()

    for (let count = 0; count < ROWS; count += 1) {
      state = dropDisc(state, 0).state
    }

    const blockedMove = dropDisc(state, 0)

    expect(blockedMove.error).toBe('column-full')
    expect(blockedMove.state.currentPlayer).toBe(state.currentPlayer)
  })

  it('rejects invalid columns without changing the state', () => {
    const state = createGameState()
    const result = dropDisc(state, -1)

    expect(result.error).toBe('invalid-column')
    expect(result.state).toBe(state)
  })

  it('detects a vertical win', () => {
    let state = createGameState()

    for (const column of [0, 1, 0, 1, 0, 1, 0]) {
      state = dropDisc(state, column).state
    }

    expect(state.status).toMatchObject({ kind: 'won', winner: 'red' })
  })

  it('rejects moves after the game has ended', () => {
    let state = createGameState()

    for (const column of [0, 1, 0, 1, 0, 1, 0]) {
      state = dropDisc(state, column).state
    }

    const result = dropDisc(state, 2)

    expect(result.error).toBe('game-over')
    expect(result.state).toBe(state)
  })

  it('detects a horizontal win', () => {
    let state = createGameState()

    for (const column of [0, 0, 1, 1, 2, 2, 3]) {
      state = dropDisc(state, column).state
    }

    expect(state.status).toMatchObject({ kind: 'won', winner: 'red' })
  })

  it('detects a diagonal win', () => {
    let state = createGameState()

    for (const column of [0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3]) {
      state = dropDisc(state, column).state
    }

    expect(state.status).toMatchObject({ kind: 'won', winner: 'red' })
  })

  it('detects a draw when the board is full without a new winning line', () => {
    const board: Board = [
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
    ]
    const lastMove: Move = { row: 5, column: 6, player: 'red' }

    expect(getGameStatus(board, lastMove).kind).toBe('draw')
  })

  it('allows only the latest move to be undone before the game ends', () => {
    const afterFirstMove = dropDisc(createGameState(), 2).state
    const afterUndo = undoLastMove(afterFirstMove)
    const afterSecondUndo = undoLastMove(afterUndo)

    expect(afterUndo.board.flat().every((cell) => cell === null)).toBe(true)
    expect(afterUndo.currentPlayer).toBe('red')
    expect(afterSecondUndo).toBe(afterUndo)
  })

  it('does not mutate the previous board when a disc is dropped', () => {
    const state = createGameState()
    const result = dropDisc(state, 2)

    expect(result.error).toBeNull()
    expect(state.board.flat().every((cell) => cell === null)).toBe(true)
    expect(result.state.board[5][2]).toBe('red')
  })
})
