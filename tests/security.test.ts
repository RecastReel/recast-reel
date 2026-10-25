import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaToken, verifyMedia, HttpError } from "../lib/cue";
import { buildRequest } from "../lib/swap-api";
import { readJsonBody } from "../lib/request-body";

const user = "security-regression";
const image = "https://www.madebycue.dev/api/media/image";
const video = "https://www.madebycue.dev/api/media/video";
function request(seconds = 60) {
  return {
    kind: "swap", prompt: "Swap the man in blue",
    character: { url: image, token: mediaToken(user, image, 0, "image") },
    video: { url: video, seconds, token: mediaToken(user, video, seconds, "video") },
  };
}

test("valid media produces the measured duration for pricing", () => {
  const built = buildRequest(user, request());
  assert.equal(built.seconds, 60);
  assert.equal(built.kind, "swap");
  if (built.kind === "swap") assert.equal(built.estimate.source_duration_seconds, 60);
});
test("an image signature cannot be reused as a zero-second video", () => {
  const input = request();
  input.video = { url: image, seconds: 0, token: input.character.token };
  assert.throws(() => buildRequest(user, input), /source video again/);
});
test("video signatures cannot be reused for reference images", () => {
  const input = request();
  input.character = { url: video, token: input.video.token };
  assert.throws(() => buildRequest(user, input), /character image again/);
  assert.throws(() => buildRequest(user, { kind: "generate", prompt: "Generate a scene", seconds: 5, references: [input.character] }), /reference images again/);
});
test("signed video durations must still satisfy server limits", () => {
  for (const seconds of [0, -1, 39, 601, 60.5, Infinity, NaN])
    assert.throws(() => buildRequest(user, request(seconds)), /40 seconds and 10 minutes/);
  for (const seconds of [40, 600]) assert.equal(buildRequest(user, request(seconds)).seconds, seconds);
});
test("signatures are bound to the owner, duration, and upload MIME", () => {
  const token = mediaToken(user, video, 60, "video");
  assert.equal(verifyMedia("another-user", video, 60, token, "video"), false);
  assert.equal(verifyMedia(user, video, 40, token, "video"), false);
  const upload = mediaToken(user, "key", 0, "upload:video/mp4");
  assert.equal(verifyMedia(user, "key", 0, upload, "upload:image/png"), false);
  assert.equal(verifyMedia(user, "key", 0, upload, "video"), false);
});
const is413 = (error: unknown) => error instanceof HttpError && error.status === 413;
test("body size rejects declared oversize before reading", async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const req = new Request("http://localhost", { method: "POST", body, duplex: "half", headers: { "content-length": "1000" } } as RequestInit);
  await assert.rejects(readJsonBody(req, 32), is413);
  assert.equal(cancelled, true);
});
test("body size rejects chunked requests and cancels at the limit", async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(16)); }, cancel() { cancelled = true; } });
  const req = new Request("http://localhost", { method: "POST", body, duplex: "half", headers: { "content-length": "1" } } as RequestInit);
  await assert.rejects(readJsonBody(req, 32), is413);
  assert.equal(cancelled, true);
});
test("JSON objects at the byte limit are accepted, invalid shapes rejected", async () => {
  const raw = JSON.stringify({ prompt: "é" });
  assert.deepEqual(await readJsonBody(new Request("http://localhost", { method: "POST", body: raw }), Buffer.byteLength(raw)), { prompt: "é" });
  for (const raw of ["null", "[]", '"text"', "{"])
    await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST", body: raw })), /Invalid request body/);
});
