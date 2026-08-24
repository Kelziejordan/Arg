import assert from 'node:assert/strict';
import { createEconomicGate } from '../src/orchestration/economic-gate.js';

const gate = createEconomicGate({
  maxAuthorizedCostUsd: 0,
  requireExplicitAuthorization: true,
});

const blocked = gate.preflight({
  providerId: 'openai-live',
  modelId: 'test-model',
  estimatedCostUsd: 0.001,
  explicitlyAuthorized: false,
});

assert.equal(blocked.allowed, false);
assert.equal(blocked.code, 'UNAUTHORIZED_SPEND');
assert.equal(blocked.maxAuthorizedCostUsd, 0);

const freeAuthorized = gate.preflight({
  providerId: 'openai-live',
  modelId: 'test-model',
  estimatedCostUsd: 0,
  explicitlyAuthorized: true,
});

assert.equal(freeAuthorized.allowed, true);
assert.equal(freeAuthorized.authorization, 'explicit');

const unknownCost = gate.preflight({
  providerId: 'openai-live',
  modelId: 'test-model',
  estimatedCostUsd: null,
  explicitlyAuthorized: true,
});

assert.equal(unknownCost.allowed, false);
assert.equal(unknownCost.code, 'COST_UNKNOWN');

console.log('[GREEN] V2.3 economic preflight contract satisfied');
