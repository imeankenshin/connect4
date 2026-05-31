import './style.css'
import {
  COLUMNS,
  ROWS,
  createGameState,
  dropDisc,
  getNextOpenRow,
  isColumnFull,
  undoLastMove,
  type GameState,
  type MoveError,
  type Player,
  type Position,
} from './game'

type Score = Record<Player | 'draw', number>

const playerLabels: Record<Player, string> = {
  red: '赤',
  yellow: '黄',
}

const moveErrorMessages: Record<MoveError, string> = {
  'column-full': 'この列は満杯です。別の列を選んでください。',
  'game-over': 'ゲームは終了しています。再戦ボタンで新しいゲームを始めてください。',
  'invalid-column': 'その列には置けません。',
}

const appRoot = document.querySelector<HTMLDivElement>('#app')

if (appRoot === null) {
  throw new Error('App root was not found.')
}

const app: HTMLDivElement = appRoot

let game: GameState = createGameState()
let score: Score = { red: 0, yellow: 0, draw: 0 }
let notice = ''
let noticeTimer: number | undefined

render()

function render(): void {
  app.innerHTML = `
    <main class="app-shell">
      <section class="hero" aria-labelledby="game-title">
        <div>
          <p class="eyebrow">Local two-player game</p>
          <h1 id="game-title">Connect Four</h1>
          <p class="hero-copy">同じ画面で交互に石を落として、先に4つ並べたプレイヤーの勝ちです。</p>
        </div>
        <div class="status-card" aria-live="polite">
          <span class="status-label">現在の状態</span>
          <strong>${getStatusText()}</strong>
        </div>
      </section>

      <section class="game-layout" aria-label="コネクトフォー対戦エリア">
        <div class="board-panel">
          ${renderBoard()}
          <p class="notice" role="status" aria-live="polite">${notice}</p>
        </div>

        <aside class="side-panel" aria-label="スコアと操作">
          ${renderScore()}
          <div class="controls">
            <button class="control-button" id="undo-button" type="button" ${canUndo() ? '' : 'disabled'}>
              1手戻す
            </button>
            <button class="control-button control-button--primary" id="new-game-button" type="button">
              再戦する
            </button>
            <button class="control-button" id="reset-score-button" type="button">
              スコアをリセット
            </button>
          </div>
        </aside>
      </section>
    </main>
  `

  bindEvents()
}

function renderBoard(): string {
  const columns = Array.from({ length: COLUMNS }, (_, column) => {
    const full = isColumnFull(game.board, column)
    const disabled = game.status.kind !== 'playing'
    const columnClasses = ['board-column']

    if (full) {
      columnClasses.push('board-column--full')
    }

    return `
      <button
        class="${columnClasses.join(' ')}"
        type="button"
        data-column="${column}"
        aria-label="${getColumnLabel(column)}"
        aria-disabled="${full ? 'true' : 'false'}"
        ${disabled ? 'disabled' : ''}
      >
        ${Array.from({ length: ROWS }, (_, row) => renderCell(row, column)).join('')}
      </button>
    `
  }).join('')

  return `<div class="board" role="group" aria-label="7列6行の盤面">${columns}</div>`
}

function renderCell(row: number, column: number): string {
  const cell = game.board[row][column]
  const classes = ['cell']

  if (cell === null) {
    classes.push('cell--empty')
  } else {
    classes.push(`cell--${cell}`)
  }

  if (isSamePosition(game.lastMove, { row, column })) {
    classes.push('cell--dropped')
  }

  if (isWinningCell({ row, column })) {
    classes.push('cell--winning')
  }

  return `<span class="${classes.join(' ')}" data-row="${row}" data-column="${column}" aria-hidden="true"></span>`
}

