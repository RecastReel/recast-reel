import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shownPercent, taskDisplay } from '../lib/task-status';
import { publicSwap } from '../lib/swap-api';
import type { Swap } from '../lib/swap-client';
import type { swaps } from '../lib/db/schema';

test('queued task that has started processing never says waiting to start', () => {
 const task: Pick<Swap, 'status' | 'processingState' | 'progress'> = {
  status: 'queued', processingState: 'processing', progress: { stage: 'creating', percent: 42, message: 'Creating your video…' },
 };
 const display = taskDisplay(task);
 assert.equal(display.label, 'Creating video');
 assert.equal(display.waiting, false);
 assert.equal(display.detail, 'Creating your video…');
 assert.equal(task.status, 'queued');
 assert.equal(taskDisplay({ status: 'queued', processingState: 'processing', progress: { stage: 'queued' } }).label, 'Processing');
});
test('GPU waits after processing starts are distinct from initial queueing', () => {
 const display = taskDisplay({ status: 'queued', processingState: 'waiting_for_gpu', queue: { state: 'parked', position: 2 }, progress: { stage: 'creating' } });
 assert.equal(display.label, 'Waiting for GPU');
 assert.equal(display.waitingLabel, 'Waiting for GPU capacity · #2 in line');
 assert.match(display.detail, /Processing has started/);
 assert.equal(display.waiting, true);
});
test('initial waiting tasks remain queued and missing positions are omitted', () => {
 const display = taskDisplay({ status: 'queued', processingState: 'waiting_to_start', queue: { state: 'waiting' } });
 assert.equal(display.label, 'Queued');
 assert.equal(display.waitingLabel, 'Waiting to start');
 assert.equal(display.waiting, true);
 assert.equal(taskDisplay({ status: 'queued' }).label, 'Queued');
});
test('documented progress stages also work without processing_state', () => {
 for (const stage of ['preparing', 'creating', 'finishing']) {
  assert.equal(taskDisplay({ status: 'running', progress: { stage } }).phase, stage);
  assert.equal(taskDisplay({ status: 'queued', progress: { stage } }).waiting, false);
 }
});
test('final and billing states override stale queue and progress fields', () => {
 for (const status of ['succeeded', 'failed', 'needs_input', 'cancelled', 'expired', 'billing_pending']) {
  const display = taskDisplay({ status, processingState: 'waiting_for_gpu', progress: { stage: 'creating' } });
  assert.equal(display.phase, status);
  assert.equal(display.waiting, false);
 }
 assert.equal(taskDisplay({ status: 'billing_pending' }).label, 'Finalizing');
});
test('public API forwards processing_state without rewriting lifecycle status', () => {
 const row: typeof swaps.$inferSelect = {
  id: 'test-task', kind: 'swap', userId: 'user', taskId: 'upstream-task', cueKeyId: null,
  idempotencyKey: 'test-key', prompt: 'Swap the person', seconds: 40, costCents: 1,
  status: 'queued', refunded: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  task: { processing_state: 'processing', progress: { stage: 'creating' } },
 };
 const result = publicSwap(row);
 assert.equal(result.processingState, 'processing');
 assert.equal(result.status, 'queued');
 assert.equal(taskDisplay(result as Swap).label, 'Creating video');
});
test('shown progress keeps moving between reported steps without finishing early', () => {
 const at = (reportedFor: number, elapsed: number, reported?: number) => shownPercent({ reported, reportedFor, elapsed, expected: 2100 });
 assert.ok(at(30, 30, 40) > 40, 'creeps past a stalled report');
 assert.ok(at(1e6, 0, 40) <= 45, 'creep alone stays within 5 points');
 assert.ok(at(10, 10) < at(20, 20), 'moves with time when nothing is reported');
 assert.ok(at(1e6, 1e6, 50) < 99.01, 'never claims to be done');
 assert.equal(at(0, 0, 100), 100, 'a finished report is shown as is');
});
