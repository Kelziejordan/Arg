import assert from 'node:assert/strict';
import { createEconomicGate } from '../src/orchestration/economic-gate.js';

const zeroBudget = createEconomicGate({ maxSpendUsd: 0 });

assert.throws(
  () => zeroBudget.authorize({ estimatedCostUsd: 0.001 }),
  (error) => error?.code === 'UNAUTHORIZED_SPEND',
);

assert.throws(
  () => zeroBudget.authorize({ estimatedCostUsd: undefined }),
  (error) => error?.code === 'UNKNOWN_COST',
);

const freeDecision = zeroBudget.authorize({ estimatedCostUsd: 0 });
assert.equal(freeDecision.authorized, true);
assert.equal(freeDecision.estimatedCostUsd, 0);

console.log('[GREEN] V2.3 economic preflight contract satisfied');
