"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { GripVertical, Pause, Play } from "lucide-react";
import {
  moveTrim,
  resizeTrim,
  trimVideoToLimit,
  validTrim,
} from "../../lib/video-trim";

function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** Sample locally on a separate decoder so the preview never jumps around. */
function Filmstrip({ file, duration }: { file: File; duration: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let frame = 0;
    const count = 12;
    const draw = () => {
      const context = canvas.current?.getContext("2d");
      if (!context || !video.videoWidth) return;
      const crop = Math.min(video.videoWidth, video.videoHeight);
      context.drawImage(
        video,
        (video.videoWidth - crop) / 2,
        (video.videoHeight - crop) / 2,
        crop,
        crop,
        frame * 80,
        0,
        80,
        80,
      );
      frame++;
      if (frame < count) video.currentTime = (frame / count) * duration;
      else video.pause();
    };
    video.onloadeddata = draw;
    video.onseeked = draw;
    video.src = url;
    return () => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [file, duration]);
  return (
    <canvas
      ref={canvas}
      width={960}
      height={80}
      className="clip-filmstrip"
      aria-hidden="true"
    />
  );
}

/** Pick the part of a video to swap. Only the selected clip is uploaded.
 * Ported from the MadeByCue playground's trimmer. */
export function TrimDialog({
  file,
  duration,
  minimum,
  maximum,
  maxBytes,
  onDone,
}: {
  file: File;
  duration: number;
  minimum: number;
  maximum: number;
  maxBytes: number;
  onDone: (file: File | null) => void;
}) {
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(minimum || maximum, duration),
  });
  const { start, end } = range;
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    edge: "start" | "end" | "move";
    x: number;
    start: number;
    end: number;
  } | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const mountPlayer = useCallback(
    (node: HTMLVideoElement | null) => {
      player.current = node;
      if (!node) return;
      const preview = URL.createObjectURL(file);
      node.src = preview;
      return () => {
        URL.revokeObjectURL(preview);
        player.current = null;
      };
    },
    [file],
  );
  const valid =
    validTrim(start, end, duration, maximum) && end - start >= minimum - 1e-6;
  function select(next: { start: number; end: number }, previewEnd = false) {
    setRange(next);
    player.current?.pause();
    const seek = previewEnd ? Math.max(next.start, next.end - 0.1) : next.start;
    if (player.current) player.current.currentTime = seek;
    setPosition(seek);
  }
  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    edge: "start" | "end" | "move",
  ) {
    if (working) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { edge, x: event.clientX, start, end };
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || !timeline.current) return;
    const initial = drag.current;
    const delta =
      ((event.clientX - initial.x) /
        timeline.current.getBoundingClientRect().width) *
      duration;
    select(
      initial.edge === "move"
        ? moveTrim(initial.start + delta, initial.end - initial.start, duration)
        : resizeTrim(
            initial.start,
            initial.end,
            initial.edge,
            initial[initial.edge] + delta,
            duration,
            minimum,
            maximum,
          ),
      initial.edge === "end",
    );
  }
  function keyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    edge: "start" | "end" | "move",
  ) {
    const step = event.shiftKey ? 10 : 1;
    const delta =
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    if (!delta) return;
    event.preventDefault();
    select(
      edge === "move"
        ? moveTrim(start + delta, end - start, duration)
        : resizeTrim(
            start,
            end,
            edge,
            (edge === "start" ? start : end) + delta,
            duration,
            minimum,
            maximum,
          ),
      edge === "end",
    );
  }
  async function save() {
    setWorking(true);
    setError("");
    player.current?.pause();
    try {
      // The whole video already fits: upload it as it is, without re-encoding.
      const whole = start <= 0.05 && end >= duration - 0.05;
      const clip = whole
        ? file
        : await trimVideoToLimit(file, start, end, maximum, setProgress);
      if (clip.size > maxBytes)
        throw new Error(
          `This clip is over ${Math.round(maxBytes / 1024 / 1024)} MB. Select a shorter section.`,
        );
      onDone(clip);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not trim this video.",
      );
    } finally {
      setWorking(false);
    }
  }
  const lengths = Array.from(
    { length: Math.floor(Math.min(maximum, duration) / 60) },
    (_, i) => i + 1,
  ).filter((m) => m * 60 >= minimum);
  const wholeMinutes = Math.round((end - start) / 60);
  return (
    <dialog
      ref={dialog}
      className="clip-dialog"
      aria-labelledby="clip-title"
      aria-describedby="clip-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!working) onDone(null);
      }}
    >
      <div className="clip-head">
        <h2 id="clip-title">Choose your clip</h2>
        <p id="clip-description">
          Swaps use 40 seconds to {maximum / 60} minutes of video. Drag the edges to
          trim; only your selected clip is uploaded.
        </p>
      </div>
      <div className="clip-preview">
        <video
          ref={mountPlayer}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => {
            if (!player.current) return;
            setPosition(player.current.currentTime);
            if (player.current.currentTime >= end) player.current.pause();
          }}
        />
        <button
          type="button"
          className="clip-play"
          disabled={working}
          aria-label={playing ? "Pause clip" : "Preview clip"}
          onClick={() => {
            const video = player.current;
            if (!video) return;
            if (playing) video.pause();
            else {
              if (video.currentTime < start || video.currentTime >= end - 0.1)
                video.currentTime = start;
              void video
                .play()
                .catch(() => setError("This browser cannot preview the video."));
            }
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="clip-preview-time">
          {timeLabel(Math.min(end, Math.max(start, position)))} /{" "}
          {timeLabel(duration)}
        </span>
      </div>
      <div className="clip-timeline-area">
        <div className="clip-timeline" ref={timeline}>
          <Filmstrip file={file} duration={duration} />
          <div
            className="clip-shade"
            style={{ left: 0, width: `${(start / duration) * 100}%` }}
          />
          <div
            className="clip-shade"
            style={{ left: `${(end / duration) * 100}%`, right: 0 }}
          />
          <button
            type="button"
            className="clip-selection"
            style={{
              left: `${(start / duration) * 100}%`,
              width: `${((end - start) / duration) * 100}%`,
            }}
            disabled={working}
            role="slider"
            aria-label="Move selected clip"
            aria-valuemin={0}
            aria-valuemax={duration - (end - start)}
            aria-valuenow={start}
            aria-valuetext={`Starts at ${timeLabel(start)}`}
            onPointerDown={(e) => beginDrag(e, "move")}
            onPointerMove={pointerMove}
            onPointerUp={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(e) => keyboard(e, "move")}
          />
          {(["start", "end"] as const).map((edge) => (
            <button
              key={edge}
              type="button"
              className={`clip-handle clip-handle-${edge}`}
              style={{
                left: `${((edge === "start" ? start : end) / duration) * 100}%`,
              }}
              disabled={working}
              role="slider"
              aria-label={edge === "start" ? "Clip start" : "Clip end"}
              aria-valuemin={
                edge === "start"
                  ? Math.max(0, end - maximum)
                  : start + (minimum || 0.1)
              }
              aria-valuemax={
                edge === "start"
                  ? end - (minimum || 0.1)
                  : Math.min(duration, start + maximum)
              }
              aria-valuenow={edge === "start" ? start : end}
              aria-valuetext={timeLabel(edge === "start" ? start : end)}
              onPointerDown={(e) => beginDrag(e, edge)}
              onPointerMove={pointerMove}
              onPointerUp={() => {
                drag.current = null;
              }}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => keyboard(e, edge)}
            >
              <GripVertical size={14} />
            </button>
          ))}
          <div
            className="clip-playhead"
            style={{
              left: `${(Math.min(end, Math.max(start, position)) / duration) * 100}%`,
            }}
          />
        </div>
        <div className="clip-ruler">
          <span>0:00</span>
          <span>{timeLabel(duration / 2)}</span>
          <span>{timeLabel(duration)}</span>
        </div>
      </div>
      <div className="clip-summary">
        <span>
          <strong>
            {timeLabel(start)} – {timeLabel(end)}
          </strong>
          <small>
            {timeLabel(end - start)} selected · 40 sec–{maximum / 60} min clip
          </small>
        </span>
        <label>
          Length{" "}
          <select
            aria-label="Clip length"
            disabled={working}
            value={
              Math.abs((end - start) / 60 - wholeMinutes) < 1e-8
                ? wholeMinutes
                : "custom"
            }
            onChange={(e) =>
              select(moveTrim(start, Number(e.target.value) * 60, duration))
            }
          >
            <option value="custom" disabled>
              {timeLabel(end - start)}
            </option>
            {lengths.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      {working && (
        <div role="status" className="clip-progress">
          <span>Preparing clip… {Math.round(progress * 100)}%</span>
          <progress value={progress} max={1} />
        </div>
      )}
      {error && (
        <p className="dock-error" role="alert">
          {error}
        </p>
      )}
      <div className="clip-actions">
        <button
          type="button"
          className="estimate-cancel"
          disabled={working}
          onClick={() => onDone(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="estimate-confirm"
          disabled={working || !valid}
          onClick={() => void save()}
        >
          {working ? "Preparing…" : "Use clip"}
        </button>
      </div>
    </dialog>
  );
}
