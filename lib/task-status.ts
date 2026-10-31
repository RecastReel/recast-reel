import type { Swap } from './swap-client';

type TaskState = Pick<Swap, 'status' | 'processingState' | 'progress' | 'queue' | 'message'>;
const FINAL_LABELS: Record<string, string> = {
 succeeded: 'Complete', failed: 'Failed', needs_input: 'Needs attention',
 cancelled: 'Cancelled', expired: 'Expired',
};
const STAGES: Record<string, string> = {
 preparing: 'Preparing', creating: 'Creating video', finishing: 'Finishing',
};

/** processing_state describes work already started even if status is queued.
 * Keep the provider's lifecycle status intact for billing and polling. */
export function taskDisplay(task: TaskState) {
 let phase = task.status;
 const final = Object.hasOwn(FINAL_LABELS, task.status);
 if (!final && task.status !== 'billing_pending') {
  if (task.processingState === 'waiting_for_gpu') phase = 'waiting_for_gpu';
  else if (task.processingState === 'waiting_to_start') phase = 'queued';
  else if (task.processingState === 'processing')
   phase = Object.hasOwn(STAGES, task.progress?.stage ?? '') ? task.progress!.stage! : 'running';
  else if (Object.hasOwn(STAGES, task.progress?.stage ?? '')) phase = task.progress!.stage!;
 }
 const waiting = phase === 'queued' || phase === 'waiting_for_gpu';
 const position = task.queue?.position;
 const inLine = typeof position === 'number' && Number.isInteger(position) && position > 0 ? ` · #${position} in line` : '';
 const label = FINAL_LABELS[phase] ?? STAGES[phase] ?? ({
  queued: 'Queued', running: 'Processing', waiting_for_gpu: 'Waiting for GPU',
  billing_pending: 'Finalizing',
 } as Record<string, string>)[phase] ?? 'In progress';
 let detail: string;
 if (phase === 'waiting_for_gpu') detail = 'Processing has started and is waiting for GPU capacity.';
 else if (phase === 'queued') detail = 'Your video is in line and will start automatically.';
 else if (phase === 'billing_pending') detail = 'Confirming final usage before your video is released.';
 else if (final) detail = task.message || (phase === 'succeeded' ? 'Your video is ready.' : 'This video could not be completed.');
 else detail = task.progress?.stage === 'queued' ? 'Processing your video.' : task.progress?.message || task.message || 'Processing your video.';
 return { phase, label, detail, waiting, waitingLabel: (phase === 'waiting_for_gpu' ? 'Waiting for GPU capacity' : 'Waiting to start') + inLine };
}
