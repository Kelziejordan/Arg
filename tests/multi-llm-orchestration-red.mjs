import assert from 'node:assert/strict';
import { createOrchestrator } from '../src/orchestration/orchestrator.js';
import { MockAdapter } from '../src/orchestration/mock-adapter.js';

const orchestrator = createOrchestrator({
  models: [1, 2, 3, 4].map((n) => new MockAdapter({
    id: `llm-${n}`,
    modelId: `model-${n}`,
    output: `answer-${n}`,
  })),
  concurrency: 4,
  timeoutMs: 500,
});

const task = {
  id: 'fixture-task-1',
  prompt: 'Evaluate this architecture independently.',
};

const result = await orchestrator.evaluate(task);

assert.equal(result.modelCount, 4);
assert.equal(result.independent, true);
assert.equal(result.userInterfaceSlot, 5);
assert.equal(result.peerVisibility, false);
assert.equal(result.consensusRequired, false);
assert.equal(result.outputs.length, 4);
assert.deepEqual(result.outputs.map((output) => output.providerId), [
  'llm-1',
  'llm-2',
  'llm-3',
  'llm-4',
]);
assert.deepEqual(result.outputs.map((output) => output.output), [
  'answer-1',
  'answer-2',
  'answer-3',
  'answer-4',
]);

console.log('[GREEN] executable four-LLM independent orchestration contract satisfied');
