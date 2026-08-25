import assert from 'node:assert/strict';
import { createExecutionCore } from '../src/orchestration/execution-core.js';
import { createEconomicGate } from '../src/orchestration/economic-gate.js';
import { MockAdapter } from '../src/orchestration/mock-adapter.js';

const blockedProvider = new MockAdapter({ id: 'blocked', output: 'must-not-run' });
const blockedCore = createExecutionCore({
  providers: [blockedProvider],
  economicGate: createEconomicGate({ maxSpendUsd: 0 }),
});

await assert.rejects(
  () => blockedCore.execute({ id: 'economic-block-fixture' }),
  (error) => error?.code === 'UNKNOWN_COST',
);
assert.equal(blockedProvider.calls.length, 0);

const freeProvider = new MockAdapter({ id: 'free', output: 'free-execution' });
const freeCore = createExecutionCore({
  providers: [freeProvider],
  economicGate: createEconomicGate({ maxSpendUsd: 0 }),
});

const allowed = await freeCore.execute(
  { id: 'economic-allow-fixture' },
  { estimatedCostUsd: 0, freeQuotaVerified: true },
);

assert.equal(allowed.summary.succeeded, 1);
assert.equal(freeProvider.calls.length, 1);
assert.equal(allowed.results[0].output, 'free-execution');

const paidProvider = new MockAdapter({ id: 'paid', output: 'paid-execution' });
const paidCore = createExecutionCore({
  providers: [paidProvider],
  economicGate: createEconomicGate({ maxSpendUsd: 0 }),
});

await assert.rejects(
  () => paidCore.execute(
    { id: 'economic-paid-fixture' },
    { estimatedCostUsd: 0.001 },
  ),
  (error) => error?.code === 'UNAUTHORIZED_SPEND',
);
assert.equal(paidProvider.calls.length, 0);

const authorizedPaid = await paidCore.execute(
  { id: 'economic-paid-authorized-fixture' },
  { estimatedCostUsd: 0.001, paidExecutionAuthorized: true },
);
assert.equal(authorizedPaid.summary.succeeded, 1);
assert.equal(paidProvider.calls.length, 1);

console.log('[GREEN] V2.3 economic gate execution boundary satisfied');
