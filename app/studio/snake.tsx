"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Point = { x: number; y: number };
type State = "ready" | "playing" | "paused" | "over";

// 32 × 18 keeps the cells square in the 16:9 preview.
const COLS = 32,
  ROWS = 18,
  START_TICK = 130,
  MIN_TICK = 70,
  BEST_KEY = "snake-best";
const TURNS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};
const same = (a: Point) => (b: Point) => a.x === b.x && a.y === b.y;

function place(snake: Point[]): Point {
  for (;;) {
    const p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!snake.some(same(p))) return p;
  }
}
function newGame() {
  const snake = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 },
  ];
  return { snake, dir: { x: 1, y: 0 }, queue: [] as Point[], food: place(snake), score: 0 };
}
function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** A small game of snake for the wait while a video renders. It only takes
 * keys while focused, wraps at the edges, and pauses when it loses focus. */
export function SnakeGame({ label, onClose }: { label: string; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef(newGame());
  const swipe = useRef<Point | null>(null);
  const [state, setState] = useState<State>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);

  function draw() {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const css = getComputedStyle(c),
      cell = c.width / COLS,
      g = game.current;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = css.getPropertyValue("--accent");
    ctx.beginPath();
    ctx.arc((g.food.x + 0.5) * cell, (g.food.y + 0.5) * cell, cell * 0.38, 0, Math.PI * 2);
    ctx.fill();
    g.snake.forEach((p, i) => {
      ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 0.9 - i * 0.015);
      ctx.fillStyle = css.getPropertyValue("--ink");
      ctx.beginPath();
      ctx.roundRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, cell * 0.3);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function start() {
    if (state === "over") {
      game.current = newGame();
      setScore(0);
    }
    setState("playing");
  }

  function turn(dir: Point) {
    const g = game.current,
      last = g.queue.at(-1) ?? g.dir;
    if (last.x + dir.x === 0 && last.y + dir.y === 0) return;
    if (!same(last)(dir) && g.queue.length < 2) g.queue.push(dir);
  }

  /** Moves one cell; false when the snake runs into itself. */
  function step() {
    const g = game.current;
    g.dir = g.queue.shift() ?? g.dir;
    const head = {
      x: (g.snake[0].x + g.dir.x + COLS) % COLS,
      y: (g.snake[0].y + g.dir.y + ROWS) % ROWS,
    };
    const eats = same(head)(g.food);
    const body = eats ? g.snake : g.snake.slice(0, -1);
    if (body.some(same(head))) return false;
    g.snake = [head, ...body];
    if (eats) {
      g.score++;
      g.food = place(g.snake);
      setScore(g.score);
    }
    return true;
  }

  useEffect(() => {
    canvas.current?.focus();
    const c = canvas.current;
    if (!c) return;
    const resize = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round((c.width * ROWS) / COLS);
      draw();
    });
    resize.observe(c);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    draw();
    if (state !== "playing") return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!step()) {
        const score = game.current.score;
        setState("over");
        setBest((b) => {
          if (score <= b) return b;
          try {
            localStorage.setItem(BEST_KEY, String(score));
          } catch {
            /* best score is a nicety */
          }
          return score;
        });
        return;
      }
      draw();
      timer = setTimeout(tick, Math.max(MIN_TICK, START_TICK - game.current.score * 3));
    };
    timer = setTimeout(tick, START_TICK);
    const hide = () => document.hidden && setState("paused");
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [state]);

  return (
    <div className="snake" data-playing={state === "playing"}>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="application"
        aria-label="Snake game. Arrow keys or swipe to steer, Space to start or pause, Escape to close."
        onBlur={() => state === "playing" && setState("paused")}
        onKeyDown={(e) => {
          const dir = TURNS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
          if (e.key === "Escape") return onClose();
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            return state === "playing" ? setState("paused") : start();
          }
          if (!dir) return;
          e.preventDefault();
          turn(dir);
          if (state !== "playing") start();
        }}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from) return;
          const dx = e.clientX - from.x,
            dy = e.clientY - from.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
            if (state !== "playing") start();
            return;
          }
          turn(
            Math.abs(dx) > Math.abs(dy)
              ? { x: Math.sign(dx), y: 0 }
              : { x: 0, y: Math.sign(dy) },
          );
          if (state !== "playing") start();
        }}
      />
      <div className="snake-hud">
        <span>
          {score} · best {best}
        </span>
        <span className="snake-status">{label}</span>
        <button type="button" aria-label="Close game" onClick={onClose}>
          <X size={12} />
        </button>
      </div>
      {state !== "playing" && (
        <div className="snake-overlay" aria-live="polite">
          <strong>
            {state === "over" ? `Game over · ${score}` : state === "paused" ? "Paused" : "Snake"}
          </strong>
          <small>
            {state === "over" ? "Tap or press Space to play again" : "Arrow keys or swipe to steer · tap to start"}
          </small>
        </div>
      )}
    </div>
  );
}
