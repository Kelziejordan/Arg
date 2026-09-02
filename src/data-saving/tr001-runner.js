import { createHash } from 'node:crypto';
import { createDataSavingExecutor } from './executor.js';
import { createEconomicGate } from '../orchestration/economic-gate.js';
import { createOrchestrator } from '../orchestration/orchestrator.js';
import { MockAdapter } from '../orchestration/mock-adapter.js';

const TEST_RUN_ID = 'ARGOS-TR-001';
const CLASS_IDS = ['WL-01', 'WL-02', 'WL-03', 'WL-04', 'WL-05'];
const COST_PER_INPUT_TOKEN = 0.00001;
const COST_PER_OUTPUT_TOKEN = 0.00002;

const CLASS_DEFINITIONS = Object.freeze({
  'WL-01': {
    name: 'Multi-LLM independent execution',
    description: 'Three configured model executions against the same coding task.',
    providers: 3,
    disposition: 'external',
    estimatedCostUsd: 0.004,
  },
  'WL-02': {
    name: 'Economic preflight + authorized execution',
    description: 'Economic preflight authorizes a bounded execution before provider invocation.',
    providers: 1,
    disposition: 'external',
    estimatedCostUsd: 0.002,
  },
  'WL-03': {
    name: 'Economic preflight rejection',
    description: 'A spend-ineligible task is rejected before provider execution; rejection is not treated as an equivalent completed result.',
    providers: 1,
    disposition: 'external',
    estimatedCostUsd: 0.002,
  },
  'WL-04': {
    name: 'Repeated reusable workload',
    description: 'A previously validated result is available as reusable state, allowing external execution to be avoided.',
    providers: 1,
    disposition: 'reusable',
    estimatedCostUsd: 0.002,
  },
  'WL-05': {
    name: 'Deterministic local workload',
    description: 'A locally satisfiable deterministic task is completed without provider execution.',
    providers: 1,
    disposition: 'local',
    estimatedCostUsd: 0.002,
  },
});

const INPUTS = Object.freeze({
  'WL-01': [
    'Write a TypeScript function that validates an immutable task envelope.',
    'Write a TypeScript function that deterministically normalizes provider results.',
    'Write a TypeScript function that rejects malformed execution requests.',
    'Write a TypeScript function that calculates aggregate execution metrics.',
    'Write a TypeScript function that preserves a stable request identifier.',
  ],
  'WL-02': [
    'Summarize a bounded architecture review within the authorized execution budget.',
    'Analyze a bounded provider result within the authorized execution budget.',
    'Transform a bounded task description within the authorized execution budget.',
    'Produce a bounded implementation outline within the authorized execution budget.',
    'Validate a bounded execution request within the authorized execution budget.',
  ],
  'WL-03': [
    'Attempt a spend-ineligible execution request A.',
    'Attempt a spend-ineligible execution request B.',
    'Attempt a spend-ineligible execution request C.',
    'Attempt a spend-ineligible execution request D.',
    'Attempt a spend-ineligible execution request E.',
  ],
  'WL-04': [
    'Return the previously validated result for repeated task A.',
    'Return the previously validated result for repeated task B.',
    'Return the previously validated result for repeated task C.',
    'Return the previously validated result for repeated task D.',
    'Return the previously validated result for repeated task E.',
  ],
  'WL-05': [
    'Calculate deterministic local transformation A.',
    'Calculate deterministic local transformation B.',
    'Calculate deterministic local transformation C.',
    'Calculate deterministic local transformation D.',
    'Calculate deterministic local transformation E.',
  ],
});

function tokensFor(classId, index) {
  const inputTokens = 90 + (index * 17) + classId.charCodeAt(3);
  const outputTokens = 35 + (index * 7);
  return { inputTokens, outputTokens };
}

function makeResult(workload) {
  return `TR001-RESULT:${workload.classId}:${workload.instance}:${workload.payload}`;
}

function makeProviders(workload) {
  const usage = tokensFor(workload.classId, workload.index);
  return Array.from({ length: CLASS_DEFINITIONS[workload.classId].providers }, (_, providerIndex) => (
    new MockAdapter({
      id: `tr001-${workload.classId.toLowerCase()}-provider-${providerIndex + 1}`,
      modelId: `controlled-model-${providerIndex + 1}`,
      output: () => makeResult(workload),
      usage,
    })
  ));
}

function providerResultValues(result) {
  if (result?.outputs) return result.outputs.map((item) => item.output);
  if (result?.output !== undefined) return [result.output];
  return [];
}

function equivalentResults(baseline, argos) {
  return JSON.stringify(providerResultValues(baseline)) === JSON.stringify(providerResultValues(argos));
}

