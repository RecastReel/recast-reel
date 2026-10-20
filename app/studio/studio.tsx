"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  GENERATE_RATIOS,
  GENERATE_SECONDS,
  MAX_REFERENCES,
  usd,
} from "../../lib/options";
import {
  swapApi,
  SwapError,
  uploadMedia,
  type PlanStatus,
  type Swap,
  type UploadedMedia,
} from "../../lib/swap-client";
import { SubscribeButton } from "../billing-buttons";
import { TaskTimer } from "./task-timer";
import { TrimDialog } from "./trim-dialog";
import "../swap.css";

type Mode = "swap" | "generate";
type Pick = { id: string; name: string; url: string; file?: File };
type Prepared = { body: Record<string, unknown>; costCents: number; key: string };

const MIN_SECONDS = 60,
  MAX_SECONDS = 600;
const TERMINAL = ["succeeded", "failed", "needs_input", "cancelled", "expired"];
const terminal = (status: string) => TERMINAL.includes(status);
const seconds = (n: number) =>
  `${Math.max(0, Math.round(n))} second${Math.round(n) === 1 ? "" : "s"}`;

function statusLabel(status: string) {
  return (
    (
      {
        succeeded: "Complete",
        failed: "Failed",
        needs_input: "Needs attention",
        cancelled: "Cancelled",
        expired: "Expired",
        queued: "Queued",
      } as Record<string, string>
    )[status] ?? "In progress"
  );
}
function localDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      done();
      Number.isFinite(d)
        ? resolve(d)
        : reject(new Error("Could not read this video. Try an MP4 file."));
    };
    el.onerror = () => {
      done();
      reject(new Error("Could not read this video. Try an MP4 file."));
    };
    el.src = url;
  });
}
const fromFile = (file: File): Pick => ({
  id: `${file.name}:${file.size}:${file.lastModified}`,
  name: file.name,
  url: URL.createObjectURL(file),
  file,
});

