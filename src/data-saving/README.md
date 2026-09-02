# ArgOS Data-Saving Proving Ground

Status: ACTIVE BUILD

This subsystem turns the historical data-saving concept into a current ArgOS experiment boundary. Historical savings percentages are reference evidence only; they are not targets or acceptance criteria.

## Execution model

A workload is classified into exactly one disposition:

- `reusable`: satisfy the workload from trusted existing state without external execution.
- `local`: satisfy the workload with a deterministic/local executor without external execution.
- `external`: perform the required external execution.

The classifier is intentionally supplied by the caller. This keeps the proving ground independent from any particular heuristic while allowing the current ArgOS runtime to become the decision authority later.

## Measurement model

`createProvingGround` executes the same workload through a baseline path and an ArgOS path. It records the independently supplied resource/cost measurements and runs a predetermined equivalence check.

Savings are calculated as:

`100 * (1 - ArgOS total cost / baseline total cost)`

For a population, the headline percentage is calculated from summed valid costs, not an average of per-workload percentages.

Integrity failures remain visible and are excluded from the savings aggregate. A failed equivalence check is therefore never silently converted into a savings claim.

## What this proves

The proving ground can now measure three distinct questions as the workload population grows:

1. Did ArgOS avoid external execution?
2. Did that avoidance reduce measured resources?
3. Did the reduction produce independently measured economic savings?

The first implementation uses small deterministic fixtures. The next step is to bind the same measurement boundary to representative current ArgOS workloads and real provider usage telemetry.