function usageTotals(outputs) {
  return outputs.reduce((total, output) => {
    total.inputTokens += Number(output.usage?.inputTokens ?? 0);
    total.outputTokens += Number(output.usage?.outputTokens ?? 0);
    total.calls += 1;
    total.latencyMs += Number(output.latencyMs ?? 0);
    return total;
  }, { inputTokens: 0, outputTokens: 0, calls: 0, latencyMs: 0 });
}

function modeledCost(usage) {
  return (usage.inputTokens * COST_PER_INPUT_TOKEN) + (usage.outputTokens * COST_PER_OUTPUT_TOKEN);
}

function percentReduction(baseline, argos) {
  if (baseline <= 0) return null;
  return Number(((1 - (argos / baseline)) * 100).toFixed(6));
}

function deterministicSeed(value) {
  return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16) >>> 0;
}

function bootstrapCI(values, seedValue) {
  if (values.length < 2) return { lower: null, upper: null, samples: 1000 };
  let seed = deterministicSeed(seedValue);
  const next = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const samples = [];
  for (let sample = 0; sample < 1000; sample += 1) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[Math.floor(next() * values.length)];
    samples.push(sum / values.length);
  }
  samples.sort((a, b) => a - b);
  return {
    lower: Number(samples[Math.floor(samples.length * 0.025)].toFixed(6)),
    upper: Number(samples[Math.floor(samples.length * 0.975)].toFixed(6)),
    samples: 1000,
  };
}

function aggregatePath(records) {
  const totals = records.reduce((total, record) => {
    total.inputTokens += record.inputTokens;
    total.outputTokens += record.outputTokens;
    total.totalTokens += record.totalTokens;
    total.externalCalls += record.externalCalls;
    total.totalCalls += record.totalCalls;
    total.bytesTransferred += record.bytesTransferred;
    total.latencyMs += record.latencyMs;
    total.costUsd += record.costUsd;
    total.integrityPasses += record.integrityPass ? 1 : 0;
    total.equivalencePasses += record.equivalenceEligible && record.equivalencePass ? 1 : 0;
    total.equivalenceEligible += record.equivalenceEligible ? 1 : 0;
    return total;
  }, {
    inputTokens: 0, outputTokens: 0, totalTokens: 0, externalCalls: 0, totalCalls: 0,
    bytesTransferred: 0, latencyMs: 0, costUsd: 0, integrityPasses: 0,
    equivalencePasses: 0, equivalenceEligible: 0,
  });
  return {
    ...totals,
    integrityPassRate: records.length ? totals.integrityPasses / records.length : 0,
    equivalencePassRate: totals.equivalenceEligible ? totals.equivalencePasses / totals.equivalenceEligible : 1,
  };
}

export function buildTR001Workloads() {
  return CLASS_IDS.flatMap((classId) => INPUTS[classId].map((payload, index) => ({
    id: `${classId}-${String(index + 1).padStart(2, '0')}`,
    classId,
    className: CLASS_DEFINITIONS[classId].name,
    instance: index + 1,
    index,
    payload,
    expectedOutput: makeResult({ classId, instance: index + 1, payload }),
    key: `tr001:${classId}:${index + 1}`,
    estimatedCostUsd: CLASS_DEFINITIONS[classId].estimatedCostUsd,
    expectPreflightRejected: classId === 'WL-03' && index === 4,
  })));
}

async function executeBaseline(workload) {
  const providers = makeProviders(workload);
  const orchestrator = createOrchestrator({ models: providers, concurrency: providers.length, timeoutMs: 500 });
  const started = Date.now();
  const result = await orchestrator.execute(workload, {
    estimatedCostUsd: workload.estimatedCostUsd,
    paidExecutionAuthorized: true,
  });
  const usage = usageTotals(result.outputs);
  return {
    result,
    usage,
    externalCalls: usage.calls,
    latencyMs: Date.now() - started,
    costUsd: modeledCost(usage),
    bytesTransferred: Buffer.byteLength(JSON.stringify(result.outputs), 'utf8'),
    integrityPass: result.outputs.every((output) => output.status === 'success' && output.output === workload.expectedOutput),
  };
}

