export const PROVIDER_ECONOMIC_ERRORS = Object.freeze({
  UNKNOWN_COST: 'UNKNOWN_COST',
  UNAUTHORIZED_SPEND: 'UNAUTHORIZED_SPEND',
  FREE_QUOTA_NOT_VERIFIED: 'FREE_QUOTA_NOT_VERIFIED',
});

export function createProviderEconomicPreflight({ maxSpendUsd = 0 } = {}) {
  if (!Number.isFinite(maxSpendUsd) || maxSpendUsd < 0) {
    throw new TypeError('maxSpendUsd must be a non-negative finite number');
  }

  return {
    authorize({
      estimatedCostUsd,
      freeQuotaVerified = false,
      paidExecutionAuthorized = false,
    } = {}) {
      if (estimatedCostUsd === undefined || estimatedCostUsd === null) {
        const error = new Error('Execution cost is unknown');
        error.code = PROVIDER_ECONOMIC_ERRORS.UNKNOWN_COST;
        throw error;
      }

      if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
        const error = new Error('Execution cost must be a non-negative finite number');
        error.code = PROVIDER_ECONOMIC_ERRORS.UNKNOWN_COST;
        throw error;
      }

      if (estimatedCostUsd === 0 && !freeQuotaVerified && !paidExecutionAuthorized) {
        const error = new Error('Zero cost is not authorized without verified free quota or paid authorization');
        error.code = PROVIDER_ECONOMIC_ERRORS.FREE_QUOTA_NOT_VERIFIED;
        throw error;
      }

      if (estimatedCostUsd > maxSpendUsd && !freeQuotaVerified && !paidExecutionAuthorized) {
        const error = new Error('Execution exceeds authorized spend');
        error.code = PROVIDER_ECONOMIC_ERRORS.UNAUTHORIZED_SPEND;
        throw error;
      }

      if (estimatedCostUsd > maxSpendUsd && !paidExecutionAuthorized && !freeQuotaVerified) {
        const error = new Error('Execution exceeds authorized spend');
        error.code = PROVIDER_ECONOMIC_ERRORS.UNAUTHORIZED_SPEND;
        throw error;
      }

      return {
        authorized: true,
        estimatedCostUsd,
        maxSpendUsd,
        freeQuotaVerified: Boolean(freeQuotaVerified),
        paidExecutionAuthorized: Boolean(paidExecutionAuthorized),
      };
    },
  };
}
