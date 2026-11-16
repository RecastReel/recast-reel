"use client";

import { useEffect, useRef, useState } from "react";
import { shownPercent, taskDisplay } from "../../lib/task-status";
import type { Swap } from "../../lib/swap-client";

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** When MadeByCue expects the task to be done at the latest, or null
 * without a fresh estimate. Counting down to the late end means the timer
 * rarely runs out before the video does. */
function finishBy(estimate: Swap["estimate"]) {
  if (!estimate || estimate.stale) return null;
  const latest = Date.parse(estimate.completionAt?.latest ?? "");
  if (Number.isFinite(latest)) return latest;
  const updated = Date.parse(estimate.updatedAt ?? "");
  const high = estimate.remainingSeconds?.high;
  return Number.isFinite(updated) && high ? updated + high * 1000 : null;
}

/** Typical full run, used for the bar until MadeByCue sends an estimate. */
const TYPICAL_SECONDS = { swap: 35 * 60, generate: 5.5 * 60 };

/** Live progress for an unfinished video: a ticking countdown to the
 * estimated finish, time elapsed since it was submitted, and a reminder that
 * it keeps going without this tab. Re-anchors whenever a poll lands. */
export function TaskTimer({ task }: { task: Swap }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = (now - Date.parse(task.createdAt)) / 1000;
  const target = finishBy(task.estimate);
  const left = target === null ? null : (target - now) / 1000;
  const display = taskDisplay(task);
  const reported = task.progress?.percent;

  // When the reported percent last changed, so the bar can creep from it,
  // and the highest value shown so a new estimate never moves it back.
  const seen = useRef({ reported, at: now });
  if (seen.current.reported !== reported) seen.current = { reported, at: now };
  const peak = useRef(0);
  let percent: number | undefined;
  if (!display.waiting) {
    // Time spent waiting in line doesn't count toward rendering.
    const admitted = Date.parse(task.queue?.admitted_at ?? "");
    const start = Number.isFinite(admitted) ? admitted : Date.parse(task.createdAt);
    peak.current = Math.max(
      peak.current,
      shownPercent({
        reported,
        reportedFor: (now - seen.current.at) / 1000,
        elapsed: (now - start) / 1000,
        expected: target === null ? TYPICAL_SECONDS[task.kind] : (target - start) / 1000,
      }),
    );
    percent = peak.current;
  }

  let headline: string;
  if (display.waiting) headline = display.waitingLabel;
  else if (display.phase === "billing_pending") headline = "Finalizing your video";
  else if (left !== null && left > 0) headline = `About ${clock(left)} left`;
  else if (left !== null) headline = "Taking a little longer than estimated";
  else headline = "Rendering your video";

  return (
    <div className="task-timer" role="timer" aria-live="off">
      <div
        className={`task-bar ${typeof percent === "number" ? "" : "is-indeterminate"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={typeof percent === "number" ? Math.floor(percent) : undefined}
      >
        <span
          style={
            typeof percent === "number"
              ? { width: `${Math.max(2, Math.min(100, percent))}%` }
              : undefined
          }
        />
      </div>
      <div className="task-timer-row">
        <strong>{headline}</strong>
        <span>
          {typeof percent === "number" && `${Math.floor(percent)}% · `}
          {clock(elapsed)} elapsed
        </span>
      </div>
      <p className="task-timer-note">
        {task.kind === "swap"
          ? "Character swaps often take 30–40 minutes."
          : "Generated videos usually take 5–6 minutes."}{" "}
        We&apos;re still working on it. You can close this page; your video
        will be here when you come back.
      </p>
    </div>
  );
}
