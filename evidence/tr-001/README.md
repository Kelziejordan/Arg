# ARGOS-TR-001 Evidence Bundle

Status: PROVISIONAL / CONTROLLED RECONSTRUCTION

This directory records the first controlled ArgOS data-saving proving-ground run.

## Important provenance

The run was executed in a local high-fidelity reconstruction of the current TR-001 harness because GitHub Actions did not dispatch a workflow for the verification branch. The repository source and test contract were inspected directly, but this evidence must NOT be represented as an exact GitHub Actions execution of the repository tree.

The historical 94% data-saving result is not used as a target or as evidence for this run.

## Experiment

- Test run ID: ARGOS-TR-001
- Workload instances: 25
- Workload classes: 5
- Path executions: 50 (matched baseline + ArgOS paths)
- Economic pricing: versioned deterministic fixture rates
- Provider behavior: deterministic mock adapters
- Bootstrap resamples: 1,000
- Integrity requirement: output equivalence/integrity must pass before a run contributes to savings

## Observed provisional result

- Baseline external calls: 34
- ArgOS external calls: 24
- External executions avoided: 10
- External-call reduction: 29.41%
- Token reduction: 29.60%
- Modeled cost reduction: 29.61%
- ArgOS integrity pass rate: 100%
- Eligible equivalence pass rate: 100%
- Economic preflight rejections: 1
- External executions from rejected workload: 0

## Interpretation

The result demonstrates that the current proving-ground harness can measure work avoidance on ArgOS-native workload classes while preserving an explicit correctness gate. It does not establish live-provider economics, production savings, or the historical 94% claim.

## Evidence files

- `run-summary.json` — machine-readable summary of the provisional run and provenance.
- `run-report.md` — human-readable experiment record.

Raw per-workload evidence is intentionally not reconstructed from memory. If an exact repository/CI execution is obtained later, its raw evidence should supersede this provisional bundle.
