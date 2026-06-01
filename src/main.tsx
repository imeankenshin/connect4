import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import "./style.css";
import {
  createGameState,
  dropDisc,
  undoLastMove,
  type GameState,
  type MoveError,
} from "./game";
import {
  createGameView,
  type BoardColumnView,
  type CellView,
} from "./game-view";
import clsx from "clsx";

type Score = Record<"red" | "yellow" | "draw", number>;

const moveErrorMessages: Record<MoveError, string> = {
  "column-full": "この列は満杯です。別の列を選んでください。",
  "game-over":
    "ゲームは終了しています。再戦ボタンで新しいゲームを始めてください。",
  "invalid-column": "その列には置けません。",
};

function App() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [score, setScore] = useState<Score>({ red: 0, yellow: 0, draw: 0 });
  const [notice, setNotice] = useState("");
  const [previewColumn, setPreviewColumn] = useState<number | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const gameView = useMemo(
    () => createGameView(game, previewColumn),
    [game, previewColumn],
  );

  useEffect(() => clearNoticeTimer, []);

  function clearNoticeTimer(): void {
    if (noticeTimer.current !== undefined) {
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = undefined;
    }
  }

  function clearNotice(): void {
    clearNoticeTimer();
    setNotice("");
  }

  function handleColumnClick(column: number): void {
    const result = dropDisc(game, column);

    if (result.error !== null) {
      showNotice(moveErrorMessages[result.error]);
      return;
    }

    const nextGame = result.state;
    setGame(nextGame);
    setPreviewColumn(null);
    clearNotice();

    if (nextGame.status.kind === "won") {
      const winner = nextGame.status.winner;
      setScore((currentScore) => ({
        ...currentScore,
        [winner]: currentScore[winner] + 1,
      }));
    }

    if (nextGame.status.kind === "draw") {
      setScore((currentScore) => ({
        ...currentScore,
        draw: currentScore.draw + 1,
      }));
    }
  }

  function showPreview(column: number): void {
    if (game.status.kind !== "playing") {
      setPreviewColumn(null);
      return;
    }

    setPreviewColumn(column);
  }

  function showNotice(message: string): void {
    clearNoticeTimer();
    setNotice(message);

    noticeTimer.current = window.setTimeout(() => {
      setNotice("");
      noticeTimer.current = undefined;
    }, 1800);
  }

  function handleUndo(): void {
    setGame((currentGame) => undoLastMove(currentGame));
    setPreviewColumn(null);
    clearNotice();
  }

  function handleNewGame(): void {
    setGame(createGameState());
    setPreviewColumn(null);
    clearNotice();
  }

  function handleResetScore(): void {
    setScore({ red: 0, yellow: 0, draw: 0 });
    setPreviewColumn(null);
    clearNotice();
  }

  return (
    <main class="app-shell">
      <section class="hero" aria-labelledby="game-title">
        <div>
          <p class="eyebrow">Local two-player game</p>
          <h1 id="game-title">Connect Four</h1>
          <p class="hero-copy">
            同じ画面で交互に石を落として、先に4つ並べたプレイヤーの勝ちです。
          </p>
        </div>
        <StatusCard statusText={gameView.statusText} />
      </section>

      <section class="game-layout" aria-label="コネクトフォー対戦エリア">
        <div class="board-panel">
          <Board
            columns={gameView.columns}
            onColumnClick={handleColumnClick}
            onPreview={showPreview}
            onPreviewClear={() => setPreviewColumn(null)}
          />
          <p class="notice" role="status" aria-live="polite">
            {notice}
          </p>
        </div>

        <aside class="side-panel" aria-label="スコアと操作">
          <ScoreCard score={score} />
          <Controls
            canUndo={gameView.canUndo}
            onUndo={handleUndo}
            onNewGame={handleNewGame}
            onResetScore={handleResetScore}
          />
        </aside>
      </section>
    </main>
  );
}

type StatusCardProps = {
  statusText: string;
};

function StatusCard({ statusText }: StatusCardProps) {
  return (
    <div class="status-card" aria-live="polite">
      <span class="status-label">現在の状態</span>
      <strong>{statusText}</strong>
    </div>
  );
}

type BoardProps = {
  columns: BoardColumnView[];
  onColumnClick: (column: number) => void;
  onPreview: (column: number) => void;
  onPreviewClear: () => void;
};

function Board({
  columns,
  onColumnClick,
  onPreview,
  onPreviewClear,
}: BoardProps) {
  return (
    <div class="board" role="group" aria-label="7列6行の盤面">
      {columns.map((columnModel) => (
        <BoardColumn
          key={columnModel.column}
          columnModel={columnModel}
          onColumnClick={onColumnClick}
          onPreview={onPreview}
          onPreviewClear={onPreviewClear}
        />
      ))}
    </div>
  );
}

type BoardColumnProps = {
  columnModel: BoardColumnView;
  onColumnClick: (column: number) => void;
  onPreview: (column: number) => void;
  onPreviewClear: () => void;
};

function BoardColumn({
  columnModel,
  onColumnClick,
  onPreview,
  onPreviewClear,
}: BoardColumnProps) {
  return (
    <button
      class={
        columnModel.full ? "board-column board-column--full" : "board-column"
      }
      type="button"
      data-column={columnModel.column}
      aria-label={columnModel.label}
      aria-disabled={columnModel.full ? "true" : "false"}
      disabled={columnModel.disabled}
      onClick={() => onColumnClick(columnModel.column)}
      onMouseEnter={() => onPreview(columnModel.column)}
      onMouseLeave={onPreviewClear}
      onFocus={() => onPreview(columnModel.column)}
      onBlur={onPreviewClear}
    >
      {columnModel.cells.map((cell) => (
        <span
          key={cell.row}
          class={clsx(
            "cell",
            cell.state === "empty" ? "cell--empty" : `cell--${cell.state}`,
            cell.isLastMove && "cell--dropped",
            cell.isWinning && "cless--winning",
            cell.previewPlayer !== null &&
              `cell--preview-${cell.previewPlayer}`,
          )}
          data-row={cell.row}
          data-column={columnModel.column}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}

type ScoreCardProps = {
  score: Score;
};

function ScoreCard({ score }: ScoreCardProps) {
  return (
    <div class="score-card">
      <h2>Score</h2>
      <dl class="score-list">
        <div>
          <dt>
            <span class="score-dot score-dot--red" />赤
          </dt>
          <dd>{score.red}</dd>
        </div>
        <div>
          <dt>
            <span class="score-dot score-dot--yellow" />黄
          </dt>
          <dd>{score.yellow}</dd>
        </div>
        <div>
          <dt>引き分け</dt>
          <dd>{score.draw}</dd>
        </div>
      </dl>
    </div>
  );
}

type ControlsProps = {
  canUndo: boolean;
  onUndo: () => void;
  onNewGame: () => void;
  onResetScore: () => void;
};

function Controls({ canUndo, onUndo, onNewGame, onResetScore }: ControlsProps) {
  return (
    <div class="controls">
      <button
        class="control-button"
        type="button"
        disabled={!canUndo}
        onClick={onUndo}
      >
        1手戻す
      </button>
      <button
        class="control-button control-button--primary"
        type="button"
        onClick={onNewGame}
      >
        再戦する
      </button>
      <button class="control-button" type="button" onClick={onResetScore}>
        スコアをリセット
      </button>
    </div>
  );
}

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (appRoot === null) {
  throw new Error("App root was not found.");
}

render(<App />, appRoot);
