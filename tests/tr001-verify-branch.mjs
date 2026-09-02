import assert from 'node:assert/strict';
import { buildTR001Workloads, runTR001 } from '../src/data-saving/tr001-runner.js';

const workloads = buildTR001Workloads();
assert.equal(workloads.length, 25);
const report = await runTR001({ workloads, timestamp: '2026-09-02T12:00:00.000Z' });
assert.equal(report.pathRuns, 50);
assert.equal(report.aggregate.argosPath.integrityPassRate, 1);
assert.equal(report.aggregate.equivalencePassRate, 1);
const rejected = report.evidence.find((r) => r.workloadId === 'WL-03-05' && r.path === 'argos');
assert.equal(rejected.preflightRejected, true);
assert.equal(rejected.externalCalls, 0);
assert.equal(rejected.equivalenceEligible, false);
console.log(JSON.stringify({
  testRunId: report.testRunId,
  workloadInstances: report.workloadInstances,
  pathRuns: report.pathRuns,
  tokenSavingsPct: report.aggregate.savings.tokens,
  modeledCostReductionPct: report.aggregate.savings.costUsd,
  externalCallsAvoided: report.aggregate.savings.externalCalls,
  integrityPassRate: report.aggregate.integrityPassRate,
  equivalencePassRate: report.aggregate.equivalencePassRate,
}, null, 2));
