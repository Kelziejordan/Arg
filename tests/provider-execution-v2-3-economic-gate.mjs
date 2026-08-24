import assert from 'node:assert/strict';
import { createEconomicGate } from '../src/orchestration/economic-gate.js';

function expectBlocked(policy, expectedCode) {
  const gate = createEconomicGate(policy);
  assert.throws(
    () => gate.authorize({ estimatedCostUsd: policy.estimatedCostUsd }),
    (error) => error?.code === expectedCode,
  );
}

expectBlocked(
  { maxSpendUsd: 0, estimatedCostUsd: 0.001 },
  'UNAUTHORIZED_SPEND',
);

expectBlocked(
  { maxSpendUsd: 0, estimatedCostUsd: undefined },
  'UNKNOWN_COST',
);

const freeGate = createEconomicGate({ maxSpendUsd: 0 });
assert.equal(
  freeGate.authorize({ estimatedCostUsd: 0 }).authorized,
  true,
);

console.log('[RED] V2.3 economic preflight contract requires implementation');
