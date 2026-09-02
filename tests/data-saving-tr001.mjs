import assert from 'node:assert/strict';
import { buildTR001Workloads, runTR001 } from '../src/data-saving/tr001-runner.js';

const workloads = buildTR001Workloads();
assert.equal(workloads.length, 25);
assert.deepEqual([...new Set(workloads.map((w) => w.classId))], ['WL-01', 'WL-02', 'WL-03', 'WL-04', 'WL-05']);
assert.equal(workloads.filter((w) => w.classId === 'WL-03' && w.expectPreflightRejected).length, 1);

const report = await runTR001({ workloads, timestamp: '2026-09-02T12:00:00.000Z' });
assert.equal(report.testRunId, 'ARGOS-TR-001');
assert.equal(report.workloadInstances, 25);
assert.equal(report.pathRuns, 50);
assert.equal(report.aggregate.baseline.totalCalls > 0, true);
assert.equal(report.aggregate.argosPath.integrityPassRate, 1);
assert.equal(report.aggregate.argosPath.equivalencePassRate, 1);
assert.equal(report.aggregate.argosPath.externalCalls <= report.aggregate.baseline.totalCalls, true);
assert.equal(report.aggregate.savings.externalCalls >= 0, true);
assert.ok(report.evidence.length === 50);

const rejected = report.evidence.find((r) => r.workloadId === 'WL-03-05' && r.path === 'argos');
assert.equal(rejected.preflightRejected, true);
assert.equal(rejected.externalCalls, 0);

console.log('[GREEN] ARGOS-TR-001 controlled workload harness contract satisfied');
console.log(JSON.stringify({
  workloadInstances: report.workloadInstances,
  pathRuns: report.pathRuns,
  baselineCalls: report.aggregate.baseline.totalCalls,
  argosCalls: report.aggregate.argosPath.totalCalls,
  externalCallsAvoided: report.aggregate.savings.externalCalls,
  integrityPassRate: report.aggregate.argosPath.integrityPassRate,
  equivalencePassRate: report.aggregate.argosPath.equivalencePassRate,
}, null, 2));
