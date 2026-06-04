import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import * as Tone from "tone";
import "./style.css";
import {
  createGameState,
  dropDisc,
  undoLastMove,
  type GameState,
  type MoveError,
} from "./game";
import { createGameView, type BoardColumnView } from "./game-view";
import clsx from "clsx";

type Score = Record<"red" | "yellow" | "draw", number>;
type SoundEffect = "piece-drop" | "win" | "draw" | "column-full";
type SoundEffectSynths = ReturnType<typeof createSoundEffectSynths>;

const SOUND_EFFECTS_STORAGE_KEY = "connect-four:sound-effects";

const moveErrorMessages: Record<MoveError, string> = {
  "column-full": "この列は満杯です。別の列を選んでください。",
  "game-over":
    "ゲームは終了しています。再戦ボタンで新しいゲームを始めてください。",
  "invalid-column": "その列にはコマを落とせません。",
};

function App() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [score, setScore] = useState<Score>({ red: 0, yellow: 0, draw: 0 });
  const [notice, setNotice] = useState("");
  const [previewColumn, setPreviewColumn] = useState<number | null>(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() =>
    loadSoundEffectsEnabled(),
  );
  const noticeTimer = useRef<number | undefined>(undefined);
  const soundEffectsEnabledRef = useRef(soundEffectsEnabled);
  const soundEffectSynths = useRef<SoundEffectSynths | null>(null);
  const soundEffectSynthsReady = useRef<Promise<SoundEffectSynths> | null>(
    null,
  );
  const gameView = useMemo(
    () => createGameView(game, previewColumn),
    [game, previewColumn],
  );

  useEffect(() => clearNoticeTimer, []);

  useEffect(() => {
    soundEffectsEnabledRef.current = soundEffectsEnabled;
  }, [soundEffectsEnabled]);

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
      if (result.error === "column-full") {
        playSoundEffect("column-full");
      }

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
      playSoundEffect("win");
    }

    if (nextGame.status.kind === "draw") {
      setScore((currentScore) => ({
        ...currentScore,
        draw: currentScore.draw + 1,
      }));
      playSoundEffect("draw");
    }

    if (nextGame.status.kind === "playing") {
      playSoundEffect("piece-drop");
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

  function handleToggleSoundEffects(): void {
    setSoundEffectsEnabled((enabled) => {
      const nextEnabled = !enabled;
      soundEffectsEnabledRef.current = nextEnabled;
      saveSoundEffectsEnabled(nextEnabled);
      return nextEnabled;
    });
  }

  function playSoundEffect(effect: SoundEffect): void {
    if (!soundEffectsEnabledRef.current) {
      return;
    }

    void prepareSoundEffects()
      .then((synths) => {
        if (!soundEffectsEnabledRef.current) {
          return;
        }

        triggerSoundEffect(synths, effect);
      })
      .catch(() => undefined);
  }

  function prepareSoundEffects(): Promise<SoundEffectSynths> {
    if (soundEffectSynths.current !== null) {
      return Promise.resolve(soundEffectSynths.current);
    }

    soundEffectSynthsReady.current ??= Tone.start().then(() => {
      soundEffectSynths.current = createSoundEffectSynths();
      return soundEffectSynths.current;
    });
    soundEffectSynthsReady.current.catch(() => {
      soundEffectSynthsReady.current = null;
    });

    return soundEffectSynthsReady.current;
  }

  return (
    <main class="app-shell">
      <section class="hero" aria-labelledby="game-title">
        <div>
          <p class="eyebrow">Local two-player game</p>
          <h1 id="game-title">Connect Four</h1>
          <p class="hero-copy">
            同じ画面で交互にコマを落として、先に4つ並べたプレイヤーの勝ちです。
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
            soundEffectsEnabled={soundEffectsEnabled}
            onToggleSoundEffects={handleToggleSoundEffects}
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
            cell.isWinning && "cell--winning",
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
  soundEffectsEnabled: boolean;
  onToggleSoundEffects: () => void;
};

function Controls({
  canUndo,
  onUndo,
  onNewGame,
  onResetScore,
  soundEffectsEnabled,
  onToggleSoundEffects,
}: ControlsProps) {
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
      <button
        class="control-button control-button--toggle"
        type="button"
        aria-pressed={soundEffectsEnabled ? "true" : "false"}
        onClick={onToggleSoundEffects}
      >
        <span>効果音</span>
        <span class="toggle-state">
          {soundEffectsEnabled ? "オン" : "オフ"}
        </span>
      </button>
    </div>
  );
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

function loadSoundEffectsEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_EFFECTS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveSoundEffectsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(
      SOUND_EFFECTS_STORAGE_KEY,
      enabled ? "on" : "off",
    );
  } catch {
    // 効果音の設定保存に失敗しても、ゲーム進行は止めない。
  }
}

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (appRoot === null) {
  throw new Error("App root was not found.");
}

render(<App />, appRoot);