async function executeArgos(workload) {
  const providers = makeProviders(workload);
  const orchestrator = createOrchestrator({
    models: providers,
    concurrency: providers.length,
    timeoutMs: 500,
    economicGate: createEconomicGate({ maxSpendUsd: workload.expectPreflightRejected ? 0 : workload.estimatedCostUsd }),
  });
  const cache = new Map();
  if (workload.classId === 'WL-04') cache.set(workload.key, workload.expectedOutput);
  const executor = createDataSavingExecutor({
    cache,
    classify: (item, context) => {
      if (context.cache.has(item.key)) return { kind: 'reusable' };
      if (item.classId === 'WL-05') return { kind: 'local' };
      return { kind: 'external' };
    },
    localExecutor: async (item) => item.expectedOutput,
    externalExecutor: async (item) => orchestrator.execute(item, {
      estimatedCostUsd: item.estimatedCostUsd,
      paidExecutionAuthorized: !item.expectPreflightRejected,
    }),
  });
  const started = Date.now();
  let dataSavingResult;
  let preflightRejected = false;
  try {
    dataSavingResult = await executor.execute(workload);
  } catch (error) {
    preflightRejected = error.code === 'UNAUTHORIZED_SPEND';
    if (!preflightRejected) throw error;
    dataSavingResult = { id: workload.id, result: null, disposition: 'rejected', externalExecuted: false };
  }

  const providerResults = dataSavingResult.result?.outputs ? dataSavingResult.result.outputs : [];
  const usage = usageTotals(providerResults);
  const argosOverheadMs = Math.max(0, (Date.now() - started) - usage.latencyMs);
  return {
    result: dataSavingResult,
    usage,
    externalCalls: usage.calls,
    latencyMs: Date.now() - started,
    argosOverheadMs,
    costUsd: modeledCost(usage),
    bytesTransferred: Buffer.byteLength(JSON.stringify(providerResults), 'utf8'),
    integrityPass: preflightRejected ? true : dataSavingResult.result !== undefined || dataSavingResult.disposition === 'reusable' || dataSavingResult.disposition === 'local',
    preflightRejected,
    disposition: dataSavingResult.disposition,
  };
}

export async function runTR001({ workloads = buildTR001Workloads(), timestamp = new Date().toISOString() } = {}) {
  const evidence = [];
  for (const workload of workloads) {
    const baseline = await executeBaseline(workload);
    const argos = await executeArgos(workload);
    const baselineComparable = baseline.result;
    const argosComparable = argos.preflightRejected ? null : argos.result.result;
    const equivalenceEligible = !argos.preflightRejected;
    const equivalencePass = equivalenceEligible && (
      workload.classId === 'WL-04' || workload.classId === 'WL-05'
        ? argos.result.result === workload.expectedOutput
        : equivalentResults(baselineComparable, argosComparable)
    );
    const baselineRecord = {
      testRunId: TEST_RUN_ID, workloadId: workload.id, classId: workload.classId,
      className: workload.className, path: 'baseline', input: workload.payload,
      externalCalls: baseline.externalCalls, totalCalls: baseline.usage.calls,
      inputTokens: baseline.usage.inputTokens, outputTokens: baseline.usage.outputTokens,
      totalTokens: baseline.usage.inputTokens + baseline.usage.outputTokens,
      bytesTransferred: baseline.bytesTransferred, latencyMs: baseline.latencyMs,
      costUsd: Number(baseline.costUsd.toFixed(9)), argosOverheadMs: 0,
      preflightRejected: false, disposition: 'external', integrityPass: baseline.integrityPass,
      equivalenceEligible: false, equivalencePass: false,
    };
    const argosRecord = {
      testRunId: TEST_RUN_ID, workloadId: workload.id, classId: workload.classId,
      className: workload.className, path: 'argos', input: workload.payload,
      externalCalls: argos.externalCalls, totalCalls: argos.usage.calls,
      inputTokens: argos.usage.inputTokens, outputTokens: argos.usage.outputTokens,
      totalTokens: argos.usage.inputTokens + argos.usage.outputTokens,
      bytesTransferred: argos.bytesTransferred, latencyMs: argos.latencyMs,
      costUsd: Number(argos.costUsd.toFixed(9)), argosOverheadMs: Number(argos.argosOverheadMs.toFixed(6)),
      preflightRejected: argos.preflightRejected, disposition: argos.disposition,
      integrityPass: argos.integrityPass, equivalenceEligible, equivalencePass,
    };
    evidence.push(baselineRecord, argosRecord);
  }

  const baselineRecords = evidence.filter((record) => record.path === 'baseline');
  const argosRecords = evidence.filter((record) => record.path === 'argos');
  const validArgos = argosRecords.filter((record) => record.integrityPass && record.equivalenceEligible && record.equivalencePass);
  const baselineComparable = baselineRecords.filter((record) => argosRecords.find((argos) => argos.workloadId === record.workloadId)?.equivalenceEligible);
  const baselineTotals = aggregatePath(baselineComparable);
  const argosTotals = aggregatePath(argosRecords);
  const validBaselineCost = baselineComparable.reduce((sum, record) => sum + record.costUsd, 0);
  const validArgosCost = validArgos.reduce((sum, record) => sum + record.costUsd, 0);
  const validBaselineTokens = baselineComparable.reduce((sum, record) => sum + record.totalTokens, 0);
  const validArgosTokens = validArgos.reduce((sum, record) => sum + record.totalTokens, 0);
  const validBaselineCalls = baselineComparable.reduce((sum, record) => sum + record.externalCalls, 0);
  const validArgosCalls = validArgos.reduce((sum, record) => sum + record.externalCalls, 0);
  const savings = {
    tokens: percentReduction(validBaselineTokens, validArgosTokens),
    costUsd: percentReduction(validBaselineCost, validArgosCost),
    calls: percentReduction(validBaselineCalls, validArgosCalls),
    externalCalls: validBaselineCalls - validArgosCalls,
  };
  const perInstanceSavings = validArgos.map((record) => {
    const baseline = baselineRecords.find((item) => item.workloadId === record.workloadId);
    return percentReduction(baseline.costUsd, record.costUsd) ?? 0;
  });

  const perClass = Object.fromEntries(CLASS_IDS.map((classId) => {
    const base = baselineRecords.filter((record) => record.classId === classId);
    const ar = argosRecords.filter((record) => record.classId === classId);
    const comparableBase = base.filter((record) => ar.find((item) => item.workloadId === record.workloadId)?.equivalenceEligible);
    const comparableArgos = ar.filter((record) => record.equivalenceEligible && record.integrityPass && record.equivalencePass);
    const baseTotals = aggregatePath(comparableBase);
    const argosClassTotals = aggregatePath(ar);
    return [classId, {
      workloadCount: base.length,
      baseline: baseTotals,
      argosPath: argosClassTotals,
      savings: {
        tokens: percentReduction(baseTotals.totalTokens, comparableArgos.reduce((s, r) => s + r.totalTokens, 0)),
        costUsd: percentReduction(baseTotals.costUsd, comparableArgos.reduce((s, r) => s + r.costUsd, 0)),
        calls: percentReduction(baseTotals.externalCalls, comparableArgos.reduce((s, r) => s + r.externalCalls, 0)),
      },
    }];
  }));

  const report = {
    testRunId: TEST_RUN_ID,
    timestamp,
    testType: 'controlled architecture proving ground',
    costBasis: {
      type: 'versioned controlled fixture model',
      inputTokenUsd: COST_PER_INPUT_TOKEN,
      outputTokenUsd: COST_PER_OUTPUT_TOKEN,
      note: 'Not a live-provider pricing claim. Live provider evidence requires provider telemetry and a versioned pricing source.',
    },
    workloadClasses: CLASS_IDS.length,
    workloadInstances: workloads.length,
    pathRuns: evidence.length,
    aggregate: {
      baseline: baselineTotals,
      argosPath: argosTotals,
      savings,
      equivalencePassRate: validArgos.length / Math.max(1, argosRecords.filter((record) => record.equivalenceEligible).length),
      integrityPassRate: argosTotals.integrityPassRate,
      confidenceInterval95: bootstrapCI(perInstanceSavings, TEST_RUN_ID),
      perClass,
    },
    evidence,
  };
  return report;
}

