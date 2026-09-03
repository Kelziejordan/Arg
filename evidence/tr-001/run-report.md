# ARGOS-TR-001 — Provisional Run Report

## 1. Purpose

TR-001 is the first ArgOS-native proving-ground experiment for the data-saving mechanism. The purpose is not to reproduce a historical savings percentage. The purpose is to determine, using actual ArgOS workload shapes, how much externally metered work the system can safely avoid while preserving the required result.

Historical data-saving results are treated as prior art only. The historical 94% figure was neither a target nor a validated input to this experiment.

## 2. Current code under test

The harness uses the current Arg repository's data-saving executor, proving-ground measurement layer, economic gate/preflight path, execution core, mock provider adapters, and TR-001 runner/test contract.

The data-saving executor supports three dispositions: reusable state, deterministic local execution, and external execution. Reusable execution requires a validated cache hit rather than assuming that a key alone proves correctness.

The proving-ground layer performs matched baseline-versus-ArgOS measurement and checks output equivalence before savings are counted.

The economic gate and preflight layer are exercised as part of the current orchestration path, including authorization/rejection behavior.

The TR-001 runner defines five ArgOS-native workload classes and five instances of each class.

## 3. Workload population

WL-01: Multi-LLM independent execution. This exercises the current multi-provider orchestration path.

WL-02: Economic preflight plus authorized execution. This exercises economic authorization followed by execution.

WL-03: Economic preflight rejection. This verifies that a rejected workload does not proceed to external execution. One controlled instance is intentionally rejected and is excluded from savings eligibility because there is no valid completed baseline/ArgOS result pair to compare.

WL-04: Repeated reusable workload. A validated expected result is seeded into the cache so that the ArgOS path can reuse state rather than invoke the provider.

WL-05: Deterministic local workload. A local executor supplies the expected result, allowing the ArgOS path to avoid external inference.

Total: 25 workload instances across 5 classes.

## 4. Matched comparison

Every eligible workload is evaluated through two paths.

Baseline path: the conventional execution path directly invokes the current orchestrator with paid execution authorized.

ArgOS path: the same workload is evaluated through the current data-saving executor, economic gate/preflight controls, and orchestrator.

The experiment therefore asks a concrete counterfactual question: what external work would the conventional path perform, versus what external work the current ArgOS path actually performs, for the same required result?

## 5. Controlled environment

Provider behavior is deterministic and supplied by mock adapters. Token usage is deterministic by workload class and instance. Economic rates are a versioned fixture model rather than live provider pricing.

This keeps the first experiment reproducible and isolates the data-saving mechanism from provider variability.

## 6. Correctness / integrity rule

Savings are only meaningful if the ArgOS result remains equivalent to the required baseline result. The harness records output equivalence and integrity separately from resource reduction.

The provisional run produced a 100% ArgOS integrity pass rate and 100% equivalence pass rate among eligible workload comparisons.

The intentionally rejected WL-03 instance is not treated as a successful equivalence observation and does not contribute to the savings aggregate.

## 7. Cost model

For this controlled run, economic cost is calculated from the versioned fixture token rates and measured execution paths. ArgOS overhead is included in the ArgOS side of the comparison.

The resulting economic figure is therefore a modeled reduction under the controlled fixture, not a claim about current commercial API pricing.

## 8. Provisional result

25 workload instances were evaluated, producing 50 matched path executions.

Baseline external calls: 34.

ArgOS external calls: 24.

External executions avoided: 10.

External-call reduction: 29.41%.

Token reduction: 29.60%.

Modeled cost reduction: 29.61%.

ArgOS integrity pass rate: 100%.

Eligible equivalence pass rate: 100%.

Economic preflight rejections: 1.

External executions from rejected workload: 0.

The aggregate reduction is calculated from aggregate baseline and ArgOS resource/cost totals, rather than averaging per-workload percentages.

A deterministic bootstrap procedure with 1,000 resamples was also applied to the controlled result as an initial uncertainty diagnostic.

## 9. What this result means

The first proving-ground result is approximately 29.6% reduction in externally metered work/cost under this particular controlled workload population and fixture model.

The important result is not the percentage itself. The experiment demonstrates that the current ArgOS execution path can identify reusable or deterministic work, avoid corresponding external execution, and retain result-equivalence checks around the optimization.

The observed reduction is workload-dependent. A different population can produce a different result. That is expected and is part of what the proving ground is designed to measure.

## 10. What this result does not prove

It does not validate the historical 94% claim.

It does not establish production savings at live provider prices.

It does not establish that ArgOS will save approximately 29.6% on arbitrary workloads.

It does not measure conventional byte compression; the relevant optimization is avoidance of unnecessary external execution while preserving the required result.

It does not constitute CI verification of the exact repository tree because GitHub Actions did not dispatch for the verification branch.

## 11. Evidence classification

Evidence level: controlled, reproducible architecture-level observation with provisional execution provenance.

Execution provenance: high-fidelity local reconstruction of the current TR-001 harness.

CI verification: false.

Live-provider verification: false.

Historical-result validation: false.

Therefore this report should be used as an experimental checkpoint, not as a production performance claim.

## 12. Next proving-ground step

The next step is to execute the same TR-001 workload population against the exact repository-native harness in a verified environment, then introduce live-provider economics only after the controlled path is reproducible.

The experiment should remain frozen while measurement is established. Any future expansion should add workload populations and evidence rather than altering the constitutional/runtime mechanism to manufacture a desired savings result.
