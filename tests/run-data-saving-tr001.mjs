import { mkdir, writeFile } from 'node:fs/promises';
import { runTR001, reportToJsonl, reportToMarkdown } from '../src/data-saving/tr001-runner.js';

const report = await runTR001();
const directory = 'evidence/tr-001';
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/evidence.jsonl`, reportToJsonl(report));
await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${directory}/SUMMARY.md`, reportToMarkdown(report));
console.log(JSON.stringify({
  testRunId: report.testRunId,
  workloadInstances: report.workloadInstances,
  pathRuns: report.pathRuns,
  tokenSavingsPct: report.aggregate.savings.tokens,
  modeledCostReductionPct: report.aggregate.savings.costUsd,
  externalCallReductionPct: report.aggregate.savings.calls,
  integrityPassRate: report.aggregate.integrityPassRate,
  equivalencePassRate: report.aggregate.equivalencePassRate,
  evidenceDirectory: directory,
}, null, 2));
