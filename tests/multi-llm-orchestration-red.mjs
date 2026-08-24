import assert from 'node:assert/strict';
import { createOrchestrator } from '../src/orchestration/orchestrator.js';

const orchestrator = createOrchestrator({
  models: [
    { id: 'llm-1' },
    { id: 'llm-2' },
    { id: 'llm-3' },
    { id: 'llm-4' },
  ],
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
assert.deepEqual(result.outputs.map((output) => output.modelId), [
  'llm-1',
  'llm-2',
  'llm-3',
  'llm-4',
]);

console.log('[GREEN] four-LLM independent orchestration contract satisfied');
