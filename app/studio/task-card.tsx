"use client";

import { CircleAlert, CircleCheck, Gamepad2, LoaderCircle, Trash2 } from "lucide-react";
import { credits } from "../../lib/options";
import type { Swap } from "../../lib/swap-client";
import { taskDisplay } from "../../lib/task-status";
import { SnakeGame } from "./snake";
import { TaskTimer } from "./task-timer";

const TERMINAL = ["succeeded", "failed", "needs_input", "cancelled", "expired"];
export const terminal = (status: string) => TERMINAL.includes(status);
const seconds = (n: number) =>
  `${Math.max(0, Math.round(n))} second${Math.round(n) === 1 ? "" : "s"}`;

/** One video in "My videos": the finished video, or its progress (and an
 * optional game of snake) while it renders. */
export function TaskCard({
  task: s,
  playing,
  onPlay,
  onRemove,
}: {
  task: Swap;
  playing: boolean;
  onPlay: (on: boolean) => void;
  onRemove: () => void;
}) {
  const display = taskDisplay(s);
  return (
    <article className="task-card">
      {s.outputs[0] ? (
        <video
          className="task-preview studio-video"
          src={s.outputs[0].url}
          controls
          playsInline
          preload="metadata"
        />
      ) : playing && !terminal(s.status) ? (
        <SnakeGame label={display.label} onClose={() => onPlay(false)} />
      ) : (
        <div
          className={`task-preview task-placeholder ${terminal(s.status) ? "is-terminal" : ""}`}
        >
          {s.status === "succeeded" ? (
            <CircleCheck size={22} />
          ) : terminal(s.status) ? (
            <CircleAlert size={22} />
          ) : (
            <LoaderCircle size={22} className="spin" />
          )}
          <span>{display.label}</span>
          {!terminal(s.status) && (
            <button type="button" className="play-wait" onClick={() => onPlay(true)}>
              <Gamepad2 size={14} /> Play Snake while you wait
            </button>
          )}
        </div>
      )}
      <div className="task-copy">
        {s.outputs[0] && <span className="playback-size-note">Fullscreen viewing · up to 720p</span>}
        <span className="task-kind">
          {s.kind === "swap" ? "Character swap" : "Generated video"} ·{" "}
          {seconds(s.seconds)}
        </span>
        <div className="task-title">
          <h3>{s.prompt}</h3>
          <span
            className={`status-pill ${terminal(s.status) ? `status-${s.status}` : "status-running"}`}
            role="status"
            aria-live="polite"
          >
            {display.label}
          </span>
        </div>
        <p>{display.detail}</p>
        {!terminal(s.status) && <TaskTimer task={s} />}
        {s.refunded && (
          <span className="task-wait-note">
            {credits(s.costCents)} returned to your balance.
          </span>
        )}
        <div className="task-actions">
          {s.outputs[0] && (
            <a href={`${s.outputs[0].url}?download=1`} download>
              Download video
            </a>
          )}
          {terminal(s.status) && (
            <button type="button" className="task-delete" onClick={onRemove}>
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
