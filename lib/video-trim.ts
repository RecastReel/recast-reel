/** Move a selection without shortening it at the end of the source. */
export function moveTrim(start: number, length: number, duration: number) {
  const boundedLength = Math.min(length, duration);
  const boundedStart = Math.max(0, Math.min(start, duration - boundedLength));
  return { start: boundedStart, end: boundedStart + boundedLength };
}

/** Keep draggable edges within the source and the allowed clip length. */
export function resizeTrim(
  start: number,
  end: number,
  edge: "start" | "end",
  value: number,
  duration: number,
  minimum: number,
  maximum: number,
) {
  const minLength = minimum || 0.1;
  if (edge === "start")
    return {
      start: Math.max(0, end - maximum, Math.min(value, end - minLength)),
      end,
    };
  return {
    start,
    end: Math.min(
      duration,
      start + maximum,
      Math.max(value, start + minLength),
    ),
  };
}

export function validTrim(
  start: number,
  end: number,
  duration: number,
  maximum: number,
) {
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end <= duration &&
    end > start &&
    end - start <= maximum + 1e-6
  );
}

export async function videoDuration(file: File) {
  const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    if (!(await input.getPrimaryVideoTrack()))
      throw new Error("This file has no video track.");
    const duration = await input.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("Could not read this video's duration.");
    return duration;
  } finally {
    input.dispose();
  }
}

export async function trimVideo(
  file: File,
  start: number,
  end: number,
  onProgress: (value: number) => void,
) {
  const {
    Input,
    BlobSource,
    ALL_FORMATS,
    Output,
    BufferTarget,
    Mp4OutputFormat,
    Conversion,
  } = await import("mediabunny");
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      trim: { start, end },
      tracks: "primary",
    });
    if (!conversion.isValid || conversion.discardedTracks.length)
      throw new Error(
        "This browser cannot trim this video's format while preserving its audio. Try Chrome or trim the clip in a video editor first.",
      );
    conversion.onProgress = onProgress;
    await conversion.execute();
    if (!output.target.buffer)
      throw new Error("The trimmed video could not be exported.");
    return new File(
      [output.target.buffer],
      `${file.name.replace(/\.[^.]+$/, "")}-trimmed.mp4`,
      { type: "video/mp4" },
    );
  } finally {
    input.dispose();
  }
}

/** Probe the encoded file before handing it to upload. Audio packets and
 * container timestamps can extend beyond an otherwise valid trim boundary. */
export async function trimVideoToLimit(
  file: File,
  start: number,
  end: number,
  maximum: number,
  onProgress: (value: number) => void,
) {
  if (!validTrim(start, end, end, maximum))
    throw new Error("Choose a valid trim range before exporting.");
  let exportEnd = end;
  for (let attempt = 0; attempt < 3; attempt++) {
    onProgress(0);
    const clip = await trimVideo(file, start, exportEnd, onProgress);
    const duration = await videoDuration(clip);
    if (duration <= maximum + 1e-6) return clip;
    const overrun = duration - maximum;
    // Correct only small encoder/container rounding, never a substantially
    // incorrect export. Re-export from the original to avoid quality loss.
    if (overrun > 1) break;
    exportEnd -= overrun + 0.05;
    if (exportEnd <= start) break;
  }
  throw new Error(
    "This browser could not export the clip within the duration limit. Your selection has been kept; try another video format or browser.",
  );
}
