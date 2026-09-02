function assertFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
}

function percentSavings(baseline, argos) {
  if (baseline <= 0) return null;
  return Number(((1 - (argos / baseline)) * 100).toFixed(6));
}

export function createProvingGround({
  baselineExecutor,
  argosExecutor,
  equivalent,
  cost,
} = {}) {
  assertFunction(baselineExecutor, 'baselineExecutor');
  assertFunction(argosExecutor, 'argosExecutor');
  assertFunction(equivalent, 'equivalent');
  if (!cost || typeof cost !== 'object') throw new TypeError('cost is required');
  assertFunction(cost.baseline, 'cost.baseline');
  assertFunction(cost.argos, 'cost.argos');

  return {
    async measure(workload) {
      if (!workload || typeof workload !== 'object' || workload.id == null) {
        throw new TypeError('workload must be an object with an id');
      }

      const baseline = await baselineExecutor(workload);
      const argos = await argosExecutor(workload);
      const integrityPass = Boolean(await equivalent(baseline, argos, workload));
      const baselineTotalCost = Number(await cost.baseline(baseline, workload));
      const argosTotalCost = Number(await cost.argos(argos, workload));

      if (!Number.isFinite(baselineTotalCost) || baselineTotalCost < 0) {
        throw new TypeError('cost.baseline must return a finite non-negative number');
      }
      if (!Number.isFinite(argosTotalCost) || argosTotalCost < 0) {
        throw new TypeError('cost.argos must return a finite non-negative number');
      }

      return {
        workloadId: workload.id,
        integrityPass,
        baselineTotalCost,
        argosTotalCost,
        savingsPercent: integrityPass
          ? percentSavings(baselineTotalCost, argosTotalCost)
          : null,
      };
    },

    async measureMany(workloads) {
      if (!Array.isArray(workloads)) throw new TypeError('workloads must be an array');
      const measurements = [];
      for (const workload of workloads) measurements.push(await this.measure(workload));

      const valid = measurements.filter((m) => m.integrityPass);
      const baselineTotal = valid.reduce((sum, m) => sum + m.baselineTotalCost, 0);
      const argosTotal = valid.reduce((sum, m) => sum + m.argosTotalCost, 0);

      return {
        measurements,
        workloadCount: measurements.length,
        integrityPassCount: valid.length,
        integrityFailureCount: measurements.length - valid.length,
        baselineTotalCost: baselineTotal,
        argosTotalCost: argosTotal,
        aggregateSavingsPercent: percentSavings(baselineTotal, argosTotal),
      };
    },
  };
}
