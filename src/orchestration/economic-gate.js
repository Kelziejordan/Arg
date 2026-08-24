const ECONOMIC_ERRORS = Object.freeze({
  UNAUTHORIZED_SPEND: 'UNAUTHORIZED_SPEND',
  UNKNOWN_COST: 'UNKNOWN_COST',
});

export function createEconomicGate({ maxSpendUsd = 0 } = {}) {
  if (!Number.isFinite(maxSpendUsd) || maxSpendUsd < 0) {
    throw new TypeError('maxSpendUsd must be a non-negative finite number');
  }

  return {
    authorize({ estimatedCostUsd } = {}) {
      const base = {
        maxSpendUsd,
        estimatedCostUsd,
      };

      if (estimatedCostUsd === undefined || estimatedCostUsd === null) {
        const error = new Error('Execution cost is unknown');
        error.code = ECONOMIC_ERRORS.UNKNOWN_COST;
        throw error;
      }

      if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
        const error = new Error('Execution cost must be a non-negative finite number');
        error.code = ECONOMIC_ERRORS.UNKNOWN_COST;
        throw error;
      }

      if (estimatedCostUsd > maxSpendUsd) {
        const error = new Error('Execution exceeds authorized spend');
        error.code = ECONOMIC_ERRORS.UNAUTHORIZED_SPEND;
        throw error;
      }

      return {
        authorized: true,
        ...base,
      };
    },
  };
}

export { ECONOMIC_ERRORS };
