export const ROWS = 6
export const COLUMNS = 7
export const CONNECT_LENGTH = 4

export type Player = 'red' | 'yellow'
export type Cell = Player | null
export type Board = Cell[][]

export type Position = {
  row: number
  column: number
}

export type Move = Position & {
  player: Player
}

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won'; winner: Player; winningCells: Position[] }
  | { kind: 'draw' }

export type GameState = {
  board: Board
  currentPlayer: Player
  status: GameStatus
  lastMove: Move | null
}

export type MoveError = 'column-full' | 'game-over' | 'invalid-column'

export type MoveResult = {
  state: GameState
  error: MoveError | null
}

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(null))
}

export function createGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'red',
    status: { kind: 'playing' },
    lastMove: null,
  }
}

export function getNextPlayer(player: Player): Player {
  return player === 'red' ? 'yellow' : 'red'
}

export function getNextOpenRow(board: Board, column: number): number | null {
  if (!isValidColumn(column)) {
    return null
  }

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      return row
    }
  }

  return null
}

export function isColumnFull(board: Board, column: number): boolean {
  return isValidColumn(column) && getNextOpenRow(board, column) === null
}

export function dropDisc(state: GameState, column: number): MoveResult {
  if (state.status.kind !== 'playing') {
    return { state, error: 'game-over' }
  }

  if (!isValidColumn(column)) {
    return { state, error: 'invalid-column' }
  }

  const row = getNextOpenRow(state.board, column)

  if (row === null) {
    return { state, error: 'column-full' }
  }

  const board = cloneBoard(state.board)
  const lastMove: Move = { row, column, player: state.currentPlayer }
  board[row][column] = state.currentPlayer

  const status = getGameStatus(board, lastMove)

  return {
    state: {
      board,
      currentPlayer:
        status.kind === 'playing' ? getNextPlayer(state.currentPlayer) : state.currentPlayer,
      status,
      lastMove,
    },
    error: null,
  }
}

export function undoLastMove(state: GameState): GameState {
  if (state.status.kind !== 'playing' || state.lastMove === null) {
    return state
  }

  const board = cloneBoard(state.board)
  board[state.lastMove.row][state.lastMove.column] = null

  return {
    board,
    currentPlayer: state.lastMove.player,
    status: { kind: 'playing' },
    lastMove: null,
  }
}

export function getGameStatus(board: Board, lastMove: Move): GameStatus {
  const winningCells = getWinningCells(board, lastMove)

  if (winningCells !== null) {
    return { kind: 'won', winner: lastMove.player, winningCells }
  }

  if (isBoardFull(board)) {
    return { kind: 'draw' }
  }

  return { kind: 'playing' }
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== null))
}

function getWinningCells(board: Board, lastMove: Move): Position[] | null {
  for (const [deltaRow, deltaColumn] of DIRECTIONS) {
    const before = collectMatchingCells(board, lastMove, -deltaRow, -deltaColumn).reverse()
    const after = collectMatchingCells(board, lastMove, deltaRow, deltaColumn)
    const line = [...before, toPosition(lastMove), ...after]

    if (line.length >= CONNECT_LENGTH) {
      const lastMoveIndex = before.length
      const startIndex = Math.max(
        0,
        Math.min(lastMoveIndex, line.length - CONNECT_LENGTH),
      )

      return line.slice(startIndex, startIndex + CONNECT_LENGTH)
    }
  }

  return null
}

function collectMatchingCells(
  board: Board,
  lastMove: Move,
  deltaRow: number,
  deltaColumn: number,
): Position[] {
  const cells: Position[] = []
  let row = lastMove.row + deltaRow
  let column = lastMove.column + deltaColumn

  while (isInsideBoard(row, column) && board[row][column] === lastMove.player) {
    cells.push({ row, column })
    row += deltaRow
    column += deltaColumn
  }

  return cells
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

function isValidColumn(column: number): boolean {
  return Number.isInteger(column) && column >= 0 && column < COLUMNS
}

function isInsideBoard(row: number, column: number): boolean {
  return row >= 0 && row < ROWS && column >= 0 && column < COLUMNS
}

function toPosition(move: Move): Position {
  return { row: move.row, column: move.column }
}