export function Studio({
  initialPlan,
  price,
  subscribed,
}: {
  initialPlan: PlanStatus;
  price: number;
  subscribed: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [mode, setMode] = useState<Mode>("swap");
  const [character, setCharacter] = useState<Pick | null>(null);
  const [clip, setClip] = useState<(Pick & { seconds: number }) | null>(null);
  const [trimming, setTrimming] = useState<{
    file: File;
    duration: number;
  } | null>(null);
  const [references, setReferences] = useState<Pick[]>([]);
  const [length, setLength] = useState(GENERATE_SECONDS[0]);
  const [ratio, setRatio] = useState(GENERATE_RATIOS[0]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [items, setItems] = useState<Swap[]>([]);
  const itemsRef = useRef(items);
  const uploaded = useRef(new Map<string, UploadedMedia>());
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLElement>(null);
  itemsRef.current = items;

  useEffect(() => {
    setPrepared(null);
    setError("");
  }, [mode, character, clip, references, length, ratio, prompt]);
  useEffect(() => {
    // Loading the list also settles videos that ended while away, which
    // can return credit, so refresh the plan after it.
    void swapApi<{ swaps: Swap[] }>("swaps")
      .then((d) => {
        setItems(d.swaps);
        if (d.swaps.some((s) => s.refunded)) void refreshPlan();
      })
      .catch(() => {});
  }, []);
  // Right after checkout the webhook may land a moment later; poll briefly.
  useEffect(() => {
    if (!subscribed || plan.active) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > 20) return clearInterval(timer);
      void swapApi<{ plan: PlanStatus }>("me")
        .then((d) => {
          if (d.plan.active) {
            setPlan(d.plan);
            clearInterval(timer);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [subscribed, plan.active]);

  // Check unfinished videos, backing off while the tab is hidden. A failed
  // check is retried on the next tick; coming back to the tab or back
  // online checks right away.
  useEffect(() => {
    let stopped = false,
      running = false,
      timer: ReturnType<typeof setTimeout>;
    async function check() {
      clearTimeout(timer);
      const pending = itemsRef.current.filter((s) => !terminal(s.status));
      if (stopped || running || !pending.length) return;
      running = true;
      await Promise.allSettled(
        pending.map(async (job) => {
          const fresh = await swapApi<Swap>(`swaps/${job.id}`);
          if (!stopped)
            setItems((list) => list.map((s) => (s.id === job.id ? fresh : s)));
          if (fresh.refunded && !job.refunded) void refreshPlan();
        }),
      );
      running = false;
      if (!stopped)
        timer = setTimeout(
          () => void check(),
          document.visibilityState === "hidden" ? 60000 : 10000,
        );
    }
    const resume = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [items.length]);

  async function refreshPlan() {
    try {
      setPlan((await swapApi<{ plan: PlanStatus }>("me")).plan);
    } catch {
      /* keep the last known plan */
    }
  }

  async function pickVideo(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!["video/mp4", "video/quicktime"].includes(file.type))
      return setError("Choose an MP4 or MOV video.");
    try {
      const length = await localDuration(file);
      if (length < MIN_SECONDS - 0.5)
        return setError("Choose a video at least 1 minute long.");
      // Every swap source goes through the trimmer to pick its 1–10 minutes.
      setTrimming({ file, duration: length });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read this video.",
      );
    }
  }
  async function takeClip(file: File | null) {
    setTrimming(null);
    if (!file) return;
    try {
      const length = await localDuration(file);
      setClip({ ...fromFile(file), seconds: Math.ceil(length) });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read this video.",
      );
    }
  }
  function pickImage(file: File | undefined) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    )
      return setError("Choose a JPG, PNG or WebP under 20 MB.");
    if (mode === "swap") setCharacter(fromFile(file));
    else
      setReferences((list) =>
        list.length < MAX_REFERENCES ? [...list, fromFile(file)] : list,
      );
  }

  async function upload(pick: Pick, kind: "image" | "video") {
    const cached = uploaded.current.get(pick.id);
    if (cached) return cached;
    let file = pick.file;
    if (!file) {
      const blob = await (await fetch(pick.url)).blob();
      file = new File([blob], `${pick.id}.png`, {
        type: blob.type || "image/png",
      });
    }
    const media = await uploadMedia(file, kind, (f) =>
      setProgress(
        kind === "video"
          ? `Uploading video… ${Math.round(f * 100)}%`
          : "Uploading images…",
      ),
    );
    uploaded.current.set(pick.id, media);
    return media;
  }

  async function prepare() {
    if (busy) return;
    if (mode === "swap" && (!character || !clip))
      return setError("Pick a character and add a video first.");
    if (mode === "generate" && prompt.trim().length < 3)
      return setError("Describe the video you want to create.");
    setBusy(true);
    setError("");
    setProgress("Uploading…");
    try {
      const body =
        mode === "swap"
          ? {
              kind: "swap",
              character: await upload(character!, "image"),
              video: await upload(clip!, "video"),
              prompt: prompt.trim(),
            }
          : {
              kind: "generate",
              prompt: prompt.trim(),
              seconds: length,
              aspectRatio: ratio,
              references: await Promise.all(
                references.map((r) => upload(r, "image")),
              ),
            };
      setProgress("Pricing…");
      const { costCents } = await swapApi<{ costCents: number }>(
        "swaps/estimate",
        body,
      );
      if (costCents > plan.remainingCents)
        return setError(
          `This video costs ${usd(costCents)} and you have ${usd(plan.remainingCents)} of credit left this month.`,
        );
      setPrepared({ body, costCents, key: crypto.randomUUID() });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Try again.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function confirm() {
    if (!prepared || busy) return;
    setBusy(true);
    setError("");
    setProgress("Starting…");
    try {
      const created = await swapApi<Swap>("swaps", prepared.body, {
        idempotency: prepared.key,
      });
      setItems((list) => [created, ...list.filter((s) => s.id !== created.id)]);
      setPrepared(null);
      setClip(null);
      setPrompt("");
      void refreshPlan();
      setTimeout(
        () =>
          gallery.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    } catch (err) {
      // A definite rejection gets a fresh key so the next try is a new
      // request. A lost connection or server error keeps the key: the
      // first attempt may have gone through, and a retry with the same key
      // returns that video instead of starting a second one.
      if (err instanceof SwapError && err.status > 0 && err.status < 500)
        setPrepared((p) => p && { ...p, key: crypto.randomUUID() });
      setError(
        err instanceof Error ? err.message : "Could not start. Try again.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="swap">
      <main className="swap-main">
        <div className="creation-stage">
          <section className="swap-intro">
            <h1>What are you making today?</h1>
          </section>
          <section className="composer-stage" aria-label="Composer">
            {!plan.active ? (
              <div className="paywall">
                <strong>
                  ${price}/month · {usd(plan.creditCents)} of video credit
                  every month
                </strong>
                <p>
                  {subscribed
                    ? "Confirming your subscription… this takes a few seconds."
                    : "Videos that fail give their credit back. Cancel anytime."}
                </p>
                {!subscribed && (
                  <SubscribeButton label="Subscribe to start" />
                )}
              </div>
            ) : (
              <>
                <div
                  className="mode-switch segmented"
                  role="tablist"
                  aria-label="What to make"
                >
                  <button
                    role="tab"
                    aria-selected={mode === "swap"}
                    aria-pressed={mode === "swap"}
                    onClick={() => setMode("swap")}
                  >
                    Swap character
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === "generate"}
                    aria-pressed={mode === "generate"}
                    onClick={() => setMode("generate")}
                  >
                    Generate video
                  </button>
                </div>
                <div className="composer">
                  <div className="media-placeholders">
                    {mode === "swap" ? (
                      <>
                        <div className="media-placeholder">
                          <span className="media-label">Character</span>
                          <button
                            className="media-tile"
                            aria-label="Upload your own character"
                            title="Upload your own character"
                            onClick={() => imageInput.current?.click()}
                          >
                            {character ? (
                              <img src={character.url} alt={character.name} />
                            ) : (
                              <Plus size={20} strokeWidth={1.5} />
                            )}
                          </button>
                          {character && (
                            <button
                              className="remove-attachment"
                              aria-label="Remove character"
                              onClick={() => setCharacter(null)}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                        <div className="media-placeholder">
                          <span className="media-label">Video</span>
                          <button
                            className="media-tile"
                            aria-label="Upload a video"
                            title="Upload a 1–10 minute video"
                            onClick={() => videoInput.current?.click()}
                          >
                            {clip ? (
                              <video
                                src={clip.url}
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <Plus size={20} strokeWidth={1.5} />
                            )}
                          </button>
                          {clip && (
                            <button
                              className="remove-attachment"
                              aria-label="Remove video"
                              onClick={() => setClip(null)}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="media-placeholder">
                        <span className="media-label">
                          References (optional)
                        </span>
                        <div className="reference-tiles">
                          {references.map((r) => (
                            <div className="reference-tile" key={r.id}>
                              <img src={r.url} alt={r.name} />
                              <button
                                className="remove-attachment"
                                aria-label={`Remove ${r.name}`}
                                onClick={() =>
                                  setReferences((list) =>
                                    list.filter((x) => x.id !== r.id),
                                  )
                                }
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {references.length < MAX_REFERENCES && (
                            <button
                              className="media-tile"
                              aria-label="Add a reference image"
                              title="Add a reference image"
                              onClick={() => imageInput.current?.click()}
                            >
                              <Plus size={20} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <textarea
                    aria-label={
                      mode === "swap" ? "Swap direction" : "Video description"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter reviews, Enter again starts; Shift+Enter adds a line.
                      if (
                        e.key !== "Enter" ||
                        e.shiftKey ||
                        e.nativeEvent.isComposing
                      )
                        return;
                      e.preventDefault();
                      void (prepared ? confirm() : prepare());
                    }}
                    maxLength={1600}
                    placeholder={
                      mode === "swap"
                        ? "Optional: describe how the character should appear…"
                        : "Describe the video you want to create…"
                    }
                  />
                  <div className="composer-foot">
                    {mode === "generate" && (
                      <div className="generate-options">
                        <div
                          className="segmented"
                          role="group"
                          aria-label="Length"
                        >
                          {GENERATE_SECONDS.map((s) => (
                            <button
                              key={s}
                              aria-pressed={length === s}
                              onClick={() => setLength(s)}
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                        <div
                          className="segmented"
                          role="group"
                          aria-label="Aspect ratio"
                        >
                          {GENERATE_RATIOS.map((r) => (
                            <button
                              key={r}
                              aria-pressed={ratio === r}
                              onClick={() => setRatio(r)}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="composer-tools">
                      {!prepared && (
                        <button
                          className="swap-go"
                          disabled={busy}
                          aria-label="Review"
                          onClick={() => void prepare()}
                        >
                          {busy ? (
                            <LoaderCircle size={16} className="spin" />
                          ) : (
                            <ArrowUp size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {prepared && (
                    <div className="estimate-box">
                      <strong>
                        {mode === "swap"
                          ? "Ready to swap"
                          : "Ready to generate"}
                      </strong>
                      <p>
                        {plan.billing ? (
                          <>
                            This costs about {usd(prepared.costCents)} of your{" "}
                            {usd(plan.remainingCents)} credit left. If it fails,
                            the credit comes back.
                          </>
                        ) : (
                          <>
                            This costs about {usd(prepared.costCents)} on your
                            MadeByCue API key.
                          </>
                        )}
                      </p>
                      <div className="row">
                        <button
                          className="estimate-cancel"
                          onClick={() => setPrepared(null)}
                        >
                          Edit
                        </button>
                        <button
                          className="estimate-confirm"
                          disabled={busy}
                          onClick={() => void confirm()}
                        >
                          {mode === "swap" ? "Start swap" : "Generate"}
                        </button>
                      </div>
                    </div>
                  )}
                  {busy && progress && (
                    <p className="dock-status" role="status">
                      {progress}
                    </p>
                  )}
                  {error && (
                    <p className="dock-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <section className="swaps" ref={gallery} aria-label="My videos">
          <div className="gallery-heading">
            <div>
              <h2>My videos</h2>
              <p>
                Videos keep going when you close this tab. Download finished
                videos within 7 days.
              </p>
            </div>
            {items.some((s) => !terminal(s.status)) && (
              <button
                className="refresh-all"
                onClick={() =>
                  void swapApi<{ swaps: Swap[] }>("swaps").then((d) =>
                    setItems(d.swaps),
                  )
                }
              >
                <RefreshCw size={13} />
                Check status
              </button>
            )}
          </div>
          {items.length ? (
            <div className="swaps-grid">
              {items.map((s) => {
                const detail =
                  s.status === "queued"
                    ? "Your video is in line and will start automatically."
                    : s.progress?.message ||
                      s.message ||
                      (s.status === "succeeded"
                        ? "Your video is ready."
                        : terminal(s.status)
                          ? "This video could not be completed."
                          : "Working on your video.");
                return (
                  <article className="task-card" key={s.id}>
                    {s.outputs[0] ? (
                      <video
                        className="task-preview"
                        src={s.outputs[0].url}
                        controls
                        playsInline
                        preload="metadata"
                      />
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
                        <span>
                          {statusLabel(s.status)}
                          {!terminal(s.status) &&
                          s.status !== "queued" &&
                          typeof s.progress?.percent === "number"
                            ? ` · ${s.progress.percent}%`
                            : ""}
                        </span>
                      </div>
                    )}
                    <div className="task-copy">
                      <span className="task-kind">
                        {s.kind === "swap"
                          ? "Character swap"
                          : "Generated video"}{" "}
                        · {seconds(s.seconds)}
                      </span>
                      <div className="task-title">
                        <h3>{s.prompt}</h3>
                        <span
                          className={`status-pill ${terminal(s.status) ? `status-${s.status}` : "status-running"}`}
                          role="status"
                          aria-live="polite"
                        >
                          {statusLabel(s.status)}
                        </span>
                      </div>
                      <p>{detail}</p>
                      {!terminal(s.status) && <TaskTimer task={s} />}
                      {s.refunded && (
                        <span className="task-wait-note">
                          {usd(s.costCents)} returned to your credit.
                        </span>
                      )}
                      <div className="task-actions">
                        {s.outputs[0] && (
                          <a href={`${s.outputs[0].url}?download=1`} download>
                            Download video
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="gallery-empty">
              <strong>Your videos will appear here.</strong>
              <span>
                Describe a video to generate, or swap a character into your own
                clip. <Link href="/#examples">See examples</Link>
              </span>
            </div>
          )}
        </section>
      </main>
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          pickImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {trimming && (
        <TrimDialog
          file={trimming.file}
          duration={trimming.duration}
          minimum={MIN_SECONDS}
          maximum={MAX_SECONDS}
          maxBytes={1024 * 1024 * 1024}
          onDone={(file) => void takeClip(file)}
        />
      )}
      <input
        ref={videoInput}
        type="file"
        accept="video/mp4,video/quicktime"
        hidden
        onChange={(e) => {
          void pickVideo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
