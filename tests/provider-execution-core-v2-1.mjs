import assert from 'node:assert/strict';
import { createExecutionCore } from '../src/orchestration/execution-core.js';
import { MockAdapter } from '../src/orchestration/mock-adapter.js';

const task = { id: 'v2-1-fixture', prompt: 'Evaluate independently.' };

// Baseline: four independent providers execute without peer visibility or consensus.
const providers = [1, 2, 3, 4].map((n) => new MockAdapter({
  id: `mock-${n}`,
  modelId: `model-${n}`,
  latencyMs: 5,
  output: `answer-${n}`,
}));

const core = createExecutionCore({
  providers,
  concurrency: 4,
  timeoutMs: 500,
});

const result = await core.execute(task);
assert.equal(result.taskId, task.id);
assert.equal(result.results.length, 4);
assert.equal(result.summary.requested, 4);
assert.equal(result.summary.succeeded, 4);
assert.equal(result.summary.failed, 0);
assert.equal(result.independent, true);
assert.equal(result.peerVisibility, false);
assert.equal(result.consensusRequired, false);
assert.equal(result.userInterfaceSlot, 5);
assert.equal(new Set(result.results.map((r) => r.requestId)).size, 4);
assert.deepEqual(result.results.map((r) => r.output), [
  'answer-1',
  'answer-2',
  'answer-3',
  'answer-4',
]);

// Deterministic request IDs must remain stable for the same task/provider/slot.
const repeat = await core.execute(task);
assert.deepEqual(
  repeat.results.map((r) => r.requestId),
  result.results.map((r) => r.requestId),
);

// Partial failure must not collapse the whole execution.
const partial = createExecutionCore({
  providers: [
    new MockAdapter({ id: 'ok', output: 'ok' }),
    new MockAdapter({
      id: 'fail',
      failure: { code: 'PROVIDER_ERROR', message: 'simulated failure', retryable: false },
    }),
  ],
  timeoutMs: 500,
});
const partialResult = await partial.execute({ id: 'partial-fixture' });
assert.equal(partialResult.summary.succeeded, 1);
assert.equal(partialResult.summary.failed, 1);
assert.equal(partialResult.results[1].status, 'error');

// Retryable failures must be retried without changing the provider boundary.
const retrying = new MockAdapter({
  id: 'retry',
  failureSequence: [
    { code: 'RATE_LIMITED', message: 'try again', retryable: true },
  ],
  output: 'eventual-success',
});
const retryCore = createExecutionCore({
  providers: [retrying],
  timeoutMs: 500,
  retries: 1,
  retryDelayMs: 1,
});
const retryResult = await retryCore.execute({ id: 'retry-fixture' });
assert.equal(retryResult.results[0].status, 'success');
assert.equal(retrying.calls.length, 2);

// Timeout is isolated to the provider result.
const slow = createExecutionCore({
  providers: [new MockAdapter({ id: 'slow', latencyMs: 100 })],
  timeoutMs: 10,
});
const timeoutResult = await slow.execute({ id: 'timeout-fixture' });
assert.equal(timeoutResult.results[0].status, 'timeout');
assert.equal(timeoutResult.results[0].error.code, 'TIMEOUT');

// External cancellation must produce a cancellation result rather than throw.
const controller = new AbortController();
const cancellable = createExecutionCore({
  providers: [new MockAdapter({ id: 'cancel', latencyMs: 100 })],
  timeoutMs: 500,
});
const cancelledPromise = cancellable.execute({ id: 'cancel-fixture' }, { signal: controller.signal });
setTimeout(() => controller.abort(), 5);
const cancelled = await cancelledPromise;
assert.equal(cancelled.results[0].status, 'cancelled');

console.log('[GREEN] V2.1 provider execution core contract satisfied');