function renderScore(): string {
  return `
    <div class="score-card">
      <h2>Score</h2>
      <dl class="score-list">
        <div>
          <dt><span class="score-dot score-dot--red"></span>赤</dt>
          <dd>${score.red}</dd>
        </div>
        <div>
          <dt><span class="score-dot score-dot--yellow"></span>黄</dt>
          <dd>${score.yellow}</dd>
        </div>
        <div>
          <dt>引き分け</dt>
          <dd>${score.draw}</dd>
        </div>
      </dl>
    </div>
  `
}

function bindEvents(): void {
  app.querySelectorAll<HTMLButtonElement>('.board-column').forEach((button) => {
    const column = Number(button.dataset.column)

    button.addEventListener('click', () => handleColumnClick(column))
    button.addEventListener('mouseenter', () => showPreview(column))
    button.addEventListener('mouseleave', clearPreview)
    button.addEventListener('focus', () => showPreview(column))
    button.addEventListener('blur', clearPreview)
  })

  app.querySelector<HTMLButtonElement>('#undo-button')?.addEventListener('click', () => {
    game = undoLastMove(game)
    notice = ''
    render()
  })

  app.querySelector<HTMLButtonElement>('#new-game-button')?.addEventListener('click', () => {
    game = createGameState()
    notice = ''
    render()
  })

  app.querySelector<HTMLButtonElement>('#reset-score-button')?.addEventListener('click', () => {
    score = { red: 0, yellow: 0, draw: 0 }
    notice = ''
    render()
  })
}

function handleColumnClick(column: number): void {
  const result = dropDisc(game, column)

  if (result.error !== null) {
    showNotice(moveErrorMessages[result.error])
    return
  }

  game = result.state
  notice = ''

  if (game.status.kind === 'won') {
    score[game.status.winner] += 1
  }

  if (game.status.kind === 'draw') {
    score.draw += 1
  }

  render()
}

function showPreview(column: number): void {
  clearPreview()

  if (game.status.kind !== 'playing') {
    return
  }

  const row = getNextOpenRow(game.board, column)

  if (row === null) {
    return
  }

  const cell = app.querySelector<HTMLElement>(
    `.cell[data-row="${row}"][data-column="${column}"]`,
  )

  cell?.classList.add(`cell--preview-${game.currentPlayer}`)
}

function clearPreview(): void {
  app
    .querySelectorAll('.cell--preview-red, .cell--preview-yellow')
    .forEach((cell) => {
      cell.classList.remove('cell--preview-red', 'cell--preview-yellow')
    })
}

function showNotice(message: string): void {
  notice = message

  if (noticeTimer !== undefined) {
    window.clearTimeout(noticeTimer)
  }

  render()

  noticeTimer = window.setTimeout(() => {
    notice = ''
    render()
  }, 1800)
}

function getStatusText(): string {
  if (game.status.kind === 'won') {
    return `${playerLabels[game.status.winner]}の勝ちです！`
  }

  if (game.status.kind === 'draw') {
    return '引き分けです。'
  }

  return `${playerLabels[game.currentPlayer]}の手番です。`
}

function getColumnLabel(column: number): string {
  const columnNumber = column + 1
  const summary = getColumnSummary(column)

  if (game.status.kind !== 'playing') {
    return `${columnNumber}列目。${summary}`
  }

  if (isColumnFull(game.board, column)) {
    return `${columnNumber}列目は満杯です。${summary}`
  }

  return `${columnNumber}列目に${playerLabels[game.currentPlayer]}を置く。${summary}`
}

function getColumnSummary(column: number): string {
  const cells = Array.from({ length: ROWS }, (_, row) => {
    const cell = game.board[row][column]
    return cell === null ? '空' : playerLabels[cell]
  })

  return `上から ${cells.join('、')}`
}

function canUndo(): boolean {
  return game.status.kind === 'playing' && game.lastMove !== null
}

function isWinningCell(position: Position): boolean {
  return (
    game.status.kind === 'won' &&
    game.status.winningCells.some((cell) => isSamePosition(cell, position))
  )
}

function isSamePosition(a: Position | null, b: Position): boolean {
  return a !== null && a.row === b.row && a.column === b.column
}