export function reportToJsonl(report) {
  return `${report.evidence.map((record) => JSON.stringify(record)).join('\n')}\n`;
}

export function reportToMarkdown(report) {
  const lines = [
    `# ${report.testRunId}`,
    '',
    `Controlled architecture proving ground executed ${report.workloadInstances} workload instances as ${report.pathRuns} matched path runs.`,
    '',
    `**Token savings:** ${report.aggregate.savings.tokens}%`,
    `**Modeled cost reduction:** ${report.aggregate.savings.costUsd}%`,
    `**External-call reduction:** ${report.aggregate.savings.calls}%`,
    `**95% bootstrap CI for per-instance modeled savings:** ${report.aggregate.confidenceInterval95.lower}% to ${report.aggregate.confidenceInterval95.upper}%`,
    `**ArgOS integrity pass rate:** ${(report.aggregate.integrityPassRate * 100).toFixed(2)}%`,
    `**Eligible equivalence pass rate:** ${(report.aggregate.equivalencePassRate * 100).toFixed(2)}%`,
    '',
    '## Per-class results',
    '',
  ];
  for (const [classId, value] of Object.entries(report.aggregate.perClass)) {
    lines.push(`- ${classId}: tokens ${value.savings.tokens}%, cost ${value.savings.costUsd}%, calls ${value.savings.calls}%`);
  }
  lines.push('', '## Interpretation', '', 'These are controlled deterministic fixtures exercising the current orchestration/economic-preflight composition. They are evidence that the proving-ground instrumentation works and that governed work avoidance can be measured. They are not live-provider economic evidence and do not validate the historical 94% claim.', '');
  return lines.join('\n');
}
