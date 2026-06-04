import {
  COLUMNS,
  ROWS,
  getNextOpenRow,
  isColumnFull,
  type GameState,
  type Player,
  type Position,
} from './game'

export type CellViewState = 'empty' | Player

export type CellView = {
  row: number
  column: number
  state: CellViewState
  isLastMove: boolean
  isWinning: boolean
  previewPlayer: Player | null
}

export type BoardColumnView = {
  column: number
  label: string
  full: boolean
  disabled: boolean
  cells: CellView[]
}

export type GameView = {
  columns: BoardColumnView[]
  statusText: string
  canUndo: boolean
}

const playerLabels: Record<Player, string> = {
  red: '赤',
  yellow: '黄',
}

export function createGameView(game: GameState, previewColumn: number | null): GameView {
  const preview = getPreviewPosition(game, previewColumn)

  return {
    columns: Array.from({ length: COLUMNS }, (_, column) =>
      createBoardColumnView(game, column, preview),
    ),
    statusText: getStatusText(game),
    canUndo: game.status.kind === 'playing' && game.lastMove !== null,
  }
}

function createBoardColumnView(
  game: GameState,
  column: number,
  preview: Position | null,
): BoardColumnView {
  const full = isColumnFull(game.board, column)
  const disabled = game.status.kind !== 'playing'

  return {
    column,
    label: getColumnLabel(game, column, full),
    full,
    disabled,
    cells: Array.from({ length: ROWS }, (_, row) =>
      createCellView(game, row, column, preview),
    ),
  }
}

function createCellView(
  game: GameState,
  row: number,
  column: number,
  preview: Position | null,
): CellView {
  const cell = game.board[row][column]

  return {
    row,
    column,
    state: cell ?? 'empty',
    isLastMove:
      game.lastMove !== null && game.lastMove.row === row && game.lastMove.column === column,
    isWinning:
      game.status.kind === 'won' &&
      game.status.winningCells.some(
        (winningCell) => winningCell.row === row && winningCell.column === column,
      ),
    previewPlayer:
      preview !== null && preview.row === row && preview.column === column
        ? game.currentPlayer
        : null,
  }
}

function getPreviewPosition(game: GameState, previewColumn: number | null): Position | null {
  if (previewColumn === null || game.status.kind !== 'playing') {
    return null
  }

  const row = getNextOpenRow(game.board, previewColumn)

  return row === null ? null : { row, column: previewColumn }
}

function getStatusText(game: GameState): string {
  if (game.status.kind === 'won') {
    return `${playerLabels[game.status.winner]}の勝ちです！`
  }

  if (game.status.kind === 'draw') {
    return '引き分けです。'
  }

  return `${playerLabels[game.currentPlayer]}の手番です。`
}

function getColumnLabel(game: GameState, column: number, full: boolean): string {
  const columnNumber = column + 1
  const summary = Array.from({ length: ROWS }, (_, row) => {
    const cell = game.board[row][column]
    return cell === null ? '空' : playerLabels[cell]
  }).join('、')

  if (game.status.kind !== 'playing') {
    return `${columnNumber}列目。上から ${summary}`
  }

  return full
    ? `${columnNumber}列目は満杯です。上から ${summary}`
    : `${columnNumber}列目に${playerLabels[game.currentPlayer]}を置く。上から ${summary}`
}
