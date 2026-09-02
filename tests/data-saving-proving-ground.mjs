import assert from 'node:assert/strict';
import { createDataSavingExecutor } from '../src/data-saving/executor.js';
import { createProvingGround } from '../src/data-saving/proving-ground.js';

const externalCalls = [];
const externalExecutor = async (workload) => {
  externalCalls.push(workload.id);
  return { result: `external:${workload.payload}` };
};

const executor = createDataSavingExecutor({
  externalExecutor,
  cache: new Map([['repeat-1', 'cached-result']]),
  localExecutor: (workload) => `local:${workload.payload}`,
  classify: (workload, context) => {
    if (context.cache.has(workload.key)) return { kind: 'reusable' };
    if (workload.local === true) return { kind: 'local' };
    return { kind: 'external' };
  },
});

const reused = await executor.execute({ id: 'w1', key: 'repeat-1', payload: 'x' });
assert.deepEqual(reused, {
  id: 'w1',
  result: 'cached-result',
  disposition: 'reusable',
  externalExecuted: false,
});

const local = await executor.execute({ id: 'w2', key: 'local-1', payload: 'math', local: true });
assert.deepEqual(local, {
  id: 'w2',
  result: 'local:math',
  disposition: 'local',
  externalExecuted: false,
});

const external = await executor.execute({ id: 'w3', key: 'novel-1', payload: 'novel' });
assert.deepEqual(external, {
  id: 'w3',
  result: 'external:novel',
  disposition: 'external',
  externalExecuted: true,
});
assert.deepEqual(externalCalls, ['w3']);

const provingGround = createProvingGround({
  baselineExecutor: async (workload) => ({ result: `baseline:${workload.payload}` }),
  argosExecutor: async (workload) => ({ result: `argos:${workload.payload}` }),
  equivalent: (baseline, argos) => baseline.result.replace('baseline:', '') === argos.result.replace('argos:', ''),
  cost: {
    baseline: () => 10,
    argos: () => 4,
  },
});

const measurement = await provingGround.measure({ id: 'w4', payload: 'same' });
assert.equal(measurement.integrityPass, true);
assert.equal(measurement.baselineTotalCost, 10);
assert.equal(measurement.argosTotalCost, 4);
assert.equal(measurement.savingsPercent, 60);

console.log('DATA-SAVING PROVING GROUND: PASS');
console.log(JSON.stringify({
  externalExecutionsAvoided: 2,
  measuredSavingsPercent: measurement.savingsPercent,
  integrityPass: measurement.integrityPass,
}, null, 2));
